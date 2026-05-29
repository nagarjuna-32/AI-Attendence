from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import json
import cv2
import numpy as np
from backend.db.database import get_db
from backend.db import models
from backend.api import schemas
from backend.api import deps
from backend.ml import face_processing

router = APIRouter()

@router.post("/register", response_model=schemas.StudentResponse)
async def register_student(
    full_name: str = Form(...),
    usn: str = Form(...),
    department: str = Form(...),
    semester: str = Form(...),
    section: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    eye_verified: bool = Form(False),
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    # Check if student already exists (USN, Email, Phone)
    if db.query(models.Student).filter(models.Student.usn == usn).first():
        raise HTTPException(status_code=400, detail="Student with this USN already exists.")
    if db.query(models.Student).filter(models.Student.email == email).first():
        raise HTTPException(status_code=400, detail="Email is already registered.")
    if db.query(models.Student).filter(models.Student.phone == phone).first():
        raise HTTPException(status_code=400, detail="Phone number is already registered.")
        
    if not eye_verified:
        raise HTTPException(status_code=400, detail="Liveness verification failed. Eye blink was not detected.")
        
    if len(images) < 3:
        raise HTTPException(status_code=400, detail="Please provide at least 3 face images.")
        
    extracted_features = []
    
    # Process images
    for image in images:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            continue
            
        if face_processing.check_blur(img):
            raise HTTPException(status_code=400, detail="One or more images are blurry. Please retake.")
            
        feature, err = face_processing.extract_face_feature(img)
        if err:
            raise HTTPException(status_code=400, detail=f"Image processing error: {err}")
            
        extracted_features.append(feature)
        
    if not extracted_features:
        raise HTTPException(status_code=400, detail="Could not extract face features from the provided images.")
        
    # Check for duplicate face registration
    all_encodings = db.query(models.FaceEncoding).all()
    db_features = {}
    for enc in all_encodings:
        if enc.student_id not in db_features:
            db_features[enc.student_id] = []
        db_features[enc.student_id].append(np.array(json.loads(enc.encoding_data), dtype=np.float32))
        
    for feat in extracted_features:
        match_id, _ = face_processing.find_best_match(feat, db_features)
        if match_id:
            matched_student = db.query(models.Student).filter(models.Student.id == match_id).first()
            raise HTTPException(status_code=400, detail=f"Face already registered with another student record ({matched_student.usn}).")
            
    # Save student
    student = models.Student(
        full_name=full_name, usn=usn, department=department,
        semester=semester, year_sem=semester, section=section, email=email, phone=phone,
        eye_verified=eye_verified
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    
    # Save encodings
    for feat in extracted_features:
        encoding = models.FaceEncoding(
            student_id=student.id,
            encoding_data=json.dumps(feat.tolist())
        )
        db.add(encoding)
        
    db.commit()
    return student

@router.get("/", response_model=List[schemas.StudentResponse])
def get_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    students = db.query(models.Student).offset(skip).limit(limit).all()
    return students
