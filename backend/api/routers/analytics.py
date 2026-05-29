from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import Optional
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse

from backend.db.database import get_db
from backend.db import models
from backend.api import deps

router = APIRouter()

@router.get("/overview")
def get_overview(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    """Returns top-level dashboard metrics for the whole college."""
    
    # Restrict to HOD's department if they are HOD
    dept_filter = []
    if current_user.role == "hod":
        dept_filter = [models.Student.section.has(models.Section.semester.has(models.Semester.course.has(models.Course.department_id == current_user.department_id)))]
        
    total_students = db.query(models.Student).filter(*dept_filter).count()
    
    today = date.today()
    attendances_today = db.query(models.Attendance).join(models.Student).filter(
        models.Attendance.date == today,
        *dept_filter
    ).all()
    
    present_today = sum(1 for a in attendances_today if a.status == "Present")
    absent_today = sum(1 for a in attendances_today if a.status == "Absent")
    
    # Calculate overall college attendance percentage
    total_records = db.query(models.Attendance).join(models.Student).filter(*dept_filter).count()
    present_records = db.query(models.Attendance).join(models.Student).filter(
        models.Attendance.status == "Present",
        *dept_filter
    ).count()
    
    overall_percentage = (present_records / total_records * 100) if total_records > 0 else 0
    
    # Dept-wise ranking
    depts = db.query(models.Department).all()
    dept_stats = []
    for d in depts:
        d_total = db.query(models.Attendance).join(models.Student).join(models.Section).join(models.Semester).join(models.Course).filter(
            models.Course.department_id == d.id
        ).count()
        d_present = db.query(models.Attendance).join(models.Student).join(models.Section).join(models.Semester).join(models.Course).filter(
            models.Course.department_id == d.id,
            models.Attendance.status == "Present"
        ).count()
        if d_total > 0:
            dept_stats.append({
                "id": d.id,
                "name": d.name,
                "percentage": round(d_present / d_total * 100, 1)
            })
            
    dept_stats.sort(key=lambda x: x["percentage"], reverse=True)
    
    best_dept = dept_stats[0] if dept_stats else {"name": "N/A", "percentage": 0}
    worst_dept = dept_stats[-1] if dept_stats else {"name": "N/A", "percentage": 0}
    
    return {
        "total_students": total_students,
        "present_today": present_today,
        "absent_today": absent_today,
        "overall_percentage": round(overall_percentage, 1),
        "best_dept": best_dept,
        "worst_dept": worst_dept,
        "dept_rankings": dept_stats[:5] # Top 5
    }

@router.get("/filter")
def filter_analytics(
    department_id: Optional[int] = None,
    semester: Optional[int] = None,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Filters data for charts and deep dives."""
    
    if current_user.role == "hod":
        department_id = current_user.department_id
        
    query = db.query(models.Attendance).join(models.Student).join(models.Section).join(models.Semester).join(models.Course)
    student_q = db.query(models.Student).join(models.Section).join(models.Semester).join(models.Course)
    
    if department_id:
        query = query.filter(models.Course.department_id == department_id)
        student_q = student_q.filter(models.Course.department_id == department_id)
    if semester:
        query = query.filter(models.Semester.number == semester)
        student_q = student_q.filter(models.Semester.number == semester)
    if section_id:
        query = query.filter(models.Section.id == section_id)
        student_q = student_q.filter(models.Section.id == section_id)
        
    total_students = student_q.count()
    
    records = query.all()
    present_count = sum(1 for r in records if r.status == "Present")
    absent_count = sum(1 for r in records if r.status == "Absent")
    overall_percentage = (present_count / len(records) * 100) if records else 0
    
    # Calculate students below 75%
    student_stats = {}
    for r in records:
        if r.student_id not in student_stats:
            student_stats[r.student_id] = {"total": 0, "present": 0, "name": r.student.full_name, "usn": r.student.usn}
        student_stats[r.student_id]["total"] += 1
        if r.status == "Present":
            student_stats[r.student_id]["present"] += 1
            
    defaulters = []
    for sid, stats in student_stats.items():
        pct = stats["present"] / stats["total"] * 100
        if pct < 75:
            defaulters.append({"usn": stats["usn"], "name": stats["name"], "percentage": round(pct, 1)})
            
    # Chart Data: Subject wise attendance
    subject_stats = {}
    for r in records:
        subj = r.timetable_entry.subject.name if r.timetable_entry and r.timetable_entry.subject else "Unknown"
        if subj not in subject_stats:
            subject_stats[subj] = {"total": 0, "present": 0}
        subject_stats[subj]["total"] += 1
        if r.status == "Present":
            subject_stats[subj]["present"] += 1
            
    chart_subjects = {k: round(v["present"]/v["total"]*100, 1) for k, v in subject_stats.items()}
    
    # Chart Data: Monthly
    monthly_stats = {}
    for r in records:
        month = r.date.strftime("%b")
        if month not in monthly_stats:
            monthly_stats[month] = {"total": 0, "present": 0}
        monthly_stats[month]["total"] += 1
        if r.status == "Present":
            monthly_stats[month]["present"] += 1
            
    chart_monthly = {k: round(v["present"]/v["total"]*100, 1) for k, v in monthly_stats.items()}
    
    return {
        "total_students": total_students,
        "present_count": present_count,
        "absent_count": absent_count,
        "percentage": round(overall_percentage, 1),
        "defaulters": sorted(defaulters, key=lambda x: x["percentage"])[:10],
        "charts": {
            "subjects": chart_subjects,
            "monthly": chart_monthly
        }
    }

@router.get("/export")
def export_report(
    format: str = "csv",
    department_id: Optional[int] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    if current_user.role == "hod":
        department_id = current_user.department_id
        
    query = db.query(models.Attendance).join(models.Student).join(models.Section).join(models.Semester).join(models.Course)
    
    if department_id:
        query = query.filter(models.Course.department_id == department_id)
    if semester:
        query = query.filter(models.Semester.number == semester)
        
    records = query.all()
    
    data = []
    for r in records:
        subj = r.timetable_entry.subject.name if r.timetable_entry and r.timetable_entry.subject else "Unknown"
        dept = r.student.section.semester.course.department.name
        sem = r.student.section.semester.number
        sec = r.student.section.name
        
        data.append({
            "Date": r.date.isoformat(),
            "Time": r.time.isoformat(),
            "Student Name": r.student.full_name,
            "USN": r.student.usn,
            "Department": dept,
            "Semester": sem,
            "Section": sec,
            "Subject": subj,
            "Status": r.status,
            "Method": r.method,
            "Confidence": r.confidence_score
        })
        
    df = pd.DataFrame(data)
    
    if format == "csv":
        csv_data = df.to_csv(index=False)
        return StreamingResponse(
            iter([csv_data]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=attendance_report.csv"}
        )
    elif format == "excel":
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Attendance')
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=attendance_report.xlsx"}
        )
    elif format == "pdf":
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        from reportlab.lib import colors
        
        output = BytesIO()
        doc = SimpleDocTemplate(output, pagesize=letter)
        elements = []
        
        # Build Table Data
        table_data = [["Date", "Time", "Student Name", "USN", "Subject", "Status"]]
        for d in data:
            table_data.append([
                d["Date"], d["Time"][:5], d["Student Name"], d["USN"], d["Subject"], d["Status"]
            ])
            
        t = Table(table_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(t)
        doc.build(elements)
        
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=attendance_report.pdf"}
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'csv', 'excel', or 'pdf'.")
