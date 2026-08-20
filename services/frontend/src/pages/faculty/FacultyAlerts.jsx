import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Mail, CheckSquare, Search, Send, X, Copy, ShieldAlert } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { fetchWithAuth, API_BASE } from '../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function FacultyAlerts() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [defaulters, setDefaulters] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [sendToParent, setSendToParent] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const loadSubjects = async () => {
      const facultyId = localStorage.getItem('user_id') || 1;
      try {
        const res = await fetchWithAuth(`/architecture/faculty/${facultyId}/assignments`);
        if (res) {
          const data = await res.json();
          setSubjects(data);
          if (data.length > 0) {
            setSelectedSubject(data[0].subject.id);
          }
        }
      } catch (err) {}
      finally { setLoading(false); }
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    const loadDefaulters = async () => {
      if (!selectedSubject) return;
      setLoading(true);
      try {
        const res = await fetchWithAuth(`/alerts/shortage?subject_id=${selectedSubject}`);
        if (res) {
          setDefaulters(await res.json());
          setSelectedStudents(new Set()); // Reset selections
        }
      } catch (err) {}
      finally { setLoading(false); }
    };
    loadDefaulters();
  }, [selectedSubject]);

  const toggleStudent = (id) => {
    const next = new Set(selectedStudents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudents(next);
  };

  const toggleAll = () => {
    if (selectedStudents.size === defaulters.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(defaulters.map(d => d.student_id)));
    }
  };

  const handleSendAlerts = async () => {
    setSending(true);
    try {
      const res = await fetchWithAuth('/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: Array.from(selectedStudents),
          subject_id: selectedSubject,
          custom_note: customNote,
          send_to_parent: sendToParent
        })
      });
      if (res && res.ok) {
        setSuccessMsg(`Successfully sent ${selectedStudents.size} alerts!`);
        setShowModal(false);
        setSelectedStudents(new Set());
        setCustomNote('');
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'Critical': return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
      case 'High Risk': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
      default: return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    }
  };

  return (
    <Layout role="faculty" title="Faculty Alert Console">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Mail className="text-cyan-400" size={32} /> Faculty Alert Console
            </h1>
            <p className="text-slate-400 mt-2">Manage attendance shortages and send automated email warnings.</p>
          </div>
          <div className="flex gap-4 items-center">
            <select 
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              {subjects.map(s => (
                <option key={s.subject.id} value={s.subject.id}>{s.subject.name} ({s.subject.code})</option>
              ))}
            </select>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <CheckSquare size={20} /> {successMsg}
          </div>
        )}

        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="text-rose-400" size={24} /> 
              Students Below Threshold (&lt;75%)
            </h2>
            <button 
              onClick={() => setShowModal(true)}
              disabled={selectedStudents.size === 0}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
            >
              <Send size={18} /> Send Alert ({selectedStudents.size})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Analyzing attendance records...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="pb-3 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
                        checked={defaulters.length > 0 && selectedStudents.size === defaulters.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="pb-3 font-medium">Student Name</th>
                    <th className="pb-3 font-medium">USN</th>
                    <th className="pb-3 font-medium text-center">Attendance %</th>
                    <th className="pb-3 font-medium">Risk Level</th>
                    <th className="pb-3 font-medium">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.map(student => (
                    <tr key={student.student_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
                          checked={selectedStudents.has(student.student_id)}
                          onChange={() => toggleStudent(student.student_id)}
                        />
                      </td>
                      <td className="py-4 font-bold">{student.student_name}</td>
                      <td className="py-4 text-slate-400 font-mono text-sm">{student.usn}</td>
                      <td className="py-4 text-center font-mono font-bold text-lg">{student.percentage}%</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getRiskColor(student.risk_level)}`}>
                          {student.risk_level}
                        </span>
                      </td>
                      <td className="py-4 text-slate-400 text-sm">{student.email}</td>
                    </tr>
                  ))}
                  
                  {defaulters.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500 italic">
                        No students found below the attendance threshold for this subject. Great job!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Preview Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-2xl w-full relative"
              >
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                  <X size={24} />
                </button>

                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-cyan-400">
                  <ShieldAlert size={24} /> Alert Configuration & Preview
                </h2>

                <div className="space-y-6">
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300">
                    <div className="text-slate-500 mb-2 border-b border-slate-800 pb-2">PREVIEW (AUTO-GENERATED PER STUDENT)</div>
                    <div className="mb-4">
                      <span className="text-slate-500">Subject:</span> Attendance Warning Notice - {subjects.find(s => s.subject.id == selectedSubject)?.subject.name}<br/>
                      <span className="text-slate-500">To:</span> [Student Email]<br/>
                      {sendToParent && <span className="text-cyan-500">CC: [Parent Email]<br/></span>}
                    </div>
                    <div>
                      Dear [Student Name],<br/><br/>
                      Your attendance is currently <strong className="text-rose-400">[XX]%</strong>, which is below the required 75%.<br/>
                      You need to attend the upcoming classes regularly to avoid attendance shortage issues.<br/><br/>
                      <span className="text-emerald-400">SMART RECOMMENDATION:</span><br/>
                      You need to attend [X] more consecutive classes to reach 75%.<br/><br/>
                      
                      {customNote && (
                        <div className="text-amber-400 border-l-2 border-amber-500 pl-2 my-2">
                          FACULTY NOTE: {customNote}
                        </div>
                      )}
                      
                      Faculty: {localStorage.getItem('username') || 'Faculty Member'}<br/>
                      Please take necessary action.<br/><br/>
                      Regards,<br/>
                      AI Attendance Assistant Pro
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-2 font-bold text-sm">Add Custom Note (Optional)</label>
                    <textarea 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 h-24"
                      placeholder="Type a custom message to include in the email..."
                      value={customNote}
                      onChange={e => setCustomNote(e.target.value)}
                    ></textarea>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                      checked={sendToParent}
                      onChange={e => setSendToParent(e.target.checked)}
                    />
                    <div>
                      <div className="font-bold">Send copy to Parent</div>
                      <div className="text-sm text-slate-400">Also sends this warning to the registered parent email address.</div>
                    </div>
                  </label>

                  <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2 rounded-lg font-bold text-slate-300 hover:text-white transition-colors">
                      Cancel
                    </button>
                    <button 
                      onClick={handleSendAlerts}
                      disabled={sending}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold px-8 py-2 rounded-lg shadow-lg flex items-center gap-2"
                    >
                      {sending ? 'Dispatching...' : `Send ${selectedStudents.size} Alerts`}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </Layout>
  );
}
