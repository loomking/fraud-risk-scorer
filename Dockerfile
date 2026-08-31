FROM python:3.11-slim

WORKDIR /app

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy EVERYTHING first (simpler and more reliable for hackathon)
COPY . .

# Install dependencies
RUN uv sync --frozen --no-dev

# Create data directories
RUN mkdir -p data/raw data/processed

# Expose port (Render uses 10000 by default)
EXPOSE 10000

# Run the server
CMD ["uv", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "10000"]
