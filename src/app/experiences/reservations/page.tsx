'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Ticket, Plus, Search, Filter, ArrowUpRight, DollarSign, Calendar,
  User, CheckCircle2, Clock, AlertCircle, Phone, Mail, FileText,
  CreditCard, Printer, QrCode, Trash2, ArrowLeft, RefreshCw, Sparkles,
  MapPin, Users, ChevronRight, X, Eye, Briefcase, Smartphone, Copy, Check, ExternalLink
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTimeRemainingInfo } from '@/types/experiences';

interface PassengerEntry {
  fullName: string;
  dni: string;
  dob?: string;
  dietaryRestrictions?: string;
  isTitular?: boolean;
}

interface PaymentHistoryItem {
  date: string;
  amount: number;
  currency: string;
  method: string;
  concept?: string;
}

interface ReservationData {
  id: string;
  reservationCode?: string;
  customerId?: string;
  nombrePasajero: string;
  emailPasajero: string;
  telefonoPasajero: string;
  dniPasajero?: string;
  tourId: string;
  tourTitle: string;
  destination?: string;
  roomCategory?: string;
  cantidadPersonas: number;
  passengersList?: PassengerEntry[];
  tripSource?: string;
  independentServices?: any[];
  commercialAllocation?: any;
  financials?: {
    currency: 'ARS' | 'USD';
    unitPrice?: number;
    totalPrice: number;
    paidAmount: number;
    balanceDue: number;
    paymentPlan?: string;
    paymentMethod?: string;
    paymentsHistory?: PaymentHistoryItem[];
  };
  estado: 'Confirmada' | 'Señada' | 'Presupuestada' | 'Cancelada';
  expiresAt?: string | null;
  timeToPayPolicy?: string | null;
  branchId?: string;
  branchName?: string;
  amount?: number;
  currency?: 'ARS' | 'USD';
  createdAt: string;
}

interface SupplierDeadlineItem {
  id: string;
  reservationId: string;
  reservationCode: string;
  passengerName: string;
  serviceId: string;
  category: string;
  providerName: string;
  bookingLocator: string;
  description?: string;
  amountToPay: number;
  currency: string;
  deadlineDate: string;
  status: 'Pendiente' | 'Señado' | 'Pagado';
  branchId?: string;
  branchName?: string;
  createdAt?: string;
}

export default function ExperiencesReservationsPage() {
  const [viewMode, setViewMode] = useState<'reservations' | 'supplier_deadlines'>('reservations');
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [supplierDeadlines, setSupplierDeadlines] = useState<SupplierDeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');

  // Modal: Registrar Cobro / Saldo Pasajero
  const [selectedResForPayment, setSelectedResForPayment] = useState<ReservationData | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Transferencia Bancaria');
  const [paymentConcept, setPaymentConcept] = useState<string>('Cobro de Saldo de Reserva');
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);

  // Modal: Registrar Pago a Operador / Proveedor (Payables)
  const [selectedDeadlineForPay, setSelectedDeadlineForPay] = useState<SupplierDeadlineItem | null>(null);
  const [operatorPaymentAmount, setOperatorPaymentAmount] = useState<number>(0);
  const [operatorPaymentMethod, setOperatorPaymentMethod] = useState<string>('Transferencia Bancaria');
  const [operatorReceiptRef, setOperatorReceiptRef] = useState<string>('');
  const [savingOperatorPayment, setSavingOperatorPayment] = useState<boolean>(false);

  // Modal: Prorrogar Plazo TTL
  const [selectedResForExtend, setSelectedResForExtend] = useState<ReservationData | null>(null);
  const [extendedHours, setExtendedHours] = useState<number>(24);
  const [extending, setExtending] = useState<boolean>(false);

  // Modal: Cobro con NAVE (Banco Galicia / QR)
  const [selectedResForNave, setSelectedResForNave] = useState<ReservationData | null>(null);
  const [naveLoading, setNaveLoading] = useState<boolean>(false);
  const [naveCheckoutUrl, setNaveCheckoutUrl] = useState<string | null>(null);
  const [naveQrData, setNaveQrData] = useState<string | null>(null);
  const [naveAmount, setNaveAmount] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Modal: Ver Voucher / Manifiesto
  const [selectedResForVoucher, setSelectedResForVoucher] = useState<ReservationData | null>(null);

  // Handler para generar intención de cobro con Mercado Pago Checkout Pro
  const handleOpenNavePayment = async (res: ReservationData) => {
    setSelectedResForNave(res);
    const amount = res.financials?.balanceDue || res.amount || 0;
    setNaveAmount(amount);
    setNaveLoading(true);
    setNaveCheckoutUrl(null);
    setNaveQrData(null);
    setCopiedLink(false);

    try {
      const resp = await fetch('/api/checkout/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalPaymentId: res.reservationCode || res.id,
          amount,
          currency: res.financials?.currency || 'ARS',
          productName: res.tourTitle,
          reservationId: res.id,
          buyer: {
            name: res.nombrePasajero,
            email: res.emailPasajero,
            phone: res.telefonoPasajero,
            docNumber: res.dniPasajero
          }
        })
      });
      const data = await resp.json();
      const mpUrl = data.initPoint || data.checkoutUrl;
      if (data.success && mpUrl) {
        setNaveCheckoutUrl(mpUrl);
        setNaveQrData(mpUrl);
      } else {
        alert(`Error al generar cobro Mercado Pago: ${data.error || 'Respuesta inválida'}`);
      }
    } catch (err: any) {
      console.error('Error invoking Mercado Pago preference:', err);
      alert(`Error al conectar con Mercado Pago: ${err.message}`);
    } finally {
      setNaveLoading(false);
    }
  };

  // 1. Sync reservations & supplier deadlines in real-time from Firestore
  useEffect(() => {
    const q = query(collection(db, 'experience_reservations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: ReservationData[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const fin = data.financials || {};
        const total = Number(fin.totalPrice || data.amount || 0);
        const paid = Number(fin.paidAmount !== undefined ? fin.paidAmount : (data.estado === 'Confirmada' ? total : total * 0.3));
        const balance = Math.max(0, total - paid);

        list.push({
          id: docSnap.id,
          reservationCode: data.reservationCode || docSnap.id,
          customerId: data.customerId || '',
          nombrePasajero: data.nombrePasajero || data.passengerName || 'Pasajero Titular',
          emailPasajero: data.emailPasajero || data.passengerEmail || '',
          telefonoPasajero: data.telefonoPasajero || data.passengerPhone || '',
          dniPasajero: data.dniPasajero || '',
          tourId: data.tourId || '',
          tourTitle: data.tourTitle || 'Experiencia TravelApp',
          destination: data.destination || data.tourTitle || 'Destino Nacional',
          roomCategory: data.roomCategory || 'doble',
          cantidadPersonas: Number(data.cantidadPersonas || data.quantity || 1),
          passengersList: data.passengersList || [],
          tripSource: data.tripSource || 'catalog',
          independentServices: data.independentServices || [],
          commercialAllocation: data.commercialAllocation || null,
          financials: {
            currency: fin.currency || data.currency || 'ARS',
            unitPrice: fin.unitPrice || 0,
            totalPrice: total,
            paidAmount: paid,
            balanceDue: balance,
            paymentPlan: fin.paymentPlan || 'deposit',
            paymentMethod: fin.paymentMethod || 'Transferencia',
            paymentsHistory: fin.paymentsHistory || []
          },
          estado: (data.estado as any) || 'Pendiente',
          expiresAt: data.expiresAt || null,
          timeToPayPolicy: data.timeToPayPolicy || null,
          branchId: data.branchId || '1',
          branchName: data.branchName || (data.branchId === '2' ? 'Sucursal Pilar' : data.branchId === '3' ? 'Sucursal Tucumán' : 'Sucursal Retiro'),
          amount: total,
          currency: fin.currency || data.currency || 'ARS',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      setReservations(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reservations:", error);
      setLoading(false);
    });

    const unsubDeadlines = onSnapshot(collection(db, 'supplier_deadlines'), (snap) => {
      const dList: SupplierDeadlineItem[] = [];
      snap.forEach(d => {
        dList.push({ id: d.id, ...d.data() } as SupplierDeadlineItem);
      });
      setSupplierDeadlines(dList);
    });

    return () => {
      unsub();
      unsubDeadlines();
    };
  }, []);

  // Calculate KPIs Reservas Clientes
  const totalReservations = reservations.length;
  const totalPax = reservations.reduce((s, r) => s + r.cantidadPersonas, 0);

  const totalArsPaid = reservations
    .filter(r => r.financials?.currency === 'ARS' && r.estado !== 'Cancelada')
    .reduce((s, r) => s + (r.financials?.paidAmount || 0), 0);

  const totalUsdPaid = reservations
    .filter(r => r.financials?.currency === 'USD' && r.estado !== 'Cancelada')
    .reduce((s, r) => s + (r.financials?.paidAmount || 0), 0);

  const totalPendingArs = reservations
    .filter(r => r.financials?.currency === 'ARS' && r.estado !== 'Cancelada')
    .reduce((s, r) => s + (r.financials?.balanceDue || 0), 0);

  const totalPendingUsd = reservations
    .filter(r => r.financials?.currency === 'USD' && r.estado !== 'Cancelada')
    .reduce((s, r) => s + (r.financials?.balanceDue || 0), 0);

  // Calculate KPIs Proveedores (Payables)
  const totalSuppliersPayableUsd = supplierDeadlines
    .filter(d => d.currency === 'USD' && d.status !== 'Pagado')
    .reduce((s, d) => s + (d.amountToPay || 0), 0);

  const totalSuppliersPayableArs = supplierDeadlines
    .filter(d => d.currency === 'ARS' && d.status !== 'Pagado')
    .reduce((s, d) => s + (d.amountToPay || 0), 0);

  const urgentDeadlinesCount = supplierDeadlines.filter(d => {
    if (d.status === 'Pagado') return false;
    const now = new Date().setHours(0, 0, 0, 0);
    const deadline = new Date(d.deadlineDate).setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
  }).length;

  // Filtered reservations
  const filteredReservations = reservations.filter(r => {
    if (statusFilter !== 'all' && r.estado !== statusFilter) return false;
    if (branchFilter !== 'all' && r.branchId !== branchFilter) return false;
    if (currencyFilter !== 'all' && r.financials?.currency !== currencyFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const code = (r.reservationCode || r.id).toLowerCase();
      const name = r.nombrePasajero.toLowerCase();
      const dni = (r.dniPasajero || '').toLowerCase();
      const tour = r.tourTitle.toLowerCase();
      return code.includes(q) || name.includes(q) || dni.includes(q) || tour.includes(q);
    }
    return true;
  });

  // Action: Add Payment / Cobrar Saldo al Pasajero
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResForPayment || paymentAmount <= 0) return;

    setProcessingPayment(true);
    try {
      const currentFin = selectedResForPayment.financials || {
        currency: 'ARS',
        totalPrice: selectedResForPayment.amount || 0,
        paidAmount: 0,
        balanceDue: selectedResForPayment.amount || 0
      };

      const newPaidAmount = (currentFin.paidAmount || 0) + Number(paymentAmount);
      const newBalanceDue = Math.max(0, currentFin.totalPrice - newPaidAmount);
      const newStatus = newPaidAmount >= currentFin.totalPrice ? 'Confirmada' : 'Señada';

      const newPaymentItem: PaymentHistoryItem = {
        date: new Date().toISOString(),
        amount: Number(paymentAmount),
        currency: currentFin.currency,
        method: paymentMethod,
        concept: paymentConcept
      };

      const updatedHistory = [...(currentFin.paymentsHistory || []), newPaymentItem];

      // 1. Update experience_reservations
      await updateDoc(doc(db, 'experience_reservations', selectedResForPayment.id), {
        estado: newStatus,
        'financials.paidAmount': newPaidAmount,
        'financials.balanceDue': newBalanceDue,
        'financials.paymentsHistory': updatedHistory
      });

      // 2. Update contracted_trips for Mobile App
      const tripId = `trip_${selectedResForPayment.id}`;
      try {
        await updateDoc(doc(db, 'contracted_trips', tripId), {
          'payment.paidAmount': newPaidAmount,
          status: newPaidAmount >= currentFin.totalPrice ? 'confirmed' : 'deposit_paid'
        });
      } catch (e) {
        // Silent ignore
      }

      setSelectedResForPayment(null);
      setPaymentAmount(0);
      setProcessingPayment(false);
    } catch (err: any) {
      console.error("Error registering payment:", err);
      alert(`Error al registrar cobro: ${err.message}`);
      setProcessingPayment(false);
    }
  };

  // Action: Registrar Pago a Operador / Proveedor
  const handleRegisterOperatorPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeadlineForPay || operatorPaymentAmount <= 0) return;

    setSavingOperatorPayment(true);
    try {
      const isFull = operatorPaymentAmount >= selectedDeadlineForPay.amountToPay;
      const newStatus = isFull ? 'Pagado' : 'Señado';

      // 1. Update in supplier_deadlines
      await updateDoc(doc(db, 'supplier_deadlines', selectedDeadlineForPay.id), {
        status: newStatus,
        paidAmount: operatorPaymentAmount,
        paymentMethod: operatorPaymentMethod,
        operatorReceiptRef,
        paidAt: new Date().toISOString()
      });

      // 2. Also update in reservation independent services
      const res = reservations.find(r => r.id === selectedDeadlineForPay.reservationId);
      if (res && res.independentServices && res.independentServices.length > 0) {
        const updatedServices = res.independentServices.map(s => {
          if (s.id === selectedDeadlineForPay.serviceId) {
            return {
              ...s,
              paymentStatus: newStatus,
              paidAmountToOperator: operatorPaymentAmount,
              paymentReceiptNotes: `Liquidado vía ${operatorPaymentMethod} - Comprobante: ${operatorReceiptRef}`
            };
          }
          return s;
        });
        await updateDoc(doc(db, 'experience_reservations', res.id), {
          independentServices: updatedServices
        });
      }

      setSelectedDeadlineForPay(null);
      setOperatorPaymentAmount(0);
      setOperatorReceiptRef('');
      setSavingOperatorPayment(false);
    } catch (err: any) {
      console.error('Error saving operator payment:', err);
      alert(`Error al registrar pago al operador: ${err.message}`);
      setSavingOperatorPayment(false);
    }
  };

  // Action: Delete Reservation
  const handleDeleteReservation = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta reserva? Esta acción no se puede deshacer.')) {
      try {
        await deleteDoc(doc(db, 'experience_reservations', id));
      } catch (err) {
        console.error("Error deleting reservation:", err);
      }
    }
  };

  // Action: Prorrogar Plazo TTL
  const handleExtendTTL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResForExtend) return;
    setExtending(true);
    try {
      const currentExpiry = selectedResForExtend.expiresAt ? new Date(selectedResForExtend.expiresAt) : new Date();
      const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
      const newExpiry = new Date(baseTime + extendedHours * 60 * 60 * 1000).toISOString();

      await updateDoc(doc(db, 'experience_reservations', selectedResForExtend.id), {
        expiresAt: newExpiry,
        estado: selectedResForExtend.estado === 'Cancelada' ? 'Presupuestada' : selectedResForExtend.estado
      });

      setSelectedResForExtend(null);
      setExtending(false);
    } catch (err: any) {
      console.error('Error extending TTL:', err);
      alert(`Error al prorrogar plazo: ${err.message}`);
      setExtending(false);
    }
  };

  // Helper Supplier Deadlines Urgency
  const getSupplierDeadlineUrgency = (deadlineDateStr: string, status: string) => {
    if (status === 'Pagado') {
      return { isUrgent: false, label: 'Liquidado', badgeClass: 'bg-emerald-100 text-emerald-800' };
    }
    const now = new Date().setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDateStr).setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { isUrgent: true, label: `Vencido (${Math.abs(diffDays)}d)`, badgeClass: 'bg-red-100 text-red-800 font-black animate-pulse' };
    }
    if (diffDays === 0) {
      return { isUrgent: true, label: 'Vence Hoy', badgeClass: 'bg-red-100 text-red-800 font-black animate-pulse' };
    }
    if (diffDays === 1) {
      return { isUrgent: true, label: 'Vence Mañana', badgeClass: 'bg-amber-100 text-amber-800 font-bold' };
    }
    if (diffDays <= 7) {
      return { isUrgent: false, label: `En ${diffDays} días`, badgeClass: 'bg-amber-50 text-amber-700' };
    }
    return { isUrgent: false, label: `${diffDays} días`, badgeClass: 'bg-blue-50 text-blue-700' };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-8">
      {/* HEADER SUPERIOR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/experiences"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Centro de Operaciones
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2 mt-1">
              <Ticket className="h-8 w-8 text-emerald-600" />
              Gestión de Reservas &amp; Expedientes
            </h1>
          </div>
        </div>

        {/* Acciones Superiores */}
        <div className="flex items-center gap-3">
          <Link
            href="/experiences/my-trip-mgmt"
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition shadow-sm flex items-center gap-1.5"
          >
            <Smartphone className="h-4 w-4" />
            Gestor "Mi Viaje" (App)
          </Link>

          <Link
            href="/experiences/quoter"
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-sm flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Cotizador
          </Link>

          <Link
            href="/experiences/reservations/new"
            className="px-5 py-2.5 bg-tech-blue text-white rounded-xl text-xs font-black hover:bg-blue-700 transition shadow-md shadow-tech-blue/20 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Nueva Reserva Asistida
          </Link>
        </div>
      </div>

      {/* SELECTOR DE VISTA: EXPEDIENTES VS AGENDA DE PROVEEDORES */}
      <div className="flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold gap-2">
        <button
          type="button"
          onClick={() => setViewMode('reservations')}
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl transition ${
            viewMode === 'reservations'
              ? 'bg-tech-blue text-white shadow-md shadow-tech-blue/20'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Ticket className="h-4 w-4" /> Expedientes de Reservas (Clientes)
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {reservations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('supplier_deadlines')}
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl transition ${
            viewMode === 'supplier_deadlines'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Clock className="h-4 w-4" /> Agenda de Vencimientos a Proveedores (Payables)
          {urgentDeadlinesCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white animate-pulse">
              {urgentDeadlinesCount} urgentes
            </span>
          )}
        </button>
      </div>

      {/* VISTA 1: EXPEDIENTES DE RESERVAS (CLIENTES) */}
      {viewMode === 'reservations' && (
        <div className="space-y-6">
          {/* BANNER DE KPIS BIMONETARIOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
                <span>RESERVAS ACTIVAS</span>
                <Ticket className="h-5 w-5 text-tech-blue" />
              </div>
              <div className="text-2xl font-black text-slate-800">{totalReservations}</div>
              <p className="text-xs text-slate-500 mt-1 font-medium">{totalPax} pasajeros en ruta</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600 text-xs font-bold mb-2">
                <span>RECAUDADO (ARS)</span>
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-700">${totalArsPaid.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Saldo por cobrar: ${totalPendingArs.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-blue-600 text-xs font-bold mb-2">
                <span>RECAUDADO (USD)</span>
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-blue-700">U$D {totalUsdPaid.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Saldo por cobrar: U$D {totalPendingUsd.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-purple-600 text-xs font-bold mb-2">
                <span>CANALES &amp; SUCURSALES</span>
                <MapPin className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-xs font-bold text-slate-700 space-y-1 mt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Retiro:</span>
                  <span>{reservations.filter(r => r.branchId === '1').length} res.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pilar / Tucumán:</span>
                  <span>{reservations.filter(r => r.branchId !== '1').length} res.</span>
                </div>
              </div>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por código de reserva, nombre de pasajero, DNI o destino..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-tech-blue/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
              >
                <option value="all">Todos los Estados</option>
                <option value="Confirmada">Confirmadas (Pagadas)</option>
                <option value="Señada">Señadas (Con Saldo)</option>
                <option value="Presupuestada">Presupuestadas</option>
                <option value="Cancelada">Canceladas</option>
              </select>

              <select
                value={currencyFilter}
                onChange={e => setCurrencyFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
              >
                <option value="all">Todas las Monedas</option>
                <option value="ARS">ARS ($)</option>
                <option value="USD">USD (U$D)</option>
              </select>

              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
              >
                <option value="all">Todas las Sucursales</option>
                <option value="1">Retiro / Central</option>
                <option value="2">Sucursal Pilar</option>
                <option value="3">Sucursal Tucumán</option>
              </select>
            </div>
          </div>

          {/* TABLA PRINCIPAL DE RESERVAS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Expediente / Fecha</th>
                    <th className="p-4">Titular &amp; Contacto</th>
                    <th className="p-4">Destino &amp; Habitación</th>
                    <th className="p-4 text-center">Pax</th>
                    <th className="p-4 text-right">Total / Abonado</th>
                    <th className="p-4 text-right">Saldo Pendiente</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <Ticket className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        No se encontraron reservas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map(res => {
                      const fin = res.financials || { currency: 'ARS', totalPrice: 0, paidAmount: 0, balanceDue: 0 };
                      const isPaid = res.estado === 'Confirmada';
                      const isDeposit = res.estado === 'Señada';
                      const isCancel = res.estado === 'Cancelada';

                      return (
                        <tr key={res.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-4">
                            <span className="font-black text-slate-900 font-mono block">{res.reservationCode || res.id}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(res.createdAt).toLocaleDateString()} · {res.branchName}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="font-bold text-slate-800 block">{res.nombrePasajero}</span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              {res.telefonoPasajero && <span>{res.telefonoPasajero}</span>}
                              {res.dniPasajero && <span>· DNI {res.dniPasajero}</span>}
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="font-bold text-slate-800 block">{res.tourTitle}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize font-bold">
                              Hab. {res.roomCategory || 'Doble'}
                            </span>
                          </td>

                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 font-bold text-slate-700 text-xs">
                              {res.cantidadPersonas}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <span className="font-black text-slate-900 block">
                              ${fin.totalPrice.toLocaleString()} {fin.currency}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600">
                              Abonado: ${fin.paidAmount.toLocaleString()}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            {fin.balanceDue > 0 ? (
                              <span className="font-black text-amber-600">
                                ${fin.balanceDue.toLocaleString()} {fin.currency}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-black text-[11px] flex items-center justify-end gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Saldado
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide ${
                                isPaid ? 'bg-emerald-100 text-emerald-800' :
                                isDeposit ? 'bg-blue-100 text-blue-800' :
                                isCancel ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {res.estado}
                              </span>

                              {!isPaid && !isCancel && res.expiresAt && (() => {
                                const ttl = getTimeRemainingInfo(res.expiresAt);
                                if (!ttl) return null;
                                return (
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${ttl.urgencyClass}`}>
                                    {ttl.label}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {fin.balanceDue > 0 && res.estado !== 'Cancelada' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNavePayment(res)}
                                    title="Cobrar con Mercado Pago (Link + QR)"
                                    className="p-1.5 rounded-lg bg-sky-100 text-sky-800 hover:bg-sky-200 transition"
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedResForPayment(res);
                                      setPaymentAmount(fin.balanceDue);
                                    }}
                                    title="Registrar Cobro Manual (Caja / Transferencia)"
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              {!isPaid && res.estado !== 'Cancelada' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedResForExtend(res);
                                    setExtendedHours(24);
                                  }}
                                  title="Prorrogar Plazo de Pago (Time-to-Pay)"
                                  className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                                >
                                  <Clock className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedResForVoucher(res)}
                                title="Ver Voucher & Manifiesto"
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                              >
                                <FileText className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteReservation(res.id)}
                                title="Eliminar Reserva"
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: AGENDA DE VENCIMIENTOS A PROVEEDORES (PAYABLES) */}
      {viewMode === 'supplier_deadlines' && (
        <div className="space-y-6">
          {/* KPIS DE CUENTAS POR PAGAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-purple-600 text-xs font-bold mb-2">
                <span>ADEUDADO A OPERADORES (USD)</span>
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-purple-800">U$D {totalSuppliersPayableUsd.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Liquidaciones pendientes en dólares</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600 text-xs font-bold mb-2">
                <span>ADEUDADO A OPERADORES (ARS)</span>
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-800">${totalSuppliersPayableArs.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Liquidaciones terrestres en pesos</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-amber-600 text-xs font-bold mb-2">
                <span>VENCIMIENTOS INMINENTES (&le; 24hs)</span>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-800">{urgentDeadlinesCount} pagos</div>
              <p className="text-xs text-slate-500 mt-1">Riesgo de caída de bloqueo con operador</p>
            </div>
          </div>

          {/* TABLA DE VENCIMIENTOS A OPERADORES */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Cronograma de Liquidaciones y Pagos a Operadores</h3>
                <p className="text-xs text-slate-400">Controlá los plazos para no perder las reservas mayoristas ni los aéreos emitidos.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Operador / Localizador</th>
                    <th className="p-4">Rubro &amp; Servicio</th>
                    <th className="p-4">Expediente / Pasajero</th>
                    <th className="p-4 text-right">Importe a Transferir</th>
                    <th className="p-4 text-center">Fecha Límite</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {supplierDeadlines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        No hay vencimientos de proveedores registrados.
                      </td>
                    </tr>
                  ) : (
                    supplierDeadlines.map(item => {
                      const urgency = getSupplierDeadlineUrgency(item.deadlineDate, item.status);
                      const isPaid = item.status === 'Pagado';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-4">
                            <span className="font-bold text-slate-900 block">{item.providerName}</span>
                            <span className="font-mono text-[10px] text-purple-700 font-bold">
                              PNR/LOC: {item.bookingLocator}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] inline-block mb-0.5">
                              {item.category}
                            </span>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{item.description || 'Servicio independiente'}</p>
                          </td>

                          <td className="p-4">
                            <span className="font-bold text-slate-800 block">{item.passengerName}</span>
                            <span className="font-mono text-[10px] text-slate-400">{item.reservationCode}</span>
                          </td>

                          <td className="p-4 text-right">
                            <span className="font-black text-sm text-slate-900 block">
                              ${item.amountToPay?.toLocaleString()} {item.currency}
                            </span>
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-bold text-slate-700">{item.deadlineDate}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] ${urgency.badgeClass}`}>
                                {urgency.label}
                              </span>
                            </div>
                          </td>

                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>

                          <td className="p-4 text-center">
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeadlineForPay(item);
                                  setOperatorPaymentAmount(item.amountToPay);
                                }}
                                className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition shadow-sm"
                              >
                                Liquidar Pago
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MERCADO PAGO: COBRO CON LINK + QR */}
      {selectedResForNave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Cobro Inmediato con Mercado Pago
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Checkout Pro · Tarjetas de Crédito/Débito · Dinero en Cuenta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResForNave(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Datos del File */}
            <div className="bg-sky-50/70 p-3.5 rounded-2xl text-xs space-y-1.5 border border-sky-200">
              <div className="flex justify-between">
                <span className="text-sky-900 font-medium">Expediente / File:</span>
                <span className="font-bold font-mono text-sky-950">
                  {selectedResForNave.reservationCode || selectedResForNave.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sky-900 font-medium">Pasajero Titular:</span>
                <span className="font-bold text-sky-950">{selectedResForNave.nombrePasajero}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-sky-200/80">
                <span className="text-sky-900 font-bold">Importe a Cobrar:</span>
                <span className="font-black text-sky-900 text-base">
                  ${naveAmount.toLocaleString()} {selectedResForNave.financials?.currency || 'ARS'}
                </span>
              </div>
            </div>

            {naveLoading ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="h-8 w-8 text-sky-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600">
                  Generando preferencia de pago en Mercado Pago...
                </p>
              </div>
            ) : naveCheckoutUrl ? (
              <div className="space-y-4">
                {/* QR Display */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
                  <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-200 inline-block mb-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(naveCheckoutUrl)}`}
                      alt="Código QR Mercado Pago"
                      className="w-40 h-40 object-contain mx-auto rounded-lg"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Escaneá para abrir el Checkout Oficial de Mercado Pago
                  </span>
                </div>

                {/* Link de Pago */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Enlace Oficial de Mercado Pago:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={naveCheckoutUrl}
                      className="flex-1 p-2 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(naveCheckoutUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2500);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      {copiedLink ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`https://wa.me/${selectedResForNave.telefonoPasajero?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `¡Hola ${selectedResForNave.nombrePasajero}! Te compartimos el enlace oficial de pago de tu viaje (${selectedResForNave.tourTitle}) a través de Mercado Pago:\n\n${naveCheckoutUrl}\n\nPodés abonar con tarjetas de crédito/débito o dinero en cuenta. ¡Muchas gracias!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Smartphone className="h-4 w-4" />
                    Enviar por WhatsApp
                  </a>
                  <a
                    href={naveCheckoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-[#009EE3] hover:bg-[#0087c4] text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir Mercado Pago
                  </a>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[10px] text-blue-900 font-medium">
                  <strong>⚡ Conciliación en Tiempo Real:</strong> Cuando el pasajero complete la operación, el Webhook oficial de Mercado Pago actualizará el estado de la reserva y el saldo en este ERP automáticamente.
                </div>
              </div>
            ) : null}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedResForNave(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR COBRO MANUAL AL PASAJERO */}
      {selectedResForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Registrar Cobro de Saldo al Pasajero
              </h3>
              <button
                type="button"
                onClick={() => setSelectedResForPayment(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Expediente:</span>
                <span className="font-bold font-mono text-slate-800">{selectedResForPayment.reservationCode || selectedResForPayment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pasajero:</span>
                <span className="font-bold text-slate-800">{selectedResForPayment.nombrePasajero}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Saldo Pendiente:</span>
                <span className="font-black text-amber-600">
                  ${selectedResForPayment.financials?.balanceDue.toLocaleString()} {selectedResForPayment.financials?.currency}
                </span>
              </div>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Monto a Cobrar ({selectedResForPayment.financials?.currency})</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedResForPayment.financials?.balanceDue}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-emerald-700 text-base"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Medio de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold"
                >
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  <option value="Efectivo en Sucursal">Efectivo en Sucursal</option>
                  <option value="Tarjeta de Débito / Crédito">Tarjeta de Débito / Crédito</option>
                  <option value="Dólares Billete">Dólares Billete</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Concepto / Comprobante</label>
                <input
                  type="text"
                  value={paymentConcept}
                  onChange={e => setPaymentConcept(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedResForPayment(null)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-sm"
                >
                  {processingPayment ? 'Guardando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR PAGO A OPERADOR / PROVEEDOR (PAYABLES) */}
      {selectedDeadlineForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                Registrar Pago / Liquidación a Operador
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDeadlineForPay(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50 p-3.5 rounded-2xl text-xs space-y-1 border border-purple-100">
              <div className="flex justify-between">
                <span className="text-purple-700">Operador:</span>
                <span className="font-bold text-purple-950">{selectedDeadlineForPay.providerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Localizador / PNR:</span>
                <span className="font-mono font-bold text-purple-950">{selectedDeadlineForPay.bookingLocator}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Pasajero / Expediente:</span>
                <span className="font-bold text-purple-950">{selectedDeadlineForPay.passengerName} ({selectedDeadlineForPay.reservationCode})</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-purple-200">
                <span className="text-purple-700">Importe Liquidado:</span>
                <span className="font-black text-purple-950">${selectedDeadlineForPay.amountToPay} {selectedDeadlineForPay.currency}</span>
              </div>
            </div>

            <form onSubmit={handleRegisterOperatorPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Monto Transferido al Operador ({selectedDeadlineForPay.currency})</label>
                <input
                  type="number"
                  required
                  value={operatorPaymentAmount}
                  onChange={e => setOperatorPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-purple-700 text-base"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Medio de Pago</label>
                <select
                  value={operatorPaymentMethod}
                  onChange={e => setOperatorPaymentMethod(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold"
                >
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  <option value="Tarjeta Corporativa">Tarjeta Corporativa</option>
                  <option value="Dólares Billete">Dólares Billete</option>
                  <option value="Cuenta Corriente Operador">Cuenta Corriente Operador</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">N° de Operación / Comprobante / OP</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Transf. 992014 Banco Galicia"
                  value={operatorReceiptRef}
                  onChange={e => setOperatorReceiptRef(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDeadlineForPay(null)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingOperatorPayment}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-sm"
                >
                  {savingOperatorPayment ? 'Guardando...' : 'Confirmar Liquidación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VER VOUCHER & MANIFIESTO */}
      {selectedResForVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-full bg-tech-blue/10 px-3 py-0.5 text-xs font-bold text-tech-blue uppercase tracking-wider">
                  Voucher Oficial de Servicio
                </span>
                <h3 className="text-xl font-black text-slate-800 mt-1">{selectedResForVoucher.tourTitle}</h3>
                <p className="text-xs text-slate-400 font-mono">Expediente: {selectedResForVoucher.reservationCode || selectedResForVoucher.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResForVoucher(null)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Titular de la Reserva</span>
                <div className="font-extrabold text-slate-800 text-sm">{selectedResForVoucher.nombrePasajero}</div>
                <div className="text-slate-500">Email: {selectedResForVoucher.emailPasajero || 'No informado'}</div>
                <div className="text-slate-500">Teléfono: {selectedResForVoucher.telefonoPasajero || 'No informado'}</div>
                <div className="text-slate-500">Sucursal: {selectedResForVoucher.branchName}</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Estado Financiero</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Contratado:</span>
                  <span className="font-bold">${selectedResForVoucher.financials?.totalPrice.toLocaleString()} {selectedResForVoucher.financials?.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Abonado:</span>
                  <span className="font-black text-emerald-600">${selectedResForVoucher.financials?.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Saldo Pendiente:</span>
                  <span className="font-black text-amber-700">${selectedResForVoucher.financials?.balanceDue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Manifiesto de Pasajeros */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-600" />
                Manifiesto de Pasajeros ({selectedResForVoucher.passengersList?.length || selectedResForVoucher.cantidadPersonas} Pax)
              </h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Nombre y Apellido</th>
                      <th className="p-3">DNI / Pasaporte</th>
                      <th className="p-3">Observaciones / Dieta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedResForVoucher.passengersList && selectedResForVoucher.passengersList.length > 0) ? (
                      selectedResForVoucher.passengersList.map((pax, idx) => (
                        <tr key={idx}>
                          <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-800">{pax.fullName || selectedResForVoucher.nombrePasajero}</td>
                          <td className="p-3 text-slate-600">{pax.dni || selectedResForVoucher.dniPasajero || '-'}</td>
                          <td className="p-3 text-slate-600">{pax.dietaryRestrictions || 'Estándar'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-slate-400 font-bold">1</td>
                        <td className="p-3 font-bold text-slate-800">{selectedResForVoucher.nombrePasajero} (Titular)</td>
                        <td className="p-3 text-slate-600">{selectedResForVoucher.dniPasajero || '-'}</td>
                        <td className="p-3 text-slate-600">Estándar</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QR Check-in preview */}
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
              <div className="text-xs text-emerald-900">
                <span className="font-bold block">Check-in Digital &amp; Acceso a la App:</span>
                El pasajero puede escanear su código en la aplicación móvil para acceder al chat y vouchers.
              </div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=trip_checkin:${selectedResForVoucher.id}`}
                alt="QR Checkin"
                className="h-16 w-16 rounded-lg bg-white p-1 border border-emerald-200"
              />
            </div>

            {/* Botón Imprimir / Cerrar */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Imprimir Voucher
              </button>
              <button
                type="button"
                onClick={() => setSelectedResForVoucher(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PRORROGAR PLAZO TIME-TO-PAY */}
      {selectedResForExtend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Prorrogar Plazo de Pago (Time-to-Pay)
              </h3>
              <button
                type="button"
                onClick={() => setSelectedResForExtend(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-2xl text-xs space-y-1 border border-amber-200">
              <div className="flex justify-between">
                <span className="text-amber-800 font-medium">Expediente:</span>
                <span className="font-bold font-mono text-amber-900">{selectedResForExtend.reservationCode || selectedResForExtend.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-medium">Titular:</span>
                <span className="font-bold text-amber-900">{selectedResForExtend.nombrePasajero}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-amber-200">
                <span className="text-amber-800 font-medium">Vencimiento Actual:</span>
                <span className="font-black text-amber-900">
                  {selectedResForExtend.expiresAt ? new Date(selectedResForExtend.expiresAt).toLocaleString() : 'Sin plazo fijado'}
                </span>
              </div>
            </div>

            <form onSubmit={handleExtendTTL} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">
                  Seleccioná las horas a prorrogar:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[12, 24, 48].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtendedHours(h)}
                      className={`p-2.5 rounded-xl border font-bold transition text-center ${
                        extendedHours === h
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      +{h} Horas
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">O especificá horas personalizadas:</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={extendedHours}
                  onChange={e => setExtendedHours(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-slate-200 font-black text-slate-800"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedResForExtend(null)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={extending}
                  className="flex-1 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition shadow-sm"
                >
                  {extending ? 'Guardando...' : 'Aplicar Prórroga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
