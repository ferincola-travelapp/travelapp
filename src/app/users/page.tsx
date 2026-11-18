'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Shield, Plus, Search, Trash2, Edit2, Building2, Mail, CheckCircle2,
  Lock, Save, RefreshCw, Eye, Landmark, HelpCircle, ArrowRight, ShieldCheck, CheckSquare
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BUSINESS_UNITS_CONFIG, OfficialBusinessUnit, UserRole } from '@/lib/permissions';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  allowedUnits?: OfficialBusinessUnit[];
  allowedSectors?: string[];
  active: boolean;
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
  location: string;
}

const MODULE_FEATURES = [
  {
    module: 'Visión Global',
    items: [
      { id: 'metrics', label: 'Métricas del Sistema' },
      { id: 'users', label: 'Gestión de Usuarios' },
      { id: 'branches', label: 'Gestión de Sucursales' },
      { id: 'messages', label: 'Centro de Mensajería' },
    ]
  },
  {
    module: 'CRM Ventas',
    items: [
      { id: 'leads', label: 'Tablero de Leads' },
      { id: 'agenda', label: 'Mi Agenda (Meet)' },
      { id: 'history', label: 'Historial de Ventas' },
      { id: 'customers', label: 'Lista de Clientes' },
      { id: 'travis', label: 'Travis IA ✦' },
    ]
  },
  {
    module: 'Logística TravelCab',
    items: [
      { id: 'dashboard', label: 'Principal (Métricas)' },
      { id: 'dispatch', label: 'Central de Despacho (Mapa)' },
      { id: 'branches', label: 'Gestión de Sucursal (Caja)' },
      { id: 'drivers', label: 'Gestión de Conductores' },
      { id: 'fleet', label: 'Gestión de Móviles (Flota)' },
      { id: 'travelcab-create-service', label: 'Crear Servicio' },
      { id: 'travelcab-create-category', label: 'Crear Categoría' },
      { id: 'settings', label: 'Gestión de Tarifas' },
      { id: 'security', label: 'Seguridad del Ecosistema' },
    ]
  },
  {
    module: 'Experiencias & Tours',
    items: [
      { id: 'dashboard', label: 'Principal (Métricas)' },
      { id: 'catalog', label: 'Catálogo de Viajes' },
      { id: 'create-customer', label: 'Crear Cliente' },
      { id: 'create-reservation', label: 'Crear Reserva' },
      { id: 'create-group-trip', label: 'Crear Viaje Grupal' },
      { id: 'spots', label: 'Cupos Disponibles' },
      { id: 'coordinators', label: 'Gestión de Coordinadores' },
      { id: 'coordinator-app', label: 'Gestión de App Coordinador' },
    ]
  },
  {
    module: 'Rewards & Fidelización',
    items: [
      { id: 'analytics', label: 'Principal (Respaldo)' },
      { id: 'rewards-create-merchant', label: 'Comercio Asociado' },
      { id: 'rewards-create-rubro', label: 'Crear Rubro' },
      { id: 'rewards-create-category', label: 'Crear Categoría' },
      { id: 'validator', label: 'Validador de Cupones' },
      { id: 'merchants', label: 'Gestión de Comercios' },
      { id: 'settings', label: 'Reglas de Recompensa' },
    ]
  },
  {
    module: 'Recursos Humanos (RRHH)',
    items: [
      { id: 'partners', label: 'Lista de Socios (Choferes)' },
      { id: 'new-partner', label: 'Nuevo Conductor' },
      { id: 'applications', label: 'Postulaciones' },
      { id: 'staff', label: 'Gestión de Personal' },
      { id: 'org-chart', label: 'Organigrama Empresarial' },
    ]
  },
  {
    module: 'CMS Web',
    items: [
      { id: 'cms', label: 'Gestor CMS' }
    ]
  },
  {
    module: 'Auditoría Contable',
    items: [
      { id: 'audit', label: 'Auditoría Contable' }
    ]
  }
];

export default function StaffUsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [selectedRole, setSelectedRole] = useState<UserRole>('operator');

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Permissions state from firestore
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    super_admin: {},
    admin: {},
    operator: {},
    viewer: {}
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'operator' as UserRole,
    branchId: '1',
    allowedUnits: [] as OfficialBusinessUnit[],
    allowedSectors: [] as string[],
    active: true
  });

  // Load branches
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const list: Branch[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Sucursal',
        location: doc.data().location || ''
      }));
      setBranches(list.length > 0 ? list : [
        { id: '1', name: 'Sucursal Retiro', location: 'CABA' },
        { id: '2', name: 'Sucursal Pilar', location: 'GBA Norte' },
        { id: '3', name: 'Sucursal Tucumán', location: 'Tucumán' }
      ]);
    });
    return () => unsub();
  }, []);

  // Load staff users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'staff_users'), (snapshot) => {
      const list: StaffUser[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'operator',
          branchId: data.branchId || '1',
          branchName: data.branchName || 'Sucursal',
          allowedUnits: Array.isArray(data.allowedUnits) ? data.allowedUnits : [],
          allowedSectors: Array.isArray(data.allowedSectors) ? data.allowedSectors : [],
          active: data.active !== undefined ? data.active : true,
          createdAt: data.createdAt || new Date().toISOString().split('T')[0]
        };
      });
      setStaff(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading staff users:", error);
      setStaff([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load permissions in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'role_permissions'), (snapshot) => {
      const perms: Record<string, Record<string, boolean>> = {
        admin: {},
        operator: {},
        viewer: {}
      };
      snapshot.forEach(docSnap => {
        perms[docSnap.id] = docSnap.data().permissions || {};
      });
      setRolePermissions(perms);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    const id = editingId || Math.random().toString(36).substr(2, 9);
    const selectedBranch = branches.find(b => b.id === form.branchId);
    const branchName = form.branchId === 'all' ? 'Todas las Sucursales' : (selectedBranch?.name || 'Sucursal');

    const payload = {
      name: form.name,
      email: form.email.trim().toLowerCase(),
      role: form.role,
      branchId: form.branchId,
      branchName,
      allowedUnits: form.role === 'super_admin' ? [] : form.allowedUnits,
      allowedSectors: form.role === 'super_admin' ? [] : form.allowedSectors,
      active: form.active,
      createdAt: editingId ? (staff.find(s => s.id === editingId)?.createdAt || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]
    };

    try {
      await setDoc(doc(db, 'staff_users', id), payload);
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', email: '', role: 'operator', branchId: '1', allowedUnits: [], allowedSectors: [], active: true });
    } catch (err) {
      console.error("Error saving staff user:", err);
    }
  };

  const handleEdit = (user: StaffUser) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      allowedUnits: user.allowedUnits || [],
      allowedSectors: user.allowedSectors || [],
      active: user.active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar a este usuario interno?')) {
      try {
        await deleteDoc(doc(db, 'staff_users', id));
      } catch (err) {
        console.error("Error deleting staff user:", err);
      }
    }
  };

  const handleTogglePermission = async (featureId: string) => {
    const currentRolePerms = { ...(rolePermissions[selectedRole] || {}) };
    const nextVal = !currentRolePerms[featureId];
    currentRolePerms[featureId] = nextVal;

    try {
      await setDoc(doc(db, 'role_permissions', selectedRole), {
        permissions: currentRolePerms
      }, { merge: true });
    } catch (err) {
      console.error("Error saving permission:", err);
    }
  };

  const filtered = staff.filter(user => {
    const matchSearch = user.name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || user.role === filterRole;
    return matchSearch && matchRole;
  });

  const admins = staff.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
  const operators = staff.filter(u => u.role === 'operator').length;
  const viewers = staff.filter(u => u.role === 'viewer').length;

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-tech-blue">
            <Shield className="h-7 w-7 text-tech-blue" /> Gestión de Usuarios &amp; Accesos
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Administración de credenciales, sucursales y matriz de permisos por roles de Concorde 360.</p>
        </div>
        
        {activeTab === 'users' && (
          <button
            onClick={() => {
              setEditingId(null);
              setForm({ name: '', email: '', role: 'operator', branchId: '1', allowedUnits: [], allowedSectors: [], active: true });
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center space-x-2 rounded-xl bg-tech-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-tech-blue/90 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Usuario</span>
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex space-x-1 rounded-xl bg-white/50 p-1 backdrop-blur-md w-max border border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center rounded-lg px-6 py-2 transition-all text-xs font-bold ${
            activeTab === 'users'
              ? 'bg-tech-blue text-white shadow-md'
              : 'text-slate-500 hover:text-tech-blue hover:bg-slate-100'
          }`}
        >
          <Users className="mr-2 h-4 w-4" />
          Lista de Usuarios
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center rounded-lg px-6 py-2 transition-all text-xs font-bold ${
            activeTab === 'permissions'
              ? 'bg-tech-blue text-white shadow-md'
              : 'text-slate-500 hover:text-tech-blue hover:bg-slate-100'
          }`}
        >
          <Lock className="mr-2 h-4 w-4" />
          Matriz de Permisos por Rol
        </button>
      </div>

      {/* TAB 1: User Directory List */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Personal', value: staff.length, color: 'text-tech-blue' },
              { label: 'Administradores', value: admins, color: 'text-rose-600' },
              { label: 'Operadores', value: operators, color: 'text-amber-600' },
              { label: 'Lectores (Viewer)', value: viewers, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="mt-0.5 text-xs text-slate-500 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 shadow-sm outline-none focus:border-tech-blue/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none font-medium"
              >
                <option value="all">Todos los Roles</option>
                <option value="super_admin">Super Admin (Acceso Total)</option>
                <option value="admin">Administrador</option>
                <option value="operator">Operador</option>
                <option value="viewer">Lector (Viewer)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Personal</th>
                    <th className="px-4 py-3 text-left">Email / Contacto</th>
                    <th className="px-4 py-3 text-left">Rol de Acceso</th>
                    <th className="px-4 py-3 text-left">Unidad &amp; Sectores</th>
                    <th className="px-4 py-3 text-left">Sucursal</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {filtered.map(user => (
                    <tr key={user.id} className="group hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-tech-blue/10 text-xs font-bold text-tech-blue">
                            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{user.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <p className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" /> {user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {user.role === 'super_admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 font-bold text-purple-700">
                            Super Admin
                          </span>
                        ) : user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 font-bold text-rose-700">
                            Administrador
                          </span>
                        ) : user.role === 'operator' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-700">
                            Operador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 font-bold text-blue-700">
                            Lector (Viewer)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.role === 'super_admin' ? (
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                            Todo el Ecosistema (Global)
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap gap-1">
                              {(user.allowedUnits && user.allowedUnits.length > 0) ? (
                                user.allowedUnits.map(u => (
                                  <span key={u} className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                                    {u}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-rose-500 font-semibold">Sin unidad asignada</span>
                              )}
                            </div>
                            {user.allowedSectors && user.allowedSectors.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {user.allowedSectors.map(s => (
                                  <span key={s} className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-650">
                        <Building2 className="h-3.5 w-3.5 inline mr-1 text-slate-400" /> {user.branchName}
                      </td>
                      <td className="px-4 py-3">
                        {user.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-250 px-2 py-0.5 font-bold text-emerald-700">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 font-bold text-slate-400">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-250 bg-white px-2 py-1 text-slate-650 hover:border-tech-blue/40"
                          >
                            <Edit2 className="h-3 w-3" /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-slate-450 hover:text-red-500 p-1 hover:bg-slate-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Permissions matrix */}
      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Roles selection */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider mb-2">Seleccionar Rol</h3>
            {['super_admin', 'admin', 'operator', 'viewer'].map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role as UserRole)}
                className={`w-full text-left p-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-between ${
                  selectedRole === role
                    ? 'bg-tech-blue border-tech-blue text-white shadow-md'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>
                  {role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Administrador' : role === 'operator' ? 'Operador' : 'Lector (Viewer)'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* Matrix check grid */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-tech-blue text-sm">
                  Configuración de Accesos para: <span className="uppercase text-vial-orange font-black">
                    {selectedRole === 'super_admin' ? 'Super Admin' : selectedRole === 'admin' ? 'Administrador' : selectedRole === 'operator' ? 'Operador' : 'Lector (Viewer)'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Tilda los botones que este rol podrá visualizar y operar en su sidebar vertical.</p>
              </div>
            </div>

            <div className="space-y-6">
              {MODULE_FEATURES.map(mod => {
                return (
                  <div key={mod.module} className="space-y-3 border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">{mod.module}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {mod.items.map(feat => {
                        const isGranted = (selectedRole === 'admin' || selectedRole === 'super_admin')
                          ? (rolePermissions[selectedRole]?.[feat.id] !== false) 
                          : (rolePermissions[selectedRole]?.[feat.id] === true);

                        return (
                          <label
                            key={feat.id}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                              isGranted
                                ? 'bg-emerald-50/40 border-emerald-250 text-slate-800'
                                : 'bg-slate-50/50 border-slate-100 text-slate-400'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{feat.label}</span>
                              <span className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {feat.id}</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => handleTogglePermission(feat.id)}
                              className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Editar Usuario Interno' : 'Nuevo Usuario Interno'}
              </h2>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                  placeholder="Ej: Laura Gómez"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                  placeholder="laura@travelapp.ar"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Rol de Acceso</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none bg-white focus:border-tech-blue font-semibold"
                  >
                    <option value="super_admin">Super Admin (Acceso Total)</option>
                    <option value="admin">Administrador</option>
                    <option value="operator">Operador</option>
                    <option value="viewer">Lector (Viewer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Sucursal Asignada</label>
                  <select
                    value={form.branchId}
                    onChange={e => setForm(p => ({ ...p, branchId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none bg-white focus:border-tech-blue font-semibold"
                  >
                    <option value="all">Todas las Sucursales</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {form.role === 'super_admin' ? (
                <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-800 font-medium">
                  El rol <strong>Super Admin</strong> tiene visibilidad global sobre todas las unidades de negocio, sectores, mensajes y grabaciones de llamadas.
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Unidades de Negocio Autorizadas</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BUSINESS_UNITS_CONFIG.map(unit => {
                        const checked = form.allowedUnits.includes(unit.id);
                        return (
                          <label
                            key={unit.id}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold cursor-pointer transition-all ${
                              checked ? 'bg-sky-50 border-tech-blue/40 text-tech-blue' : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setForm(p => {
                                  const nextUnits = checked
                                    ? p.allowedUnits.filter(u => u !== unit.id)
                                    : [...p.allowedUnits, unit.id];
                                  return { ...p, allowedUnits: nextUnits };
                                });
                              }}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-tech-blue"
                            />
                            <span className="truncate">{unit.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {form.allowedUnits.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        Sectores / Áreas <span className="font-normal text-slate-400">(vacío = todos los de la unidad)</span>
                      </label>
                      <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {BUSINESS_UNITS_CONFIG.filter(u => form.allowedUnits.includes(u.id)).map(unit => (
                          <div key={unit.id} className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{unit.label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {unit.sectors.map(sector => {
                                const isSectorChecked = form.allowedSectors.includes(sector);
                                return (
                                  <label
                                    key={`${unit.id}-${sector}`}
                                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium cursor-pointer transition-all ${
                                      isSectorChecked
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSectorChecked}
                                      onChange={() => {
                                        setForm(p => ({
                                          ...p,
                                          allowedSectors: isSectorChecked
                                            ? p.allowedSectors.filter(s => s !== sector)
                                            : [...p.allowedSectors, sector]
                                        }));
                                      }}
                                      className="h-3 w-3 rounded border-slate-300 text-emerald-600"
                                    />
                                    <span>{sector}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-tech-blue focus:ring-tech-blue"
                />
                <label htmlFor="active" className="text-xs font-bold text-slate-650 cursor-pointer">Usuario Activo (Habilitar accesos)</label>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-tech-blue px-4 py-2 text-xs font-bold text-white hover:bg-tech-blue/90"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
