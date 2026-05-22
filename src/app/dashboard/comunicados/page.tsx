'use client';

import { useCallback, useEffect, useState } from 'react';
import { ComunicadosAPI } from '@/lib/api';
import type { Comunicado } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Clock, Plus, Send } from 'lucide-react';
import axios, { AxiosError } from 'axios';

export default function ComunicadosPage() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading]         = useState(true);

  // Form state
  const [mensaje, setMensaje]                   = useState('');
  const [duracion, setDuracion]                 = useState('');
  const [sending, setSending]                   = useState(false);
  const [sendError, setSendError]               = useState<string | null>(null);
  const [sendSuccess, setSendSuccess]           = useState(false);

  const loadComunicados = useCallback(() => {
    setLoading(true);
    ComunicadosAPI.getAll()
      .then(({ data }) => setComunicados(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadComunicados(); }, [loadComunicados]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) { setSendError('El mensaje no puede estar vacío.'); return; }

    setSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const durVal = duracion ? parseInt(duracion, 10) : undefined;
      const { data } = await ComunicadosAPI.create(mensaje.trim(), durVal);
      setComunicados((prev) => [data, ...prev]);
      setMensaje('');
      setDuracion('');
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 4000);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setSendError(Array.isArray(msg) ? msg.join(' · ') : msg ?? 'Error al publicar el comunicado.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

      {/* ─── Editor (left / top) ────────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary-600" />
            </div>
            <h2 className="section-title">Nuevo comunicado</h2>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            {/* Mensaje */}
            <div>
              <label className="label mb-1.5 block">Mensaje *</label>
              <textarea
                className="input-field resize-none"
                rows={5}
                placeholder="Escribí la alerta o aviso para los usuarios de la app…"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                maxLength={600}
              />
              <p className="text-right text-xs text-slate-400 mt-1">{mensaje.length}/600</p>
            </div>

            {/* Duración */}
            <div>
              <label className="label mb-1.5 block">
                Duración de restricción <span className="font-normal lowercase">(minutos, opcional)</span>
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="Ej: 120 (2 horas)"
                min={1}
                max={10080}
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Indicá cuántos minutos estará activa la restricción en la vía.
              </p>
            </div>

            {/* Error / Success */}
            {sendError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{sendError}</p>
              </div>
            )}
            {sendSuccess && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-700 font-medium">✓ Comunicado publicado. Los usuarios ya pueden verlo.</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={sending || !mensaje.trim()}
              className="btn-primary w-full justify-center py-2.5"
            >
              {sending ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? 'Enviando…' : 'Publicar comunicado'}
            </button>
          </form>
        </div>
      </div>

      {/* ─── Lista (right / bottom) ─────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Historial</h2>
          <button onClick={loadComunicados} className="btn-secondary text-xs px-2.5 py-1.5">
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="h-7 w-7 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
          </div>
        ) : comunicados.length === 0 ? (
          <div className="card p-12 text-center text-slate-400">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay comunicados publicados aún.</p>
            <p className="text-sm mt-1">Usá el formulario para crear el primero.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comunicados.map((c) => (
              <div key={c.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-relaxed">{c.mensaje}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Bell className="h-3 w-3" />
                        {format(parseISO(c.fechaPublicacion), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                      </span>
                      {c.duracionRestriccion && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" />
                          {c.duracionRestriccion < 60
                            ? `${c.duracionRestriccion} min`
                            : `${Math.round(c.duracionRestriccion / 60)} h`}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.responsable && (
                    <span className="shrink-0 text-xs text-slate-400 truncate max-w-[120px]" title={c.responsable.email}>
                      {c.responsable.email}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
