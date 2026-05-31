import { useEffect, useState } from 'react';
import { Search, CheckCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Layout } from '../components/Layout';
import { fetchWithAuth, API_BASE } from '../utils/api';

export default function ManualAttendance() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await fetchWithAuth('/students/');
        if (res) {
          const data = await res.json();
          setStudents(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, []);

  const handleMark = async (studentId, status) => {
    try {
      const res = await fetchWithAuth('/attendance/mark_manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, status })
      });
      if (res && res.ok) {
        // Show subtle success indicator if needed, but UI is responsive enough
        alert(`Marked ${status} successfully`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = students.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.usn.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout role="faculty" title="Manual Attendance">
        <div className="glass-panel">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-500/50 text-cyan-400">
                <CheckCircle2 size={32} />
            </div>
            <div>
            <h1 className="text-2xl font-bold">Faculty Portal: Manual Attendance</h1>
            <p className="text-slate-400">Manage attendance directly for recognized subjects</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search USN or Name..." 
                className="glass-input !pl-10 !mb-0"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading student database...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="pb-3 font-medium">Student Information</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium text-center">Mark Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(student => (
                    <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4">
                        <div className="font-bold text-white">{student.full_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-1">{student.usn}</div>
                      </td>
                      <td className="py-4 text-slate-300">
                        {student.department} - Sem {student.semester}
                      </td>
                      <td className="py-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleMark(student.id, 'Present')}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded flex items-center gap-1 text-sm font-semibold transition-colors"
                          >
                            <CheckCircle size={16} /> Present
                          </button>
                          <button 
                            onClick={() => handleMark(student.id, 'Late')}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded flex items-center gap-1 text-sm font-semibold transition-colors"
                          >
                            <Clock size={16} /> Late
                          </button>
                          <button 
                            onClick={() => handleMark(student.id, 'Absent')}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded flex items-center gap-1 text-sm font-semibold transition-colors"
                          >
                            <XCircle size={16} /> Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-400">
                        No students found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </Layout>
  );
}
