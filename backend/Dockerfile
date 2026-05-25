FROM python:3.12-slim

WORKDIR /app

# Avoid buffering so logs appear in Render
ENV PYTHONUNBUFFERED=1

# Install runtime deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose a default port (Render provides $PORT at runtime)
EXPOSE 8000

# Start command: uvicorn binds to $PORT if provided by the platform
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
