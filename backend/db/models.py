from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Text, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from backend.db.database import Base
from datetime import datetime

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    department = Column(String)

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    usn = Column(String, unique=True, index=True, nullable=False)
    department = Column(String)
    semester = Column(String)
    year_sem = Column(String) # Keeping for backwards compatibility
    section = Column(String)
    email = Column(String, unique=True)
    phone = Column(String, unique=True)
    eye_verified = Column(Boolean, default=False)
    registered_at = Column(DateTime, default=datetime.utcnow)
    
    encodings = relationship("FaceEncoding", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    predictions = relationship("AttendancePrediction", back_populates="student", cascade="all, delete-orphan")

class FaceEncoding(Base):
    __tablename__ = "face_encodings"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    encoding_data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("Student", back_populates="encodings")

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    status = Column(String, nullable=False)
    method = Column(String, nullable=False)
    marked_by = Column(String)
    confidence_score = Column(String)
    
    student = relationship("Student", back_populates="attendances")

class UnknownFace(Base):
    __tablename__ = "unknown_faces"
    id = Column(Integer, primary_key=True, index=True)
    captured_time = Column(DateTime, default=datetime.utcnow)
    image_path = Column(String)
    status = Column(String, default="unresolved")

class AttendancePrediction(Base):
    __tablename__ = "attendance_predictions"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    risk_level = Column(String, nullable=False) # Low, Medium, High
    probability = Column(Float, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("Student", back_populates="predictions")

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False) # e.g. "MANUAL_OVERRIDE", "SYSTEM_MARK"
    description = Column(String)
    actor_username = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
