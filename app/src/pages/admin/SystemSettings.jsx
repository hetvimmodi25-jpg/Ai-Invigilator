import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useTheme } from '../../context/ThemeContext.jsx';

const Toggle = ({ checked, onChange }) => (
  <label className="switch-toggle">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="slider-round"></span>
  </label>
);

const SystemSettings = () => {
  const { admin } = useAuth();

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('adminProfile');
    return saved ? JSON.parse(saved) : {
      name: admin?.adminId ? String(admin.adminId) : 'Alex Thompson',
      email: 'alex.thompson@ai-invigilator.io',
      role: 'SUPER_ADMIN_LEVEL_01',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQZ01ZsgbYt5JmvwaDnJQkGprBEDGPg0Btb3OoQ3Z67GIECzV0d-MgixZgGilGAR3ILG-uIpbHILhNSaQd3ZNXqaLWXyWaMt030Hool38ngidC21f2otWW8qw3FL2ewKNqUIWL223uTlO3MzXx8x4Sj7Mc9IZRCdgpxijQ6G05aPjlTdeslGpt2x0XpKk6rtO6RPLj2IN6cCvRBqiKbHy9CxoyRARYFu43E6URDdsFYvOWd2GxcpDnqwQn2SJWU-Xq4HD-5ZiomoA',
    };
  });

  const [aggression, setAggression] = useState(() => {
    const saved = localStorage.getItem('adminAggression');
    return saved !== null ? parseInt(saved, 10) : 75;
  });

  const [detectors, setDetectors] = useState(() => {
    const saved = localStorage.getItem('adminDetectors');
    return saved ? JSON.parse(saved) : {
      face: true,
      eye: true,
      audio: false,
      multiDisplay: true,
    };
  });

  const { isDarkMode: darkMode, toggleTheme } = useTheme();

  const [alerts, setAlerts] = useState(() => {
    return localStorage.getItem('adminAlerts') !== 'false';
  });
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const toggleDetector = (key) => {
    setDetectors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const aggressionClass =
    aggression < 30
      ? 'bg-slate-800/50 text-white'
      : aggression < 70
      ? 'bg-primary/10 text-primary'
      : 'bg-error/10 text-error';

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((p) => ({ ...p, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    localStorage.setItem('adminProfile', JSON.stringify(profile));
    localStorage.setItem('adminAggression', aggression.toString());
    localStorage.setItem('adminDetectors', JSON.stringify(detectors));
    localStorage.setItem('adminAlerts', alerts.toString());
    showToast('Settings saved successfully.');
  };

  return (
    <AdminLayout>
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-white">System Settings</h2>
          <p className="text-slate-300 font-body-md text-body-md">Configure AI sensitivity, security protocols, and administrator profile preferences.</p>
        </div>
        <button
          onClick={handleSave}
          className="btn-primary px-lg py-sm rounded-xl flex items-center gap-sm font-label-md text-label-md active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">save</span> Save Changes
        </button>
      </header>

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-lg transition-colors duration-300 ${darkMode ? 'bg-slate-900 -mx-xl px-xl py-lg rounded-2xl' : ''}`}>
        {/* Left Column: Profile & Appearance */}
        <div className="lg:col-span-4 flex flex-col gap-lg">
          {/* Profile Card */}
          <div className={`glass-card rounded-2xl p-lg ${darkMode ? '!bg-slate-800/80 !border-slate-700' : ''}`}>
            <h3 className={`font-title-lg text-title-lg mb-md ${darkMode ? 'text-white' : 'text-white'}`}>Admin Profile</h3>
            <div className="flex flex-col items-center gap-md py-md">
              <div className="relative">
                <img
                  className="w-24 h-24 rounded-full object-cover border-4 border-surface-container"
                  alt="Admin profile"
                  src={profile.avatar}
                />
                <label className="absolute bottom-0 right-0 bg-primary text-on-primary p-xs rounded-full shadow-lg border-2 border-white cursor-pointer hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <div className="text-center">
                <p className={`font-title-lg ${darkMode ? 'text-white' : 'text-white'}`}>{profile.name}</p>
                <p className={`font-label-md ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>{profile.email}</p>
              </div>
            </div>
            <div className="space-y-sm mt-md">
              <label className={`font-label-md block ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>Full Name</label>
              <input
                className="w-full bg-slate-900/60 border border-outline-variant/50 rounded-lg px-md py-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
              <label className={`font-label-md block pt-sm ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>Email</label>
              <input
                className="w-full bg-slate-900/60 border border-outline-variant/50 rounded-lg px-md py-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              />
              <label className={`font-label-md block pt-sm ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>Role</label>
              <div className="w-full bg-slate-800/50 border border-outline-variant/30 rounded-lg px-md py-sm text-slate-300 font-mono-sm">
                {profile.role}
              </div>
            </div>
          </div>

          {/* Appearance Card */}
          <div className={`glass-card rounded-2xl p-lg ${darkMode ? '!bg-slate-800/80 !border-slate-700' : ''}`}>
            <h3 className={`font-title-lg text-title-lg mb-md ${darkMode ? 'text-white' : 'text-white'}`}>Appearance</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">contrast</span>
                <span className={`font-body-md ${darkMode ? 'text-white' : 'text-white'}`}>Dark Mode</span>
              </div>
              <Toggle checked={darkMode} onChange={toggleTheme} />
            </div>
            <p className={`font-body-md mt-sm ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>Reduce eye strain during late-night monitoring sessions. (Preview scoped to this page.)</p>

            <div className="flex items-center justify-between mt-lg pt-lg border-t border-outline-variant/20">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">notifications</span>
                <span className={`font-body-md ${darkMode ? 'text-white' : 'text-white'}`}>Enable Alerts</span>
              </div>
              <Toggle checked={alerts} onChange={() => setAlerts((a) => !a)} />
            </div>
            <p className={`font-body-md mt-sm ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>Receive real-time push notifications for critical violations.</p>
          </div>
        </div>

        {/* Right Column: AI Sensitivity & Detection */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* AI Aggression Card */}
          <div className={`glass-card rounded-2xl p-lg ${darkMode ? '!bg-slate-800/80 !border-slate-700' : ''}`}>
            <div className="flex justify-between items-center mb-md">
              <h3 className={`font-title-lg text-title-lg ${darkMode ? 'text-white' : 'text-white'}`}>AI Global Aggression</h3>
              <span className={`${aggressionClass} px-md py-xs rounded-full font-mono-sm font-bold`}>{aggression}%</span>
            </div>
            <p className={`font-body-md mb-md ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>
              Controls how sensitively the AI proctor flags anomalies across all active sessions. Higher values catch more but risk false positives.
            </p>
            <input
              type="range"
              min="0"
              max="100"
              value={aggression}
              onChange={(e) => setAggression(Number(e.target.value))}
              className="ai-slider"
            />
            <div className={`flex justify-between text-[11px] mt-xs ${darkMode ? 'text-slate-500' : 'text-slate-300/60'}`}>
              <span>Lenient</span>
              <span>Balanced</span>
              <span>Strict</span>
            </div>
          </div>

          {/* Detection Toggles Card */}
          <div className={`glass-card rounded-2xl p-lg ${darkMode ? '!bg-slate-800/80 !border-slate-700' : ''}`}>
            <h3 className={`font-title-lg text-title-lg mb-md ${darkMode ? 'text-white' : 'text-white'}`}>Detection Modules</h3>
            <div className="divide-y divide-outline-variant/20">
              <div className="flex items-center justify-between py-md">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-primary bg-primary/10 p-sm rounded-lg">face</span>
                  <div>
                    <p className={`font-body-md font-medium ${darkMode ? 'text-white' : 'text-white'}`}>Face Detection</p>
                    <p className={`text-[12px] ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>Confirms the registered candidate remains in frame.</p>
                  </div>
                </div>
                <Toggle checked={detectors.face} onChange={() => toggleDetector('face')} />
              </div>
              <div className="flex items-center justify-between py-md">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-secondary bg-secondary/10 p-sm rounded-lg">visibility</span>
                  <div>
                    <p className={`font-body-md font-medium ${darkMode ? 'text-white' : 'text-white'}`}>Eye Tracking</p>
                    <p className={`text-[12px] ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>Flags prolonged gaze deviation from the screen.</p>
                  </div>
                </div>
                <Toggle checked={detectors.eye} onChange={() => toggleDetector('eye')} />
              </div>
              <div className="flex items-center justify-between py-md">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-tertiary bg-tertiary/10 p-sm rounded-lg">mic</span>
                  <div>
                    <p className={`font-body-md font-medium ${darkMode ? 'text-white' : 'text-white'}`}>Audio Monitoring</p>
                    <p className={`text-[12px] ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>Detects background conversations or unauthorized audio.</p>
                  </div>
                </div>
                <Toggle checked={detectors.audio} onChange={() => toggleDetector('audio')} />
              </div>
              <div className="flex items-center justify-between py-md">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-error bg-error/10 p-sm rounded-lg">desktop_windows</span>
                  <div>
                    <p className={`font-body-md font-medium ${darkMode ? 'text-white' : 'text-white'}`}>Multi-Display Detection</p>
                    <p className={`text-[12px] ${darkMode ? 'text-slate-400' : 'text-slate-300'}`}>Flags additional connected monitors during a session.</p>
                  </div>
                </div>
                <Toggle checked={detectors.multiDisplay} onChange={() => toggleDetector('multiDisplay')} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-lg left-1/2 -translate-x-1/2 z-50 toast-animate bg-on-surface text-surface px-lg py-sm rounded-xl shadow-2xl font-label-md text-label-md">
          {toast}
        </div>
      )}
    </AdminLayout>
  );
};

export default SystemSettings;
