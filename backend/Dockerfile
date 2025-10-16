# Use the official lightweight Python image.
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project
COPY . /app/

# Expose the port Flask runs on
EXPOSE 8080

# Start the app with gunicorn
CMD ["gunicorn", "run:app", "--bind", "0.0.0.0:8080", "--timeout", "120"]
