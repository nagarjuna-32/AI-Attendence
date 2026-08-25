from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.db.database import Base, engine
from backend.api.routers import (
    analytics,
    reports,
    dashboard,
)

app = FastAPI(
    title="AI Attendance - Analytics & Reports Service",
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

# Include Analytics Routers
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])

@app.get("/")
def read_root():
    return {
        "service": "Analytics & Reports Service",
        "status": "running",
        "version": "3.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
