from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.db.database import get_db
from backend.api import schemas
from backend.db import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("username")
        role: str = payload.get("role")
        if username is None or role is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username, role=role)
    except InvalidTokenError:
        raise credentials_exception
        
    user = None
    if token_data.role == "admin":
        user = db.query(models.Admin).filter(models.Admin.username == token_data.username).first()
    elif token_data.role == "teacher":
        user = db.query(models.Teacher).filter(models.Teacher.username == token_data.username).first()
        
    if user is None:
        raise credentials_exception
        
    # Attach role to user object for route checking
    user.role = token_data.role
    return user

def get_current_active_admin(current_user = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
