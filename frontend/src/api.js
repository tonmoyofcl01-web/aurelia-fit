import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url || "");
    if (error.response?.status === 401 && !requestUrl.includes("/auth/login")) {
      window.dispatchEvent(new Event("aurelia:unauthorized"));
    }
    return Promise.reject(error);
  },
);
