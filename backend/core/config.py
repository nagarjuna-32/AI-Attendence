import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Attendance Assistant"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super_secret_key_for_development_only_12345" # Change this in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATABASE_URL: str = f"sqlite:///{os.path.join(BASE_DIR, 'database', 'attendance.db')}"
    FACE_DATA_DIR: str = os.path.join(BASE_DIR, 'face_data')
    UPLOADS_DIR: str = os.path.join(BASE_DIR, 'uploads')
    
    class Config:
        case_sensitive = True

settings = Settings()
