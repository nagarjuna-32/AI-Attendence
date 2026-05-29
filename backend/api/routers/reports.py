from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import date
import pandas as pd
import os
from backend.db.database import get_db
from backend.db import models
from backend.core.config import settings
from backend.api import deps
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

router = APIRouter()

@router.get("/csv")
def export_csv_report(
    start_date: date = None, 
    end_date: date = None, 
    db: Session = Depends(get_db), 
    current_user = Depends(deps.get_current_user)
):
    if not start_date:
        start_date = date.today()
    if not end_date:
        end_date = date.today()
        
    attendances = db.query(models.Attendance).filter(
        models.Attendance.date >= start_date,
        models.Attendance.date <= end_date
    ).all()
    
    data = []
    for a in attendances:
        data.append({
            "Name": a.student.full_name,
            "USN": a.student.usn,
            "Department": a.student.department,
            "Date": a.date,
            "Time": a.time,
            "Status": a.status,
            "Method": a.method,
            "Marked By": a.marked_by
        })
        
    df = pd.DataFrame(data)
    os.makedirs(settings.BASE_DIR + "/reports", exist_ok=True)
    file_path = os.path.join(settings.BASE_DIR, "reports", f"attendance_{start_date}_to_{end_date}.csv")
    df.to_csv(file_path, index=False)
    
    return FileResponse(path=file_path, filename=f"attendance_{start_date}_to_{end_date}.csv", media_type='text/csv')

@router.get("/pdf")
def export_pdf_report(
    start_date: date = None, 
    end_date: date = None, 
    db: Session = Depends(get_db), 
    current_user = Depends(deps.get_current_user)
):
    if not start_date:
        start_date = date.today()
    if not end_date:
        end_date = date.today()
        
    attendances = db.query(models.Attendance).filter(
        models.Attendance.date >= start_date,
        models.Attendance.date <= end_date
    ).all()
    
    os.makedirs(settings.BASE_DIR + "/reports", exist_ok=True)
    file_path = os.path.join(settings.BASE_DIR, "reports", f"attendance_{start_date}_to_{end_date}.pdf")
    
    doc = SimpleDocTemplate(file_path, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    elements.append(Paragraph(f"Attendance Report ({start_date} to {end_date})", title_style))
    elements.append(Spacer(1, 20))
    
    data = [["Name", "USN", "Date", "Time", "Status"]]
    for a in attendances:
        data.append([
            a.student.full_name,
            a.student.usn,
            str(a.date),
            str(a.time),
            a.status
        ])
        
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    return FileResponse(path=file_path, filename=f"attendance_{start_date}_to_{end_date}.pdf", media_type='application/pdf')
