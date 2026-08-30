"""
Pydantic schemas for Evidence Agent (Section 24, 28.2).

Structured evidence output: each claim must cite exact source fields.
"""

from pydantic import BaseModel, Field
from typing import Literal


class EvidenceItem(BaseModel):
    """Single evidence claim with source grounding."""
    claim: str = Field(..., description="Brief factual risk indicator claim")
    sources: list[str] = Field(..., description="Exact source field names from the supplied context")
    source_values: dict[str, str | float | int | bool | None] = Field(
        default_factory=dict,
        description="Actual values from the cited source fields"
    )


class EvidencePacketSchema(BaseModel):
    """Complete evidence packet from the LLM."""
    risk_factors: list[EvidenceItem] = Field(..., description="List of grounded risk factors")
    summary: str = Field(..., description="One-sentence risk summary")


class EvidenceResponse(BaseModel):
    """API response for evidence generation (Section 28.2)."""
    transaction_id: int
    status: Literal["generated", "grounding_failed"]
    evidence: list[EvidenceItem]
    grounding_valid: bool
    agent_model_version: str
    prompt_version: str
    summary: str = ""


class GroundingResult(BaseModel):
    """Result of grounding validation."""
    valid: bool
    total_claims: int
    valid_claims: int
    invalid_claims: int
    errors: list[str] = Field(default_factory=list)
    invalid_fields: list[str] = Field(default_factory=list)
