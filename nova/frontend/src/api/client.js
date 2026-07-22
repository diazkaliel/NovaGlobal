import axios from 'axios'
import { isLocalHost } from '../utils/system'

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const host = window.location.hostname;
  const port = window.location.port;
  
  // Si estamos en localhost, 127.0.0.1, IP local, o usando un puerto de desarrollo (ej. :5173)
  if (isLocalHost(host) || port) {
    return `http://${host}:8000`;
  }
  // Extraemos el dominio raíz (ej: novalogtecnologies.com) ignorando cualquier subdominio
  const parts = host.split('.');
  const rootDomain = parts.slice(-2).join('.');
  return `https://api.${rootDomain}`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: agrega el token automáticamente a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor: si el token expira, redirige al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api