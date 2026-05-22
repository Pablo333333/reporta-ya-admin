'use client';

import { useEffect, useState } from 'react';
import { ConfigAPI } from '@/lib/api';
import { Territorio } from '@/lib/types';
import { Globe, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export default function ProjectSelector() {
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedId = localStorage.getItem('selected_territorio_id');
    setSelectedId(savedId);

    ConfigAPI.getTerritorios()
      .then((res) => {
        setTerritorios(res.data);
        // Si no hay uno guardado, seleccionamos el primero por defecto
        if (!savedId && res.data.length > 0) {
          const firstId = res.data[0].id;
          localStorage.setItem('selected_territorio_id', firstId);
          setSelectedId(firstId);
        }
      })
      .catch((err) => console.error('Error cargando territorios:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (id: string) => {
    localStorage.setItem('selected_territorio_id', id);
    setSelectedId(id);
    // Recargar la página para que todos los componentes vuelvan a pedir datos con el nuevo header
    window.location.reload();
  };

  const currentTerritorio = territorios.find(t => t.id === selectedId);

  if (loading) return <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg" />;

  return (
    <div className="relative group">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-primary-300 transition-colors cursor-pointer">
        <Globe className="h-4 w-4 text-primary-600" />
        <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
          {currentTerritorio?.nombre || 'Seleccionar Proyecto'}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </div>

      <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cambiar Territorio</p>
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {territorios.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={clsx(
                'w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                t.id === selectedId 
                  ? 'bg-primary-50 text-primary-700 font-bold' 
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
