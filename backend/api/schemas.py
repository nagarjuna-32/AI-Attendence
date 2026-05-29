from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date, time

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    department: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class StudentResponse(BaseModel):
    id: int
    full_name: str
    usn: str
    department: str
    semester: Optional[str] = None
    section: str
    email: str
    phone: str
    eye_verified: bool
    registered_at: datetime
    
    class Config:
        from_attributes = True

class AttendanceBase(BaseModel):
    student_id: int
    date: date
    time: time
    status: str
    method: str
    marked_by: str

class AttendanceResponse(AttendanceBase):
    id: int
    confidence_score: Optional[str] = None
    student: Optional[StudentResponse] = None
    
    class Config:
        from_attributes = True
        
class AttendanceManualMark(BaseModel):
    student_id: int
    status: str
