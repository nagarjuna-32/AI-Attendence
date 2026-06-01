import sys
import os

# Add parent directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.db.database import SessionLocal
from backend.db import models

def delete_data():
    db = SessionLocal()
    
    # 1. Print principal info
    principal = db.query(models.Principal).first()
    if principal:
        print(f"Keeping Principal Account: Username = '{principal.username}'")
    else:
        print("Warning: No Principal account found in the database!")

    # 2. Define tables to clear in dependency order
    tables_to_clear = [
        ("Attendance Records", models.Attendance),
        ("Face Encodings", models.FaceEncoding),
        ("Attendance Predictions", models.AttendancePrediction),
        ("Scan Audit Logs", models.ScanAuditLog),
        ("Alert History", models.AlertHistory),
        ("Attendance Correction Requests", models.AttendanceCorrectionRequest),
        ("Unknown Faces", models.UnknownFace),
        ("Notifications", models.Notification),
        ("Activity Logs", models.ActivityLog),
        ("Timetable Entries", models.TimetableEntry),
        ("Timetable Versions", models.TimetableVersion),
        ("Faculty-Subject Assignments", models.FacultySubject),
        ("Faculty Accounts", models.Faculty),
        ("Student Registrations", models.Student),
        ("HOD Accounts", models.HOD)
    ]
    
    print("\nDeleting Operational and Real User Data...")
    print("-" * 50)
    
    for label, table in tables_to_clear:
        count = db.query(table).count()
        if count > 0:
            db.query(table).delete(synchronize_session=False)
            print(f"Deleted {count} records from {label} ({table.__tablename__})")
        else:
            print(f"No records to delete from {label} ({table.__tablename__})")
            
    db.commit()
    db.close()
    print("-" * 50)
    print("Database cleanup complete! All real user, student, and timetable data deleted, keeping structural VTU scheme and Principal login intact.")

if __name__ == "__main__":
    delete_data()
