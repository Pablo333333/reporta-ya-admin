'use client';

import { GoogleMap, InfoWindowF, MarkerF, useLoadScript, CircleF } from '@react-google-maps/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Reporte } from '@/lib/types';
import { AlertTriangle, MapPin, TrendingUp } from 'lucide-react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';

const MAP_CONTAINER_STYLE = { width: '100%', height: '600px', minHeight: '600px' };
const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 };
const LIBRARIES: ("visualization" | "places" | "drawing" | "geometry")[] = ["visualization"];

interface RiskZone {
  id: string;
  center: { lat: number; lng: number };
  radius: number;
  riskScore: number;
  count: number;
  color: string;
  reports: Reporte[];
}

interface Props {
  reports: Reporte[];
  mode?: 'markers' | 'heatmap' | 'risk-zones';
}

function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export default function IncidentMap({ reports, mode = 'markers' }: Props) {
  const [selected, setSelected] = useState<Reporte | null>(null);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [heatmapFailed, setHeatmapFailed] = useState(false);
  const [authFailure, setAuthFailure] = useState(false);

  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
  const hasApiKey = apiKey.length > 10;

  useEffect(() => {
    if (!hasApiKey) {
      console.error(
        '[IncidentMap] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ausente o vacía en .env.local',
      );
    }
  }, [hasApiKey]);

  useEffect(() => {
    const onAuthFailure = () => {
      console.error(
        '[IncidentMap] gm_authFailure: la API key fue rechazada. Revisá billing, Maps JavaScript API habilitada y restricciones HTTP referrer.',
      );
      setAuthFailure(true);
    };
    window.addEventListener('gm_authFailure', onAuthFailure);
    return () => window.removeEventListener('gm_authFailure', onAuthFailure);
  }, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: hasApiKey ? apiKey : 'INVALID_MISSING_KEY',
    libraries: LIBRARIES,
    // Evita reintentos inútiles si no hay key
    id: 'reporta-ya-google-maps',
  });

  useEffect(() => {
    if (loadError) {
      console.error('[IncidentMap] useLoadScript error:', loadError);
    }
  }, [loadError]);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Heatmap con fallback a marcadores si WebGL/deck.gl falla o no hay puntos
  useEffect(() => {
    if (mode !== 'heatmap' || !map) {
      setHeatmapFailed(false);
      return;
    }

    if (reports.length === 0) {
      setHeatmapFailed(true);
      return;
    }

    if (!isWebGLAvailable()) {
      console.warn('[IncidentMap] WebGL no disponible — fallback a marcadores');
      setHeatmapFailed(true);
      return;
    }

    let overlay: GoogleMapsOverlay | null = null;
    let disposed = false;

    try {
      overlay = new GoogleMapsOverlay({
        layers: [
          new HeatmapLayer({
            id: 'heatmap-layer',
            data: reports,
            getPosition: (d: Reporte) => [d.longitud, d.latitud],
            getWeight: (d: Reporte) => d.indiceRiesgo || 1,
            radiusPixels: 60,
            intensity: 1,
            threshold: 0.03,
            aggregation: 'SUM',
          }),
        ],
      });
      overlay.setMap(map);
      if (!disposed) setHeatmapFailed(false);
    } catch (err) {
      console.error('[IncidentMap] Error creando heatmap — fallback a marcadores:', err);
      if (!disposed) setHeatmapFailed(true);
    }

    return () => {
      disposed = true;
      try {
        overlay?.setMap(null);
      } catch {
        // ignore cleanup errors
      }
    };
  }, [map, mode, reports]);

  // Si el heatmap está activo pero falló, mostrar marcadores tradicionales
  const showMarkers =
    mode === 'markers' ||
    mode === 'risk-zones' ||
    (mode === 'heatmap' && heatmapFailed);

  // Lógica de agrupación para Zonas de Riesgo
  const riskZones = useMemo(() => {
    const zones: RiskZone[] = [];
    const threshold = 0.005; // ~500 metros aprox en lat/lng

    reports.forEach(report => {
      let foundZone = zones.find(z => 
        Math.abs(z.center.lat - report.latitud) < threshold && 
        Math.abs(z.center.lng - report.longitud) < threshold
      );

      if (foundZone) {
        foundZone.reports.push(report);
        foundZone.count++;
        foundZone.riskScore = Math.max(foundZone.riskScore, report.indiceRiesgo || 0);
      } else {
        zones.push({
          id: `zone-${report.id}`,
          center: { lat: report.latitud, lng: report.longitud },
          radius: 300,
          riskScore: report.indiceRiesgo || 0,
          count: 1,
          reports: [report],
          color: '#000000' // Temporal
        });
      }
    });

    return zones.map(z => {
      let color = '#16a34a'; // Verde (Bajo)
      if (z.riskScore >= 7 || z.count >= 3) color = '#dc2626'; // Rojo (Crítico)
      else if (z.riskScore >= 4 || z.count >= 2) color = '#f59e0b'; // Amarillo (Medio)
      
      return { ...z, color };
    });
  }, [reports]);

  const mapsErrorMessage = (() => {
    if (!hasApiKey) {
      return {
        title: 'Falta la API Key de Google Maps',
        detail:
          'Definí NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en admin-panel/.env.local y reiniciá el servidor de Next.js.',
        tips: [
          'Habilitá "Maps JavaScript API" en Google Cloud Console',
          'Activá facturación en el proyecto de Google Cloud',
        ],
      };
    }
    if (authFailure) {
      return {
        title: 'Google Maps rechazó la API Key',
        detail:
          'La clave existe pero falló la autenticación (billing, API no habilitada o restricciones de HTTP referrer).',
        tips: [
          'En restricciones de clave, agregá localhost:3001/* y tu dominio de producción',
          'Verificá que Maps JavaScript API esté habilitada',
          'Confirmá que la facturación del proyecto esté activa',
        ],
      };
    }
    if (loadError) {
      const raw = String((loadError as Error)?.message || loadError);
      const lower = raw.toLowerCase();
      let detail = raw;
      const tips = [
        'Revisá la consola del navegador (F12) por errores gm_authFailure / RefererNotAllowedMapError',
        'Verificá NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local',
      ];
      if (lower.includes('referer') || lower.includes('referrer')) {
        detail = 'Restricción de HTTP referrer: este origen no está permitido para la API key.';
        tips.unshift('Agregá http://localhost:3001/* a las restricciones de sitios web de la clave');
      } else if (lower.includes('billing')) {
        detail = 'Facturación no habilitada o con problemas en el proyecto de Google Cloud.';
      } else if (lower.includes('apinotactivated') || lower.includes('not activated')) {
        detail = 'Maps JavaScript API no está activada para esta clave/proyecto.';
      }
      return { title: 'No se pudo cargar Google Maps', detail, tips };
    }
    return null;
  })();

  if (mapsErrorMessage) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center text-slate-600 p-8 text-center">
        <div className="max-w-lg rounded-2xl border border-red-100 bg-red-50/80 p-6">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="font-bold text-red-700 mb-1">{mapsErrorMessage.title}</p>
          <p className="text-sm text-slate-700 mb-4">{mapsErrorMessage.detail}</p>
          <ul className="text-left text-xs text-slate-600 space-y-1.5 list-disc pl-5">
            {mapsErrorMessage.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
      </div>
    );
  }

  const center = reports.length > 0
    ? { lat: reports[0].latitud, lng: reports[0].longitud }
    : DEFAULT_CENTER;

  return (
    <div className="relative h-full w-full">
      {mode === 'heatmap' && heatmapFailed && (
        <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm">
          {reports.length === 0
            ? 'Sin puntos para el mapa de calor — no hay incidentes visibles'
            : 'Mapa de calor no disponible — mostrando marcadores'}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={13}
        onLoad={onMapLoad}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#616161" }]
            }
          ]
        }}
        onClick={() => {
          setSelected(null);
          setSelectedZone(null);
        }}
      >
        {/* Marcadores Individuales (+ fallback de heatmap) */}
        {showMarkers && reports.map((r) => (
          <MarkerF
            key={r.id}
            position={{ lat: r.latitud, lng: r.longitud }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: r.estado?.color || '#000000',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            onClick={(e) => {
              e.stop?.();
              setSelectedZone(null);
              setSelected(r);
            }}
          />
        ))}

        {/* Capas de Zonas de Riesgo */}
        {mode === 'risk-zones' && riskZones.map((zone) => (
          <CircleF
            key={zone.id}
            center={zone.center}
            radius={zone.radius}
            options={{
              fillColor: zone.color,
              fillOpacity: 0.25,
              strokeColor: zone.color,
              strokeOpacity: 0.8,
              strokeWeight: 2,
            }}
            onClick={(e) => {
              e.stop?.();
              setSelected(null);
              setSelectedZone(zone);
            }}
          />
        ))}

        {/* Popup de Reporte Individual */}
        {selected && (
          <InfoWindowF
            position={{ lat: selected.latitud, lng: selected.longitud }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="p-3 min-w-[240px] max-w-[300px]">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: (selected.estado?.color || '#64748b') + '20' }}
                >
                  <MapPin size={18} style={{ color: selected.estado?.color || '#64748b' }} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm leading-tight">
                    {selected.categoria?.nombre || 'Sin categoría'}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {selected.estado?.nombre || 'Sin estado'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-primary-600" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Riesgo Dinámico</span>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    (selected.indiceRiesgo || 0) >= 7 ? 'bg-red-100 text-red-700' :
                    (selected.indiceRiesgo || 0) >= 4 ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {selected.indiceRiesgo?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  &ldquo;{selected.comentario || 'Sin descripción adicional'}&rdquo;
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <span>{format(parseISO(selected.fechaCreacion), "dd MMM, HH:mm", { locale: es })}</span>
                <span className="text-primary-600 uppercase">Ver detalles →</span>
              </div>
            </div>
          </InfoWindowF>
        )}

        {/* Popup de Zona de Riesgo */}
        {selectedZone && (
          <InfoWindowF
            position={selectedZone.center}
            onCloseClick={() => setSelectedZone(null)}
          >
            <div className="p-4 min-w-[260px]">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shadow-md ${
                  selectedZone.color === '#dc2626' ? 'bg-red-600' :
                  selectedZone.color === '#f59e0b' ? 'bg-amber-500' :
                  'bg-green-600'
                }`}>
                  <AlertTriangle size={20} color="#fff" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base leading-tight">Zona de Riesgo</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Análisis Territorial
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Incidentes</p>
                  <p className="text-xl font-black text-slate-900">{selectedZone.count}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Score Máx</p>
                  <p className={`text-xl font-black ${
                    selectedZone.riskScore >= 7 ? 'text-red-600' :
                    selectedZone.riskScore >= 4 ? 'text-amber-600' :
                    'text-green-600'
                  }`}>
                    {selectedZone.riskScore.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${(selectedZone.riskScore / 10) * 100}%`,
                        backgroundColor: selectedZone.color 
                      }} 
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-400">{Math.round((selectedZone.riskScore / 10) * 100)}%</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  {selectedZone.riskScore >= 7 
                    ? 'Índice de riesgo alto: muchos reportes abiertos o prioridad elevada en la zona.' 
                    : selectedZone.riskScore >= 4
                    ? 'Riesgo medio según la fórmula territorial. Se recomienda inspección.'
                    : 'Riesgo bajo según gravedad y frecuencia de reportes abiertos.'}
                </p>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
