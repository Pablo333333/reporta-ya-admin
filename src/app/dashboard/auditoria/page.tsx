'use client';

import { useEffect, useState, useCallback } from 'react';
import { ConfigAPI } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, User, Activity, Clock, Database } from 'lucide-react';
import Header from '@/components/layout/Header';

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ usuarioId: '', accion: '' });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ConfigAPI.getLogs(filtros);
      setLogs(res.data);
    } catch (err) {
      console.error('Error cargando logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="flex flex-col h-full space-y-6">
      <Header 
        title="Auditoría y Trazabilidad" 
        subtitle="Registro forense de todas las acciones realizadas en la plataforma"
        onRefresh={loadLogs}
        refreshing={loading}
      />

      {/* Filtros */}
      <div className="card p-4 mx-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Filtrar por acción (ej: LOGIN, UPDATE_STATUS)..."
              value={filtros.accion}
              onChange={(e) => setFiltros(f => ({ ...f, accion: e.target.value }))}
            />
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Filtrar por ID de Usuario..."
              value={filtros.usuarioId}
              onChange={(e) => setFiltros(f => ({ ...f, usuarioId: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="card mx-6 flex-1 overflow-hidden flex flex-col mb-6">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Fecha y Hora</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Acción</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Entidad</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8 bg-slate-50/30" />
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-600 font-medium">
                          {format(parseISO(log.fecha), 'dd/MM/yy HH:mm:ss', { locale: es })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{log.usuario?.email || 'Sistema'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.usuarioId || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-black uppercase border border-slate-200">
                        <Activity className="h-3 w-3" />
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">{log.entidad}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({log.entidadId})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded border border-slate-100">
                        {JSON.stringify(log.detalles)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Mostrando los últimos {logs.length} eventos de seguridad
          </p>
        </div>
      </div>
    </div>
  );
}
