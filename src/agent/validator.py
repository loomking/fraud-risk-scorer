"""
Grounding Validator (Section 25).

Deterministic validation — does NOT rely on prompt compliance.
After receiving the LLM response:
1. Parse JSON
2. Validate schema
3. Verify each cited field exists in the supplied input
4. Verify referenced values match the supplied input
5. Reject unsupported/fabricated references
6. Record grounding failure
7. Never silently return invalid evidence
"""

import logging
import json
from typing import Any

from src.agent.schemas import EvidencePacketSchema, EvidenceItem, GroundingResult

logger = logging.getLogger(__name__)


def validate_grounding(
    evidence_packet: EvidencePacketSchema,
    supplied_context: dict[str, Any],
) -> GroundingResult:
    """
    Deterministic grounding validation.

    For each evidence claim:
    - Every cited source field must exist in the supplied context
    - Referenced values must match the supplied context
    - Unsupported or fabricated references are rejected

    This is the REAL safety mechanism — not the LLM prompt.
    """
    errors = []
    invalid_fields = []
    valid_claims = 0
    invalid_claims = 0

    # Flatten context keys for lookup (case-sensitive)
    context_keys = set(supplied_context.keys())

    for i, item in enumerate(evidence_packet.risk_factors):
        claim_valid = True

        # Check 1: Every cited source field must exist in the supplied context
        for source_field in item.sources:
            if source_field not in context_keys:
                errors.append(
                    f"Claim #{i+1}: references field '{source_field}' "
                    f"which is NOT in the supplied context. "
                    f"Available fields: {sorted(context_keys)[:10]}..."
                )
                invalid_fields.append(source_field)
                claim_valid = False

        # Check 2: Referenced values must match the supplied context
        for field_name, cited_value in item.source_values.items():
            if field_name not in context_keys:
                errors.append(
                    f"Claim #{i+1}: source_values references field '{field_name}' "
                    f"which is NOT in the supplied context."
                )
                invalid_fields.append(field_name)
                claim_valid = False
            else:
                actual_value = supplied_context[field_name]
                # Loose comparison: convert to str for comparison
                if str(cited_value) != str(actual_value):
                    # Allow numeric approximation
                    try:
                        if abs(float(cited_value) - float(actual_value)) < 0.01:
                            continue
                    except (ValueError, TypeError):
                        pass
                    errors.append(
                        f"Claim #{i+1}: field '{field_name}' value mismatch. "
                        f"Cited: {cited_value}, Actual: {actual_value}"
                    )
                    claim_valid = False

        # Check 3: Claim must cite at least one source
        if not item.sources:
            errors.append(f"Claim #{i+1}: no source fields cited.")
            claim_valid = False

        if claim_valid:
            valid_claims += 1
        else:
            invalid_claims += 1

    result = GroundingResult(
        valid=len(errors) == 0,
        total_claims=len(evidence_packet.risk_factors),
        valid_claims=valid_claims,
        invalid_claims=invalid_claims,
        errors=errors,
        invalid_fields=list(set(invalid_fields)),
    )

    if not result.valid:
        logger.warning(f"  GROUNDING FAILED: {len(errors)} errors found")
        for err in errors:
            logger.warning(f"    - {err}")
    else:
        logger.info(f"  Grounding PASSED: {valid_claims}/{len(evidence_packet.risk_factors)} claims valid")

    return result


def parse_and_validate_evidence(
    llm_response: str,
    supplied_context: dict[str, Any],
) -> tuple[EvidencePacketSchema | None, GroundingResult]:
    """
    Parse LLM response and validate grounding.

    Returns (evidence_packet, grounding_result).
    If parsing fails, returns (None, failed_result).
    """
    # Step 1: Parse JSON
    try:
        # Handle markdown-wrapped JSON
        response_text = llm_response.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last lines (```json and ```)
            json_lines = []
            in_code = False
            for line in lines:
                if line.strip().startswith("```") and not in_code:
                    in_code = True
                    continue
                elif line.strip() == "```" and in_code:
                    break
                elif in_code:
                    json_lines.append(line)
            response_text = "\n".join(json_lines)

        parsed = json.loads(response_text)
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse LLM response as JSON: {e}"
        logger.error(f"  {error_msg}")
        return None, GroundingResult(
            valid=False, total_claims=0, valid_claims=0, invalid_claims=0,
            errors=[error_msg],
        )

    # Step 2: Validate schema
    try:
        evidence_packet = EvidencePacketSchema(**parsed)
    except Exception as e:
        error_msg = f"LLM response does not match evidence schema: {e}"
        logger.error(f"  {error_msg}")
        return None, GroundingResult(
            valid=False, total_claims=0, valid_claims=0, invalid_claims=0,
            errors=[error_msg],
        )

    # Step 3: Validate grounding
    grounding_result = validate_grounding(evidence_packet, supplied_context)

    return evidence_packet, grounding_result
