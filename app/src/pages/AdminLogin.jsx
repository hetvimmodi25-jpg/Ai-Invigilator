import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import MoltenMetal from '../components/MoltenMetal';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIdFocused, setIsIdFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const btnRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await adminLogin({ email, password });
      navigate('/admin-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBtnMouseMove = (e) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    btnRef.current.style.setProperty('--x', `${x}px`);
    btnRef.current.style.setProperty('--y', `${y}px`);
  };

  return (
    <div className="theme-admin dark min-h-screen flex flex-col font-body-md text-white overflow-x-hidden relative">
      {/* Embedded Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(226, 232, 240, 1);
            box-shadow: 0 4px 20px rgba(30, 41, 59, 0.05);
        }
        .dark .glass-card {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.5);
        }
        .glass-card:hover {
            border-image: linear-gradient(to right, #004ac6, #712ae2) 1;
            box-shadow: 0 12px 40px rgba(30, 41, 59, 0.12);
        }
        .primary-gradient-btn {
            background: linear-gradient(135deg, #004ac6 0%, #712ae2 100%);
            transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .primary-gradient-btn:active {
            transform: scale(0.98);
        }
        .input-focus-glow:focus {
            outline: none;
            border-color: #004ac6;
            box-shadow: 0 0 0 4px rgba(0, 74, 198, 0.1);
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
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      />

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm">
        <div className="flex justify-between items-center h-16 px-gutter max-w-container-max mx-auto">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-sm cursor-pointer hover:opacity-80 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-primary text-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">AI-Invigilator</span>
          </button>
          <div className="flex items-center gap-md">
            <button type="button" onClick={() => navigate('/')} className="flex items-center gap-xs text-slate-300 font-label-md text-label-md hover:bg-primary/5 transition-colors px-md py-sm rounded-lg cursor-pointer active:scale-95">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Home
            </button>
            <Link className="text-slate-300 font-label-md text-label-md hover:bg-primary/5 transition-colors px-md py-sm rounded-lg cursor-pointer active:scale-95" to="/student-login">Student Login</Link>
            <a className="text-primary border-b-2 border-primary font-label-md text-label-md px-md py-sm cursor-default" href="#">Admin Login</a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center pt-16 px-gutter relative">
        {/* Abstract Decoration */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10"></div>
        
        <div className="w-full max-w-[480px] py-xl">
          {/* Glass Login Card */}
          <div className="glass-card rounded-2xl p-lg md:p-xl transition-all duration-300">
            <div className="flex flex-col gap-sm mb-lg">
              <span className="text-label-md font-label-md text-primary tracking-widest uppercase">Restricted Access</span>
              <h1 className="font-headline-lg text-headline-lg text-white">Proctor Console</h1>
              <p className="font-body-lg text-body-lg text-slate-300">Enter your administrative credentials to access the invigilation dashboard.</p>
            </div>

            <form className="flex flex-col gap-lg" onSubmit={handleSubmit}>
              {/* Error Message */}
              {error && (
                <div className="p-md bg-error-container/50 border border-error/20 rounded-xl flex gap-md items-start">
                  <span className="material-symbols-outlined text-error text-[20px]">error</span>
                  <p className="font-body-md text-body-md text-on-error-container">{error}</p>
                </div>
              )}

              {/* Identity Input */}
              <div className="flex flex-col gap-xs">
                <label 
                  className={`font-label-md text-label-md ml-xs transition-colors ${isIdFocused ? 'text-primary' : 'text-slate-300'}`} 
                  htmlFor="admin-id"
                >
                  Admin Email
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">badge</span>
                  <input 
                    className="w-full h-12 pl-11 pr-md rounded-xl border border-outline-variant bg-surface-container-low font-body-md text-body-md input-focus-glow transition-all" 
                    id="admin-id" 
                    placeholder="admin@aiinvigilator.com" 
                    type="text" 
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}                    onFocus={() => setIsIdFocused(true)}
                    onBlur={() => setIsIdFocused(false)}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between items-center px-xs">
                  <label 
                    className={`font-label-md text-label-md transition-colors ${isPasswordFocused ? 'text-primary' : 'text-slate-300'}`} 
                    htmlFor="password"
                  >
                    Secure Password
                  </label>
                  <a className="text-primary font-label-md text-label-md hover:underline" href="#">Forgot?</a>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                  <input 
                    className="w-full h-12 pl-11 pr-md rounded-xl border border-outline-variant bg-surface-container-low font-body-md text-body-md input-focus-glow transition-all" 
                    id="password" 
                    placeholder="••••••••••••" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    required
                  />
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-sm px-xs">
                <input 
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20" 
                  id="remember" 
                  type="checkbox" 
                />
                <label className="font-body-md text-body-md text-slate-300 cursor-pointer" htmlFor="remember">
                  Trust this device for 30 days
                </label>
              </div>

              {/* Submit */}
              <button 
                ref={btnRef}
                onMouseMove={handleBtnMouseMove}
                className="primary-gradient-btn w-full h-14 rounded-xl text-on-primary font-title-lg text-title-lg shadow-md hover:opacity-90 flex items-center justify-center gap-sm disabled:opacity-60" 
                type="submit"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Authorizing…' : 'Authorize Access'}</span>
                <span className="material-symbols-outlined text-[20px]">login</span>
              </button>
            </form>

            {/* Additional Info */}
            <div className="mt-xl pt-lg border-t border-outline-variant/30">
              <div className="flex flex-col gap-md">
                <div className="flex items-start gap-md p-md bg-slate-800/50 rounded-xl">
                  <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-white">Compliance Mode Active</span>
                    <p className="font-mono-sm text-mono-sm text-slate-300">All administrative actions are logged for audit integrity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer-ish subtext */}
          <p className="text-center mt-lg font-body-md text-body-md text-outline">
            Institutional SSO required? <a className="text-primary font-semibold hover:underline" href="#">Connect Directory</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative w-full py-xl mt-auto bg-slate-900/50 border-t border-outline-variant/30">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter gap-lg max-w-container-max mx-auto">
          <div className="flex flex-col gap-xs items-center md:items-start">
            <span onClick={() => navigate('/')} className="font-title-lg text-title-lg font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">AI-Invigilator</span>
            <p className="font-body-md text-body-md text-slate-300">© 2026 AI-Invigilator. Secure. Objective. Sophisticated.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-lg">
            <a className="text-slate-300 font-body-md text-body-md hover:text-secondary transition-colors" href="#">Privacy Policy</a>
            <a className="text-slate-300 font-body-md text-body-md hover:text-secondary transition-colors" href="#">Terms of Service</a>
            <a className="text-slate-300 font-body-md text-body-md hover:text-secondary transition-colors" href="#">Security Whitepaper</a>
            <a className="text-slate-300 font-body-md text-body-md hover:text-secondary transition-colors" href="#">Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default AdminLogin;
