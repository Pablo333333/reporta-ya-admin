'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfigAPI } from '@/lib/api';
import type { ConfigEstado } from '@/lib/types';
import { Plus, Trash2, Settings2, CheckCircle2, AlertCircle, Loader2, Save, Palette, ListOrdered, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function EstadosPage() {
  const [estados, setEstados] = useState<ConfigEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newEstado, setNewEstado] = useState<Partial<ConfigEstado>>({
    nombre: '',
    color: '#3b82f6',
    esFinal: false,
    requiereFoto: false,
    orden: 0,
    activo: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ConfigAPI.getEstados();
      setEstados(data.sort((a, b) => a.orden - b.orden));
    } catch (err) {
      toast.error('Error al cargar estados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddEstado = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ConfigAPI.createEstado(newEstado);
      toast.success('Estado creado con éxito');
      setShowModal(false);
      setNewEstado({
        nombre: '',
        color: '#3b82f6',
        esFinal: false,
        requiereFoto: false,
        orden: estados.length,
        activo: true,
      });
      loadData();
    } catch (err) {
      toast.error('No se pudo crear el estado');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (estado: ConfigEstado) => {
    try {
      await ConfigAPI.updateEstado(estado.id, { activo: !estado.activo });
      toast.success(`Estado ${estado.activo ? 'desactivado' : 'activado'}`);
      loadData();
    } catch (err) {
      toast.error('No se pudo actualizar el estado');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Estados</h1>
          <p className="text-slate-500 font-medium">Define el flujo de vida de los reportes territoriales</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" /> Nuevo Estado
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="card p-20 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
          </div>
        ) : estados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {estados.map((estado) => (
              <div 
                key={estado.id} 
                className={clsx(
                  "card p-5 border-l-4 transition-all hover:shadow-md",
                  !estado.activo && "opacity-60 grayscale"
                )}
                style={{ borderLeftColor: estado.color }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: estado.color }}
                    />
                    <h3 className="font-bold text-slate-900">{estado.nombre}</h3>
                  </div>
                  <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md uppercase">
                    Orden: {estado.orden}
                  </span>
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    {estado.esFinal ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    {estado.esFinal ? 'Estado Final (Cierra el flujo)' : 'Estado Intermedio'}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    {estado.requiereFoto ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary-500" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-slate-300" />
                    )}
                    {estado.requiereFoto ? 'Requiere foto de evidencia' : 'No requiere foto'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <button
                    onClick={() => handleToggleActivo(estado)}
                    className={clsx(
                      "text-[10px] font-black px-3 py-1.5 rounded-xl transition-colors",
                      estado.activo 
                        ? "bg-red-50 text-red-600 hover:bg-red-100" 
                        : "bg-green-50 text-green-600 hover:bg-green-100"
                    )}
                  >
                    {estado.activo ? 'DESACTIVAR' : 'ACTIVAR'}
                  </button>
                  <button className="text-[10px] font-black text-primary-600 hover:text-primary-800 px-3 py-1.5">
                    EDITAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-20 text-center space-y-3">
            <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <Plus className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium">No hay estados configurados aún.</p>
          </div>
        )}
      </div>

      {/* Modal: Nuevo Estado */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">Nuevo Estado de Reporte</h3>
              <p className="text-sm text-slate-500">Configura una nueva etapa en el ciclo de vida</p>
            </div>
            <form onSubmit={handleAddEstado} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Estado</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: En Inspección"
                  className="input-field"
                  value={newEstado.nombre}
                  onChange={(e) => setNewEstado({ ...newEstado, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-10 rounded-lg cursor-pointer border-none p-0"
                      value={newEstado.color}
                      onChange={(e) => setNewEstado({ ...newEstado, color: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input-field font-mono text-xs"
                      value={newEstado.color}
                      onChange={(e) => setNewEstado({ ...newEstado, color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Orden Visual</label>
                  <input
                    type="number"
                    className="input-field"
                    value={newEstado.orden}
                    onChange={(e) => setNewEstado({ ...newEstado, orden: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer border border-slate-100 hover:border-primary-200 transition-colors">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-600"
                    checked={newEstado.esFinal}
                    onChange={(e) => setNewEstado({ ...newEstado, esFinal: e.target.checked })}
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Estado Final</p>
                    <p className="text-[10px] text-slate-400 font-medium">Marca el reporte como solucionado o cerrado</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer border border-slate-100 hover:border-primary-200 transition-colors">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-600"
                    checked={newEstado.requiereFoto}
                    onChange={(e) => setNewEstado({ ...newEstado, requiereFoto: e.target.checked })}
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Requiere Foto</p>
                    <p className="text-[10px] text-slate-400 font-medium">Exige una foto de evidencia para pasar a este estado</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar Estado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ className, size, color }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color || "currentColor"} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
