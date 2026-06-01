import sys
import os

# Add parent directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.db.database import SessionLocal
from backend.db import models

def inspect_details():
    db = SessionLocal()
    
    print("HOD Table Content:")
    print("-" * 50)
    hods = db.query(models.HOD).all()
    for h in hods:
        print(f"ID: {h.id}, Username: '{h.username}', Name: '{h.full_name}', Dept ID: {h.department_id}")
    if not hods:
        print("HOD Table is completely empty!")
        
    print("\nFaculty Table Content:")
    print("-" * 50)
    faculty = db.query(models.Faculty).all()
    for f in faculty:
        print(f"ID: {f.id}, Username: '{f.username}', Name: '{f.full_name}', Faculty ID: '{f.faculty_id}', Dept ID: {f.department_id}")
    if not faculty:
        print("Faculty Table is completely empty!")
        
    db.close()

if __name__ == "__main__":
    inspect_details()
