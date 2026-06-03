import { jwtDecode } from 'jwt-decode';
import type { JwtUser, Rol } from './types';

export const ADMIN_ROLES: Rol[] = ['RESPONSABLE' as unknown as Rol, 'SUPERVISOR' as unknown as Rol];
const TOKEN_KEY = 'admin_token';

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  // También en cookie para que el middleware de Next.js pueda leerlo
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export function getCurrentUser(): JwtUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const user = jwtDecode<JwtUser>(token);
    if (user.exp * 1000 < Date.now()) {
      removeToken();
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function isAdminUser(): boolean {
  const user = getCurrentUser();
  return user !== null && ADMIN_ROLES.includes(user.rol as unknown as Rol);
}
