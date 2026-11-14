'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Lock, Unlock } from 'lucide-react';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface CashMovement {
  id: string;
  branchId: string;
  branchName: string;
  type: 'ingreso' | 'egreso';
  concept: string;
  amount: number;
  userEmail: string;
  createdAt: number;
}

export function CashBoxTab({ branches }: { branches: { id: string; name: string }[] }) {
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [branchId, setBranchId] = useState('');
  const [type, setType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [cashSessions, setCashSessions] = useState<{ id: string; branchName: string; isOpen: boolean; openedBy?: string; closedBy?: string }[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cash_movements'), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt || (data.date ? Date.parse(data.date) : Date.now());
        return {
          id: d.id,
          branchId: data.branchId || '',
          branchName: data.branchName || 'Sin sucursal',
          type: (data.type === 'egreso' ? 'egreso' : 'ingreso') as 'ingreso' | 'egreso',
          concept: data.concept || '',
          amount: Number(data.amount || 0),
          userEmail: data.userEmail || data.registeredBy || '',
          createdAt: ts,
        };
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setMovements(list);
    });

    const unsubSessions = onSnapshot(collection(db, 'branch_cash_sessions'), (snap) => {
      setCashSessions(
        snap.docs.map((d) => ({
          id: d.id,
          branchName: d.data().branchName || d.id,
          isOpen: Boolean(d.data().isOpen),
          openedBy: d.data().openedBy,
          closedBy: d.data().closedBy,
        }))
      );
    });

    return () => {
      unsub();
      unsubSessions();
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || !amount) return;
    setSaving(true);
    try {
      const targetBranch = branches.find((b) => b.id === branchId) || branches[0];
      await addDoc(collection(db, 'cash_movements'), {
        branchId: targetBranch?.id || 'general',
        branchName: targetBranch?.name || 'General',
        type,
        concept: concept.trim(),
        amount: Number(amount),
        userEmail: user?.email || 'sistema@travelapp.ar',
        createdAt: Date.now(),
      });
      setConcept('');
      setAmount('');
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    selectedBranch === 'all'
      ? movements
      : movements.filter((m) => m.branchId === selectedBranch);

  const totalIn = filtered.filter((m) => m.type === 'ingreso').reduce((a, b) => a + b.amount, 0);
  const totalOut = filtered.filter((m) => m.type === 'egreso').reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Caja Diaria por Sucursal</h2>
          <p className="text-xs text-slate-500">Movimientos reales de caja filtrables por sucursal.</p>
        </div>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0a2a5b] outline-none"
        >
          <option value="all">Todas las sucursales</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Estado en tiempo real de Cajas por Sucursal */}
      {cashSessions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cashSessions.map((cs) => (
            <div
              key={cs.id}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold ${
                cs.isOpen
                  ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
                  : 'border-slate-200 bg-white/80 text-slate-500'
              }`}
            >
              {cs.isOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{cs.branchName}: {cs.isOpen ? 'Abierta' : 'Cerrada'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <p className="text-xs font-semibold text-slate-500">Ingresos</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">${totalIn.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <p className="text-xs font-semibold text-slate-500">Egresos</p>
          <p className="text-xl font-bold text-red-600 mt-1">${totalOut.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <p className="text-xs font-semibold text-slate-500">Saldo Neto</p>
          <p className="text-xl font-bold text-[#0a2a5b] mt-1">${(totalIn - totalOut).toLocaleString('es-AR')}</p>
        </div>
      </div>

      {/* Registrar movimiento */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/75 border border-slate-200/90 rounded-xl p-4">
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none"
        >
          {branches.length === 0 ? (
            <option value="general">General</option>
          ) : (
            branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)
          )}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'ingreso' | 'egreso')}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none"
        >
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        <input
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Concepto del movimiento"
          required
          className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Monto $"
            required
            min="1"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[#0a2a5b] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold">Fecha</th>
              <th className="py-3 px-4 font-bold">Sucursal</th>
              <th className="py-3 px-4 font-bold">Concepto</th>
              <th className="py-3 px-4 font-bold">Usuario</th>
              <th className="py-3 px-4 font-bold text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Sin movimientos registrados para esta selección.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(m.createdAt).toLocaleString('es-AR')}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#0a2a5b]">{m.branchName}</td>
                  <td className="py-3 px-4 flex items-center gap-1.5">
                    {m.type === 'ingreso' ? (
                      <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowDownCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span>{m.concept}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{m.userEmail}</td>
                  <td
                    className={`py-3 px-4 text-right font-bold ${
                      m.type === 'ingreso' ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {m.type === 'ingreso' ? '+' : '-'}${m.amount.toLocaleString('es-AR')}
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
