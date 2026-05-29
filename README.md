# AI-Based Smart Attendance Assistant

This is a complete full-stack web application for an AI-powered attendance system.

## Features
- **Student Registration**: Capture 3 live faces, detect quality (blur), and generate 128-d facial embeddings.
- **AI Face Recognition**: Live webcam feed in the browser sends frames to the backend, which detects and recognizes faces using OpenCV's DNN Face Recognizer (SFace).
- **Manual Attendance**: Teachers can view all students, search by USN, and mark Present/Absent/Late manually.
- **Admin Dashboard**: Real-time statistics, charts, and recent activity logs.
- **Reports**: Export attendance logs to CSV.

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS with a modern Glassmorphism dark theme UI.
- **Backend**: FastAPI for high-performance REST APIs.
- **Database**: SQLite with SQLAlchemy ORM.
- **AI/ML**: OpenCV `cv2.FaceDetectorYN` and `cv2.FaceRecognizerSF` for lightweight, accurate, and dependency-light face recognition without needing C++ compilers like dlib.

## Installation

1. Create a virtual environment and install dependencies:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

2. Start the Backend Server:
```bash
cd "mini project"
venv\Scripts\python -m uvicorn backend.main:app --reload
```

3. Open the Frontend:
- Open `frontend/index.html` in your web browser. Or serve it using a simple HTTP server:
```bash
python -m http.server 8080 --directory frontend
```
- Navigate to `http://localhost:8080`

## Initial Setup
- You can create an admin or teacher by sending a POST request to `/api/v1/auth/register/admin` using the interactive docs at `http://localhost:8000/docs`.

## Important Notes
- The application requires webcam access. Ensure you are running it on `localhost` or via `HTTPS`, as modern browsers block camera access on insecure HTTP connections.
