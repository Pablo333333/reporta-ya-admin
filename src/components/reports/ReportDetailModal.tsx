'use client';

import axios from 'axios';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  type ConfigCategoria,
  type ConfigEstado,
  type Reporte,
} from '@/lib/types';

interface Props {
  report: Reporte;
  estados: ConfigEstado[];
  categorias: ConfigCategoria[];
  /** Pesos de la fórmula de riesgo (ConfigSistema). Defaults 0.6 / 0.4 */
  pesoGravedad?: number;
  pesoFrecuencia?: number;
  onClose: () => void;
  onStatusUpdate: (
    id: string,
    estadoId: string,
    comentario?: string,
    categoriaId?: string,
  ) => Promise<void>;
}

export default function ReportDetailModal({
  report,
  estados,
  categorias,
  pesoGravedad = 0.6,
  pesoFrecuencia = 0.4,
  onClose,
  onStatusUpdate,
}: Props) {
  const [newEstadoId, setNewEstadoId] = useState<string>(report.estadoId);
  const [newCategoriaId, setNewCategoriaId] = useState<string>(report.categoriaId);
  const [comentario, setComentario] = useState(report.comentarioResolucion ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const categoriasActivas = categorias.filter((c) => c.activo);
  const categoriaChanged = newCategoriaId !== report.categoriaId;
  const hasChanges =
    newEstadoId !== report.estadoId ||
    categoriaChanged ||
    comentario !== (report.comentarioResolucion ?? '');

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onStatusUpdate(
        report.id,
        newEstadoId,
        comentario || undefined,
        categoriaChanged ? newCategoriaId : undefined,
      );
      onClose();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      const errorText = Array.isArray(msg) ? msg.join(' · ') : msg ?? 'Error al actualizar el estado.';
      setSaveError(errorText);
      toast.error(errorText);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {categorias.find((c) => c.id === newCategoriaId)?.nombre ?? report.categoria.nombre}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{report.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Estado actual">
              <span 
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                style={{ backgroundColor: report.estado.color + '20', color: report.estado.color, borderColor: report.estado.color + '40' }}
              >
                {report.estado.nombre}
              </span>
            </InfoRow>

            <InfoRow label="Fecha de reporte">
              {format(parseISO(report.fechaCreacion), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
            </InfoRow>

            <InfoRow label="Prioridad">
              <span style={{ color: report.prioridad.color }} className="font-bold">
                {report.prioridad.nombre}
              </span>
            </InfoRow>

            <InfoRow label="Reportado por">
              {report.reportante?.email ?? (report.reportanteId ? report.reportanteId : 'Anónimo')}
            </InfoRow>

            {report.comentario && (
              <InfoRow label="Comentario del usuario" className="col-span-2">
                <em className="text-slate-600">&ldquo;{report.comentario}&rdquo;</em>
              </InfoRow>
            )}
          </div>

          {/* ─── Índice de riesgo territorial (fórmula por pesos) ──────────── */}
          {report.indiceRiesgo !== undefined && (
            <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Índice de Riesgo Territorial
                  </p>
                  <h3 className="text-lg font-bold">Fórmula de criticidad</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Índice Total</p>
                  <p className="text-2xl font-black text-primary-400">{report.indiceRiesgo.toFixed(1)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="text-slate-400">
                      Factor 1: Gravedad ({Math.round(pesoGravedad * 100)}%)
                    </span>
                    <span className="text-white">Nivel {report.prioridad.nivel}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-1000"
                      style={{ width: `${Math.min((report.prioridad.nivel / 5) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {(() => {
                  const g = pesoGravedad > 0 ? pesoGravedad : 0.6;
                  const f = pesoFrecuencia > 0 ? pesoFrecuencia : 0.4;
                  const gravedadContrib = (report.prioridad.nivel || 1) * g;
                  const frecuenciaContrib = Math.max(0, report.indiceRiesgo - gravedadContrib);
                  const frecuenciaValue = Math.round(frecuenciaContrib / f);

                  return (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                        <span className="text-slate-400">
                          Factor 2: Frecuencia ({Math.round(f * 100)}%)
                        </span>
                        <span className="text-white">
                          {frecuenciaValue} reportes similares en la zona
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-1000"
                          style={{ width: `${Math.min((frecuenciaValue / 10) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                  * Cálculo determinístico: (nivel de prioridad × {pesoGravedad}) +
                  (frecuencia de reportes abiertos misma zona/categoría en 7 días × {pesoFrecuencia}).
                  No usa un modelo de IA; los pesos se configuran en Prioridades.
                </p>
              </div>
            </div>
          )}

          {/* Información Técnica Adicional */}
          {report.valoresCamposExtra && Object.keys(report.valoresCamposExtra).length > 0 && (
            <div className="bg-primary-50/50 rounded-2xl p-5 border border-primary-100">
              <p className="text-xs font-black text-primary-600 uppercase tracking-widest mb-3">Información Técnica Adicional</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                {Object.entries(report.valoresCamposExtra).map(([fieldId, value]) => {
                  const fieldConfig = report.categoria.camposExtra?.find(f => f.id === fieldId);
                  const label = fieldConfig ? fieldConfig.nombre : fieldId;
                  
                  return (
                    <div key={fieldId} className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
                      <span className="text-sm font-bold text-slate-700">
                        {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Foto */}
          {report.fotoUrl && (
            <div>
              <p className="label mb-2">Foto del incidente</p>
              <div className="relative">
                <img
                  src={report.fotoUrl}
                  alt="Foto del incidente"
                  className="rounded-xl w-full max-h-56 object-cover border border-slate-200"
                />
                <a
                  href={report.fotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 rounded-lg bg-white/90 p-1.5 text-slate-600 hover:text-primary-600 shadow"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* ─── Actualizar estado / categoría ─────────────────────────────── */}
          <div className="border-t border-slate-100 pt-5">
            <p className="text-sm font-bold text-slate-900 mb-4">Actualizar reporte</p>

            <div className="mb-4">
              <label className="label mb-1.5 block">Categoría</label>
              <select
                className="input-field"
                value={newCategoriaId}
                onChange={(e) => setNewCategoriaId(e.target.value)}
              >
                {categoriasActivas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {categoriaChanged && (
                <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                  Al guardar, la corrección se guarda en aprendizaje_ia y se usa como ejemplo en
                  futuras clasificaciones automáticas.
                </p>
              )}
            </div>

            <p className="label mb-1.5 block">Estado</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {estados.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setNewEstadoId(e.id)}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all',
                    newEstadoId === e.id
                      ? 'ring-2 ring-offset-1 ring-primary-500 bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {e.nombre}
                </button>
              ))}
            </div>

            <div>
              <label className="label mb-1.5 block">
                Comentario de resolución <span className="font-normal lowercase">(opcional)</span>
              </label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="Describí cómo se solucionó el problema…"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            </div>

            {saveError && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{saveError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-primary"
          >
            {saving && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label, children, className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="label mb-0.5">{label}</p>
      <div className="text-sm text-slate-900">{children}</div>
    </div>
  );
}
