import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOTP, requestPasswordReset } from '../services/authService';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contact = location.state?.contact;
  
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(60);
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    if (!contact) {
      navigate('/forgot-password');
    }
  }, [contact, navigate]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await verifyOTP(contact, otp);
      navigate('/reset-password', { state: { resetToken: data.resetToken } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResendStatus('Resending...');
    setError('');
    try {
      await requestPasswordReset(contact);
      setTimer(60);
      setResendStatus('OTP Resent Successfully');
      setTimeout(() => setResendStatus(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to resend OTP.');
      setResendStatus('');
    }
  };

  if (!contact) return null;

  return (
    <div className="theme-student bg-background text-on-background font-body-lg min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center pt-16 relative overflow-hidden z-10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-[480px] p-md">
          <div className="glass-card rounded-[32px] p-xl shadow-sm border border-outline-variant/30">
            
            <div className="text-center mb-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl primary-gradient text-white mb-md shadow-md">
                <span className="material-symbols-outlined !text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>password</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Verify OTP</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Enter the 6-digit code sent to<br/><strong className="text-primary">{contact}</strong></p>
            </div>

            {error && (
              <div className="mb-lg p-md bg-error-container/50 border border-error/20 rounded-xl flex gap-md items-start">
                <span className="material-symbols-outlined text-error !text-[20px]">error</span>
                <p className="font-body-md text-body-md text-on-error-container">{error}</p>
              </div>
            )}
            
            {resendStatus && !error && (
              <div className="mb-lg p-md bg-primary-container/50 border border-primary/20 rounded-xl flex gap-md items-start">
                <span className="material-symbols-outlined text-primary !text-[20px]">info</span>
                <p className="font-body-md text-body-md text-on-primary-container">{resendStatus}</p>
              </div>
            )}

            <form className="space-y-lg" onSubmit={handleSubmit}>
              <div className="relative">
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline !text-[20px]">dialpad</span>
                  <input 
                    className="w-full h-12 pl-12 pr-4 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none text-center tracking-[0.5em] font-mono text-xl" 
                    id="otp" 
                    placeholder="••••••" 
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                className="w-full h-14 primary-gradient text-on-primary font-title-lg text-title-lg rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-60" 
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
              >
                {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
                <span className="material-symbols-outlined">check_circle</span>
              </button>
            </form>

            <div className="mt-xl text-center flex flex-col gap-sm">
              <p className="font-body-md text-body-md text-on-surface-variant">
                Didn't receive the code?{' '}
                {timer > 0 ? (
                  <span className="text-outline">Resend in {timer}s</span>
                ) : (
                  <button onClick={handleResend} className="text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer">Resend OTP</button>
                )}
              </p>
              <button onClick={() => navigate('/forgot-password')} className="text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer">Change Contact Details</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyOTP;
