import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../utils/api';
import { Eye, EyeOff, ShieldCheck, Users, GraduationCap, BarChart3, ScanFace, ChevronLeft } from 'lucide-react';

const roles = [
  { id: 'principal', label: 'Principal', icon: ShieldCheck, color: 'text-indigo-400' },
  { id: 'hod', label: 'HOD', icon: Users, color: 'text-emerald-400' },
  { id: 'faculty', label: 'Faculty', icon: BarChart3, color: 'text-amber-400' },
  { id: 'student', label: 'Student', icon: GraduationCap, color: 'text-cyan-400' }
];

export default function Login() {
  const [activeRole, setActiveRole] = useState('faculty');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username || username);
        if (data.id) localStorage.setItem('user_id', data.id);
        
        // Ensure the selected tab matches the actual DB role to avoid confusion
        const actualRole = data.role.toLowerCase();
        
        if (actualRole === 'principal') navigate('/principal/dashboard');
        else if (actualRole === 'hod') navigate('/hod/dashboard');
        else if (actualRole === 'admin') navigate('/admin');
        else if (actualRole === 'faculty') navigate('/faculty/dashboard');
        else navigate('/student/dashboard');
      } else {
        setError(data.detail || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setError('Network error. Unable to reach authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/20 blur-[120px]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

      {/* Back Button */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-20 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800 backdrop-blur"
      >
        <ChevronLeft size={18} /> Home
      </button>

      {/* Logo */}
      <div className="flex flex-col items-center mb-8 z-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
          <ScanFace className="text-white" size={36} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h1>
        <p className="text-slate-400 mt-2">Sign in to your dashboard</p>
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden z-10"
      >
        {/* Role Tabs */}
        <div className="flex p-2 bg-slate-950/50 border-b border-slate-800/50">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRole(r.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg relative transition-colors ${activeRole === r.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {activeRole === r.id && (
                <motion.div layoutId="loginTab" className="absolute inset-0 bg-slate-800/80 rounded-lg shadow-sm" />
              )}
              <span className="relative z-10 flex flex-col items-center gap-1">
                <r.icon size={18} className={activeRole === r.id ? r.color : ''} />
                <span className="text-xs font-semibold">{r.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Form Area */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-3"
              >
                <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-400 mb-1.5 text-sm font-medium">Username / User ID</label>
              <input 
                type="text" 
                className="glass-input"
                placeholder="Enter your credentials"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="relative">
              <label className="block text-slate-400 mb-1.5 text-sm font-medium">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  className="glass-input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="glass-btn w-full mt-8"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> 
                  Authenticating...
                </span>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {activeRole === 'student' && (
             <div className="mt-6 text-center text-sm text-slate-500">
               Don't have an account? <br/>
               <button onClick={() => navigate('/register')} className="text-indigo-400 hover:text-indigo-300 font-semibold mt-1">Register New Face ID</button>
             </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
