'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  allowedModules: string[];
  active: boolean;
}

const ALL_MODULES = [
  { id: 'vision_general', label: 'Visión General' },
  { id: 'administracion', label: 'Administración' },
  { id: 'recursos_humanos', label: 'Recursos Humanos' },
  { id: 'cms_web', label: 'CMS Web' },
  { id: 'travelcab', label: 'TravelCab' },
  { id: 'travelapp', label: 'TravelApp' },
  { id: 'travelapp_experience', label: 'TravelApp Experience' },
  { id: 'travelapp_rewards', label: 'TravelApp Rewards' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'crm', label: 'CRM' },
  { id: 'mensajeria', label: 'Centro de Mensajería' },
  { id: 'panel_b2b', label: 'Panel B2B' },
];

export function UsersTab() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operador');
  const [selectedModules, setSelectedModules] = useState<string[]>(['panel_b2b']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'staff_users'), (snap) => {
      setUsers(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || 'Usuario',
          email: d.data().email || '',
          role: d.data().role || 'operador',
          allowedModules: Array.isArray(d.data().allowedModules) ? d.data().allowedModules : [],
          active: d.data().active !== false,
        }))
      );
    });
    return () => unsub();
  }, []);

  const toggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'staff_users'), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim(),
        allowedModules: role === 'superadmin' ? ['*'] : selectedModules,
        active: true,
        createdAt: Date.now(),
      });
      setName('');
      setEmail('');
      setRole('operador');
      setSelectedModules(['panel_b2b']);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: StaffUser) => {
    await updateDoc(doc(db, 'staff_users', u.id), { active: !u.active });
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'staff_users', id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Gestión de Usuarios y Permisos</h2>
          <p className="text-xs text-slate-500">
            Crea operadores y define exactamente qué módulos ven al ingresar a Concorde 360.
          </p>
        </div>
        <span className="text-xs font-semibold text-[#0a2a5b] bg-[#0a2a5b]/5 px-3 py-1 rounded-full w-fit">
          {users.length} usuarios
        </span>
      </div>

      {/* Formulario alta usuario + checkboxes de módulos */}
      <form onSubmit={handleCreate} className="bg-white/75 border border-slate-200/90 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
            required
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@travelapp.ar"
            required
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
          >
            <option value="superadmin">Superadministrador (Acceso Total)</option>
            <option value="operador">Operador Personalizado</option>
            <option value="hotel_b2b">Usuario Hotel (B2B)</option>
            <option value="rrhh">Recursos Humanos</option>
          </select>
        </div>

        {role !== 'superadmin' && (
          <div>
            <p className="text-[11px] font-bold text-[#0a2a5b] mb-2">Módulos visibles para este usuario:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {ALL_MODULES.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50/80 border border-slate-200/70 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-[#0a2a5b]/40"
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(m.id)}
                    onChange={() => toggleModule(m.id)}
                    className="accent-[#0a2a5b]"
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
          >
            <UserPlus className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Crear Usuario'}</span>
          </button>
        </div>
      </form>

      {/* Tabla de usuarios */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/75">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/90 text-[#0a2a5b] border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4 font-bold">Usuario</th>
              <th className="py-3 px-4 font-bold">Rol</th>
              <th className="py-3 px-4 font-bold">Módulos Permitidos</th>
              <th className="py-3 px-4 font-bold">Estado</th>
              <th className="py-3 px-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No hay usuarios cargados en `staff_users`.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">{u.name}</p>
                    <p className="text-[11px] text-slate-500">{u.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0a2a5b]/10 text-[#0a2a5b] font-bold text-[11px]">
                      <Shield className="w-3 h-3" /> {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-600">
                    {u.allowedModules.includes('*')
                      ? 'Todos los módulos'
                      : u.allowedModules.length > 0
                      ? u.allowedModules.join(', ')
                      : 'Sin módulos asignados'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(u)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer ${
                        u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {u.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {u.active ? 'Activo' : 'Suspendido'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(u.id)}
                      className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
