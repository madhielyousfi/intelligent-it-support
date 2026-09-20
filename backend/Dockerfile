FROM python:3.12-slim

# tesseract binary + English data for the OCR service
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-eng libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY ai/ ./ai/
WORKDIR /app/backend

ENV AI_MODEL_PATH=/app/ai/ticket_classifier.pkl
EXPOSE 8000
CMD ["sh", "-c", "for i in $(seq 1 30); do python -c \"from sqlalchemy import create_engine; import os; create_engine(os.environ['DATABASE_URL']).connect().close()\" && break || sleep 2; done; python -m app.init_db && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
