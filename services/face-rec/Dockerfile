FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements relative to root build context
COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Copy source code (this automatically includes backend/ml/models ONNX weights)
COPY backend/ /app/backend/

EXPOSE 8002

CMD ["uvicorn", "backend.main_face_rec:app", "--host", "0.0.0.0", "--port", "8002"]
