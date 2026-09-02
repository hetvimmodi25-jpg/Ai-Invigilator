import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';

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
    <div className="theme-student bg-background text-on-background font-body-lg min-h-screen flex flex-col">
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
                <span className="material-symbols-outlined !text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Forgot Password</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Enter your email or phone number</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-lg p-md bg-error-container/50 border border-error/20 rounded-xl flex gap-md items-start">
                <span className="material-symbols-outlined text-error !text-[20px]">error</span>
                <p className="font-body-md text-body-md text-on-error-container">{error}</p>
              </div>
            )}

            {/* Request Form */}
            <form className="space-y-lg" onSubmit={handleSubmit}>
              
              <div className="relative">
                <label className="block font-label-md text-label-md text-on-surface-variant mb-xs ml-1" htmlFor="contact">Registered Email or Phone</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline !text-[20px]">contact_mail</span>
                  <input 
                    className="w-full h-12 pl-12 pr-4 bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
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
                className="w-full h-14 primary-gradient text-on-primary font-title-lg text-title-lg rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-60" 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Continue'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            <div className="mt-xl text-center">
              <p className="font-body-md text-body-md text-on-surface-variant">
                Remember your password?{' '}
                <Link className="text-primary font-semibold hover:underline" to="/student-login">Back to Login</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
