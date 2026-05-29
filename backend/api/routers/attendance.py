from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request

# (Keep imports same, just need Request from fastapi)
# I will use multi_replace_file_content or just rewrite the entire router imports.

@router.post("/mark_auto")
async def mark_attendance_auto(
    request: Request,
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    device_info = request.headers.get("user-agent", "unknown")
    
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
        
    feature, quality_score, err = face_processing.extract_face_feature(img)
    
    if quality_score < 75.0:
        db.add(models.ScanAuditLog(
            status="Failed", 
            failure_reason="Face quality too low", 
            face_quality=quality_score,
            liveness_passed=True,
            ip_address=ip_address,
            device_info=device_info
        ))
        db.commit()
        return {"status": "error", "detail": f"Face Quality too low ({round(quality_score, 1)}%). Please retry in good lighting."}

    if err:
        return {"status": "error", "detail": err}
        
    all_encodings = db.query(models.FaceEncoding).all()
    db_features = {}
    for enc in all_encodings:
        if enc.student_id not in db_features:
            db_features[enc.student_id] = []
        db_features[enc.student_id].append(np.array(json.loads(enc.encoding_data), dtype=np.float32))
        
    # Default SFace threshold is 0.363, but we want high confidence (e.g., 0.50 for 90% strictness heuristic)
    match_id, score = face_processing.find_best_match(feature, db_features, threshold=0.45) 
    
    # 0.45 cosine similarity is roughly equivalent to high strictness in SFace
    percentage_conf = min(100.0, max(0.0, score * 200))
    
    if not match_id or percentage_conf < 90.0:
        if percentage_conf < 90.0 and match_id:
            reason = f"Low confidence match ({round(percentage_conf, 1)}%)"
        else:
            reason = "Face not registered"
            
        db.add(models.ScanAuditLog(
            status="Failed", 
            failure_reason=reason, 
            face_quality=quality_score,
            confidence_score=percentage_conf,
            liveness_passed=True,
            ip_address=ip_address,
            device_info=device_info
        ))
        db.commit()
        return {"status": "unknown", "detail": "Face not registered or low confidence. Please try again."}
        
    student = db.query(models.Student).filter(models.Student.id == match_id).first()
    
    now = datetime.now()
    today = date.today()
    current_time = now.time()
    day_of_week = now.strftime("%A")
    
    # Check Active Timetable Session
    timetable_entry = db.query(models.TimetableEntry).join(
        models.TimetableVersion
    ).filter(
        models.TimetableVersion.status == "Active",
        models.TimetableEntry.section_id == student.section_id,
        models.TimetableEntry.day_of_week == day_of_week,
        models.TimetableEntry.start_time <= current_time,
        models.TimetableEntry.end_time >= current_time
    ).first()
    
    conf_str = f"{round(percentage_conf, 2)}%"
    
    if not timetable_entry:
        db.add(models.ScanAuditLog(
            student_id=student.id, 
            status="Failed", 
            failure_reason="Outside timetable slot", 
            face_quality=quality_score,
            confidence_score=percentage_conf,
            liveness_passed=True,
            ip_address=ip_address,
            device_info=device_info
        ))
        db.commit()
        return {"status": "error", "detail": "No active class for your section right now.", "student": {"name": student.full_name}}
    
    # Check Duplicate
    existing = db.query(models.Attendance).filter(
        models.Attendance.student_id == student.id,
        models.Attendance.timetable_entry_id == timetable_entry.id,
        models.Attendance.date == today
    ).first()
    
    if existing:
        db.add(models.ScanAuditLog(
            student_id=student.id, 
            status="Failed", 
            failure_reason="Duplicate scan", 
            face_quality=quality_score,
            confidence_score=percentage_conf,
            liveness_passed=True,
            ip_address=ip_address,
            device_info=device_info
        ))
        db.commit()
        return {
            "status": "success",
            "message": "Already marked for this session",
            "student": {"name": student.full_name, "usn": student.usn, "confidence": conf_str}
        }
        
    attendance = models.Attendance(
        student_id=student.id,
        timetable_entry_id=timetable_entry.id,
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
        face_quality=quality_score,
        confidence_score=percentage_conf,
        liveness_passed=True,
        ip_address=ip_address,
        device_info=device_info
    ))
    db.commit()
    
    return {
        "status": "success",
        "message": f"Attendance Saved for {timetable_entry.subject.name if timetable_entry.subject else 'Class'}",
        "student": {"name": student.full_name, "usn": student.usn, "confidence": conf_str}
    }

@router.post("/mark_bulk")
async def mark_attendance_bulk(
    timetable_entry_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    entry = db.query(models.TimetableEntry).filter(models.TimetableEntry.id == timetable_entry_id).first()
    if not entry:
        raise HTTPException(status_code=400, detail="Invalid timetable entry")
        
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
            models.Attendance.timetable_entry_id == timetable_entry_id,
            models.Attendance.date == today
        ).first()
        
        if not existing:
            attendance = models.Attendance(
                timetable_entry_id=timetable_entry_id,
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
