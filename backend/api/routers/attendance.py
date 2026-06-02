from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Form
from sqlalchemy.orm import Session
from datetime import datetime, date
import numpy as np
import cv2
import json
from typing import Optional

from backend.db.database import get_db
from backend.db import models
from backend.api import deps
from backend.ml import face_processing
from backend.api import schemas

router = APIRouter()

@router.get("/active_session")
def get_active_timetable_session(db: Session = Depends(get_db)):
    now = datetime.now()
    current_time = now.time()
    day_of_week = now.strftime("%A")
    
    # Query any active timetable slot currently running
    active_slot = db.query(models.TimetableEntry).join(
        models.TimetableVersion
    ).filter(
        models.TimetableVersion.status == "Active",
        models.TimetableEntry.day_of_week == day_of_week,
        models.TimetableEntry.start_time <= current_time,
        models.TimetableEntry.end_time >= current_time
    ).first()
    
    if active_slot:
        return {
            "status": "active",
            "subject": active_slot.subject.name if active_slot.subject else "N/A",
            "subject_code": active_slot.subject.code if active_slot.subject else "N/A",
            "faculty": active_slot.faculty.full_name if active_slot.faculty else "N/A",
            "department": active_slot.version_obj.department.name if active_slot.version_obj.department else "N/A",
            "section": active_slot.section.name if active_slot.section else "N/A",
            "time": f"{active_slot.start_time.strftime('%I:%M %p')} - {active_slot.end_time.strftime('%I:%M %p')}"
        }
    
    any_slot = db.query(models.TimetableEntry).join(
        models.TimetableVersion
    ).filter(
        models.TimetableVersion.status == "Active"
    ).first()
    
    if any_slot:
        return {
            "status": "default",
            "subject": any_slot.subject.name if any_slot.subject else "N/A",
            "subject_code": any_slot.subject.code if any_slot.subject else "N/A",
            "faculty": any_slot.faculty.full_name if any_slot.faculty else "N/A",
            "department": any_slot.version_obj.department.name if any_slot.version_obj.department else "N/A",
            "section": any_slot.section.name if any_slot.section else "N/A",
            "time": "No active session right now"
        }

    return {
        "status": "inactive",
        "subject": "General Attendance",
        "subject_code": "GEN",
        "faculty": "AI Agent Scanner",
        "department": "Campus-Wide",
        "section": "All Sections",
        "time": "System Ready"
    }

@router.post("/mark_auto")
async def mark_attendance_auto(
    request: Request,
    image: UploadFile = File(...),
    liveness_verified: bool = Form(False),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    device_info = request.headers.get("user-agent", "unknown")
    
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
        
    analysis = face_processing.analyze_face_liveness_and_quality(img)
    
    if not analysis["face_detected"]:
        return {
            "status": "error",
            "face_detected": False,
            "quality": {
                "score": analysis["quality_score"],
                "blur": analysis["blur_score"],
                "brightness": analysis["brightness_score"],
                "status": analysis["status"]
            },
            "liveness": analysis["liveness"],
            "detail": analysis["error"] or "No face detected"
        }
        
    if analysis["status"] == "Poor":
        return {
            "status": "error",
            "face_detected": True,
            "quality": {
                "score": analysis["quality_score"],
                "blur": analysis["blur_score"],
                "brightness": analysis["brightness_score"],
                "status": analysis["status"]
            },
            "liveness": analysis["liveness"],
            "detail": analysis["error"]
        }

    # Fetch cached database features
    db_features = face_processing.get_cached_student_features(db)
    
    # Matching
    match_id, score = face_processing.find_best_match(analysis["feature"], db_features, threshold=0.45)
    percentage_conf = min(100.0, max(0.0, score * 200))
    conf_str = f"{round(percentage_conf, 2)}%"
    
    if not match_id or percentage_conf < 90.0:
        return {
            "status": "unknown",
            "face_detected": True,
            "quality": {
                "score": analysis["quality_score"],
                "blur": analysis["blur_score"],
                "brightness": analysis["brightness_score"],
                "status": analysis["status"]
            },
            "liveness": analysis["liveness"],
            "detail": "Face not registered or low confidence match"
        }
        
    # Valid Student found
    student = db.query(models.Student).filter(models.Student.id == match_id).first()
    
    now = datetime.now()
    today = date.today()
    current_time = now.time()
    day_of_week = now.strftime("%A")
    
    # Active Session Lookups
    timetable_entry = db.query(models.TimetableEntry).join(
        models.TimetableVersion
    ).filter(
        models.TimetableVersion.status == "Active",
        models.TimetableEntry.section_id == student.section_id,
        models.TimetableEntry.day_of_week == day_of_week,
        models.TimetableEntry.start_time <= current_time,
        models.TimetableEntry.end_time >= current_time
    ).first()
    
    if not timetable_entry:
        timetable_entry = db.query(models.TimetableEntry).join(
            models.TimetableVersion
        ).filter(
            models.TimetableVersion.status == "Active",
            models.TimetableEntry.section_id == student.section_id,
            models.TimetableEntry.day_of_week == day_of_week
        ).first()

    if not timetable_entry:
        timetable_entry = db.query(models.TimetableEntry).join(
            models.TimetableVersion
        ).filter(
            models.TimetableVersion.status == "Active",
            models.TimetableEntry.section_id == student.section_id
        ).first()

    if not timetable_entry:
        timetable_entry = db.query(models.TimetableEntry).join(
            models.TimetableVersion
        ).filter(
            models.TimetableVersion.status == "Active"
        ).first()

    if not timetable_entry:
        timetable_entry = db.query(models.TimetableEntry).first()
        
    # Check duplicate
    existing = None
    if timetable_entry:
        existing = db.query(models.Attendance).filter(
            models.Attendance.student_id == student.id,
            models.Attendance.timetable_entry_id == timetable_entry.id,
            models.Attendance.date == today
        ).first()
    else:
        existing = db.query(models.Attendance).filter(
            models.Attendance.student_id == student.id,
            models.Attendance.date == today
        ).first()
        
    if existing:
        return {
            "status": "success",
            "face_detected": True,
            "quality": {
                "score": analysis["quality_score"],
                "blur": analysis["blur_score"],
                "brightness": analysis["brightness_score"],
                "status": analysis["status"]
            },
            "liveness": analysis["liveness"],
            "match": {
                "student_id": student.id,
                "name": student.full_name,
                "usn": student.usn,
                "confidence": conf_str,
                "already_marked": True,
                "subject": timetable_entry.subject.name if (timetable_entry and timetable_entry.subject) else "Class",
                "faculty": timetable_entry.faculty.full_name if (timetable_entry and timetable_entry.faculty) else "N/A"
            },
            "detail": "Already marked for this session" if timetable_entry else "Already marked for today"
        }

    # If liveness verification check is completed, proceed to save attendance
    if liveness_verified:
        attendance = models.Attendance(
            student_id=student.id,
            timetable_entry_id=timetable_entry.id if timetable_entry else None,
            date=today,
            time=current_time,
            status="Present",
            method="Auto",
            confidence_score=conf_str
        )
        db.add(attendance)
        db.add(models.ScanAuditLog(
            student_id=student.id, 
            status="Success", 
            face_quality=analysis["quality_score"],
            confidence_score=percentage_conf,
            liveness_passed=True,
            ip_address=ip_address,
            device_info=device_info
        ))
        db.commit()
        
        return {
            "status": "success",
            "face_detected": True,
            "quality": {
                "score": analysis["quality_score"],
                "blur": analysis["blur_score"],
                "brightness": analysis["brightness_score"],
                "status": analysis["status"]
            },
            "liveness": analysis["liveness"],
            "match": {
                "student_id": student.id,
                "name": student.full_name,
                "usn": student.usn,
                "confidence": conf_str,
                "already_marked": False,
                "subject": timetable_entry.subject.name if (timetable_entry and timetable_entry.subject) else "Class",
                "faculty": timetable_entry.faculty.full_name if (timetable_entry and timetable_entry.faculty) else "N/A"
            },
            "message": f"Attendance Saved for {timetable_entry.subject.name if (timetable_entry and timetable_entry.subject) else 'Class'}"
        }
    else:
        # Liveness checks in progress on frontend - just return match preview
        return {
            "status": "success",
            "face_detected": True,
            "quality": {
                "score": analysis["quality_score"],
                "blur": analysis["blur_score"],
                "brightness": analysis["brightness_score"],
                "status": analysis["status"]
            },
            "liveness": analysis["liveness"],
            "match": {
                "student_id": student.id,
                "name": student.full_name,
                "usn": student.usn,
                "confidence": conf_str,
                "already_marked": False,
                "subject": timetable_entry.subject.name if (timetable_entry and timetable_entry.subject) else "Class",
                "faculty": timetable_entry.faculty.full_name if (timetable_entry and timetable_entry.faculty) else "N/A"
            },
            "detail": "Challenge in progress"
        }

@router.post("/mark_bulk")
async def mark_attendance_bulk(
    timetable_entry_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    section_id: Optional[int] = None,
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    entry = None
    if timetable_entry_id:
        entry = db.query(models.TimetableEntry).filter(models.TimetableEntry.id == timetable_entry_id).first()
        
    if not entry and subject_id and section_id:
        # Fallback 1: Find active timetable entry
        entry = db.query(models.TimetableEntry).join(
            models.TimetableVersion
        ).filter(
            models.TimetableVersion.status == "Active",
            models.TimetableEntry.subject_id == subject_id,
            models.TimetableEntry.section_id == section_id
        ).first()
        
        # Fallback 2: Find any timetable entry
        if not entry:
            entry = db.query(models.TimetableEntry).filter(
                models.TimetableEntry.subject_id == subject_id,
                models.TimetableEntry.section_id == section_id
            ).first()
            
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
        
    features, err = face_processing.extract_multiple_face_features(img)
    if err:
        return {"status": "error", "detail": err}
        
    all_encodings = db.query(models.FaceEncoding).all()
    db_features = {}
    for enc in all_encodings:
        if enc.student_id not in db_features:
            db_features[enc.student_id] = []
        db_features[enc.student_id].append(np.array(json.loads(enc.encoding_data), dtype=np.float32))
        
    recognized_ids = set()
    unknown_count = 0
    
    for feat in features:
        match_id, score = face_processing.find_best_match(feat, db_features)
        if match_id:
            recognized_ids.add(match_id)
        else:
            unknown_count += 1
            
    # Mark attendance for recognized students
    now = datetime.now()
    today = date.today()
    marked_count = 0
    
    for student_id in recognized_ids:
        # Check if already marked for THIS timetable entry today
        existing = db.query(models.Attendance).filter(
            models.Attendance.student_id == student_id,
            models.Attendance.timetable_entry_id == (entry.id if entry else None),
            models.Attendance.date == today
        ).first()
        
        if not existing:
            attendance = models.Attendance(
                timetable_entry_id=entry.id if entry else None,
                student_id=student_id,
                date=today,
                time=now.time(),
                status="Present",
                method="Bulk",
                confidence_score="Bulk"
            )
            db.add(attendance)
            db.add(models.ScanAuditLog(student_id=student_id, status="Success", liveness_passed=True))
            marked_count += 1
            
    db.commit()
    
    return {
        "status": "success",
        "detected": len(features),
        "recognized": len(recognized_ids),
        "newly_marked": marked_count,
        "unknown": unknown_count
    }


@router.post("/mark_manual", response_model=schemas.AttendanceResponse)
def mark_attendance_manual(
    record: schemas.AttendanceManualMark,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    today = date.today()
    now = datetime.now()
    
    existing = db.query(models.Attendance).filter(
        models.Attendance.student_id == record.student_id,
        models.Attendance.date == today
    ).first()
    
    if existing:
        existing.status = record.status
        existing.method = "Manual"
        db.commit()
        db.refresh(existing)
        return existing
        
    attendance = models.Attendance(
        student_id=record.student_id,
        date=today,
        time=now.time(),
        status=record.status,
        method="Manual",
        confidence_score="Manual"
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance

@router.get("/today")
def get_today_attendance(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    today = date.today()
    records = db.query(models.Attendance).filter(models.Attendance.date == today).all()
    return records
