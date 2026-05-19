'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ReportsAPI, ConfigAPI } from '@/lib/api';
import type { ConfigCategoria, ConfigEstado, Reporte, ConfigSistema } from '@/lib/types';
import ReportDetailModal from '@/components/reports/ReportDetailModal';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ChevronDown, 
  Filter, 
  Search, 
  X, 
  Map as MapIcon, 
  LayoutList, 
  Columns, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import clsx from 'clsx';
import dynamic from 'next/dynamic';
import NewReportModal from '@/components/reports/NewReportModal';

const IncidentMap = dynamic(() => import('@/components/map/IncidentMap'), { ssr: false });
const KanbanBoard = dynamic(() => import('@/components/reports/KanbanBoard'), { ssr: false });

interface Filtros {
  estadoId: string;
  categoriaId: string;
  busqueda: string;
}

const FILTROS_INIT: Filtros = { estadoId: '', categoriaId: '', busqueda: '' };

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as any;

  const [activeTab, setActiveTab] = useState<'map' | 'table' | 'kanban' | 'config'>(tabParam || 'table');
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap'>('markers');
  const [reports, setReports] = useState<Reporte[]>([]);
  const [categorias, setCategorias] = useState<ConfigCategoria[]>([]);
  const [estados, setEstados] = useState<ConfigEstado[]>([]);
  const [sistema, setSistema] = useState<ConfigSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INIT);
  const [selected, setSelected] = useState<Reporte | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [skip, setSkip] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      // Intentamos cargar de la API, si falla (404), usamos mocks basados en los reportes
      const [catsRes, estsRes, sisRes] = await Promise.allSettled([
        ConfigAPI.getCategorias(),
        ConfigAPI.getEstados(),
        ConfigAPI.getSistema()
      ]);

      let finalCats: ConfigCategoria[] = [];
      let finalEsts: ConfigEstado[] = [];
      let finalSis: ConfigSistema[] = [];

      if (catsRes.status === 'fulfilled') {
        finalCats = catsRes.value.data;
      }
      
      if (estsRes.status === 'fulfilled') {
        finalEsts = estsRes.value.data;
      }

      if (sisRes.status === 'fulfilled') {
        finalSis = sisRes.value.data;
      }

      setCategorias(finalCats);
      setEstados(finalEsts.sort((a, b) => a.orden - b.orden));
      setSistema(finalSis);
    } catch (err) {
      console.error('Error en loadInitialData:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ReportsAPI.getAll({ 
        skip, 
        estadoId: filtros.estadoId || undefined 
      });
      setReports(data);

      // Si no tenemos categorías o estados (porque la API dio 404), los extraemos de los reportes
      setCategorias(prev => {
        if (prev.length > 0) return prev;
        const uniqueCats = Array.from(new Map(data.map(r => [r.categoria.id, r.categoria])).values());
        return uniqueCats;
      });

      setEstados(prev => {
        if (prev.length > 0) return prev;
        const uniqueEsts = Array.from(new Map(data.map(r => [r.estado.id, r.estado])).values());
        return uniqueEsts.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      });

    } catch (err) {
      setError('No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  }, [skip, filtros.estadoId]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);
  useEffect(() => { loadReports(); }, [loadReports]);
  
  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  const handleStatusUpdate = async (id: string, estadoId: string, comentario?: string) => {
    await ReportsAPI.updateStatus(id, estadoId, comentario);
    loadReports();
  };

  const appName = sistema.find(s => s.clave === 'NOMBRE_APP')?.valor || 'Reporta Ya';
  const slogan = sistema.find(s => s.clave === 'SLOGAN')?.valor || 'Gestión Territorial Inteligente';

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* ─── Header Dinámico ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{appName}</h1>
          <p className="text-slate-500 font-medium">{slogan}</p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Plus className="h-5 w-5" />
          Nuevo Reporte
        </button>
      </div>

      {/* ─── Tabs de Navegación ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex gap-1">
          <TabButton 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
            icon={<MapIcon className="h-4 w-4" />}
            label="Mapa de Calor"
          />
          <TabButton 
            active={activeTab === 'table'} 
            onClick={() => setActiveTab('table')} 
            icon={<LayoutList className="h-4 w-4" />}
            label="Tabla"
          />
          <TabButton 
            active={activeTab === 'kanban'} 
            onClick={() => setActiveTab('kanban')} 
            icon={<Columns className="h-4 w-4" />}
            label="Kanban"
          />
        </div>
        <div className="pr-1">
          <TabButton 
            active={activeTab === 'config'} 
            onClick={() => setActiveTab('config')} 
            icon={<Settings className="h-4 w-4" />}
            label="Configuración"
          />
        </div>
      </div>

      {/* ─── Contenido Principal ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {activeTab === 'table' && (
          <div className="space-y-4 h-full flex flex-col">
            {/* Filtros */}
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="input-field pl-9"
                    placeholder="Buscar por comentario..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
                  />
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
                  <Filter className="h-4 w-4" /> Filtros
                </button>
                <button onClick={loadReports} className="btn-secondary ml-auto">Actualizar</button>
              </div>
              
              {showFilters && (
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                    <select 
                      className="input-field"
                      value={filtros.estadoId}
                      onChange={(e) => setFiltros(f => ({ ...f, estadoId: e.target.value }))}
                    >
                      <option value="">Todos los estados</option>
                      {estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoría</label>
                    <select 
                      className="input-field"
                      value={filtros.categoriaId}
                      onChange={(e) => setFiltros(f => ({ ...f, categoriaId: e.target.value }))}
                    >
                      <option value="">Todas las categorías</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Tabla */}
            <div className="card flex-1 overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Categoría</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">Prioridad</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-[10px] tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 cursor-pointer transition-colors" onClick={() => setSelected(r)}>
                        <td className="px-4 py-4 text-slate-600 font-medium">{format(parseISO(r.fechaCreacion), 'dd/MM/yy HH:mm', { locale: es })}</td>
                        <td className="px-4 py-4 font-bold text-slate-900">{r.categoria.nombre}</td>
                        <td className="px-4 py-4">
                          <span 
                            className="px-2.5 py-1 rounded-lg text-[11px] font-black border uppercase tracking-tight"
                            style={{ backgroundColor: r.estado.color + '15', color: r.estado.color, borderColor: r.estado.color + '30' }}
                          >
                            {r.estado.nombre}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-xs" style={{ color: r.prioridad.color }}>{r.prioridad.nombre}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button className="text-primary-600 hover:text-primary-800 font-bold text-xs">DETALLES</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">Mostrando {reports.length} reportes</p>
                <div className="flex gap-2">
                  <button 
                    disabled={skip === 0} 
                    onClick={() => setSkip(Math.max(0, skip - 20))}
                    className="btn-secondary p-1.5 rounded-xl disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button 
                    disabled={reports.length < 20} 
                    onClick={() => setSkip(skip + 20)}
                    className="btn-secondary p-1.5 rounded-xl disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 self-start shadow-sm">
              <button
                onClick={() => setMapMode('markers')}
                className={clsx(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                  mapMode === 'markers' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                Marcadores
              </button>
              <button
                onClick={() => setMapMode('heatmap')}
                className={clsx(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                  mapMode === 'heatmap' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                Mapa de Calor
              </button>
            </div>
            <div className="flex-1 min-h-0 card overflow-hidden">
              <IncidentMap 
                key={`${activeTab}-${mapMode}`}
                reports={reports} 
                mode={mapMode} 
              />
            </div>
          </div>
        )}
        {activeTab === 'kanban' && <KanbanBoard reports={reports} estados={estados} onUpdate={handleStatusUpdate} />}
        {activeTab === 'config' && <ConfigModule categorias={categorias} refresh={loadInitialData} />}
      </div>

      {selected && (
        <ReportDetailModal
          report={selected}
          estados={estados}
          onClose={() => setSelected(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {showNewModal && (
        <NewReportModal 
          onClose={() => setShowNewModal(false)}
          onSuccess={() => {
            setShowNewModal(false);
            loadReports();
          }}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
        active ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ConfigModule({ categorias: initialCategorias, refresh }: any) {
  const [sistema, setSistema] = useState<any[]>([]);
  const [localCategorias, setLocalCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  
  const loadCategorias = useCallback(async () => {
    setLoadingCats(true);
    try {
      const res = await ConfigAPI.getCategorias();
      setLocalCategorias(res.data);
    } catch (err) {
      console.warn('Error al cargar categorías reales, usando iniciales:', err);
      setLocalCategorias(initialCategorias);
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
      .then(res => setSistema(res.data))
      .catch(err => {
        console.warn('API de Sistema no disponible, usando mocks:', err.message);
        setSistema([
          { clave: 'NOMBRE_APP', valor: 'Reporta Ya', descripcion: 'Nombre comercial de la plataforma' },
          { clave: 'SLOGAN', valor: 'Vigilancia Territorial Inteligente', descripcion: 'Slogan de la pantalla principal' },
          { clave: 'COLOR_PRIMARIO', valor: '#007AFF', descripcion: 'Color hexadecimal de la interfaz móvil' }
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateSistema = async (clave: string, valor: string) => {
    setSistema(prev => prev.map(s => s.clave === clave ? { ...s, valor } : s));
    try {
      await ConfigAPI.updateSistema(clave, valor);
      toast.success(`Configuración "${clave}" actualizada.`);
    } catch (err) {
      console.error('Error al persistir sistema:', err);
      toast.error('Error de conexión. Cambio local.', { icon: '⚠️' });
    }
  };

  const handleAddCategoria = async () => {
    const nombre = prompt('Nombre de la nueva categoría:');
    if (!nombre) return;

    try {
      const res = await ConfigAPI.createCategoria({ 
        nombre,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        activo: true
      });
      setLocalCategorias(prev => [res.data, ...prev]);
      toast.success('Categoría creada exitosamente');
      if (refresh) refresh();
    } catch (err) {
      console.error('Error al crear categoría:', err);
      toast.error('No se pudo crear la categoría en el servidor');
    }
  };

  const handleEditCategoria = async (cat: any) => {
    const nuevoNombre = prompt('Nuevo nombre para la categoría:', cat.nombre);
    if (!nuevoNombre || nuevoNombre === cat.nombre) return;

    try {
      const res = await ConfigAPI.updateCategoria(cat.id, { nombre: nuevoNombre });
      setLocalCategorias(prev => prev.map(c => c.id === cat.id ? res.data : c));
      toast.success('Categoría actualizada');
      if (refresh) refresh();
    } catch (err) {
      console.error('Error al editar categoría:', err);
      toast.error('No se pudo actualizar la categoría');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto pb-10">
      <div className="card p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-black text-slate-900">Configuración del Sistema</h3>
          <p className="text-sm text-slate-500">Ajustes globales de la plataforma</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {sistema.map(s => (
              <div key={s.clave} className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{s.clave.replace(/_/g, ' ')}</label>
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
            <p className="text-sm text-slate-500">Catálogo de problemas territoriales</p>
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
            <p className="text-xs text-slate-400 italic text-center py-10">No hay categorías disponibles</p>
          ) : (
            localCategorias.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-200 hover:border-primary-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: c.color }} />
                  <div>
                    <p className="text-sm font-black text-slate-900">{c.nombre}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{c.activo ? 'Activa' : 'Inactiva'}</p>
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
