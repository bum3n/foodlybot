# syntax=docker/dockerfile:1
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies (e.g. for audio/image handling if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy application code
COPY app /app/app
COPY tests /app/tests

# Create data directories for SQLite and photos
RUN mkdir -p /app/data/photos

EXPOSE 8000

# Start unified FastAPI + aiogram bot
CMD ["python", "-m", "app.main"]
