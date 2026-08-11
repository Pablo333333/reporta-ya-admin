'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  BarChart2,
  Bell,
  LogOut,
  Map,
  ShieldCheck,
  FileText,
  Settings,
  History,
  FormInput,
  Flag,
  ListOrdered,
  SlidersHorizontal,
  MessageSquareText,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { JwtUser } from '@/lib/types';
import { ConfigAPI } from '@/lib/api';

const OPS_ITEMS = [
  { href: '/dashboard/mapa', label: 'Mapa de Incidentes', Icon: Map },
  { href: '/dashboard/reportes', label: 'Reportes', Icon: FileText },
  { href: '/dashboard/estadisticas', label: 'Estadísticas', Icon: BarChart2 },
  { href: '/dashboard/comunicados', label: 'Comunicados', Icon: Bell },
  { href: '/dashboard/auditoria', label: 'Auditoría', Icon: History },
];

const CONFIG_ITEMS = [
  { href: '/dashboard/configurador/sistema', label: 'Config. Sistema', Icon: SlidersHorizontal },
  { href: '/dashboard/configurador/mensajes-auto', label: 'Mensajes auto', Icon: MessageSquareText },
  { href: '/dashboard/configurador/campos', label: 'Constructor Formularios', Icon: FormInput },
  { href: '/dashboard/configurador/estados', label: 'Estados', Icon: Flag },
  { href: '/dashboard/configurador/prioridades', label: 'Prioridades', Icon: ListOrdered },
  { href: '/dashboard/configurador/roles', label: 'Roles y Permisos', Icon: ShieldCheck },
];

interface SidebarProps {
  user: JwtUser;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [appName, setAppName] = useState('Reporta Ya');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    ConfigAPI.getSistema()
      .then((res) => {
        const name = res.data.find((c) => c.clave === 'NOMBRE_APP')?.valor;
        const logo = res.data.find((c) => c.clave === 'LOGO_URL')?.valor;
        if (name) setAppName(name);
        if (logo) setLogoUrl(logo);
      })
      .catch(() => {});
  }, []);

  const isSupervisor = user.rol === 'SUPERVISOR';

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-white" />
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">{appName}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Panel Control
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Operación
        </p>
        {OPS_ITEMS.map(({ href, label, Icon }) => {
          const active =
            href === '/dashboard/reportes'
              ? pathname.startsWith(href) && !pathname.includes('configurador')
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Icon
                className={clsx(
                  'h-4 w-4 flex-shrink-0',
                  active ? 'text-primary-600' : 'text-slate-400',
                )}
              />
              {label}
            </Link>
          );
        })}

        {isSupervisor ? (
          <>
            <p className="px-3 mt-5 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Configuración
            </p>
            {CONFIG_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  <Icon
                    className={clsx(
                      'h-4 w-4 flex-shrink-0',
                      active ? 'text-primary-600' : 'text-slate-400',
                    )}
                  />
                  {label}
                </Link>
              );
            })}
          </>
        ) : (
          <div className="mt-5 mx-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Settings className="h-3.5 w-3.5" />
              <p className="text-[11px] font-bold uppercase tracking-wide">Configuración</p>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Disponible solo para rol <strong>SUPERVISOR</strong>. Tu rol: {user.rol}.
            </p>
            {/* Acceso de solo lectura al constructor (puede ver campos) */}
            <Link
              href="/dashboard/configurador/campos"
              className="mt-2 inline-flex text-[11px] font-bold text-primary-600 hover:text-primary-800"
            >
              Ver constructor (solo lectura) →
            </Link>
          </div>
        )}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-sm select-none">
            {user.email[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate">{user.email}</p>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 mt-0.5">
              {user.rol}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
