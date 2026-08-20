from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.db.database import Base, engine
from backend.api.routers import attendance

app = FastAPI(
    title="AI Attendance - Face Recognition Service",
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

# Include Face Rec / Attendance Router
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["Attendance"])

@app.get("/")
def read_root():
    return {
        "service": "Face Recognition Service",
        "status": "running",
        "version": "3.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
