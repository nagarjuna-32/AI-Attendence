from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.db.database import Base, engine
from backend.api.routers import alerts

app = FastAPI(
    title="AI Attendance - Alerts Service",
    version="3.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Alerts Router
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])

@app.get("/")
def read_root():
    return {
        "service": "Alerts Service",
        "status": "running",
        "version": "3.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
