import React from 'react';
import AdminSidebar from './AdminSidebar.jsx';

/**
 * Wraps every admin page (Dashboard, Live Monitoring, Reports, Violations,
 * Settings) with the same persistent sidebar and the same `.theme-admin`
 * scoped design tokens already used by AdminOverview / AdminLogin, so the
 * fonts/colors of the existing admin theme never drift page to page.
 */
const AdminLayout = ({ children, protectedMode = true }) => {
  return (
    <div className="theme-admin admin-overview-root text-white bg-slate-950 dark min-h-screen" style={{ backgroundColor: '#020617' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .admin-overview-root {
            font-family: 'Inter', sans-serif;
        }
        .glass-card {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(71, 85, 105, 0.5);
            transition: all 0.3s ease;
        }
        .glass-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .status-pill {
            padding: 2px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .btn-primary {
            background: linear-gradient(135deg, #004ac6 0%, #712ae2 100%);
            color: white;
            transition: transform 0.2s;
        }
        .btn-primary:active {
            transform: scale(0.95);
        }
        .switch-toggle {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
            flex-shrink: 0;
        }
        .switch-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider-round {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #c3c6d7;
            transition: .4s;
            border-radius: 34px;
        }
        .slider-round:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider-round {
            background-color: #004ac6;
        }
        input:checked + .slider-round:before {
            transform: translateX(20px);
        }
        input[type="range"].ai-slider {
            -webkit-appearance: none;
            width: 100%;
            background: transparent;
        }
        input[type="range"].ai-slider::-webkit-slider-runnable-track {
            width: 100%;
            height: 6px;
            cursor: pointer;
            background: #d8e3fb;
            border-radius: 3px;
        }
        input[type="range"].ai-slider::-webkit-slider-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #004ac6;
            cursor: pointer;
            -webkit-appearance: none;
            margin-top: -7px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #c3c6d7;
            border-radius: 10px;
        }
        @keyframes toastSlideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .toast-animate {
          animation: toastSlideUp 0.3s ease-out forwards;
        }
      `,
        }}
      />

      <AdminSidebar protectedMode={protectedMode} />

      <main className="ml-[280px] min-h-screen p-xl flex flex-col gap-lg">{children}</main>
    </div>
  );
};

export default AdminLayout;
