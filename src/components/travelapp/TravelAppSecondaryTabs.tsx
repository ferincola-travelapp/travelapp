'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Trash2,
  Smartphone,
  UserCheck,
  Calculator,
  ExternalLink,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// 1. Clientes (crm_customers)
export function TravelAppCustomersTab() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'crm_customers'), (snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addDoc(collection(db, 'crm_customers'), {
      fullName: name.trim(),
      dni: dni.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      createdAt: Date.now(),
    });
    setName('');
    setDni('');
    setEmail('');
    setPhone('');
  };

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(c.fullName || c.name || '').toLowerCase().includes(q) ||
      String(c.dni || '').toLowerCase().includes(q) ||
      String(c.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Clientes y Pasajeros</h2>
          <p className="text-xs text-slate-500">Base de clientes turísticos en `crm_customers`.</p>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente o DNI..."
            className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
        </div>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
        <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI / Pasaporte" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
        <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]">
          <Plus className="w-4 h-4" /> Alta Cliente
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[#0a2a5b] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold">Nombre</th>
              <th className="py-3 px-4 font-bold">DNI / Pasaporte</th>
              <th className="py-3 px-4 font-bold">Email</th>
              <th className="py-3 px-4 font-bold">Teléfono</th>
              <th className="py-3 px-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">Sin clientes registrados.</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-bold text-slate-800">{c.fullName || c.name || '-'}</td>
                  <td className="py-3 px-4 text-slate-600">{c.dni || '-'}</td>
                  <td className="py-3 px-4 text-slate-500">{c.email || '-'}</td>
                  <td className="py-3 px-4 text-slate-500">{c.phone || '-'}</td>
                  <td className="py-3 px-4 text-right">
                    <button type="button" onClick={() => deleteDoc(doc(db, 'crm_customers', c.id))} className="text-red-500 hover:text-red-700 cursor-pointer">
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

// 2. Reservas (Crear Reserva / Buscar Reserva)
export function TravelAppReservationsTab({ mode }: { mode: 'create' | 'search' }) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [serviceType, setServiceType] = useState('Paquete Propio');
  const [experienceTitle, setExperienceTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'experience_reservations'), (snap) => {
      setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName.trim() || !experienceTitle.trim()) return;
    const code = `RES-${Math.floor(10000 + Math.random() * 90000)}`;
    await addDoc(collection(db, 'experience_reservations'), {
      reservationCode: code,
      passengerName: passengerName.trim(),
      serviceType,
      experienceTitle: experienceTitle.trim(),
      totalAmount: Number(totalAmount || 0),
      dueDate,
      estado: 'Pendiente',
      paymentStatus: 'pending',
      createdAt: Date.now(),
    });
    setPassengerName('');
    setExperienceTitle('');
    setTotalAmount('');
    setDueDate('');
  };

  const filtered = reservations.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(r.reservationCode || '').toLowerCase().includes(q) ||
      String(r.passengerName || r.customerName || '').toLowerCase().includes(q) ||
      String(r.experienceTitle || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">
            {mode === 'create' ? 'Crear Nueva Reserva / File' : 'Buscar Reservas'}
          </h2>
          <p className="text-xs text-slate-500">Sincronizado con `experience_reservations`.</p>
        </div>
        {mode === 'search' && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, pasajero..."
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
          </div>
        )}
      </div>

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4">
          <input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="Titular / Pasajero" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none">
            <option value="Pasajes Aéreos">Pasajes Aéreos</option>
            <option value="Bus / Micro">Bus / Micro</option>
            <option value="Paquete Propio">Paquete Propio</option>
            <option value="Paquete Operador">Paquete Operador</option>
            <option value="Solo Alojamiento">Solo Alojamiento</option>
            <option value="Excursión">Excursión</option>
          </select>
          <input value={experienceTitle} onChange={(e) => setExperienceTitle(e.target.value)} placeholder="Descripción del servicio" required className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
          <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="Total $" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
          <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]">
            <Plus className="w-4 h-4" /> Crear File
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[#0a2a5b] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold">File / Código</th>
              <th className="py-3 px-4 font-bold">Pasajero</th>
              <th className="py-3 px-4 font-bold">Servicio</th>
              <th className="py-3 px-4 font-bold">Estado</th>
              <th className="py-3 px-4 font-bold text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">Sin reservas encontradas.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 px-4 font-mono font-bold text-[#0a2a5b]">{r.reservationCode || r.id.slice(0, 8)}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{r.passengerName || r.customerName || '-'}</td>
                  <td className="py-3 px-4 text-slate-600">{r.experienceTitle || r.serviceType || '-'}</td>
                  <td className="py-3 px-4">
                    <select
                      value={r.estado || 'Pendiente'}
                      onChange={(e) => updateDoc(doc(db, 'experience_reservations', r.id), { estado: e.target.value })}
                      className="px-2 py-1 rounded border border-slate-200 text-[11px] font-bold text-[#0a2a5b] outline-none"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Confirmada">Confirmada</option>
                      <option value="En Curso">En Curso</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#0a2a5b]">
                    ${Number(r.totalAmount || r.amount || 0).toLocaleString('es-AR')}
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

// 3. Gestión "Mi Viaje" App Móvil
export function MiViajeMobileTab() {
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'contracted_trips'), (snap) => {
      setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
            <Smartphone className="w-5 h-5" /> Gestión &quot;Mi Viaje&quot; App Móvil
          </h2>
          <p className="text-xs text-slate-500">
            Viajes activos visibles en la App del Pasajero (vouchers, documentación y chat grupal).
          </p>
        </div>
        <Link
          href="/experiences/my-trip-mgmt"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45] w-fit"
        >
          Abrir Editor Completo <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.length === 0 ? (
          <p className="col-span-full text-center text-xs text-slate-400 py-8 border border-dashed border-slate-200 rounded-xl">
            No hay viajes cargados en `contracted_trips`.
          </p>
        ) : (
          trips.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-4 space-y-2">
              <p className="text-sm font-bold text-[#0a2a5b]">{t.title || t.tripName || 'Viaje'}</p>
              <p className="text-xs text-slate-500">{t.destination || '-'} · {t.departureDate || '-'}</p>
              <p className="text-[11px] font-mono text-slate-400">Código: {t.reservationCode || t.id.slice(0, 8)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 4. Coordinadores y Guías
export function CoordinatorsTab() {
  const [coords, setCoords] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coordinators'), (snap) => {
      setCoords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addDoc(collection(db, 'coordinators'), {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      active: true,
      createdAt: Date.now(),
    });
    setName('');
    setEmail('');
    setPhone('');
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200/80 pb-4">
        <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
          <UserCheck className="w-5 h-5" /> Gestión de Coordinadores y Guías
        </h2>
        <p className="text-xs text-slate-500">Habilitados para operar en `travelapp-coordinator` (`coordinators`).</p>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
        <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]">
          <Plus className="w-4 h-4" /> Alta Coordinador
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {coords.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-4 flex justify-between items-start text-xs">
            <div>
              <p className="text-sm font-bold text-[#0a2a5b]">{c.name}</p>
              <p className="text-slate-500">{c.email}</p>
              {c.phone && <p className="text-slate-500">{c.phone}</p>}
            </div>
            <button type="button" onClick={() => deleteDoc(doc(db, 'coordinators', c.id))} className="text-slate-400 hover:text-red-500 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Cotizador Propio
export { OwnTripQuoterTab as OwnQuoterTab } from './OwnTripQuoterTab';
