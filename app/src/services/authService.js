import API from "./api";

// Student Registration
export async function registerStudent(data) {
  const response = await API.post("/auth/register", data);
  return response.data;
}

// Student Login

export async function loginStudent(credentials) {
  const response = await API.post("/auth/login", credentials);
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("student", JSON.stringify(response.data.student));

    return response.data.student;
}
// Student Logout
export function logoutStudent() {
  localStorage.removeItem("token");
  localStorage.removeItem("student");
}

// Student Session
export function getStudentSession() {
  const student = localStorage.getItem("student");
  return student ? JSON.parse(student) : null;
}

// Forgot Password Flow
export async function requestPasswordReset(contact) {
  const response = await API.post("/auth/forgot-password", { contact });
  return response.data;
}

export async function verifyOTP(contact, otp) {
  const response = await API.post("/auth/verify-otp", { contact, otp });
  return response.data;
}

export async function resetPassword(resetToken, newPassword) {
  const response = await API.post("/auth/reset-password", { resetToken, newPassword });
  return response.data;
}

// Baseline Photo Update
export async function updateBaselinePhoto(studentId, profilePhoto) {
  const response = await API.put("/auth/profile-photo", {
    student_id: studentId,
    profile_photo: profilePhoto
  });
  if (response.data && response.data.student) {
    localStorage.setItem("student", JSON.stringify(response.data.student));
  }
  return response.data;
}

// Admin
export {
  loginAdmin,
  logoutAdmin,
  getAdminSession,
} from "./adminService";

// Exam
export async function startExam(data) {
  const response = await API.post("/exam/start", data);
  return response.data;
}

export async function getQuestions(examId, studentId) {
    const url = studentId ? `/exam/questions/${examId}?student_id=${studentId}` : `/exam/questions/${examId}`;
    const response = await API.get(url);
    return response.data.questions;
}

export async function reportViolation(data) {
    const response = await API.post("/exam/violation", data);
    return response.data;
}

export async function logProctorIncident(data) {
    const response = await API.post("/proctor/incident", data);
    return response.data;
}

export async function uploadScreenshot(data) {
    const response = await API.post("/proctor/screenshot", data);
    return response.data;
}

export async function submitResult(data) {
    const response = await API.post(
        "/result/submit",
        data
    );

    return response.data;
}
export const getAllResults = async () => {
    const response = await fetch(
        "http://localhost:5000/api/result/all"
    );

    return await response.json();
};

export const getAllIncidents = async () => {
    const response = await fetch("http://localhost:5000/api/proctor/incidents");
    return await response.json();
};

export const updateIncidentStatus = async (id, status) => {
    const response = await fetch(`http://localhost:5000/api/proctor/incident/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
    });
    return await response.json();
};

export const pingLiveSession = async (data) => {
    const response = await fetch("http://localhost:5000/api/proctor/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return await response.json();
};

export const getLiveSessions = async () => {
    const response = await fetch("http://localhost:5000/api/proctor/live");
    return await response.json();
};

export const getStudentLiveFeed = async (studentId) => {
    const response = await fetch(`http://localhost:5000/api/proctor/live-feed/${studentId}`);
    return await response.json();
};

export const endLiveSession = async (studentId) => {
    const response = await fetch(`http://localhost:5000/api/proctor/live/${studentId}`, {
        method: "DELETE"
    });
    return await response.json();
};

export const sendNotification = async (studentId, message) => {
    const response = await fetch(`http://localhost:5000/api/proctor/notify/${studentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
    });
    return await response.json();
};

export const flagLiveSession = async (studentId) => {
    const response = await fetch(`http://localhost:5000/api/proctor/flag/${studentId}`, {
        method: "POST"
    });
    return await response.json();
};

export const getDashboardStats = async () => {
    const response = await fetch("http://localhost:5000/api/proctor/dashboard");
    return await response.json();
};

export const createSession = async (data) => {
    const response = await fetch("http://localhost:5000/api/proctor/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return await response.json();
};