'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Search,
  Layers,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MUTariff, ARCTariff, TransferTariff, VehicleCategory } from '@/types/logistics';
import { MUTariffForm } from '@/components/travelcab/settings/MUTariffForm';
import { ARCTariffForm } from '@/components/travelcab/settings/ARCTariffForm';
import { TransferTariffForm } from '@/components/travelcab/settings/TransferTariffForm';

export type TravelCabSection = 'tarifas' | 'servicio' | 'categoria';

export function TravelCabManagement({
  section,
  onChangeSection,
}: {
  section: TravelCabSection;
  onChangeSection: (s: TravelCabSection) => void;
}) {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mu' | 'arc' | 'transfers'>('all');

  // Crear / Editar Servicio
  const [serviceType, setServiceType] = useState<'mu' | 'arc' | 'transfers'>('mu');
  const [editingMU, setEditingMU] = useState<MUTariff | null>(null);
  const [editingARC, setEditingARC] = useState<ARCTariff | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<TransferTariff | null>(null);

  // Categoría Form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catEta, setCatEta] = useState('3 - 5 min');
  const [catSeats, setCatSeats] = useState(4);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  useEffect(() => {
    const unsubTariffs = onSnapshot(collection(db, 'tariffs'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as any)
        .filter(
          (t) =>
            !t.id.endsWith('_active') &&
            t.id !== 'mu_active' &&
            t.id !== 'arc_active' &&
            t.id !== 'transfers_active'
        );
      setTariffs(list);
    });

    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VehicleCategory));
    });

    return () => {
      unsubTariffs();
      unsubCats();
    };
  }, []);

  const filteredTariffs = tariffs.filter((t) => {
    const typeMatch =
      filterType === 'all' ||
      (filterType === 'arc' ? t.type === 'arc' || t.type === 'aci' : t.type === filterType);
    const q = search.trim().toLowerCase();
    const textMatch =
      !q ||
      String(t.name || '').toLowerCase().includes(q) ||
      String(t.category || '').toLowerCase().includes(q);
    return typeMatch && textMatch;
  });

  const handleEditTariff = (t: any) => {
    setEditingMU(null);
    setEditingARC(null);
    setEditingTransfer(null);
    if (t.type === 'mu') {
      setServiceType('mu');
      setEditingMU(t);
    } else if (t.type === 'arc' || t.type === 'aci') {
      setServiceType('arc');
      setEditingARC(t);
    } else {
      setServiceType('transfers');
      setEditingTransfer(t);
    }
    onChangeSection('servicio');
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const id = editingCatId || catName.trim().toLowerCase().replace(/\s+/g, '_');
    await setDoc(
      doc(db, 'categories', id),
      {
        id,
        name: catName.trim(),
        description: catDesc.trim(),
        eta: catEta.trim() || '3 - 5 min',
        seats: Number(catSeats || 4),
        icon: 'Car',
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    setCatName('');
    setCatDesc('');
    setCatEta('3 - 5 min');
    setCatSeats(4);
    setEditingCatId(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. GESTIÓN DE TARIFAS */}
      {section === 'tarifas' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0a2a5b]">Gestión de Tarifas TravelCab</h2>
              <p className="text-xs text-slate-500">
                Tarifarios reales en Firestore (`tariffs`) para MU, ARC y Traslados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingMU(null);
                setEditingARC(null);
                setEditingTransfer(null);
                onChangeSection('servicio');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer w-fit"
            >
              <Plus className="w-4 h-4" /> Nuevo Servicio / Tarifa
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tarifa o categoría..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0a2a5b] outline-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="mu">Movilidad Urbana (MU)</option>
              <option value="arc">Autos con Chofer (ARC)</option>
              <option value="transfers">Traslados (Transfers)</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#0a2a5b] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Nombre</th>
                  <th className="py-3 px-4 font-bold">Tipo</th>
                  <th className="py-3 px-4 font-bold">Categoría</th>
                  <th className="py-3 px-4 font-bold">Tarifa Base / Km</th>
                  <th className="py-3 px-4 font-bold">Estado</th>
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTariffs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay tarifas cargadas para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredTariffs.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-bold text-slate-800">{t.name || 'Tarifario'}</td>
                      <td className="py-3 px-4 uppercase font-bold text-[#0a2a5b]">{t.type || 'mu'}</td>
                      <td className="py-3 px-4 text-slate-600">{t.category || '-'}</td>
                      <td className="py-3 px-4 text-slate-700">
                        Base: ${Number(t.baseFare || t.fixedPrice || 0).toLocaleString('es-AR')}
                        {t.pricePerKm ? ` · $${t.pricePerKm}/km` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => updateDoc(doc(db, 'tariffs', t.id), { active: t.active === false })}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer ${
                            t.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.active !== false ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {t.active !== false ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEditTariff(t)}
                          className="inline-flex items-center gap-1 text-[#0a2a5b] font-bold hover:underline cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDoc(doc(db, 'tariffs', t.id))}
                          className="inline-flex items-center gap-1 text-red-500 font-bold hover:text-red-700 cursor-pointer"
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
      )}

      {/* 2. CREAR SERVICIO */}
      {section === 'servicio' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0a2a5b]">Crear Servicio / Tarifario</h2>
              <p className="text-xs text-slate-500">
                Configuración de tarifas para Movilidad Urbana, Autos con Chofer o Traslados.
              </p>
            </div>
            <div className="flex gap-1.5 bg-white/80 border border-slate-200 rounded-xl p-1">
              {[
                { key: 'mu', label: 'Movilidad Urbana (MU)' },
                { key: 'arc', label: 'Autos con Chofer (ARC)' },
                { key: 'transfers', label: 'Traslados' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setServiceType(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    serviceType === tab.key
                      ? 'bg-[#0a2a5b] text-white'
                      : 'text-slate-600 hover:text-[#0a2a5b]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white/85 p-4 sm:p-6">
            {serviceType === 'mu' && (
              <MUTariffForm
                editData={editingMU}
                onSubmitSuccess={() => {
                  setEditingMU(null);
                  onChangeSection('tarifas');
                }}
              />
            )}
            {serviceType === 'arc' && (
              <ARCTariffForm
                editData={editingARC}
                onSubmitSuccess={() => {
                  setEditingARC(null);
                  onChangeSection('tarifas');
                }}
              />
            )}
            {serviceType === 'transfers' && (
              <TransferTariffForm
                editData={editingTransfer}
                onSubmitSuccess={() => {
                  setEditingTransfer(null);
                  onChangeSection('tarifas');
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* 3. CREAR CATEGORÍA */}
      {section === 'categoria' && (
        <div className="space-y-5">
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-lg font-bold text-[#0a2a5b]">Crear Categoría de Vehículo</h2>
            <p className="text-xs text-slate-500">
              Categorías visibles en la App de Pasajeros y Conductores (`categories`).
            </p>
          </div>

          <form
            onSubmit={handleSaveCategory}
            className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white/80 border border-slate-200/90 rounded-xl p-4"
          >
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Nombre (ej. VIP, Taxi, Estándar)"
              required
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
            <input
              type="text"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Descripción breve"
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
            <input
              type="text"
              value={catEta}
              onChange={(e) => setCatEta(e.target.value)}
              placeholder="ETA (ej. 3 - 5 min)"
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={catSeats}
                onChange={(e) => setCatSeats(Number(e.target.value))}
                min={1}
                max={20}
                className="w-20 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
              />
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45]"
              >
                <Plus className="w-4 h-4" /> {editingCatId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.length === 0 ? (
              <div className="col-span-full py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Sin categorías creadas.
              </div>
            ) : (
              categories.map((c: any) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200/90 bg-white/80 p-4 flex items-start justify-between"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-[#0a2a5b]/10 text-[#0a2a5b] flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0a2a5b]">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.description || 'Sin descripción'}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        ETA: {c.eta || '3 - 5 min'} · {c.seats || 4} plazas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(c.id);
                        setCatName(c.name || '');
                        setCatDesc(c.description || '');
                        setCatEta(c.eta || '3 - 5 min');
                        setCatSeats(c.seats || 4);
                      }}
                      className="text-[#0a2a5b] hover:underline cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDoc(doc(db, 'categories', c.id))}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
