import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function StudentProtectedRoute({ children }) {
  const { isStudentAuthenticated } = useAuth();
  if (!isStudentAuthenticated) {
    return <Navigate to="/student-login" replace />;
  }
  return children;
}

export function AdminProtectedRoute({ children }) {
  const { isAdminAuthenticated } = useAuth();
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }
  return children;
}
