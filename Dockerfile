FROM python:3.11-slim

WORKDIR /app

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first for Docker layer caching
COPY pyproject.toml uv.lock README.md ./

# Install dependencies (no dev extras for production)
RUN uv sync --frozen --no-dev

# Copy application code
COPY src/ src/
COPY api/ api/
COPY frontend/ frontend/
COPY models/ models/
COPY reports/ reports/

# Create data directories
RUN mkdir -p data/raw data/processed

# Expose port
EXPOSE 10000

# Render uses PORT env var
CMD ["uv", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "10000"]
