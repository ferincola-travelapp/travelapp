'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Search, Plus, Trash2, Edit2, Phone, Mail, Landmark, Calendar, ShieldCheck, ShieldAlert } from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Merchant {
  id: string;
  nombreFantasia: string;
  razonSocial: string;
  cuit: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  titularName: string;
  titularCargo: string;
  telefono: string;
  fechaAlta: string;
  fechaVencimiento: string;
  rubroName: string;
  categoryName: string;
  status: 'Activo' | 'Inactivo';
}

export default function AssociatedMerchantsListPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Sincronización en vivo con Firestore
    const unsub = onSnapshot(collection(db, 'rewards_merchants'), (snapshot) => {
      const list: Merchant[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nombreFantasia: data.nombreFantasia || 'Comercio',
          razonSocial: data.razonSocial || '',
          cuit: data.cuit || '',
          domicilio: data.domicilio || '',
          localidad: data.localidad || '',
          provincia: data.provincia || '',
          titularName: data.titularName || '',
          titularCargo: data.titularCargo || '',
          telefono: data.telefono || '',
          fechaAlta: data.fechaAlta || '',
          fechaVencimiento: data.fechaVencimiento || '',
          rubroName: data.rubroName || 'Gastronomía',
          categoryName: data.categoryName || 'Gold',
          status: data.status || 'Activo'
        };
      });
      setMerchants(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading merchants:", error);
      setMerchants([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: 'Activo' | 'Inactivo') => {
    try {
      await updateDoc(doc(db, 'rewards_merchants', id), {
        status: currentStatus === 'Activo' ? 'Inactivo' : 'Activo'
      });
    } catch (err) {
      console.error("Error toggling merchant status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar a este comercio asociado? Se desvincularán todos los cupones activos.')) {
      try {
        await deleteDoc(doc(db, 'rewards_merchants', id));
      } catch (err) {
        console.error("Error deleting merchant:", err);
      }
    }
  };

  const filtered = merchants.filter(m => 
    m.nombreFantasia.toLowerCase().includes(search.toLowerCase()) || 
    m.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
    m.cuit.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-tech-blue">
            <Building2 className="h-7 w-7 text-vial-orange" />
            Gestión de Comercios
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Administración de la red de comercios asociados de fidelización de Concorde 360.</p>
        </div>
        <Link
          href="/rewards/merchants/new"
          className="inline-flex items-center justify-center space-x-2 rounded-xl bg-tech-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-tech-blue/90 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Comercio</span>
        </Link>
      </div>

      {/* Filter */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por fantasía, razón social o CUIT..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 shadow-sm outline-none focus:border-tech-blue/40 focus:ring-2 focus:ring-tech-blue/10 transition-all"
        />
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando directorio de comercios...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(merch => {
            const daysLeft = merch.fechaVencimiento 
              ? Math.ceil((new Date(merch.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : 365;
            const isNearExpiration = daysLeft > 0 && daysLeft <= 30;

            return (
              <div key={merch.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{merch.nombreFantasia}</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">{merch.razonSocial} · CUIT: {merch.cuit}</p>
                    </div>
                    {merch.status === 'Activo' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-250 px-2 py-0.5 font-bold text-emerald-700 text-[9px] uppercase">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-250 px-2 py-0.5 font-bold text-slate-500 text-[9px] uppercase">
                        Inactivo
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <span className="bg-slate-100 border border-slate-200 rounded px-2 py-1 text-slate-600 truncate text-center">
                      {merch.rubroName}
                    </span>
                    <span className="bg-indigo-50 border border-indigo-200 rounded px-2 py-1 text-indigo-700 text-center">
                      Tier: {merch.categoryName}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1 mt-4">
                    <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {merch.telefono || '—'}</p>
                    <p className="text-[11px] text-slate-400">Titular: {merch.titularName || '—'} ({merch.titularCargo || '—'})</p>
                    <p className="text-[11px] text-slate-400 truncate">Domicilio: {merch.domicilio}, {merch.localidad}</p>
                  </div>

                  {merch.fechaVencimiento && (
                    <div className={`mt-3 border rounded-xl p-2.5 text-[11px] ${
                      isNearExpiration 
                        ? 'bg-rose-50 border-rose-200 text-rose-800' 
                        : 'bg-slate-50 border-slate-100 text-slate-500'
                    }`}>
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Vence: {merch.fechaVencimiento} 
                        {isNearExpiration && <span className="font-bold animate-pulse text-rose-600"> (Vence pronto)</span>}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleStatus(merch.id, merch.status)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      merch.status === 'Activo'
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {merch.status === 'Activo' ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDelete(merch.id)}
                    className="p-1 hover:bg-red-50 text-red-500 rounded-lg hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
