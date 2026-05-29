import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import Navbar from '../../components/Navbar';
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
    <div className="min-h-screen bg-slate-950 flex flex-col pt-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Student Portal</h1>
        
        {loading ? (
          <div className="text-center text-slate-400 py-12">Loading Performance Data...</div>
        ) : (
          <div className="space-y-6">
            
            {/* AI Recommendation Alert */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-900/40 border border-indigo-500/50 rounded-xl p-6 flex items-start gap-4 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
            >
              <Lightbulb className="text-indigo-400 shrink-0" size={28} />
              <div>
                <h3 className="text-xl font-bold text-indigo-300 mb-1">AI Smart Recommendation</h3>
                <p className="text-indigo-100/80 text-lg">{recommendation}</p>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel text-center py-8">
                <Target className="mx-auto mb-3 text-cyan-400" size={32} />
                <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Current Attendance</div>
                <div className="text-4xl font-bold text-white">82%</div>
              </div>
              <div className="glass-panel text-center py-8">
                <TrendingUp className="mx-auto mb-3 text-emerald-400" size={32} />
                <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Predicted EoS</div>
                <div className="text-4xl font-bold text-white">85%</div>
              </div>
              <div className="glass-panel text-center py-8 border-rose-500/30">
                <AlertTriangle className="mx-auto mb-3 text-rose-400" size={32} />
                <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Risk Level</div>
                <div className="text-4xl font-bold text-emerald-400">SAFE</div>
              </div>
            </div>

            {/* Heatmap */}
            <div className="glass-panel">
              <h3 className="text-xl font-bold mb-6">30-Day Attendance Heatmap</h3>
              <div className="flex flex-wrap gap-2">
                {heatmap.map((day, i) => (
                  <div 
                    key={i}
                    title={`${day.date}: ${day.status}`}
                    className={`w-10 h-10 rounded-md ${day.color} border border-white/10 flex items-center justify-center text-xs font-mono opacity-80 hover:opacity-100 transition-opacity cursor-help`}
                  >
                    {day.date.split('-')[2]}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/10 text-sm text-slate-400">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"></div> Present</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500"></div> Late</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-500"></div> Absent</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-800 border border-white/10"></div> Unmarked</div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
