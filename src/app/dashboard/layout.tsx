'use client';

import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import NewReportModal from '@/components/reports/NewReportModal';
import { Plus } from 'lucide-react';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard/mapa':         { title: 'Mapa de Incidentes',   subtitle: 'Vista geográfica de todos los reportes activos' },
  '/dashboard/reportes':     { title: 'Reportes',             subtitle: 'Gestión y seguimiento de incidentes viales' },
  '/dashboard/estadisticas': { title: 'Estadísticas',         subtitle: 'KPIs operativos y zonas con mayor índice de riesgo' },
  '/dashboard/comunicados':  { title: 'Comunicados',          subtitle: 'Alertas y avisos para la app móvil' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [showNewReport, setShowNewReport] = useState(false);

  const meta = PAGE_META[pathname] ?? { title: 'Panel Admin', subtitle: '' };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} onLogout={logout} />

      <div className="pl-64 flex flex-col min-h-screen">
        <Header title={meta.title} subtitle={meta.subtitle}>
          <button
            onClick={() => setShowNewReport(true)}
            className="btn-primary gap-1.5 px-3 py-1.5 text-xs shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo Reporte
          </button>
        </Header>
        <main className="flex-1 p-6">{children}</main>
      </div>

      {showNewReport && (
        <NewReportModal
          onClose={() => setShowNewReport(false)}
          onSuccess={() => {
            setShowNewReport(false);
            // Esto refrescará la página actual si es necesario, 
            // aunque el estado interno del componente hijo podría no verse afectado sin un reload
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
