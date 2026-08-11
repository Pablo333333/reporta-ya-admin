'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ConfigAPI, ReportsAPI } from '@/lib/api';
import type { ConfigEstado, Reporte } from '@/lib/types';
import clsx from 'clsx';

const IncidentMap = dynamic(() => import('@/components/map/IncidentMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-100 rounded-xl">
      <div className="text-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Cargando mapa…</p>
      </div>
    </div>
  ),
});

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    const msg = res?.data?.message;
    if (Array.isArray(msg)) return msg.join(' · ');
    if (typeof msg === 'string') return msg;
    if (res?.status === 401) return 'Sesión expirada. Volvé a iniciar sesión.';
    if (res?.status === 403) return 'No tenés permisos para ver los reportes de este territorio.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'No se pudieron cargar los reportes del mapa.';
}

export default function MapaPage() {
  const [reports, setReports] = useState<Reporte[]>([]);
  const [estados, setEstados] = useState<ConfigEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter]   = useState<string>('ALL');
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap'>('markers');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      let finalReports: Reporte[] = [];
      let finalEstados: ConfigEstado[] = [];

      try {
        const { data } = await ReportsAPI.getAll();
        finalReports = Array.isArray(data) ? data : [];
      } catch (err) {
        const message = extractErrorMessage(err);
        setLoadError(message);
        toast.error(message);
        console.error('[Mapa] Error cargando reportes:', err);
      }

      try {
        const { data } = await ConfigAPI.getEstados();
        finalEstados = Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn('[Mapa] Error cargando estados, se derivan de reportes:', err);
        if (finalReports.length > 0) {
          const uniqueEsts = Array.from(
            new Map(finalReports.map((r) => [r.estado?.id, r.estado])).values(),
          ).filter(Boolean) as ConfigEstado[];
          finalEstados = uniqueEsts.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        } else {
          toast.error('No se pudieron cargar los estados del mapa.');
        }
      }

      setReports(finalReports);
      setEstados(finalEstados);
    } catch (error) {
      const message = extractErrorMessage(error);
      setLoadError(message);
      toast.error(message);
      console.error('[Mapa] Error inesperado:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const visible = filter === 'ALL' ? reports : reports.filter((r) => r.estadoId === filter);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-120px)]">
      {/* Toolbar */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mr-2">
          <button
            onClick={() => setMapMode('markers')}
            className={clsx(
              'px-3 py-1.5 text-[10px] font-bold rounded-md transition-all',
              mapMode === 'markers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Incidentes
          </button>
          <button
            onClick={() => setMapMode('heatmap')}
            className={clsx(
              'px-3 py-1.5 text-[10px] font-bold rounded-md transition-all',
              mapMode === 'heatmap' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Calor
          </button>
        </div>

        <span className="text-sm font-medium text-slate-700 mr-1">Filtrar:</span>
        
        <button
          onClick={() => setFilter('ALL')}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            filter === 'ALL'
              ? 'bg-slate-900 text-white ring-2 ring-offset-1 ring-slate-900'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          Todos
        </button>

        {estados.map((estado) => (
          <button
            key={estado.id}
            onClick={() => setFilter(estado.id)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border',
              filter === estado.id
                ? 'ring-2 ring-offset-1'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            )}
            style={filter === estado.id ? { 
              backgroundColor: estado.color || '#64748b', 
              color: '#fff',
              borderColor: estado.color || '#64748b',
              boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${estado.color || '#64748b'}`
            } : {}}
          >
            {estado.nombre}
          </button>
        ))}

        <span className="ml-auto text-xs text-slate-500">
          {loading ? 'Actualizando…' : `${visible.length} incidente${visible.length !== 1 ? 's' : ''} visible${visible.length !== 1 ? 's' : ''}`}
        </span>
        <button onClick={loadData} className="btn-secondary text-xs px-2.5 py-1.5">
          Actualizar
        </button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <button
            onClick={loadData}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 card overflow-hidden">
        <IncidentMap 
          key={`map-page-${mapMode}`}
          reports={visible} 
          mode={mapMode} 
        />
      </div>

      {/* Legend */}
      <div className="card p-3 flex flex-wrap gap-4 text-xs font-medium">
        {estados.map((estado) => (
          <div key={estado.id} className="flex items-center gap-1.5">
            <span 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: estado.color || '#64748b' }}
            />
            <span className="text-slate-600">{estado.nombre}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
