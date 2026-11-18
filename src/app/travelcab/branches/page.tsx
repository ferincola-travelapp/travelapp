'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, MapPin, Trash2, ArrowUpRight, ArrowDownRight,
  TrendingUp, Landmark, Calendar, FileText, CheckCircle2, RefreshCw, Sparkles, DollarSign,
  Lock, Unlock
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface CashMovement {
  id: string;
  branchId: string;
  branchName: string;
  amount: number;
  type: 'ingreso' | 'egreso';
  concept: string;
  date: string;
  registeredBy: string;
}

interface Branch {
  id: string;
  name: string;
  location: string;
  active: boolean;
}

export default function BranchCashPage() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search states
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  
  // Modal & Form states
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    branchId: '',
    amount: '',
    type: 'ingreso' as 'ingreso' | 'egreso',
    concept: '',
    date: new Date().toISOString().split('T')[0]
  });

  const { user } = useAuth();
  const [cashSessions, setCashSessions] = useState<Record<string, { isOpen: boolean; openedAt?: number; closedAt?: number; openedBy?: string }>>({});

  // Load branches
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        name: docSnap.data().name || 'Sucursal',
        location: docSnap.data().location || '',
        active: docSnap.data().active !== undefined ? docSnap.data().active : true
      }));
      setBranches(list);
    });
    const unsubCash = onSnapshot(collection(db, 'branch_cash_sessions'), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setCashSessions(map);
    });
    return () => {
      unsub();
      unsubCash();
    };
  }, []);

  // Load cash movements in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cash_movements'), (snapshot) => {
      if (snapshot.empty) {
        setMovements([]);
      } else {
        const list: CashMovement[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            branchId: data.branchId || '1',
            branchName: data.branchName || 'Sucursal',
            amount: Number(data.amount || 0),
            type: data.type || 'ingreso',
            concept: data.concept || '',
            date: data.date || new Date().toISOString().split('T')[0],
            registeredBy: data.registeredBy || 'admin'
          };
        });
        // Sort by date desc
        list.sort((a, b) => b.date.localeCompare(a.date));
        setMovements(list);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading cash movements:", error);
      setMovements([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branchId || !form.amount || !form.concept) return;

    const selectedBranch = branches.find(b => b.id === form.branchId);
    const branchName = selectedBranch ? selectedBranch.name : 'Sucursal';

    const payload = {
      branchId: form.branchId,
      branchName,
      amount: Number(form.amount),
      type: form.type,
      concept: form.concept,
      date: form.date,
      registeredBy: 'fernando@travelapp.ar' // Mapped currently from logged staff session
    };

    try {
      await addDoc(collection(db, 'cash_movements'), payload);
      setShowModal(false);
      setForm({
        branchId: branches[0]?.id || '',
        amount: '',
        type: 'ingreso',
        concept: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error("Error saving cash movement:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este movimiento de caja?')) {
      try {
        await deleteDoc(doc(db, 'cash_movements', id));
      } catch (err) {
        console.error("Error deleting cash movement:", err);
      }
    }
  };

  // Filter movements
  const filtered = movements.filter(m => {
    const matchSearch = m.concept.toLowerCase().includes(search.toLowerCase()) || m.branchName.toLowerCase().includes(search.toLowerCase());
    const matchBranch = filterBranch === 'all' || m.branchId === filterBranch;
    return matchSearch && matchBranch;
  });

  // Calculate totals
  const totalIngresos = filtered.filter(m => m.type === 'ingreso').reduce((acc, m) => acc + m.amount, 0);
  const totalEgresos = filtered.filter(m => m.type === 'egreso').reduce((acc, m) => acc + m.amount, 0);
  const totalNeto = totalIngresos - totalEgresos;

  const activeBranchId = filterBranch !== 'all' ? filterBranch : (branches[0]?.id || 'general');
  const activeBranchName = branches.find(b => b.id === activeBranchId)?.name || 'Caja General';
  const currentCashSession = cashSessions[activeBranchId];
  const isCashOpen = Boolean(currentCashSession?.isOpen);

  const handleToggleCash = async () => {
    const nextOpen = !isCashOpen;
    await setDoc(
      doc(db, 'branch_cash_sessions', activeBranchId),
      {
        branchId: activeBranchId,
        branchName: activeBranchName,
        isOpen: nextOpen,
        ...(nextOpen
          ? { openedAt: Date.now(), openedBy: user?.email || 'operador@travelapp.ar' }
          : { closedAt: Date.now(), closedBy: user?.email || 'operador@travelapp.ar', closingNet: totalNeto }),
      },
      { merge: true }
    );
  };

  return (
    <div className="flex h-full w-full flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-[#0a2a5b]">
            <Landmark className="h-5 w-5 text-[#0a2a5b]" /> Gestión de Caja de Sucursales
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Libro diario de ingresos y egresos por sucursal ·{' '}
            <span className={`font-bold ${isCashOpen ? 'text-emerald-700' : 'text-slate-500'}`}>
              {activeBranchName}: {isCashOpen ? 'Caja Abierta' : 'Caja Cerrada'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleCash}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              isCashOpen
                ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {isCashOpen ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            <span>{isCashOpen ? 'Cerrar Caja' : 'Abrir Caja'}</span>
          </button>

          <button
            onClick={() => {
              setForm({
                branchId: branches[0]?.id || '',
                amount: '',
                type: 'ingreso',
                concept: '',
                date: new Date().toISOString().split('T')[0]
              });
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center space-x-2 rounded-lg bg-[#0a2a5b] px-4 py-2 text-xs font-bold text-white hover:bg-[#071f45] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Registrar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* KPI 1: Ingresos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Ingresos</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">${totalIngresos.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-emerald-600">
            <ArrowUpRight className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2: Egresos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Egresos</p>
            <p className="text-2xl font-black text-rose-600 mt-1">${totalEgresos.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100 text-rose-600">
            <ArrowDownRight className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3: Caja Neta */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Caja Chica (Saldo)</p>
            <p className={`text-2xl font-black mt-1 ${totalNeto >= 0 ? 'text-tech-blue' : 'text-red-500'}`}>
              ${totalNeto.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-tech-blue">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por concepto o sucursal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 shadow-sm outline-none focus:border-tech-blue/40 focus:ring-2 focus:ring-tech-blue/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-tech-blue"
          >
            <option value="all">Todas las Sucursales</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Sucursal</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Registrado Por</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.map(mov => (
                <tr key={mov.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{mov.branchName}</td>
                  <td className="px-4 py-3 font-medium text-slate-600">{mov.concept}</td>
                  <td className="px-4 py-3">{mov.date}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{mov.registeredBy}</td>
                  <td className={`px-4 py-3 text-right font-bold text-sm ${mov.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {mov.type === 'ingreso' ? '+' : '-'} ${mov.amount.toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(mov.id)}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar Movimiento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No hay movimientos de caja registrados para esta búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-slate-50 p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Registrar Movimiento de Caja</h2>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sucursal</label>
                <select
                  required
                  value={form.branchId}
                  onChange={e => setForm(p => ({ ...p, branchId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none bg-white focus:border-tech-blue"
                >
                  <option value="">Seleccionar Sucursal</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Movimiento</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none bg-white focus:border-tech-blue"
                  >
                    <option value="ingreso">Ingreso (+)</option>
                    <option value="egreso">Egreso (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Monto ($)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                    placeholder="Ej: 5000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Concepto / Descripción</label>
                <input
                  type="text"
                  required
                  value={form.concept}
                  onChange={e => setForm(p => ({ ...p, concept: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                  placeholder="Ej: Cobro de viaje semanal o Compra de café"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                />
              </div>

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
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
