import API from "./api";

export async function loginAdmin(credentials) {
  const response = await API.post("/admin/login", {
    email: credentials.email,
    password: credentials.password,
  });

  localStorage.setItem("adminToken", response.data.token);
  localStorage.setItem("admin", JSON.stringify(response.data.admin));

  return response.data.admin;
}

export function logoutAdmin() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("admin");
}

export function getAdminSession() {
  const admin = localStorage.getItem("admin");
  return admin ? JSON.parse(admin) : null;
}