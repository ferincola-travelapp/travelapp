'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, CheckCircle2, MapPin, Phone } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Branch {
  id: string;
  name: string;
  location: string;
  address?: string;
  phone?: string;
  active?: boolean;
}

export function BranchesTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || 'Sucursal',
          location: d.data().location || '',
          address: d.data().address || '',
          phone: d.data().phone || '',
          active: d.data().active !== false,
        }))
      );
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'branches'), {
        name: name.trim(),
        location: location.trim(),
        address: address.trim(),
        phone: phone.trim(),
        active: true,
        createdAt: Date.now(),
      });
      setName('');
      setLocation('');
      setAddress('');
      setPhone('');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (branch: Branch) => {
    await updateDoc(doc(db, 'branches', branch.id), { active: !branch.active });
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'branches', id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Gestión de Sucursales</h2>
          <p className="text-xs text-slate-500">Administra las sedes operativas registradas en Firestore.</p>
        </div>
        <span className="text-xs font-semibold text-[#0a2a5b] bg-[#0a2a5b]/5 px-3 py-1 rounded-full w-fit">
          {branches.length} sucursales
        </span>
      </div>

      {/* Formulario nueva sucursal */}
      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white/70 border border-slate-200/90 rounded-xl p-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej. Sucursal Tucumán)"
          required
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ciudad / Provincia"
          required
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
        />
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección"
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
        />
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          <span>{saving ? 'Guardando...' : 'Agregar'}</span>
        </button>
      </form>

      {/* Listado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.length === 0 ? (
          <div className="col-span-full py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No hay sucursales registradas todavía.
          </div>
        ) : (
          branches.map((b) => (
            <div
              key={b.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white/75 p-4 transition hover:border-[#0a2a5b]/30"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#0a2a5b]/10 text-[#0a2a5b] flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0a2a5b]">{b.name}</h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {b.location || 'Sin localidad'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleActive(b)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                      b.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {b.active ? 'Activa' : 'Inactiva'}
                  </button>
                </div>
                {b.address && <p className="text-xs text-slate-600 mt-3">{b.address}</p>}
                {b.phone && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {b.phone}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronizado
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
