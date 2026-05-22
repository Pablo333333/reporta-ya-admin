// ─── Enumeraciones ─────────────────────────────────────────────────────────────

export type RolName = 'REPORTANTE' | 'RESPONSABLE' | 'SUPERVISOR' | string;

// ─── Configuración Dinámica ────────────────────────────────────────────────────

export interface ConfigCategoria {
  id: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  icono?: string;
  activo: boolean;
  camposExtra?: ConfigCampoExtra[];
}

export interface ConfigCampoExtra {
  id: string;
  nombre: string;
  tipo: 'TEXT' | 'NUMBER' | 'BOOLEAN';
  requerido: boolean;
  categoriaId: string;
}

export interface ConfigEstado {
  id: string;
  nombre: string;
  color?: string;
  esFinal: boolean;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
}

export interface ConfigPrioridad {
  id: string;
  nombre: string;
  color?: string;
  nivel: number;
  activo: boolean;
}

export interface ConfigSistema {
  id: string;
  clave: string;
  valor: string;
  descripcion?: string;
}

// ─── Modelos ───────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  email: string;
  rolId: string;
  rol: Rol;
  pushToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
  permisos?: RolPermiso[];
}

export interface Permiso {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface RolPermiso {
  rolId: string;
  permisoId: string;
  permiso: Permiso;
}

export interface Reporte {
  id: string;
  categoriaId: string;
  categoria: ConfigCategoria;
  estadoId: string;
  estado: ConfigEstado;
  prioridadId: string;
  prioridad: ConfigPrioridad;
  comentario?: string;
  fotoUrl?: string;
  latitud: number;
  longitud: number;
  fechaCreacion: string;
  updatedAt: string;
  comentarioResolucion?: string;
  fotoEvidenciaUrl?: string;
  sincronizadoEn?: string | null;
  valoresCamposExtra?: any;
  reportanteId: string;
  reportante?: Omit<Usuario, 'pushToken'>;
  indiceRiesgo?: number;
}

export interface Comunicado {
  id: string;
  mensaje: string;
  fechaPublicacion: string;
  duracionRestriccion?: number | null;
  responsableId: string;
  responsable?: Pick<Usuario, 'id' | 'email'>;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
}

export interface JwtUser {
  sub: string;
  email: string;
  rol: string;
  iat: number;
  exp: number;
}

export interface Territorio {
  id: string;
  nombre: string;
  descripcion?: string;
}
