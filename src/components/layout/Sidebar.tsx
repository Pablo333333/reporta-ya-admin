'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { BarChart2, Bell, LogOut, Map, ShieldCheck, FileText, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { JwtUser, ConfigSistema } from '@/lib/types';
import { ConfigAPI } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard/mapa',          label: 'Mapa de Incidentes', Icon: Map },
  { href: '/dashboard/reportes',      label: 'Reportes',           Icon: FileText },
  { href: '/dashboard/estadisticas',  label: 'Estadísticas',       Icon: BarChart2 },
  { href: '/dashboard/comunicados',   label: 'Comunicados',        Icon: Bell },
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
    ConfigAPI.getSistema().then(res => {
      const name = res.data.find(c => c.clave === 'NOMBRE_APP')?.valor;
      const logo = res.data.find(c => c.clave === 'LOGO_URL')?.valor;
      if (name) setAppName(name);
      if (logo) setLogoUrl(logo);
    }).catch(() => {});
  }, []);

  const isAdmin = user.rol === 'SUPERVISOR';

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
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Panel Control</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
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
                className={clsx('h-4 w-4 flex-shrink-0', active ? 'text-primary-600' : 'text-slate-400')}
              />
              {label}
            </Link>
          );
        })}

        {/* Configurador (Solo Admin) */}
        {isAdmin && (
          <Link
            href="/dashboard/reportes?tab=config"
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mt-4 border border-dashed border-slate-200',
              pathname.includes('tab=config')
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:bg-slate-50',
            )}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            Configurador
          </Link>
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
