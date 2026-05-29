from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import json
import cv2
import numpy as np
import os
import uuid
from datetime import date, datetime
from backend.db.database import get_db
from backend.db import models
from backend.api import schemas
from backend.api import deps
from backend.ml import face_processing
from backend.core.config import settings

router = APIRouter()

@router.post("/mark_auto")
async def mark_attendance_auto(
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
        
    feature, err = face_processing.extract_face_feature(img)
    if err:
        return {"status": "error", "detail": err}
        
    all_encodings = db.query(models.FaceEncoding).all()
    db_features = {}
    for enc in all_encodings:
        if enc.student_id not in db_features:
            db_features[enc.student_id] = []
        db_features[enc.student_id].append(np.array(json.loads(enc.encoding_data), dtype=np.float32))
        
    match_id, score = face_processing.find_best_match(feature, db_features)
    
    if not match_id:
        # Save unknown face
        filename = f"unknown_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join(settings.UPLOADS_DIR, filename)
        cv2.imwrite(filepath, img)
        
        unknown = models.UnknownFace(image_path=filepath)
        db.add(unknown)
        db.commit()
        
        return {"status": "unknown", "detail": "New face detected. Please register first."}
        
    student = db.query(models.Student).filter(models.Student.id == match_id).first()
    
    # Check if already marked today
    today = date.today()
    existing = db.query(models.Attendance).filter(
        models.Attendance.student_id == match_id,
        models.Attendance.date == today
    ).first()
    
    conf_str = f"{round(score*100, 2)}%"
    
    if existing:
        return {
            "status": "success",
            "message": "Already marked present today",
            "student": {"name": student.full_name, "usn": student.usn, "confidence": conf_str}
        }
        
    now = datetime.now()
    attendance = models.Attendance(
        student_id=match_id,
        date=today,
        time=now.time(),
        status="Present",
        method="Auto",
        marked_by="system",
        confidence_score=conf_str
    )
    db.add(attendance)
    db.commit()
    
    return {
        "status": "success",
        "message": "Attendance Saved",
        "student": {"name": student.full_name, "usn": student.usn, "confidence": conf_str}
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
        existing.marked_by = current_user.username
        db.commit()
        db.refresh(existing)
        return existing
        
    attendance = models.Attendance(
        student_id=record.student_id,
        date=today,
        time=now.time(),
        status=record.status,
        method="Manual",
        marked_by=current_user.username,
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
