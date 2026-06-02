# 🎓 AI Attendance Assistant Pro

<div align="center">

### Smart AI-Powered College Attendance Management System

🔗 **Live Demo:** https://ai-attendence-git-projects.vercel.app

🚀 Face Recognition • 📊 Analytics • 🏫 Department Management • 📅 Timetable Automation

</div>

---

## 📌 Project Overview

AI Attendance Assistant Pro is a modern AI-powered attendance management system designed for colleges and educational institutions.

The system uses Facial Recognition, Liveness Detection, Timetable Automation, Attendance Analytics, and Role-Based Access Control to automate attendance tracking and management.

---

## ✨ Key Features

### 👨‍🎓 Student Module

* Student Registration
* Face Registration
* Live Face Capture
* Blink Verification
* Face Quality Detection
* Attendance Scanning
* Subject-wise Attendance
* Attendance Percentage
* Timetable View
* Attendance Insights

---

### 👨‍🏫 Faculty Module

* Faculty Dashboard
* Assigned Subjects
* Assigned Classes
* Attendance Reports
* Attendance Monitoring
* Manual Attendance
* Attendance Shortage Alerts
* Student Attendance Tracking

---

### 🏢 HOD Module

* Department Dashboard
* Faculty Management
* Student Monitoring
* Timetable Management
* Department Analytics
* Attendance Reports
* Low Attendance Monitoring

---

### 👑 Principal Module

* College-wide Dashboard
* Department Analytics
* Attendance Statistics
* Faculty Performance Monitoring
* Attendance Reports
* Activity Logs
* Notifications

---

## 🤖 AI Features

### Face Recognition Attendance

* Live Webcam Attendance
* AI Face Recognition
* Real-Time Verification
* Fast Recognition

### Liveness Detection

* Blink Detection
* Head Movement Verification
* Multi-step Verification
* Anti-Spoof Protection

### Face Quality Detection

* Blur Detection
* Brightness Validation
* Face Position Validation
* Multiple Face Detection

---

## 📅 Timetable Automation

* Timetable Creation by HOD
* Faculty Assignment
* Subject Assignment
* Semester Management
* Section Management
* Automatic Attendance Sessions
* Weekly Timetable Scheduling

---

## 📊 Analytics & Reports

### Reports

* Student-wise Report
* Faculty-wise Report
* Subject-wise Report
* Department-wise Report
* Attendance Summary Report

### Export Support

* CSV Export
* Excel Export
* PDF Export

---

## 🔔 Attendance Alert System

Faculty can:

* View Students Below 75%
* Send Attendance Warning Emails
* Send Bulk Notifications
* Monitor Attendance Shortage

Example:

```text
Current Attendance: 72%

Warning:
Your attendance is below the required threshold.

Required Attendance:
75%
```

---

## 🏗 System Architecture

```text
Principal
    │
    ├── HOD
    │      │
    │      ├── Faculty
    │      │      │
    │      │      └── Students
    │      │
    │      └── Timetable Management
    │
    └── College Analytics
```

---

## 🛠 Technology Stack

### Frontend

* React.js
* HTML5
* CSS3
* JavaScript
* Tailwind CSS

### Backend

* FastAPI
* Python

### Database

* SQLite
* SQLAlchemy ORM

### AI / ML

* OpenCV
* Face Recognition
* Face Detection
* Liveness Detection

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/nagarjuna-32/AI-Attendence.git
cd AI-Attendence
```

---

### Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

---

### Initialize Database

```bash
python create_admin.py
```

---

### Run Backend

```bash
uvicorn main:app --reload
```

Backend:

```text
http://localhost:8000
```

API Docs:

```text
http://localhost:8000/docs
```

---

### Frontend Setup

```bash
cd frontend_react

npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 📸 Screenshots

### Landing Page

Add Screenshot Here

### Principal Dashboard

Add Screenshot Here

### HOD Dashboard

Add Screenshot Here

### Faculty Dashboard

Add Screenshot Here

### Student Dashboard

Add Screenshot Here

### AI Scanner

Add Screenshot Here

---

## 🔒 Security Features

* Role-Based Access Control
* Password Hashing
* Face Verification
* Duplicate Attendance Prevention
* Duplicate Registration Prevention
* Activity Logging
* Department-Level Access Control

---

## 📈 Future Enhancements

* PostgreSQL Support
* Mobile Application
* Multi-Classroom Attendance
* Classroom Face Detection
* Attendance Prediction
* Parent Notification System
* Cloud Deployment

---

## 👨‍💻 Developer

**Naga Arjun**

AI & Data Science

GitHub:
https://github.com/nagarjuna-32

Project Repository:
https://github.com/nagarjuna-32/AI-Attendence

---

## 📜 License

This project is developed for educational and academic purposes.

© 2026 Naga Arjun. All Rights Reserved.

---

<div align="center">

⭐ If you like this project, consider giving it a star on GitHub.

</div>
