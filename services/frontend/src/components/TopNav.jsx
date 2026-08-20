import React from 'react';
import { Bell, User, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopNav({ title }) {
  // Try to get username from local storage (or default to role name)
  const username = localStorage.getItem('username') || localStorage.getItem('role') || 'User';

  return (
    <header className="h-20 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800/60 flex items-center justify-between px-6 z-10 shrink-0 shadow-sm">
      <div className="flex items-center gap-4">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white tracking-tight"
        >
          {title || "Dashboard"}
        </motion.h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar (Optional visual element for premium feel) */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Quick search..." 
            className="bg-slate-950 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all w-64"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800">
          <Bell size={20} />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-semibold text-white capitalize">{username}</span>
            <span className="text-xs text-indigo-400 capitalize">{localStorage.getItem('role') || 'Guest'}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
