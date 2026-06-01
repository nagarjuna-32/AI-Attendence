import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Registration from './pages/Registration';
import Scanner from './pages/Scanner';

// Portals
import AdminDashboard from './pages/admin/AdminDashboard';
import PrincipalDashboard from './pages/principal/PrincipalDashboard';
import HODDashboard from './pages/hod/HODDashboard';
import RegisterFaculty from './pages/hod/RegisterFaculty';
import TimetableManager from './pages/hod/TimetableManager';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import BulkScanner from './pages/faculty/BulkScanner';
import FacultyAlerts from './pages/faculty/FacultyAlerts';
import StudentDashboard from './pages/student/StudentDashboard';
import ManualAttendance from './pages/ManualAttendance';

// Ensure standard authentication wrapper (simulated for now based on role localstorage)
const ProtectedRoute = ({ children, role }) => {
  const currentRole = localStorage.getItem('role');
  if (!currentRole || currentRole.toLowerCase() !== role.toLowerCase()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registration />} />
        
        {/* Admin Portal (Legacy/Technical) */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        
        {/* Principal Portal */}
        <Route path="/principal" element={
          <ProtectedRoute role="principal"><PrincipalDashboard /></ProtectedRoute>
        } />
        
        {/* HOD Portal */}
        <Route path="/hod" element={
          <ProtectedRoute role="hod"><HODDashboard /></ProtectedRoute>
        } />
        <Route path="/hod/register-faculty" element={
          <ProtectedRoute role="hod"><RegisterFaculty /></ProtectedRoute>
        } />
        <Route path="/hod/timetable" element={
          <ProtectedRoute role="hod"><TimetableManager /></ProtectedRoute>
        } />

        {/* Faculty Portal */}
        <Route path="/faculty" element={
          <ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>
        } />
        <Route path="/faculty/bulk-scanner" element={
          <ProtectedRoute role="faculty"><BulkScanner /></ProtectedRoute>
        } />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/faculty/manual" element={
          <ProtectedRoute role="faculty"><ManualAttendance /></ProtectedRoute>
        } />
        <Route path="/faculty/alerts" element={
          <ProtectedRoute role="faculty"><FacultyAlerts /></ProtectedRoute>
        } />

        {/* Student Portal */}
        <Route path="/student" element={
          <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
