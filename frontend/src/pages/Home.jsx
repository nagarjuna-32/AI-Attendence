import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanFace, UserCircle, GraduationCap, ShieldCheck, ChevronRight, BarChart3, Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden selection:bg-indigo-500/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-emerald-600/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ScanFace className="text-white" size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">AI<span className="text-indigo-400">Attendance</span></span>
        </div>
        <button onClick={() => navigate('/login')} className="glass-btn-outline px-6 py-2 text-sm font-semibold rounded-full">
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-20 pb-32 px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
          Next-Generation College ERP
        </motion.div>

        <motion.h1 
          {...fadeIn}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl"
        >
          Frictionless Attendance with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
            AI Facial Recognition
          </span>
        </motion.h1>

        <motion.p 
          {...fadeIn} transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12"
        >
          Transform your campus operations with a secure, automated, and lightning-fast attendance management system built for modern educational institutions.
        </motion.p>

        <motion.div 
          {...fadeIn} transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-full font-semibold text-lg flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all hover:-translate-y-1"
          >
            Access Portal <ChevronRight size={20} />
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white rounded-full font-semibold text-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-1"
          >
            <UserCircle size={20} /> Student Registration
          </button>
        </motion.div>
      </main>

      {/* Features/Roles Grid */}
      <section className="relative z-10 px-6 pb-32 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Tailored for Every Role</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Secure, role-based dashboards ensuring privacy and providing the exact tools needed for Principals, HODs, Faculty, and Students.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { role: 'Principal', icon: ShieldCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/10', desc: 'Institution-wide analytics and high-level reports.' },
            { role: 'Head of Dept', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', desc: 'Department management and timetable oversight.' },
            { role: 'Faculty', icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/10', desc: 'Live AI scanning and individual class tracking.' },
            { role: 'Student', icon: GraduationCap, color: 'text-cyan-400', bg: 'bg-cyan-500/10', desc: 'Personal attendance records and real-time alerts.' },
          ].map((item, index) => (
            <motion.div 
              key={item.role}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-8 group cursor-pointer"
              onClick={() => navigate('/login')}
            >
              <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <item.icon size={28} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{item.role}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
