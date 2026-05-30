from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Text, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from backend.db.database import Base
from datetime import datetime

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=True)
    description = Column(String, nullable=True)
    
    courses = relationship("Course", back_populates="department", cascade="all, delete-orphan")
    hod = relationship("HOD", back_populates="department", uselist=False)

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    name = Column(String, nullable=False)
    
    department = relationship("Department", back_populates="courses")
    semesters = relationship("Semester", back_populates="course", cascade="all, delete-orphan")

class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    number = Column(Integer, nullable=False)
    
    course = relationship("Course", back_populates="semesters")
    sections = relationship("Section", back_populates="semester", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="semester", cascade="all, delete-orphan")

class Section(Base):
    __tablename__ = "sections"
    id = Column(Integer, primary_key=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    name = Column(String, nullable=False) # e.g. "A", "B"
    
    semester = relationship("Semester", back_populates="sections")
    students = relationship("Student", back_populates="section_obj")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    
    semester = relationship("Semester", back_populates="subjects")
    assignments = relationship("FacultySubject", back_populates="subject")

class Principal(Base):
    __tablename__ = "principals"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

class HOD(Base):
    __tablename__ = "hods"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"))
    
    department = relationship("Department", back_populates="hod")

class Faculty(Base):
    __tablename__ = "faculty"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"))
    
    # New fields for HOD workflow
    faculty_id = Column(String, unique=True, nullable=True) # Official Employee ID
    email = Column(String, unique=True, nullable=True)
    phone = Column(String, nullable=True)
    qualification = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    experience = Column(Integer, nullable=True) # In years
    joining_date = Column(Date, nullable=True)
    subject_taught = Column(String, nullable=True)
    created_by_hod = Column(Integer, ForeignKey("hods.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Active") # Active, Inactive
    
    assignments = relationship("FacultySubject", back_populates="faculty")

class FacultySubject(Base):
    __tablename__ = "faculty_subjects"
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    section_id = Column(Integer, ForeignKey("sections.id"))
    
    faculty = relationship("Faculty", back_populates="assignments")
    subject = relationship("Subject", back_populates="assignments")

class TimetableVersion(Base):
    __tablename__ = "timetable_versions"
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    version = Column(Integer, default=1)
    status = Column(String, default="Pending") # Pending, Active, Archived
    created_by = Column(Integer, ForeignKey("hods.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    entries = relationship("TimetableEntry", back_populates="version_obj")

class TimetableEntry(Base):
    __tablename__ = "timetable_entries"
    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("timetable_versions.id"))
    day_of_week = Column(String, nullable=False) # Monday, Tuesday...
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    section_id = Column(Integer, ForeignKey("sections.id"))
    faculty_id = Column(Integer, ForeignKey("faculty.id"))
    
    version_obj = relationship("TimetableVersion", back_populates="entries")
    subject = relationship("Subject")
    section = relationship("Section")
    faculty = relationship("Faculty")

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    full_name = Column(String, nullable=False)
    usn = Column(String, unique=True, index=True, nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"))
    email = Column(String, unique=True)
    parent_email = Column(String, nullable=True)
    phone = Column(String, unique=True)
    eye_verified = Column(Boolean, default=False)
    face_quality_score = Column(Float, default=0.0)
    registered_at = Column(DateTime, default=datetime.utcnow)
    
    department = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    section = Column(String, nullable=True)
    
    section_obj = relationship("Section", back_populates="students")
    encodings = relationship("FaceEncoding", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    predictions = relationship("AttendancePrediction", back_populates="student", cascade="all, delete-orphan")

class FaceEncoding(Base):
    __tablename__ = "face_encodings"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    encoding_data = Column(Text, nullable=False)
    
    student = relationship("Student", back_populates="encodings")

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    timetable_entry_id = Column(Integer, ForeignKey("timetable_entries.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    date = Column(Date, default=datetime.utcnow)
    time = Column(Time, default=datetime.utcnow().time)
    status = Column(String, nullable=False) # Present, Absent, Late
    method = Column(String, nullable=False) # Auto (Face), Bulk (Classroom), Manual
    confidence_score = Column(String)
    
    student = relationship("Student", back_populates="attendances")
    timetable_entry = relationship("TimetableEntry")

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
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    risk_level = Column(String, nullable=False) # Safe, Warning, Critical
    projected_percentage = Column(Float, nullable=False)
    classes_needed = Column(Integer, default=0)
    classes_buffer = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("Student", back_populates="predictions")

class ScanAuditLog(Base):
    __tablename__ = "scan_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    status = Column(String, nullable=False) # Success, Failed
    failure_reason = Column(String, nullable=True) # Fake face, Low confidence, Duplicate
    face_quality = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    liveness_passed = Column(Boolean, default=False)
    ip_address = Column(String, nullable=True)
    device_info = Column(String, nullable=True)
    
class AttendanceCorrectionRequest(Base):
    __tablename__ = "attendance_correction_requests"
    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendance.id"))
    faculty_id = Column(Integer, ForeignKey("faculty.id"))
    reason = Column(String, nullable=False)
    status = Column(String, default="Pending") # Pending, Approved, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)

class AlertHistory(Base):
    __tablename__ = "alert_history"
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    sent_at = Column(DateTime, default=datetime.utcnow)
    attendance_percentage = Column(Float, nullable=False)
    alert_type = Column(String, nullable=False) # Warning, High Risk, Critical
    status = Column(String, default="Sent") # Sent, Failed
    parent_copied = Column(Boolean, default=False)
    custom_note = Column(Text, nullable=True)
    
    faculty = relationship("Faculty")
    student = relationship("Student")
    subject = relationship("Subject")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    type = Column(String, nullable=False) # e.g. "FACULTY_REGISTRATION"
    target_role = Column(String, nullable=False) # e.g. "principal"
    created_by = Column(Integer, nullable=True) # ID of creator (e.g. HOD ID)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(String, nullable=False) # e.g. "FACULTY_CREATED"
    description = Column(Text, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    performed_by = Column(Integer, nullable=False) # ID of user who performed it
    role = Column(String, nullable=False) # Role of performer
    timestamp = Column(DateTime, default=datetime.utcnow)
