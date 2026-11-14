'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, User, Car, FileText, Wallet,
  CheckCircle, XCircle, Clock, AlertCircle,
  Phone, Mail, MapPin, CreditCard, Shield, Star
} from 'lucide-react';
import { DriverPartner, PartnerStatus } from '@/types/partners';
import { doc, onSnapshot } from 'firebase/firestore';
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

// ── Helpers ───────────────────────────────────────────────────
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

// ── Info Row ──────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
    <span className="text-xs text-slate-400 font-medium">{label}</span>
    <span className="text-xs font-semibold text-slate-700 text-right max-w-[60%]">{value || '—'}</span>
  </div>
);

// ── Doc Item ──────────────────────────────────────────────────
const DocItem = ({ label, url }: { label: string; url?: string }) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="flex items-center gap-2.5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${url ? 'bg-emerald-50' : 'bg-slate-100'}`}>
        <FileText className={`h-4 w-4 ${url ? 'text-emerald-600' : 'text-slate-400'}`} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
    {url ? (
      <a href={url} target="_blank" rel="noreferrer"
        className="text-xs font-semibold text-tech-blue hover:underline">Ver PDF</a>
    ) : (
      <span className="text-xs text-amber-600 font-semibold">Pendiente</span>
    )}
  </div>
);

// ── Tabs ──────────────────────────────────────────────────────
const TABS = [
  { id: 'personal', label: 'Datos Personales', icon: User },
  { id: 'vehicle', label: 'Vehículo', icon: Car },
  { id: 'docs', label: 'Documentación', icon: FileText },
  { id: 'wallet', label: 'Billetera', icon: Wallet },
];

// ── Main Component ────────────────────────────────────────────
export default function PartnerProfilePage({ params }: { params: Promise<{ partnerId: string }> }) {
  const unwrappedParams = use(params);
  const partnerId = unwrappedParams.partnerId;

  const [activeTab, setActiveTab] = useState('personal');
  const [partner, setPartner] = useState<DriverPartner>(MOCK_PARTNER);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'drivers', partnerId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const fullName = data.name || data.displayName || 'Conductor';
        const parts = fullName.split(' ');
        const fName = data.firstName || parts[0] || 'Conductor';
        const lName = data.lastName || parts.slice(1).join(' ') || '';
        const statusVal = data.status || (data.isOnline ? 'Activo' : 'En Revisión');

        setPartner({
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
        } as DriverPartner);
      } else {
        // Si no está en drivers, también escuchar partners/{partnerId}
      }
    }, (error) => {
      console.error("Error loading partner detail:", error);
    });
    return () => unsub();
  }, [partnerId]);

  const statusCfg = statusConfig[partner.status] ?? { color: 'bg-slate-100 text-slate-700', icon: <AlertCircle className="h-4 w-4" /> };

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6">

      {/* Back */}
      <Link href="/hr" className="flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-tech-blue transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a RRHH
      </Link>

      {/* Profile Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
              <h1 className="text-2xl font-bold text-tech-blue">{partner.firstName} {partner.lastName}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.color}`}>
                {statusCfg.icon} {partner.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400 font-mono">{partner.id}</p>

            <div className="mt-3 flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5 text-sm text-slate-600"><Phone className="h-3.5 w-3.5 text-slate-400" />{partner.phone}</span>
              <span className="flex items-center gap-1.5 text-sm text-slate-600"><Mail className="h-3.5 w-3.5 text-slate-400" />{partner.email}</span>
              {partner.address && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {partner.address.city}, {partner.address.province}
                </span>
              )}
            </div>
          </div>

          {/* Quick wallet */}
          <div className="flex gap-3 sm:flex-col sm:items-end">
            <div className="rounded-xl bg-tech-blue/5 border border-tech-blue/10 px-4 py-3 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Saldo</p>
              <p className="text-lg font-bold text-tech-blue">
                ${partner.wallet.cashBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Puntos</p>
              <p className="text-lg font-bold text-slate-700">{partner.wallet.pointsBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all
                ${active ? 'bg-tech-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        {/* Personal */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Datos Personales</h3>
              <InfoRow label="Nombre completo" value={`${partner.firstName} ${partner.lastName}`} />
              <InfoRow label="Fecha de nacimiento" value={partner.dob} />
              <InfoRow label="Teléfono" value={partner.phone} />
              <InfoRow label="Email" value={partner.email} />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Domicilio</h3>
              <InfoRow label="Calle" value={`${partner.address.street} ${partner.address.number}${partner.address.floor ? `, ${partner.address.floor}° ${partner.address.apartment}` : ''}`} />
              <InfoRow label="Localidad" value={partner.address.city} />
              <InfoRow label="Provincia" value={partner.address.province} />
              <InfoRow label="Código Postal" value={partner.address.postalCode} />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Fiscal</h3>
              <InfoRow label="Tipo ID" value={partner.taxInfo.taxIdType} />
              <InfoRow label="Número" value={partner.taxInfo.taxIdNumber} />
              {partner.taxInfo.registrationType && <InfoRow label="Condición ARCA" value={partner.taxInfo.registrationType} />}
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Bancario</h3>
              <InfoRow label="Titular" value={partner.bankInfo.accountHolder} />
              <InfoRow label="CBU/CVU" value={partner.bankInfo.cbuCvu || 'Sin CBU'} />
              <InfoRow label="Alias" value={partner.bankInfo.alias || 'Sin Alias'} />
            </div>

            {/* ── Supervisor de Flota Asignado (Reclutador) ── */}
            <div className="col-span-1 sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    Supervisor de Flota Asignado (Reclutador)
                  </h3>
                  <p className="text-xs text-amber-700/80 mt-0.5">
                    Empleado responsable de la supervisión y reclutamiento de este socio-conductor.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={partner.fleetSupervisorId || 'SUP-001'}
                    onChange={(e) => {
                      const supId = e.target.value;
                      const supNames: Record<string, string> = {
                        'SUP-001': 'Fernando Gómez',
                        'SUP-002': 'Lucía Fernández',
                        'SUP-003': 'Martín Páez',
                        'none': ''
                      };
                      setPartner({
                        ...partner,
                        fleetSupervisorId: supId === 'none' ? undefined : supId,
                        fleetSupervisorName: supNames[supId] || undefined,
                      });
                    }}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm cursor-pointer"
                  >
                    <option value="SUP-001">Fernando Gómez (FERNANDO-CAB)</option>
                    <option value="SUP-002">Lucía Fernández (LUCIA-CAB)</option>
                    <option value="SUP-003">Martín Páez (MARTIN-CAB)</option>
                    <option value="none">⚪ Sin Supervisor (Registro Directo)</option>
                  </select>

                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-black text-white shadow-sm">
                    {partner.fleetSupervisorName || 'Fernando Gómez'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle */}
        {activeTab === 'vehicle' && partner.vehicle && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><Car className="h-3.5 w-3.5" /> Datos del Vehículo</h3>
              <InfoRow label="Marca" value={partner.vehicle.make} />
              <InfoRow label="Modelo" value={partner.vehicle.model} />
              <InfoRow label="Año" value={String(partner.vehicle.year)} />
              <InfoRow label="Color" value={partner.vehicle.color} />
              <InfoRow label="Patente" value={partner.vehicle.licensePlate} />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Habilitación SUTRAPPA</h3>
              <InfoRow label="Estado" value={partner.vehicle.sutrappa.isActive ? 'Habilitado' : 'No aplica'} />
              {partner.vehicle.sutrappa.isActive && (
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
            <DocItem label="Cédula Vehículo — Frente" url={partner.vehicle?.cedularFrontUrl} />
            <DocItem label="Cédula Vehículo — Dorso" url={partner.vehicle?.cedularBackUrl} />
            <DocItem label="Seguro Comercial" url={partner.vehicle?.insurancePdfUrl} />
            <DocItem label="RTO" url={partner.vehicle?.rtoUrl} />
          </div>
        )}

        {/* Wallet */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {/* Balances */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #0a2a5b 0%, #1a4a8b 100%)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Saldo Disponible</p>
                <p className="mt-1 text-3xl font-bold text-white">
                  ${partner.wallet.cashBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-0.5 text-xs text-blue-300">ARS</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Puntos Acumulados</p>
                <p className="mt-1 text-3xl font-bold text-tech-blue">{partner.wallet.pointsBalance.toLocaleString()}</p>
                <p className="mt-0.5 text-xs text-slate-400">TravelPoints</p>
              </div>
            </div>

            {/* Transaction history */}
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Últimas Transacciones</h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {partner.wallet.transactions.map(tx => {
                  const cfg = txTypeConfig[tx.type];
                  return (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{tx.description}</p>
                        <p className="text-xs text-slate-400">{formatDate(tx.date)} · <span className="font-medium">{cfg.label}</span></p>
                      </div>
                      <p className={`text-sm font-bold ${cfg.color}`}>
                        {cfg.sign}${Math.abs(tx.amount).toLocaleString('es-AR')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
