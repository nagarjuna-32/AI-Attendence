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

def parse_time_string(val):
    val_str = str(val).strip()
    # Handle direct time or datetime stringification formats
    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M:%S %p"):
        try:
            return datetime.strptime(val_str, fmt).time()
        except ValueError:
            pass
    # If the string contains only hours/minutes
    raise ValueError(f"Unable to parse time: {val}")

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
            subj = db.query(models.Subject).filter(models.Subject.code == str(row["Subject Code"]).strip()).first()
            if not subj: continue
                
            sec = db.query(models.Section).filter(models.Section.name == str(row["Section"]).strip()).first()
            if not sec: continue
                
            fac = db.query(models.Faculty).filter(models.Faculty.username == str(row["Faculty Username"]).strip()).first()
            
            try:
                start_t = parse_time_string(row["Start Time"])
                end_t = parse_time_string(row["End Time"])
            except ValueError:
                # If Excel reads it as datetime object directly
                if hasattr(row["Start Time"], "time"):
                    start_t = row["Start Time"].time()
                else:
                    start_t = parse_time_string(str(row["Start Time"]))
                
                if hasattr(row["End Time"], "time"):
                    end_t = row["End Time"].time()
                else:
                    end_t = parse_time_string(str(row["End Time"]))

            entry = models.TimetableEntry(
                version_id=new_version.id,
                day_of_week=str(row["Day"]).strip(),
                start_time=start_t,
                end_time=end_t,
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

@router.post("/new-version")
def create_new_version(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
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
    db.commit()
    db.refresh(new_version)
    return {"status": "success", "message": "Draft version created successfully.", "version_id": new_version.id}

@router.post("/entry")
def create_entry(data: dict, db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    try:
        start_t = datetime.strptime(data["start_time"], "%H:%M").time()
        end_t = datetime.strptime(data["end_time"], "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
        
    entry = models.TimetableEntry(
        version_id=data["version_id"],
        day_of_week=data["day_of_week"],
        start_time=start_t,
        end_time=end_t,
        subject_id=data["subject_id"],
        section_id=data["section_id"],
        faculty_id=data.get("faculty_id")
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"status": "success", "message": "Timetable entry added successfully.", "entry_id": entry.id}

@router.post("/upload-text")
def upload_timetable_text(
    data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    if current_user.role != "hod":
        raise HTTPException(status_code=403, detail="Only HOD can upload timetable")
        
    text = data.get("text", "")
    semester_id = data.get("semester_id")
    version_id = data.get("version_id")
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    import io
    
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    if not lines:
        raise HTTPException(status_code=400, detail="No text lines found")
        
    # Check if header is present (using header-specific keywords to avoid 'day' matching weekdays like 'Monday')
    first_line = lines[0].lower()
    has_header = ("subject code" in first_line or "start time" in first_line or "end time" in first_line or "faculty username" in first_line)
    
    if not has_header:
        text_to_parse = "Day,Start Time,End Time,Subject Code,Section,Faculty Username\n" + "\n".join(lines)
    else:
        text_to_parse = "\n".join(lines)
        
    try:
        df = pd.read_csv(io.StringIO(text_to_parse))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse text as CSV: {str(e)}")
        
    required_cols = ["Day", "Start Time", "End Time", "Subject Code", "Section", "Faculty Username"]
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing column '{col}'. Required order if no header: Day, Start Time, End Time, Subject Code, Section, Faculty Username"
            )
            
    try:
        if version_id:
            # Append to existing version
            version = db.query(models.TimetableVersion).filter(
                models.TimetableVersion.id == int(version_id),
                models.TimetableVersion.department_id == current_user.department_id
            ).first()
            if not version:
                raise HTTPException(status_code=404, detail="Selected timetable version not found")
        else:
            # Create a new version
            last_version = db.query(models.TimetableVersion).filter(
                models.TimetableVersion.department_id == current_user.department_id
            ).order_by(models.TimetableVersion.version.desc()).first()
            v_num = (last_version.version + 1) if last_version else 1
            
            version = models.TimetableVersion(
                department_id=current_user.department_id,
                version=v_num,
                status="Draft",
                created_by=current_user.id
            )
            db.add(version)
            db.flush()
            
        added_count = 0
        for index, row in df.iterrows():
            subj_code = str(row["Subject Code"]).strip()
            subj = db.query(models.Subject).filter(models.Subject.code == subj_code).first()
            if not subj:
                raise HTTPException(status_code=400, detail=f"Subject Code '{subj_code}' in row {index+1} not found in database.")
                
            sec_name = str(row["Section"]).strip()
            sec = db.query(models.Section).filter(models.Section.name == sec_name).first()
            if not sec:
                raise HTTPException(status_code=400, detail=f"Section '{sec_name}' in row {index+1} not found in database.")
                
            fac_uname = str(row["Faculty Username"]).strip() if "Faculty Username" in df.columns else ""
            fac = None
            if fac_uname and fac_uname.lower() != 'nan' and fac_uname.lower() != 'none' and fac_uname.lower() != '':
                fac = db.query(models.Faculty).filter(models.Faculty.username == fac_uname).first()
                if not fac:
                    raise HTTPException(status_code=400, detail=f"Faculty Username '{fac_uname}' in row {index+1} not found in database.")
            
            try:
                start_t = parse_time_string(row["Start Time"])
                end_t = parse_time_string(row["End Time"])
            except Exception:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid time format in row {index+1}: Start='{row['Start Time']}', End='{row['End Time']}'"
                )
                
            entry = models.TimetableEntry(
                version_id=version.id,
                day_of_week=str(row["Day"]).strip(),
                start_time=start_t,
                end_time=end_t,
                subject_id=subj.id,
                section_id=sec.id,
                faculty_id=fac.id if fac else None
            )
            db.add(entry)
            added_count += 1
            
        db.commit()
        return {
            "status": "success", 
            "message": f"Successfully imported {added_count} entries to Version {version.version}!", 
            "version_id": version.id
        }
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error importing timetable: {str(e)}")
