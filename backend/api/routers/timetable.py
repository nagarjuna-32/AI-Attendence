import pandas as pd
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from backend.db.database import get_db
from backend.db import models
from backend.api import deps

router = APIRouter()

@router.post("/upload")
async def upload_timetable(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Only HOD can upload timetable")
        
    contents = await file.read()
    filename = file.filename.lower()
    
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(contents))
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .csv or .xlsx")
            
        required_cols = ["Day", "Start Time", "End Time", "Subject Code", "Section", "Faculty Username"]
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")
                
        # Get latest version number
        last_version = db.query(models.TimetableVersion).filter(
            models.TimetableVersion.department_id == current_user.department_id
        ).order_by(models.TimetableVersion.version.desc()).first()
        v_num = (last_version.version + 1) if last_version else 1
        
        new_version = models.TimetableVersion(
            department_id=current_user.department_id,
            version=v_num,
            status="Draft",
            created_by=current_user.id
        )
        db.add(new_version)
        db.flush()
        
        for index, row in df.iterrows():
            subj = db.query(models.Subject).filter(models.Subject.code == str(row["Subject Code"])).first()
            if not subj: continue
                
            sec = db.query(models.Section).filter(models.Section.name == str(row["Section"])).first()
            if not sec: continue
                
            fac = db.query(models.Faculty).filter(models.Faculty.username == str(row["Faculty Username"])).first()
            
            entry = models.TimetableEntry(
                version_id=new_version.id,
                day_of_week=str(row["Day"]).strip(),
                start_time=datetime.strptime(str(row["Start Time"]).strip(), "%H:%M").time(),
                end_time=datetime.strptime(str(row["End Time"]).strip(), "%H:%M").time(),
                subject_id=subj.id,
                section_id=sec.id,
                faculty_id=fac.id if fac else None
            )
            db.add(entry)
            
        db.commit()
        return {"status": "success", "message": "Timetable uploaded successfully", "version_id": new_version.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")

@router.get("/")
def get_timetables(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    versions = db.query(models.TimetableVersion).filter(
        models.TimetableVersion.department_id == current_user.department_id
    ).order_by(models.TimetableVersion.created_at.desc()).all()
    
    result = []
    for v in versions:
        entries = db.query(models.TimetableEntry).filter(models.TimetableEntry.version_id == v.id).all()
        ent_list = []
        for e in entries:
            ent_list.append({
                "id": e.id,
                "day_of_week": e.day_of_week,
                "start_time": e.start_time.strftime("%H:%M"),
                "end_time": e.end_time.strftime("%H:%M"),
                "subject": {"id": e.subject_id, "name": e.subject.name if e.subject else None, "code": e.subject.code if e.subject else None},
                "section": {"id": e.section_id, "name": e.section.name if e.section else None},
                "faculty": {"id": e.faculty_id, "name": e.faculty.full_name if e.faculty else None}
            })
        result.append({
            "id": v.id,
            "version": v.version,
            "status": v.status,
            "created_at": v.created_at,
            "entries": ent_list
        })
        
    return result

@router.put("/entry/{entry_id}")
def update_entry(
    entry_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    entry = db.query(models.TimetableEntry).filter(models.TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    if "day_of_week" in data: entry.day_of_week = data["day_of_week"]
    if "start_time" in data: entry.start_time = datetime.strptime(data["start_time"], "%H:%M").time()
    if "end_time" in data: entry.end_time = datetime.strptime(data["end_time"], "%H:%M").time()
    if "subject_id" in data: entry.subject_id = data["subject_id"]
    if "section_id" in data: entry.section_id = data["section_id"]
    if "faculty_id" in data: entry.faculty_id = data["faculty_id"]
    
    db.commit()
    return {"status": "success", "message": "Entry updated"}

@router.delete("/entry/{entry_id}")
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    entry = db.query(models.TimetableEntry).filter(models.TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    db.delete(entry)
    db.commit()
    return {"status": "success", "message": "Entry deleted"}
