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
  latitud?: number | null;
  longitud?: number | null;
  radioMetros?: number | null;
  zona?: string | null;
  responsableId: string;
  responsable?: Pick<Usuario, 'id' | 'email'>;
}

export interface ConfigMensajeAuto {
  id: string;
  tipo: string;
  plantilla: string;
  activo: boolean;
  descripcion?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

// ─── Analytics ─────────────────────────────────────────────────────────────────

export interface ReportsAnalytics {
  periodo: { from: string; to: string };
  kpis: {
    total: number;
    pendientes: number;
    enProceso: number;
    solucionados: number;
    reabiertos: number;
    tiempoAtencion: {
      promedioHoras: number | null;
      medianaHoras: number | null;
      p90Horas: number | null;
      nMuestra: number;
    };
  };
  porCategoria: Array<{
    categoriaId: string;
    nombre: string;
    total: number;
    abiertos: number;
  }>;
  porZona: Array<{
    zona: string;
    total: number;
    abiertos: number;
    indiceRiesgoPromedio: number;
  }>;
  rankingResponsables: Array<{
    usuarioId: string;
    email: string;
    resueltos: number;
    reaperturas: number;
    tiempoMedioHoras: number | null;
  }>;
  tendenciaDiaria: Array<{ fecha: string; total: number }>;
  /** Cruce tipología × zona: qué categorías aparecen en cada zona */
  problemasPorZona?: Array<{
    zona: string;
    categoriaId: string;
    categoriaNombre: string;
    total: number;
    abiertos: number;
  }>;
  estadosDisponibles?: Array<{ id: string; nombre: string; esFinal: boolean }>;
}
