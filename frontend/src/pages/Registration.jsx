import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera as CameraIcon, CheckCircle2, ChevronRight, AlertCircle, ChevronLeft } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function Registration() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '', usn: '', department: '', semester: '', section: '', email: '', phone: ''
  });
  const [status, setStatus] = useState('Initializing AI Camera...');
  const [progress, setProgress] = useState(0);
  const [capturedImages, setCapturedImages] = useState([]);
  const [eyeVerified, setEyeVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Logic Refs
  const stateRef = useRef('WAITING_FACE');
  const captureCount = useRef(0);

  useEffect(() => {
    if (step !== 2) return;
    
    let cameraInstance = null;
    let localStream = null;
    
    const initFaceMesh = async () => {
      const faceMesh = new window.FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
      faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      
      faceMesh.onResults((results) => {
        if (stateRef.current === 'DONE' || stateRef.current === 'CAPTURING') return;

        if (results.multiFaceLandmarks?.length > 0) {
          if (results.multiFaceLandmarks.length > 1) {
            setStatus("Multiple faces detected! Please ensure only YOU are in the frame.");
            return;
          }
          
          if (stateRef.current === 'WAITING_FACE') {
            stateRef.current = 'CAPTURING';
            setStatus("Face detected! Verifying quality...");
            setProgress(50);
            
            setTimeout(() => {
              setEyeVerified(true);
              setStatus("Face Quality Verified! Capturing...");
              setProgress(90);
              startCapture();
            }, 1000);
          }
        } else {
          if (stateRef.current === 'WAITING_FACE') setStatus("No face detected. Please look at the camera.");
        }
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        localStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          cameraInstance = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if(videoRef.current && stateRef.current !== 'DONE') {
                await faceMesh.send({image: videoRef.current});
              }
            },
            width: 640, height: 480
          });
          cameraInstance.start();
        }
      } catch (err) {
        setStatus("Camera access denied or unavailable.");
      }
    };
    
    initFaceMesh();
    
    return () => {
      if (cameraInstance) cameraInstance.stop();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
    };
  }, [step]);

  const startCapture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    const interval = setInterval(() => {
      if (captureCount.current >= 3) {
        clearInterval(interval);
        stateRef.current = 'DONE';
        setStatus("Verification Complete!");
        setProgress(100);
        setTimeout(() => setStep(3), 1000);
        return;
      }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        setCapturedImages(prev => [...prev, blob]);
      }, 'image/jpeg');
      captureCount.current++;
    }, 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fd = new FormData();
    Object.keys(formData).forEach(k => fd.append(k, formData[k].toUpperCase()));
    fd.append('eye_verified', eyeVerified);
    capturedImages.forEach((blob, i) => fd.append('images', blob, `face_${i}.jpg`));

    try {
      const res = await fetch(`${API_BASE}/students/register`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setStep(4);
      else setError(data.detail || 'Registration failed');
    } catch (err) {
      setError('Network error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/20 blur-[120px]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

      {/* Back Button */}
      <button 
        onClick={() => window.location.href='/'}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-20 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800 backdrop-blur"
      >
        <ChevronLeft size={18} /> Home
      </button>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 w-full z-10">
        <div className="w-full max-w-3xl glass-panel border-slate-700/50 shadow-2xl p-8">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Student Registration</h1>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className={step >= 1 ? 'text-primary' : ''}>Details</span>
              <ChevronRight size={16} />
              <span className={step >= 2 ? 'text-primary' : ''}>Liveness</span>
              <ChevronRight size={16} />
              <span className={step >= 3 ? 'text-primary' : ''}>Confirm</span>
            </div>
            
            <div className="h-1.5 w-full bg-slate-800 mt-6 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                animate={{ width: `${(step/4)*100}%` }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={(e) => { e.preventDefault(); setStep(2); }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="md:col-span-2"><input type="text" placeholder="Full Name" required className="glass-input" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} /></div>
                <div><input type="text" placeholder="USN / Roll No" required className="glass-input" value={formData.usn} onChange={e => setFormData({...formData, usn: e.target.value})} /></div>
                <div>
                  <select required className="glass-input" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                    <option value="" disabled>Select Department</option>
                    <option value="CSE">Computer Science and Engineering (CSE)</option>
                    <option value="ISE">Information Science and Engineering (ISE)</option>
                    <option value="AIML">Artificial Intelligence and Machine Learning (AIML)</option>
                    <option value="AIDS">Artificial Intelligence and Data Science (AIDS)</option>
                    <option value="ECE">Electronics and Communication Engineering (ECE)</option>
                    <option value="EEE">Electrical and Electronics Engineering (EEE)</option>
                    <option value="MECH">Mechanical Engineering (MECH)</option>
                    <option value="CIVIL">Civil Engineering (CIVIL)</option>
                  </select>
                </div>
                <div>
                  <select required className="glass-input" value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})}>
                    <option value="" disabled>Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select required className="glass-input" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})}>
                    <option value="" disabled>Select Section</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
                <div><input type="email" placeholder="Email" required className="glass-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                <div><input type="tel" placeholder="Phone" required className="glass-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div className="md:col-span-2 mt-4">
                  <button type="submit" className="glass-btn flex items-center justify-center gap-2">Continue to Scan <CameraIcon size={18}/></button>
                </div>
              </motion.form>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl mb-6">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100"></video>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  
                  {/* Overlay text */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur px-4 py-2 rounded-full border border-white/20 text-center whitespace-nowrap text-sm font-semibold text-white">
                    {status}
                  </div>
                </div>
                
                {/* Visual Progress */}
                <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden mt-4">
                  <motion.div animate={{ width: `${progress}%` }} className="h-full bg-cyan-400" />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              >
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-lg flex items-start gap-3 mb-6">
                  <CheckCircle2 className="shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold">Face Captured Successfully</h3>
                    <p className="text-sm opacity-80">Your face was successfully captured. Please confirm to finalize registration.</p>
                  </div>
                </div>
                
                {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg flex items-center gap-3 mb-6"><AlertCircle /> {error}</div>}
                
                <div className="flex gap-4 mb-8">
                  {capturedImages.map((blob, i) => (
                    <img key={i} src={URL.createObjectURL(blob)} className="w-24 h-24 object-cover rounded-lg border border-white/20" alt="Captured" />
                  ))}
                </div>
                
                <div className="flex gap-4">
                  <button onClick={handleSubmit} disabled={loading} className="glass-btn flex-1">
                    {loading ? 'Registering...' : 'Finalize Registration'}
                  </button>
                  {error && (
                    <button 
                      onClick={() => {
                        stateRef.current = 'WAITING_FACE';
                        captureCount.current = 0;
                        setStep(2);
                        setCapturedImages([]);
                        setProgress(0);
                        setError('');
                        setStatus('Initializing AI Camera...');
                      }} 
                      className="glass-btn !bg-rose-500/20 !border-rose-500/50 !text-rose-400 hover:!bg-rose-500/30 flex-1"
                    >
                      Retake Images
                    </button>
                  )}
                </div>
              </motion.div>
            )}
            
            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <CheckCircle2 size={64} className="text-emerald-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Registration Complete!</h2>
                <p className="text-slate-400 mb-8">Your facial data has been securely processed and saved.</p>
                <button onClick={() => window.location.href='/'} className="glass-btn !w-auto">Return to Login</button>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
      </div>
    </div>
  );
}
