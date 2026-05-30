import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { UserPlus, Save, Building, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { fetchWithAuth } from '../../utils/api';

export default function RegisterFaculty() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [formData, setFormData] = useState({
    full_name: '',
    faculty_id: '',
    email: '',
    phone: '',
    gender: 'Male',
    date_of_birth: '',
    qualification: '',
    designation: 'Assistant Professor',
    experience: 0,
    joining_date: '',
    subject_taught: '',
    course_id: '',
    semester_id: '',
    section_id: '',
    subject_id: '',
    username: '',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // We should ideally fetch the HOD's department, but for now we fetch the college's departments/courses.
  useEffect(() => {
    // Basic setup: load courses for the HOD's department (mock logic for dropdowns)
    const loadCourses = async () => {
      try {
        const cRes = await fetchWithAuth('/faculty_mgmt/my-department/courses');
        const cData = await cRes.json();
        setCourses(cData);
      } catch (err) {}
    };
    loadCourses();
  }, []);

  useEffect(() => {
    if (!formData.course_id) return;
    const loadSemesters = async () => {
      try {
        const res = await fetchWithAuth(`/architecture/courses/${formData.course_id}/semesters`);
        setSemesters(await res.json());
      } catch (err) {}
    };
    loadSemesters();
  }, [formData.course_id]);

  useEffect(() => {
    if (!formData.semester_id) return;
    const loadSecSub = async () => {
      try {
        const secRes = await fetchWithAuth(`/architecture/semesters/${formData.semester_id}/sections`);
        const subRes = await fetchWithAuth(`/architecture/semesters/${formData.semester_id}/subjects`);
        setSections(await secRes.json());
        setSubjects(await subRes.json());
      } catch (err) {}
    };
    loadSecSub();
  }, [formData.semester_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    // Find subject code for payload
    const selectedSubject = subjects.find(s => s.id == formData.subject_id);
    
    const payload = {
      ...formData,
      subject_code: selectedSubject ? selectedSubject.code : '',
      experience: parseInt(formData.experience) || 0
    };

    try {
      const res = await fetchWithAuth('/faculty_mgmt/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess('Faculty registered successfully! Account is active immediately.');
        setTimeout(() => navigate('/hod'), 2000);
      } else {
        setError(data.detail || 'Registration failed');
      }
    } catch (err) {
      setError('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12 pt-20">
      <Navbar />
      
      <div className="container mx-auto px-4 max-w-4xl mt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-emerald-400">
            <UserPlus size={32} /> Register New Faculty
          </h1>
          <p className="text-slate-400 mt-2">Create a new faculty account. The account will be active immediately.</p>
        </header>

        {error && (
          <div className="bg-rose-500/20 text-rose-400 p-4 rounded-lg border border-rose-500/50 mb-6 flex items-center gap-2">
            <AlertCircle size={20} /> {error}
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-lg border border-emerald-500/50 mb-6 flex items-center gap-2">
            <CheckCircle size={20} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Personal Info */}
          <div className="glass-panel p-6 border-t-2 border-cyan-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <UserPlus size={20} className="text-cyan-400" /> Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Full Name *</label>
                <input required type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email *</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Phone Number</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Date of Birth</label>
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div className="glass-panel p-6 border-t-2 border-emerald-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <Building size={20} className="text-emerald-400" /> Professional Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Employee / Faculty ID *</label>
                <input required type="text" name="faculty_id" value={formData.faculty_id} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Designation</label>
                <select name="designation" value={formData.designation} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none">
                  <option>Assistant Professor</option>
                  <option>Associate Professor</option>
                  <option>Professor</option>
                  <option>Lecturer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Qualification</label>
                <input type="text" name="qualification" value={formData.qualification} onChange={handleChange} placeholder="M.Tech, Ph.D" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Experience (Years)</label>
                <input type="number" name="experience" value={formData.experience} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Joining Date</label>
                <input type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Subject (Text)</label>
                <input type="text" name="subject_taught" value={formData.subject_taught} onChange={handleChange} placeholder="e.g. Data Structures" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Academic Assignment */}
          <div className="glass-panel p-6 border-t-2 border-indigo-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <BookOpen size={20} className="text-indigo-400" /> Academic Assignment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Course</label>
                <select required name="course_id" value={formData.course_id} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none">
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Semester</label>
                <select required name="semester_id" value={formData.semester_id} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" disabled={!formData.course_id}>
                  <option value="">Select Semester</option>
                  {semesters.map(s => <option key={s.id} value={s.id}>Semester {s.number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Subject</label>
                <select required name="subject_id" value={formData.subject_id} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" disabled={!formData.semester_id}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Section</label>
                <select required name="section_id" value={formData.section_id} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" disabled={!formData.semester_id}>
                  <option value="">Select Section</option>
                  {sections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Login Details */}
          <div className="glass-panel p-6 border-t-2 border-rose-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <UserPlus size={20} className="text-rose-400" /> System Access Login
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Username *</label>
                <input required type="text" name="username" value={formData.username} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password *</label>
                <input required type="password" name="password" value={formData.password} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 outline-none" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => navigate('/hod')} className="px-6 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
              <Save size={20} /> {loading ? 'Saving...' : 'Register Faculty'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
