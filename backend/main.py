from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.db.database import Base, engine
from backend.api.routers import (
    auth,
    students,
    attendance,
    dashboard,
    reports,
    architecture,
    analytics,
    alerts,
    faculty_mgmt,
    timetable,
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Attendance Assistant Pro",
    version="3.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
      "https://ai-attendence-beta.vercel.app",
        "https://ai-attendence-git-main-acarjunarjus-projects.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(students.router, prefix="/api/v1/students", tags=["Students"])
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["Attendance"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(architecture.router, prefix="/api/v1/architecture", tags=["Architecture"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(faculty_mgmt.router, prefix="/api/v1/faculty_mgmt", tags=["Faculty Management"])
app.include_router(timetable.router, prefix="/api/v1/timetable", tags=["Timetable"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Smart Attendance Assistant API",
        "status": "running",
        "version": "3.0.0"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }
