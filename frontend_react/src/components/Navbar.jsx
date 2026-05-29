import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, ClipboardCheck, Home } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const isAuth = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Attendance Pro
      </Link>
      <div className="flex gap-6 items-center">
        {!isAuth ? (
          <>
            {location.pathname !== '/' && (
              <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <Home size={18} /> Home Scanner
              </Link>
            )}
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`flex items-center gap-2 hover:text-white transition-colors ${location.pathname === '/dashboard' ? 'text-white' : 'text-slate-400'}`}>
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            <Link to="/manual" className={`flex items-center gap-2 hover:text-white transition-colors ${location.pathname === '/manual' ? 'text-white' : 'text-slate-400'}`}>
              <ClipboardCheck size={18} /> Manual Entry
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors">
              <LogOut size={18} /> Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
