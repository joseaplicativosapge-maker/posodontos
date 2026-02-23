
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 2000, // Timeout corto para disparar fallbacks rápidos en modo demo
});

// Interceptor para inyectar Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('barber_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar expiración de sesión y errores de conexión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejo de error de red (Servidor no disponible)
    if (!error.response) {
      console.warn("Servidor no detectado. Operando en modo local/demo.");
      // Devolvemos un error personalizado que los servicios pueden identificar
      return Promise.reject({ isNetworkError: true, message: "Network Error" });
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('barber_token');
      // No recargamos para evitar bucles si el backend está caído, solo dejamos que el estado de auth falle
    }
    return Promise.reject(error);
  }
);

export default api;
