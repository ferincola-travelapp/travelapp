'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, Car, Phone, Mail, MapPin } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function SupervisorsTab() {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isDriver, setIsDriver] = useState(false);
  const [commission, setCommission] = useState('5');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubSup = onSnapshot(collection(db, 'supervisors'), (snap) => {
      setSupervisors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubDrv = onSnapshot(collection(db, 'partners'), (snap) => {
      setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubSup();
      unsubDrv();
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    setSaving(true);
    try {
      const code = `SUP-${lastName.trim().toUpperCase().slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`;
      const supRef = await addDoc(collection(db, 'supervisors'), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        isDriver,
        commissionRate: Number(commission || 0),
        referralCode: code,
        role: 'supervisor',
        status: 'active',
        createdAt: Date.now(),
      });

      // Si también es conductor, pre-registrar su ficha en partners vinculada
      if (isDriver) {
        await addDoc(collection(db, 'partners'), {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: { street: address.trim(), number: '', city: '', province: '', postalCode: '' },
          supervisorId: supRef.id,
          supervisorCode: code,
          isSupervisorDriver: true,
          status: 'Activo',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setIsDriver(false);
      setCommission('5');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Gestión de Supervisores</h2>
          <p className="text-xs text-slate-500">
            Alta y seguimiento de supervisores habilitados en la App para gestionar flota y comisiones.
          </p>
        </div>
        <span className="text-xs font-bold text-[#0a2a5b] bg-[#0a2a5b]/5 px-3 py-1 rounded-full w-fit">
          {supervisors.length} supervisores
        </span>
      </div>

      {/* Formulario de Alta */}
      <form onSubmit={handleCreate} className="bg-white/80 border border-slate-200/90 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-[#0a2a5b]">Formulario de Alta de Supervisor</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nombre"
            required
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Apellido"
            required
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            required
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono"
            required
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Domicilio"
            required
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="Comisión %"
              min="0"
              max="100"
              step="0.5"
              required
              className="w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
            <span className="text-xs font-semibold text-slate-500">% Comisión</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Switch ¿Es conductor? SI / NO */}
          <label className="inline-flex items-center gap-3 cursor-pointer select-none">
            <span className="text-xs font-bold text-[#0a2a5b]">¿Es conductor?</span>
            <button
              type="button"
              role="switch"
              aria-checked={isDriver}
              onClick={() => setIsDriver((v) => !v)}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
                isDriver ? 'bg-[#0a2a5b]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDriver ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-bold text-slate-700">{isDriver ? 'SÍ' : 'NO'}</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4" /> {saving ? 'Guardando...' : 'Dar de Alta Supervisor'}
          </button>
        </div>
      </form>

      {/* Listado de Supervisores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {supervisors.length === 0 ? (
          <div className="col-span-full py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Sin supervisores registrados.
          </div>
        ) : (
          supervisors.map((s) => {
            const linkedCount = drivers.filter(
              (d) => d.supervisorId === s.id || (s.referralCode && d.supervisorCode === s.referralCode)
            ).length;
            return (
              <div key={s.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0a2a5b]" />
                    <div>
                      <p className="text-sm font-bold text-[#0a2a5b]">
                        {s.fullName || `${s.firstName || ''} ${s.lastName || ''}`}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">Código: {s.referralCode || s.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'supervisors', s.id))}
                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {s.email}</p>
                  {s.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {s.phone}</p>}
                  {s.address && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {s.address}</p>}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#0a2a5b]">Comisión: {s.commissionRate || 0}%</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                    <Car className="w-3.5 h-3.5 text-[#0a2a5b]" />
                    {linkedCount} cond. {s.isDriver ? '· También conduce' : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
