import React from 'react';
import { motion } from 'framer-motion';

export function StatCard({ title, value, subtitle, icon: Icon, color = "indigo", delay = 0 }) {
  const colorMap = {
    indigo: "from-indigo-500/20 to-indigo-500/0 border-indigo-500/30 text-indigo-400 shadow-indigo-500/10",
    emerald: "from-emerald-500/20 to-emerald-500/0 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10",
    cyan: "from-cyan-500/20 to-cyan-500/0 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10",
    rose: "from-rose-500/20 to-rose-500/0 border-rose-500/30 text-rose-400 shadow-rose-500/10",
    amber: "from-amber-500/20 to-amber-500/0 border-amber-500/30 text-amber-400 shadow-amber-500/10",
  };

  const bgGradient = colorMap[color] || colorMap.indigo;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl bg-slate-900 border ${bgGradient} p-6 shadow-xl backdrop-blur-sm transition-all hover:scale-[1.02]`}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br opacity-20 blur-2xl rounded-full" />
      
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
          </div>
          {subtitle && (
            <p className="mt-1 text-sm font-medium opacity-80">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 ${colorMap[color].split(' ')[3]}`}>
          {Icon && <Icon size={24} />}
        </div>
      </div>
    </motion.div>
  );
}
