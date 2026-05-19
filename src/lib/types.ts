// ─── Enumeraciones ─────────────────────────────────────────────────────────────

export type Rol = 'REPORTANTE' | 'RESPONSABLE' | 'SUPERVISOR';

// ─── Configuración Dinámica ────────────────────────────────────────────────────

export interface ConfigCategoria {
  id: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  icono?: string;
  activo: boolean;
}

export interface ConfigEstado {
  id: string;
  nombre: string;
  color?: string;
  esFinal: boolean;
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
  rol: Rol;
  pushToken?: string | null;
  createdAt: string;
  updatedAt: string;
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
  reportanteId: string;
  reportante?: Omit<Usuario, 'pushToken'>;
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
  rol: Rol;
  iat: number;
  exp: number;
}
