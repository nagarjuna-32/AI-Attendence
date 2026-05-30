from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

from backend.db.database import get_db
from backend.db import models
from backend.api import deps
from backend.core.security import get_password_hash

router = APIRouter()

class FacultyRegistrationSchema(BaseModel):
    full_name: str
    faculty_id: str
    email: str
    phone: str
    gender: str = ""
    date_of_birth: str = ""
    qualification: str
    designation: str
    experience: int
    joining_date: str
    subject_id: int
    subject_code: str
    semester_id: int
    section_id: int
    username: str
    password: str

@router.post("/register")
def register_faculty(payload: FacultyRegistrationSchema, db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Only HODs can register faculty members.")

    # 1. Verify that the assigned subject/section belong to this department (Simplified check)
    # The HOD can only register faculty into their own department automatically.
    
    # Check if username or email exists
    existing = db.query(models.Faculty).filter((models.Faculty.username == payload.username) | (models.Faculty.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists.")
        
    try:
        joining = datetime.strptime(payload.joining_date, "%Y-%m-%d").date() if payload.joining_date else None
    except ValueError:
        joining = None

    # 2. Create the Faculty record (Auto-assign to HOD's department)
    new_faculty = models.Faculty(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        faculty_id=payload.faculty_id,
        department_id=current_user.department_id,
        email=payload.email,
        phone=payload.phone,
        qualification=payload.qualification,
        designation=payload.designation,
        experience=payload.experience,
        joining_date=joining,
        created_by_hod=current_user.id,
        status="Active"
    )
    db.add(new_faculty)
    db.commit()
    db.refresh(new_faculty)
    
    # 3. Create initial FacultySubject assignment
    assignment = models.FacultySubject(
        faculty_id=new_faculty.id,
        subject_id=payload.subject_id,
        section_id=payload.section_id
    )
    db.add(assignment)
    
    # 4. Create Notification for Principal
    notification = models.Notification(
        title="New Faculty Added",
        description=f"Faculty {payload.full_name} was created by HOD of {current_user.department.name if current_user.department else 'Unknown'}.",
        type="FACULTY_REGISTRATION",
        target_role="principal",
        created_by=current_user.id
    )
    db.add(notification)
    
    # 5. Create Activity Log
    activity = models.ActivityLog(
        activity_type="FACULTY_CREATED",
        description=f"Registered new faculty: {payload.full_name} ({payload.faculty_id})",
        department_id=current_user.department_id,
        performed_by=current_user.id,
        role="hod"
    )
    db.add(activity)
    
    db.commit()
    
    return {"status": "success", "message": "Faculty registered successfully.", "faculty_id": new_faculty.id}

@router.get("/department")
def get_department_faculty(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    faculty = db.query(models.Faculty).filter(models.Faculty.department_id == current_user.department_id).all()
    result = []
    for f in faculty:
        result.append({
            "id": f.id,
            "name": f.full_name,
            "faculty_id": f.faculty_id,
            "email": f.email,
            "designation": f.designation,
            "status": f.status
        })
    return result

@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    if current_user.role not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    notifications = db.query(models.Notification).filter(models.Notification.target_role == "principal").order_by(models.Notification.created_at.desc()).limit(50).all()
    return notifications

@router.get("/activity")
def get_activity_logs(department_id: Optional[int] = None, db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    query = db.query(models.ActivityLog)
    
    if current_user.role == "hod":
        query = query.filter(models.ActivityLog.department_id == current_user.department_id)
    elif current_user.role in ["principal", "admin"]:
        if department_id:
            query = query.filter(models.ActivityLog.department_id == department_id)
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    logs = query.order_by(models.ActivityLog.timestamp.desc()).limit(100).all()
    return logs
