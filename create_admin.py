import os
import sys
from datetime import datetime, time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from backend.db.database import engine, Base, SessionLocal
from backend.db.models import Principal, HOD, Faculty, Department, Course, Semester, Section, Subject, FacultySubject, Student, TimetableVersion, TimetableEntry
from backend.core.security import get_password_hash

def seed():
    print("Creating database schema...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Create Principal
        if not db.query(Principal).filter(Principal.username == "principal").first():
            db.add(Principal(username="principal", password_hash=get_password_hash("principal123")))
            
        # 2. Architecture Hierarchy
        dept = db.query(Department).filter(Department.name == "Computer Science").first()
        if not dept:
            dept = Department(name="Computer Science", code="CSE")
            db.add(dept)
            db.commit()
            db.refresh(dept)
            
            # HOD
            hod = HOD(username="hod_cse", password_hash=get_password_hash("hod123"), full_name="Dr. Alan", department_id=dept.id)
            db.add(hod)
            db.commit()
            db.refresh(hod)
            
            course = Course(name="B.Tech", department_id=dept.id)
            db.add(course)
            db.commit()
            db.refresh(course)
            
            sem = Semester(number=4, course_id=course.id)
            db.add(sem)
            db.commit()
            db.refresh(sem)
            
            sec = Section(name="A", semester_id=sem.id)
            db.add(sec)
            db.commit()
            db.refresh(sec)
            
            sub = Subject(code="CS101", name="DBMS", semester_id=sem.id)
            db.add(sub)
            db.commit()
            db.refresh(sub)
            
            # 3. Create Faculty
            faculty = Faculty(username="faculty", password_hash=get_password_hash("faculty123"), full_name="Dr. Kumar", department_id=dept.id)
            db.add(faculty)
            db.commit()
            db.refresh(faculty)
            
            fs = FacultySubject(faculty_id=faculty.id, subject_id=sub.id, section_id=sec.id)
            db.add(fs)
            
            # 4. Create Timetable (Automated Session)
            # Create a 24/7 active slot for testing (so attendance can be marked right now)
            tt_version = TimetableVersion(department_id=dept.id, version=1, status="Active", created_by=hod.id)
            db.add(tt_version)
            db.commit()
            db.refresh(tt_version)
            
            days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            for day in days:
                entry = TimetableEntry(
                    version_id=tt_version.id,
                    day_of_week=day,
                    start_time=time(0, 0), # 12:00 AM
                    end_time=time(23, 59), # 11:59 PM - covers entire day for testing
                    subject_id=sub.id,
                    section_id=sec.id,
                    faculty_id=faculty.id
                )
                db.add(entry)
            
            # 5. Create Test Student
            student = Student(username="student", password_hash=get_password_hash("student123"), full_name="Test Student", usn="1RV26CS001", section_id=sec.id, email="test@college.edu")
            db.add(student)
            db.commit()
            
            print("Seeded Architecture, Roles (Principal, HOD, Faculty), and Timetable.")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed()
