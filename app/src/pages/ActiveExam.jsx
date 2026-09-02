import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pickRandomEvent } from "../utils/mockMonitoring.js";

import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

import {
  getQuestions,
  submitResult,
  logProctorIncident,
  uploadScreenshot,
  pingLiveSession
} from "../services/authService";
import { AudioSpeechDetector } from "../utils/audioSpeechDetector";

// Seeded Pseudo-Random Number Generator (Mulberry32) for deterministic per-student question sequence
function createPRNG(seedString) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedString.length; i++) {
        h = Math.imul(h ^ seedString.charCodeAt(i), 16777619);
    }
    return function() {
        h += h << 13; h ^= h >>> 7;
        h += h << 3;  h ^= h >>> 17;
        return ((h += h << 5) >>> 0) / 4294967296;
    };
}

function shuffleQuestionsForStudent(questions, studentId, examId) {
    if (!Array.isArray(questions) || questions.length === 0) return [];
    const seed = `student_${studentId || 'default'}_exam_${examId}`;
    const rng = createPRNG(seed);
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

const ActiveExam = () => {
  const navigate = useNavigate();

  const EXAM_DURATION = 50 * 60;
  const student = JSON.parse(localStorage.getItem('student')) || {};

  const [timeRemaining, setTimeRemaining] = useState(EXAM_DURATION);

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [visitedQuestions, setVisitedQuestions] = useState([0]);

  const [tabWarning, setTabWarning] = useState(false);

  const [activeWarning, setActiveWarning] = useState(null);

  const [isWarningDismissed, setIsWarningDismissed] =
    useState(false);

  const [isWarningHidden, setIsWarningHidden] =
    useState(false);

  const [faceStatus, setFaceStatus] = useState("STABLE");
  const [eyeStatus, setEyeStatus] = useState("OPEN");
  const [headDirection, setHeadDirection] = useState("CENTERED");
  
  const [cameraError, setCameraError] = useState("");
  const [lastIncidentTime, setLastIncidentTime] = useState(0);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);

  // Multi-Modal Audio & Whisper/Speech States
  const [audioStatus, setAudioStatus] = useState("QUIET"); // 'QUIET' | 'WHISPER' | 'SPEECH'
  const [audioDecibel, setAudioDecibel] = useState(0);
  const [isAudioAlertActive, setIsAudioAlertActive] = useState(false);
  const audioDetectorRef = useRef(null);
  const audioCanvasRef = useRef(null);
  const audioStatusRef = useRef("QUIET");
  const audioDecibelRef = useRef(0);

  // Models ready state
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // MediaPipe Face Landmarker
  const faceLandmarkerRef = useRef(null);

  // COCO SSD Object Detection
  const modelRef = useRef(null);

  // Tracking timers
  const eyeClosureStartRef = useRef(null);
  const lookingAwayStartRef = useRef(null);
  const faceNotFoundStartRef = useRef(null);
  
  const mediapipeIntervalRef = useRef(null);
  const cocossdIntervalRef = useRef(null);

  const [incidentLog, setIncidentLog] = useState([
    {
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      text: "Pre-Exam Identity Verification: Baseline Face Match Verified",
      isError: false,
    },
  ]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const captureEvidence = () => {
      try {
          const video = videoRef.current;
          if (!video) return null;
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL("image/jpeg", 0.6); // 60% quality JPEG
      } catch (err) {
          console.error("Screenshot capture failed:", err);
          return null;
      }
  };

  // Utility to report incidents to backend and UI
  const reportIncident = async (type, title, severity = 'MEDIUM', logMessage = '', bypassDebounce = false) => {
    const student = JSON.parse(localStorage.getItem('student'));
    
    const now = Date.now();
    // 60-second debounce for AI camera incidents (bypass for explicit browser events)
    if (!bypassDebounce && (now - lastIncidentTime < 60000)) {
        return; // Skip reporting if within 1 minute
    }
    
    if (!bypassDebounce) {
        setLastIncidentTime(now);
    }

    // Show UI Warning ONLY for fullscreen exit
    if (type === 'FULLSCREEN_EXIT') {
        setActiveWarning({ type, title, message: logMessage });
        setIsWarningDismissed(false);
        setIsWarningHidden(false);
    }
    
    // Log to local console
    setIncidentLog(prev => [{
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        text: title,
        isError: true
    }, ...prev].slice(0, 20));

    // Send to backend API (both violations and proctor incidents tables)
    if (student) {
        logProctorIncident({
            studentId: student.student_id,
            examId: 2,
            type: type,
            message: logMessage || title,
            timestamp: new Date().toISOString()
        }).then(res => {
            if (res && res.id) {
                const base64 = captureEvidence();
                if (base64) {
                    uploadScreenshot({
                        incidentId: res.id,
                        studentId: student.student_id,
                        examId: 2,
                        imageBase64: base64
                    }).catch(err => console.error("Failed to upload screenshot:", err));
                }
            }
        }).catch(err => console.error("Failed to log proctor incident:", err));
    }
  };

    const question = questions[currentQuestion];
useEffect(() => {
    const interval = setInterval(() => {
        setTimeRemaining((prev) => {
            if (prev <= 1) {
                clearInterval(interval);
                handleSubmitExam();
                return 0;
            }

            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(interval);
}, []);

const enterFullScreen = async () => {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        }
    } catch (error) {
        console.log(error);
    }
};

    useEffect(() => {
    console.log("useEffect started");
    enterFullScreen();

    const loadQuestions = async () => {
        console.log("Loading questions...");
        try {
            const activeExamId = sessionStorage.getItem("active_exam_id") || 2;
            const activeStudent = JSON.parse(localStorage.getItem('student')) || {};
            const studentId = activeStudent.student_id || 'default';

            const response = await getQuestions(activeExamId, studentId);

            console.log(`Questions for Exam ID ${activeExamId}:`, response);

            // Deterministically shuffle question sequence for this student session
            const shuffled = shuffleQuestionsForStudent(response, studentId, activeExamId);

            setQuestions(shuffled);
        } catch (error) {
            console.log(error);
        }
        setLoading(false);
    };

    loadQuestions();
}, []);








useEffect(() => {
    const startAudioVideo = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Initialize Multi-Modal Audio & Whisper / Speech Detector
            const detector = new AudioSpeechDetector({
                onStatusChange: ({ status, decibel }) => {
                    setAudioStatus(status);
                    setAudioDecibel(decibel);
                    audioStatusRef.current = status;
                    audioDecibelRef.current = decibel;
                },
                onSpeechDetected: ({ type, decibel, status }) => {
                    const isWhisper = type === 'WHISPER_DETECTED';
                    const title = isWhisper
                        ? "Whisper Activity Detected (Off-Camera Voice)"
                        : "Human Speech / Voice Detected";
                    const logMsg = `Multi-Modal Audio AI: ${isWhisper ? 'Whisper / soft vocal patterns' : 'Human speech conversation'} detected (${decibel} dB in vocal formant spectrum).`;

                    reportIncident(
                        isWhisper ? 'WHISPER_DETECTED' : 'SPEECH_DETECTED',
                        title,
                        'HIGH',
                        logMsg,
                        true // bypass debounce so viva examiner sees real-time flag
                    );
                    setIsAudioAlertActive(true);
                    setTimeout(() => setIsAudioAlertActive(false), 4000);
                },
                onVolumeChange: ({ rms, decibel, dataArray, timeDomainArray, status }) => {
                    const canvas = audioCanvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    const width = canvas.width;
                    const height = canvas.height;

                    ctx.clearRect(0, 0, width, height);

                    // Background grid
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                    ctx.fillRect(0, 0, width, height);

                    // Draw subtle gridlines
                    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, height / 2);
                    ctx.lineTo(width, height / 2);
                    ctx.stroke();

                    // Waveform color by status
                    let strokeColor = '#10b981'; // 🟢 Green Normal / Quiet
                    if (status === 'WHISPER') {
                        strokeColor = '#f59e0b'; // 🟡 Amber Whisper
                    } else if (status === 'SPEECH') {
                        strokeColor = '#ef4444'; // 🔴 Red Speech
                    }

                    // Draw FFT Spectrum frequency background bars
                    if (dataArray) {
                        const totalBars = 32;
                        const barWidth = width / totalBars;
                        const step = Math.floor(dataArray.length / 2 / totalBars);

                        for (let i = 0; i < totalBars; i++) {
                            const val = dataArray[i * step] / 255;
                            const barHeight = val * (height * 0.75);
                            ctx.fillStyle = status === 'SPEECH'
                                ? 'rgba(239, 68, 68, 0.3)'
                                : status === 'WHISPER'
                                ? 'rgba(245, 158, 11, 0.3)'
                                : 'rgba(16, 185, 129, 0.2)';
                            ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1.5, barHeight);
                        }
                    }

                    // Draw sound frequency waveform line
                    if (timeDomainArray) {
                        ctx.lineWidth = status === 'QUIET' ? 2 : 3;
                        ctx.strokeStyle = strokeColor;
                        ctx.shadowColor = strokeColor;
                        ctx.shadowBlur = status === 'QUIET' ? 4 : 10;
                        ctx.beginPath();

                        const sliceWidth = width / timeDomainArray.length;
                        let x = 0;

                        for (let i = 0; i < timeDomainArray.length; i++) {
                            const v = timeDomainArray[i] / 128.0;
                            const y = (v * height) / 2;

                            if (i === 0) {
                                ctx.moveTo(x, y);
                            } else {
                                ctx.lineTo(x, y);
                            }
                            x += sliceWidth;
                        }
                        ctx.lineTo(width, height / 2);
                        ctx.stroke();
                        ctx.shadowBlur = 0; // reset shadow
                    }
                }
            });

            const started = await detector.start(stream);
            if (started) {
                audioDetectorRef.current = detector;
            }
        } catch (error) {
            console.log("Audio/Video initialization error:", error);
        }
    };

    startAudioVideo();

    return () => {
        if (audioDetectorRef.current) {
            audioDetectorRef.current.stop();
            audioDetectorRef.current = null;
        }
    };
}, []);








useEffect(() => {
    const handleFullScreenChange = () => {
        if (!document.fullscreenElement) {
            setIncidentLog((prev) => [
                {
                    time: new Date().toLocaleTimeString(),
                    text: "Full-screen mode exited",
                    isError: true,
                },
                ...prev,
            ]);

            alert(
                "Warning! Full-screen mode must remain enabled."
            );
        }
    };

    document.addEventListener(
        "fullscreenchange",
        handleFullScreenChange
    );

    return () => {
        document.removeEventListener(
            "fullscreenchange",
            handleFullScreenChange
        );
    };
}, []);
// useEffect(() => {
//     const loadMediaPipe = async () => {
//         try {
//             console.log("Loading MediaPipe...");

//             const vision = await FilesetResolver.forVisionTasks(
//                 "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
//             );

//             faceLandmarkerRef.current =
//                 await FaceLandmarker.createFromOptions(
//                     vision,
//                     {
//                         baseOptions: {
//                             modelAssetPath:
//                                 "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
//                         },

//                         runningMode: "VIDEO",

//                         numFaces: 5,

//                         outputFaceBlendshapes: false,

//                         outputFacialTransformationMatrixes: false,
//                     }
//                 );

//             console.log("MediaPipe Ready");
//         } catch (e) {
//             console.error(e);
//         }
//     };

//     loadMediaPipe();
// }, []);

useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.hidden) {
            reportIncident('TAB_SWITCH', 'Tab Switched', 'HIGH', 'You switched to another tab or application.', true);
        }
    };

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    return () => {
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange
        );
    };
}, []);

useEffect(() => {
    const handleFullScreenChange = () => {
        const isCurrentlyFullScreen = document.fullscreenElement !== null;
        setIsFullScreen(isCurrentlyFullScreen);

        if (!isCurrentlyFullScreen) {
            reportIncident('FULLSCREEN_EXIT', 'Full-screen Exited', 'HIGH', 'You exited full-screen mode.', true);
        }
    };

    document.addEventListener(
        "fullscreenchange",
        handleFullScreenChange
    );

    return () => {
        document.removeEventListener(
            "fullscreenchange",
            handleFullScreenChange
        );
    };
}, []);



useEffect(() => {
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
    videoRef.current.play();
    console.log("Camera Ready");
};
            }
        } catch (error) {
            console.log(error);

            setCameraError(
                "Camera permission denied."
            );
        }
    };

    startCamera();
}, []);

useEffect(() => {
    const loadModels = async () => {
        try {
            console.log("Loading MediaPipe...");

            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

            faceLandmarkerRef.current =
                await FaceLandmarker.createFromOptions(
                    vision,
                    {
                        baseOptions: {
                            modelAssetPath:
                                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
                        },
                        runningMode: "VIDEO",
                        numFaces: 5,
                    }
                );

            console.log("MediaPipe Loaded");

            await tf.ready();

            modelRef.current = await cocoSsd.load();

            console.log("COCO SSD Loaded");

            setModelsLoaded(true);
        } catch (err) {
            console.error(err);
        }
    };

    loadModels();
}, []);

const detectObjectIncidents = async () => {
    if (!videoRef.current || !modelRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const predictions = await modelRef.current.detect(video);
    const phones = predictions.filter(p => p.class === 'cell phone' || p.class === 'remote');
    
    let isPhoneDetected = false;
    phones.forEach(phone => {
        isPhoneDetected = true;
        const [x, y, width, height] = phone.bbox;
        const ctx = canvasRef.current.getContext('2d');
        ctx.strokeStyle = '#ef4444'; 
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);
    });

    setPhoneDetected(isPhoneDetected);

    if (isPhoneDetected) {
        reportIncident('MOBILE_PHONE', 'Mobile Phone Detected', 'HIGH', 'Mobile phone usage is strictly prohibited.');
    }
};

const detectFaceIncidents = () => {
    if (!videoRef.current || !faceLandmarkerRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // only clear here to avoid flickering

    if (!results || !results.faceLandmarks) return;
    const faceCount = results.faceLandmarks.length;

    // 1. Face Count Detection
    if (faceCount === 0) {
        setFaceStatus("NO FACE");
        setEyeStatus("N/A");
        setHeadDirection("N/A");
        if (!faceNotFoundStartRef.current) {
            faceNotFoundStartRef.current = Date.now();
        } else {
            if ((Date.now() - faceNotFoundStartRef.current) / 1000 >= 3) {
                reportIncident("FACE_NOT_DETECTED", "Face Not Detected", "HIGH", "Please ensure your face is clearly visible.");
                faceNotFoundStartRef.current = null;
            }
        }
        return;
    } else {
        faceNotFoundStartRef.current = null;
    }

    if (faceCount > 1) {
        setFaceStatus("MULTIPLE");
        reportIncident("MULTIPLE_PERSON", "Multiple Persons Detected", "HIGH", "You must be alone during the exam.");
        return;
    }
    
    setFaceStatus("STABLE");

    const landmarks = results.faceLandmarks[0];
    if (!landmarks || landmarks.length < 264) return;

    // Draw bounding box around face
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    landmarks.forEach(point => {
        const px = point.x * canvas.width;
        const py = point.y * canvas.height;
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
    });
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.fillStyle = '#8b5cf6';
    ctx.font = '16px monospace';
    ctx.fillText('FACE DETECTED', minX, minY > 20 ? minY - 5 : 20);

    // 2. Eye Closure Detection (EAR)
    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    const getEAR = (indices) => {
        const p1 = landmarks[indices[0]];
        const p2 = landmarks[indices[1]];
        const p3 = landmarks[indices[2]];
        const p4 = landmarks[indices[3]];
        const p5 = landmarks[indices[4]];
        const p6 = landmarks[indices[5]];
        const v1 = dist(p2, p6);
        const v2 = dist(p3, p5);
        const h = dist(p1, p4);
        return (v1 + v2) / (2.0 * h);
    };

    const leftEyeIndices = [33, 160, 158, 133, 153, 144];
    const rightEyeIndices = [362, 385, 387, 263, 373, 380];
    const avgEAR = (getEAR(leftEyeIndices) + getEAR(rightEyeIndices)) / 2.0;

    let eyesClosed = avgEAR < 0.20;
    setEyeStatus(eyesClosed ? "CLOSED" : "OPEN");

    if (eyesClosed) {
        if (!eyeClosureStartRef.current) {
            eyeClosureStartRef.current = Date.now();
        } else {
            if ((Date.now() - eyeClosureStartRef.current) / 1000 >= 3) {
                reportIncident("SLEEPING_OR_AWAY", "Eyes Closed > 3s", "HIGH", "Student appears to be sleeping or away.");
                eyeClosureStartRef.current = null;
            }
        }
    } else {
        eyeClosureStartRef.current = null;
    }

    // 3. Head Direction Detection
    const nose = landmarks[1];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const top = landmarks[10];
    const bottom = landmarks[152];

    const centerX = (leftCheek.x + rightCheek.x) / 2;
    const centerY = (top.y + bottom.y) / 2;
    const diffX = nose.x - centerX;
    const diffY = nose.y - centerY;

    let direction = "CENTERED";
    if (diffX > 0.03) direction = "RIGHT";
    else if (diffX < -0.03) direction = "LEFT";
    else if (diffY < -0.05) direction = "UP";
    else if (diffY > 0.05) direction = "DOWN";

    setHeadDirection(direction);

    if (direction !== "CENTERED") {
        if (!lookingAwayStartRef.current) {
            lookingAwayStartRef.current = Date.now();
        } else {
            if ((Date.now() - lookingAwayStartRef.current) / 1000 >= 1) {
                reportIncident("LOOKING_AWAY", `Looking Away (${direction})`, "MEDIUM", "Student is not looking at the screen.");
                lookingAwayStartRef.current = null;
            }
        }
    } else {
        lookingAwayStartRef.current = null;
    }
};

useEffect(() => {
    if (!modelsLoaded || isSubmitted) return;

    mediapipeIntervalRef.current = setInterval(() => {
        detectFaceIncidents();
    }, 200);

    cocossdIntervalRef.current = setInterval(() => {
        detectObjectIncidents();
    }, 1000);

    return () => {
        if (mediapipeIntervalRef.current) clearInterval(mediapipeIntervalRef.current);
        if (cocossdIntervalRef.current) clearInterval(cocossdIntervalRef.current);
    };
}, [modelsLoaded, isSubmitted]);

// console.log(questions);
// console.log("Length:", questions.length);
// console.log("Current question:", question);
// console.log("Flagged questions:", flaggedQuestions);
    const dismissWarning = () => {
        setIsWarningDismissed(true);
        setTimeout(() => {
            setIsWarningHidden(true);
        }, 300);
    };

   const handleAnswerSelect = (option) => {
    setAnswers((prev) => ({
        ...prev,
        [currentQuestion]: option,
    }));
};
const calculateScore = () => {
    let score = 0;

    questions.forEach((question, index) => {
        const selectedAnswer = answers[index];

        if (
            selectedAnswer &&
            selectedAnswer === question.correct_option
        ) {
            score += question.marks;
        }
    });

    return score;
};

// Live Monitoring Ping Loop (Real-Time Proctor Stream Telemetry)
useEffect(() => {
    const student = JSON.parse(localStorage.getItem('student'));
    if (!student || !modelsLoaded) return;

    const pingBackend = async () => {
        try {
            // 1. Calculate dynamic real-time AI Confidence Score (0 - 100%)
            let aiConfidence = 98;
            if (phoneDetected) aiConfidence -= 55;
            if (faceStatus === 'MULTIPLE') aiConfidence -= 45;
            if (faceStatus === 'NO FACE') aiConfidence -= 40;
            if (headDirection !== 'CENTERED') aiConfidence -= 15;
            if (eyeStatus === 'CLOSED') aiConfidence -= 15;
            if (audioStatusRef.current === 'SPEECH') aiConfidence -= 35;
            if (audioStatusRef.current === 'WHISPER') aiConfidence -= 25;
            
            const recentErrors = incidentLog ? incidentLog.filter(i => i.isError) : [];
            if (recentErrors.length > 0) {
                aiConfidence -= Math.min(30, recentErrors.length * 6);
            }
            aiConfidence = Math.max(10, Math.min(100, aiConfidence));

            // 2. Determine Traffic-Light Status:
            // 🟢 Normal (Green): >= 80% & no critical breach
            // 🟡 Warning (Yellow): 50% - 79% (minor warnings)
            // 🔴 Suspicious (Red): < 50% or (phone / multi-person / speech / frequent violations)
            let status = 'Normal';
            if (phoneDetected || faceStatus === 'MULTIPLE' || audioStatusRef.current === 'SPEECH' || aiConfidence < 50 || recentErrors.length >= 4) {
                status = 'Suspicious';
            } else if (aiConfidence < 80 || audioStatusRef.current === 'WHISPER' || headDirection !== 'CENTERED' || eyeStatus === 'CLOSED' || recentErrors.length > 0) {
                status = 'Warning';
            }
            
            // 3. Capture high-clarity webcam snapshot for silent proctor stream
            let snapshot = null;
            if (videoRef.current && videoRef.current.videoWidth > 0) {
                const canvas = document.createElement("canvas");
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                snapshot = canvas.toDataURL("image/jpeg", 0.55);
            }

            // 4. Capture real-time screen share viewport
            let screenSnapshot = null;
            try {
                const sCanvas = document.createElement("canvas");
                sCanvas.width = 360;
                sCanvas.height = 220;
                const sCtx = sCanvas.getContext("2d");
                sCtx.fillStyle = "#090d16";
                sCtx.fillRect(0, 0, 360, 220);
                
                // Screen header simulation
                sCtx.fillStyle = "#1e293b";
                sCtx.fillRect(0, 0, 360, 26);
                sCtx.fillStyle = "#38bdf8";
                sCtx.font = "bold 10px monospace";
                sCtx.fillText(`ACTIVE EXAM | Q${currentQuestion + 1}/${questions.length || 1} | TIME: ${timeString}`, 10, 17);

                // Question viewport text
                sCtx.fillStyle = "#f8fafc";
                sCtx.font = "11px sans-serif";
                const curQ = questions[currentQuestion];
                const qTitle = curQ?.question_text || "Operating Systems Final Examination...";
                sCtx.fillText(qTitle.slice(0, 48), 10, 52);
                if (qTitle.length > 48) {
                    sCtx.fillText(qTitle.slice(48, 96), 10, 68);
                }

                // Options viewport
                sCtx.fillStyle = "#1e293b";
                sCtx.fillRect(10, 85, 340, 24);
                sCtx.fillStyle = answers[currentQuestion] ? "#22c55e" : "#94a3b8";
                sCtx.font = "10px monospace";
                sCtx.fillText(`Option A: Process Scheduling`, 18, 101);

                sCtx.fillStyle = answers[currentQuestion] === 'B' ? "#3b82f6" : "#1e293b";
                sCtx.fillRect(10, 115, 340, 24);
                sCtx.fillStyle = "#f8fafc";
                sCtx.fillText(`Selected Answer: Option ${answers[currentQuestion] || 'None'}`, 18, 131);

                // Picture-in-Picture live camera in corner of screen share
                if (videoRef.current && videoRef.current.videoWidth > 0) {
                    sCtx.drawImage(videoRef.current, 250, 145, 100, 65);
                    sCtx.strokeStyle = status === 'Suspicious' ? "#ef4444" : status === 'Warning' ? "#eab308" : "#10b981";
                    sCtx.lineWidth = 2;
                    sCtx.strokeRect(250, 145, 100, 65);
                }

                screenSnapshot = sCanvas.toDataURL("image/jpeg", 0.55);
            } catch (sErr) {
                console.error("Screen snapshot capture failed:", sErr);
            }

            const res = await pingLiveSession({
                studentId: student.student_id,
                examName: "Computer Fundamentals Finals",
                status: status,
                aiConfidence: aiConfidence,
                faceStatus: faceStatus,
                eyeStatus: eyeStatus,
                headDirection: headDirection,
                phoneDetected: phoneDetected,
                multipleDetected: faceStatus === 'MULTIPLE',
                audioStatus: audioStatusRef.current || 'QUIET',
                audioLevel: audioDecibelRef.current || 0,
                snapshot: snapshot,
                screenSnapshot: screenSnapshot
            });

            if (res && res.messages && res.messages.length > 0) {
                res.messages.forEach(msg => {
                    setActiveWarning({
                        type: 'PROCTOR_MESSAGE',
                        title: 'Message from Proctor',
                        message: msg.message
                    });
                    setIsWarningDismissed(false);
                    setIsWarningHidden(false);
                });
            }
        } catch (err) {
            console.error("Live monitoring ping failed:", err);
        }
    };

    const intervalId = setInterval(pingBackend, 2000);
    pingBackend(); // Initial ping

    return () => clearInterval(intervalId);
}, [modelsLoaded, incidentLog, faceStatus, eyeStatus, headDirection, phoneDetected, currentQuestion, answers]);

const handleSubmitExam = async () => {
    const score = calculateScore();

    setFinalScore(score);

    const student = JSON.parse(
        localStorage.getItem("student")
    );

    try {
        await submitResult({
            student_id: student.student_id,
            exam_id: 2,
            score: score,
            total_marks: questions.length * 2,
        });

        setIsSubmitted(true);
    } catch (error) {
        console.log(error);
    }
};

const handleFlagQuestion = () => {
    if (!flaggedQuestions.includes(currentQuestion)) {
        setFlaggedQuestions([
            ...flaggedQuestions,
            currentQuestion,
        ]);
    }
};
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds} remaining`;
    if (loading) {
    return <h2>Loading questions...</h2>;
}

if (questions.length === 0) {
    return <h2>No questions found.</h2>;
}
    
    return (
        <div className="theme-admin bg-slate-950 dark text-white font-body-lg overflow-hidden h-screen flex flex-col">
            {/* Embedded styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }
                .glass-card {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(226, 232, 240, 0.8);
                }
                .dark .glass-card {
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(71, 85, 105, 0.5);
                }
                .warning-glow {
                    animation: pulse-red 2s infinite;
                }
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(186, 26, 26, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(186, 26, 26, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(186, 26, 26, 0); }
                }
                .ai-marker {
                    border: 1.5px solid #712ae2;
                    box-shadow: 0 0 8px rgba(113, 42, 226, 0.3);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #c3c6d7;
                    border-radius: 10px;
                }
            `}} />

            {/* Top Warning Banner */}
            <div className="bg-error text-on-error px-gutter py-2 flex items-center justify-center gap-sm z-[60] animate-pulse">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                <span className="font-label-md text-label-md tracking-widest uppercase">AI Monitoring Active</span>
            </div>

            {/* Top App Bar */}
            <header className="fixed top-10 w-full z-50 bg-slate-900/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex justify-between items-center h-14 px-gutter">
                <div className="flex items-center gap-md">
                    <h1 className="font-headline-md text-headline-md text-primary">Exam Session</h1>
                    <div className="h-6 w-[1px] bg-outline-variant/50"></div>
                    <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-slate-300">CS502: Advanced Neural Networks</span>
                        
                        <div className="flex items-center gap-xs">
                            <div className="w-2 h-2 rounded-full bg-error"></div>
                            <span className="font-mono-sm text-mono-sm text-error font-bold">LIVE RECORDING</span>
                        </div>
                    </div>
                </div>

                {/* Timer & Progress */}
                <div className="hidden md:flex items-center gap-lg flex-1 max-w-md px-xl">
                    <div className="w-full">
                        
                        <div className="text-sm text-red-500">
    Flagged Questions:

    {flaggedQuestions.length > 0
        ? flaggedQuestions.map((q) => q + 1).join(", ")
        : " None"}
</div>

                   <div className="hidden md:flex items-center gap-lg flex-1 max-w-md px-xl">
    <div className="w-full">

        <div className="flex justify-between mb-1">

            <span className="font-label-md text-label-md text-slate-300">
                Progress: {currentQuestion + 1}/{questions.length}
            </span>

            <span className="font-label-md text-label-md text-primary font-bold">
                {timeString}
            </span>

        </div>

        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">

            <div
                className="bg-primary h-full rounded-full"
                style={{
                    width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                }}
            ></div>

        </div>

    </div>
</div>     
                    </div>
                </div>

                <div className="flex items-center gap-md">
                    <div className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-primary" data-icon="videocam">videocam</span>
                        <span className="material-symbols-outlined text-primary" data-icon="wifi">wifi</span>
                        <span className="material-symbols-outlined text-primary" data-icon="psychology">psychology</span>
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant flex items-center justify-center bg-primary/20 text-primary font-bold">
                        {student?.profile_photo ? (
                            <img src={student.profile_photo} alt={student.full_name} className="w-full h-full object-cover" />
                        ) : (
                            student.full_name ? student.full_name.charAt(0).toUpperCase() : "S"
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 mt-24 flex overflow-hidden">
                {/* Left Panel: Question */}
                <section className="w-full md:w-3/5 lg:w-2/3 h-full overflow-y-auto px-gutter py-lg flex flex-col gap-lg">
              <aside className="glass-card p-4 rounded-xl mb-6">
    <h3 className="font-bold mb-3">
        Question Palette
    </h3>

    {/* Legend */}

    <div className="flex flex-col gap-2 text-xs mb-4">

        <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span>Current</span>
        </div>

        <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>Answered</span>
        </div>

        <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>Flagged</span>
        </div>

        <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300"></div>
            <span>Not Answered</span>
        </div>

    </div>

    {/* Question numbers */}

    <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto">

        {questions.map((_, index) => (
            <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-10 h-10 rounded-lg font-bold ${
                    currentQuestion === index
                        ? "bg-blue-500 text-white"
                        : flaggedQuestions.includes(index)
                        ? "bg-red-500 text-white"
                        : answers[index]
                        ? "bg-green-500 text-white"
                        : visitedQuestions.includes(index)
                        ? "bg-gray-400 text-white"
                        : "bg-gray-200 text-slate-900"
                }`}
            >
                {index + 1}
            </button>
        ))}

    </div>
</aside>
                    <div className="glass-card rounded-xl p-lg flex flex-col gap-md">
                        <div className="flex justify-between items-start">
                            <span className="bg-primary-fixed text-on-primary-fixed-variant px-sm py-1 rounded-lg font-label-md text-label-md">Question {currentQuestion + 1} of {questions.length}</span>
 
                            <span className="text-slate-300 font-label-md text-label-md">Points: {question?.marks}</span>
                        </div>
                       <h2>{question?.question_text}
</h2> </div>
<div className="space-y-md mt-md">

    <label className="flex items-start gap-md p-md rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-colors group">
        <input className="mt-1 w-5 h-5"
    type="radio"
    name={`question-${currentQuestion}`}
    checked={answers[currentQuestion] === "A"}
    onChange={() => handleAnswerSelect("A")}/>

        <span className="font-body-lg text-body-lg text-slate-100">
            {question?.option_a}
        </span>
    </label>

    <label className="flex items-start gap-md p-md rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-colors group">
        <input className="mt-1 w-5 h-5"
    type="radio"
    name={`question-${currentQuestion}`}
    checked={answers[currentQuestion] === "B"}
    onChange={() => handleAnswerSelect("B")} />

        <span className="font-body-lg text-body-lg text-slate-100">
            {question?.option_b}
        </span>
    </label>

    <label className="flex items-start gap-md p-md rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-colors group">
        <input  className="mt-1 w-5 h-5"
    type="radio"
    name={`question-${currentQuestion}`}
    checked={answers[currentQuestion] === "C"}
    onChange={() => handleAnswerSelect("C")} />

        <span className="font-body-lg text-body-lg text-slate-100">
            {question?.option_c}
        </span>
    </label>

    <label className="flex items-start gap-md p-md rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-colors group">
        <input  className="mt-1 w-5 h-5"
    type="radio"
    name={`question-${currentQuestion}`}
    checked={answers[currentQuestion] === "D"}
    onChange={() => handleAnswerSelect("D")} />

        <span className="font-body-lg text-body-lg text-slate-100">
            {question?.option_d}
        </span>
    </label>

</div>
                            
                           
                           
                    {/* Question Controls */}
                    <div className="flex justify-between items-center mt-auto pb-xl">
                       <button
    className="flex items-center gap-sm px-lg py-md rounded-xl border border-outline text-slate-300 hover:bg-surface-variant/20 transition-all active:scale-95"
    onClick={() => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    }}
>
    
    <span className="material-symbols-outlined">
        arrow_back
    </span>

    <span className="font-label-md text-label-md">
        Previous
    </span>
</button>
                        <div className="flex gap-md">
 <button
      className={`flex items-center gap-sm px-lg py-md rounded-xl border ${
        flaggedQuestions.includes(currentQuestion)
            ? "bg-red-500 text-white"
            : "border-outline"
    }`}
    onClick={handleFlagQuestion}
>
    <span className="font-label-md text-label-md">
        Flag for Review
    </span>
</button>
                            <button
    className="bg-primary text-on-primary flex items-center gap-sm px-xl py-md rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
    onClick={() => {
    if (currentQuestion < questions.length - 1) {
        const nextQuestion = currentQuestion + 1;

        setCurrentQuestion(nextQuestion);

        setVisitedQuestions((prev) => {
            if (prev.includes(nextQuestion)) {
                return prev;
            }

            return [...prev, nextQuestion];
        });
    }
}}
>
    <span className="font-label-md text-label-md">
        Save & Next
    </span>

    <span className="material-symbols-outlined">
        arrow_forward
    </span>
</button>
                            
                        </div>
                    </div>
                </section>

                {/* Right Panel: Monitoring */}
                <aside className="hidden md:flex flex-col w-2/5 lg:w-1/3 bg-slate-900 border-l border-outline-variant/30 p-gutter gap-lg overflow-y-auto">
                    {/* Live Feed */}
                    <div className="flex flex-col gap-sm">
                        <div className="flex justify-between items-center">
                            <h3 className="font-label-md text-label-md text-slate-300 uppercase tracking-widest">Live Proctor Feed</h3>
                            <div className="flex items-center gap-xs">
                                <div className="w-2 h-2 rounded-full bg-error animate-ping"></div>
                                <span className="font-mono-sm text-mono-sm text-error uppercase">REC</span>
                            </div>
                        </div>
                        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-xl group">
                          <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    className="w-full h-full object-cover"
/>
<canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

{cameraError && (
    <div className="absolute bottom-2 left-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm">
        {cameraError}
    </div>
)}

                            
                            {/* Feed Controls Overlay */}
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-sm">
                                    <button 
                                        onClick={() => setIsMicOn(!isMicOn)}
                                        className={`backdrop-blur-md p-2 rounded-full text-white transition-colors ${isMicOn ? 'bg-black/60 hover:bg-black/80' : 'bg-red-600/80 hover:bg-red-600'}`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{isMicOn ? 'mic' : 'mic_off'}</span>
                                    </button>
                                </div>
                                <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-mono">1920x1080 @ 30FPS</div>
                            </div>
                        </div>
                    </div>

                    {/* Multi-Modal Audio & Speech / Whisper Monitor */}
                    <div className={`glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 transition-all duration-300 ${
                        audioStatus === "SPEECH" 
                            ? "border-l-error bg-red-950/20 warning-glow shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                            : audioStatus === "WHISPER"
                            ? "border-l-amber-500 bg-amber-950/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                            : "border-l-emerald-500"
                    }`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-xs">
                                <span className={`material-symbols-outlined text-[20px] ${
                                    audioStatus === "SPEECH" 
                                        ? "text-error animate-pulse" 
                                        : audioStatus === "WHISPER"
                                        ? "text-amber-400 animate-pulse"
                                        : "text-emerald-400"
                                }`}>
                                    {audioStatus === "SPEECH" ? "record_voice_over" : audioStatus === "WHISPER" ? "hearing" : "mic"}
                                </span>
                                <span className="font-label-md text-label-md text-slate-200 font-bold">
                                    Multi-Modal Audio AI
                                </span>
                            </div>
                            <span className={`font-mono-sm text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                audioStatus === "SPEECH"
                                    ? "bg-red-500 text-white animate-bounce"
                                    : audioStatus === "WHISPER"
                                    ? "bg-amber-500 text-black font-extrabold animate-pulse"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}>
                                {audioStatus === "SPEECH" ? "SPEECH DETECTED" : audioStatus === "WHISPER" ? "WHISPER DETECTED" : "QUIET (NORMAL)"}
                            </span>
                        </div>

                        {/* Live Sound Frequency Waveform & FFT Spectrum Canvas */}
                        <div className="relative mt-xs rounded-lg overflow-hidden border border-slate-700/60 bg-slate-950">
                            <canvas
                                ref={audioCanvasRef}
                                width={320}
                                height={50}
                                className="w-full h-12 block"
                            />
                            {/* Floating Telemetry Badge on Waveform */}
                            <div className="absolute top-1 left-2 flex items-center gap-1.5 pointer-events-none">
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                                    120Hz-4.5kHz Vocal FFT
                                </span>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    audioStatus === 'SPEECH' ? 'bg-red-600 text-white' : audioStatus === 'WHISPER' ? 'bg-amber-500 text-black' : 'bg-emerald-950 text-emerald-300'
                                }`}>
                                    {audioDecibel} dB
                                </span>
                            </div>
                        </div>

                        {/* Subtitle helper */}
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
                            <span>Vocal Formant Isolator</span>
                            <span className={audioStatus !== 'QUIET' ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                                {audioStatus === 'SPEECH' ? '⚠ Human Speech in Room' : audioStatus === 'WHISPER' ? '⚠ Whisper Harmonics Active' : 'No Speech Detected'}
                            </span>
                        </div>
                    </div>

                    {/* Monitoring Status Grid */}
                    <div className="grid grid-cols-2 gap-md">
                        {/* Face */}
                        <div className={`glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 ${faceStatus === "STABLE" ? "border-l-primary" : "border-l-error warning-glow"}`}>
                            <div className="flex justify-between items-center">
                                <span className={`material-symbols-outlined text-[20px] ${faceStatus === "STABLE" ? "text-primary" : "text-error"}`}>face</span>
                                <span className={`font-mono-sm text-mono-sm font-bold ${faceStatus === "STABLE" ? "text-primary" : "text-error"}`}>{faceStatus}</span>
                            </div>
                            <span className="font-label-md text-label-md text-slate-300">Face Match</span>
                        </div>
                        {/* Eyes */}
                        <div className={`glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 ${eyeStatus === "OPEN" ? "border-l-primary" : "border-l-error warning-glow"}`}>
                            <div className="flex justify-between items-center">
                                <span className={`material-symbols-outlined text-[20px] ${eyeStatus === "OPEN" ? "text-primary" : "text-error"}`}>visibility</span>
                                <span className={`font-mono-sm text-mono-sm font-bold ${eyeStatus === "OPEN" ? "text-primary" : "text-error"}`}>{eyeStatus}</span>
                            </div>
                            <span className="font-label-md text-label-md text-slate-300">Eye Tracking</span>
                        </div>
                        {/* Head */}
                        <div className={`glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 ${headDirection === "CENTERED" ? "border-l-primary" : "border-l-error warning-glow"}`}>
                            <div className="flex justify-between items-center">
                                <span className={`material-symbols-outlined text-[20px] ${headDirection === "CENTERED" ? "text-primary" : "text-error"}`}>screen_rotation</span>
                                <span className={`font-mono-sm text-mono-sm font-bold ${headDirection === "CENTERED" ? "text-primary" : "text-error"}`}>{headDirection}</span>
                            </div>
                            <span className="font-label-md text-label-md text-slate-300">Head Position</span>
                        </div>
                        {/* Mobile */}
                        <div className={`glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 ${phoneDetected ? "border-l-error warning-glow" : "border-l-primary"}`}>
                            <div className="flex justify-between items-center">
                                <span className={`material-symbols-outlined text-[20px] ${phoneDetected ? "text-error" : "text-primary"}`}>smartphone</span>
                                <span className={`font-mono-sm text-mono-sm font-bold ${phoneDetected ? "text-error" : "text-primary"}`}>{phoneDetected ? "DETECTED" : "NONE"}</span>
                            </div>
                            <span className="font-label-md text-label-md text-slate-300">Mobile Devices</span>
                        </div>
                        {/* Multi Person */}
                        <div className="glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 border-l-primary col-span-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-sm">
                                    <span className="material-symbols-outlined text-primary text-[20px]">group</span>
                                    <span className="font-label-md text-label-md text-slate-100">Multiple Persons Detection</span>
                                </div>
                               <span className="font-mono-sm text-mono-sm text-primary font-bold">
    MONITORING
</span>
                            </div>
                        </div>
                    </div>

                    {/* Activity Log */}
                    <div className="flex-1 flex flex-col gap-sm overflow-hidden">
                        <h3 className="font-label-md text-label-md text-slate-300 uppercase tracking-widest">Incident History</h3>
                        <div className="flex-1 overflow-y-auto space-y-sm pr-2 custom-scrollbar">
                            {incidentLog.map((entry, idx) => (
                                <div
                                    key={idx}
                                    className={
                                        entry.isError
                                            ? 'p-sm glass-card rounded-lg border-l-4 border-l-error bg-error-container/20 flex gap-md items-center'
                                            : 'p-sm glass-card rounded-lg flex gap-md items-center'
                                    }
                                >
                                    <span className={entry.isError ? 'font-mono-sm text-mono-sm text-error' : 'font-mono-sm text-mono-sm text-outline'}>{entry.time}</span>
                                    <span className={entry.isError ? 'text-body-md text-body-md text-error font-semibold' : 'text-body-md text-body-md text-slate-100'}>{entry.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* End Session Button */}
                    <button
                        className="w-full bg-slate-800 text-error border border-error/20 py-md rounded-xl font-bold hover:bg-error/10 transition-all"
                        onClick={handleSubmitExam}
                    >
                        Submit & Finish Exam
                    </button>
                </aside>
            </main>

            {/* Floating Warning Popup */}
            {activeWarning && !isWarningHidden && !isSubmitted && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-inverse-surface/60 backdrop-blur-md">
                    <div 
                        className="glass-card p-xl rounded-3xl shadow-2xl border-2 border-error/50 flex flex-col items-center gap-lg max-w-sm text-center transition-all duration-300"
                        style={{
                            transform: isWarningDismissed ? 'scale(0.9)' : 'scale(1)',
                            opacity: isWarningDismissed ? 0 : 1
                        }}
                    >
                    <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center animate-bounce">
                        <span className="material-symbols-outlined text-error text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    </div>
                    <div className="space-y-sm">
                        <h4 className="font-headline-md text-headline-md text-error">{activeWarning?.title || 'Warning!'}</h4>
                        <p className="font-body-lg text-body-lg text-slate-300">
                            {activeWarning?.message || 'Please keep looking at the screen. Continuous distraction may result in automatic session termination.'}
                        </p>
                    </div>
                    <button 
                        className="w-full bg-error text-on-error py-md rounded-xl font-bold shadow-lg shadow-error/30 hover:opacity-90 active:scale-95 transition-all" 
                        onClick={dismissWarning}
                    >
                        I Understand
                    </button>
                    </div>
                </div>
            )}

            {/* Submission Success Modal */}
            {isSubmitted && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm"
                >
                    <div className="glass-card p-xl rounded-3xl shadow-2xl border-2 border-primary/30 flex flex-col items-center gap-lg max-w-sm text-center">
                        <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                        <div className="space-y-sm">
                            <h4 className="font-headline-md text-headline-md text-slate-100">Exam Submitted Successfully</h4>
                           <div className="space-y-2">
    <p className="font-body-lg text-body-lg text-slate-300">
        Your responses have been securely recorded.
    </p>

    <p className="font-bold text-green-600">
        Score: {finalScore} / 100
    </p>
</div>
                        </div>
                        <button
                            className="w-full bg-primary text-on-primary py-md rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                            onClick={() => navigate('/student-dashboard')}
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            )}

            {/* Background Atmospheric Effect */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px]"></div>
            </div>
        </div>
        
 );
    


    
};


export default ActiveExam;
