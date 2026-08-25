import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, Clock, AlertTriangle, Download } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Navbar from '../components/Navbar';
import { fetchWithAuth, API_BASE } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.font.family = 'Inter';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, predRes] = await Promise.all([
          fetchWithAuth('/dashboard/stats'),
          fetchWithAuth('/dashboard/risk_predictions')
        ]);
        
        if (statsRes && predRes) {
          setStats(await statsRes.json());
          setPredictions(await predRes.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleExportPDF = () => {
    const token = localStorage.getItem('token');
    window.open(`${API_BASE}/reports/pdf?token=${token}`, '_blank');
  };

  if (loading || !stats) {
    return <div className="min-h-screen bg-slate-950 flex justify-center items-center">Loading AI Analytics...</div>;
  }

  const barData = {
    labels: stats.chart_bar.labels,
    datasets: [{
      label: 'Present Students',
      data: stats.chart_bar.data,
      backgroundColor: '#6366f1',
      borderRadius: 4
    }]
  };

  const doughnutData = {
    labels: stats.chart_pie.labels,
    datasets: [{
      data: stats.chart_pie.data,
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0
    }]
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">AI Analytics Dashboard</h1>
          <button onClick={handleExportPDF} className="glass-btn flex items-center gap-2 !w-auto">
            <Download size={18} /> Export PDF Report
          </button>
        </div>

        {stats.unknown_faces_count > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle />
              <div>
                <h3 className="font-bold">Security Alert: Unknown Faces Detected</h3>
                <p className="text-sm opacity-80">{stats.unknown_faces_count} unauthorized attempts logged.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Students', value: stats.total_students, icon: Users, color: 'text-indigo-400' },
            { label: 'Present Today', value: stats.present, icon: UserCheck, color: 'text-emerald-400' },
            { label: 'Late', value: stats.late, icon: Clock, color: 'text-amber-400' },
            { label: 'Absent', value: stats.absent, icon: UserX, color: 'text-rose-400' },
            { label: 'Attendance %', value: `${stats.percentage}%`, icon: null, color: 'text-white' },
          ].map((s, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="glass-panel text-center flex flex-col items-center justify-center py-6"
            >
              {s.icon && <s.icon className={`mb-2 ${s.color}`} size={24} />}
              <div className="text-sm text-slate-400 uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="glass-panel lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Weekly Attendance Trend</h3>
            <div className="h-72">
              <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
          <div className="glass-panel">
            <h3 className="text-lg font-semibold mb-4">Today's Distribution</h3>
            <div className="h-72 flex justify-center">
              <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        {/* ML Predictions & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-rose-400">
              <AlertTriangle size={20} /> AI Risk Predictions (Shortage Warning)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Current %</th>
                    <th className="pb-3 font-medium">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.slice(0, 5).map((p, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-3">
                        <div className="font-medium">{p.student_name}</div>
                        <div className="text-xs text-slate-500">{p.usn}</div>
                      </td>
                      <td className="py-3">{p.attendance_percentage}%</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold
                          ${p.risk_level === 'High' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 
                            p.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
                        >
                          {p.risk_level} ({p.probability}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel">
            <h3 className="text-lg font-semibold mb-4">Recent Live Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_logs.map((log, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-3">
                        <div className="font-medium">{log.student_name}</div>
                        <div className="text-xs text-slate-500">{log.usn}</div>
                      </td>
                      <td className="py-3 text-sm text-slate-400">{log.time}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                          ${log.status === 'Present' ? 'text-emerald-400 bg-emerald-400/10' :
                            log.status === 'Late' ? 'text-amber-400 bg-amber-400/10' :
                            'text-rose-400 bg-rose-400/10'}`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
