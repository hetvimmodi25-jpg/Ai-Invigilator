import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Response interceptor to extract human-readable error message from backend
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

export default API;