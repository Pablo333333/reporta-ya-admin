'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfigAPI } from '@/lib/api';
import type { Rol, Permiso } from '@/lib/types';
import { Shield, ShieldCheck, ShieldAlert, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [selectedRolId, setSelectedRolId] = useState<string | null>(null);
  const [selectedPermisos, setSelectedPermisos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permisosRes] = await Promise.all([
        ConfigAPI.getRoles(),
        ConfigAPI.getPermisos(),
      ]);
      setRoles(rolesRes.data);
      setPermisos(permisosRes.data);
      if (rolesRes.data.length > 0 && !selectedRolId) {
        setSelectedRolId(rolesRes.data[0].id);
        setSelectedPermisos(rolesRes.data[0].permisos?.map(p => p.permisoId) || []);
      }
    } catch (err) {
      toast.error('Error al cargar roles y permisos');
    } finally {
      setLoading(false);
    }
  }, [selectedRolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedRolId) {
      const rol = roles.find(r => r.id === selectedRolId);
      if (rol) {
        setSelectedPermisos(rol.permisos?.map(p => p.permisoId) || []);
      }
    }
  }, [selectedRolId, roles]);

  const handleTogglePermiso = (permisoId: string) => {
    setSelectedPermisos(prev => 
      prev.includes(permisoId) 
        ? prev.filter(id => id !== permisoId) 
        : [...prev, permisoId]
    );
  };

  const handleSave = async () => {
    if (!selectedRolId) return;
    setSaving(true);
    try {
      await ConfigAPI.updateRolPermisos(selectedRolId, selectedPermisos);
      toast.success('Permisos actualizados correctamente');
      loadData();
    } catch (err) {
      toast.error('No se pudieron actualizar los permisos');
    } finally {
      setSaving(false);
    }
  };

  const selectedRol = roles.find(r => r.id === selectedRolId);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Roles y Permisos</h1>
        <p className="text-slate-500 font-medium">Configura el acceso granular para cada tipo de usuario</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-full">
        {/* Sidebar: Roles */}
        <div className="w-full md:w-64 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3">Roles del Sistema</p>
          {roles.map((rol) => (
            <button
              key={rol.id}
              onClick={() => setSelectedRolId(rol.id)}
              className={clsx(
                'w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all',
                selectedRolId === rol.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              )}
            >
              <div className="flex items-center gap-3">
                <Shield className={clsx('h-4 w-4', selectedRolId === rol.id ? 'text-white' : 'text-primary-500')} />
                {rol.nombre}
              </div>
              <span className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded-md font-black',
                selectedRolId === rol.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
              )}>
                {rol.permisos?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Main: Permisos */}
        <div className="flex-1">
          {loading ? (
            <div className="card p-20 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
            </div>
          ) : selectedRol ? (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-xl">
                    <ShieldCheck className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Permisos para {selectedRol.nombre}</h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedRol.descripcion || 'Sin descripción'}</p>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 py-2 px-4 text-xs"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permisos.map((permiso) => {
                  const isChecked = selectedPermisos.includes(permiso.id);
                  return (
                    <label
                      key={permiso.id}
                      className={clsx(
                        'flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all',
                        isChecked 
                          ? 'bg-primary-50/50 border-primary-200 ring-1 ring-primary-100' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      )}
                    >
                      <div className={clsx(
                        'h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all',
                        isChecked ? 'bg-primary-600 border-primary-600' : 'border-slate-200'
                      )}>
                        {isChecked && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isChecked}
                        onChange={() => handleTogglePermiso(permiso.id)}
                      />
                      <div>
                        <p className={clsx('text-sm font-bold', isChecked ? 'text-primary-900' : 'text-slate-700')}>
                          {permiso.nombre.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">{permiso.descripcion || 'Permiso del sistema'}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {permisos.length === 0 && (
                <div className="py-20 text-center">
                  <ShieldAlert className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No hay permisos definidos en el sistema.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-20 text-center">
              <p className="text-slate-400">Selecciona un rol para gestionar sus permisos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
