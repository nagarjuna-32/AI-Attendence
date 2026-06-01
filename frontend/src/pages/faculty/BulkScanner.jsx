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
  const [timeLeft, setTimeLeft] = useState(0);
  const [stats, setStats] = useState({ detected: 0, recognized: 0, newly_marked: 0, unknown: 0 });
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let activeStream = null;
    const initCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        activeStream = s;
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    initCamera();

    const loadAssignments = async () => {
      const facultyId = localStorage.getItem('user_id') || 1;
      try {
        const res = await fetchWithAuth(`/architecture/faculty/${facultyId}/assignments`);
        if (res && res.ok) {
          const data = await res.json();
          setAssignments(data);
          if (data.length > 0) {
            setSelectedAssignmentId(data[0].assignment_id);
          }
        }
      } catch (err) {}
    };
    loadAssignments();

    return () => {
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
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
  }, [sessionActive, timeLeft, selectedAssignmentId]);

  const processBulkFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2 || !selectedAssignmentId) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const selectedAssign = assignments.find(a => a.assignment_id == selectedAssignmentId);
    if (!selectedAssign) return;

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('image', blob, 'classroom.jpg');
      
      try {
        const res = await fetch(`${API_BASE}/attendance/mark_bulk?subject_id=${selectedAssign.subject.id}&section_id=${selectedAssign.section.id}`, {
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

  const startSession = (mins) => {
    if (!selectedAssignmentId) {
      alert("Please select a subject/section to scan.");
      return;
    }
    setTimeLeft(mins * 60);
    setSessionActive(true);
  };

  const stopSession = () => {
    setSessionActive(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden text-slate-100">
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => navigate('/faculty')} className="glass-btn !w-auto flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 py-2 px-4 rounded-xl text-sm transition-all">
          <ArrowLeft size={16}/> Back to Dashboard
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover filter contrast-125 saturate-50"></video>
        <canvas ref={canvasRef} className="hidden"></canvas>
        
        {/* Session Overlay HUD */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-xl border border-cyan-500/30 p-6 rounded-2xl w-full max-w-5xl flex flex-col md:flex-row gap-6 items-center justify-between shadow-2xl z-10">
          
          <div className="flex items-center gap-6">
            {!sessionActive ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase text-left">Active Timetable Subject</label>
                <select 
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 outline-none w-72"
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                >
                  <option value="">Select Class / Subject</option>
                  {assignments.map(a => (
                    <option key={a.assignment_id} value={a.assignment_id}>
                      {a.subject.code} - {a.subject.name} (Sec {a.section.name || a.section.id})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => startSession(5)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-xs flex-1">
                    <Play size={14} /> 5 Min Session
                  </button>
                  <button onClick={() => startSession(10)} className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-xs flex-1">
                    <Play size={14} /> 10 Min Session
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-left">
                <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Scanning Room...</div>
                <button onClick={stopSession} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse">
                  <StopCircle size={20} /> End Session ({formatTime(timeLeft)})
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-6 mt-4 md:mt-0">
            <div className="text-center">
              <div className="text-xs text-slate-400 font-mono">DETECTED</div>
              <div className="text-3xl font-bold text-cyan-400 mt-1">{stats.detected}</div>
            </div>
            <div className="w-px bg-white/10"></div>
            <div className="text-center">
              <div className="text-xs text-slate-400 font-mono">RECOGNIZED</div>
              <div className="text-3xl font-bold text-emerald-400 mt-1">{stats.recognized}</div>
            </div>
            <div className="w-px bg-white/10"></div>
            <div className="text-center">
              <div className="text-xs text-slate-400 font-mono">NEWLY MARKED</div>
              <div className="text-3xl font-bold text-purple-400 mt-1">+{stats.newly_marked}</div>
            </div>
            <div className="w-px bg-white/10"></div>
            <div className="text-center flex flex-col items-center justify-center">
              <div className="text-xs text-slate-400 font-mono">UNKNOWN</div>
              <div className="text-3xl font-bold text-rose-400 mt-1">{stats.unknown}</div>
              {stats.unknown > 0 && (
                <button 
                  onClick={() => navigate('/register')} 
                  className="mt-2 text-[10px] bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-3 py-1 rounded-full border border-rose-500/50 transition-all font-bold whitespace-nowrap"
                >
                  Register Student
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
