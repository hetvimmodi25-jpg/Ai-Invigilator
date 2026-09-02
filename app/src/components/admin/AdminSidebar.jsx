import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const NAV_ITEMS = [
  { to: '/admin-dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/admin/ai-generator', icon: 'auto_awesome', label: 'AI Exam Generator' },
  { to: '/admin/live-monitoring', icon: 'videocam', label: 'Live Monitoring' },
  { to: '/admin/violations', icon: 'report_problem', label: 'Violations' },
  { to: '/admin/reports', icon: 'analytics', label: 'Reports' },
];

/**
 * Persistent admin sidebar shared across every /admin/* view.
 * Keeps the exact visual language already established on AdminOverview
 * (glass profile chip, Material Symbols, spacing tokens) so nothing
 * about the existing admin theme is redesigned - this just centralizes
 * the markup so every page shares one nav instance with real routing
 * and active-state highlighting instead of copy-pasted `href="#"` links.
 */
const AdminSidebar = ({ protectedMode = true }) => {
  const navigate = useNavigate();
  const { admin, adminLogout } = useAuth();

  const savedProfile = localStorage.getItem('adminProfile');
  const profile = savedProfile ? JSON.parse(savedProfile) : {
    name: admin?.adminId ? String(admin.adminId) : 'Admin User',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAyP6eNkeINkHiv2rVXT72RvprGD6wbHS3kYi4u1VQhBZkbCYk5a_76clrWpHQrtvzSKptv5Y3FNru91EIe2v0ezo1Z_TR7vrjUgD4YkcNXggP-QhPiIWPGkf55NzFXzUd3Ybvk7OKTav_IklGi-5ZgbxFJzmmFeoXZ7cmDbunopLsVfpddoCO3bdlq9WCs-GXlsyHrkczja3l0qkpWvTpj18Zj7mKEgUI3lzH8lZBWqsOcYovGiEgUYgkfy-f5XFX-oAByqi18jEU'
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    adminLogout();
    window.location.href = '/';
  };

  const linkClasses = ({ isActive }) =>
    [
      'flex items-center gap-md px-md py-sm rounded-lg font-label-md text-label-md',
      'duration-200 ease-in-out transition-all',
      isActive
        ? 'bg-primary/20 text-primary font-bold shadow-sm'
        : 'text-slate-300 hover:bg-slate-800/50 hover:translate-x-1',
    ].join(' ');

  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] z-40 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700 shadow-md flex flex-col py-lg px-md gap-sm">
      <button
        type="button"
        onClick={() => navigate('/')}
        title="Back to Home"
        className="mb-xs px-sm flex items-center gap-md cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all text-left"
      >
        <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-on-primary-container">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary leading-tight">AI-Invigilator</h1>
          <p className="text-slate-300 font-label-md text-label-md">Proctor Console</p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="mb-lg mx-sm flex items-center gap-xs px-md py-sm rounded-lg font-label-md text-label-md text-slate-300 hover:bg-slate-800/50 hover:text-primary transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Home
      </button>

      <nav className="flex-1 flex flex-col gap-xs">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClasses}>
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-md text-label-md">{item.label}</span>
          </NavLink>
        ))}
        <div className="mt-auto border-t border-slate-700 pt-sm">
          <NavLink to="/admin/settings" className={linkClasses}>
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </NavLink>
        </div>
      </nav>

      <div className="mt-xl glass-card rounded-2xl p-md flex items-center gap-md">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800/50-highest">
          <img
            className="w-full h-full object-cover"
            src={profile.avatar}
            alt="Admin user profile"
          />
        </div>
        <div className="overflow-hidden flex-1">
          <p className="font-label-md text-label-md text-white truncate">
            {profile.name}
          </p>
          <p className="font-label-md text-[10px] text-slate-300 truncate">System Administrator</p>
        </div>
        {protectedMode && (
          <button
            onClick={() => setShowLogoutModal(true)}
            title="Log out"
            className="p-xs text-slate-300 hover:text-error hover:bg-error/10 rounded-full transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        )}
      </div>

      {showLogoutModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface p-lg rounded-2xl max-w-sm w-full mx-md shadow-2xl border border-slate-700 transform scale-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-title-lg text-title-lg text-white mb-sm flex items-center gap-sm">
              <span className="material-symbols-outlined text-error">logout</span> Log Out
            </h3>
            <p className="text-slate-300 font-body-md mb-xl">
              Are you sure you want to end your session? Active examinations will continue running autonomously.
            </p>
            <div className="flex justify-end gap-md">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="px-md py-sm rounded-lg font-label-md text-slate-300 hover:bg-slate-800/50-highest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="px-md py-sm rounded-lg font-label-md bg-error text-on-error hover:opacity-90 transition-opacity cursor-pointer"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
};

export default AdminSidebar;
