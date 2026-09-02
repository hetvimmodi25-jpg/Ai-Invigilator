import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { resetPassword } from '../services/authService';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!resetToken) {
      navigate('/forgot-password');
    }
  }, [resetToken, navigate]);

  const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return "Password must contain at least one special character.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(resetToken, newPassword);
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resetToken) return null;

  return (
    <div className="theme-student bg-background text-on-background font-body-lg min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center pt-16 relative overflow-hidden z-10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-[480px] p-md">
          <div className="glass-card rounded-[32px] p-xl shadow-sm border border-outline-variant/30">
            
            {isSuccess ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-container text-primary mb-lg shadow-md animate-bounce">
                  <span className="material-symbols-outlined !text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Password Updated</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-xl">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
                <button 
                  onClick={() => navigate('/student-login')}
                  className="w-full h-14 primary-gradient text-on-primary font-title-lg text-title-lg rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-lg">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl primary-gradient text-white mb-md shadow-md">
                    <span className="material-symbols-outlined !text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>vpn_key</span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Create New Password</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">Please set a strong password.</p>
                </div>

                {error && (
                  <div className="mb-lg p-md bg-error-container/50 border border-error/20 rounded-xl flex gap-md items-start">
                    <span className="material-symbols-outlined text-error !text-[20px]">error</span>
                    <p className="font-body-md text-body-md text-on-error-container">{error}</p>
                  </div>
                )}

                <form className="space-y-lg" onSubmit={handleSubmit}>
                  <div className="relative">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-xs ml-1" htmlFor="newPassword">New Password</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline !text-[20px]">lock</span>
                      <input 
                        className="w-full h-12 pl-12 pr-4 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                        id="newPassword" 
                        placeholder="••••••••" 
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-xs ml-1" htmlFor="confirmPassword">Confirm New Password</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline !text-[20px]">lock_reset</span>
                      <input 
                        className="w-full h-12 pl-12 pr-4 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                        id="confirmPassword" 
                        placeholder="••••••••" 
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button 
                    className="w-full h-14 primary-gradient text-on-primary font-title-lg text-title-lg rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-60" 
                    type="submit"
                    disabled={isSubmitting || !newPassword || !confirmPassword}
                  >
                    {isSubmitting ? 'Updating...' : 'Reset Password'}
                    <span className="material-symbols-outlined">save</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
