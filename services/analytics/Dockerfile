FROM python:3.10-slim

WORKDIR /app


# Copy and install requirements relative to root build context
COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Copy source code
COPY backend/ /app/backend/

EXPOSE 8003

CMD ["uvicorn", "backend.main_analytics:app", "--host", "0.0.0.0", "--port", "8003"]
