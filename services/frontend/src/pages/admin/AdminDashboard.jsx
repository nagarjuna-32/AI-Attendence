import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, GraduationCap, Users2, Activity, ShieldAlert } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { StatCard } from '../../components/ui/StatCard';
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
    <Layout role="principal" title="Admin Control Center">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-slate-400 mt-2">Enterprise Overview & System Health</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 font-mono font-bold tracking-widest mb-1">SYSTEM STATUS</div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
            ONLINE & OPTIMAL
          </div>
        </div>
      </div>

      {/* Global Architecture KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Active Departments" value="12" icon={Building2} color="indigo" delay={0.1} />
        <StatCard title="Total Courses" value="84" icon={GraduationCap} color="cyan" delay={0.2} />
        <StatCard title="Registered Faculty" value="142" icon={Users2} color="emerald" delay={0.3} />
        <StatCard title="Enrolled Students" value={stats.total_students} icon={Activity} color="rose" delay={0.4} />
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-panel p-8">
            <h3 className="text-xl font-bold mb-6 border-b border-slate-700/50 pb-3">Today's Campus Attendance</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-slate-400">Overall Attendance Rate</div>
              <div className="text-3xl font-bold text-white">{stats.percentage}%</div>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden mb-8 shadow-inner">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_15px_rgba(52,211,153,0.5)]" style={{ width: `${stats.percentage}%` }}></div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="glass-card p-4 border-b-2 border-b-emerald-500">
                <div className="text-3xl font-bold text-emerald-400 mb-1">{stats.present}</div>
                <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Present</div>
              </div>
              <div className="glass-card p-4 border-b-2 border-b-amber-500">
                <div className="text-3xl font-bold text-amber-400 mb-1">{stats.late}</div>
                <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Late</div>
              </div>
              <div className="glass-card p-4 border-b-2 border-b-rose-500">
                <div className="text-3xl font-bold text-rose-400 mb-1">{stats.absent}</div>
                <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Absent</div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel p-8 flex flex-col justify-between border-rose-500/20">
            <div>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-rose-400 border-b border-slate-700/50 pb-3">
                <ShieldAlert size={20} /> Security & Unknown Faces
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">Faces detected on campus without registered profiles. This could indicate unauthorized personnel or failed attendance scans.</p>
              
              <div className="text-6xl font-bold text-rose-400 mb-3 text-center">{stats.unknown_faces_count}</div>
              <div className="text-xs font-bold tracking-widest text-center text-rose-500/80 uppercase">Unresolved Events</div>
            </div>
            
            <button className="w-full py-3 mt-8 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(244,63,94,0.1)]">
              Review Security Logs
            </button>
          </div>
        </div>

    </Layout>
  );
}
