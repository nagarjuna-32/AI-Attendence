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

@router.post("/login", response_model=schemas.Token)
def login_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # Check Admin
    admin = db.query(models.Admin).filter(models.Admin.username == form_data.username).first()
    if admin and security.verify_password(form_data.password, admin.password_hash):
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"username": admin.username, "role": "admin"}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
        
    # Check Teacher
    teacher = db.query(models.Teacher).filter(models.Teacher.username == form_data.username).first()
    if teacher and security.verify_password(form_data.password, teacher.password_hash):
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"username": teacher.username, "role": "teacher"}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.post("/register/teacher", response_model=schemas.UserResponse)
def register_teacher(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.Teacher).filter(models.Teacher.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = security.get_password_hash(user.password)
    db_user = models.Teacher(username=user.username, password_hash=hashed_password, full_name=user.full_name, department=user.department)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/register/admin", response_model=schemas.UserResponse)
def register_admin(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.Admin).filter(models.Admin.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = security.get_password_hash(user.password)
    db_user = models.Admin(username=user.username, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
