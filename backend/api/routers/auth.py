from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from backend.db.database import get_db
from backend.db import models
from backend.api import schemas
from backend.core import security
from backend.core.config import settings

router = APIRouter()

@router.post("/login")
def login_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # Check Principal
    principal = db.query(models.Principal).filter(models.Principal.username == form_data.username).first()
    if principal and security.verify_password(form_data.password, principal.password_hash):
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"username": principal.username, "role": "principal", "id": principal.id}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "role": "principal", "id": principal.id}

    # Check HOD
    hod = db.query(models.HOD).filter(models.HOD.username == form_data.username).first()
    if hod and security.verify_password(form_data.password, hod.password_hash):
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"username": hod.username, "role": "hod", "id": hod.id}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "role": "hod", "id": hod.id}
        
    # Check Faculty
    faculty = db.query(models.Faculty).filter(models.Faculty.username == form_data.username).first()
    if faculty and security.verify_password(form_data.password, faculty.password_hash):
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"username": faculty.username, "role": "faculty", "id": faculty.id}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "role": "faculty"}
        
    # Check Student
    student = db.query(models.Student).filter(models.Student.username == form_data.username).first()
    if student and security.verify_password(form_data.password, student.password_hash):
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"username": student.username, "role": "student", "id": student.id}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "role": "student"}
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

