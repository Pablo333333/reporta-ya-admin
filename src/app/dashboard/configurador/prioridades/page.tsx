'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfigAPI } from '@/lib/api';
import type { ConfigPrioridad, ConfigSistema } from '@/lib/types';
import { Plus, Loader2, Save, TrendingUp, Percent, ShieldAlert, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PrioridadesPage() {
  const [prioridades, setPrioridades] = useState<ConfigPrioridad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingWeights, setSavingWeights] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  const [newPrioridad, setNewPrioridad] = useState<Partial<ConfigPrioridad>>({
    nombre: '',
    color: '#3b82f6',
    nivel: 1,
    activo: true,
  });

  const [weights, setWeights] = useState({
    gravedad: '0.6',
    frecuencia: '0.4',
  });

  const [rules, setRules] = useState({
    minReportes: '2',
    ventanaHoras: '48',
    puntosCrear: '5',
    puntosValidar: '15',
    slaHoras: '48',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [priosRes, sisRes] = await Promise.all([
        ConfigAPI.getPrioridades(),
        ConfigAPI.getSistema(),
      ]);
      setPrioridades(priosRes.data.sort((a, b) => a.nivel - b.nivel));

      const sis = sisRes.data as ConfigSistema[];
      const val = (clave: string, fallback: string) =>
        sis.find((s) => s.clave === clave)?.valor || fallback;

      setWeights({
        gravedad: val('PESO_GRAVEDAD', '0.6'),
        frecuencia: val('PESO_FRECUENCIA', '0.4'),
      });
      setRules({
        minReportes: val('EVENTO_CRITICO_MIN_REPORTES', '2'),
        ventanaHoras: val('EVENTO_CRITICO_VENTANA_HORAS', '48'),
        puntosCrear: val('PUNTOS_CREAR_REPORTE', '5'),
        puntosValidar: val('PUNTOS_VALIDAR_SOLUCION', '15'),
        slaHoras: val('SLA_HORAS_LIMITE', '48'),
      });
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPrioridad = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ConfigAPI.createPrioridad(newPrioridad);
      toast.success('Prioridad creada');
      setShowModal(false);
      setNewPrioridad({ nombre: '', color: '#3b82f6', nivel: prioridades.length + 1, activo: true });
      loadData();
    } catch {
      toast.error('Error al crear prioridad');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWeights = async () => {
    const g = parseFloat(weights.gravedad);
    const f = parseFloat(weights.frecuencia);

    if (isNaN(g) || isNaN(f) || Math.abs(g + f - 1) > 0.001) {
      toast.error('Los pesos deben sumar 1.0 (ej: 0.7 + 0.3)');
      return;
    }

    setSavingWeights(true);
    try {
      await Promise.all([
        ConfigAPI.updateSistema('PESO_GRAVEDAD', weights.gravedad),
        ConfigAPI.updateSistema('PESO_FRECUENCIA', weights.frecuencia),
      ]);
      toast.success('Fórmula de riesgo actualizada');
      loadData();
    } catch {
      toast.error('Error al actualizar pesos');
    } finally {
      setSavingWeights(false);
    }
  };

  const handleUpdateRules = async () => {
    const min = parseInt(rules.minReportes, 10);
    const horas = parseInt(rules.ventanaHoras, 10);
    const pCrear = parseInt(rules.puntosCrear, 10);
    const pValidar = parseInt(rules.puntosValidar, 10);
    const sla = parseInt(rules.slaHoras, 10);

    if ([min, horas, pCrear, pValidar, sla].some((n) => !Number.isFinite(n) || n < 0)) {
      toast.error('Todos los valores deben ser números ≥ 0');
      return;
    }
    if (min < 1 || horas < 1 || sla < 1) {
      toast.error('Mín. reportes, ventana y SLA deben ser ≥ 1');
      return;
    }

    setSavingRules(true);
    try {
      await Promise.all([
        ConfigAPI.updateSistema('EVENTO_CRITICO_MIN_REPORTES', String(min)),
        ConfigAPI.updateSistema('EVENTO_CRITICO_VENTANA_HORAS', String(horas)),
        ConfigAPI.updateSistema('PUNTOS_CREAR_REPORTE', String(pCrear)),
        ConfigAPI.updateSistema('PUNTOS_VALIDAR_SOLUCION', String(pValidar)),
        ConfigAPI.updateSistema('SLA_HORAS_LIMITE', String(sla)),
      ]);
      toast.success('Reglas de negocio actualizadas');
      loadData();
    } catch {
      toast.error('Error al guardar reglas');
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Prioridades</h1>
          <p className="text-slate-500 font-medium">
            Urgencia, fórmula de riesgo territorial y reglas de negocio
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" /> Nueva Prioridad
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
            Niveles de Prioridad
          </h2>
          {loading ? (
            <div className="card p-20 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prioridades.map((prio) => (
                <div
                  key={prio.id}
                  className="card p-5 border-l-4 transition-all hover:shadow-md"
                  style={{ borderLeftColor: prio.color }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: prio.color }} />
                      <h3 className="font-bold text-slate-900">{prio.nombre}</h3>
                    </div>
                    <span className="text-[10px] font-black bg-primary-50 text-primary-600 px-2 py-0.5 rounded-md uppercase">
                      Nivel {prio.nivel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex gap-2">
                      <div
                        className="h-4 w-4 rounded-full border border-slate-200"
                        style={{ backgroundColor: prio.color }}
                      />
                      <span className="text-[10px] font-mono text-slate-400">{prio.color}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
              Índice de Riesgo
            </h2>
            <div className="card p-6 bg-slate-900 text-white space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Fórmula configurable</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                    Gravedad × peso + Frecuencia × peso (sin IA)
                  </p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-[10px] font-black text-primary-400 uppercase mb-3 tracking-widest">
                  Estructura
                </p>
                <div className="text-xl font-mono font-light text-center py-2">
                  <span className="text-primary-400">({weights.gravedad})</span>G +{' '}
                  <span className="text-amber-400">({weights.frecuencia})</span>F
                </div>
                <p className="text-[9px] text-slate-500 text-center mt-2 italic">
                  G = nivel de prioridad · F = reportes similares abiertos (7 días)
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Peso Gravedad (G)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      value={weights.gravedad}
                      onChange={(e) => setWeights({ ...weights, gravedad: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Peso Frecuencia (F)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      value={weights.frecuencia}
                      onChange={(e) => setWeights({ ...weights, frecuencia: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  onClick={handleUpdateWeights}
                  disabled={savingWeights}
                  className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-black text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary-900/20"
                >
                  {savingWeights ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar fórmula
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
              Reglas de negocio
            </h2>
            <div className="card p-6 space-y-5 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Evento crítico</h3>
                  <p className="text-[11px] text-slate-500">
                    Misma zona + categoría, reportes aún abiertos
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mín. reportes
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={rules.minReportes}
                    onChange={(e) => setRules({ ...rules, minReportes: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Ventana (horas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={rules.ventanaHoras}
                    onChange={(e) => setRules({ ...rules, ventanaHoras: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <Trophy className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Gamificación</h3>
                  <p className="text-[11px] text-slate-500">Puntos al ciudadano</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Por crear reporte
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={rules.puntosCrear}
                    onChange={(e) => setRules({ ...rules, puntosCrear: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Por validar solución
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={rules.puntosValidar}
                    onChange={(e) => setRules({ ...rules, puntosValidar: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  SLA — horas límite sin resolución
                </label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={rules.slaHoras}
                  onChange={(e) => setRules({ ...rules, slaHoras: e.target.value })}
                />
              </div>

              <button
                onClick={handleUpdateRules}
                disabled={savingRules}
                className="w-full btn-primary flex items-center justify-center gap-2 text-xs font-black py-3"
              >
                {savingRules ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar reglas
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">Nueva Prioridad</h3>
              <p className="text-sm text-slate-500">Define un nuevo nivel de urgencia</p>
            </div>
            <form onSubmit={handleAddPrioridad} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Nombre
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Crítica"
                  className="input-field"
                  value={newPrioridad.nombre}
                  onChange={(e) => setNewPrioridad({ ...newPrioridad, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-10 rounded-lg cursor-pointer border-none p-0"
                      value={newPrioridad.color}
                      onChange={(e) => setNewPrioridad({ ...newPrioridad, color: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input-field font-mono text-xs"
                      value={newPrioridad.color}
                      onChange={(e) => setNewPrioridad({ ...newPrioridad, color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nivel (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input-field"
                    value={newPrioridad.nivel}
                    onChange={(e) =>
                      setNewPrioridad({ ...newPrioridad, nivel: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar Prioridad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
