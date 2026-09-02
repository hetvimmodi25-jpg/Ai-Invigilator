import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';
import ThemeToggle from '../components/ThemeToggle';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await requestPasswordReset(contact);
      navigate('/verify-otp', { state: { contact } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to request reset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-lg min-h-screen flex flex-col relative">
      {/* Embedded Custom CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .glass-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .dark .glass-card {
            background: rgba(30, 41, 59, 0.85);
            border: 1px solid rgba(71, 85, 105, 0.5);
        }
        .primary-gradient {
            background: linear-gradient(135deg, #004ac6 0%, #712ae2 100%);
        }
        `
      }} />

      {/* Top Navigation Anchor */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm">
        <div className="flex justify-between items-center h-16 px-gutter max-w-container-max mx-auto">
          <button type="button" onClick={() => navigate('/')} className="font-headline-md text-headline-md font-bold text-primary cursor-pointer hover:opacity-80 active:scale-95 transition-all">AI-Invigilator</button>
          <div className="flex items-center gap-md">
            <ThemeToggle />
            <button onClick={() => navigate('/student-login')} className="text-on-surface-variant font-label-md text-label-md hover:bg-primary/5 px-md py-sm rounded-lg transition-colors cursor-pointer active:scale-95">
              Back to Login
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center pt-24 pb-16 relative overflow-hidden z-10">
        {/* Ambient Atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]"></div>
        </div>

        {/* Centered Glassmorphism Card */}
        <div className="relative z-10 w-full max-w-[480px] p-md">
          <div className="glass-card rounded-[32px] p-xl shadow-xl border border-outline-variant/30">
            
            {/* Branding & Identity */}
            <div className="text-center mb-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl primary-gradient text-white mb-md shadow-md">
                <span className="material-symbols-outlined !text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-slate-900 dark:text-white font-extrabold mb-xs">Forgot Password</h1>
              <p className="font-body-md text-body-md text-slate-600 dark:text-slate-300 font-medium">Enter your registered email or phone number</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-lg p-md bg-red-100/50 border border-red-200 rounded-xl flex gap-md items-start">
                <span className="material-symbols-outlined text-red-600 !text-[20px]">error</span>
                <p className="font-body-md text-body-md text-red-800 font-medium">{error}</p>
              </div>
            )}

            {/* Request Form */}
            <form className="space-y-lg" onSubmit={handleSubmit}>
              
              <div className="relative">
                <label className="block font-label-md text-label-md text-slate-700 dark:text-slate-300 font-semibold mb-xs ml-1" htmlFor="contact">Registered Email or Phone</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-slate-400 !text-[20px]">contact_mail</span>
                  <input 
                    className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-body-md text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                    id="contact" 
                    placeholder="student@university.edu or 1234567890" 
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Primary Button */}
              <button 
                className="w-full h-14 primary-gradient text-white font-title-lg text-title-lg font-bold rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-60 cursor-pointer" 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Continue'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            <div className="mt-xl text-center">
              <p className="font-body-md text-body-md text-slate-600 dark:text-slate-400 font-medium">
                Remember your password?{' '}
                <Link className="text-primary font-bold hover:underline" to="/student-login">Back to Login</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
