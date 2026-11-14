'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Plus,
  CheckCircle2,
  Trash2,
  Calendar,
  Building2,
  BarChart2,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// 1. Flujo y Bancos (Solo Mercado Pago real + Cuentas Manuales en Firestore)
export function RealFlowAndBanksTab() {
  const [accounts, setAccounts] = useState<{ id: string; name: string; bank: string; cbu: string; balance: number }[]>([]);
  const [mpBalance, setMpBalance] = useState<{ available: number; total: number; loaded: boolean }>({
    available: 0,
    total: 0,
    loaded: false,
  });
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [cbu, setCbu] = useState('');
  const [balance, setBalance] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bank_accounts'), (snap) => {
      setAccounts(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || '',
          bank: d.data().bank || '',
          cbu: d.data().cbu || '',
          balance: Number(d.data().balance || 0),
        }))
      );
    });

    const loadMp = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch('/api/mercadopago/balance', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMpBalance({
            available: Number(data?.balance?.available_balance || 0),
            total: Number(data?.balance?.total_amount || 0),
            loaded: true,
          });
        }
      } catch {
        // Silencioso si no hay token MP configurado
      }
    };
    loadMp();

    return () => unsub();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addDoc(collection(db, 'bank_accounts'), {
      name: name.trim(),
      bank: bank.trim(),
      cbu: cbu.trim(),
      balance: Number(balance || 0),
      createdAt: Date.now(),
    });
    setName('');
    setBank('');
    setCbu('');
    setBalance('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cuenta Oficial Mercado Pago */}
        <div className="rounded-xl border border-[#0a2a5b]/25 bg-white/90 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0a2a5b]">
              Mercado Pago Oficial
            </span>
            <Landmark className="w-4 h-4 text-[#0a2a5b]" />
          </div>
          <p className="text-2xl font-bold text-[#0a2a5b] mt-3">
            ${mpBalance.available.toLocaleString('es-AR')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {mpBalance.loaded
              ? `Saldo total: $${mpBalance.total.toLocaleString('es-AR')}`
              : 'Conectado a API Mercado Pago'}
          </p>
        </div>

        {/* Cuentas Manuales Reales */}
        {accounts.map((acc) => (
          <div key={acc.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0a2a5b]">{acc.name}</span>
                <button
                  type="button"
                  onClick={() => deleteDoc(doc(db, 'bank_accounts', acc.id))}
                  className="text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500">{acc.bank} {acc.cbu ? `· ${acc.cbu}` : ''}</p>
              <p className="text-2xl font-bold text-[#0a2a5b] mt-3">
                ${acc.balance.toLocaleString('es-AR')}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Cuenta manual independiente</p>
          </div>
        ))}
      </div>

      {/* Crear cuenta manual */}
      <form onSubmit={handleAddAccount} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/75 border border-slate-200/90 rounded-xl p-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de cuenta (ej. Caja Fuerte)"
          required
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <input
          type="text"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          placeholder="Entidad / Banco"
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <input
          type="text"
          value={cbu}
          onChange={(e) => setCbu(e.target.value)}
          placeholder="CBU / Alias"
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="Saldo inicial $"
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nueva Cuenta Manual
        </button>
      </form>
    </div>
  );
}

// 2. Libro Mayor con Usuario y Sucursal
export function RealLedgerTab({
  transactions,
  branches,
}: {
  transactions: any[];
  branches: { id: string; name: string }[];
}) {
  const { user } = useAuth();
  const [concept, setConcept] = useState('');
  const [type, setType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [businessUnit, setBusinessUnit] = useState('TravelCab');
  const [branchName, setBranchName] = useState('');
  const [amount, setAmount] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || !amount) return;
    await addDoc(collection(db, 'transactions'), {
      date: Date.now(),
      concept: concept.trim(),
      businessUnit,
      type,
      amount: Number(amount),
      currency: 'ARS',
      status: 'completado',
      userEmail: user?.email || 'sistema@travelapp.ar',
      branchName: branchName || branches[0]?.name || 'General',
    });
    setConcept('');
    setAmount('');
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200/80 pb-4">
        <h2 className="text-lg font-bold text-[#0a2a5b]">Libro Mayor</h2>
        <p className="text-xs text-slate-500">Registro contable completo con trazabilidad de usuario y sucursal.</p>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 bg-white/75 border border-slate-200/90 rounded-xl p-4">
        <input
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Concepto"
          required
          className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        />
        <select
          value={businessUnit}
          onChange={(e) => setBusinessUnit(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        >
          <option value="TravelCab">TravelCab</option>
          <option value="TravelApp">TravelApp</option>
          <option value="TravelApp Experience">Experience</option>
          <option value="TravelApp Rewards">Rewards</option>
          <option value="Administración">Administración</option>
        </select>
        <select
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        >
          {branches.length === 0 ? (
            <option value="General">General</option>
          ) : (
            branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)
          )}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'ingreso' | 'egreso')}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
        >
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$"
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <button type="submit" className="px-3 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[#0a2a5b] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold">Fecha</th>
              <th className="py-3 px-4 font-bold">Concepto</th>
              <th className="py-3 px-4 font-bold">Unidad</th>
              <th className="py-3 px-4 font-bold">Sucursal</th>
              <th className="py-3 px-4 font-bold">Usuario</th>
              <th className="py-3 px-4 font-bold text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">Sin movimientos registrados.</td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(t.date || t.createdAt || Date.now()).toLocaleDateString('es-AR')}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{t.concept}</td>
                  <td className="py-3 px-4 text-slate-600">{t.businessUnit || '-'}</td>
                  <td className="py-3 px-4 font-semibold text-[#0a2a5b]">{t.branchName || 'General'}</td>
                  <td className="py-3 px-4 text-slate-500">{t.userEmail || 'Sistema'}</td>
                  <td className={`py-3 px-4 text-right font-bold ${t.type === 'ingreso' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {t.type === 'ingreso' ? '+' : '-'}${Number(t.amount || 0).toLocaleString('es-AR')}
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

// 3. Vencimientos & Agenda de Vencimientos con Usuario y Sucursal
export function RealScheduleTab({
  branches,
  isAgendaView = false,
}: {
  branches: { id: string; name: string }[];
  isAgendaView?: boolean;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [branchName, setBranchName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'scheduled_payments'), orderBy('dueDate', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || !amount) return;
    await addDoc(collection(db, 'scheduled_payments'), {
      title: title.trim(),
      dueDate,
      amount: Number(amount),
      branchName: branchName || branches[0]?.name || 'General',
      userEmail: user?.email || 'sistema@travelapp.ar',
      status: 'pendiente',
      createdAt: Date.now(),
    });
    setTitle('');
    setDueDate('');
    setAmount('');
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200/80 pb-4">
        <h2 className="text-lg font-bold text-[#0a2a5b]">
          {isAgendaView ? 'Agenda de Vencimientos' : 'Control de Vencimientos'}
        </h2>
        <p className="text-xs text-slate-500">
          Obligaciones y pagos programados con usuario responsable y sucursal.
        </p>
      </div>

      {!isAgendaView && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/75 border border-slate-200/90 rounded-xl p-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Concepto / Factura"
            required
            className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <select
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          >
            {branches.length === 0 ? (
              <option value="General">General</option>
            ) : (
              branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)
            )}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
            <button type="submit" className="px-3 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No hay vencimientos programados.
          </div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white/80 p-4 text-xs">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#0a2a5b] shrink-0" />
                <div>
                  <p className="font-bold text-[#0a2a5b]">{it.title}</p>
                  <p className="text-[11px] text-slate-500">
                    Vence: {it.dueDate} · Sucursal: {it.branchName || 'General'} · Usuario: {it.userEmail || 'Sistema'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-[#0a2a5b]">${Number(it.amount || 0).toLocaleString('es-AR')}</span>
                {it.status === 'pagado' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pagado
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateDoc(doc(db, 'scheduled_payments', it.id), { status: 'pagado' })}
                    className="px-3 py-1 rounded-lg bg-[#0a2a5b] text-white font-bold cursor-pointer hover:bg-[#071f45]"
                  >
                    Marcar Pagado
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 4. Directorio de Proveedores, Prestadores y Operadores
export function RealDirectoryTab() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Proveedor' | 'Prestador' | 'Operador'>('Proveedor');
  const [cuit, setCuit] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'audit_directory'), (snap) => {
      setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addDoc(collection(db, 'audit_directory'), {
      name: name.trim(),
      category,
      cuit: cuit.trim(),
      email: email.trim(),
      phone: phone.trim(),
      createdAt: Date.now(),
    });
    setName('');
    setCuit('');
    setEmail('');
    setPhone('');
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Directorio Comercial y Operativo</h2>
          <p className="text-xs text-slate-500">Base de proveedores, prestadores turísticos y operadores externos.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45] w-fit"
        >
          <Plus className="w-4 h-4" /> Nuevo Proveedor / Prestador / Operador
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Razón Social / Nombre"
            required
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          >
            <option value="Proveedor">Proveedor</option>
            <option value="Prestador">Prestador</option>
            <option value="Operador">Operador</option>
          </select>
          <input
            type="text"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="CUIT"
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
            <button type="submit" className="px-3 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer">
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.length === 0 ? (
          <div className="col-span-full py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No hay registros en el directorio.
          </div>
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-4 flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-[#0a2a5b] mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#0a2a5b]">{c.name}</p>
                  <span className="inline-block text-[10px] font-bold bg-[#0a2a5b]/10 text-[#0a2a5b] px-2 py-0.5 rounded-full mt-1">
                    {c.category}
                  </span>
                  {c.cuit && <p className="text-[11px] text-slate-500 mt-1">CUIT: {c.cuit}</p>}
                  {c.email && <p className="text-[11px] text-slate-500">{c.email}</p>}
                  {c.phone && <p className="text-[11px] text-slate-500">{c.phone}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteDoc(doc(db, 'audit_directory', c.id))}
                className="text-slate-400 hover:text-red-500 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 5. Rentabilidad con selector de período y fechas
export function RealProfitabilityTab({ transactions }: { transactions: any[] }) {
  const [period, setPeriod] = useState<'quincenal' | 'mensual' | 'trimestral' | 'anual' | 'personalizado'>('mensual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400000;
    let start = 0;
    let end = now + dayMs;

    if (period === 'quincenal') start = now - 15 * dayMs;
    else if (period === 'mensual') start = now - 30 * dayMs;
    else if (period === 'trimestral') start = now - 90 * dayMs;
    else if (period === 'anual') start = now - 365 * dayMs;
    else {
      start = fromDate ? Date.parse(fromDate) : 0;
      end = toDate ? Date.parse(toDate) + dayMs : now + dayMs;
    }

    return transactions.filter((t) => {
      const ts = Number(t.date || t.createdAt || 0);
      return ts >= start && ts <= end;
    });
  }, [transactions, period, fromDate, toDate]);

  const byUnit = useMemo(() => {
    const map: Record<string, { unit: string; ingresos: number; egresos: number }> = {};
    filtered.forEach((t) => {
      const unit = t.businessUnit || 'General';
      if (!map[unit]) map[unit] = { unit, ingresos: 0, egresos: 0 };
      if (t.type === 'ingreso') map[unit].ingresos += Number(t.amount || 0);
      else map[unit].egresos += Number(t.amount || 0);
    });
    return Object.values(map);
  }, [filtered]);

  const totalIng = filtered.filter((t) => t.type === 'ingreso').reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalEgr = filtered.filter((t) => t.type !== 'ingreso').reduce((a, b) => a + Number(b.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#0a2a5b]" />
          <div>
            <h2 className="text-lg font-bold text-[#0a2a5b]">Rentabilidad</h2>
            <p className="text-xs text-slate-500">Ingresos vs Egresos reales según período seleccionado.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0a2a5b] outline-none"
          >
            <option value="quincenal">Últimos 15 días</option>
            <option value="mensual">Mensual (30 días)</option>
            <option value="trimestral">Trimestral (90 días)</option>
            <option value="anual">Anual (365 días)</option>
            <option value="personalizado">Rango personalizado</option>
          </select>
          {period === 'personalizado' && (
            <>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <p className="text-xs font-semibold text-slate-500">Ingresos del Período</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">${totalIng.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <p className="text-xs font-semibold text-slate-500">Egresos del Período</p>
          <p className="text-xl font-bold text-red-600 mt-1">${totalEgr.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <p className="text-xs font-semibold text-slate-500">Margen Neto</p>
          <p className="text-xl font-bold text-[#0a2a5b] mt-1">${(totalIng - totalEgr).toLocaleString('es-AR')}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white/80 p-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byUnit}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="unit" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip formatter={(v: any) => `$${Number(v || 0).toLocaleString('es-AR')}`} />
            <Legend />
            <Bar dataKey="ingresos" fill="#0a2a5b" radius={[4, 4, 0, 0]} name="Ingresos" />
            <Bar dataKey="egresos" fill="#ff6b00" radius={[4, 4, 0, 0]} name="Egresos" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
