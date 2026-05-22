'use client';

import { RefreshCw } from 'lucide-react';
import ProjectSelector from './ProjectSelector';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
}

export default function Header({ title, subtitle, onRefresh, refreshing, children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <ProjectSelector />
          {children}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="btn-secondary gap-1.5 px-3 py-1.5 text-xs"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
