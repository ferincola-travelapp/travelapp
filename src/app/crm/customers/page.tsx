'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  Eye,
  Star,
  Phone,
  Mail,
  Shield,
  Crown,
  UserPlus,
  Car,
  Award,
  MessageSquare,
  Calendar,
  ExternalLink,
  CheckCircle2,
  X,
  GitBranch,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lead } from '@/types/crm';
import { ExperiencePartner, ExperiencePartnerTier } from '@/types/affiliates';
import { DEFAULT_EXPERIENCE_TIERS } from '@/lib/commissions';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAccessRecord,
  isSuperAdmin,
  getUserScopeLabel,
  normalizeBusinessUnit,
  normalizeText,
} from '@/lib/permissions';
import {
  isCompleteTravelerProfile,
  normalizeContactEmail,
  normalizeContactPhone,
} from '@/lib/directory-helpers';

type DirectoryTab = 'leads' | 'usuarios' | 'clientes' | 'conductores' | 'afiliados';

interface TraceRecord {
  kind: 'lead' | 'usuario' | 'cliente';
  id: string;
  name: string;
  email?: string;
  phone?: string;
  businessUnit?: string;
  sector?: string;
  origin?: string;
  status?: string;
  loyaltyPoints?: number;
  raw: Record<string, any>;
}

const TIER_BADGE_COLORS: Record<string, string> = {
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  gold: 'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function TraceabilityModal({
  record,
  allLeads,
  allUsers,
  allDrivers,
  allAffiliates,
  tiers,
  onClose,
}: {
  record: TraceRecord;
  allLeads: Lead[];
  allUsers: any[];
  allDrivers: any[];
  allAffiliates: ExperiencePartner[];
  tiers: ExperiencePartnerTier[];
  onClose: () => void;
}) {
  const normEmail = normalizeContactEmail(record.email);
  const normPhone = normalizeContactPhone(record.phone);

  const matchesContact = (email?: string, phone?: string) => {
    const e = normalizeContactEmail(email);
    const p = normalizeContactPhone(phone);
    if (normEmail && e && normEmail === e) return true;
    if (normPhone && p && normPhone === p) return true;
    return false;
  };

  const matchedLeads = allLeads.filter((l) => l.id === record.id || matchesContact(l.email, l.phone));
  const matchedUser = allUsers.find((u) => u.id === record.id || matchesContact(u.email, u.phone));
  const matchedDriver = allDrivers.find((d) => matchesContact(d.email, d.phone));
  const matchedAffiliate = allAffiliates.find((a) => matchesContact(a.email, a.phone));
  const affiliateTier = matchedAffiliate
    ? tiers.find((t) => t.id === matchedAffiliate.currentTierId) || tiers[0]
    : null;

  const isTravelerComplete = matchedUser ? isCompleteTravelerProfile(matchedUser) : false;

  const steps = [
    {
      label: '1. Lead Inicial',
      done: matchedLeads.length > 0,
      detail:
        matchedLeads.length > 0
          ? `Ingresó por ${matchedLeads[0].origin || 'Canal'} • Estado: ${matchedLeads[0].status}`
          : 'Sin registro previo como Lead',
    },
    {
      label: '2. Usuario App (Onboarding)',
      done: Boolean(matchedUser),
      detail: matchedUser
        ? `Registrado en App (${matchedUser.email || matchedUser.phone || matchedUser.id})`
        : 'Aún no se registró en la App',
    },
    {
      label: '3. Cliente Turismo (Perfil Completo)',
      done: isTravelerComplete,
      detail: isTravelerComplete
        ? 'Perfil de viajero completo (Doc / Domicilio / Emergencia)'
        : 'Pendiente completar perfil de viajero',
    },
    {
      label: '4. Conductor / Afiliado',
      done: Boolean(matchedDriver || matchedAffiliate),
      detail: matchedDriver
        ? `Conductor (${matchedDriver.status || 'Activo'})`
        : matchedAffiliate
        ? `Afiliado • ${affiliateTier?.name || 'Nivel Inicial'}`
        : 'Sin rol de Conductor o Afiliado',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-50 border-b border-slate-200 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-tech-blue" />
              Trazabilidad 360° — {record.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.email || 'Sin email'} • {record.phone || 'Sin teléfono'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Timeline de Trazabilidad */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recorrido en el Ecosistema
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {steps.map((st) => (
                <div
                  key={st.label}
                  className={`rounded-xl border p-3 ${
                    st.done
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 flex-shrink-0 ${
                        st.done ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-800">{st.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 pl-6">{st.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Datos del Perfil */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
            <h4 className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
              Ficha y Datos Registrados
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <p>
                <strong>Unidad:</strong> {record.businessUnit || 'TravelApp'}
              </p>
              <p>
                <strong>Sector:</strong> {record.sector || 'Sin asignar'}
              </p>
              <p>
                <strong>Documento:</strong>{' '}
                {record.raw?.document?.number || record.raw?.documentNumber || 'No cargado'}
              </p>
              <p>
                <strong>Puntos Rewards:</strong>{' '}
                {(record.loyaltyPoints || 0).toLocaleString()}
              </p>
              {record.raw?.address?.city && (
                <p className="col-span-2">
                  <strong>Domicilio:</strong> {record.raw.address.street} {record.raw.address.number},{' '}
                  {record.raw.address.city}
                </p>
              )}
              {record.raw?.emergencyContact?.name && (
                <p className="col-span-2">
                  <strong>Contacto Emergencia:</strong> {record.raw.emergencyContact.name} (
                  {record.raw.emergencyContact.phone})
                </p>
              )}
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <Link
              href="/messages"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Ir a Mensajería
            </Link>
            <Link
              href="/crm/agenda"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-bold text-tech-blue hover:bg-blue-100"
            >
              <Calendar className="h-3.5 w-3.5" /> Agendar Cita
            </Link>
            {record.kind === 'usuario' && (
              <Link
                href="/experiences/customers/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
              >
                <Sparkles className="h-3.5 w-3.5" /> Completar Perfil Turismo
              </Link>
            )}
            {matchedDriver && (
              <Link
                href={`/hr/${matchedDriver.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
              >
                <Car className="h-3.5 w-3.5" /> Ver Ficha Conductor
              </Link>
            )}
            {matchedAffiliate && (
              <Link
                href="/marketing/partners"
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 border border-purple-200 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100"
              >
                <Award className="h-3.5 w-3.5" /> Ver Perfil Afiliado
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DirectoryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as DirectoryTab | null;

  const [activeTab, setActiveTab] = useState<DirectoryTab>(tabParam || 'leads');
  const [search, setSearch] = useState('');
  const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<ExperiencePartner[]>([]);
  const [tiers, setTiers] = useState<ExperiencePartnerTier[]>(DEFAULT_EXPERIENCE_TIERS);

  useEffect(() => {
    if (tabParam && ['leads', 'usuarios', 'clientes', 'conductores', 'afiliados'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const unsubLeads = onSnapshot(collection(db, 'leads'), (snap) => {
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubDrivers = onSnapshot(collection(db, 'partners'), (snap) => {
      setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubAffiliates = onSnapshot(collection(db, 'experience_partners'), (snap) => {
      setAffiliates(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExperiencePartner)));
    });
    const unsubTiers = onSnapshot(collection(db, 'experience_partner_tiers'), (snap) => {
      if (!snap.empty) {
        setTiers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExperiencePartnerTier)));
      }
    });

    return () => {
      unsubLeads();
      unsubUsers();
      unsubDrivers();
      unsubAffiliates();
      unsubTiers();
    };
  }, []);

  // 1. Filtrado por permisos del usuario
  const authorizedLeads = leads.filter((l) => canAccessRecord(user, l.businessUnit, l.sector));
  const authorizedUsers = users.filter((u) =>
    canAccessRecord(user, u.businessUnit || 'TravelApp', u.sector)
  );

  const basicUsers = authorizedUsers.filter((u) => !isCompleteTravelerProfile(u));
  const completeClients = authorizedUsers.filter((u) => isCompleteTravelerProfile(u));

  const canViewDrivers =
    isSuperAdmin(user) ||
    (user?.allowedUnits || []).some((u) => normalizeBusinessUnit(u) === 'TravelCab') ||
    (user?.allowedSectors || []).some((s) => normalizeText(s).includes('recursos humanos'));

  const canViewAffiliates =
    isSuperAdmin(user) ||
    (user?.allowedUnits || []).some((u) => {
      const nu = normalizeBusinessUnit(u);
      return nu === 'TravelApp' || nu === 'TravelApp Experience';
    });

  const authorizedDrivers = canViewDrivers ? drivers : [];
  const authorizedAffiliates = canViewAffiliates ? affiliates : [];

  const q = search.trim().toLowerCase();

  const filteredLeads = authorizedLeads.filter(
    (l) =>
      !q ||
      (l.customerName || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q)
  );

  const filteredBasicUsers = basicUsers.filter(
    (u) =>
      !q ||
      String(u.displayName || u.name || u.customerName || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.phone || '').toLowerCase().includes(q)
  );

  const filteredClients = completeClients.filter(
    (u) =>
      !q ||
      String(u.displayName || u.name || u.customerName || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.phone || '').toLowerCase().includes(q) ||
      String(u.document?.number || u.documentNumber || '').toLowerCase().includes(q)
  );

  const filteredDrivers = authorizedDrivers.filter((d) => {
    if (!q) return true;
    const fullName = `${d.firstName || ''} ${d.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      String(d.email || '').toLowerCase().includes(q) ||
      String(d.vehicle?.licensePlate || '').toLowerCase().includes(q)
    );
  });

  const filteredAffiliates = authorizedAffiliates.filter(
    (a) =>
      !q ||
      (a.name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.refCode || '').toLowerCase().includes(q)
  );

  const tabs: { id: DirectoryTab; label: string; count: number; visible: boolean; icon: React.ReactNode }[] = [
    { id: 'leads', label: 'Leads (Datos Iniciales)', count: authorizedLeads.length, visible: true, icon: <UserPlus className="h-3.5 w-3.5" /> },
    { id: 'usuarios', label: 'Usuarios App (Básico)', count: basicUsers.length, visible: true, icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'clientes', label: 'Clientes Turismo (Completo)', count: completeClients.length, visible: true, icon: <Crown className="h-3.5 w-3.5" /> },
    { id: 'conductores', label: 'Conductores', count: authorizedDrivers.length, visible: canViewDrivers, icon: <Car className="h-3.5 w-3.5" /> },
    { id: 'afiliados', label: 'Afiliados', count: authorizedAffiliates.length, visible: canViewAffiliates, icon: <Award className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#0a2a5b]">
            <GitBranch className="h-6 w-6 text-tech-blue" /> Directorio &amp; Trazabilidad 360°
          </h1>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-tech-blue" />
            {getUserScopeLabel(user)}
          </p>
        </div>
        <Link
          href="/experiences/customers/new"
          className="inline-flex items-center gap-2 bg-[#0a2a5b] hover:bg-[#0a2a5b]/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm w-fit"
        >
          <UserPlus className="h-4 w-4 text-emerald-400" />
          Alta Cliente Turismo
        </Link>
      </div>

      {/* Tabs de los 5 Segmentos */}
      <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-xl p-2">
        {tabs
          .filter((t) => t.visible)
          .map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-[#0a2a5b] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, email, teléfono, DNI o patente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 shadow-xs outline-none focus:border-tech-blue"
        />
      </div>

      {/* TAB 1: LEADS */}
      {activeTab === 'leads' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Lead</th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Origen</th>
                  <th className="px-4 py-3 text-left">Unidad / Sector</th>
                  <th className="px-4 py-3 text-left">Etapa</th>
                  <th className="px-4 py-3 text-right">Trazabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Sin Leads para mostrar en tu área.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-bold text-slate-800">{l.customerName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{l.phone || '—'}</p>
                        <p className="text-[11px] text-slate-400">{l.email || '—'}</p>
                      </td>
                      <td className="px-4 py-3">{l.origin}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700">{l.businessUnit}</span>
                        {l.sector && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">
                            {l.sector}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-tech-blue">
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            setSelectedTrace({
                              kind: 'lead',
                              id: l.id,
                              name: l.customerName,
                              email: l.email,
                              phone: l.phone,
                              businessUnit: l.businessUnit,
                              sector: l.sector,
                              origin: l.origin,
                              status: l.status,
                              loyaltyPoints: l.loyaltyPoints,
                              raw: l,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-tech-blue hover:text-tech-blue"
                        >
                          <Eye className="h-3.5 w-3.5" /> Trazabilidad
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

      {/* TAB 2 & 3: USUARIOS APP / CLIENTES TURISMO */}
      {(activeTab === 'usuarios' || activeTab === 'clientes') && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">
                    {activeTab === 'usuarios' ? 'Usuario App' : 'Cliente Turismo'}
                  </th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Perfil</th>
                  <th className="px-4 py-3 text-left">Unidad</th>
                  <th className="px-4 py-3 text-left">Puntos</th>
                  <th className="px-4 py-3 text-right">Trazabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {(activeTab === 'usuarios' ? filteredBasicUsers : filteredClients).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Sin registros en este segmento.
                    </td>
                  </tr>
                ) : (
                  (activeTab === 'usuarios' ? filteredBasicUsers : filteredClients).map((u) => {
                    const name = u.customerName || u.displayName || u.name || 'Sin Nombre';
                    const points = u.rewardsPoints || u.loyaltyPoints || 0;
                    const docNum = u.document?.number || u.documentNumber;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{u.id}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{u.phone || '—'}</p>
                          <p className="text-[11px] text-slate-400">{u.email || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          {activeTab === 'clientes' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                              <Crown className="h-3 w-3" /> Completo {docNum ? `• ${docNum}` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                              Onboarding Básico
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{u.businessUnit || 'TravelApp'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                            <Star className="h-3 w-3" /> {Number(points).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              setSelectedTrace({
                                kind: activeTab === 'usuarios' ? 'usuario' : 'cliente',
                                id: u.id,
                                name,
                                email: u.email,
                                phone: u.phone,
                                businessUnit: u.businessUnit || 'TravelApp',
                                sector: u.sector,
                                loyaltyPoints: points,
                                raw: u,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-tech-blue hover:text-tech-blue"
                          >
                            <Eye className="h-3.5 w-3.5" /> Trazabilidad
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONDUCTORES */}
      {activeTab === 'conductores' && canViewDrivers && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Conductor</th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Vehículo / Patente</th>
                  <th className="px-4 py-3 text-left">Supervisor</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Gestión Directa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Sin conductores registrados.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((d) => {
                    const fullName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.name || 'Conductor';
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-bold text-slate-800">{fullName}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{d.phone || '—'}</p>
                          <p className="text-[11px] text-slate-400">{d.email || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {d.vehicle?.brand} {d.vehicle?.model}{' '}
                          {d.vehicle?.licensePlate && (
                            <span className="ml-1 font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                              {d.vehicle.licensePlate}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{d.supervisorName || 'Sin supervisor'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              d.status === 'Activo' || d.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {d.status || 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Link
                              href={`/hr/${d.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-tech-blue hover:text-tech-blue"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> RRHH
                            </Link>
                            <Link
                              href={`/travelcab/drivers/${d.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0a2a5b] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0a2a5b]/90"
                            >
                              <Car className="h-3.5 w-3.5" /> Flota
                            </Link>
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
      )}

      {/* TAB 5: AFILIADOS (CON VISOR RÁPIDO DE NIVEL + ACCESO RÁPIDO AL PERFIL) */}
      {activeTab === 'afiliados' && canViewAffiliates && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Afiliado</th>
                  <th className="px-4 py-3 text-left">Contacto &amp; Código</th>
                  <th className="px-4 py-3 text-left">Visor Rápido de Nivel</th>
                  <th className="px-4 py-3 text-left">Reservas / Wallet</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acceso Rápido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAffiliates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Sin afiliados registrados.
                    </td>
                  </tr>
                ) : (
                  filteredAffiliates.map((a) => {
                    const tier = tiers.find((t) => t.id === a.currentTierId) || tiers[0];
                    const tierClass = TIER_BADGE_COLORS[tier?.badgeColor || 'cyan'] || TIER_BADGE_COLORS.cyan;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-bold text-slate-800">{a.name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{a.email}</p>
                          <p className="font-mono text-[11px] text-tech-blue font-bold">
                            Ref: {a.refCode || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center gap-1 w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tierClass}`}
                            >
                              <Award className="h-3 w-3" /> {tier?.name || 'Starter'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Comisión: <strong>{tier?.commissionPct ?? 3}%</strong>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>
                            <strong>{a.totalBookingsConcreted || 0}</strong> reservas
                          </p>
                          <p className="text-emerald-700 font-bold">
                            ${Number(a.walletBalance || 0).toLocaleString('es-AR')}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              a.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href="/marketing/partners"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a2a5b] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0a2a5b]/90"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Perfil Afiliado
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTrace && (
        <TraceabilityModal
          record={selectedTrace}
          allLeads={leads}
          allUsers={users}
          allDrivers={drivers}
          allAffiliates={affiliates}
          tiers={tiers}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}

export default function CustomersDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-400">
          Cargando Directorio &amp; Trazabilidad 360°...
        </div>
      }
    >
      <DirectoryContent />
    </Suspense>
  );
}
