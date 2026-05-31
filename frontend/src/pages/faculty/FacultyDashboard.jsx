import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, Camera, Clock, CheckCircle, Calendar, AlertTriangle, Activity, FileText, Download } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { fetchWithAuth, API_BASE } from '../../utils/api';

export default function FacultyDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const facultyId = localStorage.getItem('user_id') || 1;
      try {
        const [assignRes, sessionRes] = await Promise.all([
          fetchWithAuth(`/architecture/faculty/${facultyId}/assignments`),
          fetchWithAuth('/sessions/active')
        ]);
        
        if (assignRes && sessionRes) {
          setAssignments(await assignRes.json());
          setActiveSessions(await sessionRes.json());
        }
      } catch (err) {}
      finally { setLoading(false); }
    };
    loadData();
  }, []);

  const handleExport = (format) => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/analytics/export?format=${format}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.blob())
    .then(blob => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `attendance_report.${format === 'excel' ? 'xlsx' : format}`;
      link.click();
    });
  };

  return (
    <Layout role="faculty" title="Faculty Portal">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-slate-400 mt-2">Manage your subjects and attendance sessions.</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          <div className="flex bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700 h-[38px]">
            <button onClick={() => handleExport('pdf')} className="px-3 py-1 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors flex items-center gap-1 text-sm border-r border-slate-700 font-semibold" title="Export PDF">
              <FileText size={16} /> PDF
            </button>
            <button onClick={() => handleExport('excel')} className="px-3 py-1 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-1 text-sm border-r border-slate-700 font-semibold" title="Export Excel">
              <Download size={16} /> Excel
            </button>
            <button onClick={() => handleExport('csv')} className="px-3 py-1 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1 text-sm font-semibold" title="Export CSV">
              <FileText size={16} /> CSV
            </button>
          </div>
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="glass-btn-outline px-4 py-1.5 text-sm"
          >
            Change Password
          </button>
          <button 
            onClick={() => navigate('/faculty/alerts')}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-1.5 rounded-lg border border-rose-500/30 flex items-center gap-2 transition-all font-semibold text-sm"
          >
            <AlertTriangle size={16} /> Manage Alerts
          </button>
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="glass-panel p-6 border-emerald-500/30 border-l-4 border-l-emerald-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-3">
              <Calendar size={20} className="text-emerald-400" /> Today's Automated Timetable
            </h2>
            <div className="space-y-4 mt-4">
              {assignments.map(a => (
                <div key={a.id} className="glass-card p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-emerald-400">{a.subject_name} <span className="text-xs font-mono text-slate-400 ml-2 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">{a.subject_code}</span></h3>
                    <p className="text-sm text-slate-400 mt-1">Class: {a.section_name} • Managed by HOD Timetable</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded text-xs font-bold border border-emerald-500/30 text-center tracking-wider">
                      AUTO-ACTIVE
                    </span>
                    <button 
                      onClick={() => navigate('/faculty/manual')}
                      className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded text-xs border border-slate-600 transition-all font-medium"
                    >
                      Manual Attd.
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {activeSessions.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
              Active Sessions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSessions.map(session => (
                <div key={session.id} className="glass-card p-5 border-emerald-500/30 !bg-emerald-950/20 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-emerald-400 mb-1">Session ID: <span className="font-mono">{session.id}</span></div>
                    <div className="text-sm text-slate-300">Subject: <span className="font-mono">{session.subject_id}</span> | Section: <span className="font-mono">{session.section_id}</span></div>
                  </div>
                  <div className="text-right bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] font-bold tracking-widest text-emerald-400/80 mb-0.5">CLOSES AT</div>
                    <div className="font-mono font-bold text-white">{new Date(session.end_time).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">Your Assigned Subjects</h2>
        
        {loading ? (
          <div className="text-center text-slate-400 py-8">Loading assignments...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {assignments.map(a => (
              <motion.div 
                key={a.assignment_id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-panel hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-cyan-500/20 text-cyan-400 p-2 rounded-lg">
                    <BookOpen size={24} />
                  </div>
                  <span className="bg-white/10 text-xs px-2 py-1 rounded font-mono">CODE: {a.subject.code}</span>
                </div>
                <h3 className="text-xl font-bold mb-1">{a.subject.name}</h3>
                <div className="flex flex-col gap-2 mt-4 text-sm text-slate-400 font-mono">
                  <div className="flex items-center gap-2"><Users size={16} /> SECTION: {a.section.name}</div>
                  <div className="flex items-center gap-2 text-emerald-400"><CheckCircle size={16} /> STATUS: Assigned</div>
                </div>
              </motion.div>
            ))}
            
            {assignments.length === 0 && (
              <div className="col-span-3 text-center text-slate-500 py-12 border border-dashed border-slate-700 rounded-xl">
                No subjects assigned to you yet.
              </div>
            )}
          </div>
        )}

        {/* Performance Statistics Section */}
        <h2 className="text-xl font-bold mb-4 mt-8 flex items-center gap-2 text-indigo-400">
          <Activity size={20} /> Performance Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2">Classes Conducted</div>
            <div className="text-3xl font-bold text-white">48</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2">Attd Completion</div>
            <div className="text-3xl font-bold text-emerald-400">98%</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2">Student Avg</div>
            <div className="text-3xl font-bold text-cyan-400">82%</div>
          </div>
          <div className="glass-card p-4 text-center border-b-2 border-b-rose-500">
            <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2">Defaulters (&lt;75%)</div>
            <div className="text-3xl font-bold text-rose-400">12</div>
          </div>
          <div className="glass-card p-4 text-center border-b-2 border-b-amber-500">
            <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2">Alerts Sent</div>
            <div className="text-3xl font-bold text-amber-400">15</div>
          </div>
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="glass-panel p-8 w-full max-w-md relative">
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
              <h3 className="text-2xl font-bold text-white mb-6">Change Password</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                if (form.newPassword.value !== form.confirmPassword.value) {
                  alert("New passwords do not match!");
                  return;
                }
                try {
                  const res = await fetchWithAuth('/auth/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      old_password: form.oldPassword.value,
                      new_password: form.newPassword.value
                    })
                  });
                  if (res.ok) {
                    alert("Password updated successfully!");
                    setShowPasswordModal(false);
                  } else {
                    const err = await res.json();
                    alert(err.detail || "Update failed");
                  }
                } catch (err) { alert("Network error"); }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Current Password</label>
                  <input required name="oldPassword" type="password" className="glass-input" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">New Password</label>
                  <input required name="newPassword" type="password" className="glass-input" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Confirm New Password</label>
                  <input required name="confirmPassword" type="password" className="glass-input" />
                </div>
                <button type="submit" className="glass-btn w-full mt-6">
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}

    </Layout>
  );
}
