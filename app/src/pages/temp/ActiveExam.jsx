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
} from "../services/authService";

const ActiveExam = () => {
  const navigate = useNavigate();

  const EXAM_DURATION = 50 * 60;

  const [timeRemaining, setTimeRemaining] = useState(EXAM_DURATION);

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [visitedQuestions, setVisitedQuestions] = useState([0]);

  const [tabWarning, setTabWarning] = useState(false);

  const [activeWarning, setActiveWarning] = useState(() =>
    pickRandomEvent()
  );

  const [isWarningDismissed, setIsWarningDismissed] =
    useState(false);

  const [isWarningHidden, setIsWarningHidden] =
    useState(false);

  const [eyeStatus, setEyeStatus] = useState("STABLE");
  const [lookingAway, setLookingAway] = useState(false);

  const [cameraError, setCameraError] = useState("");

  // Models ready state
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // MediaPipe Face Landmarker
  const faceLandmarkerRef = useRef(null);

  // COCO SSD Object Detection
  const modelRef = useRef(null);

  const [incidentLog, setIncidentLog] = useState([
    {
      time: "10:42:01",
      text: "Face verification successful",
      isError: false,
    },
  ]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);


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
            const response = await getQuestions(2);

            console.log("Questions:", response);

            setQuestions(response);
        } catch (error) {
            console.log(error);
        }
        setLoading(false);
    };

    loadQuestions();
}, []);








useEffect(() => {
    const startVideo = async () => {
        try {
            const stream =
                await navigator.mediaDevices.getUserMedia({
                    video: true,
                });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.log(error);
        }
    };

    startVideo();
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
            setIncidentLog((prev) => [
                {
                    time: new Date().toLocaleTimeString("en-US", {
                        hour12: false,
                    }),
                    text: "Tab switched detected",
                    isError: true,
                },
                ...prev,
            ]);

            alert("Warning! Tab switching is not allowed.");
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
        const isCurrentlyFullScreen =
            document.fullscreenElement !== null;

        setIsFullScreen(isCurrentlyFullScreen);

        if (!isCurrentlyFullScreen) {
            setIncidentLog((prev) => [
                {
                    time: new Date().toLocaleTimeString(
                        "en-US",
                        {
                            hour12: false,
                        }
                    ),
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

const detectFace = () => {
    if (
        !videoRef.current ||
        !faceLandmarkerRef.current
    ) {
        return;
    }

const results = faceLandmarkerRef.current.detectForVideo(
    videoRef.current,
    performance.now()
);

if (!results || !results.faceLandmarks) {
    return;
}

const faceCount = results.faceLandmarks.length;

console.log("Faces:", faceCount);

if (faceCount === 0) {
    setEyeStatus("NO FACE");
    return;
}

if (faceCount > 1) {
    setEyeStatus("MULTIPLE FACES");
    return;
}

const landmarks = results.faceLandmarks[0];

if (!landmarks || landmarks.length < 264) {
    return;
}

console.log("Landmarks:", landmarks.length);

const nose = landmarks[1];
const leftEye = landmarks[33];
const rightEye = landmarks[263];

const faceCenter = (leftEye.x + rightEye.x) / 2;
const diff = nose.x - faceCenter;

console.log(diff);

if (diff > 0.02) {
    setEyeStatus("LOOKING RIGHT");
}
else if (diff < -0.02) {
    setEyeStatus("LOOKING LEFT");
}
else {
    setEyeStatus("LOOKING CENTER");
}

if (faceCount === 0) {
    setEyeStatus("NO FACE");
    console.log("❌ No Face");
    return;
}

if (faceCount > 1) {
    setEyeStatus("MULTIPLE FACES");
    console.log("⚠ Multiple Faces");
    return;
}

setEyeStatus("FACE DETECTED");
};

useEffect(() => {
    if (!modelsLoaded) return;

    const interval = setInterval(() => {
        detectFace();
    }, 1000);

    return () => clearInterval(interval);
}, [modelsLoaded]);

// console.log(questions);
// console.log("Length:", questions.length);
// console.log("Current question:", question);
// console.log("Flagged questions:", flaggedQuestions);
    // Periodically simulate a new AI monitoring event while the popup is dismissed


    useEffect(() => {
        if (isSubmitted) return undefined;
        const interval = setInterval(() => {
            const next = pickRandomEvent(activeWarning?.type);
            setActiveWarning(next);
            setIsWarningDismissed(false);
            setIsWarningHidden(false);
            setIncidentLog((prev) => [
                {
                    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    text: `${next.title} (Warning sent)`,
                    isError: true,
                },
                ...prev,
            ].slice(0, 20));
        }, 25000);
        return () => clearInterval(interval);
    }, [activeWarning, isSubmitted]);

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
        <div className="theme-admin bg-background text-on-background font-body-lg overflow-hidden h-screen flex flex-col">
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
            <header className="fixed top-10 w-full z-50 bg-surface/80 dark:bg-surface-container-highest/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex justify-between items-center h-14 px-gutter">
                <div className="flex items-center gap-md">
                    <h1 className="font-headline-md text-headline-md text-primary">Exam Session</h1>
                    <div className="h-6 w-[1px] bg-outline-variant/50"></div>
                    <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface-variant">CS502: Advanced Neural Networks</span>
                        
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

            <span className="font-label-md text-label-md text-on-surface-variant">
                Progress: {currentQuestion + 1}/{questions.length}
            </span>

            <span className="font-label-md text-label-md text-primary font-bold">
                {timeString}
            </span>

        </div>

        <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">

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
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
<video
    ref={videoRef}
    autoPlay
    muted
    playsInline
    width="320"
    height="240"
/>
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
                        : "bg-gray-200"
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
 
                            <span className="text-on-surface-variant font-label-md text-label-md">Points: {question?.marks}</span>
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

        <span className="font-body-lg text-body-lg text-on-surface">
            {question?.option_a}
        </span>
    </label>

    <label className="flex items-start gap-md p-md rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-colors group">
        <input className="mt-1 w-5 h-5"
    type="radio"
    name={`question-${currentQuestion}`}
    checked={answers[currentQuestion] === "B"}
    onChange={() => handleAnswerSelect("B")} />

        <span className="font-body-lg text-body-lg text-on-surface">
            {question?.option_b}
        </span>
    </label>

    <label className="flex items-start gap-md p-md rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-colors group">
        <input  className="mt-1 w-5 h-5"
    type="radio"
    name={`question-${currentQuestion}`}
    checked={answers[currentQuestion] === "C"}
    onChange={() => handleAnswerSelect("C")} />

        <span className="font-body-lg text-body-lg text-on-surface">
            {question?.option_c}
        </span>
    </label>

    <label className="flex items-start gap-md p-md rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-colors group">
        <input  className="mt-1 w-5 h-5"
    type="radio"
    name={`question-${currentQuestion}`}
    checked={answers[currentQuestion] === "D"}
    onChange={() => handleAnswerSelect("D")} />

        <span className="font-body-lg text-body-lg text-on-surface">
            {question?.option_d}
        </span>
    </label>

</div>
                            
                           
                           
                    {/* Question Controls */}
                    <div className="flex justify-between items-center mt-auto pb-xl">
                       <button
    className="flex items-center gap-sm px-lg py-md rounded-xl border border-outline text-on-surface-variant hover:bg-surface-variant/20 transition-all active:scale-95"
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
                <aside className="hidden md:flex flex-col w-2/5 lg:w-1/3 bg-surface-container-low border-l border-outline-variant/30 p-gutter gap-lg overflow-y-auto">
                    {/* Live Feed */}
                    <div className="flex flex-col gap-sm">
                        <div className="flex justify-between items-center">
                            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Live Proctor Feed</h3>
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

{cameraError && (
    <div className="absolute bottom-2 left-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm">
        {cameraError}
    </div>
)}
                            {/* AI Overlays */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 ai-marker rounded-lg">
                                    <span className="absolute top-0 right-0 bg-secondary text-on-secondary-container text-[10px] font-bold px-1 rounded-bl">FACE DETECTED 99.8%</span>
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-2 border-secondary rounded-full opacity-50"></div>
                            </div>
                            
                            {/* Feed Controls Overlay */}
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-sm">
                                    <button className="bg-black/60 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/80">
                                        <span className="material-symbols-outlined text-[20px]">mic</span>
                                    </button>
                                    <button className="bg-black/60 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/80">
                                        <span className="material-symbols-outlined text-[20px]">settings</span>
                                    </button>
                                </div>
                                <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-mono">1920x1080 @ 30FPS</div>
                            </div>
                        </div>
                    </div>

                    {/* Monitoring Status Grid */}
                    <div className="grid grid-cols-2 gap-md">
                        {/* Face */}
                        <div className="glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 border-l-primary">
                            <div className="flex justify-between items-center">
                                <span className="material-symbols-outlined text-primary text-[20px]">face</span>
                                <span className="font-mono-sm text-mono-sm text-primary font-bold">STABLE</span>
                            </div>
                            <span className="font-label-md text-label-md text-on-surface-variant">Face Match</span>
                        </div>
                        {/* Eyes */}
                        <div className="glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 border-l-error warning-glow">
                            <div className="flex justify-between items-center">
                                <span className="material-symbols-outlined text-error text-[20px]">visibility</span>
                                <span className="font-mono-sm text-mono-sm text-error font-bold">{eyeStatus}</span>
                            </div>
                            <span className="font-label-md text-label-md text-on-surface-variant">Eye Tracking</span>
                        </div>
                        {/* Head */}
                        <div className="glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 border-l-primary">
                            <div className="flex justify-between items-center">
                                <span className="material-symbols-outlined text-primary text-[20px]">screen_rotation</span>
                                <span className="font-mono-sm text-mono-sm text-primary font-bold">CENTERED</span>
                            </div>
                            <span className="font-label-md text-label-md text-on-surface-variant">Head Position</span>
                        </div>
                        {/* Mobile */}
                        <div className="glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 border-l-primary">
                            <div className="flex justify-between items-center">
                                <span className="material-symbols-outlined text-primary text-[20px]">smartphone</span>
                                <span className="font-mono-sm text-mono-sm text-primary font-bold">NONE</span>
                            </div>
                            <span className="font-label-md text-label-md text-on-surface-variant">Mobile Devices</span>
                        </div>
                        {/* Multi Person */}
                        <div className="glass-card p-md rounded-xl flex flex-col gap-xs border-l-4 border-l-primary col-span-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-sm">
                                    <span className="material-symbols-outlined text-primary text-[20px]">group</span>
                                    <span className="font-label-md text-label-md text-on-surface">Multiple Persons Detection</span>
                                </div>
                               <span className="font-mono-sm text-mono-sm text-primary font-bold">
    MONITORING
</span>
                            </div>
                        </div>
                    </div>

                    {/* Activity Log */}
                    <div className="flex-1 flex flex-col gap-sm overflow-hidden">
                        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Incident History</h3>
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
                                    <span className={entry.isError ? 'text-body-md text-body-md text-error font-semibold' : 'text-body-md text-body-md text-on-surface'}>{entry.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* End Session Button */}
                    <button
                        className="w-full bg-surface-container-highest text-error border border-error/20 py-md rounded-xl font-bold hover:bg-error/10 transition-all"
                        onClick={handleSubmitExam}
                    >
                        Submit & Finish Exam
                    </button>
                </aside>
            </main>

            {/* Floating Warning Popup */}
            {!isWarningHidden && !isSubmitted && (
                <div 
                    className="fixed z-[100] glass-card p-xl rounded-3xl shadow-2xl border-2 border-error/50 flex flex-col items-center gap-lg max-w-sm text-center transition-all duration-300"
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: isWarningDismissed ? 'translate(-50%, -40%) scale(0.9)' : 'translate(-50%, -50%) scale(1)',
                        opacity: isWarningDismissed ? 0 : 1
                    }}
                >
                    <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center animate-bounce">
                        <span className="material-symbols-outlined text-error text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    </div>
                    <div className="space-y-sm">
                        <h4 className="font-headline-md text-headline-md text-error">{activeWarning?.title || 'Warning!'}</h4>
                        <p className="font-body-lg text-body-lg text-on-surface-variant">
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
                            <h4 className="font-headline-md text-headline-md text-on-surface">Exam Submitted Successfully</h4>
                           <div className="space-y-2">
    <p className="font-body-lg text-body-lg text-on-surface-variant">
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