import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { StudentProtectedRoute, AdminProtectedRoute } from './components/ProtectedRoute.jsx';

import LandingPage from './pages/LandingPage.jsx';
import StudentLogin from './pages/StudentLogin.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import VerifyOTP from './pages/VerifyOTP.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import ActiveExam from './pages/ActiveExam.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminOverview from './pages/AdminOverview.jsx';
import LiveMonitoring from './pages/admin/LiveMonitoring.jsx';
import ExaminationReports from './pages/admin/ExaminationReports.jsx';
import IntegrityViolations from './pages/admin/IntegrityViolations.jsx';
import SystemSettings from './pages/admin/SystemSettings.jsx';
import AIGenerator from './pages/admin/AIGenerator.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/student-dashboard"
          element={
            <StudentProtectedRoute>
              <StudentDashboard />
            </StudentProtectedRoute>
          }
        />
        <Route
          path="/exam"
          element={
            <StudentProtectedRoute>
              <ActiveExam />
            </StudentProtectedRoute>
          }
        />

        {/* Public preview of the admin dashboard UI (no login required) */}
        <Route path="/admin-overview" element={<AdminOverview protectedMode={false} />} />

        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Real admin dashboard, reached after a successful Admin Login */}
        <Route
          path="/admin-dashboard"
          element={
            <AdminProtectedRoute>
              <AdminOverview protectedMode={true} />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/ai-generator"
          element={
            <AdminProtectedRoute>
              <AIGenerator />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/live-monitoring"
          element={
            <AdminProtectedRoute>
              <LiveMonitoring />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminProtectedRoute>
              <ExaminationReports />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/violations"
          element={
            <AdminProtectedRoute>
              <IntegrityViolations />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminProtectedRoute>
              <SystemSettings />
            </AdminProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
