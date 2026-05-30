import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { Users, Building2, Calendar, FileText, CheckCircle2, Download, AlertTriangle, Filter, Bell, UserPlus } from 'lucide-react';
import { fetchWithAuth, API_BASE } from '../../utils/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

export default function PrincipalDashboard() {
  const [overview, setOverview] = useState(null);
  const [filterData, setFilterData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [assignHodModal, setAssignHodModal] = useState({ show: false, deptId: null, deptName: '' });
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initLoad = async () => {
      try {
        const [overviewRes, deptsRes, alertsRes, notifRes] = await Promise.all([
          fetchWithAuth('/analytics/overview'),
          fetchWithAuth('/architecture/departments'),
          fetchWithAuth('/alerts/metrics/principal'),
          fetchWithAuth('/faculty_mgmt/notifications')
        ]);
        
        if (overviewRes && deptsRes) {
          setOverview(await overviewRes.json());
          setDepartments(await deptsRes.json());
        }
        if (alertsRes && alertsRes.ok) {
          setAlertsSummary(await alertsRes.json());
        }
        if (notifRes && notifRes.ok) {
          setNotifications(await notifRes.json());
        }
      } catch (err) {
        console.error("Failed to load overview");
      } finally {
        setLoading(false);
      }
    };
    initLoad();
  }, []);

  useEffect(() => {
    const loadFiltered = async () => {
      try {
        let url = '/analytics/filter?';
        if (selectedDept) url += `department_id=${selectedDept}&`;
        if (selectedSem) url += `semester=${selectedSem}&`;
        if (selectedSection) url += `section=${selectedSection}`;
        
        const res = await fetchWithAuth(url);
        if (res) {
          setFilterData(await res.json());
        }
      } catch (err) {}
    };
    loadFiltered();
  }, [selectedDept, selectedSem, selectedSection]);

  const handleExport = (format) => {
    let url = `${API_BASE}/analytics/export?format=${format}`;
    if (selectedDept) url += `&department_id=${selectedDept}`;
    if (selectedSem) url += `&semester=${selectedSem}`;
    if (selectedSection) url += `&section=${selectedSection}`;
    
    // Add token for authentication
    const token = localStorage.getItem('token');
    
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.blob())
    .then(blob => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `attendance_report.${format === 'excel' ? 'xlsx' : format}`;
      link.click();
    });
  };

  const subjectChartData = {
    labels: filterData?.charts?.subjects ? Object.keys(filterData.charts.subjects) : [],
    datasets: [
      {
        label: 'Attendance %',
        data: filterData?.charts?.subjects ? Object.values(filterData.charts.subjects) : [],
        backgroundColor: 'rgba(56, 189, 248, 0.5)',
        borderColor: 'rgba(56, 189, 248, 1)',
        borderWidth: 1,
      },
    ],
  };

  const monthlyChartData = {
    labels: filterData?.charts?.monthly ? Object.keys(filterData.charts.monthly) : [],
    datasets: [
      {
        label: 'Monthly Trend %',
        data: filterData?.charts?.monthly ? Object.values(filterData.charts.monthly) : [],
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400">Loading Analytics...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8 mt-16">
        <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Principal Analytics Center</h1>
            <p className="text-slate-400 mt-2">Enterprise Overview & System Health</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowCredentialsModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 flex items-center gap-2 transition-all font-bold"
            >
              Change Credentials
            </button>
            <button onClick={() => handleExport('pdf')} className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 px-4 py-2 rounded-lg border border-rose-500/50 flex items-center gap-2 transition-colors">
              <FileText size={18} /> PDF
            </button>
            <button onClick={() => handleExport('excel')} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 px-4 py-2 rounded-lg border border-emerald-500/50 flex items-center gap-2 transition-colors">
              <Download size={18} /> Excel
            </button>
            <button onClick={() => handleExport('csv')} className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 px-4 py-2 rounded-lg border border-cyan-500/50 flex items-center gap-2 transition-colors">
              <FileText size={18} /> CSV
            </button>
          </div>
        </header>

        {/* Global Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-t-4 border-indigo-500">
            <Building2 className="text-indigo-400 mb-2" size={32} />
            <h3 className="text-slate-400 text-sm uppercase tracking-wider">Best Dept</h3>
            <div className="text-xl font-bold mt-2 text-indigo-300">{overview?.best_dept?.name || 'N/A'}</div>
            <div className="text-sm text-emerald-400 font-mono mt-1">{overview?.best_dept?.percentage}%</div>
          </div>
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-t-4 border-emerald-500">
            <Users className="text-emerald-400 mb-2" size={32} />
            <h3 className="text-slate-400 text-sm uppercase tracking-wider">Total Students</h3>
            <div className="text-3xl font-bold mt-2 text-emerald-300">{overview?.total_students || 0}</div>
            <div className="text-sm text-emerald-400/70 font-mono mt-1">College Wide</div>
          </div>
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-t-4 border-cyan-500">
            <CheckCircle2 className="text-cyan-400 mb-2" size={32} />
            <h3 className="text-slate-400 text-sm uppercase tracking-wider">Overall Attendance</h3>
            <div className="text-3xl font-bold mt-2 text-cyan-300">{overview?.overall_percentage || 0}%</div>
            <div className="text-sm text-cyan-400/70 font-mono mt-1">Average</div>
          </div>
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-t-4 border-rose-500">
            <AlertTriangle className="text-rose-400 mb-2" size={32} />
            <h3 className="text-slate-400 text-sm uppercase tracking-wider">Absent Today</h3>
            <div className="text-3xl font-bold mt-2 text-rose-300">{overview?.absent_today || 0}</div>
            <div className="text-sm text-rose-400/70 font-mono mt-1">Students</div>
          </div>
        </div>

        {/* Create Department Form */}
        <div className="mb-8 glass-panel p-6 border border-cyan-500/20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
            <Building2 size={20} /> Manage Departments
          </h2>
          <form className="flex gap-4 items-end" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target;
            const name = form.name.value;
            const code = form.code.value;
            try {
              const res = await fetchWithAuth('/architecture/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, code, description: '' })
              });
              if(res.ok) {
                const newDept = await res.json();
                setDepartments([...departments, newDept]);
                form.reset();
              } else {
                alert("Failed to create department. Code/Name may already exist.");
              }
            } catch (err) {
              alert("Network Error");
            }
          }}>
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Department Name *</label>
              <input required name="name" type="text" placeholder="e.g. Artificial Intelligence" className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:border-cyan-500 outline-none text-white" />
            </div>
            <div className="w-32">
              <label className="block text-sm text-slate-400 mb-1">Code *</label>
              <input required name="code" type="text" placeholder="e.g. AIDS" className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:border-cyan-500 outline-none text-white uppercase" />
            </div>
            <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded font-bold transition-all h-[42px]">
              + Add Dept
            </button>
          </form>
        </div>

        {/* Departments List with HODs */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-400">
            <Users size={20} /> Department & HOD Directory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(dept => (
              <div key={dept.id} className="bg-slate-900/80 p-5 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white text-lg">{dept.name}</h3>
                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-mono">{dept.code}</span>
                  </div>
                  <div className="text-sm text-slate-400 mt-4">Assigned HOD:</div>
                  {dept.hod_name ? (
                    <div className="text-emerald-400 font-bold flex items-center gap-2 mt-1">
                      <CheckCircle2 size={16} /> {dept.hod_name}
                    </div>
                  ) : (
                    <div className="text-rose-400/80 italic mt-1">No HOD Assigned</div>
                  )}
                </div>
                
                {!dept.hod_name && (
                  <button 
                    onClick={() => setAssignHodModal({ show: true, deptId: dept.id, deptName: dept.name })}
                    className="mt-4 w-full bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 py-2 rounded-lg border border-indigo-500/50 transition-all font-bold flex items-center justify-center gap-2"
                  >
                    <UserPlus size={16} /> Assign HOD
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Department Alert Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-rose-400">
            <AlertTriangle size={20} /> Department Alert Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {alertsSummary.map(dept => (
              <div key={dept.department} className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-bold">{dept.department}</span>
                <span className="text-xl font-bold text-rose-400">{dept.alerts_count} Alerts</span>
              </div>
            ))}
            {alertsSummary.length === 0 && (
              <div className="col-span-4 text-slate-500 italic">No alerts recorded yet.</div>
            )}
          </div>
        </div>

        {/* System Notifications */}
        <div className="mb-8 glass-panel p-6 border-t-2 border-indigo-500">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-400">
            <Bell size={20} /> System Notifications
          </h2>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {notifications.map(notif => (
              <div key={notif.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex justify-between items-start">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {notif.type === 'FACULTY_REGISTRATION' && <UserPlus size={16} className="text-emerald-400" />}
                    {notif.title}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">{notif.description}</div>
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(notif.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-slate-500 italic p-4 text-center border border-dashed border-slate-700 rounded-lg">No new notifications.</div>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-wrap gap-4 items-center mb-8">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter size={20} /> <span className="font-bold">Deep Dive Filters:</span>
          </div>
          <select 
            className="bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select 
            className="bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
          >
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
          <select 
            className="bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="">All Sections</option>
            {['A', 'B', 'C'].map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>
          <div className="flex-1 min-w-[200px]">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by USN or Name..." 
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button 
            onClick={() => { /* Triggered by useEffect anyway, but good for UX */ }}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            Search
          </button>
        </div>

        {/* Filter Results & Charts */}
        {filterData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Filter Stats */}
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-panel p-6">
                <h2 className="text-lg font-bold mb-4 text-cyan-400 border-b border-white/10 pb-2">Filter Metrics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded">
                    <span className="text-slate-400">Filtered Students</span>
                    <span className="font-bold">{filterData.total_students}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded">
                    <span className="text-slate-400">Average %</span>
                    <span className="font-bold text-emerald-400">{filterData.percentage}%</span>
                  </div>
                </div>
              </div>

              {/* Defaulters List */}
              <div className="glass-panel p-6">
                <h2 className="text-lg font-bold mb-4 text-rose-400 border-b border-white/10 pb-2 flex items-center gap-2">
                  <AlertTriangle size={18} /> Critical Risk (&lt;75%)
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {filterData.defaulters.length === 0 ? (
                    <div className="text-sm text-slate-500 italic">No critical risk students found.</div>
                  ) : (
                    filterData.defaulters.map((d, i) => (
                      <div key={i} className="flex justify-between items-center bg-rose-950/20 p-2 rounded border border-rose-900/50">
                        <div className="text-sm">
                          <div className="font-bold">{d.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{d.usn}</div>
                        </div>
                        <div className="text-rose-400 font-bold">{d.percentage}%</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Charts Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel p-6">
                <h2 className="text-lg font-bold mb-4">Subject-wise Attendance Trend</h2>
                <div className="h-64 w-full">
                  <Bar 
                    data={subjectChartData} 
                    options={{ 
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { min: 0, max: 100 } }
                    }} 
                  />
                </div>
              </div>
              <div className="glass-panel p-6">
                <h2 className="text-lg font-bold mb-4">Monthly Attendance Trend</h2>
                <div className="h-64 w-full">
                  <Line 
                    data={monthlyChartData} 
                    options={{ 
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { min: 0, max: 100 } }
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Assign HOD Modal */}
      {assignHodModal.show && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-indigo-500/30 p-6 rounded-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-white mb-2">Assign HOD</h3>
            <p className="text-slate-400 mb-6">for {assignHodModal.deptName}</p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target;
              try {
                const res = await fetchWithAuth(`/architecture/departments/${assignHodModal.deptId}/hod`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    full_name: form.fullName.value,
                    username: form.username.value,
                    password: form.password.value
                  })
                });
                
                if (res.ok) {
                  const data = await res.json();
                  // Update local state
                  setDepartments(departments.map(d => 
                    d.id === assignHodModal.deptId ? { ...d, hod_name: data.hod_name } : d
                  ));
                  setAssignHodModal({ show: false, deptId: null, deptName: '' });
                } else {
                  const err = await res.json();
                  alert(`Failed: ${err.detail || 'Unknown error'}`);
                }
              } catch (error) {
                alert("Network error");
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                <input required name="fullName" type="text" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Username</label>
                <input required name="username" type="text" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password</label>
                <input required name="password" type="password" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setAssignHodModal({ show: false, deptId: null, deptName: '' })} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all">
                  Save HOD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Credentials Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md relative">
            <button onClick={() => setShowCredentialsModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <h3 className="text-2xl font-bold text-white mb-2">Change Credentials</h3>
            <p className="text-slate-400 text-sm mb-6">Leave new username or password blank to keep current.</p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target;
              if (form.newPassword.value && form.newPassword.value !== form.confirmPassword.value) {
                alert("New passwords do not match!");
                return;
              }
              if (!form.newUsername.value && !form.newPassword.value) {
                alert("Please provide either a new username or new password.");
                return;
              }
              
              try {
                const res = await fetchWithAuth('/auth/change-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    old_password: form.oldPassword.value,
                    new_password: form.newPassword.value || null,
                    new_username: form.newUsername.value || null
                  })
                });
                if (res.ok) {
                  alert("Credentials updated successfully!");
                  setShowCredentialsModal(false);
                } else {
                  const err = await res.json();
                  alert(err.detail || "Update failed");
                }
              } catch (err) { alert("Network error"); }
            }} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Current Password (Required)</label>
                <input required name="oldPassword" type="password" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">New Username (Optional)</label>
                <input name="newUsername" type="text" placeholder="Leave blank to keep current" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">New Password (Optional)</label>
                <input name="newPassword" type="password" placeholder="Leave blank to keep current" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Confirm New Password</label>
                <input name="confirmPassword" type="password" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold transition-all mt-4">
                Update Credentials
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
