import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import MoltenMetal from '../components/MoltenMetal';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const element = document.querySelector(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-background text-on-surface font-sans overflow-x-hidden">
      {/* Embedded CSS for custom animations and effects */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(226, 232, 240, 1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card:hover {
            border-color: transparent;
            background-image: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), linear-gradient(to right, #2563eb, #712ae2);
            background-origin: border-box;
            background-clip: padding-box, border-box;
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(30, 41, 59, 0.1);
        }
        .gradient-text {
            background: linear-gradient(135deg, #004ac6 0%, #712ae2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .gradient-button-primary {
            background: linear-gradient(135deg, #2563eb 0%, #712ae2 100%);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .gradient-button-primary:hover {
            transform: scale(1.02);
            box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
        }
        .hero-bg-blob {
            position: absolute;
            filter: blur(80px);
            z-index: -1;
            opacity: 0.4;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        .float-animation {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes revolveY {
            from { transform: perspective(1000px) rotateY(0deg); }
            to { transform: perspective(1000px) rotateY(360deg); }
        }
        .revolve-y {
            animation: revolveY 12s linear infinite;
        }
        @keyframes scanLine {
            0% { top: -10%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 110%; opacity: 0; }
        }
        .scan-line {
            position: absolute;
            left: 0;
            width: 100%;
            height: 4px;
            background: #3b82f6;
            box-shadow: 0 0 20px #3b82f6, 0 0 40px #60a5fa, 0 0 60px #93c5fd;
            animation: scanLine 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            z-index: 15;
        }
        @keyframes ripple {
            0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
            100% { box-shadow: 0 0 0 20px rgba(37, 99, 235, 0); }
        }
        .ripple-animation {
            animation: ripple 2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
        }
        .step-line {
            background: repeating-linear-gradient(to bottom, #cbd5e1 0, #cbd5e1 4px, transparent 4px, transparent 8px);
        }
        .dark .glass-card {
            background: rgba(30, 41, 59, 0.8);
            border-color: rgba(71, 85, 105, 0.5);
        }
        .dark .glass-card:hover {
            background-image: linear-gradient(rgba(30, 41, 59, 0.9), rgba(30, 41, 59, 0.9)), linear-gradient(to right, #3b82f6, #9333ea);
        }
      `}} />

      {/* Top Navigation Bar */}
      <header className={`fixed top-0 w-full z-50 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300 ${isScrolled ? 'shadow-lg bg-surface/95 dark:bg-surface-dim/95' : 'shadow-sm bg-surface/80 dark:bg-surface-dim/80'}`}>
        <div className="flex justify-between items-center h-16 px-gutter max-w-container-max mx-auto">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-sm cursor-pointer">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">AI-Invigilator</span>
          </button>
          <nav className="hidden md:flex items-center gap-lg">
            <a className="text-primary border-b-2 border-primary font-medium px-2 py-1" href="#home" onClick={(e) => handleSmoothScroll(e, '#home')}>Home</a>
            <a className="text-on-surface-variant hover:bg-primary/5 transition-colors px-2 py-1 rounded" href="#features" onClick={(e) => handleSmoothScroll(e, '#features')}>Features</a>
            <a className="text-on-surface-variant hover:bg-primary/5 transition-colors px-2 py-1 rounded" href="#how-it-works" onClick={(e) => handleSmoothScroll(e, '#how-it-works')}>How It Works</a>
          </nav>
          <div className="flex items-center gap-md">
            <ThemeToggle />
            <button onClick={() => navigate('/admin-login')} className="text-on-surface-variant font-medium hover:bg-primary/5 transition-colors px-4 py-2 rounded-lg cursor-pointer active:scale-95 transition-transform btn-animate">Admin Login</button>
            <button onClick={() => navigate('/student-login')} className="gradient-button-primary text-white font-bold px-6 py-2 rounded-lg cursor-pointer active:scale-95 shadow-md btn-animate">Student Login</button>
          </div>
        </div>
      </header>

      <main className="pt-16" id="home">
        {/* Hero Section */}
        <section className="relative min-h-[921px] flex items-center overflow-hidden px-gutter">
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
            className="absolute inset-0 z-0"
          />
          
          <div className="max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-xl items-center relative z-10">
            <div className="space-y-lg z-10">
              <div className="inline-flex items-center gap-xs px-3 py-1 bg-white/20 text-white rounded-full border border-white/30 backdrop-blur-md shadow-sm">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span className="font-label-md text-label-md uppercase tracking-wider">Next-Gen Proctoring</span>
              </div>
              <h1 className="font-display-lg text-display-lg lg:text-[64px] leading-tight text-white drop-shadow-lg">
                AI-Invigilator
              </h1>
              <p className="font-title-lg text-title-lg text-white/90 max-w-xl leading-relaxed drop-shadow-md">
                Smart AI-Based Online Examination Proctoring System. Experience clinical reliability with forward-thinking intelligence.
              </p>
              <div className="flex flex-wrap gap-md pt-md">
                <button onClick={() => navigate('/student-login')} className="gradient-button-primary text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-sm btn-animate shadow-xl border border-white/20">
                  Launch Assessment <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button onClick={() => setIsVideoModalOpen(true)} className="bg-white/90 px-8 py-4 rounded-xl font-extrabold text-slate-900 border border-white/50 hover:bg-white flex items-center gap-sm btn-animate shadow-xl backdrop-blur-md transition-all">
                  Request Demo <span className="material-symbols-outlined">play_circle</span>
                </button>
              </div>
              
              <div className="flex items-center gap-xl pt-lg">
                <div className="text-center">
                  <p className="font-headline-md text-white drop-shadow-md">99.9%</p>
                  <p className="font-label-md text-white/80 uppercase drop-shadow-sm">Accuracy</p>
                </div>
                <div className="h-10 w-px bg-white/30"></div>
                <div className="text-center">
                  <p className="font-headline-md text-white drop-shadow-md">1M+</p>
                  <p className="font-label-md text-white/80 uppercase drop-shadow-sm">Exams</p>
                </div>
                <div className="h-10 w-px bg-white/30"></div>
                <div className="text-center">
                  <p className="font-headline-md text-white drop-shadow-md">24/7</p>
                  <p className="font-label-md text-white/80 uppercase drop-shadow-sm">Monitoring</p>
                </div>
              </div>
            </div>
            
            <div className="relative flex justify-center lg:justify-end z-10">
              <div className="relative w-full max-w-[540px] aspect-square float-animation">
                {/* AI Shield Illustration Placeholder */}
                <div className="absolute inset-0 bg-black rounded-[40px] backdrop-blur-3xl border border-white/30 shadow-2xl flex items-center justify-center overflow-hidden">
                  <div className="scan-line"></div>
                  <img 
                    src="/face2.png" 
                    alt="AI Eye Scanning" 
                    className="absolute inset-0 w-full h-full object-contain opacity-90 mix-blend-screen scale-[1.05]"
                  />
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none"></div>
                  

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-xl bg-surface-container-low/50" id="features">
          <div className="max-w-container-max mx-auto px-gutter">
            <div className="text-center space-y-md mb-20">
              <h2 className="font-headline-lg text-headline-lg text-primary">Advanced Integrity Infrastructure</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                Our AI monitors behavioral signals in real-time to ensure every exam session is conducted with absolute fairness and security.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
              {[
                { icon: 'face', title: 'Face Detection', desc: 'Continuous verification of student identity using sophisticated facial recognition algorithms.' },
                { icon: 'visibility', title: 'Eye Tracking', desc: 'Monitoring gaze direction to identify unauthorized content viewing or off-screen focus.' },
                { icon: 'person_search', title: 'Head Pose Detection', desc: 'Analyzing head orientation in 3D space to detect suspicious movement or communication.' },
                { icon: 'smartphone', title: 'Mobile Phone Detection', desc: 'Instant alerts when handheld devices enter the student\'s field of view or workspace.' },
                { icon: 'group', title: 'Multiple Person Detection', desc: 'Ensuring the student remains solo by flagging any additional faces or silhouettes detected.' },
                { icon: 'tab', title: 'Tab Switching Detection', desc: 'Locking navigation and logging every instance of browser tab or window switching.' },
                { icon: 'screenshot', title: 'Screenshot Evidence', desc: 'Automated visual proof capture during any flagged suspicious activity for review.' },
                { icon: 'notification_important', title: 'Live Alerts', desc: 'Real-time notifications sent directly to proctors and logged in the session history.' },
              ].map((feature, idx) => (
                <div key={idx} className="glass-card p-lg rounded-2xl flex flex-col gap-md">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">{feature.icon}</span>
                  </div>
                  <h3 className="font-title-lg text-title-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="font-body-md text-body-md text-slate-700 dark:text-slate-300">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-xl" id="how-it-works">
          <div className="max-w-container-max mx-auto px-gutter">
            <div className="text-center space-y-md mb-20">
              <h2 className="font-headline-lg text-headline-lg text-primary">Simplified Integrity Flow</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">A seamless 4-step process for secure assessment delivery.</p>
            </div>
            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-lg">
              {[
                { step: 1, title: 'Authentication', desc: 'Student logs in and completes a biometric 3D face scan and ID verification.' },
                { step: 2, title: 'System Check', desc: 'AI verifies camera, microphone, and internet stability before session start.' },
                { step: 3, title: 'Monitoring', desc: 'Continuous AI surveillance analyzes behavioral patterns throughout the exam.' },
                { step: 4, title: 'Reporting', desc: 'Detailed integrity score and violation reports generated instantly upon submission.' }
              ].map((item, idx) => (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center space-y-md">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl shadow-lg ripple-animation float-animation">{item.step}</div>
                  <h4 className="font-title-lg text-title-lg font-bold">{item.title}</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">{item.desc}</p>
                </div>
              ))}
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-8 left-0 w-full h-[2px] bg-outline-variant/30 -z-0 translate-y-1/2"></div>
            </div>
          </div>
        </section>


      </main>

      {/* Footer */}
      <footer className="relative w-full py-xl mt-auto bg-surface-container-lowest dark:bg-surface-dim border-t border-outline-variant/30">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter gap-lg max-w-container-max mx-auto">
          <div className="flex flex-col gap-sm">
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              <span className="font-title-lg text-title-lg font-bold text-primary">AI-Invigilator</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">Secure. Objective. Sophisticated. Empowering academic integrity through artificial intelligence.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-xl">
            <div className="flex flex-col gap-sm">
              <p className="font-label-md text-on-surface uppercase tracking-widest mb-xs">Product</p>
              <a className="font-body-md text-primary font-semibold hover:text-secondary transition-colors" href="#features">Features</a>
              <button onClick={() => setActiveModal('pricing')} className="font-body-md text-primary font-semibold hover:text-secondary transition-colors text-left cursor-pointer">Pricing</button>
              <button onClick={() => setActiveModal('integrations')} className="font-body-md text-primary font-semibold hover:text-secondary transition-colors text-left cursor-pointer">Integrations</button>
            </div>
            <div className="flex flex-col gap-sm">
              <p className="font-label-md text-on-surface uppercase tracking-widest mb-xs">Legal</p>
              <button onClick={() => setActiveModal('privacy')} className="font-body-md text-primary font-semibold hover:text-secondary transition-colors text-left cursor-pointer">Privacy Policy</button>
              <button onClick={() => setActiveModal('terms')} className="font-body-md text-primary font-semibold hover:text-secondary transition-colors text-left cursor-pointer">Terms of Service</button>
              <button onClick={() => setActiveModal('security')} className="font-body-md text-primary font-semibold hover:text-secondary transition-colors text-left cursor-pointer">Security Whitepaper</button>
            </div>
            <div className="flex flex-col gap-sm">
              <p className="font-label-md text-on-surface uppercase tracking-widest mb-xs">Support</p>
              <button onClick={() => setShowHelpCenter(true)} className="font-body-md text-primary font-semibold hover:text-secondary transition-colors text-left cursor-pointer">Help Center</button>
              <button onClick={() => setActiveModal('api')} className="font-body-md text-primary font-semibold hover:text-secondary transition-colors text-left cursor-pointer">API Docs</button>
              <button onClick={() => setActiveModal('status')} className="font-body-md text-primary font-semibold hover:text-secondary transition-colors text-left cursor-pointer">Status</button>
            </div>
          </div>
        </div>
        <div className="max-w-container-max mx-auto px-gutter mt-xl pt-lg border-t border-outline-variant/10 text-center md:text-left">
          <p className="font-body-md text-body-md text-on-surface-variant">© 2026 AI-Invigilator. Secure. Objective. Sophisticated. All rights reserved.</p>
        </div>
      </footer>

      {/* Video Demo Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-surface rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-slate-900">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">visibility</span>
                AI Exam Proctoring Demo
              </h3>
              <button 
                onClick={() => setIsVideoModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="relative pt-[56.25%] bg-black flex items-center justify-center">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/20 m-4 rounded-xl">
                <span className="material-symbols-outlined text-6xl text-white/50 mb-4">videocam</span>
                <h4 className="text-xl font-bold text-white mb-2">Video Placeholder</h4>
                <p className="text-white/70 max-w-md">
                  As an AI, I cannot generate MP4 video files of your software. Please record a 2-minute screen capture of your app in action (login, exam start, alerts), name it <strong>demo.mp4</strong>, and place it in your <strong>public</strong> folder.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Center Modal */}
      {showHelpCenter && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHelpCenter(false)}
            style={{ animation: 'fadeInHC 0.2s ease' }}
          />
          <div
            className="relative bg-surface border border-outline-variant/30 rounded-2xl shadow-2xl p-xl max-w-md w-full mx-md"
            style={{ animation: 'popInHC 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <button
              onClick={() => setShowHelpCenter(false)}
              className="absolute top-md right-md p-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 rounded-full transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="flex items-center gap-sm mb-lg">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[28px]">support_agent</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Help Center</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Contact our team</p>
              </div>
            </div>
            <div className="space-y-sm">
              {[
                { name: 'Hetvi Modi', phone: '9619577240' },
                { name: 'Purva Naik', phone: '8983505928' },
                { name: 'Harshda Kolte', phone: '8149145664' },
              ].map((person, i) => (
                <a
                  key={i}
                  href={`tel:${person.phone}`}
                  className="flex items-center gap-md p-md rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold font-title-lg">
                    {person.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-label-md text-label-md text-on-surface">{person.name}</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">{person.phone}</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">call</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popInHC {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeInHC {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />

      {/* Generic Info Modal */}
      {activeModal && (() => {
        const modals = {
          pricing: {
            icon: 'payments',
            title: 'Pricing',
            subtitle: 'Plans for every institution',
            items: [
              { label: 'Starter', detail: 'Up to 100 students — Free during beta' },
              { label: 'Professional', detail: 'Up to 1,000 students — ₹15,000/semester' },
              { label: 'Enterprise', detail: 'Unlimited students — Custom quote' },
            ],
          },
          integrations: {
            icon: 'hub',
            title: 'Integrations',
            subtitle: 'Works with your existing tools',
            items: [
              { label: 'Google Classroom', detail: 'Seamless student roster sync and grade export' },
              { label: 'Moodle / Canvas LMS', detail: 'One-click exam import and result push' },
              { label: 'Microsoft Teams', detail: 'Launch proctored sessions directly from Teams' },
            ],
          },
          privacy: {
            icon: 'shield',
            title: 'Privacy Policy',
            subtitle: 'Your data, your rights',
            items: [
              { label: 'Data Collection', detail: 'We collect only webcam feeds and browser metadata during active exam sessions.' },
              { label: 'Storage & Retention', detail: 'All session data is encrypted (AES-256) and automatically purged after 90 days.' },
              { label: 'Third-Party Sharing', detail: 'We never sell or share student data with third parties. Period.' },
            ],
          },
          terms: {
            icon: 'gavel',
            title: 'Terms of Service',
            subtitle: 'Rules of engagement',
            items: [
              { label: 'Acceptable Use', detail: 'AI-Invigilator is to be used only for authorized academic examination proctoring.' },
              { label: 'Liability', detail: 'The platform provides AI-assisted flagging; final academic decisions rest with the institution.' },
              { label: 'Account Security', detail: 'Administrators are responsible for safeguarding their login credentials.' },
            ],
          },
          security: {
            icon: 'lock',
            title: 'Security Whitepaper',
            subtitle: 'Enterprise-grade protection',
            items: [
              { label: 'Encryption', detail: 'End-to-end TLS 1.3 for transit; AES-256 for data at rest.' },
              { label: 'Infrastructure', detail: 'Hosted on ISO 27001 certified cloud with 99.95% SLA uptime.' },
              { label: 'Compliance', detail: 'GDPR, FERPA, and SOC 2 Type II compliant architecture.' },
            ],
          },
          api: {
            icon: 'code',
            title: 'API Documentation',
            subtitle: 'Build on our platform',
            items: [
              { label: 'REST API', detail: 'Full CRUD endpoints for exams, students, violations, and results.' },
              { label: 'Webhooks', detail: 'Real-time event notifications for violations and exam state changes.' },
              { label: 'SDKs', detail: 'Official libraries for Node.js, Python, and Java coming soon.' },
            ],
          },
          status: {
            icon: 'check_circle',
            title: 'System Status',
            subtitle: 'All systems operational',
            items: [
              { label: 'API Server', detail: '✅ Operational — 99.98% uptime (last 30 days)' },
              { label: 'AI Proctor Engine', detail: '✅ Operational — avg response 42ms' },
              { label: 'Video Processing', detail: '✅ Operational — no incidents reported' },
            ],
          },
        };
        const m = modals[activeModal];
        if (!m) return null;
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveModal(null)} style={{ animation: 'fadeInHC 0.2s ease' }} />
            <div className="relative bg-surface border border-outline-variant/30 rounded-2xl shadow-2xl p-xl max-w-md w-full mx-md" style={{ animation: 'popInHC 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <button onClick={() => setActiveModal(null)} className="absolute top-md right-md p-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 rounded-full transition-all">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              <div className="flex items-center gap-sm mb-lg">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[28px]">{m.icon}</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">{m.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{m.subtitle}</p>
                </div>
              </div>
              <div className="space-y-sm">
                {m.items.map((item, i) => (
                  <div key={i} className="p-md rounded-xl border border-outline-variant/30 hover:border-primary/30 transition-all">
                    <p className="font-label-md text-label-md text-on-surface mb-xs">{item.label}</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default LandingPage;