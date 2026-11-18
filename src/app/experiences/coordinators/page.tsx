'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Trash2, Edit2, Mail, Phone, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { collection, onSnapshot, setDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Coordinator {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentNumber: string;
  status: 'Disponible' | 'En Viaje' | 'Licencia';
  activeTripTitle?: string;
}

export default function ExperienceCoordinatorsPage() {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    documentNumber: '',
    status: 'Disponible' as any,
    activeTripTitle: ''
  });

  useEffect(() => {
    // Sincronización en vivo con Firestore
    const unsub = onSnapshot(collection(db, 'coordinators'), (snapshot) => {
      const list: Coordinator[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          documentNumber: data.documentNumber || '',
          status: data.status || 'Disponible',
          activeTripTitle: data.activeTripTitle || undefined
        };
      });
      setCoordinators(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading coordinators:", error);
      setCoordinators([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      documentNumber: '',
      status: 'Disponible',
      activeTripTitle: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c: Coordinator) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      documentNumber: c.documentNumber,
      status: c.status,
      activeTripTitle: c.activeTripTitle || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        documentNumber: form.documentNumber,
        status: form.status,
        activeTripTitle: form.status === 'En Viaje' ? form.activeTripTitle : ''
      };

      if (editingId) {
        await setDoc(doc(db, 'coordinators', editingId), payload);
      } else {
        const newId = `COORD-${Math.floor(10 + Math.random() * 90)}`;
        await setDoc(doc(db, 'coordinators', newId), payload);
      }
      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      console.error("Error saving coordinator:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar a este coordinador?')) {
      try {
        await deleteDoc(doc(db, 'coordinators', id));
      } catch (err) {
        console.error("Error deleting coordinator:", err);
      }
    }
  };

  const filtered = coordinators.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-tech-blue">
            <UserCheck className="h-7 w-7 text-green-500" />
            Gestión de Coordinadores
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Asignación de guías de ruta, estados de disponibilidad e itinerarios activos.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center space-x-2 rounded-xl bg-tech-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-tech-blue/90 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Coordinador</span>
        </button>
      </div>

      {/* Filters */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 shadow-sm outline-none focus:border-tech-blue/40 focus:ring-2 focus:ring-tech-blue/10 transition-all"
        />
      </div>

      {/* Directory grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando nómina de coordinadores...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(coord => (
            <div key={coord.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{coord.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {coord.id}</p>
                  </div>
                  {coord.status === 'Disponible' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-700 text-[9px] uppercase">
                      Disponible
                    </span>
                  ) : coord.status === 'En Viaje' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-bold text-indigo-700 text-[9px] uppercase">
                      En Viaje
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 font-bold text-slate-500 text-[9px] uppercase">
                      Licencia
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 space-y-1 mt-4">
                  <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> {coord.email}</p>
                  <p className="flex items-center gap-1.5 font-mono"><Phone className="h-3.5 w-3.5 text-slate-400" /> {coord.phone}</p>
                  <p className="text-[11px] text-slate-400 mt-1">DNI/Pasaporte: {coord.documentNumber || '—'}</p>
                </div>

                {coord.status === 'En Viaje' && coord.activeTripTitle && (
                  <div className="mt-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3 text-[11px] text-indigo-800">
                    <p className="font-bold">Viaje en Curso:</p>
                    <p className="mt-0.5 text-indigo-600 font-medium">{coord.activeTripTitle}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(coord)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:border-tech-blue hover:text-tech-blue transition-colors text-xs font-semibold"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(coord.id)}
                  className="p-1 hover:bg-red-50 text-red-500 rounded-lg hover:text-red-700 transition-colors"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-slate-50 p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Editar Coordinador' : 'Registrar Coordinador'}
              </h2>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">DNI / Documento</label>
                  <input
                    type="text"
                    value={form.documentNumber}
                    onChange={e => setForm(p => ({ ...p, documentNumber: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                    placeholder="33999888"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                    placeholder="+54 9 381..."
                  />
                </div>
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

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Estado de Operaciones</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none bg-white focus:border-tech-blue"
                >
                  <option value="Disponible">Disponible (En Base)</option>
                  <option value="En Viaje">En Viaje Activo</option>
                  <option value="Licencia">Licencia Médica / Gremial</option>
                </select>
              </div>

              {form.status === 'En Viaje' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Viaje / contingente asignado</label>
                  <input
                    type="text"
                    required
                    value={form.activeTripTitle}
                    onChange={e => setForm(p => ({ ...p, activeTripTitle: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                    placeholder="Ej: Mendoza Wine Tour Premium"
                  />
                </div>
              )}

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
                  Guardar Coordinador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
