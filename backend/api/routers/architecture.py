from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import Department, Course, Semester, Section, Subject, Faculty, FacultySubject
from typing import List

router = APIRouter()

@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()

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
