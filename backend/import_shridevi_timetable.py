import sys
from datetime import time

# Add backend and root to path
sys.path.append(r"c:\Users\Nagarjuna\OneDrive\Desktop\mini project")

from backend.db.database import SessionLocal
from backend.db import models
from backend.core import security

def seed_timetable():
    db = SessionLocal()
    try:
        print("[+] Starting Shridevi AI&DS Timetable database seed...")
        
        # 1. Create/Retrieve Department (checking both name and code to avoid UNIQUE constraint failures)
        dept = db.query(models.Department).filter(
            (models.Department.code == "AI&DS") | 
            (models.Department.name == "Artificial Intelligence and Data Science")
        ).first()
        
        if not dept:
            dept = models.Department(
                name="Artificial Intelligence and Data Science",
                code="AI&DS",
                description="Department of Artificial Intelligence and Data Science"
            )
            db.add(dept)
            db.flush()
            print(f"[+] Created Department: {dept.name} ({dept.code})")
        else:
            # Update code if it was different
            dept.code = "AI&DS"
            dept.name = "Artificial Intelligence and Data Science"
            db.flush()
            print(f"[~] Department already exists, reused: {dept.name} ({dept.code})")
            
        # 2. Create HOD (Dr. Girish L)
        hod = db.query(models.HOD).filter(models.HOD.department_id == dept.id).first()
        if not hod:
            # Let's check if the username is taken
            existing_hod = db.query(models.HOD).filter(models.HOD.username == "hod_aids").first()
            if existing_hod:
                hod = existing_hod
                hod.full_name = "Dr. Girish L"
                hod.department_id = dept.id
                db.flush()
                print(f"[~] Reused existing HOD account '{hod.username}' and updated to: {hod.full_name}")
            else:
                hod = models.HOD(
                    username="hod_aids",
                    password_hash=security.get_password_hash("hod_aids"),
                    full_name="Dr. Girish L",
                    department_id=dept.id
                )
                db.add(hod)
                db.flush()
                print(f"[+] Created HOD: {hod.full_name} ({hod.username})")
        else:
            hod.full_name = "Dr. Girish L"
            db.flush()
            print(f"[~] HOD {hod.full_name} already assigned to department.")
            
        # 3. Create Course
        course = db.query(models.Course).filter(models.Course.name == "Class IV (B.E. AI&DS)").first()
        if not course:
            course = models.Course(
                name="Class IV (B.E. AI&DS)",
                department_id=dept.id
            )
            db.add(course)
            db.flush()
            print(f"[+] Created Course: {course.name}")
        else:
            print(f"[~] Course {course.name} already exists.")
            
        # 4. Create Semester
        sem = db.query(models.Semester).filter(models.Semester.number == 4, models.Semester.course_id == course.id).first()
        if not sem:
            sem = models.Semester(
                number=4,
                course_id=course.id
            )
            db.add(sem)
            db.flush()
            print(f"[+] Created Semester: Semester {sem.number}")
        else:
            print(f"[~] Semester {sem.number} already exists.")
            
        # 5. Create Section
        sec = db.query(models.Section).filter(models.Section.name == "A", models.Section.semester_id == sem.id).first()
        if not sec:
            sec = models.Section(
                name="A",
                semester_id=sem.id
            )
            db.add(sec)
            db.flush()
            print(f"[+] Created Section: Section {sec.name}")
        else:
            print(f"[~] Section {sec.name} already exists.")
            
        # 6. Create Faculty Members
        faculty_data = [
            {"username": "prof_vinutha", "name": "Prof. Vinutha H R", "designation": "Assistant Professor"},
            {"username": "dr_girish", "name": "Dr. Girish L", "designation": "HOD & Professor"},
            {"username": "prof_sheik", "name": "Prof. Sheik Dawood Sait", "designation": "Assistant Professor"},
            {"username": "prof_namratha", "name": "Prof. Namratha N K", "designation": "Assistant Professor"},
            {"username": "prof_vijaylakshmi", "name": "Prof. Vijaylakshmi S", "designation": "Assistant Professor"},
            {"username": "prof_ramesh", "name": "Prof. Ramesh T S", "designation": "Assistant Professor"},
            {"username": "prof_parvati", "name": "Prof. Parvati N Biradar", "designation": "Assistant Professor"},
            {"username": "prof_harshitha", "name": "Prof. Harshitha Jadav N", "designation": "Assistant Professor"},
            {"username": "prof_kotramma", "name": "Prof. Kotramma Mathada", "designation": "Assistant Professor"},
            {"username": "prof_alfiya", "name": "Prof. Alfiya Javeed", "designation": "Assistant Professor"},
        ]
        
        faculties = {}
        for f in faculty_data:
            fac = db.query(models.Faculty).filter(models.Faculty.username == f["username"]).first()
            if not fac:
                fac = models.Faculty(
                    username=f["username"],
                    password_hash=security.get_password_hash("password"),
                    full_name=f["name"],
                    designation=f["designation"],
                    department_id=dept.id,
                    status="Active"
                )
                db.add(fac)
                db.flush()
                print(f"[+] Created Faculty Profile: {fac.full_name}")
            else:
                fac.full_name = f["name"]
                fac.designation = f["designation"]
                fac.department_id = dept.id
                db.flush()
                print(f"[~] Reused and updated Faculty Profile: {fac.full_name}")
            faculties[f["username"]] = fac
            
        # 7. Create Subjects
        subject_data = [
            {"code": "BCS401", "name": "Analysis & Design of Algorithms (ADA)"},
            {"code": "BAD402", "name": "Artificial Intelligence (AI)"},
            {"code": "BCS403", "name": "Database Management Systems (DBMS)"},
            {"code": "BDS456D", "name": "Discrete Mathematics (DMS)"},
            {"code": "BCS405A", "name": "Artificial Intelligence Lab (AI Lab)"},
            {"code": "BBOC407", "name": "Biology for Engineers (BIO)"},
            {"code": "BUHK408", "name": "Universal Human Values (UHV)"},
            {"code": "BNSK459", "name": "National Service Scheme (NSS)"},
            {"code": "NPTEL", "name": "NPTEL Class"},
        ]
        
        subjects = {}
        for s in subject_data:
            subj = db.query(models.Subject).filter(models.Subject.code == s["code"]).first()
            if not subj:
                subj = models.Subject(
                    code=s["code"],
                    name=s["name"],
                    semester_id=sem.id
                )
                db.add(subj)
                db.flush()
                print(f"[+] Created Subject: {subj.code} - {subj.name}")
            else:
                subj.name = s["name"]
                db.flush()
                print(f"[~] Reused and updated Subject: {subj.code} - {subj.name}")
            subjects[s["code"]] = subj
            
        # 8. Create Timetable Version (Active status so it shows immediately)
        version = db.query(models.TimetableVersion).filter(
            models.TimetableVersion.department_id == dept.id,
            models.TimetableVersion.version == 1
        ).first()
        if not version:
            version = models.TimetableVersion(
                department_id=dept.id,
                version=1,
                status="Active",
                created_by=hod.id
            )
            db.add(version)
            db.flush()
            print(f"[+] Created Timetable Version {version.version} (Active)")
        else:
            version.status = "Active" # Make sure active
            print(f"[~] Timetable Version {version.version} already exists. Setting status to Active.")
            
        # 9. Clean out old entries for this version to reload clean data
        db.query(models.TimetableEntry).filter(models.TimetableEntry.version_id == version.id).delete()
        print("[+] Cleared prior version entries for clean seed.")
        
        # 10. Seed Slot Entries Day-wise
        slots = [
            # DAY-1 (Monday)
            ("Monday", time(9, 0), time(9, 55), "BCS401", "prof_vinutha"),
            ("Monday", time(9, 55), time(10, 50), "BDS456D", "prof_vinutha"),
            ("Monday", time(11, 10), time(12, 5), "BCS401", "prof_vinutha"),
            ("Monday", time(12, 5), time(13, 0), "BUHK408", "prof_harshitha"),
            ("Monday", time(14, 0), time(14, 55), "BCS401", "prof_vinutha"),
            ("Monday", time(14, 55), time(15, 40), "BCS405A", "prof_vijaylakshmi"),
            ("Monday", time(15, 40), time(16, 45), "BCS405A", "prof_vijaylakshmi"),
            
            # DAY-2 (Tuesday)
            ("Tuesday", time(9, 0), time(9, 55), "BCS403", "prof_sheik"),
            ("Tuesday", time(9, 55), time(10, 50), "BDS456D", "prof_vinutha"),
            ("Tuesday", time(11, 10), time(12, 5), "BBOC407", "prof_parvati"),
            ("Tuesday", time(12, 5), time(13, 0), "BUHK408", "prof_harshitha"),
            ("Tuesday", time(14, 0), time(14, 55), "BNSK459", "prof_kotramma"),
            
            # DAY-3 (Wednesday)
            ("Wednesday", time(9, 0), time(9, 55), "BDS456D", "prof_vinutha"),
            ("Wednesday", time(9, 55), time(10, 50), "BUHK408", "prof_harshitha"),
            ("Wednesday", time(11, 10), time(12, 5), "BBOC407", "prof_parvati"),
            ("Wednesday", time(12, 5), time(13, 0), "BCS403", "prof_sheik"),
            ("Wednesday", time(14, 0), time(14, 55), "BNSK459", "prof_kotramma"),
            
            # DAY-4 (Thursday)
            ("Thursday", time(9, 0), time(9, 55), "BAD402", "dr_girish"),
            ("Thursday", time(9, 55), time(10, 50), "BAD402", "dr_girish"),
            ("Thursday", time(11, 10), time(12, 5), "BCS401", "prof_vinutha"),
            ("Thursday", time(12, 5), time(13, 0), "BBOC407", "prof_parvati"),
            ("Thursday", time(14, 0), time(14, 55), "BCS403", "prof_sheik"),
            ("Thursday", time(14, 55), time(15, 40), "BUHK408", "prof_harshitha"),
            ("Thursday", time(15, 40), time(16, 45), "BNSK459", "prof_kotramma"),
            
            # DAY-5 (Friday)
            ("Friday", time(9, 0), time(9, 55), "BBOC407", "prof_parvati"),
            ("Friday", time(9, 55), time(10, 50), "BCS403", "prof_sheik"),
            ("Friday", time(11, 10), time(12, 5), "BDS456D", "prof_vinutha"),
            ("Friday", time(12, 5), time(13, 0), "NPTEL", "prof_alfiya"),
            ("Friday", time(14, 0), time(14, 55), "BCS405A", "prof_vijaylakshmi"),
            ("Friday", time(14, 55), time(15, 40), "BCS405A", "prof_vijaylakshmi"),
            ("Friday", time(15, 40), time(16, 45), "BNSK459", "prof_kotramma"),
            
            # DAY-6 (Saturday)
            ("Saturday", time(9, 0), time(9, 55), "BAD402", "dr_girish"),
            ("Saturday", time(9, 55), time(10, 50), "BAD402", "dr_girish"),
            ("Saturday", time(11, 10), time(12, 5), "BCS403", "prof_sheik"),
            ("Saturday", time(12, 5), time(13, 0), "BCS401", "prof_vinutha"),
            ("Saturday", time(14, 0), time(14, 55), "BCS403", "prof_sheik"),
            ("Saturday", time(14, 55), time(15, 40), "BAD402", "dr_girish"),
            ("Saturday", time(15, 40), time(16, 45), "BNSK459", "prof_kotramma"),
        ]
        
        for idx, (day, start, end, sub_code, fac_uname) in enumerate(slots):
            entry = models.TimetableEntry(
                version_id=version.id,
                day_of_week=day,
                start_time=start,
                end_time=end,
                subject_id=subjects[sub_code].id,
                section_id=sec.id,
                faculty_id=faculties[fac_uname].id
            )
            db.add(entry)
            
        db.commit()
        print(f"[+] Successfully loaded {len(slots)} timetable entries into Version 1 of AI&DS department!")
        
    except Exception as e:
        db.rollback()
        print(f"[-] Database seed error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_timetable()
