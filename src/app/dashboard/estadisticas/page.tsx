'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { ReportsAPI } from '@/lib/api';
import type { ReportsAnalytics } from '@/lib/types';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Timer,
  Trophy,
  RotateCcw,
  Grid3X3,
} from 'lucide-react';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

function toInputDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function startOfDayIso(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

function endOfDayIso(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`;
}

function formatHoras(h: number | null | undefined): string {
  if (h == null || Number.isNaN(h)) return 'N/D';
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

export default function EstadisticasPage() {
  const [fromDate, setFromDate] = useState(() => toInputDate(subDays(new Date(), 30)));
  const [toDate, setToDate] = useState(() => toInputDate(new Date()));
  const [appliedFrom, setAppliedFrom] = useState(fromDate);
  const [appliedTo, setAppliedTo] = useState(toDate);

  const [analytics, setAnalytics] = useState<ReportsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await ReportsAPI.getAnalytics({
        from: startOfDayIso(from),
        to: endOfDayIso(to),
      });
      setAnalytics(data);
      setAppliedFrom(from);
      setAppliedTo(to);
    } catch (err) {
      console.error('Error al cargar analytics', err);
      setError('No se pudieron cargar las estadísticas del servidor.');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(fromDate, toDate);
    // Solo carga inicial con el rango por defecto (30 días)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRange = () => {
    if (!fromDate || !toDate) {
      setError('Seleccioná ambas fechas del rango.');
      return;
    }
    if (fromDate > toDate) {
      setError('La fecha "Desde" no puede ser posterior a "Hasta".');
      return;
    }
    loadData(fromDate, toDate);
  };

  const applyPreset = (days: number) => {
    const to = toInputDate(new Date());
    const from = toInputDate(subDays(new Date(), days));
    setFromDate(from);
    setToDate(to);
    loadData(from, to);
  };

  const matriz = useMemo(() => {
    const rows = analytics?.problemasPorZona ?? [];
    if (!rows.length) {
      return { zonas: [] as string[], categorias: [] as string[], cell: new Map<string, { total: number; abiertos: number }>() };
    }

    // Top zonas por volumen (máx. 6) y top categorías globales (máx. 6)
    const zonaTotales = new Map<string, number>();
    const catTotales = new Map<string, number>();
    for (const r of rows) {
      zonaTotales.set(r.zona, (zonaTotales.get(r.zona) || 0) + r.total);
      catTotales.set(r.categoriaNombre, (catTotales.get(r.categoriaNombre) || 0) + r.total);
    }
    const zonas = [...zonaTotales.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([z]) => z);
    const categorias = [...catTotales.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([c]) => c);

    const zonaSet = new Set(zonas);
    const catSet = new Set(categorias);
    const cell = new Map<string, { total: number; abiertos: number }>();
    for (const r of rows) {
      if (!zonaSet.has(r.zona) || !catSet.has(r.categoriaNombre)) continue;
      cell.set(`${r.zona}||${r.categoriaNombre}`, {
        total: r.total,
        abiertos: r.abiertos,
      });
    }
    return { zonas, categorias, cell };
  }, [analytics?.problemasPorZona]);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
      </div>
    );
  }

  if ((error && !analytics) || (!loading && !analytics)) {
    return (
      <div className="card p-8 text-center space-y-3">
        <p className="text-slate-600">{error || 'Sin datos'}</p>
        <button
          type="button"
          onClick={() => loadData(fromDate, toDate)}
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const { kpis, porCategoria, porZona, rankingResponsables, tendenciaDiaria, periodo } = analytics;

  const byTipo = porCategoria.map((c) => ({
    tipo: c.nombre
      .replace('en la vía', 'en vía')
      .replace('Deficiente ', '')
      .replace('Mucho tiempo de', 'T. de'),
    total: c.total,
    abiertos: c.abiertos,
  }));

  const estadoSlices = [
    { name: 'Pendiente', value: kpis.pendientes, color: '#ef4444' },
    { name: 'En Proceso', value: kpis.enProceso, color: '#f59e0b' },
    { name: 'Solucionado', value: kpis.solucionados, color: '#22c55e' },
    { name: 'Reabierto', value: kpis.reabiertos, color: '#8b5cf6' },
  ].filter((s) => s.value > 0);

  const sumEstados = estadoSlices.reduce((acc, s) => acc + s.value, 0);
  const byEstado = estadoSlices.map((item) => ({
    ...item,
    percentage: sumEstados > 0 ? Math.round((item.value / sumEstados) * 100) : 0,
    displayName: `${item.name}:${item.value}`,
  }));

  const dailyTrend = tendenciaDiaria.map((d) => ({
    fecha: format(parseISO(d.fecha), 'dd/MM', { locale: es }),
    total: d.total,
  }));

  const criticalZones = [...porZona]
    .sort((a, b) => b.abiertos - a.abiertos || b.total - a.total)
    .slice(0, 5);

  const criticalCats = [...porCategoria]
    .filter((c) => c.total > 0)
    .sort((a, b) => b.abiertos - a.abiertos)
    .slice(0, 5);

  const periodoLabel = `${format(parseISO(periodo.from), 'dd MMM yyyy', { locale: es })} – ${format(parseISO(periodo.to), 'dd MMM yyyy', { locale: es })}`;
  const maxCell = Math.max(
    1,
    ...[...matriz.cell.values()].map((c) => c.total),
  );

  return (
    <div className="space-y-6">
      {/* Filtro de fechas */}
      <div className="card p-4 flex flex-col lg:flex-row lg:items-end gap-3 justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">Período analítico</p>
          <p className="text-xs text-slate-500">
            Mostrando: {periodoLabel}
            {loading ? ' · actualizando…' : ''}
          </p>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2">
          <div className="flex gap-1.5">
            {[
              { label: '7d', days: 7 },
              { label: '30d', days: 30 },
              { label: '90d', days: 90 },
            ].map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => applyPreset(p.days)}
                className="px-2.5 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="text-xs text-slate-500 font-medium">
            Desde
            <input
              type="date"
              className="mt-1 block input-field py-2 text-sm"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500 font-medium">
            Hasta
            <input
              type="date"
              className="mt-1 block input-field py-2 text-sm"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={applyRange}
            disabled={loading || (fromDate === appliedFrom && toDate === appliedTo)}
            className="btn-primary text-xs font-bold px-4 py-2.5 disabled:opacity-50"
          >
            {loading ? 'Cargando…' : 'Aplicar'}
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard Icon={FileText} color="blue" label="Total reportes" value={kpis.total} />
        <KpiCard Icon={AlertTriangle} color="red" label="Pendientes" value={kpis.pendientes} />
        <KpiCard Icon={Clock} color="amber" label="En proceso" value={kpis.enProceso} />
        <KpiCard Icon={CheckCircle2} color="green" label="Solucionados" value={kpis.solucionados} />
      </div>

      {/* Tiempos de atención */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          Icon={Timer}
          color="blue"
          label="Tiempo medio"
          value={formatHoras(kpis.tiempoAtencion.promedioHoras)}
          hint={kpis.tiempoAtencion.nMuestra ? `${kpis.tiempoAtencion.nMuestra} resueltos` : 'Sin muestra'}
        />
        <KpiCard
          Icon={Timer}
          color="amber"
          label="Mediana"
          value={formatHoras(kpis.tiempoAtencion.medianaHoras)}
        />
        <KpiCard
          Icon={Timer}
          color="red"
          label="P90 atención"
          value={formatHoras(kpis.tiempoAtencion.p90Horas)}
        />
        <KpiCard
          Icon={RotateCcw}
          color="green"
          label="Reabiertos"
          value={kpis.reabiertos}
        />
      </div>

      {/* Categoría + estado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title mb-4">Reportes por categoría</p>
          {byTipo.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byTipo} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="tipo" width={130} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="total" name="Reportes" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
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
            <EmptyState />
          )}
        </div>
      </div>

      {/* Tendencia + zonas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title mb-4">Tendencia diaria</p>
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>

        <div className="card p-5 flex flex-col">
          <p className="section-title mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Zonas críticas
          </p>
          <div className="space-y-3 flex-1">
            {criticalZones.length === 0 ? (
              <EmptyState />
            ) : (
              criticalZones.map((z, i) => (
                <div key={z.zona} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">{z.zona}</p>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{
                          width: `${(z.total / Math.max(...criticalZones.map((c) => c.total))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500 shrink-0">
                    <span className="font-semibold text-red-600">{z.abiertos}</span>/{z.total}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Problemas por zona: matriz categoría × zona */}
      <div className="card p-5">
        <p className="section-title mb-1 flex items-center gap-2">
          <Grid3X3 className="h-4 w-4" /> Problemas por zona
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Cruce de tipologías principales con las zonas de mayor volumen (abiertos / total).
        </p>
        {matriz.zonas.length === 0 || matriz.categorias.length === 0 ? (
          <EmptyState text="Sin cruce zona × categoría en el período" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-3 sticky left-0 bg-white">
                    Zona \ Categoría
                  </th>
                  {matriz.categorias.map((cat) => (
                    <th
                      key={cat}
                      className="text-center text-[11px] font-semibold text-slate-500 pb-2 px-2 max-w-[110px]"
                      title={cat}
                    >
                      <span className="line-clamp-2">{cat}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriz.zonas.map((zona) => (
                  <tr key={zona} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-3 text-xs font-medium text-slate-800 truncate max-w-[140px] sticky left-0 bg-white">
                      {zona}
                    </td>
                    {matriz.categorias.map((cat) => {
                      const cell = matriz.cell.get(`${zona}||${cat}`);
                      const intensity = cell ? cell.total / maxCell : 0;
                      return (
                        <td key={`${zona}-${cat}`} className="py-2 px-2 text-center">
                          {cell ? (
                            <div
                              className="rounded-lg px-1.5 py-1.5 mx-auto max-w-[88px]"
                              style={{
                                backgroundColor: `rgba(37, 99, 235, ${0.08 + intensity * 0.35})`,
                              }}
                              title={`${cat} en ${zona}: ${cell.abiertos} abiertos / ${cell.total} total`}
                            >
                              <p className="text-xs font-bold text-slate-900">{cell.total}</p>
                              <p className="text-[10px] text-red-600 font-semibold">
                                {cell.abiertos} ab.
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ranking + categorías abiertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="section-title mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Ranking de responsables
          </p>
          {rankingResponsables.length === 0 ? (
            <EmptyState text="Sin cierres registrados en el período" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Usuario</th>
                    <th className="pb-2 font-medium text-right">Resueltos</th>
                    <th className="pb-2 font-medium text-right">Reaperturas</th>
                    <th className="pb-2 font-medium text-right">T. medio</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingResponsables.map((r, i) => (
                    <tr key={r.usuarioId} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 text-slate-400">{i + 1}</td>
                      <td className="py-2.5 font-medium text-slate-800 truncate max-w-[180px]">
                        {r.email}
                      </td>
                      <td className="py-2.5 text-right text-green-700 font-semibold">{r.resueltos}</td>
                      <td className="py-2.5 text-right text-amber-700">{r.reaperturas}</td>
                      <td className="py-2.5 text-right text-slate-600">
                        {formatHoras(r.tiempoMedioHoras)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="section-title mb-4">Categorías con más abiertos</p>
          <div className="space-y-3">
            {criticalCats.length === 0 ? (
              <EmptyState />
            ) : (
              criticalCats.map((ct, i) => (
                <div key={ct.categoriaId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">{ct.nombre}</p>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${(ct.total / Math.max(...criticalCats.map((c) => c.total))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500 shrink-0">
                    <span className="font-semibold text-red-600">{ct.abiertos}</span>/{ct.total}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text = 'Sin datos' }: { text?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-8">
      {text}
    </div>
  );
}

function KpiCard({
  Icon,
  color,
  label,
  value,
  hint,
}: {
  Icon: ComponentType<{ className?: string }>;
  color: 'blue' | 'red' | 'amber' | 'green';
  label: string;
  value: string | number;
  hint?: string;
}) {
  const colors = {
    blue:  { bg: 'bg-blue-50',   icon: 'text-blue-600',  iconBg: 'bg-blue-100'  },
    red:   { bg: 'bg-red-50',    icon: 'text-red-600',   iconBg: 'bg-red-100'   },
    amber: { bg: 'bg-amber-50',  icon: 'text-amber-600', iconBg: 'bg-amber-100' },
    green: { bg: 'bg-green-50',  icon: 'text-green-600', iconBg: 'bg-green-100' },
  }[color];

  return (
    <div className={`card p-5 ${colors.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <div className={`h-9 w-9 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}
