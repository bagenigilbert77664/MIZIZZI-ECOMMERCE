# --------------------------------------------
# MIZIZZI E-COMMERCE BACKEND DOCKERFILE
# Optimized for production (Python 3.12 / Ubuntu)
# --------------------------------------------

# Use a lightweight Python base image
FROM python:3.12-slim

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production
ENV PORT=8080

# Set working directory
WORKDIR /app

# Install system dependencies (PostgreSQL, build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY run.py .
COPY cors_middleware.py .
COPY app ./app

# Expose Flask/Gunicorn port
EXPOSE 8080

# Start with Gunicorn
CMD ["gunicorn", "run:app", "--bind", "0.0.0.0:8080", "--workers", "4", "--timeout", "120"]
