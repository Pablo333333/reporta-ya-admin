'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ConfigAPI } from '@/lib/api';
import type { ConfigCategoria } from '@/lib/types';
import { Plus, Trash2, Settings2, CheckCircle2, AlertCircle, Lock, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';
import { extractApiErrorMessage } from '@/lib/errors';

export default function CustomFieldsPage() {
  const { user } = useAuth();
  const isSupervisor = user?.rol === 'SUPERVISOR';

  const [categorias, setCategorias] = useState<ConfigCategoria[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowNewModal] = useState(false);

  const [newField, setNewField] = useState({
    nombre: '',
    tipo: 'TEXT',
    requerido: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ConfigAPI.getCategorias();
      setCategorias(data);
      if (data.length > 0 && !selectedCatId) {
        setSelectedCatId(data[0].id);
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err, 'Error al cargar categorías'));
    } finally {
      setLoading(false);
    }
  }, [selectedCatId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedCat = categorias.find((c) => c.id === selectedCatId);

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId) return;

    if (!isSupervisor) {
      toast.error('Solo un SUPERVISOR puede añadir campos personalizados.');
      return;
    }

    try {
      await ConfigAPI.createCampoExtra({
        ...newField,
        categoriaId: selectedCatId,
      });
      toast.success('Campo añadido con éxito');
      setShowNewModal(false);
      setNewField({ nombre: '', tipo: 'TEXT', requerido: false });
      loadData();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, 'No se pudo añadir el campo'));
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!isSupervisor) {
      toast.error('Solo un SUPERVISOR puede eliminar campos.');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este campo?')) return;
    try {
      await ConfigAPI.deleteCampoExtra(id);
      toast.success('Campo eliminado');
      loadData();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, 'No se pudo eliminar el campo'));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Constructor de Formularios
          </h1>
          <p className="text-slate-500 font-medium">
            Define campos personalizados por cada sector operativo
          </p>
        </div>
        <Link
          href="/dashboard/configurador/sistema"
          className="btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3 self-start"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Configuración del sistema
        </Link>
      </div>

      {!isSupervisor && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              Solo lectura — se requiere rol SUPERVISOR
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Podés ver los campos configurados, pero no añadir ni eliminar. Tu rol actual:{' '}
              <strong>{user?.rol ?? 'desconocido'}</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 h-full">
        {/* Sidebar: Categorías */}
        <div className="w-full md:w-64 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3">
            Categorías
          </p>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all',
                selectedCatId === cat.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100',
              )}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: selectedCatId === cat.id ? '#fff' : cat.color || '#000',
                }}
              />
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Main: Constructor */}
        <div className="flex-1">
          {loading ? (
            <div className="card p-20 flex justify-center items-center">
              <div className="h-8 w-8 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
            </div>
          ) : selectedCat ? (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-xl">
                    <Settings2 className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Campos para {selectedCat.nombre}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">
                      {selectedCat.camposExtra?.length || 0} campos configurados
                    </p>
                  </div>
                </div>
                {isSupervisor ? (
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="btn-primary flex items-center gap-2 py-2 px-4 text-xs"
                  >
                    <Plus className="h-4 w-4" /> Añadir campo
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Requiere rol SUPERVISOR"
                    className="btn-primary flex items-center gap-2 py-2 px-4 text-xs opacity-50 cursor-not-allowed"
                  >
                    <Lock className="h-4 w-4" /> Añadir campo
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {selectedCat.camposExtra && selectedCat.camposExtra.length > 0 ? (
                  selectedCat.camposExtra.map((campo) => (
                    <div
                      key={campo.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 text-[10px] font-black text-primary-600">
                          {campo.tipo}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{campo.nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {campo.requerido ? (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase">
                                <AlertCircle className="h-3 w-3" /> Requerido
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                                <CheckCircle2 className="h-3 w-3" /> Opcional
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSupervisor && (
                        <button
                          onClick={() => handleDeleteField(campo.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-3">
                    <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <Plus className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">
                      No hay campos personalizados aún.
                      <br />
                      {isSupervisor
                        ? 'Añade uno para empezar a recolectar datos específicos.'
                        : 'Pedile a un SUPERVISOR que configure los campos.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-20 text-center">
              <p className="text-slate-400">Selecciona una categoría para editar sus campos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nuevo Campo */}
      {showModal && isSupervisor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Nuevo Campo Personalizado</h3>
              <p className="text-sm text-slate-500">
                Configura un nuevo input para la categoría {selectedCat?.nombre}
              </p>
            </div>
            <form onSubmit={handleAddField} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Nombre del Campo
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Número de Medidor"
                  className="input-field"
                  value={newField.nombre}
                  onChange={(e) => setNewField({ ...newField, nombre: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Tipo de Dato
                </label>
                <select
                  className="input-field"
                  value={newField.tipo}
                  onChange={(e) => setNewField({ ...newField, tipo: e.target.value })}
                >
                  <option value="TEXT">Texto</option>
                  <option value="NUMBER">Número</option>
                  <option value="BOOLEAN">Booleano (Sí/No)</option>
                </select>
              </div>

              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer border border-slate-100 hover:border-primary-200 transition-colors">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-600"
                  checked={newField.requerido}
                  onChange={(e) => setNewField({ ...newField, requerido: e.target.checked })}
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">Campo Requerido</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    El ciudadano no podrá enviar el reporte sin completar este campo
                  </p>
                </div>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Guardar Campo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
