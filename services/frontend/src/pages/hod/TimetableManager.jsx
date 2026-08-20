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
  
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'manual'

  // Manual Form States
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  // Text Import States
  const [textImport, setTextImport] = useState('');
  const [importingText, setImportingText] = useState(false);
  const [textImportTarget, setTextImportTarget] = useState('new'); // 'new' or 'existing'
  const [textImportVersion, setTextImportVersion] = useState('');
  const [textImportSemester, setTextImportSemester] = useState(4);

  const loadTimetables = async () => {
    try {
      const res = await fetchWithAuth('/timetable/');
      if (res && res.ok) {
        const data = await res.json();
        setTimetables(data);
        if (data.length > 0) {
          if (!selectedVersion) setSelectedVersion(data[0].id);
          if (!textImportVersion) setTextImportVersion(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSampleText = () => {
    const sample = `Day,Start Time,End Time,Subject Code,Section,Faculty Username
Monday,09:00,10:00,21CS41,A,prof_john
Monday,10:00,11:00,21CS42,A,prof_sarah
Tuesday,11:15,12:15,21CS43,B,prof_john`;
    setTextImport(sample);
  };

  const handleTextImport = async (e) => {
    e.preventDefault();
    if (!textImport.trim()) return;

    setImportingText(true);
    const payload = {
      text: textImport,
      semester_id: textImportTarget === 'new' ? parseInt(textImportSemester) : null,
      version_id: textImportTarget === 'existing' ? parseInt(textImportVersion) : null
    };

    try {
      const res = await fetchWithAuth('/timetable/upload-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', msg: data.message || 'Timetable text imported successfully!' });
        loadTimetables();
        setTextImport('');
      } else {
        setAlert({ type: 'error', msg: data.detail || 'Import failed.' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Network error during text import.' });
    } finally {
      setImportingText(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  useEffect(() => {
    loadTimetables();
  }, []);

  useEffect(() => {
    const initManualLoad = async () => {
      try {
        const cRes = await fetchWithAuth('/faculty_mgmt/my-department/courses');
        if (cRes && cRes.ok) setCourses(await cRes.json());
        
        const fRes = await fetchWithAuth('/faculty_mgmt/department');
        if (fRes && fRes.ok) setFacultyList(await fRes.json());
      } catch (err) {}
    };
    initManualLoad();
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      setSemesters([]);
      setSelectedSemester('');
      return;
    }
    const loadSemesters = async () => {
      try {
        const res = await fetchWithAuth(`/architecture/courses/${selectedCourse}/semesters`);
        if (res && res.ok) setSemesters(await res.json());
      } catch (err) {}
    };
    loadSemesters();
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedSemester) {
      setSections([]);
      setSelectedSection('');
      setSubjects([]);
      setSelectedSubject('');
      return;
    }
    const loadSecSub = async () => {
      try {
        const secRes = await fetchWithAuth(`/architecture/semesters/${selectedSemester}/sections`);
        if (secRes && secRes.ok) setSections(await secRes.json());
        
        const subRes = await fetchWithAuth(`/architecture/semesters/${selectedSemester}/subjects`);
        if (subRes && subRes.ok) setSubjects(await subRes.json());
      } catch (err) {}
    };
    loadSecSub();
  }, [selectedSemester]);

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

  const handleCreateDraftVersion = async () => {
    try {
      const res = await fetchWithAuth('/timetable/new-version', { method: 'POST' });
      if (res && res.ok) {
        const data = await res.json();
        setAlert({ type: 'success', msg: 'New draft version created!' });
        loadTimetables();
        setSelectedVersion(data.version_id);
      } else {
        setAlert({ type: 'error', msg: 'Failed to create new draft version' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Network error' });
    }
    setTimeout(() => setAlert(null), 4000);
  };

  const handleManualAddEntry = async (e) => {
    e.preventDefault();
    if (!selectedVersion || !selectedDay || !startTime || !endTime || !selectedSubject || !selectedSection) {
      setAlert({ type: 'error', msg: 'Please fill in all required manual entry fields.' });
      setTimeout(() => setAlert(null), 4000);
      return;
    }
    
    const payload = {
      version_id: parseInt(selectedVersion),
      day_of_week: selectedDay,
      start_time: startTime,
      end_time: endTime,
      subject_id: parseInt(selectedSubject),
      section_id: parseInt(selectedSection),
      faculty_id: selectedFaculty ? parseInt(selectedFaculty) : null
    };
    
    try {
      const res = await fetchWithAuth('/timetable/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', msg: 'Timetable entry added successfully!' });
        loadTimetables();
        setStartTime('09:00');
        setEndTime('10:00');
      } else {
        setAlert({ type: 'error', msg: data.detail || 'Failed to add manual entry.' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Network error.' });
    }
    setTimeout(() => setAlert(null), 4000);
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

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this timetable entry?")) return;
    try {
      const res = await fetchWithAuth(`/timetable/entry/${entryId}`, { method: 'DELETE' });
      if (res && res.ok) {
        setAlert({ type: 'success', msg: 'Timetable entry deleted successfully!' });
        loadTimetables();
      } else {
        setAlert({ type: 'error', msg: 'Failed to delete entry' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Network error' });
    }
    setTimeout(() => setAlert(null), 4000);
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

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl max-w-lg mb-8">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Upload Excel / CSV
          </button>
          <button 
            onClick={() => setActiveTab('text_import')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'text_import' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Import from Text
          </button>
          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'manual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Add Entry Manually
          </button>
        </div>

        {activeTab === 'upload' && (
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl mb-10 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
              <Upload size={20} /> Upload New Timetable
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
        )}

        {activeTab === 'text_import' && (
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl mb-10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
                <FileText size={20} /> Bulk Import from Plain Text
              </h2>
              <button 
                type="button" 
                onClick={loadSampleText}
                className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-semibold px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-2"
              >
                <FileText size={14} /> Load Sample Text
              </button>
            </div>

            <form onSubmit={handleTextImport} className="space-y-6">
              <div className="flex flex-wrap gap-6 items-center bg-black/30 p-4 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Import Target</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                      <input 
                        type="radio" 
                        name="importTarget" 
                        value="new" 
                        checked={textImportTarget === 'new'} 
                        onChange={() => setTextImportTarget('new')}
                        className="accent-indigo-600"
                      />
                      Create New Draft Version
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                      <input 
                        type="radio" 
                        name="importTarget" 
                        value="existing" 
                        checked={textImportTarget === 'existing'} 
                        onChange={() => setTextImportTarget('existing')}
                        className="accent-indigo-600"
                      />
                      Add to Existing Version
                    </label>
                  </div>
                </div>

                {textImportTarget === 'new' ? (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Target Semester</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="8" 
                      value={textImportSemester} 
                      onChange={e => setTextImportSemester(e.target.value)} 
                      className="w-32 bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                ) : (
                  <div className="w-64">
                    <label className="block text-sm text-slate-400 mb-1">Select Target Version</label>
                    <select 
                      required 
                      value={textImportVersion} 
                      onChange={e => setTextImportVersion(e.target.value)} 
                      className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="" disabled>Choose Version</option>
                      {timetables.map(t => (
                        <option key={t.id} value={t.id}>Version {t.version} ({t.status})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5 flex justify-between">
                  <span>Paste Timetable Text</span>
                  <span className="text-xs text-slate-500 font-mono text-indigo-400">CSV Format: Day, Start Time, End Time, Subject Code, Section, Faculty Username</span>
                </label>
                <textarea
                  required
                  rows={8}
                  value={textImport}
                  onChange={e => setTextImport(e.target.value)}
                  placeholder={`Example:\nMonday, 09:00, 10:00, 21CS41, A, prof_john\nTuesday, 10:00, 11:00, 21CS42, B, prof_smith`}
                  className="w-full bg-black/50 border border-slate-700 rounded-lg p-4 text-white font-mono text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button 
                  type="submit" 
                  disabled={importingText || !textImport.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2 text-sm w-full md:w-auto"
                >
                  {importingText ? 'Processing Text...' : <><FileText size={18} /> Import Timetable Slots</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl mb-10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
                <FileText size={20} /> Add Timetable Slot Manually
              </h2>
              <button 
                type="button" 
                onClick={handleCreateDraftVersion}
                className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-semibold px-4 py-2 rounded-lg text-xs transition-all"
              >
                + New Draft Version
              </button>
            </div>
            
            <form onSubmit={handleManualAddEntry} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Target Version</label>
                <select 
                  required 
                  value={selectedVersion} 
                  onChange={e => setSelectedVersion(e.target.value)} 
                  className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>Select Version</option>
                  {timetables.map(t => (
                    <option key={t.id} value={t.id}>Version {t.version} ({t.status})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Day of Week</label>
                <select 
                  value={selectedDay} 
                  onChange={e => setSelectedDay(e.target.value)} 
                  className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start Time</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">End Time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Select Course</label>
                <select 
                  required 
                  value={selectedCourse} 
                  onChange={e => setSelectedCourse(e.target.value)} 
                  className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Select Semester</label>
                <select 
                  required 
                  disabled={!selectedCourse}
                  value={selectedSemester} 
                  onChange={e => setSelectedSemester(e.target.value)} 
                  className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="">Choose Semester</option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>Semester {s.number}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Select Section</label>
                <select 
                  required 
                  disabled={!selectedSemester}
                  value={selectedSection} 
                  onChange={e => setSelectedSection(e.target.value)} 
                  className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="">Choose Section</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Select Subject</label>
                <select 
                  required 
                  disabled={!selectedSemester}
                  value={selectedSubject} 
                  onChange={e => setSelectedSubject(e.target.value)} 
                  className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="">Choose Subject</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.code} - {sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Assign Faculty (Optional)</label>
                <select 
                  value={selectedFaculty} 
                  onChange={e => setSelectedFaculty(e.target.value)} 
                  className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose Faculty</option>
                  {facultyList.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.designation})</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 mt-2 flex justify-end">
                <button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2 text-sm w-full md:w-auto"
                >
                  + Add Manual Entry
                </button>
              </div>
            </form>
          </div>
        )}

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
                      <th className="p-4 font-medium text-right">Actions</th>
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
                        <td className="p-4 text-right">
                          {editingEntry === entry.id ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => saveEdit(entry.id)} className="text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 p-1.5 rounded"><Save size={16} /></button>
                              <button onClick={() => setEditingEntry(null)} className="text-rose-400 hover:text-rose-300 bg-rose-400/10 p-1.5 rounded"><X size={16} /></button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditClick(entry)} className="text-slate-400 hover:text-white bg-slate-700/50 p-1.5 rounded transition-all"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteEntry(entry.id)} className="text-rose-400 hover:text-rose-300 bg-rose-500/10 p-1.5 rounded transition-all"><X size={16} /></button>
                            </div>
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
