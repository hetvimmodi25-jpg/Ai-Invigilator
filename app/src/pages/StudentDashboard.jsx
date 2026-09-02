import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { startExam, updateBaselinePhoto } from "../services/authService";
import { extractLandmarksFromImage, extractLandmarksFromVideo, compareFaceLandmarks } from "../utils/faceMatcher";
import ThemeToggle from '../components/ThemeToggle';
import MoltenMetal from '../components/MoltenMetal';
import API from '../services/api.js';

const StudentDashboard = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isFaceInFrame, setIsFaceInFrame] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [availableExams, setAvailableExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await API.get('/exam/all');
        if (res.data && res.data.success && res.data.exams.length > 0) {
          setAvailableExams(res.data.exams);
          setSelectedExam(res.data.exams[0]);
        }
      } catch (err) {
        console.error("Failed to fetch published exams:", err);
      }
    };
    fetchExams();
  }, []);

  const [hasStream, setHasStream] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Pre-Exam Identity Verification Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('IDLE'); // 'IDLE' | 'ANALYZING' | 'MATCHED' | 'MISMATCH' | 'NO_FACE' | 'NO_BASELINE'
  const [matchConfidence, setMatchConfidence] = useState(0);
  const [matchMetrics, setMatchMetrics] = useState({ geometricSimilarity: 0, vectorSimilarity: 0 });
  const [matchStatusText, setMatchStatusText] = useState('');
  const [isExamStarting, setIsExamStarting] = useState(false);
  const [isCapturingBaseline, setIsCapturingBaseline] = useState(false);

  const modalVideoRef = useRef(null);
  const verifyCanvasRef = useRef(null);
  const baselineLandmarksRef = useRef(null);
  const verifyIntervalRef = useRef(null);
  const matchedConsecutiveRef = useRef(0);

  const navigate = useNavigate();
  const { student } = useAuth();
  const currentStudent = student || JSON.parse(localStorage.getItem('student') || '{}');

  useEffect(() => {
    let active = true;
    if (isCameraOn) {
      navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
        .then(stream => {
          if (active) {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
            if (modalVideoRef.current) {
              modalVideoRef.current.srcObject = stream;
              modalVideoRef.current.play().catch(() => {});
            }
            setHasStream(true);
          }
        })
        .catch(err => {
          if (active) {
            console.error("Webcam access denied:", err);
            setHasStream(false);
          }
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (modalVideoRef.current) {
        modalVideoRef.current.srcObject = null;
      }
      setHasStream(false);
    }
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn]);

  const cameraVerified = isCameraOn && hasStream && isFaceInFrame;
  const camStatusText = !isCameraOn ? "CAMERA OFF" : (!hasStream ? "CONNECTING..." : (isFaceInFrame ? "VERIFIED" : "NOT VERIFIED"));

  useEffect(() => {
      const handleOnline = () => {
          setIsOnline(true);
      };

      const handleOffline = () => {
          setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
      };
  }, []);

  const examDetails = {
    examName: "Computer Fundamentals",
    examCode: "CS-402",
    examType: "Semester Finals",
    examDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    duration: "60 Minutes",
    totalMarks: "100"
  };

  // Micro-interaction for hardware checks simulation
  useEffect(() => {
    const checks = document.querySelectorAll('.glass-card');
    checks.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 * index);
    });
  }, []);

  // Initialize and run Face Verification when Modal opens
  useEffect(() => {
    if (!showVerifyModal) {
      if (verifyIntervalRef.current) clearInterval(verifyIntervalRef.current);
      matchedConsecutiveRef.current = 0;
      setVerifyStatus('IDLE');
      setMatchConfidence(0);
      return;
    }

    const initVerification = async () => {
      // Ensure modal video has active camera stream
      const attachModalStream = async () => {
        try {
          if (!streamRef.current || !streamRef.current.active) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
          }

          if (modalVideoRef.current && streamRef.current) {
            if (modalVideoRef.current.srcObject !== streamRef.current) {
              modalVideoRef.current.srcObject = streamRef.current;
            }
            await modalVideoRef.current.play().catch(() => {});
          }
        } catch (camErr) {
          console.error("Camera stream error in modal:", camErr);
        }
      };

      await attachModalStream();
      // Second attempt after modal DOM paint
      setTimeout(attachModalStream, 100);

      const activeStudent = JSON.parse(localStorage.getItem('student') || '{}');
      if (!activeStudent.profile_photo) {
        setVerifyStatus('NO_BASELINE');
        setMatchStatusText('No registered baseline photo found. Please capture your baseline photo.');
        return;
      }

      setVerifyStatus('ANALYZING');
      setMatchStatusText('Analyzing registered baseline face biometrics...');

      try {
        const baseRes = await extractLandmarksFromImage(activeStudent.profile_photo);
        if (!baseRes.success || !baseRes.landmarks) {
          setVerifyStatus('NO_BASELINE');
          setMatchStatusText('Unable to read facial features from baseline photo. Please retake baseline photo.');
          return;
        }

        baselineLandmarksRef.current = baseRes;
        setMatchStatusText('Comparing live camera feed with registered student profile...');

        // Start periodic comparison loop
        verifyIntervalRef.current = setInterval(async () => {
          const video = modalVideoRef.current || videoRef.current;
          if (!video) return;

          if (streamRef.current && (!video.srcObject || video.srcObject !== streamRef.current)) {
            video.srcObject = streamRef.current;
            video.play().catch(() => {});
          }

          if (video.videoWidth === 0 || video.videoHeight === 0) return;

          const liveRes = await extractLandmarksFromVideo(video);
          const canvas = verifyCanvasRef.current;

          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (liveRes.success && liveRes.landmarks) {
              // Draw face landmark mesh dots on overlay canvas
              ctx.fillStyle = '#10b981';
              liveRes.landmarks.slice(0, 60).forEach(pt => {
                const px = pt.x * canvas.width;
                const py = pt.y * canvas.height;
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
                ctx.fill();
              });

              // Draw scanline
              const scanY = (Date.now() / 10) % canvas.height;
              ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(0, scanY);
              ctx.lineTo(canvas.width, scanY);
              ctx.stroke();
            }
          }

          if (!liveRes.success) {
            setVerifyStatus('NO_FACE');
            setMatchStatusText(liveRes.error || 'Please look directly into the camera.');
            matchedConsecutiveRef.current = 0;
            return;
          }

          const comparison = compareFaceLandmarks(baselineLandmarksRef.current, liveRes, 60);
          setMatchConfidence(comparison.confidence);
          setMatchMetrics({
            geometricSimilarity: comparison.geometricSimilarity,
            vectorSimilarity: comparison.vectorSimilarity
          });

          if (comparison.isMatch) {
            matchedConsecutiveRef.current += 1;
            if (matchedConsecutiveRef.current >= 2) {
              setVerifyStatus('MATCHED');
              setMatchStatusText(`✓ Identity Verified: Match Confirmed (${comparison.confidence}%)`);
            } else {
              setVerifyStatus('ANALYZING');
              setMatchStatusText(`Verifying match stability... (${comparison.confidence}%)`);
            }
          } else {
            matchedConsecutiveRef.current = 0;
            setVerifyStatus('MISMATCH');
            setMatchStatusText(`⚠ Anti-Impersonation Warning: Face does not match registered profile (${comparison.confidence}% similarity)`);
          }
        }, 400);

      } catch (err) {
        console.error("Verification loop error:", err);
        setVerifyStatus('NO_BASELINE');
        setMatchStatusText('Face landmarker initialization failed. Check camera & network.');
      }
    };

    initVerification();

    return () => {
      if (verifyIntervalRef.current) clearInterval(verifyIntervalRef.current);
    };
  }, [showVerifyModal]);

  // Capture baseline photo inside modal if missing
  const handleCaptureBaselineInModal = async () => {
    const video = modalVideoRef.current || videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setIsCapturingBaseline(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      const activeStudent = JSON.parse(localStorage.getItem('student') || '{}');
      if (activeStudent.student_id) {
        await updateBaselinePhoto(activeStudent.student_id, dataUrl);
        activeStudent.profile_photo = dataUrl;
        localStorage.setItem('student', JSON.stringify(activeStudent));
      }

      // Re-trigger verification
      setVerifyStatus('ANALYZING');
      setShowVerifyModal(false);
      setTimeout(() => setShowVerifyModal(true), 200);
    } catch (err) {
      console.error("Failed to capture baseline photo:", err);
      alert("Failed to save baseline photo. Please try again.");
    } finally {
      setIsCapturingBaseline(false);
    }
  };

  const handleOpenVerification = () => {
    const activeStudent = JSON.parse(localStorage.getItem("student"));
    if (!activeStudent) {
      alert("Please login again.");
      navigate("/student-login");
      return;
    }
    setShowVerifyModal(true);
  };

  const handleProceedToExam = async () => {
    if (verifyStatus !== 'MATCHED') {
      alert("Please complete AI face verification before proceeding.");
      return;
    }

    setIsExamStarting(true);
    try {
      const activeStudent = JSON.parse(localStorage.getItem("student"));
      const targetExamName = selectedExam?.exam_name || examDetails?.examName || "Computer Fundamentals";

      const response = await startExam({
        student_id: activeStudent?.student_id,
        exam_name: targetExamName,
      });

      console.log("API Start Exam Response:", response);

      if (response && response.exam) {
        sessionStorage.setItem("active_exam_id", response.exam.exam_id);
        sessionStorage.setItem("active_exam_duration", response.exam.duration_minutes || 60);
      }

      // Store verification proof
      sessionStorage.setItem("exam_face_verified", JSON.stringify({
        verified: true,
        student_id: activeStudent?.student_id,
        confidence: matchConfidence,
        timestamp: Date.now()
      }));

      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (fsError) {
        console.warn("Fullscreen request failed:", fsError);
      }

      setShowVerifyModal(false);
      navigate("/exam");

    } catch (error) {
      console.error("Start Exam Error:", error);
      alert(error.response?.data?.message || error.message || "Unable to start exam.");
    } finally {
      setIsExamStarting(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col overflow-x-hidden relative">
      {/* Inline styles for custom CSS classes originally in <head> */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .dark .glass-card {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.5);
        }
        .status-pill {
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(4px);
        }
        .animate-pulse-slow {
            animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }
        .shimmer {
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            background-size: 200% 100%;
            animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
      `}} />

      {/* Background Molten Metal */}
      <MoltenMetal
        color1="#020617"
        color2="#1e3a8a"
        color3="#3b82f6"
        speed={0.35}
        scale={4}
        detail={1}
        glow={1.0}
        coreSize={0.03}
        swirl={0.2}
        fold={0}
        blackPoint={0.05}
        brightness={1.3}
        colorMode="molten"
        grain={true}
        grainIntensity={0.05}
        mouseInteraction={true}
        mouseStrength={0.3}
        opacity={1.0}
        className="fixed inset-0 pointer-events-none z-[0] overflow-hidden"
      />

      {/* Top Navigation Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 dark:bg-surface-container-highest/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm">
        <div className="flex justify-between items-center h-14 px-gutter max-w-container-max mx-auto">
          <div className="flex items-center gap-md">
            <button
              type="button"
              onClick={() => navigate('/')}
              title="Back to Home"
              className="flex items-center gap-xs px-sm py-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Home
            </button>
            <span className="font-headline-md text-headline-md text-primary">Exam Session</span>
            <div className="hidden md:flex gap-sm ml-lg">
              <div className="flex items-center gap-xs px-sm py-xs rounded-full status-pill border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-[18px]">videocam</span>
                <span className="font-label-md text-label-md text-slate-800 dark:text-slate-200">Webcam Active</span>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow"></div>
              </div>
              <div className="flex items-center gap-xs px-sm py-xs rounded-full status-pill border border-outline-variant/20">
                <div className="flex items-center gap-2">
                    {isOnline ? (
                        <>
                            <span className="material-symbols-outlined text-green-500 text-[18px]">wifi</span>
                            <span className="text-sm text-green-600 font-bold">Connected</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-red-500 text-[18px]">wifi_off</span>
                            <span className="text-sm text-red-600 font-bold">Disconnected</span>
                        </>
                    )}
                </div>
              </div>
              <div className="flex items-center gap-xs px-sm py-xs rounded-full status-pill border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                <span className="font-label-md text-label-md text-slate-800 dark:text-slate-200">AI Monitoring On</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-md">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="font-label-md text-label-md text-on-surface">{student?.full_name || "Student"}</p>
              <p className="font-mono-sm text-mono-sm text-on-surface-variant">ID: {student?.student_id}</p>
            </div>
            
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden bg-surface-container-highest cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <img 
                  className="w-full h-full object-cover" 
                  src={currentStudent?.profile_photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuDHaz_Ii_q-OfUGa_jDEkzJqK8ft7dwqMc-nLYm_3-oARH4rw2_LrLCp1fG74vCBQIFD4WGQiQAWjNQ7Jvw0-0cPNpJTff94wOZjPw7EkhIRPmUWABH-9Yewv09CjeQ2Mb0MNeaQ_2I6maKV9P_JavqKMdiTOuQ3q6yCK5xCj-L3vpffYhLIpJoaekm8DO5TEOfCNoTLLg_kBR2ZbFOKCtwg-TC5MFHkGMjMkEBgB6iFKtJQOsiKATlPzwdZjBov9ivO3dzLyrO4VA"} 
                  alt="Student portrait"
                />
              </div>
              
              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute top-12 left-0 w-80 glass-card rounded-xl shadow-lg border border-outline-variant/30 p-md z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="flex flex-col gap-xs mb-md border-b border-outline-variant/20 pb-md">
                  <h3 className="font-title-md text-title-md text-slate-900">{student?.full_name || "Student"}</h3>
                  <p className="font-body-sm text-body-sm text-slate-600">{student?.email || "student@university.edu"}</p>
                </div>
                <div className="flex flex-col gap-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">Student ID</span>
                    <span className="font-mono-sm text-mono-sm text-slate-800 font-bold">{student?.student_id || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">Enrollment No</span>
                    <span className="font-mono-sm text-mono-sm text-slate-800 font-bold">{student?.enrollment_no || "2026001"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">Course</span>
                    <span className="font-body-sm text-body-sm text-slate-800 font-bold">{student?.course || "B.Tech"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">Semester</span>
                    <span className="font-body-sm text-body-sm text-slate-800 font-bold">{student?.semester || "8"}</span>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 mt-14 py-xl px-gutter max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-lg relative z-10">
        {/* Left Column: Pre-exam Checks & Instructions */}
        <div className="lg:col-span-7 space-y-lg">
          {/* Instructions Panel */}
          <section className="glass-card rounded-xl p-lg shadow-sm">
            <h2 className="font-headline-md text-headline-md text-primary mb-md flex items-center gap-sm">
              <span className="material-symbols-outlined">description</span>
              Exam Instructions
            </h2>
            <div className="space-y-sm text-slate-700 font-body-lg">
              <p className="font-bold text-slate-900">Please read carefully before starting the session:</p>
              <ul className="list-disc list-inside space-y-xs ml-base text-slate-700">
                <li>Maintain a clear view of your face in the camera at all times.</li>
                <li>Do not leave the browser window or use external applications.</li>
                <li>Ensure your room is well-lit and noise-free.</li>
                <li>The AI system will flag suspicious head movements or external voices.</li>
                <li>You have 10 minutes to complete the pre-checks after logging in.</li>
              </ul>
              <div className="mt-lg p-md rounded-lg bg-primary/10 border border-primary/20">
                <p className="font-label-md text-label-md text-primary uppercase mb-xs tracking-wider font-bold">Integrity Statement</p>
                <p className="text-slate-800 text-body-md italic font-medium">"I hereby confirm that I will complete this examination independently and without unauthorized assistance."</p>
              </div>
            </div>
          </section>

          {/* Pre-exam Hardware Checks (Bento Style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {/* Camera Test */}
            <div className="glass-card rounded-xl p-md flex flex-col gap-sm overflow-hidden group">
              <div className="flex justify-between items-start">
                <button 
                  type="button"
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className={`material-symbols-outlined p-xs rounded-lg transition-colors focus:outline-none cursor-pointer ${isCameraOn ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-red-600 bg-red-100 hover:bg-red-200'}`}
                >
                  {isCameraOn ? 'videocam' : 'videocam_off'}
                </button>
                <span className={`font-label-md text-label-md px-xs py-[2px] rounded uppercase font-bold transition-colors ${cameraVerified ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                  {camStatusText}
                </span>
              </div>
              <div>
                <h3 className="font-title-lg text-title-lg text-slate-900">Camera Check</h3>
                <p className="font-body-md text-body-md text-slate-600">Face detection active. High resolution feed.</p>
              </div>
              <div 
                className="aspect-video bg-black rounded-lg relative overflow-hidden mt-base group-hover:ring-2 ring-primary/50 transition-all cursor-pointer"
                onClick={() => setIsFaceInFrame(!isFaceInFrame)}
                title="Click to simulate face entering/leaving the frame"
              >
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted
                  className={`w-full h-full object-cover transition-opacity ${hasStream ? 'opacity-80' : 'opacity-0'}`} 
                />
                <div className={`absolute inset-0 flex items-center justify-center transition-colors pointer-events-none ${isFaceInFrame ? 'border-primary/60' : 'border-red-500/60'}`}>
                  <div className={`w-24 h-24 border-2 rounded-full animate-pulse transition-colors ${isFaceInFrame ? 'border-primary/60' : 'border-red-500/80 bg-red-500/20'}`}></div>
                </div>
                {!isFaceInFrame && hasStream && (
                   <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold pointer-events-none">Face Out of Frame</div>
                )}
              </div>
            </div>

            {/* Microphone Test */}
            <div className="glass-card rounded-xl p-md flex flex-col justify-between overflow-hidden">
              <div className="flex justify-between items-start">
                <button 
                  type="button"
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`material-symbols-outlined p-xs rounded-lg transition-colors focus:outline-none cursor-pointer ${isMicOn ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-red-600 bg-red-100 hover:bg-red-200'}`}
                >
                  {isMicOn ? 'mic' : 'mic_off'}
                </button>
                <span className={`font-label-md text-label-md px-xs py-[2px] rounded uppercase font-bold transition-colors ${isMicOn ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                  {isMicOn ? 'VERIFIED' : 'NOT VERIFIED'}
                </span>
              </div>
              <div className="py-md">
                <h3 className="font-title-lg text-title-lg text-slate-900">Microphone Check</h3>
                <p className="font-body-md text-body-md text-slate-600">Audio levels normal. Noise cancellation enabled.</p>
              </div>
              <div className="h-16 flex items-end gap-[2px] px-sm bg-slate-100 rounded-lg">
                <div className="flex-1 bg-primary/40 rounded-t-sm" style={{ height: "30%" }}></div>
                <div className="flex-1 bg-primary/60 rounded-t-sm" style={{ height: "45%" }}></div>
                <div className="flex-1 bg-primary/80 rounded-t-sm" style={{ height: "70%" }}></div>
                <div className="flex-1 bg-primary/40 rounded-t-sm" style={{ height: "20%" }}></div>
                <div className="flex-1 bg-primary/60 rounded-t-sm" style={{ height: "55%" }}></div>
                <div className="flex-1 bg-primary/80 rounded-t-sm" style={{ height: "90%" }}></div>
                <div className="flex-1 bg-primary/40 rounded-t-sm" style={{ height: "40%" }}></div>
                <div className="flex-1 bg-primary/60 rounded-t-sm" style={{ height: "25%" }}></div>
                <div className="flex-1 bg-primary/80 rounded-t-sm" style={{ height: "60%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Exam Detail & Start Button */}
        <div className="lg:col-span-5 space-y-lg">
          {/* Upcoming Exam Card */}
          <section className="glass-card rounded-xl p-lg shadow-md relative overflow-hidden border-primary/20">
            <div className="absolute top-0 right-0 p-md">
              <span className="material-symbols-outlined text-primary opacity-20 text-[80px] rotate-12">school</span>
            </div>
            <div className="relative z-10">
              <span className="font-label-md text-label-md text-primary-container bg-primary px-sm py-xs rounded-full uppercase tracking-tighter">Live Session</span>
              
              {/* Select Available Published Exam */}
              {availableExams.length > 0 ? (
                <div className="mt-md mb-xs">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-xs">Select Published Examination</label>
                  <select
                    value={selectedExam?.exam_id || ''}
                    onChange={(e) => {
                      const found = availableExams.find((ex) => ex.exam_id === Number(e.target.value));
                      if (found) setSelectedExam(found);
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-primary/40 rounded-xl p-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  >
                    {availableExams.map((ex) => (
                      <option key={ex.exam_id} value={ex.exam_id}>
                        {ex.exam_name} ({ex.question_count || 0} Questions, {ex.duration_minutes || 60} Mins)
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <h1 className="font-headline-lg text-headline-lg text-slate-900 dark:text-white mt-sm">
                {selectedExam?.exam_name || examDetails.examName}
              </h1>     
              <p className="font-body-lg text-body-lg text-slate-600 dark:text-slate-300 mt-xs font-medium">
                {selectedExam?.subject || examDetails.examCode} | {examDetails.examType}
              </p>
              <div className="mt-xl space-y-md">
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">calendar_today</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-slate-500 uppercase font-bold">Exam Date</p>
                    <p className="font-title-lg text-title-lg text-slate-900 dark:text-white">
                      {examDetails.examDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-slate-500 uppercase font-bold">Duration</p>
                    <p className="font-title-lg text-title-lg text-slate-900 dark:text-white">
                      {selectedExam?.duration_minutes ? `${selectedExam.duration_minutes} Minutes` : examDetails.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-slate-500 uppercase font-bold">Total Marks</p>
                    <p className="font-title-lg text-title-lg text-slate-900 dark:text-white">
                      {selectedExam?.total_marks || examDetails.totalMarks} Marks
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* AI Status & System Health */}
          <section className="glass-card rounded-xl p-lg">
            <h3 className="font-title-lg text-title-lg mb-md text-slate-900">System Readiness</h3>
            <div className="space-y-sm">
              <div className="flex justify-between items-center p-sm rounded-lg hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-green-600">lock</span>
                  <span className="font-body-md text-body-md text-slate-700 font-medium">Environment Lock</span>
                </div>
                <span className="font-mono-sm text-mono-sm text-green-700 font-bold uppercase">Ready</span>
              </div>
              <div className="flex justify-between items-center p-sm rounded-lg hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-green-600">security</span>
                  <span className="font-body-md text-body-md text-slate-700 font-medium">Proctor AI V4.2</span>
                </div>
                <span className="font-mono-sm text-mono-sm text-green-700 font-bold uppercase">Active</span>
              </div>
              <div className="flex justify-between items-center p-sm rounded-lg hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-green-600">router</span>
                  <span className="font-body-md text-body-md text-slate-700 font-medium">Connection Latency</span>
                </div>
                <span className="font-mono-sm text-mono-sm text-green-700 font-bold uppercase">14ms</span>
              </div>
            </div>
          </section>

          {/* Start Button */}
          <div className="pt-md relative z-10">
            <button 
              className="w-full py-lg rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-headline-md text-headline-md shadow-lg shadow-green-500/20 flex items-center justify-center gap-md hover:brightness-110 active:scale-95 transition-all group overflow-hidden relative cursor-pointer" 
              onClick={handleOpenVerification}
            >
              <span className="relative z-10 flex items-center gap-sm">
                <span className="material-symbols-outlined">verified_user</span>
                Verify Identity & Start Exam
              </span>
              <span className="material-symbols-outlined relative z-10 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            <p className="text-center font-label-md text-label-md text-slate-300 mt-sm bg-black/30 backdrop-blur rounded-full px-4 py-1 mx-auto max-w-max">
              AI Face Verification required prior to question access.
            </p>
          </div>
        </div>
      </main>

      {/* Pre-Exam Identity Verification Modal (Anti-Impersonation) */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-4xl rounded-3xl p-lg md:p-xl shadow-2xl border border-primary/30 relative text-slate-900 dark:text-white my-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-lg border-b border-slate-200 dark:border-slate-700 pb-md">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined !text-[28px]">face_unlock</span>
                </div>
                <div>
                  <div className="flex items-center gap-xs">
                    <span className="text-xs uppercase tracking-wider font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Step 1: Anti-Impersonation Gate
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    Pre-Exam Identity Verification
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    AI biometric verification matching live camera feed against registered baseline photo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[28px]">close</span>
              </button>
            </div>

            {/* Verification Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg items-stretch">
              
              {/* Left Column: Registered Student Baseline */}
              <div className="bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl p-md flex flex-col justify-between border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="flex justify-between items-center mb-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Registered Baseline Profile
                    </span>
                    <span className="text-[11px] font-bold text-green-700 bg-green-100 dark:bg-green-950/60 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined !text-[14px]">verified</span>
                      On Record
                    </span>
                  </div>

                  {/* Profile Photo Display */}
                  <div className="aspect-[4/3] w-full max-w-[280px] mx-auto rounded-xl overflow-hidden bg-black/20 border-2 border-primary/40 relative shadow-md">
                    {currentStudent?.profile_photo ? (
                      <img
                        src={currentStudent.profile_photo}
                        alt="Registered baseline"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-md text-center">
                        <span className="material-symbols-outlined !text-[48px] mb-xs">no_photography</span>
                        <p className="text-xs">No registered baseline photo found.</p>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md rounded-lg py-1 px-2 text-center text-white text-[11px] font-mono">
                      Baseline Ref ID: #{currentStudent?.student_id || 'N/A'}
                    </div>
                  </div>

                  {/* Student Details Card */}
                  <div className="mt-md space-y-1 bg-white dark:bg-slate-900 rounded-xl p-sm text-xs border border-slate-200 dark:border-slate-700/60">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Student Name:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{currentStudent?.full_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Enrollment No:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{currentStudent?.enrollment_no || "2026001"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Course / Sem:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{currentStudent?.course || "B.Tech"} - Sem {currentStudent?.semester || "8"}</span>
                    </div>
                  </div>
                </div>

                {!currentStudent?.profile_photo && (
                  <div className="mt-md pt-sm border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={handleCaptureBaselineInModal}
                      disabled={isCapturingBaseline}
                      className="w-full py-sm px-md bg-primary text-white text-xs font-bold rounded-xl shadow hover:bg-primary/90 flex items-center justify-center gap-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined !text-[16px]">photo_camera</span>
                      {isCapturingBaseline ? "Saving Baseline..." : "Capture Baseline Photo Now"}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Live Camera Biometric Match Feed */}
              <div className="bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl p-md flex flex-col justify-between border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="flex justify-between items-center mb-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Live AI Biometric Scanner
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      verifyStatus === 'MATCHED'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
                        : verifyStatus === 'MISMATCH'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                      {verifyStatus === 'MATCHED' ? 'MATCHED' : verifyStatus === 'MISMATCH' ? 'MISMATCH' : 'SCANNING'}
                    </span>
                  </div>

                  {/* Video & Canvas Overlay */}
                  <div className="aspect-[4/3] w-full max-w-[280px] mx-auto rounded-xl overflow-hidden bg-black relative shadow-md border-2 border-slate-700">
                    <video
                      ref={modalVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas
                      ref={verifyCanvasRef}
                      width={640}
                      height={480}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                    {/* Oval Target Frame */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-36 h-48 border-2 rounded-[50%] transition-colors duration-300 ${
                        verifyStatus === 'MATCHED'
                          ? 'border-green-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                          : verifyStatus === 'MISMATCH'
                          ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                          : 'border-primary/70 animate-pulse'
                      }`}></div>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                      FPS: 30 | AI Vision V4
                    </div>
                  </div>

                  {/* Live Match Metrics */}
                  <div className="mt-md bg-white dark:bg-slate-900 rounded-xl p-sm text-xs border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Biometric Match Confidence</span>
                        <span className={`font-mono font-bold text-sm ${
                          matchConfidence >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                        }`}>
                          {matchConfidence}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            matchConfidence >= 70
                              ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                              : 'bg-gradient-to-r from-red-500 to-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, matchConfidence))}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span>Geometry Ratio: </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{matchMetrics.geometricSimilarity}%</span>
                      </div>
                      <div>
                        <span>Mesh Landmark: </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{matchMetrics.vectorSimilarity}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Impersonation Alert Banner */}
            <div className={`mt-lg p-md rounded-2xl border flex items-center gap-md ${
              verifyStatus === 'MATCHED'
                ? 'bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-300'
                : verifyStatus === 'MISMATCH'
                ? 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
                : verifyStatus === 'NO_BASELINE'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            }`}>
              <span className={`material-symbols-outlined !text-[32px] shrink-0 ${
                verifyStatus === 'MATCHED'
                  ? 'text-green-600'
                  : verifyStatus === 'MISMATCH'
                  ? 'text-red-600'
                  : 'text-amber-600'
              }`}>
                {verifyStatus === 'MATCHED' ? 'check_circle' : verifyStatus === 'MISMATCH' ? 'gpp_bad' : 'shield'}
              </span>
              <div className="flex-1 text-sm">
                <p className="font-bold">
                  {verifyStatus === 'MATCHED'
                    ? 'Identity Confirmed — Candidate Verified'
                    : verifyStatus === 'MISMATCH'
                    ? 'Anti-Impersonation Warning — Face Mismatch'
                    : verifyStatus === 'NO_BASELINE'
                    ? 'Baseline Registration Required'
                    : 'AI Scanning In Progress...'}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {matchStatusText || "Please keep your head centered and look steadily at the screen."}
                </p>
              </div>
            </div>

            {/* Modal Action Controls */}
            <div className="mt-lg flex flex-col sm:flex-row gap-md justify-end items-center">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="w-full sm:w-auto px-lg py-md rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProceedToExam}
                disabled={verifyStatus !== 'MATCHED' || isExamStarting}
                className={`w-full sm:w-auto px-xl py-md rounded-xl font-bold text-sm flex items-center justify-center gap-sm transition-all cursor-pointer shadow-lg ${
                  verifyStatus === 'MATCHED'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:brightness-110 shadow-green-500/30 scale-100 hover:scale-[1.02]'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 opacity-60 cursor-not-allowed'
                }`}
              >
                {isExamStarting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Launching Exam...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">lock_open</span>
                    Unlock & Proceed to Exam Questions
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative w-full py-xl mt-auto border-t border-outline-variant/30 bg-surface-container-lowest dark:bg-surface-dim z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter gap-lg max-w-container-max mx-auto">
          <div className="flex items-center gap-sm">
            <span onClick={() => navigate('/')} className="font-title-lg text-title-lg font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">AI-Invigilator</span>
            <span className="w-1 h-1 rounded-full bg-outline"></span>
            <span className="font-body-md text-body-md text-on-surface-variant">Secure Session</span>
          </div>
          <div className="flex flex-wrap justify-center gap-lg">
            <a className="text-on-surface-variant hover:text-primary transition-colors font-body-md" href="#">Privacy Policy</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors font-body-md" href="#">Terms of Service</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors font-body-md" href="#">Help Center</a>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">© 2026 Secure. Objective. Sophisticated.</p>
        </div>
      </footer>
    </div>
  );
};

export default StudentDashboard;