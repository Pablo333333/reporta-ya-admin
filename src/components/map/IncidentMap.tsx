'use client';

import { GoogleMap, InfoWindowF, MarkerF, useLoadScript, HeatmapLayerF } from '@react-google-maps/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Reporte } from '@/lib/types';

const MAP_CONTAINER_STYLE = { width: '100%', height: '500px', minHeight: '500px' };
const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 };
const LIBRARIES: ("visualization" | "places" | "drawing" | "geometry")[] = ["visualization"];

interface Props {
  reports: Reporte[];
  mode?: 'markers' | 'heatmap';
}

export default function IncidentMap({ reports, mode = 'markers' }: Props) {
  const [selected, setSelected] = useState<Reporte | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Invalidate size equivalent for Google Maps
  useEffect(() => {
    if (map) {
      window.dispatchEvent(new Event('resize'));
    }
  }, [map, mode]);

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
      zoom={12}
      onLoad={onMapLoad}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      }}
      onClick={() => setSelected(null)}
    >
      {mode === 'markers' && reports.map((r) => (
        <MarkerF
          key={r.id}
          position={{ lat: r.latitud, lng: r.longitud }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: r.estado.color || '#000000',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }}
          onClick={(e) => {
            e.stop?.();
            setSelected(r);
          }}
        />
      ))}

      {mode === 'heatmap' && (
        <HeatmapLayerF
          data={heatmapData}
          options={{
            radius: 30,
            opacity: 0.7,
          }}
        />
      )}

      {selected && mode === 'markers' && (
        <InfoWindowF
          position={{ lat: selected.latitud, lng: selected.longitud }}
          onCloseClick={() => setSelected(null)}
          options={{ maxWidth: 300 }}
        >
          <div className="p-1 min-w-[200px]">
            <div className="flex items-start gap-2 mb-2">
              <span
                className="mt-0.5 h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selected.estado.color || '#000' }}
              />
              <div>
                <p className="font-semibold text-slate-900 text-sm leading-tight">
                  {selected.categoria.nombre}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selected.estado.nombre}
                </p>
              </div>
            </div>

            {selected.comentario && (
              <p className="text-xs text-slate-600 italic mb-2 border-l-2 border-slate-200 pl-2">
                &ldquo;{selected.comentario}&rdquo;
              </p>
            )}

            <div className="text-xs text-slate-500 space-y-0.5">
              <p>
                <span className="font-medium">Fecha:</span>{' '}
                {format(parseISO(selected.fechaCreacion), "dd MMM yyyy HH:mm", { locale: es })}
              </p>
              <p className="font-mono text-[10px] text-slate-400 mt-1">
                {selected.latitud.toFixed(5)}, {selected.longitud.toFixed(5)}
              </p>
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
