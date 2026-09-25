'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, User, Car, FileText, Wallet,
  CheckCircle, XCircle, Clock, AlertCircle,
  Phone, Mail, MapPin, CreditCard, Shield, Star,
  Building2, Tag, ShieldCheck, DollarSign, QrCode, Printer, Download
} from 'lucide-react';
import { DriverPartner, PartnerStatus } from '@/types/partners';
import { Branch, VehicleCategory } from '@/types/logistics';
import { doc, onSnapshot, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Mock Partner Data ─────────────────────────────────────────
const MOCK_PARTNER: DriverPartner = {
  id: 'DRV-001',
  createdAt: Date.now() - 86400000 * 30,
  updatedAt: Date.now(),
  firstName: 'Carlos',
  lastName: 'Mamani',
  dob: '1988-04-12',
  email: 'carlos.mamani@gmail.com',
  phone: '+54 381 456-7890',
  photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
  address: {
    street: 'Av. Belgrano', number: '1250', floor: '3', apartment: 'B',
    city: 'San Miguel de Tucumán', province: 'Tucumán', postalCode: '4000',
  },
  taxInfo: { taxIdType: 'CUIL', taxIdNumber: '20-88441230-5' },
  bankInfo: { cbuCvu: '0000003100012345678901', alias: 'carlos.mamani.mp', accountHolder: 'Carlos Mamani' },
  vehicle: {
    id: 'VH-001',
    make: 'Volkswagen', model: 'Gol Trend', year: 2020,
    color: 'Blanco', licensePlate: 'AB 123 CD',
    sutrappa: { isActive: true, licenseNumber: 'REM-004512', holder: 'Carlos Mamani' },
  },
  driverLicenseUrl: '/docs/lic-001.pdf',
  criminalRecordUrl: '/docs/reincidencia-001.pdf',
  conductCertificateUrl: '/docs/conducta-001.pdf',
  healthCertificateUrl: '/docs/sanidad-001.pdf',
  status: 'Activo',
  branchIds: ['all'],
  allowedCategories: ['estandar', 'taxi'],
  allowedServiceModes: ['mu'],
  planType: 'commission',
  maxNegativeBalance: -10000,
  wallet: {
    cashBalance: 12450.75,
    pointsBalance: 3200,
    transactions: [
      { id: 'T1', date: Date.now() - 86400000 * 1, type: 'credit', amount: 2800, description: 'Liquidación semanal — 14 viajes' },
      { id: 'T2', date: Date.now() - 86400000 * 3, type: 'bonus', amount: 500, description: 'Bono rendimiento — 5 estrellas' },
      { id: 'T3', date: Date.now() - 86400000 * 7, type: 'withdrawal', amount: -5000, description: 'Retiro a CBU' },
      { id: 'T4', date: Date.now() - 86400000 * 10, type: 'credit', amount: 3200, description: 'Liquidación semanal — 18 viajes' },
      { id: 'T5', date: Date.now() - 86400000 * 14, type: 'credit', amount: 2950, description: 'Liquidación semanal — 16 viajes' },
    ],
  },
};

const statusConfig: Record<PartnerStatus, { color: string; icon: React.ReactNode }> = {
  'Activo': { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-4 w-4" /> },
  'Pendiente Documentación': { color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-4 w-4" /> },
  'Suspendido': { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
  'En Revisión': { color: 'bg-blue-100 text-blue-700', icon: <AlertCircle className="h-4 w-4" /> },
};

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

const txTypeConfig = {
  credit: { label: 'Ingreso', color: 'text-emerald-600', sign: '+' },
  debit: { label: 'Débito', color: 'text-red-600', sign: '-' },
  withdrawal: { label: 'Retiro', color: 'text-slate-600', sign: '-' },
  bonus: { label: 'Bono', color: 'text-blue-600', sign: '+' },
};

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
    <span className="text-xs text-slate-400 font-medium">{label}</span>
    <span className="text-xs font-semibold text-slate-700 text-right max-w-[60%]">{value || '—'}</span>
  </div>
);

const DocItem = ({ label, url }: { label: string; url?: string }) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="flex items-center gap-2.5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${url ? 'bg-emerald-50' : 'bg-slate-100'}`}>
        <FileText className={`h-4 w-4 ${url ? 'text-emerald-600' : 'text-slate-400'}`} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
    {url ? (
      <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-tech-blue hover:underline">Ver PDF</a>
    ) : (
      <span className="text-xs text-amber-600 font-semibold">Pendiente</span>
    )}
  </div>
);

const TABS = [
  { id: 'logistics', label: 'Sucursales & Tarifas', icon: Building2 },
  { id: 'personal', label: 'Datos Personales', icon: User },
  { id: 'vehicle', label: 'Vehículo', icon: Car },
  { id: 'docs', label: 'Documentación', icon: FileText },
  { id: 'wallet', label: 'Billetera', icon: Wallet },
];

export default function TravelCabPartnerProfilePage({ params }: { params: Promise<{ partnerId: string }> }) {
  const unwrappedParams = use(params);
  const partnerId = unwrappedParams.partnerId;

  const [activeTab, setActiveTab] = useState('logistics');
  const [partner, setPartner] = useState<DriverPartner>(MOCK_PARTNER);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showQrPrintModal, setShowQrPrintModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    branchIds: ['all'] as string[],
    allowedCategories: ['estandar'] as string[],
    allowedServiceModes: ['mu'] as string[],
    planType: 'commission' as 'commission' | 'membership',
    maxNegativeBalance: '-10000',
    status: 'Activo' as PartnerStatus
  });

  useEffect(() => {
    // 1. Escuchar Conductor
    const unsub = onSnapshot(doc(db, 'drivers', partnerId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const fullName = data.name || data.displayName || 'Conductor';
        const parts = fullName.split(' ');
        const fName = data.firstName || parts[0] || 'Conductor';
        const lName = data.lastName || parts.slice(1).join(' ') || '';
        const statusVal = data.status || (data.isOnline ? 'Activo' : 'En Revisión');

        const loadedPartner: DriverPartner = {
          id: snap.id,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
          updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
          firstName: fName,
          lastName: lName,
          dob: data.dob || '1990-01-01',
          email: data.email || 'correo@travelapp.ar',
          phone: data.phone || '+54 381 000-0000',
          address: data.address || { street: 'Sin Domicilio', number: '', city: '', province: 'Tucumán', postalCode: '' },
          taxInfo: data.taxInfo || { taxIdType: 'CUIL', taxIdNumber: data.taxIdNumber || '' },
          bankInfo: data.bankInfo || { cbuCvu: data.cbuCvu || '', alias: data.alias || '', accountHolder: fullName },
          branchIds: data.branchIds || (data.branchId ? [data.branchId] : ['all']),
          allowedCategories: data.allowedCategories || (data.category ? [data.category] : ['estandar']),
          allowedServiceModes: data.allowedServiceModes || ['mu'],
          planType: data.planType || 'commission',
          maxNegativeBalance: data.maxNegativeBalance !== undefined ? Number(data.maxNegativeBalance) : -10000,
          vehicle: data.activeVehicle ? {
            id: data.activeVehicle.id || 'VH-active',
            make: data.activeVehicle.brand?.split(' ')[0] || 'Vehículo',
            model: data.activeVehicle.brand?.split(' ').slice(1).join(' ') || '',
            year: Number(data.activeVehicle.year) || 2020,
            color: data.activeVehicle.color || '',
            licensePlate: data.activeVehicle.plate || '',
            sutrappa: data.activeVehicle.sutrappa || { isActive: false }
          } : {
            id: 'VH-none',
            make: 'Sin Vehículo',
            model: '',
            year: 2020,
            color: '',
            licensePlate: '',
            sutrappa: { isActive: false }
          },
          status: statusVal,
          wallet: data.wallet || {
            cashBalance: data.walletBalance || 0,
            pointsBalance: data.rewardsPoints || 0,
            transactions: []
          }
        };

        setPartner(loadedPartner);
        setAssignForm({
          branchIds: loadedPartner.branchIds || ['all'],
          allowedCategories: loadedPartner.allowedCategories || ['estandar'],
          allowedServiceModes: loadedPartner.allowedServiceModes || ['mu'],
          planType: loadedPartner.planType || 'commission',
          maxNegativeBalance: String(loadedPartner.maxNegativeBalance !== undefined ? loadedPartner.maxNegativeBalance : -10000),
          status: loadedPartner.status
        });
      } else {
        if (partnerId === 'DRV-001' || partnerId === 'carlos-mamani') {
          setPartner(MOCK_PARTNER);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading partner detail:", error);
      setLoading(false);
    });

    // 2. Escuchar Sucursales
    const unsubBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
      setBranches(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Branch));
    });

    // 3. Escuchar Categorías
    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as VehicleCategory));
    });

    return () => {
      unsub();
      unsubBranches();
      unsubCats();
    };
  }, [partnerId]);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await updateDoc(doc(db, 'drivers', partnerId), { 
        status: newStatus,
        updatedAt: Date.now()
      });
    } catch (err: any) {
      console.error("Error updating status inside profile:", err);
      alert("Error al actualizar estado: " + err.message);
    }
  };

  const handleSaveAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'drivers', partnerId), {
        branchIds: assignForm.branchIds,
        allowedCategories: assignForm.allowedCategories,
        allowedServiceModes: assignForm.allowedServiceModes,
        planType: assignForm.planType,
        maxNegativeBalance: Number(assignForm.maxNegativeBalance) || -10000,
        status: assignForm.status,
        updatedAt: Date.now()
      });
      alert("¡Asignaciones del conductor actualizadas correctamente!");
      setShowAssignModal(false);
    } catch (err: any) {
      console.error("Error saving assignments:", err);
      alert("Error al guardar asignación: " + err.message);
    }
  };

  const getBranchNames = (bIds?: string[]) => {
    if (!bIds || bIds.length === 0 || bIds.includes('all')) return ['🌐 Todas las Sucursales'];
    return bIds.map(id => {
      const found = branches.find(b => b.id === id);
      return found ? `📍 ${found.name}` : `📍 Sucursal #${id}`;
    });
  };

  const getCategoryNames = (catIds?: string[]) => {
    if (!catIds || catIds.length === 0) return ['🚗 Estándar'];
    return catIds.map(id => {
      const found = categories.find(c => c.id === id);
      return found ? found.name : id.toUpperCase();
    });
  };

  const statusCfg = statusConfig[partner.status] ?? { color: 'bg-slate-100 text-slate-700', icon: <AlertCircle className="h-4 w-4" /> };

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6 overflow-y-auto">

      {/* Back */}
      <Link href="/travelcab/drivers" className="flex w-fit items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-tech-blue transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a Conductores
      </Link>

      {/* Profile Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar */}
          <div className="h-20 w-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md">
            {partner.photoUrl
              ? <img src={partner.photoUrl} alt={partner.firstName} className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center bg-slate-100 text-2xl font-bold text-slate-400">
                  {partner.firstName[0]}{partner.lastName[0]}
                </div>
            }
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-tech-blue">{partner.firstName} {partner.lastName}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${statusCfg.color}`}>
                {statusCfg.icon} {partner.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 font-mono">ID: {partner.id}</p>

            <div className="mt-3 flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><Phone className="h-3.5 w-3.5 text-slate-400" />{partner.phone}</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><Mail className="h-3.5 w-3.5 text-slate-400" />{partner.email}</span>
              {partner.address && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {partner.address.city}, {partner.address.province}
                </span>
              )}
            </div>

            {/* Quick Actions (Habilitar / Deshabilitar / Imprimir QR) */}
            <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowQrPrintModal(true)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-black hover:bg-sky-100 shadow-xs transition-all gap-1.5"
              >
                <QrCode className="h-4 w-4 text-sky-600" />
                Imprimir QR de Ventanilla
              </button>

              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-vial-orange text-gray-950 text-xs font-black hover:bg-[#ff7b1a] shadow-xs transition-all gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                {partner.status === 'Activo' ? 'Configurar Sucursales y Tarifas' : 'Habilitar y Asignar Tarifas'}
              </button>

              {partner.status === 'Activo' ? (
                <button
                  onClick={() => handleUpdateStatus('Suspendido')}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-all"
                >
                  Suspender Conductor
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateStatus('Activo')}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all"
                >
                  Activar Conductor
                </button>
              )}
            </div>
          </div>

          {/* Quick wallet */}
          <div className="flex gap-3 sm:flex-col sm:items-end">
            <div className="rounded-2xl bg-tech-blue/5 border border-tech-blue/10 px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Saldo en Billetera</p>
              <p className="text-lg font-black text-tech-blue">
                ${partner.wallet?.cashBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Puntos Rewards</p>
              <p className="text-lg font-black text-slate-700">{partner.wallet?.pointsBalance.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-xs w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all cursor-pointer
                ${active ? 'bg-tech-blue text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">

        {/* LOGISTICS & TARIFFS TAB */}
        {activeTab === 'logistics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-tech-blue uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-vial-orange" />
                  Asignación Logística y Habilitación
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Sucursales donde opera el chofer, categorías de vehículos autorizadas y esquema de liquidación.</p>
              </div>
              <button
                onClick={() => setShowAssignModal(true)}
                className="rounded-xl bg-vial-orange text-gray-950 px-4 py-2 text-xs font-black hover:bg-[#ff7b1a] transition-all shadow-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                Modificar Asignación
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sucursales Asignadas */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-tech-blue">🏢 Sucursal(es) Habilitadas</h4>
                <div className="flex flex-wrap gap-1.5">
                  {getBranchNames(partner.branchIds).map((b, i) => (
                    <span key={i} className="text-xs font-bold bg-white text-tech-blue border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Categorías de Servicio */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-tech-blue">🏷️ Categorías de Servicio Autorizadas</h4>
                <div className="flex flex-wrap gap-1.5">
                  {getCategoryNames(partner.allowedCategories).map((c, i) => (
                    <span key={i} className="text-xs font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl shadow-2xs">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Modalidades de Transporte */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-tech-blue">🚗 Modalidades de Transporte</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(partner.allowedServiceModes || ['mu']).map((m, i) => (
                    <span key={i} className="text-xs font-bold bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl">
                      {m === 'mu' ? '🏙️ Urbana (MU)' : m === 'arc' ? '🚌 Rural Troncal (ARC)' : '✈️ Traslados Fijos'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Esquema Financiero */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-tech-blue">💳 Esquema Financiero</h4>
                <InfoRow label="Plan de Trabajo" value={partner.planType === 'membership' ? 'Membresía Semanal' : 'Comisión por Viaje'} />
                <InfoRow label="Límite Saldo Negativo" value={`$${Math.abs(partner.maxNegativeBalance || 10000).toLocaleString('es-AR')}`} />
              </div>

            </div>
          </div>
        )}

        {/* Personal */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Datos Personales</h3>
              <InfoRow label="Nombre completo" value={`${partner.firstName} ${partner.lastName}`} />
              <InfoRow label="Fecha de nacimiento" value={partner.dob} />
              <InfoRow label="Teléfono" value={partner.phone} />
              <InfoRow label="Email" value={partner.email} />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Domicilio</h3>
              <InfoRow label="Calle" value={`${partner.address?.street || ''} ${partner.address?.number || ''}`} />
              <InfoRow label="Localidad" value={partner.address?.city || ''} />
              <InfoRow label="Provincia" value={partner.address?.province || ''} />
              <InfoRow label="Código Postal" value={partner.address?.postalCode || ''} />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Fiscal</h3>
              <InfoRow label="Tipo ID" value={partner.taxInfo?.taxIdType} />
              <InfoRow label="Número" value={partner.taxInfo?.taxIdNumber} />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Bancario</h3>
              <InfoRow label="CBU/CVU" value={partner.bankInfo?.cbuCvu} />
              <InfoRow label="Alias" value={partner.bankInfo?.alias} />
              <InfoRow label="Titular" value={partner.bankInfo?.accountHolder} />
            </div>
          </div>
        )}

        {/* Vehicle */}
        {activeTab === 'vehicle' && partner.vehicle && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><Car className="h-3.5 w-3.5" /> Datos del Vehículo</h3>
              <InfoRow label="Marca" value={partner.vehicle.make} />
              <InfoRow label="Modelo" value={partner.vehicle.model} />
              <InfoRow label="Año" value={String(partner.vehicle.year)} />
              <InfoRow label="Color" value={partner.vehicle.color} />
              <InfoRow label="Patente" value={partner.vehicle.licensePlate} />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Habilitación SUTRAPPA</h3>
              <InfoRow label="Estado" value={partner.vehicle.sutrappa?.isActive ? 'Habilitado' : 'No aplica'} />
              {partner.vehicle.sutrappa?.isActive && (
                <>
                  <InfoRow label="N° Licencia" value={partner.vehicle.sutrappa.licenseNumber} />
                  <InfoRow label="Titular" value={partner.vehicle.sutrappa.holder} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Docs */}
        {activeTab === 'docs' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DocItem label="Licencia de Conducir" url={partner.driverLicenseUrl} />
            <DocItem label="Certificado de Reincidencia" url={partner.criminalRecordUrl} />
            <DocItem label="Buena Conducta" url={partner.conductCertificateUrl} />
            <DocItem label="Certificado de Sanidad" url={partner.healthCertificateUrl} />
          </div>
        )}

        {/* Wallet */}
        {activeTab === 'wallet' && partner.wallet && (
          <div className="space-y-6">
            {/* Balances */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl p-5 text-center bg-tech-blue shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Saldo Disponible</p>
                <p className="mt-1 text-3xl font-black text-white">
                  ${partner.wallet.cashBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-0.5 text-xs text-blue-300">ARS</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Puntos Acumulados</p>
                <p className="mt-1 text-3xl font-black text-tech-blue">{partner.wallet.pointsBalance.toLocaleString()}</p>
                <p className="mt-0.5 text-xs text-slate-400">TravelPoints</p>
              </div>
            </div>

            {/* Transaction history */}
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Últimas Transacciones</h3>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                {partner.wallet.transactions?.map(tx => {
                  const cfg = txTypeConfig[tx.type as keyof typeof txTypeConfig] || { label: 'Movimiento', color: 'text-slate-600', sign: '' };
                  return (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{tx.description}</p>
                        <p className="text-xs text-slate-400">{formatDate(tx.date)} · <span className="font-bold">{cfg.label}</span></p>
                      </div>
                      <p className={`text-sm font-black ${cfg.color}`}>
                        {cfg.sign}${Math.abs(tx.amount).toLocaleString('es-AR')}
                      </p>
                    </div>
                  );
                }) || (
                  <div className="p-4 text-center text-slate-400">Sin transacciones registradas.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Asignación Logística */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-tech-blue text-white p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-vial-orange bg-white/10 px-2.5 py-0.5 rounded-full">
                  Asignación Logística
                </span>
                <h2 className="text-xl font-black mt-1">{partner.firstName} {partner.lastName}</h2>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-white/60 hover:text-white text-xl font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssignments} className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Sucursales */}
              <div>
                <label className="block text-xs font-black uppercase text-tech-blue mb-2">1. Sucursales de Operación</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => setAssignForm(p => ({ ...p, branchIds: ['all'] }))}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer ${
                      assignForm.branchIds.includes('all') ? 'border-vial-orange bg-vial-orange/10 font-bold' : 'border-slate-200'
                    }`}
                  >
                    <input type="checkbox" checked={assignForm.branchIds.includes('all')} onChange={() => {}} />
                    <span>🌐 Todas las Sucursales</span>
                  </label>
                  {branches.map(b => {
                    const isChecked = !assignForm.branchIds.includes('all') && assignForm.branchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        onClick={() => {
                          let next = assignForm.branchIds.filter(id => id !== 'all');
                          if (next.includes(b.id)) next = next.filter(id => id !== b.id);
                          else next.push(b.id);
                          setAssignForm(p => ({ ...p, branchIds: next.length === 0 ? ['all'] : next }));
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer ${
                          isChecked ? 'border-vial-orange bg-vial-orange/10 font-bold' : 'border-slate-200'
                        }`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => {}} />
                        <span>📍 {b.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Categorías */}
              <div>
                <label className="block text-xs font-black uppercase text-tech-blue mb-2">2. Categorías Autorizadas</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(c => {
                    const isChecked = assignForm.allowedCategories.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        onClick={() => {
                          const next = isChecked
                            ? assignForm.allowedCategories.filter(id => id !== c.id)
                            : [...assignForm.allowedCategories, c.id];
                          setAssignForm(p => ({ ...p, allowedCategories: next }));
                        }}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex flex-col ${
                          isChecked ? 'border-indigo-600 bg-indigo-50/50 font-bold text-indigo-950' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{c.name}</span>
                          <input type="checkbox" checked={isChecked} onChange={() => {}} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Esquema Financiero */}
              <div>
                <label className="block text-xs font-black uppercase text-tech-blue mb-2">3. Esquema Financiero</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignForm(p => ({ ...p, planType: 'commission' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                      assignForm.planType === 'commission' ? 'bg-tech-blue text-white border-tech-blue' : 'border-slate-200'
                    }`}
                  >
                    Comisión por Viaje
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignForm(p => ({ ...p, planType: 'membership' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                      assignForm.planType === 'membership' ? 'bg-tech-blue text-white border-tech-blue' : 'border-slate-200'
                    }`}
                  >
                    Membresía Semanal
                  </button>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-vial-orange px-5 py-2 text-xs font-black text-gray-950 hover:bg-[#ff7b1a]"
                >
                  Guardar Asignaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Cartel Imprimible de Código QR para Ventanilla */}
      {showQrPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 print:p-0 print:bg-white print:static animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
            
            {/* Modal Controls (No se imprimen) */}
            <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-sky-400" />
                <span className="text-sm font-black text-white">Cartel Oficial de Ventanilla para Imprimir</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-vial-orange text-gray-950 text-xs font-black hover:bg-[#ff7b1a] shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Cartel
                </button>
                <button
                  onClick={() => setShowQrPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Poster Imprimible (Diseño Premium para Ventanilla de Taxi/Auto) */}
            <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible bg-slate-100/60 print:bg-white flex justify-center">
              <div className="w-full max-w-md bg-white border-2 border-slate-300 rounded-3xl p-6 shadow-xl print:shadow-none print:border-4 print:border-slate-800 print:rounded-3xl flex flex-col items-center text-center relative overflow-hidden">
                
                {/* Franja Superior de Marca */}
                <div className="w-full bg-[#0B192C] text-white py-3 px-4 rounded-2xl mb-4 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-wider text-white">TRAVEL<span className="text-[#38BDF8]">CAB</span></span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 px-2 py-0.5 rounded-full">
                    OFICIAL
                  </span>
                </div>

                <h2 className="text-base font-black text-[#0B192C] uppercase tracking-wide">
                  Escaneá con tu celular
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5 mb-4">
                  Iniciá viaje directo con taxímetro o vinculá tu destino al instante
                </p>

                {/* Código QR Generado */}
                <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=4&data=${encodeURIComponent(
                      `travelapp:driver:${partner.id}:${(partner.vehicle?.licensePlate || 'TAXI').replace(/\s+/g, '')}`
                    )}`}
                    alt="QR Conductor"
                    className="w-56 h-56 object-contain"
                  />
                </div>

                {/* Badge con Patente y Código de Conductor */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Patente / Código de Conductor</p>
                  <p className="text-2xl font-black text-[#0284C7] tracking-widest font-mono mt-0.5">
                    {partner.vehicle?.licensePlate || partner.id}
                  </p>
                </div>

                {/* Ficha del Conductor y Vehículo */}
                <div className="w-full border-t border-dashed border-slate-200 pt-3 text-left grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Conductor</span>
                    <span className="font-extrabold text-slate-800">{partner.firstName} {partner.lastName}</span>
                  </div>
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehículo</span>
                    <span className="font-extrabold text-slate-800">
                      {partner.vehicle?.make || 'Auto'} {partner.vehicle?.model || ''}
                    </span>
                  </div>
                </div>

                {/* Pasos de Uso */}
                <div className="w-full mt-4 bg-sky-50/60 border border-sky-100 rounded-2xl p-3 text-left">
                  <p className="text-[11px] font-black text-sky-950 uppercase tracking-wider mb-1">
                    ¿Cómo funciona?
                  </p>
                  <ol className="text-[11px] text-sky-800 space-y-0.5 list-decimal list-inside font-medium leading-relaxed">
                    <li>Abrí la app <b>TravelApp</b> en tu celular.</li>
                    <li>Presioná el botón <b>"Escanear QR Chofer"</b>.</li>
                    <li>Apuntá tu cámara a este código para vincularte.</li>
                  </ol>
                </div>

                {/* Pie de cartel */}
                <p className="mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  TravelApp Ecosystem • Movilidad Confiable
                </p>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

