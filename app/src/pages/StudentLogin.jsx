import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import MoltenMetal from '../components/MoltenMetal';

const StudentLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registeredMessage = location.state?.registered
    ? 'Registration successful! Please sign in with your new account.'
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await studentLogin({ email, password });
      navigate('/student-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const particleContainerRef = useRef(null);

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
      <div ref={particleContainerRef} className="hidden"></div>

      {/* Top Navigation Anchor */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm">
        <div className="flex justify-between items-center h-16 px-gutter max-w-container-max mx-auto">
          <button type="button" onClick={() => navigate('/')} className="font-headline-md text-headline-md font-bold text-primary cursor-pointer hover:opacity-80 active:scale-95 transition-all">AI-Invigilator</button>
          <div className="flex gap-md">
            <button onClick={() => navigate('/admin-login')} className="text-on-surface-variant font-label-md text-label-md hover:bg-primary/5 px-md py-sm rounded-lg transition-colors cursor-pointer active:scale-95 transition-transform">
              Admin Login
            </button>
            <button className="bg-primary-container text-on-primary-container font-label-md text-label-md px-md py-sm rounded-lg shadow-sm cursor-pointer active:scale-95 transition-transform">
              Student Login
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center pt-16 relative overflow-hidden z-10">
        {/* Ambient Atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]"></div>
        </div>

        {/* Centered Glassmorphism Card */}
        <div className="relative z-10 w-full max-w-[480px] p-md">
          <div className="glass-card rounded-[32px] p-xl shadow-sm border border-outline-variant/30">
            
            {/* Branding & Identity */}
            <div className="text-center mb-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl primary-gradient text-white mb-md shadow-md">
                <span className="material-symbols-outlined !text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-slate-900 mb-xs">Welcome Back</h1>
              <p className="font-body-md text-body-md text-slate-600">Secure Session Authentication</p>
            </div>

            {/* Success Message: Registration */}
            {registeredMessage && (
              <div className="mb-lg p-md bg-green-100/50 border border-green-200 rounded-xl flex gap-md items-start">
                <span className="material-symbols-outlined text-green-600 !text-[20px]">check_circle</span>
                <p className="font-body-md text-body-md text-green-800">{registeredMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-lg p-md bg-red-100/50 border border-red-200 rounded-xl flex gap-md items-start">
                <span className="material-symbols-outlined text-red-600 !text-[20px]">error</span>
                <p className="font-body-md text-body-md text-red-800">{error}</p>
              </div>
            )}



            {/* Login Form */}
            <form className="space-y-lg" onSubmit={handleSubmit}>
              
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
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="relative">
                <div className="flex justify-between items-center mb-xs">
                  <label className="font-label-md text-label-md text-slate-700 ml-1" htmlFor="password">Password</label>
                  <Link className="font-label-md text-label-md text-primary hover:underline" to="/forgot-password">Forgot Password?</Link>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-slate-400 !text-[20px]">lock</span>
                  <input 
                    className="w-full h-12 pl-12 pr-12 bg-white/50 border border-slate-300 rounded-xl font-body-md text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                    id="password" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
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

              {/* Primary Login Button */}
              <button 
                className="w-full h-14 primary-gradient text-white font-title-lg text-title-lg rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-60" 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing In…' : 'Access Exam Shell'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            {/* Registration Anchor */}
            <div className="mt-xl text-center">
              <p className="font-body-md text-body-md text-slate-600">
                First time using AI-Invigilator?{' '}
                <Link className="text-primary font-semibold hover:underline" to="/register">Register Account</Link>
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

export default StudentLogin;