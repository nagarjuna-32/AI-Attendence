from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.db.database import Base, engine
from backend.api.routers import (
    auth,
    students,
    faculty_mgmt,
    timetable,
    architecture,
)

# Initialize Database Schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Attendance - Core Service",
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

# Include Core Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(students.router, prefix="/api/v1/students", tags=["Students"])
app.include_router(faculty_mgmt.router, prefix="/api/v1/faculty_mgmt", tags=["Faculty Management"])
app.include_router(timetable.router, prefix="/api/v1/timetable", tags=["Timetable"])
app.include_router(architecture.router, prefix="/api/v1/architecture", tags=["Architecture"])

@app.get("/")
def read_root():
    return {
        "service": "Core Service",
        "status": "running",
        "version": "3.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
