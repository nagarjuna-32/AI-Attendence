import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { StatCard } from '../../components/ui/StatCard';
import { fetchWithAuth } from '../../utils/api';

export default function StudentDashboard() {
  const [heatmap, setHeatmap] = useState([]);
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const studentId = localStorage.getItem('user_id') || 1;
      try {
        const [heatRes, recRes] = await Promise.all([
          fetchWithAuth(`/dashboard/heatmaps/${studentId}`),
          fetchWithAuth(`/dashboard/recommendations/${studentId}`)
        ]);
        
        if (heatRes && recRes) {
          setHeatmap(await heatRes.json());
          const r = await recRes.json();
          setRecommendation(r.message);
        }
      } catch (err) {}
      finally { setLoading(false); }
    };
    loadData();
  }, []);

  return (
    <Layout role="student" title="Student Portal">
      <div className="mb-8">
        <p className="text-slate-400 mt-2">Track your attendance and AI performance insights.</p>
      </div>
        
        {loading ? (
          <div className="text-center text-slate-400 py-12">Loading Performance Data...</div>
        ) : (
          <div className="space-y-6">
            {/* AI Recommendation Alert */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-6 flex items-start gap-5 shadow-[0_0_30px_rgba(99,102,241,0.1)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-cyan-500"></div>
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <Lightbulb className="text-indigo-400 shrink-0" size={32} />
              </div>
              <div className="mt-1">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  AI Smart Recommendation
                  <span className="text-[10px] font-bold tracking-widest bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full uppercase">Powered by ML</span>
                </h3>
                <p className="text-indigo-200/80 text-lg leading-relaxed">{recommendation}</p>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Current Attendance" value="82%" icon={Target} color="cyan" delay={0.1} />
              <StatCard title="Predicted EoS" value="85%" icon={TrendingUp} color="emerald" delay={0.2} />
              <StatCard title="Risk Level" value="SAFE" subtitle="No alerts" icon={AlertTriangle} color="emerald" delay={0.3} />
            </div>

            {/* Heatmap */}
            <div className="glass-panel p-8">
              <h3 className="text-xl font-bold mb-6 border-b border-slate-700/50 pb-3">30-Day Attendance Heatmap</h3>
              <div className="flex flex-wrap gap-2.5">
                {heatmap.map((day, i) => (
                  <div 
                    key={i}
                    title={`${day.date}: ${day.status}`}
                    className={`w-12 h-12 rounded-lg ${day.color} border border-white/5 flex items-center justify-center text-sm font-mono opacity-80 hover:opacity-100 transition-all hover:scale-110 hover:shadow-lg cursor-help`}
                  >
                    {day.date.split('-')[2]}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-6 mt-8 pt-6 border-t border-slate-700/50 text-sm text-slate-400 font-medium">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div> Present</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div> Late</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div> Absent</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-slate-800 border border-slate-700"></div> Unmarked</div>
              </div>
            </div>

          </div>
        )}
    </Layout>
  );
}
