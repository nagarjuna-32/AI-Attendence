# AI-Based Smart Attendance Assistant

This is a complete full-stack web application for an AI-powered attendance system.

## Features
- **Student Registration**: Capture 3 live faces, detect quality (blur), and generate 128-d facial embeddings.
- **AI Face Recognition**: Live webcam feed in the browser sends frames to the backend, which detects and recognizes faces using OpenCV's DNN Face Recognizer (SFace).
- **Manual Attendance**: Faculty can view all students, search by USN, and mark Present/Absent/Late manually.
- **Principal Dashboard**: Real-time statistics, charts, and recent activity logs.
- **HOD Dashboard**: Real-time statistics, charts, and recent activity logs for their specific department.
- **Reports**: Export attendance logs to CSV.

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS with a modern Glassmorphism dark theme UI.
- **Backend**: FastAPI for high-performance REST APIs.
- **Database**: SQLite with SQLAlchemy ORM.
- **AI/ML**: OpenCV `cv2.FaceDetectorYN` and `cv2.FaceRecognizerSF` for lightweight, accurate, and dependency-light face recognition without needing C++ compilers like dlib.

## Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/nagarjuna-32/AI-Attendence.git
   cd AI-Attendence
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Note: The system requires dlib and OpenCV. If dlib fails to install, 
   # ensure you have CMake and Visual Studio Build Tools installed.
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend_react
   npm install
   ```

## Running the Application

1. **Start Backend (FastAPI)**
   ```bash
   cd backend
   python create_admin.py # Run this once to seed the database
   uvicorn main:app --reload
   ```
   - You can create a principal or faculty by sending a POST request to `/api/v1/auth/register` using the interactive docs at `http://localhost:8000/docs`.

## Important Notes
- The application requires webcam access. Ensure you are running it on `localhost` or via `HTTPS`, as modern browsers block camera access on insecure HTTP connections.
