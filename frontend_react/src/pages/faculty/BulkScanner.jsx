import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, StopCircle, Play, ArrowLeft } from 'lucide-react';
import { API_BASE, fetchWithAuth } from '../../utils/api';

export default function BulkScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [stats, setStats] = useState({ detected: 0, recognized: 0, newly_marked: 0, unknown: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const initCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 } });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    initCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    let interval;
    if (sessionActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
        processBulkFrame();
      }, 3000); // Process every 3 seconds to save bandwidth/compute
    } else if (timeLeft <= 0 && sessionActive) {
      stopSession();
    }
    return () => clearInterval(interval);
  }, [sessionActive, timeLeft]);

  const processBulkFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2 || !sessionId) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('image', blob, 'classroom.jpg');
      
      try {
        const res = await fetch(`${API_BASE}/attendance/mark_bulk?session_id=${sessionId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch(err) {}
    }, 'image/jpeg', 0.8);
  };

  const startSession = async (mins) => {
    try {
      const res = await fetchWithAuth('/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: 1, section_id: 1, duration_minutes: mins }) // Hardcoded for demo
      });
      if (res && res.ok) {
        const data = await res.json();
        setSessionId(data.session_id);
        setTimeLeft(mins * 60);
        setSessionActive(true);
      }
    } catch (err) {}
  };

  const stopSession = async () => {
    setSessionActive(false);
    if (sessionId) {
      await fetchWithAuth(`/sessions/${sessionId}/stop`, { method: 'POST' });
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => navigate('/faculty')} className="glass-btn !w-auto flex items-center gap-2">
          <ArrowLeft size={16}/> Back to Dashboard
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover filter contrast-125 saturate-50"></video>
        <canvas ref={canvasRef} className="hidden"></canvas>
        
        {/* Session Overlay HUD */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-cyan-500/30 p-6 rounded-2xl w-full max-w-4xl flex items-center justify-between shadow-2xl">
          
          <div className="flex items-center gap-6">
            {!sessionActive ? (
              <div className="flex gap-2">
                <button onClick={() => startSession(5)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  <Play size={20} /> 5 Min Session
                </button>
                <button onClick={() => startSession(10)} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  <Play size={20} /> 10 Min Session
                </button>
              </div>
            ) : (
              <button onClick={stopSession} className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse">
                <StopCircle size={20} /> End Session ({formatTime(timeLeft)})
              </button>
            )}
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-sm text-slate-400 font-mono">DETECTED</div>
              <div className="text-3xl font-bold text-cyan-400">{stats.detected}</div>
            </div>
            <div className="w-px bg-white/10"></div>
            <div className="text-center">
              <div className="text-sm text-slate-400 font-mono">RECOGNIZED</div>
              <div className="text-3xl font-bold text-emerald-400">{stats.recognized}</div>
            </div>
            <div className="w-px bg-white/10"></div>
            <div className="text-center">
              <div className="text-sm text-slate-400 font-mono">NEWLY MARKED</div>
              <div className="text-3xl font-bold text-purple-400">+{stats.newly_marked}</div>
            </div>
            <div className="w-px bg-white/10"></div>
            <div className="text-center">
              <div className="text-sm text-slate-400 font-mono">UNKNOWN</div>
              <div className="text-3xl font-bold text-rose-400">{stats.unknown}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
