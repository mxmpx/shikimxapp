# ── Multi-Stage Dockerfile for Shiki MX App ──

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python WSGI Application
FROM python:3.13-slim AS runner

WORKDIR /app

# Set production environment flags
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    FLASK_ENV=production

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Copy built frontend assets from stage 1 into static/dist
COPY --from=frontend-builder /app/static/dist ./static/dist

# Expose port
EXPOSE 5000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:5000/health || exit 1

# Start production server with Gunicorn
CMD ["gunicorn", "-c", "gunicorn.conf.py", "wsgi:app"]
