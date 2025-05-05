import axios from "axios";

const api = axios.create({
  baseURL: "https://hospedagem-tixup-back-end.onrender.com" + "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tixup_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
