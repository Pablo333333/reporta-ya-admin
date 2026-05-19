'use client';

import { useCallback, useEffect, useState } from 'react';
import { ReportsAPI, ConfigAPI } from '@/lib/api';
import type { Reporte, ConfigCategoria, ConfigEstado } from '@/lib/types';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function EstadisticasPage() {
  const [reports, setReports] = useState<Reporte[]>([]);
  const [categorias, setCategorias] = useState<ConfigCategoria[]>([]);
  const [estados, setEstados] = useState<ConfigEstado[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, catRes, estRes] = await Promise.allSettled([
        ReportsAPI.getAll({ skip: 0 }),
        ConfigAPI.getCategorias(),
        ConfigAPI.getEstados()
      ]);

      let finalReports: Reporte[] = [];
      let finalCats: ConfigCategoria[] = [];
      let finalEsts: ConfigEstado[] = [];

      if (repRes.status === 'fulfilled') {
        finalReports = repRes.value.data;
      }

      if (catRes.status === 'fulfilled') {
        finalCats = catRes.value.data;
      } else {
        finalCats = Array.from(new Map(finalReports.map(r => [r.categoria.id, r.categoria])).values());
      }

      if (estRes.status === 'fulfilled') {
        finalEsts = estRes.value.data;
      } else {
        finalEsts = Array.from(new Map(finalReports.map(r => [r.estado.id, r.estado])).values());
      }

      setReports(finalReports);
      setCategorias(finalCats);
      setEstados(finalEsts);
    } catch (err) {
      console.error('Error al cargar datos de estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
      </div>
    );
  }

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  const total = reports.length;
  
  // Agrupar por nombre de estado (buscando los comunes o mapeando todos)
  const getCountByEstado = (nombre: string) => 
    reports.filter(r => r.estado.nombre.toLowerCase() === nombre.toLowerCase()).length;

  const pendientes = getCountByEstado('Pendiente');
  const enProceso = getCountByEstado('En Proceso');
  const solucionados = getCountByEstado('Solucionado');

  // ─── Por categoría ──────────────────────────────────────────────────────────
  const byTipo = categorias.map((cat) => ({
    tipo: cat.nombre.replace('en la vía', 'en vía').replace('Deficiente ', '').replace('Mucho tiempo de', 'T. de'),
    total: reports.filter((r) => r.categoriaId === cat.id).length,
  })).sort((a, b) => b.total - a.total);

  // ─── Por estado (pie) ──────────────────────────────────────────────────────
  const byEstadoRaw = estados.map(est => ({
    name: est.nombre,
    value: reports.filter(r => r.estadoId === est.id).length,
    color: est.color
  })).filter(s => s.value > 0);

  const sum = byEstadoRaw.reduce((acc, curr) => acc + curr.value, 0);
  let byEstado = byEstadoRaw.map(item => ({
    ...item,
    percentage: sum > 0 ? Math.round((item.value / sum) * 100) : 0,
    displayName: `${item.name}:${item.value}`
  }));

  // ─── Tendencia diaria (últimos 14 días) ───────────────────────────────────
  const dailyTrend = Array.from({ length: 14 }, (_, i) => {
    const day   = subDays(new Date(), 13 - i);
    const label = format(day, 'dd/MM', { locale: es });
    const ymd   = format(day, 'yyyy-MM-dd');
    return {
      fecha: label,
      total: reports.filter((r) => r.fechaCreacion.startsWith(ymd)).length,
    };
  });

  // ─── Puntos críticos (top 5 categorías con más reportes no finales) ──────────
  const criticalTypes = categorias
    .map((cat) => ({
      tipo:     cat.nombre,
      abiertos: reports.filter((r) => r.categoriaId === cat.id && !r.estado.esFinal).length,
      total:    reports.filter((r) => r.categoriaId === cat.id).length,
    }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.abiertos - a.abiertos)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard Icon={FileText}     color="blue"   label="Total reportes"       value={total} />
        <KpiCard Icon={AlertTriangle} color="red"    label="Pendientes"           value={pendientes} />
        <KpiCard Icon={Clock}        color="amber"  label="En proceso"           value={enProceso} />
        <KpiCard Icon={CheckCircle2} color="green"  label="Solucionados"         value={solucionados} />
      </div>

      {/* ─── Gráficos fila 1 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title mb-4">Reportes por categoría</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byTipo} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="tipo" width={130} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="total" name="Reportes" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 flex flex-col">
          <p className="section-title mb-4">Distribución por estado</p>
          {byEstado.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byEstado}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3}
                  dataKey="percentage"
                  nameKey="displayName"
                >
                  {byEstado.map((entry, i) => (
                    <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* ─── Gráficos fila 2 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title mb-4">Tendencia diaria</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 flex flex-col">
          <p className="section-title mb-4">Puntos críticos</p>
          <div className="space-y-3 flex-1">
            {criticalTypes.map((ct, i) => (
              <div key={ct.tipo} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{ct.tipo}</p>
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${(ct.total / Math.max(...criticalTypes.map(c => c.total))) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 shrink-0">
                  <span className="font-semibold text-red-600">{ct.abiertos}</span>/{ct.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ Icon, color, label, value }: any) {
  const colors = {
    blue:  { bg: 'bg-blue-50',   icon: 'text-blue-600',  iconBg: 'bg-blue-100'  },
    red:   { bg: 'bg-red-50',    icon: 'text-red-600',   iconBg: 'bg-red-100'   },
    amber: { bg: 'bg-amber-50',  icon: 'text-amber-600', iconBg: 'bg-amber-100' },
    green: { bg: 'bg-green-50',  icon: 'text-green-600', iconBg: 'bg-green-100' },
  }[color as 'blue' | 'red' | 'amber' | 'green'];

  return (
    <div className={`card p-5 ${colors.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <div className={`h-9 w-9 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
