'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles, Award, Copy, Check, Ticket, TrendingUp,
  ShoppingBag, Image as ImageIcon, Download, Share2,
  Zap, CheckCircle2, ShieldCheck, Mail, Headphones, HelpCircle, MessageSquare,
  CreditCard, Edit3, Save, AlertCircle, RefreshCw, Layers, CheckSquare
} from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_EXPERIENCE_TIERS, getPartnerTier } from '@/lib/commissions';
import { ExperiencePartnerTier } from '@/types/affiliates';

export interface SoldTrip {
  id: string;
  customerName: string;
  experienceTitle: string;
  totalAmount: number;
  installmentsCount: number;
  paidInstallments: number;
  commissionPerInstallment: number;
  totalCommission: number;
  payoutStatus: 'credited_mp' | 'pending_installment' | 'pending_cbu_monday';
  createdAt: string;
}

export default function AfiliadosPortalPage() {
  const [copied, setCopied] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'marketplace' | 'mediahub' | 'payouts'>('dashboard');
  const [tiers, setTiers] = useState<ExperiencePartnerTier[]>(DEFAULT_EXPERIENCE_TIERS);
  const [soldTrips, setSoldTrips] = useState<SoldTrip[]>([]);

  // Escuchar matriz de niveles en tiempo real desde Firestore
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'settings', 'affiliate_tiers'), (snap) => {
        if (snap.exists() && snap.data()?.tiers) {
          setTiers(snap.data().tiers);
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('[Portal Tiers listener error]:', err);
    }
  }, []);

  // Escuchar reservas reales en Firestore para el panel de ventas del afiliado
  useEffect(() => {
    try {
      const q = query(collection(db, 'experience_reservations'), orderBy('createdAt', 'desc'), limit(50));
      const unsub = onSnapshot(q, (snap) => {
        const loaded: SoldTrip[] = snap.docs
          .map((d) => {
            const data = d.data() as any;
            if (!data.affiliateRef && !data.partnerId) return null;
            const totalAmount = Number(data.financials?.totalPrice || data.totalAmount || data.amount || 0);
            const paidAmount = Number(data.financials?.paidAmount || 0);
            const commissionRate = 0.05;
            const totalCommission = Math.round(totalAmount * commissionRate);
            const isPaid = paidAmount >= totalAmount && totalAmount > 0;
            return {
              id: data.reservationCode || data.fileNumber || d.id,
              customerName: data.nombrePasajero || data.passengerName || 'Pasajero',
              experienceTitle: data.tourTitle || data.experienceTitle || 'Experiencia TravelApp',
              totalAmount,
              installmentsCount: 1,
              paidInstallments: isPaid ? 1 : 0,
              commissionPerInstallment: totalCommission,
              totalCommission,
              payoutStatus: isPaid ? 'credited_mp' : 'pending_installment',
              createdAt: typeof data.createdAt === 'string' ? data.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            } as SoldTrip;
          })
          .filter((item): item is SoldTrip => item !== null);
        setSoldTrips(loaded);
      }, () => {
        setSoldTrips([]);
      });
      return () => unsub();
    } catch {
      setSoldTrips([]);
    }
  }, []);

  // Mercado Pago OAuth State & Desvinculación
  const [mpLinked, setMpLinked] = useState(true);
  const [mpAccountEmail, setMpAccountEmail] = useState('mp.florencia@mercadopago.com.ar');

  // Datos Bancarios CBU Editables en cualquier momento
  const [bankData, setBankData] = useState({
    cbuCvu: '0000003100084592019482',
    alias: 'FLOR.TRAVEL.MP',
    accountHolder: 'María Florencia Rossi',
    bankName: 'Mercado Pago / Banco Macro',
    cuilDni: '20-34567890-9',
  });
  const [editingBank, setEditingBank] = useState(false);
  const [bankSavedSuccess, setBankSavedSuccess] = useState(false);

  // Determinar dinámicamente el nivel actual según la matriz editable
  const totalBookings = 14;
  const currentTier = getPartnerTier(totalBookings, tiers);

  // Creator Profile Data
  const creator = {
    name: 'María Florencia Rossi',
    role: 'Experience Ambassador / Creator',
    refCode: 'FLOR_TRAVEL',
    currentTierName: currentTier.name,
    commissionPct: currentTier.commissionPct,
    couponCode: 'FLOR10OFF',
    couponDiscountPct: currentTier.couponDiscountPct || 10,
    shareUrl: 'https://travelapp.ar/landing/experience?ref=FLOR_TRAVEL',
    totalBookings,
    nextTierMinBookings: 20,
    nextTierName: 'Level 4: VIP Ambassador (10% comisión)',
    totalEarned: 98000,
    walletBalance: 98000,
    rewardsPoints: 3500,
  };

  // Marketplace Catalog Items
  const catalogExperiences = [
    {
      id: 'EXP-101',
      title: 'Excursión Valles Calchaquíes & Bodegas VIP',
      location: 'Tafí del Valle & Cafayate',
      price: 120000,
      commissionPerSale: 8400, // 7%
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      badge: 'Más Vendida',
    },
    {
      id: 'EXP-102',
      title: 'Trekking & Canopy Aventura Yungas',
      location: 'San Javier, Tucumán',
      price: 60000,
      commissionPerSale: 4200,
      imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
      badge: 'Aventura',
    },
    {
      id: 'EXP-103',
      title: 'Traslado Privado Executive TravelCab',
      location: 'Aeropuerto Tucumán ➔ Hotel',
      price: 45000,
      commissionPerSale: 3150,
      imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80',
      badge: 'Movilidad VIP',
    },
    {
      id: 'EXP-104',
      title: 'Día de Campo & Cabalgata en Ruinas de Quilmes',
      location: 'Amaicha del Valle',
      price: 95000,
      commissionPerSale: 6650,
      imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
      badge: 'Cultura & Historia',
    }
  ];

  // Media Hub Resources
  const mediaResources = [
    {
      id: 'MED-01',
      title: 'Pack Fotos HD Valles Calchaquíes & Bodegas (10 fotos)',
      type: 'image',
      size: '15 MB',
      previewUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'MED-02',
      title: 'Reel 9:16 Aventura Yungas (Editado con audio en tendencia)',
      type: 'video',
      size: '42 MB',
      previewUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'MED-03',
      title: 'Template de Historia Instagram con Código FLOR10OFF',
      type: 'image',
      size: '8 MB',
      previewUrl: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=400&q=80',
    }
  ];

  // Suggested Copy Texts
  const copyTemplates = [
    {
      id: 'CP-01',
      platform: 'Instagram / TikTok Caption',
      text: '¡Vivir la experiencia de los Valles Calchaquíes nunca fue tan fácil! 🍇🍷 Usando mi código FLOR10OFF tenés un 10% de descuento en tu reserva con TravelApp. ¡Reservá acá y disfrutá Tucumán con todo incluido! 👉 https://travelapp.ar/landing/experience?ref=FLOR_TRAVEL',
    },
    {
      id: 'CP-02',
      platform: 'Mensaje de WhatsApp para Seguidores / Grupos',
      text: '¡Hola! Te comparto un descuento exclusivo para tu próximo viaje o excursión en Tucumán. Usá el cupón FLOR10OFF en la web oficial de TravelApp: https://travelapp.ar/landing/experience?ref=FLOR_TRAVEL ¡Espero que lo disfrutes mucho! 🙌✨',
    }
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(creator.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleSaveBankData = () => {
    setEditingBank(false);
    setBankSavedSuccess(true);
    setTimeout(() => setBankSavedSuccess(false), 3000);
  };

  const progressPct = Math.min(100, Math.round((creator.totalBookings / creator.nextTierMinBookings) * 100));

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-8 font-sans text-slate-900">
      
      {/* ── ENCABEZADO ULTRA-LIMPIO: SOLO EL LOGO OFICIAL DE TRAVELAPP EXPERIENCE Y BOTONES DE SOPORTE / MARKETING ── */}
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          {/* Único Logo Oficial */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/experience_original.svg"
              alt="TravelApp Experience"
              className="h-10 sm:h-12 w-auto"
            />
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
              Panel de Creador
            </span>
          </div>

          {/* ÚNICOS BOTONES DE SOPORTE & MARKETING */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="mailto:soporte@travelapp.ar"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0A2A5B] font-bold text-xs border border-slate-200 transition-all active:scale-95"
            >
              <Headphones className="w-4 h-4 text-[#EF4444]" />
              Contactar Soporte (soporte@travelapp.ar)
            </a>

            <a
              href="mailto:marketing@travelapp.ar"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2A5B] hover:bg-[#0A2A5B]/90 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Mail className="w-4 h-4 text-amber-300" />
              Contactar Marketing (marketing@travelapp.ar)
            </a>
          </div>
        </div>

        {/* BANNER DE BIENVENIDA DEL EMBAJADOR */}
        <div className="bg-gradient-to-r from-[#0A2A5B] via-blue-900 to-[#EF4444] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-amber-300 border border-white/10">
              <Sparkles className="h-4 w-4" />
              Embajador Habilitado & Activo
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">{creator.name}</h1>
            <p className="text-xs text-slate-200">
              Nivel Actual: <strong className="text-amber-300">{creator.currentTierName}</strong> · Comisión por Cuota: <strong className="text-emerald-300">{creator.commissionPct}%</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
              <p className="text-[10px] font-bold text-slate-200 uppercase">Comisiones Liquidadas</p>
              <p className="text-2xl font-black text-amber-300">${creator.walletBalance.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN LIMPIAS */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-[#0A2A5B] text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4 text-[#EF4444]" />
            Métricas & Enlace
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'sales'
                ? 'bg-[#0A2A5B] text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Mis Viajes Vendidos & Cuotas ({soldTrips.length})
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'marketplace'
                ? 'bg-[#0A2A5B] text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Marketplace de Viajes
          </button>

          <button
            onClick={() => setActiveTab('mediahub')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'mediahub'
                ? 'bg-[#0A2A5B] text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            Recursos Promocionales
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'payouts'
                ? 'bg-[#0A2A5B] text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-4 h-4 text-sky-400" />
            Cobro MP OAuth & Datos Bancarios
          </button>
        </div>

        {/* CONTENIDO PESTAÑA 1: DASHBOARD & MÉTRICAS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* PROGRESO DE NIVEL */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-[#EF4444]" />
                  <h3 className="text-sm font-black text-[#0A2A5B]">
                    Progreso de Nivel: {creator.totalBookings} / {creator.nextTierMinBookings} Reservas Concretadas
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-[#0A2A5B] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  ¡Faltan solo {creator.nextTierMinBookings - creator.totalBookings} reservas para subir a {creator.nextTierName}!
                </span>
              </div>

              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-[#0A2A5B] to-[#EF4444] rounded-full transition-all duration-500 shadow-md"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* ENLACE Y CUPÓN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0A2A5B] flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-emerald-600" />
                    Tu Enlace de Afiliado & Código de Descuento
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Compartí este código con tus seguidores para que reciban un <strong className="text-emerald-600">{creator.couponDiscountPct}% OFF</strong> en su viaje. ¡Al reservar con tu enlace cobrás tu comisión en cada cuota!
                  </p>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-xs font-bold text-slate-700 flex justify-between items-center">
                    <span>{creator.shareUrl}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded font-sans font-black border border-emerald-300">
                      CUPÓN: {creator.couponCode}
                    </span>
                  </div>

                  <button
                    onClick={handleCopyLink}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] px-5 py-3 text-xs font-bold text-white shadow-md transition-all"
                  >
                    {copied ? <Check className="h-4 w-4 text-amber-300" /> : <Copy className="h-4 w-4" />}
                    {copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-[#0A2A5B] to-emerald-800 p-6 text-white shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-2">
                    <span>TRAVELAPP EXPERIENCE</span>
                    <span>ACTIVO</span>
                  </div>
                  <p className="text-3xl font-black">{creator.couponDiscountPct}% OFF</p>
                  <p className="text-xs opacity-90 mt-1">Beneficio exclusivo para tus seguidores.</p>
                </div>

                <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 text-center border border-white/20 mt-4">
                  <span className="text-xs font-mono font-black text-amber-300 tracking-wider">
                    {creator.couponCode}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* CONTENIDO PESTAÑA 2: CONTROL DE VIAJES VENDIDOS & CUOTAS DE MEMBRESÍA */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <h3 className="text-base font-black text-[#0A2A5B] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> Control de Viajes Vendidos & Estado de Cuotas de Membresía
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Seguimiento detallado de cada reserva generada con tu código, cuántas cuotas va pagando el cliente y la liquidación exacta de tu comisión por cada cuota abonada.
              </p>
            </div>

            {/* Tabla de Viajes Vendidos */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">Cliente & Experiencia</th>
                      <th className="px-4 py-3.5">Monto Total</th>
                      <th className="px-4 py-3.5 text-center">Cuotas Abonadas</th>
                      <th className="px-4 py-3.5 text-right">Comisión x Cuota</th>
                      <th className="px-4 py-3.5 text-right">Comisión Total</th>
                      <th className="px-4 py-3.5 text-center">Estado de Comisión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {soldTrips.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400 font-medium">
                          Todavía no registrás viajes vendidos con tu enlace de afiliado. Compartí tu link para comenzar a sumar comisiones.
                        </td>
                      </tr>
                    ) : soldTrips.map((trip) => {
                      const quotaPct = Math.round((trip.paidInstallments / trip.installmentsCount) * 100);
                      return (
                        <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-[#0A2A5B]">{trip.customerName}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{trip.experienceTitle}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Reserva N° {trip.id} · {trip.createdAt}</div>
                          </td>

                          <td className="px-4 py-3.5 font-bold text-slate-700">
                            ${trip.totalAmount.toLocaleString('es-AR')}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <div className="space-y-1">
                              <span className="font-extrabold text-[#0A2A5B] text-xs">
                                {trip.paidInstallments} de {trip.installmentsCount} cuotas
                              </span>
                              <div className="w-24 mx-auto h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${quotaPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                            ${trip.commissionPerInstallment.toLocaleString('es-AR')}
                          </td>

                          <td className="px-4 py-3.5 text-right font-black text-[#0A2A5B] text-sm">
                            ${trip.totalCommission.toLocaleString('es-AR')}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            {trip.payoutStatus === 'credited_mp' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Acreditada (Split MP)
                              </span>
                            )}
                            {trip.payoutStatus === 'pending_installment' && (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                                ⏳ Pendiente Próx. Cuota
                              </span>
                            )}
                            {trip.payoutStatus === 'pending_cbu_monday' && (
                              <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-900 border border-sky-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                                🗓️ Liquidación Lunes (CBU)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 3: MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <h3 className="text-base font-black text-[#0A2A5B] flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#EF4444]" /> Catálogo Oficial de Viajes & Experiencias
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Generá tu enlace personalizado con 1-click para cada viaje o excursión del catálogo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {catalogExperiences.map((exp) => (
                <div key={exp.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <div className="relative h-44">
                      <img src={exp.imageUrl} alt={exp.title} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 bg-[#0A2A5B] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {exp.badge}
                      </span>
                    </div>
                    <div className="p-4 space-y-2 text-xs">
                      <h4 className="font-bold text-[#0A2A5B] leading-snug">{exp.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{exp.location}</p>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-slate-400">Precio Venta:</span>
                        <span className="font-bold text-slate-700">${exp.price.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-700 font-bold">
                        <span>Tu Comisión ({creator.commissionPct}%):</span>
                        <span>+${exp.commissionPerSale.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => handleCopyText(`https://travelapp.ar/landing/experience?id=${exp.id}&ref=${creator.refCode}`, exp.id)}
                      className="w-full py-2.5 rounded-xl bg-[#0A2A5B] hover:bg-[#0A2A5B]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {copiedItem === exp.id ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Share2 className="w-3.5 h-3.5" />}
                      {copiedItem === exp.id ? '¡Link Copiado!' : 'Generar Link de Experiencia'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 4: MEDIA HUB */}
        {activeTab === 'mediahub' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <h3 className="text-base font-black text-[#0A2A5B] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-500" /> Repositorio Promocional (Media Hub)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Descargá imágenes HD, Reels preeditados y copys sugeridos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mediaResources.map((res) => (
                <div key={res.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="relative h-36 rounded-2xl overflow-hidden border border-slate-200">
                    <img src={res.previewUrl} alt={res.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                      {res.size}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-[#0A2A5B] leading-snug">{res.title}</h4>
                  <a
                    href={res.previewUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0A2A5B] font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200"
                  >
                    <Download className="w-3.5 h-3.5 text-[#EF4444]" /> Descargar Recurso HD
                  </a>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-black text-xs text-[#0A2A5B] uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#EF4444]" /> Textos Sugeridos para Publicar
              </h4>

              <div className="space-y-3">
                {copyTemplates.map((copy) => (
                  <div key={copy.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-[#0A2A5B]">
                      <span>{copy.platform}</span>
                      <button
                        onClick={() => handleCopyText(copy.text, copy.id)}
                        className="inline-flex items-center gap-1 text-[#EF4444] hover:text-red-700 font-extrabold text-[11px]"
                      >
                        {copiedItem === copy.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedItem === copy.id ? '¡Copiado!' : 'Copiar Copy'}
                      </button>
                    </div>
                    <p className="text-slate-700 font-mono text-[11px] bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                      {copy.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 5: VINCULACIÓN DE MERCADO PAGO (OAUTH) & EDICIÓN DE DATOS BANCARIOS */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            
            {bankSavedSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-sm animate-fadeIn">
                <Check className="h-4 w-4 text-emerald-600" />
                ¡Tus datos bancarios de CBU/CVU fueron actualizados correctamente!
              </div>
            )}

            {/* SECCIÓN A: DESVINCULACIÓN & VINCULACIÓN DE MERCADO PAGO */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-[#0A2A5B] flex items-center gap-2">
                    <Zap className="w-5 h-5 text-sky-500" /> Vinculación de Mercado Pago (OAuth Split Inverso)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Conectá o desvinculá tu billetera de Mercado Pago en cualquier momento para recibir tus comisiones de manera instantánea.
                  </p>
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-black text-xl shadow-md">
                    MP
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#0A2A5B] flex items-center gap-1.5">
                      Estado actual: 
                      {mpLinked ? (
                        <span className="text-emerald-700 font-black bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Vinculado & Activo
                        </span>
                      ) : (
                        <span className="text-amber-700 font-black bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px]">
                          Desconectado
                        </span>
                      )}
                    </h4>
                    {mpLinked && (
                      <p className="text-xs text-slate-600 font-mono mt-0.5">Cuenta MP: {mpAccountEmail}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setMpLinked(!mpLinked)}
                  className={`px-5 py-3 rounded-xl font-bold text-xs shadow-md transition-all ${
                    mpLinked
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  {mpLinked ? 'Desvincular Cuenta MP' : '⚡ Conectar Mercado Pago OAuth'}
                </button>
              </div>
            </div>

            {/* SECCIÓN B: EDICIÓN DE DATOS BANCARIOS (CBU / CVU / ALIAS / TITULAR) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-[#0A2A5B] flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-500" /> Edición de Datos Bancarios (CBU / CVU Semanal)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Modificá tus datos de transferencia bancaria en cualquier momento para la liquidación de los Lunes.
                  </p>
                </div>

                {!editingBank ? (
                  <button
                    onClick={() => setEditingBank(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0A2A5B] font-bold text-xs border border-slate-200 transition-all"
                  >
                    <Edit3 className="w-4 h-4 text-[#EF4444]" /> Editar CBU / Alias
                  </button>
                ) : (
                  <button
                    onClick={handleSaveBankData}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Save className="w-4 h-4" /> Guardar Cambios
                  </button>
                )}
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CBU o CVU (22 dígitos)</label>
                    <input
                      type="text"
                      disabled={!editingBank}
                      value={bankData.cbuCvu}
                      onChange={(e) => setBankData({ ...bankData, cbuCvu: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-[#EF4444] disabled:bg-slate-100/80 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Alias CBU / CVU</label>
                    <input
                      type="text"
                      disabled={!editingBank}
                      value={bankData.alias}
                      onChange={(e) => setBankData({ ...bankData, alias: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-[#EF4444] disabled:bg-slate-100/80 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Titular de la Cuenta</label>
                    <input
                      type="text"
                      disabled={!editingBank}
                      value={bankData.accountHolder}
                      onChange={(e) => setBankData({ ...bankData, accountHolder: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-[#EF4444] disabled:bg-slate-100/80 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CUIL / DNI del Titular</label>
                    <input
                      type="text"
                      disabled={!editingBank}
                      value={bankData.cuilDni}
                      onChange={(e) => setBankData({ ...bankData, cuilDni: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-[#EF4444] disabled:bg-slate-100/80 disabled:text-slate-600"
                    />
                  </div>
                </div>

                {editingBank && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSaveBankData}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Guardar Datos Bancarios
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
