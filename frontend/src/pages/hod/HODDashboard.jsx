import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { StatCard } from '../../components/ui/StatCard';
import { Users, Calendar, AlertTriangle, BookOpen, Mail, UserPlus, FileText, Download } from 'lucide-react';
import { fetchWithAuth, API_BASE } from '../../utils/api';

export default function HODDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    alerts_sent: 0,
    students_warned: 0,
    critical_students: 0,
    last_alert_date: 'N/A'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedSem, setSelectedSem] = useState('');
  const [facultyList, setFacultyList] = useState([]);
  const [studentList, setStudentList] = useState([]);

  const loadData = async () => {
    try {
      const res = await fetchWithAuth('/alerts/metrics/hod');
      if (res && res.ok) {
        setMetrics(await res.json());
      }
    } catch (err) {}
    try {
      const fRes = await fetchWithAuth('/faculty_mgmt/department');
      if (fRes && fRes.ok) {
        setFacultyList(await fRes.json());
      }
    } catch (err) {}
    try {
      const sRes = await fetchWithAuth('/students/department');
      if (sRes && sRes.ok) {
        setStudentList(await sRes.json());
      }
    } catch (err) {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteFaculty = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove faculty member "${name}"?`)) return;
    try {
      const res = await fetchWithAuth(`/faculty_mgmt/faculty/${id}`, { method: 'DELETE' });
      if (res && res.ok) {
        setFacultyList(prev => prev.filter(f => f.id !== id));
        alert("Faculty member removed successfully!");
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to remove faculty member");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  const handleExport = (format) => {
    let url = `${API_BASE}/analytics/export?format=${format}`;
    if (selectedSem) {
      url += `&semester=${selectedSem}`;
    }
    
    const token = localStorage.getItem('token');
    fetch(url, {
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
    <Layout role="hod" title="HOD Department Console">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <p className="text-slate-400 mt-2">Computer Science & Engineering</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="glass-btn-outline px-4 py-2"
          >
            Change Password
          </button>
          <button 
            onClick={() => navigate('/hod/register-faculty')}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/30 flex items-center gap-2 transition-all font-semibold text-sm"
          >
            <UserPlus size={18} /> Register Faculty
          </button>
          <button 
            onClick={() => navigate('/hod/timetable')}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg border border-cyan-500/30 flex items-center gap-2 transition-all font-semibold text-sm"
          >
            <Calendar size={18} /> Manage Timetable
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Department Students" value={studentList.length.toString()} icon={Users} color="emerald" delay={0.1} />
        <StatCard title="Faculty Count" value={facultyList.length.toString()} icon={BookOpen} color="cyan" delay={0.2} />
        <StatCard title="Defaulters (<75%)" value="0" icon={AlertTriangle} color="rose" delay={0.3} />
        <StatCard title="Active Subjects" value="6" icon={Calendar} color="indigo" delay={0.4} />
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timetable Management */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-3">
              <Calendar size={20} className="text-cyan-400" /> Timetable Management
            </h2>
            <div className="space-y-4">
              <div className="glass-card p-4 border-l-4 border-l-emerald-500 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-emerald-400">Semester 4 - Active (v1)</h4>
                  <p className="text-sm text-slate-400">Approved by Principal</p>
                </div>
                <button onClick={() => navigate('/hod/timetable')} className="glass-btn-outline !py-1.5 !px-3 !text-xs">Edit Draft v2</button>
              </div>
              <div className="glass-card p-4 flex justify-between items-center opacity-70">
                <div>
                  <h4 className="font-bold text-slate-300">Semester 6 - Pending Approval</h4>
                  <p className="text-sm text-slate-400">Sent to Principal 2 hrs ago</p>
                </div>
                <button className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs transition-all text-slate-500 cursor-not-allowed" disabled>Locked</button>
              </div>
            </div>
            <button className="w-full mt-6 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold py-2.5 rounded-lg transition-all">
              + Create New Timetable
            </button>
          </div>

          {/* Low Attendance Students */}
          <div className="glass-panel p-6 border-rose-500/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-3">
              <AlertTriangle size={20} className="text-rose-400" /> Action Required: Defaulters
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between glass-card p-3 border border-rose-900/50 !bg-rose-950/10">
                <div>
                  <div className="font-bold text-slate-200">John Doe</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">1RV21CS045 - Sem 4 'A'</div>
                </div>
                <div className="text-right">
                  <div className="text-rose-400 font-bold">54%</div>
                  <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1 font-medium">Send Warning</button>
                </div>
              </div>
              <div className="flex items-center justify-between glass-card p-3 border border-rose-900/50 !bg-rose-950/10">
                <div>
                  <div className="font-bold text-slate-200">Sarah Smith</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">1RV21CS089 - Sem 4 'B'</div>
                </div>
                <div className="text-right">
                  <div className="text-rose-400 font-bold">68%</div>
                  <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1 font-medium">Send Warning</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Monitoring */}
        <div className="mt-8 glass-panel p-6 border-t-2 border-rose-500/50">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-3">
            <Mail size={20} className="text-rose-400" /> Faculty Alert Monitoring
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="glass-card p-4">
              <div className="text-slate-400 text-sm font-medium">Alerts Sent</div>
              <div className="text-3xl font-bold text-white mt-1">{metrics.alerts_sent}</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-slate-400 text-sm font-medium">Students Warned</div>
              <div className="text-3xl font-bold text-amber-400 mt-1">{metrics.students_warned}</div>
            </div>
            <div className="glass-card p-4 border-l-2 border-l-rose-500">
              <div className="text-slate-400 text-sm font-medium">Critical Students (&lt;65%)</div>
              <div className="text-3xl font-bold text-rose-400 mt-1">{metrics.critical_students}</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-slate-400 text-sm font-medium">Last Alert Date</div>
              <div className="text-xl font-bold text-cyan-400 mt-2">{metrics.last_alert_date}</div>
            </div>
          </div>
        </div>

        {/* Faculty Management Section */}
        <div className="mt-8 glass-panel p-6 border-t-2 border-emerald-500/50">
          <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Users size={20} className="text-emerald-400" /> Faculty Management
            </h2>
            <button 
              onClick={() => navigate('/hod/register-faculty')}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 transition-all font-semibold text-xs"
            >
              <UserPlus size={14} /> Add Faculty
            </button>
          </div>
          
          {facultyList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No faculty members registered in this department yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Faculty ID</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {facultyList.map(f => (
                    <tr key={f.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">{f.name}</td>
                      <td className="py-3.5 px-4 font-mono text-cyan-400 text-xs">{f.faculty_id}</td>
                      <td className="py-3.5 px-4">{f.email}</td>
                      <td className="py-3.5 px-4">{f.designation}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => handleDeleteFaculty(f.id, f.name)}
                          className="px-2.5 py-1 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Student Management Section */}
        <div className="mt-8 glass-panel p-6 border-t-2 border-indigo-500/50">
          <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Users size={20} className="text-indigo-400" /> Student Directory
            </h2>
            <button 
              onClick={() => navigate('/register')}
              className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3.5 py-1.5 rounded-lg border border-indigo-500/30 flex items-center gap-1.5 transition-all font-semibold text-xs"
            >
              <UserPlus size={14} /> Add Student
            </button>
          </div>
          
          {studentList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No students registered in this department yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">USN</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {studentList.map(s => (
                    <tr key={s.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">{s.name}</td>
                      <td className="py-3.5 px-4 font-mono text-cyan-400 text-xs">{s.usn}</td>
                      <td className="py-3.5 px-4">Semester {s.semester}</td>
                      <td className="py-3.5 px-4">Section {s.section}</td>
                      <td className="py-3.5 px-4">{s.email || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{s.registered_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Report Generation Section */}
        <div className="mt-8 mb-8 glass-panel p-6 border border-slate-700/50">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white border-b border-slate-700/50 pb-3">
            <FileText size={20} className="text-cyan-400" /> Generate Department Reports
          </h2>
          <div className="flex flex-wrap gap-4 items-end mt-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2 font-medium">Target Semester</label>
              <select 
                value={selectedSem} 
                onChange={(e) => setSelectedSem(e.target.value)}
                className="glass-input !w-48"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            
            <div className="flex bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700 h-[44px]">
              <button onClick={() => handleExport('pdf')} className="px-5 py-2 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors flex items-center gap-2 border-r border-slate-700 text-sm font-semibold" title="Export PDF">
                <FileText size={18} /> Export PDF
              </button>
              <button onClick={() => handleExport('excel')} className="px-5 py-2 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-2 border-r border-slate-700 text-sm font-semibold" title="Export Excel">
                <Download size={18} /> Export Excel
              </button>
              <button onClick={() => handleExport('csv')} className="px-5 py-2 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-2 text-sm font-semibold" title="Export CSV">
                <FileText size={18} /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Modals remain mostly the same, update input classes if needed */}
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
