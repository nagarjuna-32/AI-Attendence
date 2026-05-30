import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { Users, Calendar, AlertTriangle, BookOpen, Mail, UserPlus } from 'lucide-react';
import { fetchWithAuth, API_BASE } from '../../utils/api';

export default function HODDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    alerts_sent: 0,
    students_warned: 0,
    critical_students: 0,
    last_alert_date: 'N/A'
  });

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const res = await fetchWithAuth('/alerts/metrics/hod');
        if (res && res.ok) {
          setMetrics(await res.json());
        }
      } catch (err) {}
    };
    loadAlerts();
  }, []);
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">HOD Department Console</h1>
            <p className="text-slate-400 mt-2">Computer Science & Engineering</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/hod/register-faculty')}
              className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/50 flex items-center gap-2 transition-all font-bold"
            >
              <UserPlus size={18} /> Register Faculty
            </button>
            <button className="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 px-4 py-2 rounded-lg border border-cyan-500/50 flex items-center gap-2 transition-all">
              <Calendar size={18} /> Review Timetable
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-emerald-500/30">
            <Users className="text-emerald-400 mb-2" size={32} />
            <h3 className="text-slate-400 text-sm uppercase tracking-wider">Department Students</h3>
            <div className="text-3xl font-bold mt-2">840</div>
          </div>
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
            <BookOpen className="text-cyan-400 mb-2" size={32} />
            <h3 className="text-slate-400 text-sm uppercase tracking-wider">Faculty Count</h3>
            <div className="text-3xl font-bold mt-2">42</div>
          </div>
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="text-rose-400 mb-2" size={32} />
            <h3 className="text-slate-400 text-sm uppercase tracking-wider">Defaulters (&lt;75%)</h3>
            <div className="text-3xl font-bold mt-2 text-rose-400">12</div>
          </div>
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
            <Calendar className="text-indigo-400 mb-2" size={32} />
            <h3 className="text-slate-400 text-sm uppercase tracking-wider">Active Subjects</h3>
            <div className="text-3xl font-bold mt-2">24</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timetable Management */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <Calendar size={20} className="text-cyan-400" /> Timetable Management
            </h2>
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-lg border border-emerald-500/30 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-emerald-400">Semester 4 - Active (v1)</h4>
                  <p className="text-sm text-slate-400">Approved by Principal</p>
                </div>
                <button className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm transition-all">Edit Draft v2</button>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="font-bold">Semester 6 - Pending Approval</h4>
                  <p className="text-sm text-slate-400">Sent to Principal 2 hrs ago</p>
                </div>
                <button className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm transition-all" disabled>Locked</button>
              </div>
            </div>
            <button className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded transition-all">
              + Create New Timetable
            </button>
          </div>

          {/* Low Attendance Students */}
          <div className="glass-panel p-6 border border-rose-500/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <AlertTriangle size={20} className="text-rose-400" /> Action Required: Defaulters
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-rose-950/30 p-3 rounded border border-rose-900/50">
                <div>
                  <div className="font-bold">John Doe</div>
                  <div className="text-xs text-slate-400">1RV21CS045 - Sem 4 'A'</div>
                </div>
                <div className="text-right">
                  <div className="text-rose-400 font-bold">54%</div>
                  <button className="text-xs text-cyan-400 hover:underline">Send Warning</button>
                </div>
              </div>
              <div className="flex items-center justify-between bg-rose-950/30 p-3 rounded border border-rose-900/50">
                <div>
                  <div className="font-bold">Sarah Smith</div>
                  <div className="text-xs text-slate-400">1RV21CS089 - Sem 4 'B'</div>
                </div>
                <div className="text-right">
                  <div className="text-rose-400 font-bold">68%</div>
                  <button className="text-xs text-cyan-400 hover:underline">Send Warning</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Monitoring */}
        <div className="mt-8 glass-panel p-6 border-t-4 border-rose-500">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Mail size={20} className="text-rose-400" /> Faculty Alert Monitoring
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-sm">Alerts Sent</div>
              <div className="text-2xl font-bold text-white">{metrics.alerts_sent}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-sm">Students Warned</div>
              <div className="text-2xl font-bold text-amber-400">{metrics.students_warned}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-rose-900/50">
              <div className="text-slate-400 text-sm">Critical Students (&lt;65%)</div>
              <div className="text-2xl font-bold text-rose-400">{metrics.critical_students}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-sm">Last Alert Date</div>
              <div className="text-lg font-bold text-cyan-400 mt-1">{metrics.last_alert_date}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
