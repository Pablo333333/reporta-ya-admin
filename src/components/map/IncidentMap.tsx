'use client';

import { GoogleMap, InfoWindowF, MarkerF, useLoadScript, HeatmapLayerF, CircleF } from '@react-google-maps/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Reporte } from '@/lib/types';
import { AlertTriangle, Info, MapPin, TrendingUp } from 'lucide-react';

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

export default function IncidentMap({ reports, mode = 'markers' }: Props) {
  const [selected, setSelected] = useState<Reporte | null>(null);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

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

  const heatmapData = useMemo(() => {
    if (!isLoaded) return [];
    return reports.map(r => new google.maps.LatLng(r.latitud, r.longitud));
  }, [reports, isLoaded]);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600 mb-1">No se pudo cargar Google Maps</p>
          <p className="text-sm">Verificá la API Key en .env.local</p>
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
      {/* Marcadores Individuales */}
      {(mode === 'markers' || mode === 'risk-zones') && reports.map((r) => (
        <MarkerF
          key={r.id}
          position={{ lat: r.latitud, lng: r.longitud }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: r.estado.color || '#000000',
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

      {/* Mapa de Calor */}
      {mode === 'heatmap' && (
        <HeatmapLayerF
          data={heatmapData}
          options={{
            radius: 40,
            opacity: 0.8,
          }}
        />
      )}

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
                style={{ backgroundColor: selected.estado.color + '20' }}
              >
                <MapPin size={18} style={{ color: selected.estado.color }} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm leading-tight">
                  {selected.categoria.nombre}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {selected.estado.nombre}
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
                  ? 'Esta zona requiere intervención inmediata por alta acumulación de reportes críticos.' 
                  : selectedZone.riskScore >= 4
                  ? 'Zona bajo vigilancia. Se recomienda programar inspección técnica.'
                  : 'Nivel de riesgo bajo. Monitoreo preventivo activo.'}
              </p>
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
