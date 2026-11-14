'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Plus, Search, Trash2 } from 'lucide-react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function DriversTab() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubDrv = onSnapshot(collection(db, 'partners'), (snap) => {
      setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubSup = onSnapshot(collection(db, 'supervisors'), (snap) => {
      setSupervisors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubDrv();
      unsubSup();
    };
  }, []);

  const filtered = drivers.filter((d) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${d.firstName || ''} ${d.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      String(d.email || '').toLowerCase().includes(q) ||
      String(d.vehicle?.licensePlate || '').toLowerCase().includes(q)
    );
  });

  const handleStatusChange = async (driverId: string, newStatus: string) => {
    await updateDoc(doc(db, 'partners', driverId), {
      status: newStatus,
      updatedAt: Date.now(),
    });
  };

  const handleSupervisorAssign = async (driverId: string, supId: string) => {
    const sup = supervisors.find((s) => s.id === supId);
    await updateDoc(doc(db, 'partners', driverId), {
      supervisorId: supId || '',
      supervisorCode: sup?.referralCode || '',
      supervisorName: sup?.fullName || '',
      updatedAt: Date.now(),
    });
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('¿Confirmás dar de baja definitiva a este conductor?')) return;
    await deleteDoc(doc(db, 'partners', driverId));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Gestión de Conductores</h2>
          <p className="text-xs text-slate-500">
            Flota real sincronizada con Firestore (`partners`). Aprobación, suspensión y enlace con supervisores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conductor o patente..."
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
          </div>
          <Link
            href="/hr/new-partner"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Alta de Conductor
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[#0a2a5b] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold">Conductor</th>
              <th className="py-3 px-4 font-bold">Vehículo / Patente</th>
              <th className="py-3 px-4 font-bold">Supervisor</th>
              <th className="py-3 px-4 font-bold">Estado</th>
              <th className="py-3 px-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No hay conductores registrados en Firestore.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">
                      {d.firstName || ''} {d.lastName || ''}
                    </p>
                    <p className="text-[11px] text-slate-500">{d.email || d.phone || '-'}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {d.vehicle?.make ? `${d.vehicle.make} ${d.vehicle.model || ''}` : 'Sin vehículo'}{' '}
                    {d.vehicle?.licensePlate ? (
                      <span className="font-mono font-bold text-[#0a2a5b]">({d.vehicle.licensePlate})</span>
                    ) : null}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={d.supervisorId || ''}
                      onChange={(e) => handleSupervisorAssign(d.id, e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 outline-none"
                    >
                      <option value="">Sin supervisor</option>
                      {supervisors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName || `${s.firstName} ${s.lastName}`}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={d.status || 'Pendiente Documentación'}
                      onChange={(e) => handleStatusChange(d.id, e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-[#0a2a5b] outline-none"
                    >
                      <option value="Pendiente Documentación">Pendiente</option>
                      <option value="Activo">Habilitado</option>
                      <option value="Suspendido">Suspendido</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <Link
                      href={`/hr/${d.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#0a2a5b] text-[#0a2a5b] font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Perfil
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteDriver(d.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Baja
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
