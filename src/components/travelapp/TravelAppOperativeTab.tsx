'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, BedDouble, Calendar, Users, Layers } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type OperativeSection =
  | 'alta_operador'
  | 'alta_proveedor'
  | 'crear_viaje'
  | 'pasajeros'
  | 'rooming'
  | 'calendario'
  | 'cupos';

export function TravelAppOperativeTab({ section }: { section: OperativeSection }) {
  const [operators, setOperators] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [roomings, setRoomings] = useState<any[]>([]);
  const [quotas, setQuotas] = useState<any[]>([]);

  // Form states
  const [name, setName] = useState('');
  const [cuit, setCuit] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Mayorista');

  // Viaje form
  const [tripTitle, setTripTitle] = useState('');
  const [tripDest, setTripDest] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [tripSeats, setTripSeats] = useState('40');

  // Rooming form
  const [roomHotel, setRoomHotel] = useState('');
  const [roomType, setRoomType] = useState('DBL');
  const [roomPassengers, setRoomPassengers] = useState('');
  const [roomTrip, setRoomTrip] = useState('');

  // Cupo form
  const [quotaName, setQuotaName] = useState('');
  const [quotaTotal, setQuotaTotal] = useState('20');
  const [quotaAvailable, setQuotaAvailable] = useState('20');

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'tour_operators'), (s) =>
      setOperators(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(collection(db, 'providers'), (s) =>
      setProviders(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u3 = onSnapshot(collection(db, 'contracted_trips'), (s) =>
      setTrips(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u4 = onSnapshot(collection(db, 'experience_reservations'), (s) =>
      setReservations(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u5 = onSnapshot(collection(db, 'rooming_lists'), (s) =>
      setRoomings(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u6 = onSnapshot(collection(db, 'travel_quotas'), (s) =>
      setQuotas(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
    };
  }, []);

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addDoc(collection(db, 'tour_operators'), {
      name: name.trim(),
      cuit: cuit.trim(),
      email: email.trim(),
      phone: phone.trim(),
      category,
      createdAt: Date.now(),
    });
    setName('');
    setCuit('');
    setEmail('');
    setPhone('');
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addDoc(collection(db, 'providers'), {
      name: name.trim(),
      cuit: cuit.trim(),
      email: email.trim(),
      phone: phone.trim(),
      serviceType: category,
      createdAt: Date.now(),
    });
    setName('');
    setCuit('');
    setEmail('');
    setPhone('');
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripTitle.trim() || !tripDate) return;
    await addDoc(collection(db, 'contracted_trips'), {
      title: tripTitle.trim(),
      destination: tripDest.trim(),
      departureDate: tripDate,
      totalSeats: Number(tripSeats || 40),
      status: 'Programado',
      createdAt: Date.now(),
    });
    setTripTitle('');
    setTripDest('');
    setTripDate('');
  };

  const handleSaveRooming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomHotel.trim() || !roomPassengers.trim()) return;
    await addDoc(collection(db, 'rooming_lists'), {
      hotelName: roomHotel.trim(),
      roomType,
      passengers: roomPassengers.trim(),
      tripName: roomTrip.trim() || 'Salida General',
      createdAt: Date.now(),
    });
    setRoomHotel('');
    setRoomPassengers('');
    setRoomTrip('');
  };

  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaName.trim()) return;
    await addDoc(collection(db, 'travel_quotas'), {
      name: quotaName.trim(),
      total: Number(quotaTotal || 0),
      available: Number(quotaAvailable || 0),
      createdAt: Date.now(),
    });
    setQuotaName('');
  };

  return (
    <div className="space-y-5">
      {/* 1. ALTA DE OPERADOR */}
      {section === 'alta_operador' && (
        <>
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-lg font-bold text-[#0a2a5b]">Alta de Operadores Mayoristas</h2>
            <p className="text-xs text-slate-500">Operadores emisivos y receptivos registrados en `tour_operators`.</p>
          </div>
          <form onSubmit={handleSaveOperator} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Razón Social / Operador" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <input value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="CUIT / Legajo EVT" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email reservas" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]">
              <Plus className="w-4 h-4" /> Guardar Operador
            </button>
          </form>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {operators.length === 0 ? (
              <p className="col-span-full text-center text-xs text-slate-400 py-8 border border-dashed border-slate-200 rounded-xl">Sin operadores registrados.</p>
            ) : (
              operators.map((op) => (
                <div key={op.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-4 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-[#0a2a5b]">{op.name}</p>
                    <p className="text-[11px] text-slate-500">{op.cuit || 'Sin CUIT'}</p>
                    <p className="text-[11px] text-slate-500">{op.email} {op.phone ? `· ${op.phone}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => deleteDoc(doc(db, 'tour_operators', op.id))} className="text-slate-400 hover:text-red-500 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* 2. ALTA DE PROVEEDOR */}
      {section === 'alta_proveedor' && (
        <>
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-lg font-bold text-[#0a2a5b]">Alta de Proveedores Turísticos</h2>
            <p className="text-xs text-slate-500">Hoteles, transportes, asistencia al viajero y servicios locales (`providers`).</p>
          </div>
          <form onSubmit={handleSaveProvider} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre Proveedor / Hotel" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none">
              <option value="Alojamiento">Alojamiento / Hotel</option>
              <option value="Transporte">Transporte / Bus</option>
              <option value="Aéreo">Aéreo / Consolidador</option>
              <option value="Asistencia">Asistencia al Viajero</option>
              <option value="Excursión">Excursión / Guía</option>
            </select>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]">
              <Plus className="w-4 h-4" /> Guardar Proveedor
            </button>
          </form>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.length === 0 ? (
              <p className="col-span-full text-center text-xs text-slate-400 py-8 border border-dashed border-slate-200 rounded-xl">Sin proveedores registrados.</p>
            ) : (
              providers.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-4 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-[#0a2a5b]">{p.name}</p>
                    <span className="text-[10px] font-bold bg-[#0a2a5b]/10 text-[#0a2a5b] px-2 py-0.5 rounded-full">{p.serviceType || p.category || 'Servicio'}</span>
                    <p className="text-[11px] text-slate-500 mt-1">{p.email} {p.phone ? `· ${p.phone}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => deleteDoc(doc(db, 'providers', p.id))} className="text-slate-400 hover:text-red-500 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* 3. CREAR VIAJE */}
      {section === 'crear_viaje' && (
        <>
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-lg font-bold text-[#0a2a5b]">Crear Viaje / Salida Grupal</h2>
            <p className="text-xs text-slate-500">Se sincroniza automáticamente con "Mi Viaje" y App Coordinador (`contracted_trips`).</p>
          </div>
          <form onSubmit={handleCreateTrip} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4">
            <input value={tripTitle} onChange={(e) => setTripTitle(e.target.value)} placeholder="Nombre del viaje (ej. Bariloche Invierno)" required className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <input value={tripDest} onChange={(e) => setTripDest(e.target.value)} placeholder="Destino" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <div className="flex gap-2">
              <input type="number" value={tripSeats} onChange={(e) => setTripSeats(e.target.value)} placeholder="Cupos" className="w-20 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
              <button type="submit" className="flex-1 px-3 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]">
                Crear
              </button>
            </div>
          </form>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trips.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
                <p className="text-sm font-bold text-[#0a2a5b]">{t.title || t.tripName || 'Salida'}</p>
                <p className="text-xs text-slate-500">{t.destination || '-'} · Salida: {t.departureDate || '-'}</p>
                <p className="text-[11px] font-bold text-[#0a2a5b] mt-2">Cupos: {t.totalSeats || '-'}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 4. LISTADO DE PASAJEROS */}
      {section === 'pasajeros' && (
        <>
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
              <Users className="w-5 h-5" /> Listado de Pasajeros
            </h2>
            <p className="text-xs text-slate-500">Pasajeros registrados en reservas activas (`experience_reservations`).</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#0a2a5b] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Pasajero</th>
                  <th className="py-3 px-4 font-bold">Servicio / Viaje</th>
                  <th className="py-3 px-4 font-bold">Contacto</th>
                  <th className="py-3 px-4 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">Sin pasajeros en reservas.</td></tr>
                ) : (
                  reservations.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-4 font-bold text-slate-800">{r.passengerName || r.customerName || 'Pasajero'}</td>
                      <td className="py-3 px-4 text-slate-600">{r.experienceTitle || r.serviceType || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{r.passengerPhone || r.passengerEmail || '-'}</td>
                      <td className="py-3 px-4 font-bold text-[#0a2a5b]">{r.estado || 'Pendiente'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 5. ROOMING LIST DE HOTELES */}
      {section === 'rooming' && (
        <>
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
              <BedDouble className="w-5 h-5" /> Rooming List de Hoteles
            </h2>
            <p className="text-xs text-slate-500">Distribución de habitaciones por hotel y salida (`rooming_lists`).</p>
          </div>
          <form onSubmit={handleSaveRooming} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4">
            <input value={roomTrip} onChange={(e) => setRoomTrip(e.target.value)} placeholder="Salida / Viaje" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <input value={roomHotel} onChange={(e) => setRoomHotel(e.target.value)} placeholder="Hotel" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none">
              <option value="SGL">Single (SGL)</option>
              <option value="DBL">Doble (DBL)</option>
              <option value="TPL">Triple (TPL)</option>
              <option value="CPL">Cuádruple (CPL)</option>
            </select>
            <input value={roomPassengers} onChange={(e) => setRoomPassengers(e.target.value)} placeholder="Pasajeros asignados" required className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]">
              Agregar Habitación
            </button>
          </form>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roomings.map((rm) => (
              <div key={rm.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-4 flex justify-between items-start text-xs">
                <div>
                  <span className="font-bold text-[#0a2a5b]">{rm.hotelName} · {rm.roomType}</span>
                  <p className="text-[11px] text-slate-400">{rm.tripName}</p>
                  <p className="text-slate-700 mt-1.5 font-semibold">{rm.passengers}</p>
                </div>
                <button type="button" onClick={() => deleteDoc(doc(db, 'rooming_lists', rm.id))} className="text-slate-400 hover:text-red-500 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 6. CALENDARIO DE SALIDAS */}
      {section === 'calendario' && (
        <>
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Calendario de Salidas
            </h2>
            <p className="text-xs text-slate-500">Salidas programadas ordenadas cronológicamente.</p>
          </div>
          <div className="space-y-2.5">
            {trips.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded-xl">Sin salidas programadas.</p>
            ) : (
              [...trips]
                .sort((a, b) => String(a.departureDate || '').localeCompare(String(b.departureDate || '')))
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white/80 p-4 text-xs">
                    <div>
                      <p className="font-bold text-[#0a2a5b]">{t.title || t.tripName || 'Salida'}</p>
                      <p className="text-[11px] text-slate-500">{t.destination || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0a2a5b]">{t.departureDate || 'A definir'}</p>
                      <p className="text-[11px] text-slate-500">{t.totalSeats || 0} cupos</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </>
      )}

      {/* 7. CONTROL DE CUPOS / BLOQUEOS */}
      {section === 'cupos' && (
        <>
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
              <Layers className="w-5 h-5" /> Control de Cupos y Bloqueos
            </h2>
            <p className="text-xs text-slate-500">Bloqueos aéreos, camas y butacas confirmadas (`travel_quotas`).</p>
          </div>
          <form onSubmit={handleSaveQuota} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4">
            <input value={quotaName} onChange={(e) => setQuotaName(e.target.value)} placeholder="Bloqueo (ej. Cupo Aéreo BRC Julio)" required className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <input type="number" value={quotaTotal} onChange={(e) => setQuotaTotal(e.target.value)} placeholder="Total lugares" className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none" />
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]">
              Agregar Cupo
            </button>
          </form>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quotas.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-4 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-[#0a2a5b]">{q.name}</p>
                  <p className="text-[11px] text-slate-500">Disponibles: {q.available} / {q.total}</p>
                </div>
                <button type="button" onClick={() => deleteDoc(doc(db, 'travel_quotas', q.id))} className="text-slate-400 hover:text-red-500 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
