'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ReportsAPI, ConfigAPI } from '@/lib/api';
import type { ConfigCategoria } from '@/lib/types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewReportModal({ onClose, onSuccess }: Props) {
  const [categorias, setCategorias] = useState<ConfigCategoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [comentario, setComentario] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    ConfigAPI.getCategorias()
      .then(res => {
        const activas = res.data.filter(c => c.activo);
        setCategorias(activas);
        if (activas.length > 0) setCategoriaId(activas[0].id);
      })
      .catch(err => {
        console.warn('API de Categorías no disponible en NewReportModal, usando fallback vacío');
        // El backend de NestJS aún no tiene este endpoint
        setCategorias([]);
      })
      .finally(() => setLoadingCats(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Las coordenadas deben ser números válidos.');
      return;
    }

    setSaving(true);
    try {
      // Intentamos obtener prioridades, si falla usamos null o el backend asignará default
      let prioridadId = undefined;
      try {
        const prioridades = await ConfigAPI.getPrioridades();
        const prioridadBaja = prioridades.data.find(p => p.nivel === 1) || prioridades.data[0];
        prioridadId = prioridadBaja?.id;
      } catch (pErr) {
        console.warn('API de Prioridades no disponible, el backend usará el default');
      }

      await ReportsAPI.create({
        categoriaId: categoriaId,
        prioridadId: prioridadId,
        comentario: comentario || undefined,
        latitud: lat,
        longitud: lng,
      });

      toast.success('Reporte creado exitosamente.');
      onSuccess();
    } catch (err) {
      toast.error('Error al crear el reporte.');
    } finally {
      setSaving(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no es soportada por este navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitud(pos.coords.latitude.toFixed(6));
        setLongitud(pos.coords.longitude.toFixed(6));
        toast.success('Ubicación obtenida.');
      },
      () => {
        toast.error('No se pudo obtener la ubicación.');
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Nuevo Reporte</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="label mb-1.5 block">Categoría de Problema</label>
            <select
              className="input-field"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
              disabled={loadingCats}
            >
              {loadingCats && <option>Cargando categorías...</option>}
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label mb-1.5 block">Comentario (opcional)</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Describí el incidente…"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block">Latitud</label>
              <input
                type="text"
                className="input-field"
                placeholder="-34.6037"
                value={latitud}
                onChange={(e) => setLatitud(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label mb-1.5 block">Longitud</label>
              <input
                type="text"
                className="input-field"
                placeholder="-58.3816"
                value={longitud}
                onChange={(e) => setLongitud(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            <MapPin className="h-4 w-4" />
            Usar mi ubicación actual
          </button>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              Desde el panel administrativo los reportes se crean sin foto. El usuario móvil podrá adjuntarla luego si es necesario.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || loadingCats}
              className="btn-primary"
            >
              {saving ? 'Guardando…' : 'Crear Reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
