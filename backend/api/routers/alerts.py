from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from backend.db.database import get_db
from backend.db import models
from backend.api import deps

router = APIRouter()

class AlertPayload(BaseModel):
    student_ids: List[int]
    subject_id: int
    custom_note: str = ""
    send_to_parent: bool = False

@router.get("/shortage")
def get_shortage_students(
    subject_id: Optional[int] = None,
    threshold: float = 75.0,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Gets students falling below the given threshold for the given subject (or all subjects for this faculty)."""
    
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Only faculty can view their shortage students directly.")
        
    # Get subjects assigned to this faculty
    assigned_subjects = db.query(models.FacultySubject).filter(models.FacultySubject.faculty_id == current_user.id).all()
    assigned_subject_ids = [a.subject_id for a in assigned_subjects]
    
    if subject_id:
        if subject_id not in assigned_subject_ids:
            raise HTTPException(status_code=403, detail="You are not assigned to this subject.")
        target_subject_ids = [subject_id]
    else:
        target_subject_ids = assigned_subject_ids
        
    if not target_subject_ids:
        return []
        
    # Fetch all timetable entries for these subjects
    t_entries = db.query(models.TimetableEntry).filter(models.TimetableEntry.subject_id.in_(target_subject_ids)).all()
    t_entry_ids = [t.id for t in t_entries]
    
    if not t_entry_ids:
        return []
        
    # Fetch all students in the sections associated with these timetable entries
    section_ids = [t.section_id for t in t_entries]
    students = db.query(models.Student).filter(models.Student.section_id.in_(section_ids)).all()
    
    # Calculate attendance per student per subject
    shortage_list = []
    
    for subj_id in target_subject_ids:
        subj = db.query(models.Subject).filter(models.Subject.id == subj_id).first()
        subj_t_entries = [t.id for t in t_entries if t.subject_id == subj_id]
        
        for student in students:
            total_classes = db.query(models.Attendance).filter(
                models.Attendance.student_id == student.id,
                models.Attendance.timetable_entry_id.in_(subj_t_entries)
            ).count()
            
            if total_classes == 0:
                continue # No classes held yet
                
            present_classes = db.query(models.Attendance).filter(
                models.Attendance.student_id == student.id,
                models.Attendance.timetable_entry_id.in_(subj_t_entries),
                models.Attendance.status == "Present"
            ).count()
            
            percentage = (present_classes / total_classes) * 100
            
            if percentage < threshold:
                risk_level = "Warning"
                if percentage < 65:
                    risk_level = "Critical"
                elif percentage < 70:
                    risk_level = "High Risk"
                    
                classes_to_75 = max(0, int(((0.75 * total_classes) - present_classes) / 0.25))
                
                shortage_list.append({
                    "student_id": student.id,
                    "student_name": student.full_name,
                    "usn": student.usn,
                    "email": student.email or f"{student.usn.lower()}@college.edu",
                    "subject_id": subj.id,
                    "subject_name": subj.name,
                    "percentage": round(percentage, 1),
                    "risk_level": risk_level,
                    "classes_attended": present_classes,
                    "total_classes": total_classes,
                    "classes_needed": classes_to_75
                })
                
    return shortage_list

@router.post("/send")
def send_alerts(
    payload: AlertPayload,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Simulates sending emails and logs the alert into AlertHistory."""
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Only faculty can send alerts.")
        
    subject = db.query(models.Subject).filter(models.Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    sent_count = 0
    for sid in payload.student_ids:
        student = db.query(models.Student).filter(models.Student.id == sid).first()
        if not student:
            continue
            
        # Re-calculate to store exact percentage at time of sending
        t_entries = db.query(models.TimetableEntry).filter(models.TimetableEntry.subject_id == subject.id).all()
        t_entry_ids = [t.id for t in t_entries]
        
        total = db.query(models.Attendance).filter(models.Attendance.student_id == sid, models.Attendance.timetable_entry_id.in_(t_entry_ids)).count()
        present = db.query(models.Attendance).filter(models.Attendance.student_id == sid, models.Attendance.timetable_entry_id.in_(t_entry_ids), models.Attendance.status == "Present").count()
        
        pct = (present / total * 100) if total > 0 else 0
        
        risk_level = "Warning"
        if pct < 65: risk_level = "Critical"
        elif pct < 70: risk_level = "High Risk"
            
        # Simulate Email Console Log
        classes_needed = max(0, int(((0.75 * total) - present) / 0.25))
        print("\n" + "="*50)
        print(f"EMAIL DISPATCHED TO: {student.email or student.usn+'@college.edu'}")
        if payload.send_to_parent:
            print(f"CC PARENT: {student.parent_email or 'parent_'+student.usn+'@gmail.com'}")
        print(f"SUBJECT: Attendance Warning Notice - {subject.name}")
        print("-" * 50)
        print(f"Dear {student.full_name},")
        print(f"\nYour attendance in {subject.name} is currently {round(pct,1)}%, which is below the required 75%.")
        print(f"You need to attend the upcoming classes regularly to avoid attendance shortage issues.")
        print(f"\nCurrent Attendance: {round(pct,1)}%")
        print(f"Required Attendance: 75%")
        print(f"\nSMART RECOMMENDATION:")
        print(f"You need to attend {classes_needed} more consecutive classes to reach 75%.")
        if payload.custom_note:
            print(f"\nFACULTY NOTE: {payload.custom_note}")
        print(f"\nFaculty: {current_user.full_name}")
        print(f"Please take necessary action.")
        print("\nRegards,")
        print("AI Attendance Assistant Pro")
        print("="*50 + "\n")
        
        # Log to Database
        history = models.AlertHistory(
            faculty_id=current_user.id,
            student_id=student.id,
            subject_id=subject.id,
            attendance_percentage=round(pct, 1),
            alert_type=risk_level,
            parent_copied=payload.send_to_parent,
            custom_note=payload.custom_note,
            status="Sent"
        )
        db.add(history)
        sent_count += 1
        
    db.commit()
    return {"message": f"Successfully sent {sent_count} alerts", "count": sent_count}

@router.get("/metrics/hod")
def get_hod_alert_metrics(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    # Get all faculty in this HOD's department
    faculty_ids = [f.id for f in db.query(models.Faculty).filter(models.Faculty.department_id == current_user.department_id).all()]
    
    alerts = db.query(models.AlertHistory).filter(models.AlertHistory.faculty_id.in_(faculty_ids)).all()
    
    warned_students = set([a.student_id for a in alerts])
    critical_alerts = sum(1 for a in alerts if a.alert_type == "Critical")
    
    last_alert = None
    if alerts:
        alerts.sort(key=lambda x: x.sent_at, reverse=True)
        last_alert = alerts[0].sent_at.strftime("%d %b %Y")
        
    return {
        "alerts_sent": len(alerts),
        "students_warned": len(warned_students),
        "critical_students": critical_alerts,
        "last_alert_date": last_alert or "No alerts sent yet"
    }

@router.get("/metrics/principal")
def get_principal_alert_summary(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    if current_user.role not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    summary = []
    departments = db.query(models.Department).all()
    for d in departments:
        f_ids = [f.id for f in db.query(models.Faculty).filter(models.Faculty.department_id == d.id).all()]
        count = db.query(models.AlertHistory).filter(models.AlertHistory.faculty_id.in_(f_ids)).count()
        summary.append({
            "department": d.name,
            "alerts_count": count
        })
        
    return summary
