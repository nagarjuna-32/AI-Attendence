import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ShieldAlert, CheckCircle2, ChevronLeft, ScanFace, Activity } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function Scanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('Initializing AI Core...');
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alert, setAlert] = useState(null); 
  const navigate = useNavigate();

  useEffect(() => {
    const initCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        setStatus('Scanning for faces...');
      } catch (err) {
        setStatus('Camera access denied.');
      }
    };
    initCamera();

    const interval = setInterval(processFrame, 1500);

    return () => {
      clearInterval(interval);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const processFrame = async () => {
    if (isProcessing || !videoRef.current || videoRef.current.readyState < 2) return;
    setIsProcessing(true);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      try {
        const res = await fetch(`${API_BASE}/attendance/mark_auto`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        
        if (data.status === 'success') {
          setAlert({ type: 'success', msg: `Welcome back, ${data.student.name}!` });
          setHistory(prev => [{
            time: new Date().toLocaleTimeString(),
            name: data.student.name,
            usn: data.student.usn,
            confidence: data.student.confidence,
          }, ...prev].slice(0, 5));
          
          setTimeout(() => setAlert(null), 4000);
        } else if (data.status === 'unknown') {
          setAlert({ type: 'error', msg: 'Face Not Registered!' });
          setTimeout(() => setAlert(null), 3000);
        }
      } catch (err) {
        // Silent network fail in background loop
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 overflow-hidden relative font-sans text-slate-100">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-cyan-900/10 blur-[150px] pointer-events-none" />
      </div>

      {/* Header */}
      <header className="h-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/faculty/dashboard')}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <ScanFace className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight">Live Attendance Scanner</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          System Online
        </div>
      </header>
      
      {/* HUD Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8 pt-28">
        
        {/* Reticle / Targeting Box */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          {/* Animated corner brackets */}
          <motion.div animate={{ scale: [1, 1.02, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute w-[320px] h-[320px]">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/80 rounded-br-xl" />
          </motion.div>
          
          <div className="w-[300px] h-[300px] rounded-full border border-cyan-500/20" />
        </div>

        {/* Status Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-900/50 px-6 py-2 rounded-full flex items-center gap-3 shadow-lg shadow-cyan-900/20">
            <Activity size={18} className="text-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-mono text-sm uppercase tracking-wider">{status}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative z-0 items-center justify-center p-8 pb-24">
        
        {/* Video Container with Premium Styling */}
        <div className="relative w-full max-w-5xl aspect-[21/9] bg-black rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl shadow-cyan-900/20">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover filter contrast-110 saturate-50"
          ></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          
          {/* Scan Line Animation */}
          <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 z-10 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
          />
        </div>
        
        {/* Real-time History Panel */}
        <div className="absolute right-8 top-32 bottom-32 w-80 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 flex flex-col z-20 shadow-2xl">
          <h3 className="text-white font-semibold mb-4 border-b border-slate-700/50 pb-3 flex items-center gap-2">
            <Camera size={18} className="text-indigo-400" /> Recent Scans
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <AnimatePresence>
              {history.map((h, i) => (
                <motion.initial 
                  key={i} 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl shadow-sm"
                >
                  <div className="flex justify-between items-center text-white mb-1">
                    <span className="font-semibold text-sm truncate">{h.name}</span>
                    <span className="text-xs text-slate-400">{h.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-mono">{h.usn}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {h.confidence}
                    </span>
                  </div>
                </motion.initial>
              ))}
              {history.length === 0 && (
                <div className="text-center text-slate-500 text-sm mt-10">No recent scans.</div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Premium Dynamic Alert Toast */}
        <AnimatePresence>
          {alert && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`absolute top-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl backdrop-blur-2xl border shadow-2xl ${
                alert.type === 'success' 
                  ? 'bg-emerald-950/90 border-emerald-500/50 shadow-emerald-900/50 text-emerald-400' 
                  : 'bg-rose-950/90 border-rose-500/50 shadow-rose-900/50 text-rose-400'
              }`}
            >
              {alert.type === 'success' ? <CheckCircle2 size={28} /> : <ShieldAlert size={28} />}
              <div>
                <div className="font-bold text-lg text-white">{alert.msg}</div>
                <div className="text-xs opacity-80 uppercase tracking-widest font-mono mt-0.5">
                  {alert.type === 'success' ? 'Attendance Recorded' : 'Action Required'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
