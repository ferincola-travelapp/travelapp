'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, CheckCircle2, Clock, Plus } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentOrder {
  id: string;
  beneficiary: string;
  concept: string;
  amount: number;
  branchName: string;
  authorizedByEmail: string;
  authToken: string;
  status: 'pendiente' | 'pagada';
  createdAt: number;
}

function generateSecureToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'OP-';
  for (let i = 0; i < 6; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function PaymentOrdersTab({ branches }: { branches: { id: string; name: string }[] }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [beneficiary, setBeneficiary] = useState('');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [branchName, setBranchName] = useState('');
  const [authorizedByEmail, setAuthorizedByEmail] = useState('');
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'payment_orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(
        snap.docs.map((d) => ({
          id: d.id,
          beneficiary: d.data().beneficiary || '',
          concept: d.data().concept || '',
          amount: Number(d.data().amount || 0),
          branchName: d.data().branchName || 'General',
          authorizedByEmail: d.data().authorizedByEmail || '',
          authToken: d.data().authToken || '',
          status: d.data().status === 'pagada' ? 'pagada' : 'pendiente',
          createdAt: d.data().createdAt || 0,
        }))
      );
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiary.trim() || !amount) return;
    setSaving(true);
    try {
      const token = generateSecureToken();
      await addDoc(collection(db, 'payment_orders'), {
        beneficiary: beneficiary.trim(),
        concept: concept.trim(),
        amount: Number(amount),
        branchName: branchName || branches[0]?.name || 'General',
        authorizedByEmail: authorizedByEmail.trim().toLowerCase() || user?.email || '',
        authToken: token,
        status: 'pendiente',
        createdBy: user?.email || 'sistema',
        createdAt: Date.now(),
      });
      setBeneficiary('');
      setConcept('');
      setAmount('');
      setAuthorizedByEmail('');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteWithToken = async (order: PaymentOrder) => {
    const entered = (tokenInputs[order.id] || '').trim().toUpperCase();
    if (entered !== order.authToken) {
      alert('Token incorrecto. Verificá el código asignado al responsable de pagos.');
      return;
    }
    await updateDoc(doc(db, 'payment_orders', order.id), {
      status: 'pagada',
      paidAt: Date.now(),
      paidBy: user?.email || '',
    });
    // Registrar egreso automático en caja/transacciones
    await addDoc(collection(db, 'transactions'), {
      date: Date.now(),
      concept: `Orden de Pago ${order.authToken}: ${order.beneficiary} - ${order.concept}`,
      businessUnit: 'Administración',
      type: 'egreso',
      amount: order.amount,
      currency: 'ARS',
      status: 'completado',
      paymentMethod: 'Orden de Pago con Token',
      userEmail: user?.email || '',
      branchName: order.branchName,
    });
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200/80 pb-4">
        <h2 className="text-lg font-bold text-[#0a2a5b]">Órdenes de Pago con Token de Autorización</h2>
        <p className="text-xs text-slate-500">
          Cada orden genera un token único para el responsable. Al validarlo, se aprueba el pago y se registra en el Libro Mayor.
        </p>
      </div>

      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white/75 border border-slate-200/90 rounded-xl p-4">
        <input
          type="text"
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          placeholder="Beneficiario / Proveedor"
          required
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <input
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Concepto"
          required
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Monto $"
          required
          min="1"
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <input
          type="email"
          value={authorizedByEmail}
          onChange={(e) => setAuthorizedByEmail(e.target.value)}
          placeholder="Email responsable"
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> Generar Orden + Token
        </button>
      </form>

      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Sin órdenes de pago generadas.
          </div>
        ) : (
          orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-white/80 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#0a2a5b]">{o.beneficiary}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      o.status === 'pagada'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {o.status === 'pagada' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {o.status === 'pagada' ? 'Pagada' : 'Pendiente de Token'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{o.concept} · Sucursal: {o.branchName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Responsable: {o.authorizedByEmail} · Token asignado:{' '}
                  <span className="font-mono font-bold text-[#0a2a5b]">{o.authToken}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-[#0a2a5b]">
                  ${o.amount.toLocaleString('es-AR')}
                </span>
                {o.status === 'pendiente' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tokenInputs[o.id] || ''}
                      onChange={(e) =>
                        setTokenInputs((prev) => ({ ...prev, [o.id]: e.target.value }))
                      }
                      placeholder="Ingresar Token"
                      className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono uppercase outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleExecuteWithToken(o)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Autorizar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
