'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Edit2, Save, Award, Ticket, Users, ArrowLeft, Check, Sparkles, ExternalLink,
  CheckCircle2, XCircle, AlertCircle, Eye, Search, Filter, Shield, Phone, Mail,
  MapPin, Calendar, CreditCard, Link as LinkIcon, FileText, Lock, RefreshCw, X
} from 'lucide-react';
import { ExperiencePartnerTier, ExperiencePartner } from '@/types/affiliates';
import { DEFAULT_EXPERIENCE_TIERS } from '@/lib/commissions';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AffiliateApplicant {
  id: string;
  fullName: string;
  dniCuit: string;
  dob: string;
  email: string;
  phone: string;
  province: string;
  city: string;
  category: string;
  socialChannels: string;
  publicationLinks?: string[];
  motivationText: string;
  payoutMethod: 'mp_instant' | 'cbu_weekly';
  cbuCvu?: string;
  alias?: string;
  accountHolder?: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  refCode?: string;
  assignedCouponCode?: string;
  createdAt: number;
}

export default function MarketingPartnersPage() {
  const [activeTab, setActiveTab] = useState<'applicants' | 'tiers' | 'payouts'>('applicants');
  const [tiers, setTiers] = useState<ExperiencePartnerTier[]>(DEFAULT_EXPERIENCE_TIERS);
  const [applicants, setApplicants] = useState<AffiliateApplicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<AffiliateApplicant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierForm, setTierForm] = useState<Partial<ExperiencePartnerTier>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Escuchar la matriz de niveles configurada en Firestore
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'settings', 'affiliate_tiers'), (snap) => {
        if (snap.exists() && snap.data()?.tiers) {
          setTiers(snap.data().tiers);
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('[Firebase Tiers Error]:', err);
    }
  }, []);

  // Escuchar postulantes en tiempo real
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'affiliate_applications'), (snap) => {
        if (!snap.empty) {
          const list: AffiliateApplicant[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as AffiliateApplicant);
          });
          setApplicants(list);
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('[Firebase Applicants Error]:', err);
    }
  }, []);

  const handleUpdateStatus = (id: string, newStatus: 'active' | 'suspended' | 'rejected') => {
    setApplicants(prev => prev.map(a => {
      if (a.id === id) {
        const updatedCode = a.refCode || a.fullName.toUpperCase().replace(/\s+/g, '_').slice(0, 10);
        const updatedCoupon = a.assignedCouponCode || `${a.fullName.split(' ')[0].toUpperCase()}10OFF`;
        return {
          ...a,
          status: newStatus,
          refCode: updatedCode,
          assignedCouponCode: updatedCoupon
        };
      }
      return a;
    }));

    try {
      updateDoc(doc(db, 'affiliate_applications', id), {
        status: newStatus,
        updatedAt: Date.now()
      }).catch(() => {});
    } catch (e) {}

    if (selectedApplicant?.id === id) {
      setSelectedApplicant(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleEditTier = (tier: ExperiencePartnerTier) => {
    setEditingTierId(tier.id);
    setTierForm({ ...tier });
  };

  const handleSaveTier = async (tierId: string) => {
    const updatedTiers = tiers.map(t => t.id === tierId ? { ...t, ...tierForm } as ExperiencePartnerTier : t);
    setTiers(updatedTiers);
    setEditingTierId(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);

    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'affiliate_tiers'), {
        tiers: updatedTiers,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (err) {
      console.warn('[Save Tiers Error]:', err);
    }
  };

  const filteredApplicants = applicants.filter(a => {
    const matchesSearch = a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.dniCuit.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6 overflow-y-auto font-sans">
      
      {/* Volver */}
      <Link href="/marketing" className="flex w-fit items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0A2A5B] transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a Growth & Marketing
      </Link>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0A2A5B] flex items-center gap-2">
            <Award className="h-7 w-7 text-[#EF4444]" />
            Programa de Embajadores & Afiliados (TravelApp Experience)
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Gestión de solicitudes de onboarding, aprobación de accesos, suspensión de cuentas y liquidación de comisiones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/experiences/creator-portal"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A2A5B] hover:bg-[#0A2A5B]/90 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
          >
            <ExternalLink className="h-4 w-4 text-[#EF4444]" />
            Ver Portal de Embajador (Demo)
          </Link>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('applicants')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'applicants'
              ? 'bg-[#0A2A5B] text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-[#EF4444]" />
          Solicitudes & Embajadores
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-[#EF4444] text-white font-mono">
            {applicants.filter(a => a.status === 'pending').length} nuevos
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tiers')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'tiers'
              ? 'bg-[#0A2A5B] text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          Matriz de Niveles & % Comisiones
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'payouts'
              ? 'bg-[#0A2A5B] text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Ticket className="w-4 h-4 text-emerald-400" />
          Liquidaciones CBU (Lunes)
        </button>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-sm">
          <Check className="h-4 w-4 text-emerald-600" />
          ¡Configuración guardada con éxito!
        </div>
      )}

      {/* PESTAÑA 1: SOLICITUDES DE ONBOARDING & CONTROL DE ACCESO */}
      {activeTab === 'applicants' && (
        <div className="space-y-6">
          
          {/* Barra de Búsqueda y Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o DNI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#EF4444]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">Filtrar Estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#EF4444]"
              >
                <option value="all">Todos los Postulantes</option>
                <option value="pending">⏳ Pendientes de Aprobación</option>
                <option value="active">🟢 Habilitados (Activos)</option>
                <option value="suspended">🟡 Suspendidos</option>
              </select>
            </div>
          </div>

          {/* Tabla de Postulantes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Postulante</th>
                    <th className="px-4 py-3">DNI / CUIT</th>
                    <th className="px-4 py-3">Provincia / Ciudad</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-center">Cobro</th>
                    <th className="px-4 py-3 text-center">Estado de Acceso</th>
                    <th className="px-4 py-3 text-center">Acciones de Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredApplicants.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0A2A5B]">{app.fullName}</div>
                        <div className="text-[10px] text-slate-400">{app.email} · {app.phone}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">
                        {app.dniCuit}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700">{app.city}, {app.province}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {app.category}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          app.payoutMethod === 'mp_instant' ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {app.payoutMethod === 'mp_instant' ? '⚡ Split MP' : '🗓️ CBU Semanal'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {app.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            ⏳ Pendiente de Aprobación
                          </span>
                        )}
                        {app.status === 'active' && (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            🟢 Habilitado (Activo)
                          </span>
                        )}
                        {app.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            🟡 Acceso Suspendido
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            🔴 Rechazado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedApplicant(app)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-all"
                            title="Ver expediente completo de onboarding"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#0A2A5B]" /> Expediente
                          </button>

                          {app.status !== 'active' ? (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'active')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Habilitar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'suspended')}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-all"
                            >
                              <Lock className="w-3.5 h-3.5" /> Suspender
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* PESTAÑA 2: MATRIZ DE NIVELES CONFIGURABLE */}
      {activeTab === 'tiers' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#0A2A5B] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#EF4444]" />
                Matriz Dinámica de Niveles & Beneficios (100% Configurable)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Editá los rangos de reservas, el % de comisión por cuota, el descuento para seguidores y los Puntos Rewards por nivel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier) => {
              const isEditing = editingTierId === tier.id;
              return (
                <div
                  key={tier.id}
                  className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                    isEditing ? 'border-[#EF4444] bg-red-50/20 ring-2 ring-[#EF4444]/20' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30">
                        {tier.name}
                      </span>
                      {!isEditing ? (
                        <button
                          onClick={() => handleEditTier(tier)}
                          className="rounded p-1 text-slate-400 hover:text-[#EF4444] hover:bg-slate-200/50 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSaveTier(tier.id)}
                          className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <Save className="h-3 w-3" /> Guardar
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Min. Reservas</label>
                          <input
                            type="number"
                            value={tierForm.minBookings ?? tier.minBookings}
                            onChange={e => setTierForm({ ...tierForm, minBookings: parseInt(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-300 p-1.5 font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">% Comisión (por cuota)</label>
                          <input
                            type="number" step="0.5"
                            value={tierForm.commissionPct ?? tier.commissionPct}
                            onChange={e => setTierForm({ ...tierForm, commissionPct: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-300 p-1.5 font-bold text-[#0A2A5B]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">% Cupón Seguidores</label>
                          <input
                            type="number"
                            value={tierForm.couponDiscountPct ?? tier.couponDiscountPct}
                            onChange={e => setTierForm({ ...tierForm, couponDiscountPct: parseInt(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-300 p-1.5 font-bold text-[#EF4444]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Puntos Rewards Extra</label>
                          <input
                            type="number"
                            value={tierForm.bonusRewardPoints ?? tier.bonusRewardPoints}
                            onChange={e => setTierForm({ ...tierForm, bonusRewardPoints: parseInt(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-300 p-1.5 font-bold text-amber-700"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Rango Ventas:</span>
                          <span className="font-bold text-slate-700">{tier.minBookings} a {tier.maxBookings || '∞'} reservas</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Comisión Cuota:</span>
                          <span className="font-extrabold text-[#0A2A5B] text-sm">{tier.commissionPct}%</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Cupón Seguidores:</span>
                          <span className="font-bold text-[#EF4444]">{tier.couponDiscountPct ? `${tier.couponDiscountPct}% OFF` : 'Sin cupón'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Bonus Rewards:</span>
                          <span className="font-bold text-amber-600">+{tier.bonusRewardPoints} pts</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: LIQUIDACIONES SEMANALES CBU */}
      {activeTab === 'payouts' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-amber-600" />
                Liquidaciones Semanales por CBU / CVU (Transferencias de los Lunes)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Planilla de liquidación para transferencias bancarias semanales a Embajadores sin Split MP activo.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#0A2A5B] hover:bg-[#0A2A5B]/90 text-white font-bold text-xs px-4 py-2.5 shadow-sm transition-all">
              <Save className="h-4 w-4" /> Exportar Planilla CBU (CSV/Excel)
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-amber-100/50 text-[11px] uppercase font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Embajador</th>
                  <th className="px-4 py-3">CBU / CVU Destino</th>
                  <th className="px-4 py-3">Alias / Titular</th>
                  <th className="px-4 py-3 text-right">Monto Acumulado</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-[#0A2A5B]">Lucas Excursiones & Vlogs</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-800 text-[11px]">0000003100084592019482</td>
                  <td className="px-4 py-3 text-slate-600">LUCAS.VLOGS.CBU / Lucas Benítez</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-700 text-sm">$112.000</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
                      Pendiente Lunes
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-xs transition-all shadow-sm">
                      Marcar Pagado
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE EXPEDIENTE COMPLETO DE ONBOARDING */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-slate-900 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setSelectedApplicant(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0A2A5B] flex items-center justify-center text-white font-black text-lg">
                {selectedApplicant.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0A2A5B]">{selectedApplicant.fullName}</h3>
                <p className="text-xs text-slate-500 font-medium">Expediente de Postulación N° {selectedApplicant.id}</p>
              </div>
            </div>

            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <h4 className="font-black text-[#0A2A5B] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#EF4444]" /> Identificación & Datos Fiscales
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <p><strong>DNI / CUIT:</strong> {selectedApplicant.dniCuit}</p>
                <p><strong>Fecha Nacimiento:</strong> {selectedApplicant.dob}</p>
                <p><strong>WhatsApp:</strong> {selectedApplicant.phone}</p>
                <p><strong>Email:</strong> {selectedApplicant.email}</p>
                <p><strong>Ubicación:</strong> {selectedApplicant.city}, {selectedApplicant.province}</p>
                <p><strong>Categoría:</strong> {selectedApplicant.category}</p>
              </div>
            </div>

            {/* SECCIÓN 2: CANALES SOCIALES & LINKS DE MUESTRA (HASTA 5) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <h4 className="font-black text-[#0A2A5B] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#EF4444]" /> Canales de Difusión & Portafolio de Muestra
              </h4>
              <p className="text-slate-700"><strong>Canales Principales:</strong> {selectedApplicant.socialChannels}</p>
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">Publicaciones Destacadas de Muestra (Cargadas en Onboarding):</label>
                <div className="space-y-1.5">
                  {(selectedApplicant.publicationLinks || []).length > 0 ? (
                    selectedApplicant.publicationLinks?.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-[#0A2A5B] hover:text-[#EF4444] font-mono text-[11px] bg-white p-2 rounded-xl border border-slate-200 transition-colors"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-[#EF4444]" />
                        {link}
                      </a>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No adjuntó enlaces de publicaciones previas.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivación:</label>
                <p className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 italic">{selectedApplicant.motivationText}</p>
              </div>
            </div>

            {/* SECCIÓN 3: DATOS DE COBRO */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <h4 className="font-black text-[#0A2A5B] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#EF4444]" /> Configuración de Cobro
              </h4>
              <p><strong>Modalidad Elegida:</strong> {selectedApplicant.payoutMethod === 'mp_instant' ? '⚡ Split Mercado Pago Instantáneo' : '🗓️ CBU Liquidación Semanal'}</p>
              {selectedApplicant.cbuCvu && <p><strong>CBU/CVU:</strong> <span className="font-mono">{selectedApplicant.cbuCvu}</span></p>}
              {selectedApplicant.alias && <p><strong>Alias CBU:</strong> {selectedApplicant.alias}</p>}
              {selectedApplicant.accountHolder && <p><strong>Titular:</strong> {selectedApplicant.accountHolder}</p>}
            </div>

            {/* ACCIONES DE ESTADO */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
              {selectedApplicant.status !== 'active' ? (
                <button
                  onClick={() => handleUpdateStatus(selectedApplicant.id, 'active')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Aprobar & Habilitar Acceso
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateStatus(selectedApplicant.id, 'suspended')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Lock className="w-4 h-4" /> Suspender Acceso
                </button>
              )}

              <button
                onClick={() => setSelectedApplicant(null)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
