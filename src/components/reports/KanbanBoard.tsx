'use client';

import React from 'react';
import type { ConfigEstado, Reporte } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  rectIntersection,
} from '@dnd-kit/core';
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  reports: Reporte[];
  estados: ConfigEstado[];
  onUpdate: (id: string, estadoId: string) => Promise<void>;
}

export default function KanbanBoard({ reports, estados, onUpdate }: Props) {
  const [activeReport, setActiveReport] = React.useState<Reporte | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const report = reports.find((r) => r.id === active.id);
    if (report) setActiveReport(report);
  };

 const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  setActiveReport(null);

  if (!over) return;

  const activeReportId = active.id as string;
  const activeReport = reports.find((r) => r.id === activeReportId);
  if (!activeReport) return;

  // NUEVA LÓGICA: Buscamos el ID del estado destino
  // Intentamos obtener el ID del 'data' del elemento sobre el que soltamos
  // o navegamos por el DOM si 'over' es una tarjeta interna
  const overId = over.id as string;
  let targetEstado: ConfigEstado | undefined;

  // 1. Si soltamos sobre una columna, over.data.current debería tener el estado
  if (over.data.current?.type === 'column') {
    targetEstado = over.data.current.estado;
  } 
  // 2. Si soltamos sobre una tarjeta, buscamos a qué columna pertenece
  else {
    const reportDestino = reports.find(r => r.id === overId);
    if (reportDestino) {
      targetEstado = estados.find(e => e.id === reportDestino.estadoId);
    }
  }

  // 3. Fallback: Si sigue sin encontrarlo, intentamos buscar el ID limpiando el prefijo 'col-'
  if (!targetEstado) {
    const cleanId = overId.replace('col-', '');
    targetEstado = estados.find(e => e.id === cleanId);
  }

  if (targetEstado && activeReport.estadoId !== targetEstado.id) {
    await onUpdate(activeReportId, targetEstado.id);
  } else {
    console.warn('No se pudo determinar el estado destino. ID detectado:', overId);
  }
};
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {estados.map((estado) => (
          <KanbanColumn
            key={estado.id}
            estado={estado}
            reports={reports.filter((r) => r.estadoId === estado.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeReport ? <KanbanCard report={activeReport} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({ estado, reports }: { estado: ConfigEstado; reports: Reporte[] }) {
  const { setNodeRef } = useSortable({
    id: `col-${estado.id}`,
    data: {
      type: 'column',
      estado,
    },
  });

  return (
    <div
      ref={setNodeRef}
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
          {reports.length}
        </span>
      </div>

      {/* Lista de Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <SortableContext
          id={estado.id}
          items={reports.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          {reports.map((r) => (
            <KanbanCard key={r.id} report={r} />
          ))}
        </SortableContext>
        {reports.length === 0 && (
          <div className="h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
            <p className="text-xs text-slate-400 font-medium">Sin reportes</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ report, isOverlay }: { report: Reporte; isOverlay?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: report.id,
    data: {
      type: 'report',
      report,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-primary-300 transition-colors cursor-grab active:cursor-grabbing ${
        isOverlay ? 'shadow-xl rotate-2 scale-105' : ''
      }`}
    >
      <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
        {report.categoria.nombre}
      </p>
      <p className="text-sm font-semibold text-slate-800 mb-2">
        {report.comentario || 'Sin comentario'}
      </p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
        <span className="text-[10px] text-slate-400">
          {format(parseISO(report.fechaCreacion), 'dd MMM', { locale: es })}
        </span>
        <span
          className="text-[10px] font-bold"
          style={{ color: report.prioridad.color }}
        >
          {report.prioridad.nombre}
        </span>
      </div>
    </div>
  );
}
