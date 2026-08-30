"""
Test Evidence Agent grounding validation (Section 26, 32).

MANDATORY: Deliberate hallucination test.
Must prove the validator catches fabricated fields — not just trust the prompt.
"""

import json
import pytest

from src.agent.schemas import EvidencePacketSchema, EvidenceItem, GroundingResult
from src.agent.validator import validate_grounding, parse_and_validate_evidence


# ── Sample context (what was actually supplied to the LLM) ────────────────

SUPPLIED_CONTEXT = {
    "TransactionAmt": 125.50,
    "ProductCD": "W",
    "card1": 4000,
    "card4": "visa",
    "card6": "debit",
    "P_emaildomain": "gmail.com",
    "risk_probability": 0.85,
    "threshold": 0.15,
    "decision": "FLAG",
    "uid_txn_count_hist": 3,
    "uid_avg_amt_hist": 50.0,
    "has_identity": True,
}


class TestGroundingValidator:
    """Test deterministic grounding validation."""

    def test_valid_evidence_passes(self):
        """Evidence citing only supplied fields should pass."""
        packet = EvidencePacketSchema(
            risk_factors=[
                EvidenceItem(
                    claim="Transaction amount is notably higher than average",
                    sources=["TransactionAmt", "uid_avg_amt_hist"],
                    source_values={"TransactionAmt": 125.50, "uid_avg_amt_hist": 50.0},
                ),
                EvidenceItem(
                    claim="Risk probability exceeds threshold",
                    sources=["risk_probability", "threshold"],
                    source_values={"risk_probability": 0.85, "threshold": 0.15},
                ),
            ],
            summary="High-risk transaction flagged.",
        )
        result = validate_grounding(packet, SUPPLIED_CONTEXT)
        assert result.valid is True
        assert result.invalid_claims == 0
        assert result.valid_claims == 2

    def test_fabricated_field_detected(self):
        """
        DELIBERATE HALLUCINATION TEST (Section 26, MANDATORY).

        Inject a completely fabricated field ("IP_Address_Score") that was
        NOT in the supplied context. The validator MUST detect it,
        reject the packet, and record the grounding failure.
        """
        packet = EvidencePacketSchema(
            risk_factors=[
                EvidenceItem(
                    claim="IP address risk score indicates suspicious origin",
                    sources=["IP_Address_Score"],  # FABRICATED — not in context!
                    source_values={"IP_Address_Score": 0.92},
                ),
            ],
            summary="IP-based risk detected.",
        )
        result = validate_grounding(packet, SUPPLIED_CONTEXT)

        # MUST detect the fabricated field
        assert result.valid is False, \
            "Validator should REJECT evidence citing a fabricated field"
        assert "IP_Address_Score" in result.invalid_fields, \
            "Fabricated field 'IP_Address_Score' should be listed as invalid"
        assert result.invalid_claims >= 1, \
            "At least one claim should be marked invalid"
        assert len(result.errors) >= 1, \
            "Grounding failure must be recorded/logged"

    def test_fabricated_historical_claim_detected(self):
        """
        Fabricated historical claim: references "previous_chargeback_count"
        which was never supplied in context.
        """
        packet = EvidencePacketSchema(
            risk_factors=[
                EvidenceItem(
                    claim="Client has 5 previous chargebacks",
                    sources=["previous_chargeback_count"],  # FABRICATED
                    source_values={"previous_chargeback_count": 5},
                ),
            ],
            summary="Chargeback history flagged.",
        )
        result = validate_grounding(packet, SUPPLIED_CONTEXT)
        assert result.valid is False
        assert "previous_chargeback_count" in result.invalid_fields

    def test_value_mismatch_detected(self):
        """Validator should catch when cited values don't match context."""
        packet = EvidencePacketSchema(
            risk_factors=[
                EvidenceItem(
                    claim="Transaction amount is very high",
                    sources=["TransactionAmt"],
                    source_values={"TransactionAmt": 9999.99},  # WRONG value
                ),
            ],
            summary="High amount.",
        )
        result = validate_grounding(packet, SUPPLIED_CONTEXT)
        assert result.valid is False
        assert len(result.errors) >= 1

    def test_empty_sources_rejected(self):
        """Claims with no source citations should be rejected."""
        packet = EvidencePacketSchema(
            risk_factors=[
                EvidenceItem(
                    claim="This transaction looks suspicious",
                    sources=[],  # No sources!
                    source_values={},
                ),
            ],
            summary="Suspicious.",
        )
        result = validate_grounding(packet, SUPPLIED_CONTEXT)
        assert result.valid is False

    def test_mixed_valid_and_invalid(self):
        """Packet with some valid and some invalid claims should fail overall."""
        packet = EvidencePacketSchema(
            risk_factors=[
                EvidenceItem(
                    claim="Product code is W",
                    sources=["ProductCD"],
                    source_values={"ProductCD": "W"},
                ),
                EvidenceItem(
                    claim="Blacklisted merchant detected",
                    sources=["merchant_blacklist_score"],  # FABRICATED
                    source_values={"merchant_blacklist_score": 0.95},
                ),
            ],
            summary="Mixed results.",
        )
        result = validate_grounding(packet, SUPPLIED_CONTEXT)
        assert result.valid is False
        assert result.valid_claims == 1
        assert result.invalid_claims == 1


class TestParseAndValidate:
    """Test end-to-end parsing + validation."""

    def test_valid_json_passes(self):
        """Well-formed JSON with valid fields should pass."""
        llm_response = json.dumps({
            "risk_factors": [
                {
                    "claim": "Card type is debit",
                    "sources": ["card6"],
                    "source_values": {"card6": "debit"},
                }
            ],
            "summary": "Standard risk.",
        })
        packet, result = parse_and_validate_evidence(llm_response, SUPPLIED_CONTEXT)
        assert packet is not None
        assert result.valid is True

    def test_invalid_json_fails(self):
        """Malformed JSON should fail gracefully."""
        packet, result = parse_and_validate_evidence(
            "this is not json {{{", SUPPLIED_CONTEXT
        )
        assert packet is None
        assert result.valid is False

    def test_markdown_wrapped_json(self):
        """LLM sometimes wraps JSON in markdown — should still parse."""
        llm_response = '```json\n{"risk_factors": [{"claim": "test", "sources": ["ProductCD"], "source_values": {"ProductCD": "W"}}], "summary": "ok"}\n```'
        packet, result = parse_and_validate_evidence(llm_response, SUPPLIED_CONTEXT)
        assert packet is not None
        assert result.valid is True
