import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, GraduationCap, Users2, Activity, ShieldAlert } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { fetchWithAuth } from '../../utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetchWithAuth('/dashboard/stats');
        if (res) setStats(await res.json());
      } catch (err) {}
      finally { setLoading(false); }
    };
    loadStats();
  }, []);

  if (loading || !stats) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">Loading Analytics Center...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pt-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Principal Analytics Center</h1>
            <p className="text-slate-400 mt-2">Enterprise Overview & System Health</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400 font-mono">SYSTEM STATUS</div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              ONLINE & OPTIMAL
            </div>
          </div>
        </div>

        {/* Global Architecture KPI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-panel py-6 flex items-center gap-4 border-t-4 border-blue-500">
            <Building2 className="text-blue-500 shrink-0" size={40} />
            <div>
              <div className="text-3xl font-bold">12</div>
              <div className="text-xs text-slate-400 font-mono">ACTIVE DEPARTMENTS</div>
            </div>
          </div>
          <div className="glass-panel py-6 flex items-center gap-4 border-t-4 border-indigo-500">
            <GraduationCap className="text-indigo-500 shrink-0" size={40} />
            <div>
              <div className="text-3xl font-bold">84</div>
              <div className="text-xs text-slate-400 font-mono">TOTAL COURSES</div>
            </div>
          </div>
          <div className="glass-panel py-6 flex items-center gap-4 border-t-4 border-emerald-500">
            <Users2 className="text-emerald-500 shrink-0" size={40} />
            <div>
              <div className="text-3xl font-bold">142</div>
              <div className="text-xs text-slate-400 font-mono">REGISTERED FACULTY</div>
            </div>
          </div>
          <div className="glass-panel py-6 flex items-center gap-4 border-t-4 border-cyan-500">
            <Activity className="text-cyan-500 shrink-0" size={40} />
            <div>
              <div className="text-3xl font-bold">{stats.total_students}</div>
              <div className="text-xs text-slate-400 font-mono">ENROLLED STUDENTS</div>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-panel">
            <h3 className="text-lg font-bold mb-6">Today's Campus Attendance</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-slate-400">Overall Attendance Rate</div>
              <div className="text-2xl font-bold text-white">{stats.percentage}%</div>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${stats.percentage}%` }}></div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-4">
                <div className="text-2xl font-bold text-emerald-400">{stats.present}</div>
                <div className="text-xs text-slate-400">PRESENT</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded p-4">
                <div className="text-2xl font-bold text-amber-400">{stats.late}</div>
                <div className="text-xs text-slate-400">LATE</div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded p-4">
                <div className="text-2xl font-bold text-rose-400">{stats.absent}</div>
                <div className="text-xs text-slate-400">ABSENT</div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-rose-400">
                <ShieldAlert size={20} /> Security & Unknown Faces
              </h3>
              <p className="text-slate-400 text-sm mb-6">Faces detected on campus without registered profiles.</p>
              
              <div className="text-5xl font-bold text-rose-500 mb-2">{stats.unknown_faces_count}</div>
              <div className="text-sm font-mono text-rose-400/80">UNRESOLVED SECURITY EVENTS TODAY</div>
            </div>
            
            <button className="w-full py-3 mt-6 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg font-semibold transition-all">
              Review Security Logs
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
