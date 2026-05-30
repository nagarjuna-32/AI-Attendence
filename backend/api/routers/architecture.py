from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import Department, Course, Semester, Section, Subject, Faculty, FacultySubject, HOD
from typing import List
from backend.core import security

router = APIRouter()

from pydantic import BaseModel

class DepartmentCreate(BaseModel):
    name: str
    code: str
    description: str = ""

class HODCreate(BaseModel):
    username: str
    password: str
    full_name: str

@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).all()
    result = []
    for d in departments:
        result.append({
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "description": d.description,
            "hod_name": d.hod.full_name if d.hod else None
        })
    return result

@router.post("/departments")
def create_department(dept: DepartmentCreate, db: Session = Depends(get_db)):
    existing = db.query(Department).filter((Department.name == dept.name) | (Department.code == dept.code)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name or code already exists")
    
    new_dept = Department(name=dept.name, code=dept.code, description=dept.description)
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return {
        "id": new_dept.id,
        "name": new_dept.name,
        "code": new_dept.code,
        "description": new_dept.description,
        "hod_name": None
    }

@router.post("/departments/{dept_id}/hod")
def create_hod(dept_id: int, hod_data: HODCreate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    if dept.hod:
        raise HTTPException(status_code=400, detail="Department already has an HOD assigned")
        
    existing_username = db.query(HOD).filter(HOD.username == hod_data.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
        
    new_hod = HOD(
        username=hod_data.username,
        password_hash=security.get_password_hash(hod_data.password),
        full_name=hod_data.full_name,
        department_id=dept_id
    )
    db.add(new_hod)
    db.commit()
    db.refresh(new_hod)
    return {"message": "HOD created successfully", "hod_name": new_hod.full_name}

@router.get("/departments/{dept_id}/courses")
def get_courses(dept_id: int, db: Session = Depends(get_db)):
    return db.query(Course).filter(Course.department_id == dept_id).all()

@router.get("/courses/{course_id}/semesters")
def get_semesters(course_id: int, db: Session = Depends(get_db)):
    return db.query(Semester).filter(Semester.course_id == course_id).all()

@router.get("/semesters/{sem_id}/sections")
def get_sections(sem_id: int, db: Session = Depends(get_db)):
    return db.query(Section).filter(Section.semester_id == sem_id).all()

@router.get("/semesters/{sem_id}/subjects")
def get_subjects(sem_id: int, db: Session = Depends(get_db)):
    return db.query(Subject).filter(Subject.semester_id == sem_id).all()

@router.get("/faculty/{faculty_id}/assignments")
def get_faculty_assignments(faculty_id: int, db: Session = Depends(get_db)):
    assignments = db.query(FacultySubject).filter(FacultySubject.faculty_id == faculty_id).all()
    result = []
    for a in assignments:
        result.append({
            "assignment_id": a.id,
            "subject": {"id": a.subject.id, "name": a.subject.name, "code": a.subject.code},
            "section": {"id": a.section_id, "name": a.section_id} # Quick map, usually fetch actual section name
        })
    return result
