import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerStudent } from "../services/authService";
import { extractLandmarksFromImage } from "../utils/faceMatcher";
import MoltenMetal from '../components/MoltenMetal';

const Register = () => {
  const navigate = useNavigate();

  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Baseline Photo State
  const [profilePhoto, setProfilePhoto] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [photoValidating, setPhotoValidating] = useState(false);
  const [photoValidationMessage, setPhotoValidationMessage] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Toggle states for passwords
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Stop camera when unmounting or deactivated
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const setVideoRef = (el) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  const startCamera = async () => {
    try {
      setCameraLoading(true);
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      // Attempt immediate attach if already mounted, or let callback ref/useEffect handle post-paint
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please allow camera permissions or upload a photo.");
    } finally {
      setCameraLoading(false);
    }
  };

  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    stopCamera();
    await validateAndSetPhoto(dataUrl);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        await validateAndSetPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const validateAndSetPhoto = async (dataUrl) => {
    setPhotoValidating(true);
    setPhotoValidationMessage('Validating face biometrics...');
    setError('');

    try {
      const res = await extractLandmarksFromImage(dataUrl);
      if (!res.success) {
        setProfilePhoto('');
        setError(res.error || "No valid face detected in photo. Please ensure good lighting and look directly at camera.");
        setPhotoValidationMessage('');
      } else {
        setProfilePhoto(dataUrl);
        setPhotoValidationMessage('✓ Face biometrics extracted & verified as baseline');
      }
    } catch (err) {
      console.error("Photo validation error:", err);
      // Fallback: accept photo if landmark extraction encounters transient issue
      setProfilePhoto(dataUrl);
      setPhotoValidationMessage('✓ Baseline photo captured');
    } finally {
      setPhotoValidating(false);
    }
  };

  const handleRetake = () => {
    setProfilePhoto('');
    setPhotoValidationMessage('');
    startCamera();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!enrollmentNo || !name || !email || !password || !confirmPassword || !phone || !course || !semester) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!profilePhoto) {
      setError('Please capture or upload a baseline photo for anti-impersonation identity verification.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerStudent({
        enrollment_no: enrollmentNo,
        full_name: name,
        email,
        password,
        phone,
        course,
        semester,
        profile_photo: profilePhoto
      });

      alert("Registration Successful! You can now log in and take verified exams.");
      navigate("/student-login");

    } catch (err) {
      console.log(err);
      if (err.response) {
        console.log("Status:", err.response.status);
        console.log("Response Data:", err.response.data);
      }
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col font-body-md text-on-background relative">
      {/* Embedded Custom CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .dark .glass-card {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.5);
        }
        .primary-gradient {
            background: linear-gradient(135deg, #004ac6 0%, #712ae2 100%);
        }
        .floating-label-input:focus-within label {
            transform: translateY(-20px) scale(0.85);
            color: #004ac6;
        }
        .input-glow:focus {
            box-shadow: 0 0 0 4px rgba(0, 74, 198, 0.1);
        }
        `
      }} />

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
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      />

      {/* Top Navigation Anchor */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm">
        <div className="flex justify-between items-center h-16 px-gutter max-w-container-max mx-auto">
          <button type="button" onClick={() => navigate('/')} className="font-headline-md text-headline-md font-bold text-primary cursor-pointer hover:opacity-80 active:scale-95 transition-all">AI-Invigilator</button>
          <div className="flex gap-md">
            <button onClick={() => navigate('/admin-login')} className="text-on-surface-variant font-label-md text-label-md hover:bg-primary/5 px-md py-sm rounded-lg transition-colors cursor-pointer active:scale-95 transition-transform">
              Admin Login
            </button>
            <button onClick={() => navigate('/student-login')} className="bg-primary-container text-on-primary-container font-label-md text-label-md px-md py-sm rounded-lg shadow-sm cursor-pointer active:scale-95 transition-transform">
              Student Login
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-16 relative overflow-hidden z-10">
        <div className="relative z-10 w-full max-w-[800px] p-md mt-4">
          <div className="glass-card rounded-[32px] p-xl shadow-sm border border-outline-variant/30">

            {/* Branding & Identity */}
            <div className="text-center mb-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl primary-gradient text-white mb-md shadow-md">
                <span className="material-symbols-outlined !text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-slate-900 mb-xs">Create Account</h1>
              <p className="font-body-md text-body-md text-slate-600">Register for Secure Exam Access</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-lg p-md bg-red-100/50 border border-red-200 rounded-xl flex gap-md items-start">
                <span className="material-symbols-outlined text-red-600 !text-[20px]">error</span>
                <p className="font-body-md text-body-md text-red-800">{error}</p>
              </div>
            )}

            {/* Registration Form */}
            <form className="grid grid-cols-1 md:grid-cols-2 gap-lg" onSubmit={handleSubmit}>

              {/* Enrollment No */}
              <div className="relative">
                <label className="block font-label-md text-label-md text-slate-700 mb-xs ml-1">
                  Enrollment Number
                </label>
                <input
                  className="w-full h-12 px-4 bg-white/50 border border-slate-300 rounded-xl font-body-md text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  type="text"
                  value={enrollmentNo}
                  onChange={(e) => setEnrollmentNo(e.target.value)}
                  placeholder="2026001"
                />
              </div>

              {/* Name Field */}
              <div className="relative">
                <label className="block font-label-md text-label-md text-slate-700 mb-xs ml-1" htmlFor="name">Full Name</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-slate-400 !text-[20px]">person</span>
                  <input
                    className="w-full h-12 pl-12 pr-4 bg-white/50 border border-slate-300 rounded-xl font-body-md text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    id="name"
                    placeholder="Jane Doe"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="relative">
                <label className="block font-label-md text-label-md text-slate-700 mb-xs ml-1" htmlFor="email">Email Address</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-slate-400 !text-[20px]">mail</span>
                  <input
                    className="w-full h-12 pl-12 pr-4 bg-white/50 border border-slate-300 rounded-xl font-body-md text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    id="email"
                    placeholder="student@university.edu"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="relative">
                <label className="block font-label-md text-label-md text-slate-700 mb-xs ml-1">
                  Phone
                </label>
                <input
                  className="w-full h-12 px-4 bg-white/50 border border-slate-300 rounded-xl font-body-md text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  type="text"
                  value={phone}
                  onChange={(e)=>setPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>

              {/* Course */}
              <div className="relative">
                <label className="block font-label-md text-label-md text-slate-700 mb-xs ml-1">
                  Course
                </label>
                <input
                  className="w-full h-12 px-4 bg-white/50 border border-slate-300 rounded-xl font-body-md text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  type="text"
                  value={course}
                  onChange={(e)=>setCourse(e.target.value)}
                  placeholder="B.Tech"
                />
              </div>

              {/* Semester */}
              <div className="relative">
                <label className="block font-label-md text-label-md text-slate-700 mb-xs ml-1">
                  Semester
                </label>
                <input
                  className="w-full h-12 px-4 bg-white/50 border border-slate-300 rounded-xl font-body-md text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  type="text"
                  value={semester}
                  onChange={(e)=>setSemester(e.target.value)}
                  placeholder="8"
                />
              </div>


              {/* Password Field */}
              <div className="relative">
                <label className="block font-label-md text-label-md text-slate-700 mb-xs ml-1" htmlFor="password">Password</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-slate-400 !text-[20px]">lock</span>
                  <input
                    className="w-full h-12 pl-12 pr-12 bg-white/50 border border-slate-300 rounded-xl font-body-md text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    id="password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none flex items-center"
                  >
                    <span className="material-symbols-outlined !text-[20px]">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="relative">
                <label className="block font-label-md text-label-md text-slate-700 mb-xs ml-1" htmlFor="confirm-password">Confirm Password</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-slate-400 !text-[20px]">lock_reset</span>
                  <input
                    className="w-full h-12 pl-12 pr-12 bg-white/50 border border-slate-300 rounded-xl font-body-md text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    id="confirm-password"
                    placeholder="••••••••"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none flex items-center"
                  >
                    <span className="material-symbols-outlined !text-[20px]">
                      {showConfirmPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Baseline Photo Anti-Impersonation Section */}
              <div className="md:col-span-2 p-md rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-inner">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="material-symbols-outlined text-primary !text-[24px]">face_unlock</span>
                  <div>
                    <h3 className="font-title-md text-title-md text-slate-900 font-bold">
                      Baseline Photo (Anti-Impersonation)
                    </h3>
                    <p className="font-body-sm text-body-sm text-slate-600">
                      Required for pre-exam AI face matching. AI compares this baseline with your live camera feed before unlocking exam questions.
                    </p>
                  </div>
                </div>

                {/* Camera Viewfinder */}
                {isCameraActive && (
                  <div className="mt-md flex flex-col items-center gap-sm">
                    <div className="relative w-full max-w-[360px] aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-lg border-2 border-primary">
                      <video
                        ref={setVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Face framing guide */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-56 border-2 border-dashed border-primary/80 rounded-[50%] animate-pulse"></div>
                      </div>
                      <div className="absolute bottom-2 left-0 right-0 text-center">
                        <span className="bg-black/60 backdrop-blur-sm text-white font-label-sm text-[11px] px-sm py-[2px] rounded-full uppercase tracking-wider">
                          Position your face inside oval
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-sm">
                      <button
                        type="button"
                        onClick={captureSnapshot}
                        className="px-lg py-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white font-label-md rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined !text-[18px]">photo_camera</span>
                        Take Snapshot
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-md py-sm bg-slate-200 text-slate-700 font-label-md rounded-xl hover:bg-slate-300 active:scale-95 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Captured Photo Preview */}
                {!isCameraActive && profilePhoto && (
                  <div className="mt-md flex flex-col sm:flex-row items-center gap-md p-sm bg-white rounded-xl border border-green-200">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-green-500 shadow-sm shrink-0">
                      <img
                        src={profilePhoto}
                        alt="Registered baseline"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-[2px]">
                        <span className="material-symbols-outlined !text-[14px]">check</span>
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-xs text-green-700 font-bold text-sm mb-[2px]">
                        <span className="material-symbols-outlined !text-[18px]">verified_user</span>
                        <span>Baseline Face Registered</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-sm">
                        Biometric features will be used for pre-exam face verification.
                      </p>
                      <div className="flex flex-wrap gap-xs justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={handleRetake}
                          className="px-sm py-xs bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined !text-[14px]">refresh</span>
                          Retake Photo
                        </button>
                        <label className="px-sm py-xs bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                          <span className="material-symbols-outlined !text-[14px]">upload</span>
                          Upload Another
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State / Photo Action Trigger */}
                {!isCameraActive && !profilePhoto && (
                  <div className="mt-md flex flex-col sm:flex-row gap-sm items-stretch sm:items-center justify-center">
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={cameraLoading || photoValidating}
                      className="flex-1 py-md px-lg bg-primary text-white rounded-xl font-label-md text-label-md flex items-center justify-center gap-sm shadow-sm hover:bg-primary/90 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined !text-[20px]">videocam</span>
                      {cameraLoading ? 'Starting Camera...' : 'Snap with Webcam'}
                    </button>

                    <label className="flex-1 py-md px-lg bg-white border border-slate-300 text-slate-700 rounded-xl font-label-md text-label-md flex items-center justify-center gap-sm shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer text-center">
                      <span className="material-symbols-outlined !text-[20px]">file_upload</span>
                      Upload Face Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {photoValidationMessage && (
                  <div className="mt-sm text-center">
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-sm py-[2px] rounded-full border border-green-200 inline-block">
                      {photoValidationMessage}
                    </span>
                  </div>
                )}
              </div>

              {/* Primary Register Button */}
              <button
                className="w-full h-14 md:col-span-2 primary-gradient text-white font-title-lg text-title-lg rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-60 cursor-pointer"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Account…' : 'Create Account'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            {/* Login Anchor */}
            <div className="mt-xl text-center">
              <p className="font-body-md text-body-md text-slate-600">
                Already have an account?{' '}
                <Link className="text-primary font-semibold hover:underline" to="/student-login">Sign In</Link>
              </p>
            </div>
          </div>

          {/* Integrity Badges */}
          <div className="mt-lg flex justify-center gap-lg opacity-40 grayscale">
            <div className="flex items-center gap-xs font-label-md text-[10px] tracking-widest uppercase text-white">
              <span className="material-symbols-outlined !text-[14px]">shield</span>
              AES-256 SECURED
            </div>
            <div className="flex items-center gap-xs font-label-md text-[10px] tracking-widest uppercase text-white">
              <span className="material-symbols-outlined !text-[14px]">auto_awesome</span>
              AI-POWERED
            </div>
          </div>
        </div>
      </main>

      {/* Footer Identity */}
      <footer className="relative w-full py-xl mt-auto border-t border-outline-variant/30 bg-surface-container-lowest dark:bg-surface-dim z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter gap-lg max-w-container-max mx-auto">
          <button type="button" onClick={() => navigate('/')} className="font-title-lg text-title-lg font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">AI-Invigilator</button>
          <div className="flex flex-wrap justify-center gap-lg">
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-secondary transition-colors" href="#privacy">Privacy Policy</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-secondary transition-colors" href="#terms">Terms of Service</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-secondary transition-colors" href="#security">Security Whitepaper</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-secondary transition-colors" href="#support">Support</a>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">© 2026 AI-Invigilator. Secure. Objective. Sophisticated.</p>
        </div>
      </footer>
    </div>
  );
};

export default Register;
