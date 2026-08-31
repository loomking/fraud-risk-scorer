"""
Evidence Agent (Sections 22, 23, 24).

Receives ONE flagged transaction's structured context.
Calls LLM with temperature=0 for reproducibility.
Returns structured evidence with source field citations.

The LLM CANNOT make the fraud decision. It only produces evidence
for an ALREADY-FLAGGED transaction (Section 2.7).
"""

import json
import logging
from typing import Any

from groq import Groq

from src.config import GROQ_API_KEY, GROQ_MODEL, LLM_TEMPERATURE
from src.agent.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, PROMPT_VERSION
from src.agent.schemas import EvidencePacketSchema, EvidenceResponse, EvidenceItem
from src.agent.validator import parse_and_validate_evidence

logger = logging.getLogger(__name__)


def build_evidence_context(
    transaction_data: dict[str, Any],
    risk_probability: float,
    threshold: float,
    decision: str,
    causal_features: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Build the structured context supplied to the LLM (Section 22).

    Only includes explicitly selected fields — no hidden database access,
    no arbitrary historical lookup, no external information.
    """
    context = {
        "TransactionAmt": transaction_data.get("TransactionAmt"),
        "ProductCD": transaction_data.get("ProductCD"),
        "card1": transaction_data.get("card1"),
        "card4": transaction_data.get("card4"),
        "card6": transaction_data.get("card6"),
        "P_emaildomain": transaction_data.get("P_emaildomain"),
        "R_emaildomain": transaction_data.get("R_emaildomain"),
        "addr1": transaction_data.get("addr1"),
        "DeviceType": transaction_data.get("DeviceType"),
        "DeviceInfo": transaction_data.get("DeviceInfo"),
        "risk_probability": risk_probability,
        "threshold": threshold,
        "decision": decision,
    }

    # Add causal historical features if provided (all computed causally)
    if causal_features:
        for key in [
            "uid_txn_count_hist",
            "uid_avg_amt_hist",
            "uid_max_amt_hist",
            "uid_time_since_last",
            "has_identity",
        ]:
            if key in causal_features:
                context[key] = causal_features[key]

    # Remove None values for cleaner context
    context = {k: v for k, v in context.items() if v is not None}

    return context


def generate_evidence(
    transaction_id: int,
    context: dict[str, Any],
    groq_api_key: str | None = None,
    model: str | None = None,
) -> EvidenceResponse:
    """
    Generate evidence for a flagged transaction.

    1. Build prompt with supplied context
    2. Call LLM (temperature=0)
    3. Parse response
    4. Validate grounding
    5. Return structured evidence with validation result
    """
    api_key = groq_api_key or GROQ_API_KEY
    model_name = model or GROQ_MODEL

    if not api_key:
        raise ValueError("GROQ_API_KEY not set. Evidence generation requires a Groq API key.")

    # Build prompt
    context_json = json.dumps(context, indent=2, default=str)
    user_prompt = USER_PROMPT_TEMPLATE.format(context_json=context_json)

    logger.info(f"  Generating evidence for transaction {transaction_id}...")
    logger.info(f"  Context fields: {list(context.keys())}")

    # Call LLM
    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=LLM_TEMPERATURE,  # Section 23: temperature=0
        max_tokens=2000,
        response_format={"type": "json_object"},
    )

    llm_response = response.choices[0].message.content
    logger.info(f"  LLM response length: {len(llm_response)} chars")

    # Parse and validate grounding
    evidence_packet, grounding_result = parse_and_validate_evidence(
        llm_response, context
    )

    if evidence_packet is None or not grounding_result.valid:
        # Grounding failed — reject evidence
        return EvidenceResponse(
            transaction_id=transaction_id,
            status="grounding_failed",
            evidence=[],
            grounding_valid=False,
            agent_model_version=model_name,
            prompt_version=PROMPT_VERSION,
            summary=f"Grounding validation failed: {grounding_result.errors}",
        )

    return EvidenceResponse(
        transaction_id=transaction_id,
        status="generated",
        evidence=evidence_packet.risk_factors,
        grounding_valid=True,
        agent_model_version=model_name,
        prompt_version=PROMPT_VERSION,
        summary=evidence_packet.summary,
    )
