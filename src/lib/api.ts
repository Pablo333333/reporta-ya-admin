import axios from 'axios';
import type { 
  Comunicado, 
  ConfigCategoria, 
  ConfigEstado, 
  ConfigPrioridad, 
  ConfigSistema, 
  LoginResponse, 
  Reporte, 
  Usuario 
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Inyectar JWT en cada request ─────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Redirigir a /login en 401 ────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      document.cookie = 'admin_token=; path=/; max-age=0';
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ─── API methods ───────────────────────────────────────────────────────────────

export const AuthAPI = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { email, password }),
};

export const ReportsAPI = {
  getAll: (params?: { skip?: number; estadoId?: string }) => 
    apiClient.get<Reporte[]>('/reports', { params }),

  getById: (id: string) => apiClient.get<Reporte>(`/reports/${id}`),

  updateStatus: (id: string, estadoId: string, comentarioResolucion?: string) =>
    apiClient.patch<Reporte>(`/reports/${id}/status`, {
      estadoId,
      ...(comentarioResolucion?.trim() && { comentarioResolucion }),
    }),

  create: (payload: any) =>
    apiClient.post<Reporte>('/reports', payload),
};

export const ConfigAPI = {
  // Categorías
  getCategorias: () => apiClient.get<ConfigCategoria[]>('/config/categorias'),
  createCategoria: (data: Partial<ConfigCategoria>) => apiClient.post<ConfigCategoria>('/config/categorias', data),
  updateCategoria: (id: string, data: Partial<ConfigCategoria>) => apiClient.patch<ConfigCategoria>(`/config/categorias/${id}`, data),
  
  // Estados
  getEstados: () => apiClient.get<ConfigEstado[]>('/config/estados'),
  
  // Prioridades
  getPrioridades: () => apiClient.get<ConfigPrioridad[]>('/config/prioridades'),

  // Sistema
  getSistema: () => apiClient.get<ConfigSistema[]>('/config/sistema'),
  updateSistema: (clave: string, valor: string) => apiClient.patch(`/config/sistema/${clave}`, { valor }),
};

export const ComunicadosAPI = {
  getAll: () => apiClient.get<Comunicado[]>('/comunicados'),

  create: (mensaje: string, duracionRestriccion?: number) =>
    apiClient.post<Comunicado>('/comunicados', {
      mensaje,
      ...(duracionRestriccion && duracionRestriccion > 0 ? { duracionRestriccion } : {}),
    }),
};

export const UsersAPI = {
  getAll: () => apiClient.get<Usuario[]>('/users'),
};
