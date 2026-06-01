import sys
import os

# Add parent directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.db.database import SessionLocal
from backend.db import models

def inspect():
    db = SessionLocal()
    tables = [
        models.Department,
        models.Course,
        models.Semester,
        models.Section,
        models.Subject,
        models.Principal,
        models.HOD,
        models.Faculty,
        models.FacultySubject,
        models.TimetableVersion,
        models.TimetableEntry,
        models.Student,
        models.FaceEncoding,
        models.Attendance,
        models.UnknownFace,
        models.AttendancePrediction,
        models.ScanAuditLog,
        models.AttendanceCorrectionRequest,
        models.AlertHistory,
        models.Notification,
        models.ActivityLog
    ]
    
    print("Database Table Counts:")
    print("-" * 40)
    for table in tables:
        count = db.query(table).count()
        print(f"{table.__tablename__:<30}: {count}")
    
    db.close()

if __name__ == "__main__":
    inspect()
