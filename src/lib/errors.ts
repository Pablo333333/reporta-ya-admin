import axios from 'axios';

/**
 * Extrae un mensaje legible desde errores de Axios / fetch / genéricos.
 */
export function extractApiErrorMessage(
  err: unknown,
  fallback = 'Ocurrió un error inesperado',
): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;

    const raw = data?.message ?? data?.error;
    let detail = '';
    if (Array.isArray(raw)) detail = raw.join(' · ');
    else if (typeof raw === 'string') detail = raw;

    if (status === 401) {
      return detail || 'Sesión expirada. Volvé a iniciar sesión.';
    }
    if (status === 403) {
      return (
        detail ||
        'No tenés permisos para esta acción (se requiere rol SUPERVISOR).'
      );
    }
    if (status === 400 || status === 422) {
      return detail || 'Datos inválidos. Revisá el formulario.';
    }
    if (status === 404) {
      return detail || 'Recurso no encontrado.';
    }
    if (!err.response) {
      return 'No se pudo conectar con el servidor. Verificá la conexión o la URL del API.';
    }
    if (detail) {
      return status ? `(${status}) ${detail}` : detail;
    }
    return status ? `Error del servidor (${status})` : fallback;
  }

  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
