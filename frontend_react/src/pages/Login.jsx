import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_BASE } from '../utils/api';
import Navbar from '../components/Navbar';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
        navigate('/dashboard');
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      setError('Network error connecting to backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel max-w-md w-full"
        >
          <h2 className="text-3xl font-bold mb-6 text-center">Admin Login</h2>
          {error && <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="text" 
                placeholder="Username" 
                className="glass-input" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <input 
                type="password" 
                placeholder="Password" 
                className="glass-input" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="glass-btn">
              {loading ? 'Authenticating...' : 'Sign In as Admin'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-slate-400 mb-4">Are you a student?</p>
            <button 
              onClick={() => navigate('/register')} 
              className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold py-3 px-6 rounded-lg transition-all"
            >
              Register New Face ID
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
