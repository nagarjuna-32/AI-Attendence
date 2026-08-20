import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, Calendar, FileText, Bell, 
  Settings, LogOut, ChevronLeft, ChevronRight, ScanFace 
} from 'lucide-react';

export function Sidebar({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Define navigation links based on role
  const getNavLinks = () => {
    switch (role) {
      case 'principal':
        return [
          { name: 'Dashboard', path: '/principal/dashboard', icon: LayoutDashboard },
          { name: 'Reports', path: '/principal/dashboard', icon: FileText },
        ];
      case 'hod':
        return [
          { name: 'Dashboard', path: '/hod/dashboard', icon: LayoutDashboard },
          { name: 'Timetable', path: '/hod/timetable', icon: Calendar },
          { name: 'Register Faculty', path: '/hod/register-faculty', icon: Users },
        ];
      case 'faculty':
        return [
          { name: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
          { name: 'Scan Attendance', path: '/scanner', icon: ScanFace },
          { name: 'Bulk Scanner', path: '/faculty/bulk-scanner', icon: Users },
          { name: 'Alerts', path: '/faculty/alerts', icon: Bell },
        ];
      case 'student':
        return [
          { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-full bg-slate-900 border-r border-slate-800 flex flex-col relative z-20 shrink-0 shadow-2xl"
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 bg-indigo-500 hover:bg-indigo-400 text-white p-1 rounded-full shadow-lg border-2 border-slate-900 transition-colors z-30"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Logo Area */}
      <div className="h-20 flex items-center justify-center border-b border-slate-800/50">
        <div className="flex items-center gap-3 px-6 w-full">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <ScanFace className="text-white" size={24} />
          </div>
          {!collapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-bold text-lg leading-tight tracking-tight"
            >
              <span className="text-slate-100">AI</span><span className="text-indigo-400">Attendance</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              title={collapsed ? link.name : ''}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-indigo-500/10 text-indigo-400 font-semibold' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r-full"
                />
              )}
              <link.icon size={22} className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300 transition-colors'}`} />
              {!collapsed && (
                <span className="truncate">{link.name}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-4 border-t border-slate-800/50">
        <button
          onClick={handleLogout}
          title={collapsed ? "Logout" : ""}
          className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors group"
        >
          <LogOut size={22} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  );
}
