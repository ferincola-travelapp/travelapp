'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function StaffTab() {
  const [staff, setStaff] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Operaciones');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'staff_users'), (snap) => {
      setStaff(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'staff_users'), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        department,
        position: position.trim() || 'Operador',
        phone: phone.trim(),
        role: 'operador',
        active: true,
        createdAt: Date.now(),
      });
      setName('');
      setEmail('');
      setPosition('');
      setPhone('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Gestión de Staff TravelApp</h2>
          <p className="text-xs text-slate-500">Equipo interno real sincronizado en Firestore (`staff_users`).</p>
        </div>
        <span className="text-xs font-bold text-[#0a2a5b] bg-[#0a2a5b]/5 px-3 py-1 rounded-full w-fit">
          {staff.length} integrantes
        </span>
      </div>

      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white/75 border border-slate-200/90 rounded-xl p-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo"
          required
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@travelapp.ar"
          required
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        >
          <option value="Dirección">Dirección</option>
          <option value="Operaciones">Operaciones</option>
          <option value="TravelCab">TravelCab</option>
          <option value="Experience">Experience</option>
          <option value="Administración">Administración</option>
          <option value="Comercial / CRM">Comercial / CRM</option>
          <option value="RRHH">RRHH</option>
        </select>
        <input
          type="text"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Cargo / Puesto"
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          <UserPlus className="w-4 h-4" /> Alta Staff
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[#0a2a5b] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold">Nombre</th>
              <th className="py-3 px-4 font-bold">Área</th>
              <th className="py-3 px-4 font-bold">Puesto</th>
              <th className="py-3 px-4 font-bold">Estado</th>
              <th className="py-3 px-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Sin personal registrado en Firestore.
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">{s.name}</p>
                    <p className="text-[11px] text-slate-500">{s.email}</p>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#0a2a5b]">{s.department || 'General'}</td>
                  <td className="py-3 px-4 text-slate-600">{s.position || s.role || '-'}</td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => updateDoc(doc(db, 'staff_users', s.id), { active: s.active === false })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer ${
                        s.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {s.active !== false ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {s.active !== false ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => deleteDoc(doc(db, 'staff_users', s.id))}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
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
