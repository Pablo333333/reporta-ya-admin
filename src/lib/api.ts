import axios from 'axios';
import type { 
  Comunicado, 
  ConfigCategoria, 
  ConfigEstado, 
  ConfigMensajeAuto,
  ConfigPrioridad, 
  ConfigSistema, 
  LoginResponse,
  Permiso, 
  Reporte, 
  ReportsAnalytics,
  Rol, 
  Territorio,
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
    
    const territorioId = localStorage.getItem('selected_territorio_id');
    if (territorioId) config.headers['x-territorio-id'] = territorioId;
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

  updateStatus: (
    id: string,
    estadoId: string,
    comentarioResolucion?: string,
    categoriaId?: string,
  ) =>
    apiClient.patch<Reporte>(`/reports/${id}/status`, {
      estadoId,
      ...(comentarioResolucion?.trim() && { comentarioResolucion }),
      ...(categoriaId && { categoriaId }),
    }),

  create: (payload: any) =>
    apiClient.post<Reporte>('/reports', payload),

  getAnalytics: (params?: { from?: string; to?: string }) =>
    apiClient.get<ReportsAnalytics>('/reports/analytics', { params }),

  checkSla: () => apiClient.post<{ evaluados: number; incumplidosNuevos: number; alertados: number }>('/reports/check-sla'),
};

export const ConfigAPI = {
  // Categorías
  getCategorias: () => apiClient.get<ConfigCategoria[]>('/config/categorias'),
  createCategoria: (data: Partial<ConfigCategoria>) => apiClient.post<ConfigCategoria>('/config/categorias', data),
  updateCategoria: (id: string, data: Partial<ConfigCategoria>) => apiClient.patch<ConfigCategoria>(`/config/categorias/${id}`, data),
  
  // Estados
  getEstados: () => apiClient.get<ConfigEstado[]>('/config/estados'),
  createEstado: (data: Partial<ConfigEstado>) => apiClient.post<ConfigEstado>('/config/estados', data),
  updateEstado: (id: string, data: Partial<ConfigEstado>) => apiClient.patch<ConfigEstado>(`/config/estados/${id}`, data),
  
  // Prioridades
  getPrioridades: () => apiClient.get<ConfigPrioridad[]>('/config/prioridades'),
  createPrioridad: (data: Partial<ConfigPrioridad>) => apiClient.post<ConfigPrioridad>('/config/prioridades', data),
  updatePrioridad: (id: string, data: Partial<ConfigPrioridad>) => apiClient.patch<ConfigPrioridad>(`/config/prioridades/${id}`, data),

  // Territorios
  getTerritorios: () => apiClient.get<Territorio[]>('/config/territorios'),

  // Sistema
  getSistema: () => apiClient.get<ConfigSistema[]>('/config/sistema'),
  updateSistema: (clave: string, valor: string) => apiClient.patch(`/config/sistema/${clave}`, { valor }),

  // Campos Extra
  createCampoExtra: (data: any) => apiClient.post('/config/campos-extra', data),
  deleteCampoExtra: (id: string) => apiClient.delete(`/config/campos-extra/${id}`),

  // Roles y Permisos
  getRoles: () => apiClient.get<Rol[]>('/config/roles'),
  getPermisos: () => apiClient.get<Permiso[]>('/config/permisos'),
  updateRolPermisos: (rolId: string, permisoIds: string[]) => 
    apiClient.patch(`/config/roles/${rolId}/permisos`, { permisoIds }),

  // Logs de Auditoría
  getLogs: (params?: { usuarioId?: string; accion?: string }) =>
    apiClient.get<any[]>('/config/logs', { params }),

  // Mensajes automáticos
  getMensajesAuto: () => apiClient.get<ConfigMensajeAuto[]>('/config/mensajes-auto'),
  createMensajeAuto: (data: Partial<ConfigMensajeAuto>) =>
    apiClient.post<ConfigMensajeAuto>('/config/mensajes-auto', data),
  updateMensajeAuto: (id: string, data: Partial<ConfigMensajeAuto>) =>
    apiClient.patch<ConfigMensajeAuto>(`/config/mensajes-auto/${id}`, data),
  deleteMensajeAuto: (id: string) => apiClient.delete(`/config/mensajes-auto/${id}`),
};

export const ComunicadosAPI = {
  getAll: () => apiClient.get<Comunicado[]>('/comunicados'),

  create: (payload: {
    mensaje: string;
    duracionRestriccion?: number;
    latitud?: number;
    longitud?: number;
    radioMetros?: number;
    zona?: string;
  }) => apiClient.post<Comunicado>('/comunicados', payload),
};

export const UsersAPI = {
  getAll: () => apiClient.get<Usuario[]>('/users'),
};
