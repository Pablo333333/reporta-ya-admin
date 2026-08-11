'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ConfigAPI } from '@/lib/api';
import { extractApiErrorMessage } from '@/lib/errors';
import type { ConfigCategoria, ConfigSistema } from '@/lib/types';

interface Props {
  initialCategorias?: ConfigCategoria[];
  refresh?: () => void;
}

/**
 * Configuración de sistema (config_sistema) + categorías (config_categorias).
 * Usado desde Constructor / sidebar y desde Reportes (legacy tab).
 */
export default function SistemaConfigModule({
  initialCategorias = [],
  refresh,
}: Props) {
  const [sistema, setSistema] = useState<ConfigSistema[]>([]);
  const [localCategorias, setLocalCategorias] = useState<ConfigCategoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  const loadCategorias = useCallback(async () => {
    setLoadingCats(true);
    try {
      const res = await ConfigAPI.getCategorias();
      setLocalCategorias(res.data);
    } catch (err) {
      console.warn('Error al cargar categorías:', err);
      setLocalCategorias(initialCategorias);
      toast.error(extractApiErrorMessage(err, 'No se pudieron cargar las categorías'));
    } finally {
      setLoadingCats(false);
    }
  }, [initialCategorias]);

  useEffect(() => {
    loadCategorias();
  }, [loadCategorias]);

  useEffect(() => {
    setLoading(true);
    ConfigAPI.getSistema()
      .then((res) => setSistema(res.data))
      .catch((err) => {
        console.warn('API de Sistema no disponible:', err);
        toast.error(extractApiErrorMessage(err, 'No se pudo cargar config_sistema'));
        setSistema([
          {
            id: 'mock-1',
            clave: 'NOMBRE_APP',
            valor: 'Reporta Ya',
            descripcion: 'Nombre comercial de la plataforma',
          },
          {
            id: 'mock-2',
            clave: 'SLOGAN',
            valor: 'Vigilancia Territorial Inteligente',
            descripcion: 'Slogan de la pantalla principal',
          },
          {
            id: 'mock-3',
            clave: 'COLOR_PRIMARIO',
            valor: '#007AFF',
            descripcion: 'Color hexadecimal de la interfaz móvil',
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateSistema = async (clave: string, valor: string) => {
    setSistema((prev) =>
      prev.map((s) => (s.clave === clave ? { ...s, valor } : s)),
    );
    try {
      await ConfigAPI.updateSistema(clave, valor);
      toast.success(`Configuración "${clave}" actualizada.`);
    } catch (err) {
      console.error('Error al persistir sistema:', err);
      toast.error(extractApiErrorMessage(err, 'Error al guardar configuración'));
    }
  };

  const handleAddCategoria = async () => {
    const nombre = prompt('Nombre de la nueva categoría:');
    if (!nombre) return;

    try {
      const res = await ConfigAPI.createCategoria({
        nombre,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        activo: true,
      });
      setLocalCategorias((prev) => [res.data, ...prev]);
      toast.success('Categoría creada exitosamente');
      refresh?.();
    } catch (err) {
      console.error('Error al crear categoría:', err);
      toast.error(extractApiErrorMessage(err, 'No se pudo crear la categoría'));
    }
  };

  const handleEditCategoria = async (cat: ConfigCategoria) => {
    const nuevoNombre = prompt('Nuevo nombre para la categoría:', cat.nombre);
    if (!nuevoNombre || nuevoNombre === cat.nombre) return;

    try {
      const res = await ConfigAPI.updateCategoria(cat.id, { nombre: nuevoNombre });
      setLocalCategorias((prev) =>
        prev.map((c) => (c.id === cat.id ? res.data : c)),
      );
      toast.success('Categoría actualizada');
      refresh?.();
    } catch (err) {
      console.error('Error al editar categoría:', err);
      toast.error(extractApiErrorMessage(err, 'No se pudo actualizar la categoría'));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto pb-10">
      <div className="card p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-black text-slate-900">Configuración del Sistema</h3>
          <p className="text-sm text-slate-500">
            Tabla <code className="text-xs bg-slate-100 px-1 rounded">config_sistema</code> — nombre,
            slogan, colores, etc.
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {sistema.map((s) => (
              <div key={s.clave} className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {s.clave.replace(/_/g, ' ')}
                </label>
                <input
                  className="input-field font-medium"
                  defaultValue={s.valor}
                  onBlur={(e) => {
                    if (e.target.value !== s.valor) {
                      handleUpdateSistema(s.clave, e.target.value);
                    }
                  }}
                />
                <p className="text-[10px] text-slate-400 italic">{s.descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Gestión de Categorías</h3>
            <p className="text-sm text-slate-500">
              Tabla <code className="text-xs bg-slate-100 px-1 rounded">config_categorias</code>
            </p>
          </div>
          <button
            onClick={handleAddCategoria}
            className="btn-primary text-xs py-2 px-4 rounded-xl font-bold"
          >
            + Nueva
          </button>
        </div>
        <div className="space-y-3">
          {loadingCats ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
            </div>
          ) : localCategorias.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-10">
              No hay categorías disponibles
            </p>
          ) : (
            localCategorias.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-200 hover:border-primary-200 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-4 w-4 rounded-full shadow-sm"
                    style={{ backgroundColor: c.color || '#64748b' }}
                  />
                  <div>
                    <p className="text-sm font-black text-slate-900">{c.nombre}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {c.activo ? 'Activa' : 'Inactiva'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleEditCategoria(c)}
                  className="text-primary-600 text-xs font-black hover:text-primary-800"
                >
                  EDITAR
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
