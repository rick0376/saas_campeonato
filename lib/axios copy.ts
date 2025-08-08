// lib/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  withCredentials: true, // ✅ MANTIDO: Importante para cookies de sessão
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // ✅ NOVO: Timeout de 10 segundos
});

// ✅ MELHORADO: Interceptor para logs mais informativos
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`,
        config.data ? { data: config.data } : ""
      );
    }
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `✅ API Response: ${response.status} ${response.config.url}`,
        response.data?.message || ""
      );
    }
    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `❌ API Error: ${error.response?.status} ${error.config?.url}`,
        error.response?.data || error.message
      );
    }
    return Promise.reject(error);
  }
);

export default api;
