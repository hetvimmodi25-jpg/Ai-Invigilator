import React, { createContext, useState, useCallback } from 'react';
import {
  loginStudent,
  logoutStudent,
  getStudentSession,
  registerStudent,
  loginAdmin,
  logoutAdmin,
  getAdminSession,
} from '../services/authService.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [student, setStudent] = useState(() => getStudentSession());
  const [admin, setAdmin] = useState(() => getAdminSession());

  const studentLogin = useCallback(async (credentials) => {
    const session = await loginStudent(credentials);
    setStudent(session);
    return session;
  }, []);

  const studentRegister = useCallback(async (data) => {
    return registerStudent(data);
  }, []);

  const studentLogout = useCallback(() => {
    logoutStudent();
    setStudent(null);
  }, []);

  const adminLogin = useCallback(async (credentials) => {
    const session = await loginAdmin(credentials);
    setAdmin(session);
    return session;
  }, []);

  const adminLogout = useCallback(() => {
    logoutAdmin();
    setAdmin(null);
  }, []);

  const value = {
    student,
    isStudentAuthenticated: Boolean(student),
    studentLogin,
    studentRegister,
    studentLogout,
    admin,
    isAdminAuthenticated: Boolean(admin),
    adminLogin,
    adminLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
