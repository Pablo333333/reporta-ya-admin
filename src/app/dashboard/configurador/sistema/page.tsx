'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Settings2, FormInput, Flag, ListOrdered, Shield } from 'lucide-react';
import SistemaConfigModule from '@/components/config/SistemaConfigModule';

export default function SistemaConfigPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Configuración del Sistema
          </h1>
          <p className="text-slate-500 font-medium">
            Parámetros globales, categorías y accesos al resto del configurador
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ConfigQuickLink
          href="/dashboard/configurador/campos"
          icon={<FormInput className="h-4 w-4" />}
          title="Constructor"
          subtitle="Campos personalizados"
        />
        <ConfigQuickLink
          href="/dashboard/configurador/estados"
          icon={<Flag className="h-4 w-4" />}
          title="Estados"
          subtitle="Flujo de reportes"
        />
        <ConfigQuickLink
          href="/dashboard/configurador/prioridades"
          icon={<ListOrdered className="h-4 w-4" />}
          title="Prioridades"
          subtitle="Riesgo y reglas de negocio"
        />
        <ConfigQuickLink
          href="/dashboard/configurador/mensajes-auto"
          icon={<Settings2 className="h-4 w-4" />}
          title="Mensajes auto"
          subtitle="Plantillas de notificaciones"
        />
        <ConfigQuickLink
          href="/dashboard/configurador/roles"
          icon={<Shield className="h-4 w-4" />}
          title="Roles"
          subtitle="Permisos RBAC"
        />
      </div>

      <SistemaConfigModule />
    </div>
  );
}

function ConfigQuickLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="card p-4 flex items-start gap-3 hover:border-primary-200 hover:shadow-md transition-all border border-slate-100"
    >
      <div className="p-2 rounded-xl bg-primary-50 text-primary-600">{icon}</div>
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>
      </div>
      <Settings2 className="h-3.5 w-3.5 text-slate-300 ml-auto mt-1" />
    </Link>
  );
}
