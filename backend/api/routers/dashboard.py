from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from backend.db.database import get_db
from backend.db import models
from backend.api import deps
from backend.ml.prediction import get_risk_prediction
from typing import List
import json

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    total_students = db.query(models.Student).count()
    today = date.today()
    
    today_attendances = db.query(models.Attendance).filter(models.Attendance.date == today).all()
    
    present_count = sum(1 for a in today_attendances if a.status == "Present")
    absent_count = sum(1 for a in today_attendances if a.status == "Absent")
    late_count = sum(1 for a in today_attendances if a.status == "Late")
    
    unmarked_count = total_students - (present_count + absent_count + late_count)
    total_absent = absent_count + unmarked_count
    
    attendance_percentage = ((present_count + late_count) / total_students * 100) if total_students > 0 else 0
    
    # Unknown faces
    unknown_faces_count = db.query(models.UnknownFace).filter(models.UnknownFace.status == "unresolved").count()
    
    # Chart Data (Pie)
    chart_pie = {
        "labels": ["Present", "Late", "Absent"],
        "data": [present_count, late_count, total_absent]
    }
    
    # Weekly Data (Bar) - last 7 days
    dates = []
    present_data = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        dates.append(d.strftime("%a"))
        p = db.query(models.Attendance).filter(models.Attendance.date == d, models.Attendance.status.in_(["Present", "Late"])).count()
        present_data.append(p)
        
    chart_bar = {
        "labels": dates,
        "data": present_data
    }
    
    return {
        "total_students": total_students,
        "present": present_count,
        "late": late_count,
        "absent": total_absent,
        "percentage": round(attendance_percentage, 1),
        "unknown_faces_count": unknown_faces_count,
        "chart_pie": chart_pie,
        "chart_bar": chart_bar,
        "recent_logs": [
            {"student_name": a.student.full_name, "usn": a.student.usn, "time": str(a.time), "status": a.status, "method": a.method}
            for a in sorted(today_attendances, key=lambda x: x.time, reverse=True)[:10]
        ]
    }

@router.get("/risk_predictions")
def get_risk_predictions(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    students = db.query(models.Student).all()
    predictions = []
    
    # For a real app, this should be pre-calculated in a background job
    # Here we calculate on-the-fly for demonstration
    for student in students:
        # Calculate historical stats
        total_days = 30 # assume a 30-day window for now
        attendances = db.query(models.Attendance).filter(models.Attendance.student_id == student.id).all()
        
        present = sum(1 for a in attendances if a.status in ["Present"])
        late = sum(1 for a in attendances if a.status == "Late")
        absent = sum(1 for a in attendances if a.status == "Absent")
        
        # Calculate consecutive absences (simplified logic for demonstration: just using recent ones)
        sorted_att = sorted(attendances, key=lambda x: x.date, reverse=True)
        consecutive_abs = 0
        for a in sorted_att:
            if a.status == "Absent":
                consecutive_abs += 1
            else:
                break
                
        # Handle case where student has no records yet
        if not attendances:
            att_pct = 100.0 # Start with good standing
        else:
            att_pct = ((present + late) / len(attendances)) * 100
            
        risk_level, probability = get_risk_prediction(att_pct, consecutive_abs, late)
        
        predictions.append({
            "student_name": student.full_name,
            "usn": student.usn,
            "attendance_percentage": round(att_pct, 1),
            "risk_level": risk_level,
            "probability": round(probability * 100, 1)
        })
        
    # Sort by risk (High -> Medium -> Low)
    risk_order = {"High": 0, "Medium": 1, "Low": 2, "Unknown": 3}
    predictions.sort(key=lambda x: (risk_order.get(x["risk_level"], 3), -x["probability"]))
    
    return predictions

@router.get("/heatmaps/{student_id}")
def get_student_heatmap(student_id: int, db: Session = Depends(get_db)):
    # Generate a 30-day mock/real heatmap for the student
    today = date.today()
    start_date = today - timedelta(days=30)
    
    attendances = db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id,
        models.Attendance.date >= start_date
    ).all()
    
    # Map dates to status
    status_map = {a.date.isoformat(): a.status for a in attendances}
    
    heatmap_data = []
    for i in range(30):
        d = start_date + timedelta(days=i)
        d_str = d.isoformat()
        status = status_map.get(d_str, "Unmarked")
        
        # Assign color severity
        color = "bg-slate-800" # Unmarked
        if status == "Present": color = "bg-emerald-500"
        elif status == "Late": color = "bg-amber-500"
        elif status == "Absent": color = "bg-rose-500"
        
        heatmap_data.append({
            "date": d_str,
            "status": status,
            "color": color
        })
        
    return heatmap_data

@router.get("/recommendations/{student_id}")
def get_student_recommendations(student_id: int, db: Session = Depends(get_db)):
    # Calculate classes needed to reach 75%
    total_classes = 40 # arbitrary for now, usually derived from Subject total sessions
    attendances = db.query(models.Attendance).filter(models.Attendance.student_id == student_id).all()
    
    attended = sum(1 for a in attendances if a.status in ["Present", "Late"])
    missed = sum(1 for a in attendances if a.status == "Absent")
    current_total = attended + missed
    
    if current_total == 0:
        return {"message": "Great start! Keep attending classes to maintain 100%."}
        
    current_pct = (attended / current_total) * 100
    
    if current_pct >= 75:
        # Buffer calculation
        buffer = 0
        while ((attended) / (current_total + buffer + 1)) * 100 >= 75:
            buffer += 1
        return {"message": f"You are safe. You can afford to miss {buffer} classes."}
    else:
        # Needed calculation
        needed = 0
        while ((attended + needed) / (current_total + needed)) * 100 < 75:
            needed += 1
        return {"message": f"Warning! You must attend the next {needed} classes continuously to reach 75%."}
