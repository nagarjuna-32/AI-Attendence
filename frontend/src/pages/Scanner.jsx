import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronLeft, 
  ScanFace, 
  Activity, 
  BookOpen, 
  User, 
  Clock, 
  ShieldCheck, 
  Check, 
  Loader2, 
  Circle,
  RefreshCw,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { API_BASE } from '../utils/api';

const CHALLENGES = [
  'Blink once',
  'Blink twice',
  'Turn head left',
  'Turn head right'
];

export default function Scanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Stream ref to ensure we can always shut off the camera reliably
  const streamRef = useRef(null);
  const [stream, setStream] = useState(null);
  
  // States
  const [scanState, setScanState] = useState('initializing'); // 'initializing' | 'scanning' | 'success' | 'timeout' | 'spoof' | 'duplicate'
  const [status, setStatus] = useState('Initializing AI Core...');
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  
  // Scanning timer & limits
  const [scanTimeoutLeft, setScanTimeoutLeft] = useState(5.0);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  
  // Checklist HUD state
  const [checklist, setChecklist] = useState({
    cameraReady: false,
    faceDetected: false,
    livenessVerified: false,
    faceMatched: false,
    attendanceMarked: false
  });
  
  // Challenge State Machine
  const [challenge, setChallenge] = useState('Blink once');
  const [challengeProgress, setChallengeProgress] = useState('Waiting...');
  const [spoofRatios, setSpoofRatios] = useState([]);
  const [spoofMessage, setSpoofMessage] = useState('');
  const [matchedStudent, setMatchedStudent] = useState(null);

  // Refs for background loops
  const frameCounter = useRef(0);
  const lastEyeStateRef = useRef(false);
  const blinkStageRef = useRef(0);
  const isProcessingRef = useRef(false);
  const challengePassedRef = useRef(false);
  const consecutiveUnknownCount = useRef(0);
  
  // Track active scanState inside refs to avoid closure issues in intervals
  const scanStateRef = useRef('initializing');
  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  const challengeRef = useRef('Blink once');
  useEffect(() => {
    challengeRef.current = challenge;
  }, [challenge]);

  // Load active session and history on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/attendance/active_session`);
        const data = await res.json();
        setActiveSession(data);
      } catch (err) {
        console.error('Failed to load active session:', err);
      }
    };
    fetchSession();
    startScan();

    return () => {
      stopCamera();
    };
  }, []);

  // Redirect countdown when success or duplicate is active
  useEffect(() => {
    if (scanState !== 'success' && scanState !== 'duplicate') return;
    if (redirectCountdown <= 0) {
      navigate('/');
      return;
    }
    const timer = setInterval(() => {
      setRedirectCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [scanState, redirectCountdown, navigate]);

  // Stream management
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setChecklist(prev => ({ ...prev, cameraReady: false }));
  };

  const startScan = async () => {
    stopCamera();
    
    // Choose random challenge
    const randomChallenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    setChallenge(randomChallenge);
    setChallengeProgress('Waiting...');
    setSpoofRatios([]);
    setMatchedStudent(null);
    setRedirectCountdown(3);
    consecutiveUnknownCount.current = 0;
    
    // Reset state & variables
    setChecklist({
      cameraReady: false,
      faceDetected: false,
      livenessVerified: false,
      faceMatched: false,
      attendanceMarked: false
    });
    
    frameCounter.current = 0;
    lastEyeStateRef.current = false;
    blinkStageRef.current = 0;
    isProcessingRef.current = false;
    challengePassedRef.current = false;
    
    setScanState('scanning');

    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      streamRef.current = s;
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setChecklist(prev => ({ ...prev, cameraReady: true }));
      setStatus('Scanning started...');
    } catch (err) {
      console.error('Camera access error:', err);
      setStatus('Camera access denied.');
      setScanState('error');
    }
  };

  // High frequency frame acquisition loop
  useEffect(() => {
    if (scanState !== 'scanning') return;

    const interval = setInterval(processFrame, 100); // 100ms ticks
    return () => clearInterval(interval);
  }, [scanState]);

  const processFrame = async () => {
    if (scanStateRef.current !== 'scanning') return;
    if (isProcessingRef.current || !videoRef.current || videoRef.current.readyState < 2) return;

    // Fast pipeline optimization: evaluate only every 5th tick of the camera loop
    frameCounter.current++;
    if (frameCounter.current % 5 !== 0) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    // Fast pipeline optimization: resize frames to 640x480 before sending to server
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 640, 480);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');
      formData.append('liveness_verified', 'false'); // challenge in progress

      try {
        const res = await fetch(`${API_BASE}/attendance/mark_auto`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        
        await handleFrameResponse(data, blob);
      } catch (err) {
        console.error('Frame network error:', err);
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    }, 'image/jpeg');
  };

  const handleFrameResponse = async (data, blob) => {
    if (scanStateRef.current !== 'scanning') return;

    if (data.status === 'error' && !data.face_detected) {
      setChecklist(prev => ({ ...prev, faceDetected: false }));
      setStatus('Looking for face...');
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    // Face is detected
    setChecklist(prev => ({ ...prev, faceDetected: true }));

    // Face Quality Check: reject poor quality scans
    if (data.quality && data.quality.status === 'Poor') {
      setStatus(`Poor Face Quality (${data.quality.score}%): ${data.detail || 'Adjust position'}`);
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    const scoreStr = data.quality ? `${data.quality.score}%` : '95%';
    setStatus(`Face Quality: ${scoreStr} (Good)`);

    // Handle unrecognized faces (unregistered student)
    if (data.status === 'unknown') {
      consecutiveUnknownCount.current++;
      if (consecutiveUnknownCount.current >= 10) {
        consecutiveUnknownCount.current = 0;
        stopCamera();
        navigate('/register', { state: { error: 'Face not registered. Please register your details below.' } });
        return;
      } else {
        setStatus(`Face not recognized. Verifying registration... (${consecutiveUnknownCount.current}/10)`);
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }
    }

    // Verify liveness content
    const liveness = data.liveness;
    if (!liveness) {
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    // Anti-Spoof Protection: multi-frame variance check for static images (photo / phone screen)
    const poseRatio = liveness.pose_ratio;
    if (poseRatio !== undefined) {
      setSpoofRatios(prev => {
        const next = [...prev, poseRatio].slice(-5);
        if (next.length >= 4) {
          const maxVal = Math.max(...next);
          const minVal = Math.min(...next);
          // Standard deviation of 0 means the photo is completely flat / static
          if (maxVal - minVal < 0.00001) {
            stopCamera();
            setScanState('spoof');
            setSpoofMessage('Fake attendance attempt detected. Static photo scan pattern.');
            return next;
          }
        }
        return next;
      });
    }

    // Process face match metadata
    let matchFound = false;
    let name = '';
    let usn = '';
    let confidence = '';
    let alreadyMarked = false;
    let subjectName = '';
    let facultyName = '';

    if (data.status === 'success' && data.match) {
      consecutiveUnknownCount.current = 0;
      matchFound = true;
      name = data.match.name;
      usn = data.match.usn;
      confidence = data.match.confidence;
      alreadyMarked = data.match.already_marked;
      subjectName = data.match.subject;
      facultyName = data.match.faculty;

      setChecklist(prev => ({ ...prev, faceMatched: true }));
      setMatchedStudent({ name, usn, confidence, subject: subjectName, faculty: facultyName });

      // Duplicate Check: if marked already, stop scanning immediately
      if (alreadyMarked) {
        stopCamera();
        setScanState('duplicate');
        return;
      }
    } else {
      setChecklist(prev => ({ ...prev, faceMatched: false }));
    }

    // Liveness Challenge Verification
    let currentChallengePassed = false;
    const eyesClosed = liveness.eyes_closed;
    const pose = liveness.head_pose;
    const activeChallenge = challengeRef.current;

    if (activeChallenge === 'Turn head left') {
      if (pose === 'left') {
        currentChallengePassed = true;
        setChallengeProgress('Head turned left verified');
      } else {
        setChallengeProgress(pose === 'front' ? 'Turn your head left...' : `Pose: ${pose}`);
      }
    } else if (activeChallenge === 'Turn head right') {
      if (pose === 'right') {
        currentChallengePassed = true;
        setChallengeProgress('Head turned right verified');
      } else {
        setChallengeProgress(pose === 'front' ? 'Turn your head right...' : `Pose: ${pose}`);
      }
    } else if (activeChallenge === 'Blink once') {
      if (blinkStageRef.current === 0 && eyesClosed) {
        blinkStageRef.current = 1;
        setChallengeProgress('Eyes closed...');
      } else if (blinkStageRef.current === 1 && !eyesClosed) {
        blinkStageRef.current = 2; // blink sequence finished
        setChallengeProgress('Blink verified');
      } else if (blinkStageRef.current === 0) {
        setChallengeProgress('Please blink once...');
      }
      if (blinkStageRef.current === 2) {
        currentChallengePassed = true;
      }
    } else if (activeChallenge === 'Blink twice') {
      if (blinkStageRef.current === 0 && eyesClosed) {
        blinkStageRef.current = 1;
        setChallengeProgress('Blink 1: eyes closed...');
      } else if (blinkStageRef.current === 1 && !eyesClosed) {
        blinkStageRef.current = 2;
        setChallengeProgress('Blink 1 done. Blink again...');
      } else if (blinkStageRef.current === 2 && eyesClosed) {
        blinkStageRef.current = 3;
        setChallengeProgress('Blink 2: eyes closed...');
      } else if (blinkStageRef.current === 3 && !eyesClosed) {
        blinkStageRef.current = 4; // second blink sequence finished
        setChallengeProgress('Double blink verified');
      } else if (blinkStageRef.current === 0) {
        setChallengeProgress('Please blink twice...');
      }
      if (blinkStageRef.current === 4) {
        currentChallengePassed = true;
      }
    }

    if (currentChallengePassed) {
      challengePassedRef.current = true;
      setChecklist(prev => ({ ...prev, livenessVerified: true }));
    }

    // Final mark check
    if (challengePassedRef.current && matchFound) {
      await executeFinalMark(blob);
      return;
    }

    // Release processing lock for next frame
    isProcessingRef.current = false;
    setIsProcessing(false);
  };

  const executeFinalMark = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');
      formData.append('liveness_verified', 'true'); // Commit attendance to database

      const res = await fetch(`${API_BASE}/attendance/mark_auto`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.status === 'success') {
        stopCamera();
        setChecklist(prev => ({ ...prev, attendanceMarked: true }));
        
        // Show success screen and load detail
        setMatchedStudent({
          name: data.match.name,
          usn: data.match.usn,
          confidence: data.match.confidence,
          subject: data.match.subject,
          faculty: data.match.faculty
        });

        // Add to recent scans list
        setHistory(prev => [{
          time: new Date().toLocaleTimeString(),
          name: data.match.name,
          usn: data.match.usn,
          confidence: data.match.confidence
        }, ...prev].slice(0, 5));

        setScanState('success');
      } else {
        setStatus(data.detail || 'Finalizing error. Rescanning...');
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Final commit error:', err);
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Determine active item inside Checklist HUD
  const getActiveItem = () => {
    if (!checklist.cameraReady) return 'cameraReady';
    if (!checklist.faceDetected) return 'faceDetected';
    if (!checklist.livenessVerified) return 'livenessVerified';
    if (!checklist.faceMatched) return 'faceMatched';
    if (!checklist.attendanceMarked) return 'attendanceMarked';
    return null;
  };

  const activeItem = getActiveItem();

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 overflow-y-auto lg:overflow-hidden relative font-sans text-slate-100">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-cyan-900/10 blur-[150px]" />
      </div>

      {/* Header */}
      <header className="h-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { stopCamera(); navigate('/'); }}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <ScanFace className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight">Live Attendance Scanner</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Online
          </div>
        </div>
      </header>

      {/* Content Container */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-8 max-w-7xl w-full mx-auto z-10 overflow-y-auto lg:overflow-hidden items-stretch justify-center relative shrink-0">
        
        <AnimatePresence mode="wait">
          {/* 1. INITIALIZING OR SCANNING SCREEN */}
          {(scanState === 'scanning' || scanState === 'initializing') && (
            <motion.div 
              key="scanner-layout"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch w-full"
            >
              {/* Left Column: Camera, Timeout Bar, and Checklist HUD */}
              <div className="flex-1 flex flex-col items-center gap-6 min-w-0 justify-center">
                
                {/* Camera Container */}
                <div className="relative w-full aspect-video lg:aspect-[16/10] bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl shadow-cyan-900/10 shrink-0">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover filter contrast-110 saturate-50 animate-fade-in"
                  />
                  <canvas ref={canvasRef} className="hidden" />



                  {/* Animated Scan Line */}
                  {scanState === 'scanning' && (
                    <motion.div 
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 z-10 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                    />
                  )}

                  {/* Camera overlays */}
                  <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.02, 1], opacity: [0.6, 1, 0.6] }} 
                      transition={{ repeat: Infinity, duration: 2 }} 
                      className="absolute w-[200px] h-[200px] md:w-[260px] md:h-[260px] lg:w-[300px] lg:h-[300px]"
                    >
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-xl" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-xl" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-xl" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/80 rounded-br-xl" />
                    </motion.div>
                    <div className="w-[180px] h-[180px] md:w-[240px] md:h-[240px] lg:w-[280px] lg:h-[280px] rounded-full border border-cyan-500/10" />
                  </div>

                  {/* Top-Right Challenge Overlay */}
                  {scanState === 'scanning' && (
                    <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-xl flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      <span className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                        Challenge Challenge Active
                      </span>
                    </div>
                  )}

                  {/* Challenge display inside camera */}
                  {scanState === 'scanning' && (
                    <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-1.5">
                      <div className="px-4 py-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg animate-pulse">
                            <Activity size={16} />
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Liveness Challenge</div>
                            <div className="text-sm font-extrabold text-white flex items-center gap-2">
                              {challenge}
                              <span className="text-cyan-400 text-xs font-mono font-medium">({challengeProgress})</span>
                            </div>
                          </div>
                        </div>
                        {isProcessing && <Loader2 size={16} className="text-cyan-400 animate-spin" />}
                      </div>
                    </div>
                  )}
                </div>

                {/* Checklist HUD and Status text */}
                <div className="w-full glass-card p-5 flex flex-col gap-4">
                  {/* Status Bar */}
                  <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
                    <Activity size={18} className="text-cyan-400 animate-pulse shrink-0" />
                    <span className="text-slate-300 font-mono text-xs md:text-sm font-semibold truncate">
                      {status}
                    </span>
                  </div>

                  {/* Checklist items */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
                    {[
                      { id: 'cameraReady', label: 'Camera Ready', success: checklist.cameraReady },
                      { id: 'faceDetected', label: 'Face Detected', success: checklist.faceDetected },
                      { 
                        id: 'livenessVerified', 
                        label: challenge.includes('Blink') ? 'Blink Verified' : 'Head Turn Verified', 
                        success: checklist.livenessVerified 
                      },
                      { id: 'faceMatched', label: 'Face Matched', success: checklist.faceMatched },
                      { id: 'attendanceMarked', label: 'Attendance Marked', success: checklist.attendanceMarked }
                    ].map((item) => {
                      const isActive = activeItem === item.id;
                      return (
                        <div 
                          key={item.id} 
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                            item.success 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                              : isActive
                                ? 'bg-cyan-500/5 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                                : 'bg-slate-950/20 border-slate-800/60 text-slate-500'
                          }`}
                        >
                          {item.success ? (
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          ) : isActive ? (
                            <Loader2 size={14} className="text-cyan-400 animate-spin shrink-0" />
                          ) : (
                            <Circle size={14} className="text-slate-600 shrink-0" />
                          )}
                          <span className="text-[10px] md:text-xs font-bold tracking-tight truncate leading-tight">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Active Session Card and Collapsible Recent Scans Card */}
              <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 justify-center">
                {/* Active Session Card */}
                {activeSession && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 flex flex-col gap-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                      <BookOpen className="text-cyan-400" size={18} />
                      <h3 className="text-white font-bold text-sm uppercase tracking-wider">Active Class Session</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <FileText className="text-slate-500 shrink-0 mt-0.5" size={14} />
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Subject</div>
                          <div className="text-sm font-semibold text-white">
                            {activeSession.subject}
                          </div>
                          {activeSession.subject_code && (
                            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              {activeSession.subject_code}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <User className="text-slate-500 shrink-0 mt-0.5" size={14} />
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Faculty</div>
                          <div className="text-sm font-semibold text-white">
                            {activeSession.faculty}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="text-slate-500 shrink-0 mt-0.5" size={14} />
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Section</div>
                            <div className="text-xs font-semibold text-slate-200">
                              {activeSession.department} ({activeSession.section})
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="text-slate-500 shrink-0 mt-0.5" size={14} />
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Time Window</div>
                            <div className="text-xs font-semibold text-slate-200">
                              {activeSession.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Collapsible Recent Scans Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 flex flex-col flex-1"
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
                    <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
                      <Camera size={16} className="text-cyan-400 shrink-0" /> Recent Activity
                    </h3>
                    
                    <button 
                      onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                      className="lg:hidden text-[10px] font-bold px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 transition-colors"
                    >
                      {isHistoryCollapsed ? 'Show' : 'Hide'}
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {!isHistoryCollapsed && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden flex-1 flex flex-col"
                      >
                        <div className="max-h-[220px] lg:max-h-[360px] lg:flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1.5">
                          <AnimatePresence>
                            {history.map((h, i) => (
                              <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                key={i} 
                                className="bg-slate-950/40 border border-slate-900 hover:border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm transition-all"
                              >
                                <div>
                                  <div className="font-semibold text-xs text-white">{h.name}</div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{h.usn}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Present
                                  </span>
                                  <div className="text-[9px] text-slate-500 font-mono mt-1">{h.time}</div>
                                </div>
                              </motion.div>
                            ))}
                            {history.length === 0 && (
                              <div className="text-center text-slate-500 text-xs py-8 shrink-0">
                                No student scanned yet.
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* 2. SUCCESS VIEW */}
          {scanState === 'success' && matchedStudent && (
            <motion.div 
              key="success-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl mx-auto flex flex-col items-center justify-center p-4 self-center"
            >
              <div className="w-full bg-slate-900/60 backdrop-blur-2xl border border-emerald-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.1)] relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                
                {/* Pulsing check circle */}
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 border border-emerald-500/20"
                >
                  <CheckCircle2 size={48} />
                </motion.div>
                
                <h2 className="text-3xl font-extrabold text-white mb-1">Attendance Marked!</h2>
                <p className="text-slate-400 text-sm mb-6">Welcome Back, {matchedStudent.name}</p>
                
                {/* Info Card */}
                <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 mb-8 text-left space-y-3.5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-xs text-slate-500">Register No (USN)</span>
                    <span className="font-mono text-cyan-400 text-sm font-semibold">{matchedStudent.usn}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-xs text-slate-500">Subject / Class</span>
                    <span className="font-semibold text-white text-xs truncate max-w-[240px]">
                      {matchedStudent.subject}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-xs text-slate-500">Faculty</span>
                    <span className="text-xs text-slate-200">{matchedStudent.faculty}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Confidence Match</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {matchedStudent.confidence}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={startScan}
                    className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    Scan Next Student
                  </button>
                  
                  <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-ping" />
                    Auto-exiting to Welcome panel in <span className="text-cyan-400 font-bold">{redirectCountdown}s</span>...
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. DUPLICATE VIEW */}
          {scanState === 'duplicate' && matchedStudent && (
            <motion.div 
              key="duplicate-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl mx-auto flex flex-col items-center justify-center p-4 self-center"
            >
              <div className="w-full bg-slate-900/60 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.1)] relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-indigo-500" />
                
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-400 border border-amber-500/20"
                >
                  <AlertTriangle size={48} className="animate-pulse" />
                </motion.div>
                
                <h2 className="text-2xl font-extrabold text-white mb-1">Already Marked</h2>
                <p className="text-slate-400 text-sm mb-6">Attendance recorded previously for today.</p>
                
                <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 mb-8 text-left space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs text-slate-500">Student Name</span>
                    <span className="font-semibold text-white text-xs">{matchedStudent.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs text-slate-500">Register No (USN)</span>
                    <span className="font-mono text-cyan-400 text-xs font-semibold">{matchedStudent.usn}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Timetable Slot</span>
                    <span className="text-xs text-slate-300 font-semibold">{matchedStudent.subject}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={startScan}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all border border-slate-700"
                  >
                    Scan Another Student
                  </button>
                  
                  <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-ping" />
                    Returning Home in <span className="text-amber-400 font-bold">{redirectCountdown}s</span>...
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 4. TIMEOUT VIEW */}
          {scanState === 'timeout' && (
            <motion.div 
              key="timeout-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl mx-auto flex flex-col items-center justify-center p-4 self-center"
            >
              <div className="w-full bg-slate-900/60 backdrop-blur-2xl border border-rose-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500" />
                
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-400 border border-rose-500/20"
                >
                  <Clock size={48} className="text-rose-400" />
                </motion.div>
                
                <h2 className="text-2xl font-extrabold text-white mb-2">Face Not Recognized</h2>
                <p className="text-slate-400 text-sm mb-8">
                  Scanning timed out. Please ensure your face is well-lit, clearly visible inside the reticle, and try again.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={startScan}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    <RefreshCw size={18} className="animate-spin-slow" /> Try Again
                  </button>
                  <button 
                    onClick={() => navigate('/')}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3.5 rounded-xl transition-all"
                  >
                    Return Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 5. SPOOF / ANTI-SPOOF BLOCK VIEW */}
          {scanState === 'spoof' && (
            <motion.div 
              key="spoof-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl mx-auto flex flex-col items-center justify-center p-4 self-center"
            >
              <div className="w-full bg-slate-900/60 backdrop-blur-2xl border border-rose-500/40 rounded-3xl p-8 shadow-[0_0_60px_rgba(239,68,68,0.25)] relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600 animate-pulse" />
                
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 border border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  <ShieldAlert size={48} />
                </motion.div>
                
                <h2 className="text-2xl font-extrabold text-white mb-2">Spoofing Attempt Blocked</h2>
                <p className="text-rose-400 font-semibold text-sm mb-4">
                  {spoofMessage || 'Fake attendance attempt detected.'}
                </p>
                <p className="text-slate-400 text-xs mb-8 max-w-md mx-auto">
                  Our system flags static image presentation, screen recordings, and photos. Liveness and eye blinking verification challenges are mandatory for real-world attendance verification.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={startScan}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all"
                  >
                    Retry Verification
                  </button>
                  <button 
                    onClick={() => navigate('/')}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3.5 rounded-xl transition-all"
                  >
                    Return Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 6. GENERAL INITIALIZATION ERROR VIEW */}
          {scanState === 'error' && (
            <motion.div 
              key="error-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-xl mx-auto flex flex-col items-center justify-center p-4 self-center text-center"
            >
              <div className="w-full bg-slate-900/60 backdrop-blur-2xl border border-rose-500/20 rounded-3xl p-8 relative overflow-hidden">
                <ShieldAlert size={48} className="text-rose-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Hardware / Camera Error</h2>
                <p className="text-slate-400 text-sm mb-6">
                  {status || 'Unable to open camera stream. Please grant site permissions and refresh.'}
                </p>
                <button 
                  onClick={startScan}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl border border-slate-700 transition-all"
                >
                  Retry Camera Load
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
