import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ShieldAlert, CheckCircle2, UserCircle2, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import { API_BASE } from '../utils/api';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('Initializing auto-scanner...');
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alert, setAlert] = useState(null); 
  const [showLogin, setShowLogin] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);
  
  const [loginTarget, setLoginTarget] = useState('dashboard'); // 'dashboard' or 'manual'
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const stateRef = useRef('IDLE');
  const [challengeText, setChallengeText] = useState('Awaiting manual start...');

  useEffect(() => {
    if (!isScanningActive || showLogin) return;
    
    let cameraInstance = null;

    const initFaceMesh = async () => {
      const faceMesh = new window.FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
      faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      
      faceMesh.onResults((results) => {
        if (stateRef.current === 'PROCESSING') return;

        if (results.multiFaceLandmarks?.length > 0) {
          if (results.multiFaceLandmarks.length > 1) {
            setChallengeText("Multiple faces detected! Please ensure only YOU are in the frame.");
            return;
          }
          
          if (stateRef.current === 'IDLE') {
            stateRef.current = 'CHALLENGE';
            setChallengeText("Face detected! Processing...");
            setTimeout(() => {
              if (stateRef.current === 'CHALLENGE') {
                proceedToCapture();
              }
            }, 1000); // 1 second delay to let user stabilize
          }
        } else {
          setChallengeText("No face detected. Please look at the camera.");
          stateRef.current = 'IDLE';
        }
      });

      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          cameraInstance = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && stateRef.current !== 'PROCESSING') {
                await faceMesh.send({image: videoRef.current});
              }
            },
            width: 1280, height: 720
          });
          cameraInstance.start();
        }
      } catch (err) {
        setChallengeText('Camera access denied or unavailable.');
      }
    };
    
    initFaceMesh();

    return () => {
      if (cameraInstance) cameraInstance.stop();
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [isScanningActive, showLogin]);

  const proceedToCapture = () => {
    stateRef.current = 'PROCESSING';
    setChallengeText("Face Captured! Authenticating...");
    captureAndSend();
  };

  const captureAndSend = async () => {
    if (!videoRef.current) return;
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
          setAlert({ type: 'success', msg: data.message || `Welcome back, ${data.student.name}!` });
          setHistory(prev => [{
            time: new Date().toLocaleTimeString(),
            name: data.student.name,
            usn: data.student.usn,
            confidence: data.student.confidence,
            status: 'Recognized'
          }, ...prev].slice(0, 5));
          
          setTimeout(() => {
            setAlert(null);
            setIsScanningActive(false); // Stop scan after success
          }, 4000);
        } else if (data.status === 'unknown') {
          setAlert({ type: 'error', msg: 'Face Not Registered! Redirecting...' });
          setTimeout(() => {
            setIsScanningActive(false);
            navigate('/register');
          }, 3000);
        } else {
          // Error like outside timetable slot
          setAlert({ type: 'error', msg: data.detail || 'Attendance Failed' });
          setTimeout(() => {
            setAlert(null);
            stateRef.current = 'IDLE'; // Retry
            setIsProcessing(false);
          }, 4000);
          return; // Early return to not trigger finally yet
        }
      } catch (err) {
        setChallengeText("Network Error.");
      } finally {
        // Only reset if we didn't early return on error
        if (stateRef.current === 'PROCESSING') {
           setIsProcessing(false);
           stateRef.current = 'IDLE';
        }
      }
    }, 'image/jpeg');
  };

  const openLogin = (target) => {
    setLoginTarget(target);
    setShowLogin(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    
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
        if (data.id) localStorage.setItem('user_id', data.id);
        if (stream) stream.getTracks().forEach(t => t.stop());
        
        if (data.role === 'principal') navigate('/principal');
        else if (data.role === 'hod') navigate('/hod');
        else if (data.role === 'admin') navigate('/admin');
        else if (data.role === 'faculty') navigate(loginTarget === 'manual' ? '/faculty/manual' : '/faculty');
        else navigate('/student');
      } else {
        setLoginError(data.detail || 'Login failed');
      }
    } catch (err) {
      setLoginError('Network error connecting to backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black overflow-hidden relative">
      <Navbar />
      
      {/* HUD Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8 pt-24">
        <div className="flex justify-between items-start">
          <div className="text-cyan-400 font-mono text-xs opacity-70">
            SYS.OP.MODE: {isScanningActive ? 'AUTO_ATTENDANCE' : 'STANDBY'}<br/>
            TARGET: FACE_REC<br/>
            STATUS: ACTIVE
          </div>
          <div className="text-right text-cyan-400 font-mono text-xs opacity-70">
            FRAME: 1080p<br/>
            LATENCY: ~150ms<br/>
            {new Date().toLocaleTimeString()}
          </div>
        </div>
        
        {/* Center Reticle */}
        {isScanningActive && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-cyan-500/30 rounded-full flex items-center justify-center">
            <div className="w-1 h-4 bg-cyan-500 absolute top-0"></div>
            <div className="w-1 h-4 bg-cyan-500 absolute bottom-0"></div>
            <div className="w-4 h-1 bg-cyan-500 absolute left-0"></div>
            <div className="w-4 h-1 bg-cyan-500 absolute right-0"></div>
            
            <motion.div 
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-48 h-48 border-2 border-cyan-400/50 rounded-lg"
            ></motion.div>
          </div>
        )}

        <div className="flex justify-between items-end">
          <div className="text-center font-mono text-cyan-400 text-sm bg-black/50 inline-block px-4 py-1 rounded backdrop-blur border border-cyan-900/50">
            {isScanningActive ? challengeText : 'Awaiting action...'}
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover filter transition-all duration-700 ${isScanningActive ? 'contrast-125 saturate-50' : 'grayscale blur-sm opacity-60'}`}
        ></video>
        <canvas ref={canvasRef} className="hidden"></canvas>
        
        {/* Action Buttons Overlay */}
        {!isScanningActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-6">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AI Attendance Assistant Pro</h1>
            
            <button 
              onClick={() => setIsScanningActive(true)}
              className="w-80 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(6,182,212,0.5)] transform hover:scale-105"
            >
              <Camera size={24} /> Student Live Face Scan
            </button>
            
            <button 
              onClick={() => navigate('/register')}
              className="w-80 bg-emerald-500/80 hover:bg-emerald-600 border border-emerald-400 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] transform hover:scale-105"
            >
              <UserCircle2 size={24} /> Register New Student
            </button>
            
            <button 
              onClick={() => openLogin('dashboard')}
              className="w-80 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-500/50 text-indigo-100 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105"
            >
              <UserCircle2 size={24} className="text-indigo-400" /> Staff Login
            </button>
          </div>
        )}
        
        {/* History Panel */}
        <div className="absolute left-6 top-24 bottom-24 w-80 bg-black/60 backdrop-blur-xl border border-cyan-900/50 rounded-xl p-4 flex flex-col z-20 pointer-events-none">
          <h3 className="text-cyan-400 font-mono text-sm mb-4 border-b border-cyan-900/50 pb-2 flex items-center gap-2">
            <Camera size={16} /> RECENT SCANS
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            <AnimatePresence>
              {history.map((h, i) => (
                <motion.initial 
                  key={i} 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-cyan-950/30 border border-cyan-800/50 p-3 rounded text-xs font-mono"
                >
                  <div className="flex justify-between text-cyan-300 mb-1">
                    <span>{h.name}</span>
                    <span>{h.time}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{h.usn}</span>
                    <span className="text-green-400">{h.confidence}</span>
                  </div>
                </motion.initial>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic Alerts */}
        <AnimatePresence>
          {alert && (
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className={`absolute top-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-8 py-4 rounded-2xl backdrop-blur-2xl border shadow-2xl pointer-events-none ${
                alert.type === 'success' 
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' 
                  : 'bg-red-950/80 border-red-500/50 text-red-400'
              }`}
            >
              {alert.type === 'success' ? <CheckCircle2 size={32} /> : <ShieldAlert size={32} />}
              <div>
                <div className="font-bold text-xl">{alert.msg}</div>
                <div className="text-sm opacity-80 uppercase tracking-widest font-mono">
                  {alert.type === 'success' ? 'Attendance Recorded' : 'Action Required'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Staff Login Modal */}
        <AnimatePresence>
          {showLogin && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full relative"
              >
                <button 
                  onClick={() => setShowLogin(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
                
                <h2 className="text-2xl font-bold mb-6 text-center">Staff Login</h2>
                {loginError && <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">{loginError}</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <select 
                      className="w-full bg-black/30 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none mb-4"
                      id="role-select"
                      defaultValue="faculty"
                    >
                      <option value="principal">Principal</option>
                      <option value="hod">HOD</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Username" 
                      className="w-full bg-black/30 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <input 
                      type="password" 
                      placeholder="Password" 
                      className="w-full bg-black/30 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all">
                    {loading ? 'Authenticating...' : 'Access Portal'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
