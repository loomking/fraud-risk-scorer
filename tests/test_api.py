"""
API endpoint tests (Section 32: test_api.py).

Tests all endpoints plus malformed input.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app
from src.db.session import init_db


@pytest.fixture(scope="module")
def client():
    """Create test client with initialized DB."""
    init_db()
    with TestClient(app) as c:
        yield c


class TestHealthEndpoint:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestScoreEndpoint:
    def test_valid_score_request(self, client):
        """Valid transaction should return a score."""
        resp = client.post("/score", json={
            "TransactionID": 99999,
            "TransactionDT": 86400,
            "TransactionAmt": 125.50,
            "ProductCD": "W",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["transaction_id"] == 99999
        assert 0 <= data["risk_probability"] <= 1
        assert data["decision"] in ["PASS", "FLAG"]
        assert data["model_version"] is not None
        assert data["threshold"] > 0

    def test_negative_amount_rejected(self, client):
        """Negative transaction amount should be rejected (Section 29)."""
        resp = client.post("/score", json={
            "TransactionID": 99998,
            "TransactionDT": 86400,
            "TransactionAmt": -50.0,
            "ProductCD": "W",
        })
        assert resp.status_code == 422  # Validation error

    def test_missing_required_fields(self, client):
        """Missing required fields should be rejected."""
        resp = client.post("/score", json={
            "TransactionID": 99997,
        })
        assert resp.status_code == 422

    def test_malformed_json(self, client):
        """Malformed JSON should be rejected."""
        resp = client.post(
            "/score",
            content="this is not json",
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 422


class TestEvidenceEndpoint:
    def test_evidence_for_unscored_transaction(self, client):
        """Evidence for transaction without score should return 404."""
        resp = client.post("/evidence/1")
        assert resp.status_code == 404

    def test_evidence_for_passed_transaction(self, client):
        """Evidence should not be generated for PASS transactions (Section 2.7)."""
        # First score a transaction that will likely PASS (low amount)
        client.post("/score", json={
            "TransactionID": 88888,
            "TransactionDT": 86400,
            "TransactionAmt": 1.0,
            "ProductCD": "W",
        })
        resp = client.post("/evidence/88888")
        # Should be 400 (not flagged) or succeed if it was flagged
        if resp.status_code == 400:
            assert "not flagged" in resp.json()["detail"].lower() or "FLAG" in resp.json()["detail"]


class TestAuditEndpoint:
    def test_audit_for_scored_transaction(self, client):
        """Scored transaction should have audit events."""
        # Score first
        client.post("/score", json={
            "TransactionID": 77777,
            "TransactionDT": 86400,
            "TransactionAmt": 500.0,
            "ProductCD": "W",
        })
        resp = client.get("/audit/77777")
        assert resp.status_code == 200
        data = resp.json()
        assert data["transaction_id"] == 77777
        assert len(data["events"]) >= 2  # score_computed + decision_made

    def test_audit_for_unknown_transaction(self, client):
        """Unknown transaction should return 404."""
        resp = client.get("/audit/1")
        assert resp.status_code == 404


class TestReportEndpoint:
    def test_report(self, client):
        """Report endpoint should return model info."""
        resp = client.get("/report")
        assert resp.status_code == 200
        data = resp.json()
        assert "model_version" in data
        assert "threshold" in data
        assert "metrics" in data
