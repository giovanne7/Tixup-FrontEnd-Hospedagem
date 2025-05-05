import axios from "axios";
import cors from 'cors';

const app = express();

app.use(cors({
  origin: 'https://tixupfrontend.vercel.app',
  credentials: true,
}));


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
