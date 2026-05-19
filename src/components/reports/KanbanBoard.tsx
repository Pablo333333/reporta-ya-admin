'use client';

import React from 'react';
import type { ConfigEstado, Reporte } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  reports: Reporte[];
  estados: ConfigEstado[];
  onUpdate: (id: string, estadoId: string) => Promise<void>;
}

export default function KanbanBoard({ reports, estados, onUpdate }: Props) {
  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {estados.map((estado) => {
        const reportsInEstado = reports.filter((r) => r.estadoId === estado.id);
        
        return (
          <div 
            key={estado.id} 
            className="flex-shrink-0 w-80 bg-slate-100 rounded-2xl flex flex-col max-h-full border border-slate-200"
          >
            {/* Header Columna */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: estado.color || '#000' }} 
                />
                <h3 className="font-bold text-slate-700">{estado.nombre}</h3>
              </div>
              <span className="bg-white px-2 py-0.5 rounded-lg text-xs font-bold text-slate-400 border border-slate-200">
                {reportsInEstado.length}
              </span>
            </div>

            {/* Lista de Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {reportsInEstado.map((r) => (
                <div 
                  key={r.id} 
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-primary-300 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                    {r.categoria.nombre}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mb-2">
                    {r.comentario || 'Sin comentario'}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400">
                      {format(parseISO(r.fechaCreacion), 'dd MMM', { locale: es })}
                    </span>
                    <span 
                      className="text-[10px] font-bold"
                      style={{ color: r.prioridad.color }}
                    >
                      {r.prioridad.nombre}
                    </span>
                  </div>
                </div>
              ))}
              {reportsInEstado.length === 0 && (
                <div className="h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                  <p className="text-xs text-slate-400 font-medium">Sin reportes</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
