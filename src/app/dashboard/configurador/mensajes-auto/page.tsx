'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfigAPI } from '@/lib/api';
import type { ConfigMensajeAuto } from '@/lib/types';
import { Loader2, MessageSquareText, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TIPOS_SUGERIDOS = [
  'NUEVO_REPORTE',
  'EVENTO_CRITICO',
  'PRIORIDAD_ALTA',
  'COMUNICADO',
  'VALIDACION_CIUDADANA',
  'SLA_INCUMPLIDO',
];

export default function MensajesAutoPage() {
  const [items, setItems] = useState<ConfigMensajeAuto[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    tipo: 'COMUNICADO',
    plantilla: '',
    descripcion: '',
    activo: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ConfigAPI.getMensajesAuto();
      setItems(data);
    } catch {
      toast.error('No se pudieron cargar los mensajes automáticos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.tipo.trim() || !draft.plantilla.trim()) {
      toast.error('Tipo y plantilla son obligatorios');
      return;
    }
    setCreating(true);
    try {
      await ConfigAPI.createMensajeAuto(draft);
      toast.success('Plantilla creada');
      setDraft({ tipo: 'COMUNICADO', plantilla: '', descripcion: '', activo: true });
      load();
    } catch {
      toast.error('Error al crear plantilla');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (item: ConfigMensajeAuto) => {
    setSavingId(item.id);
    try {
      await ConfigAPI.updateMensajeAuto(item.id, {
        tipo: item.tipo,
        plantilla: item.plantilla,
        descripcion: item.descripcion || undefined,
        activo: item.activo,
      });
      toast.success(`"${item.tipo}" actualizado`);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
      await ConfigAPI.deleteMensajeAuto(id);
      toast.success('Plantilla eliminada');
      load();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const updateLocal = (id: string, patch: Partial<ConfigMensajeAuto>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mensajes automáticos</h1>
        <p className="text-slate-500 font-medium">
          Plantillas para push/alertas (placeholders: {'{{categoria}}'}, {'{{zona}}'}, {'{{mensaje}}'}, {'{{horas}}'})
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-bold text-slate-800">Nueva plantilla</h2>
        </div>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label mb-1 block">Tipo</label>
            <input
              list="tipos-mensaje"
              className="input-field"
              value={draft.tipo}
              onChange={(e) => setDraft({ ...draft, tipo: e.target.value.toUpperCase() })}
            />
            <datalist id="tipos-mensaje">
              {TIPOS_SUGERIDOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label mb-1 block">Descripción</label>
            <input
              className="input-field"
              value={draft.descripcion}
              onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label mb-1 block">Plantilla</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={draft.plantilla}
              onChange={(e) => setDraft({ ...draft, plantilla: e.target.value })}
              placeholder="Ej: Nuevo reporte: {{categoria}}. Revisá el mapa."
            />
          </div>
          <button type="submit" disabled={creating} className="btn-primary justify-center md:col-span-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear plantilla
          </button>
        </form>
      </div>

      {loading ? (
        <div className="card p-12 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <MessageSquareText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay plantillas. Creá una o ejecutá el seed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <input
                  className="input-field font-mono text-xs max-w-[220px]"
                  value={item.tipo}
                  onChange={(e) => updateLocal(item.id, { tipo: e.target.value.toUpperCase() })}
                />
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={item.activo}
                    onChange={(e) => updateLocal(item.id, { activo: e.target.checked })}
                  />
                  Activo
                </label>
              </div>
              <input
                className="input-field text-sm"
                placeholder="Descripción"
                value={item.descripcion || ''}
                onChange={(e) => updateLocal(item.id, { descripcion: e.target.value })}
              />
              <textarea
                className="input-field resize-none text-sm"
                rows={2}
                value={item.plantilla}
                onChange={(e) => updateLocal(item.id, { plantilla: e.target.value })}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="btn-secondary text-xs text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(item)}
                  disabled={savingId === item.id}
                  className="btn-primary text-xs"
                >
                  {savingId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Guardar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
