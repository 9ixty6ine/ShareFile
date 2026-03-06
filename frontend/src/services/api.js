import axios from "axios";
// VITE_API_URL: set in Vercel env vars if backend is on a different domain.
// Leave unset when using root vercel.json proxy (relative /api works in that case).
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((r) => r, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    window.location.href = "/login";
  }
  return Promise.reject(error);
});
export const authAPI = { register: (d) => api.post("/auth/register", d), login: (d) => api.post("/auth/login", d), getMe: () => api.get("/auth/me") };
export const filesAPI = {
  upload: (formData, onProgress) => api.post("/files/upload", formData, { headers: { "Content-Type": "multipart/form-data" }, onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)) }),
  list: () => api.get("/files"),
  delete: (id) => api.delete(`/files/${id}`),
};
export const shareAPI = {
  create: (d) => api.post("/share/create", d),
  list: () => api.get("/share"),
  getInfo: (token) => axios.get(`/api/share/${token}/info`),
  download: (token, password) => axios.post(`/api/share/${token}/download`, { password }, { responseType: "blob" }),
  revoke: (id) => api.delete(`/share/${id}`),
};
export const analyticsAPI = { get: () => api.get("/analytics") };
export default api;