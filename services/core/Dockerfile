FROM python:3.10-slim

WORKDIR /app


# Copy and install requirements relative to root build context
COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Copy source code
COPY backend/ /app/backend/
COPY create_admin.py /app/
COPY set_principal.py /app/
COPY inspect_db.py /app/

EXPOSE 8001

CMD ["uvicorn", "backend.main_core:app", "--host", "0.0.0.0", "--port", "8001"]
