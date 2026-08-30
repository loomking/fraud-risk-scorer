"""
FastAPI main application (Section 28).

API contracts defined with Pydantic schemas.
Backend owns feature engineering, model inference, calibration, thresholding, persistence.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.db.session import init_db
from api.routes.score import router as score_router
from api.routes.evidence import router as evidence_router
from api.routes.audit import router as audit_router
from api.routes.report import router as report_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized.")
    yield


app = FastAPI(
    title="Fraud Risk Scorer API",
    description="Razorpay AI Buildathon — Track 2: AI Risk Manager",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(score_router, prefix="/score", tags=["Scoring"])
app.include_router(evidence_router, prefix="/evidence", tags=["Evidence"])
app.include_router(audit_router, prefix="/audit", tags=["Audit"])
app.include_router(report_router, prefix="/report", tags=["Report"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "fraud-risk-scorer"}
