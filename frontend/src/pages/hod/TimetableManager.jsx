import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, Edit2, Save, X, Calendar } from 'lucide-react';
import { API_BASE, fetchWithAuth } from '../../utils/api';
import { Layout } from '../../components/Layout';

export default function TimetableManager() {
  const [timetables, setTimetables] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [semester, setSemester] = useState(4); // Default
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [alert, setAlert] = useState(null);

  const loadTimetables = async () => {
    try {
      const res = await fetchWithAuth('/timetable/');
      if (res && res.ok) {
        setTimetables(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTimetables();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/timetable/upload?semester_id=${semester}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', msg: 'Timetable uploaded successfully!' });
        loadTimetables();
        setFile(null);
      } else {
        setAlert({ type: 'error', msg: data.detail || 'Upload failed' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Network error during upload' });
    } finally {
      setUploading(false);
      setTimeout(() => setAlert(null), 4000);
    }
  };

  const handleEditClick = (entry) => {
    setEditingEntry(entry.id);
    setEditForm({
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time
    });
  };

  const saveEdit = async (entryId) => {
    try {
      const res = await fetchWithAuth(`/timetable/entry/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditingEntry(null);
        loadTimetables();
      }
    } catch (err) {}
  };

  return (
    <Layout role="hod" title="Timetable Management">
      <div className="max-w-7xl mx-auto px-4 py-8 mt-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
            <Calendar size={36} className="text-emerald-400" />
            Timetable Management
          </h1>
          <p className="text-slate-400 mt-2">Upload via Excel/CSV or manually edit draft versions.</p>
        </header>

        {alert && (
          <div className={`p-4 rounded-lg mb-6 border ${alert.type === 'success' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'}`}>
            {alert.msg}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload size={20} className="text-cyan-400" /> Upload New Timetable
          </h2>
          <form onSubmit={handleUpload} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Target Semester</label>
              <input type="number" min="1" max="8" value={semester} onChange={e => setSemester(e.target.value)} className="w-32 bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="flex-1 min-w-[300px]">
              <label className="block text-sm text-slate-400 mb-1">Timetable File (.csv, .xlsx)</label>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".csv,.xlsx" 
                  onChange={e => setFile(e.target.files[0])}
                  className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={uploading || !file}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] h-[42px] flex items-center gap-2"
            >
              {uploading ? 'Processing...' : <><CheckCircle2 size={18} /> Upload Data</>}
            </button>
          </form>
          <div className="mt-4 text-xs text-slate-500 font-mono">
            Required Columns: Day | Start Time | End Time | Subject Code | Section | Faculty Username
          </div>
        </div>

        <div className="space-y-8">
          {timetables.length === 0 && (
            <div className="text-center p-10 border border-dashed border-slate-700 rounded-xl text-slate-500">
              No timetables uploaded yet.
            </div>
          )}
          
          {timetables.map(tt => (
            <div key={tt.id} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Version {tt.version} <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded ml-2 uppercase tracking-wider">{tt.status}</span></h3>
                  <p className="text-xs text-slate-400">Created: {new Date(tt.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-black/50 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-4 font-medium">Day</th>
                      <th className="p-4 font-medium">Start Time</th>
                      <th className="p-4 font-medium">End Time</th>
                      <th className="p-4 font-medium">Subject</th>
                      <th className="p-4 font-medium">Section</th>
                      <th className="p-4 font-medium">Faculty</th>
                      <th className="p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tt.entries.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                          {editingEntry === entry.id ? (
                            <input type="text" value={editForm.day_of_week} onChange={e => setEditForm({...editForm, day_of_week: e.target.value})} className="bg-black border border-slate-600 rounded p-1 w-full text-sm" />
                          ) : entry.day_of_week}
                        </td>
                        <td className="p-4">
                          {editingEntry === entry.id ? (
                            <input type="time" value={editForm.start_time} onChange={e => setEditForm({...editForm, start_time: e.target.value})} className="bg-black border border-slate-600 rounded p-1 w-full text-sm" />
                          ) : entry.start_time}
                        </td>
                        <td className="p-4">
                          {editingEntry === entry.id ? (
                            <input type="time" value={editForm.end_time} onChange={e => setEditForm({...editForm, end_time: e.target.value})} className="bg-black border border-slate-600 rounded p-1 w-full text-sm" />
                          ) : entry.end_time}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-emerald-400">{entry.subject?.code}</div>
                          <div className="text-xs text-slate-400">{entry.subject?.name}</div>
                        </td>
                        <td className="p-4 font-mono">{entry.section?.name}</td>
                        <td className="p-4 text-cyan-400">{entry.faculty?.name || 'Unassigned'}</td>
                        <td className="p-4">
                          {editingEntry === entry.id ? (
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(entry.id)} className="text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 p-1.5 rounded"><Save size={16} /></button>
                              <button onClick={() => setEditingEntry(null)} className="text-rose-400 hover:text-rose-300 bg-rose-400/10 p-1.5 rounded"><X size={16} /></button>
                            </div>
                          ) : (
                            <button onClick={() => handleEditClick(entry)} className="text-slate-400 hover:text-white bg-slate-700/50 p-1.5 rounded transition-all"><Edit2 size={16} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
