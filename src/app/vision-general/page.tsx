'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  Users,
  FileText,
  Bell,
  Globe,
  UserCircle2,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  Car,
  Ticket,
  Wallet,
  MessageSquare,
  TrendingUp,
  Clock,
  ShieldAlert,
  ChevronDown,
  Award,
  Crown,
  GitBranch,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { BranchesTab } from '@/components/vision-general/BranchesTab';
import { UsersTab } from '@/components/vision-general/UsersTab';
import { FiscalTab } from '@/components/vision-general/FiscalTab';
import { StabilityAndMessages } from '@/components/vision-general/StabilityAndMessages';
import { TravelCabManagement, TravelCabSection } from '@/components/vision-general/TravelCabManagement';
import { isCompleteTravelerProfile } from '@/lib/directory-helpers';

type TabKey = 'metricas' | 'sucursales' | 'usuarios' | 'fiscal' | 'cab_tarifas' | 'cab_servicio' | 'cab_categoria';

function toMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatRelativeTime(ms: number): string {
  if (!ms) return 'Reciente';
  const diffMin = Math.max(1, Math.floor((Date.now() - ms) / 60000));
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Hace ${diffHr} h`;
  return `Hace ${Math.floor(diffHr / 24)} d`;
}

export default function VisionGeneralPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>('metricas');
  const [cabMenuOpen, setCabMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<'ES' | 'EN' | 'PT'>('ES');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; senderName: string; text: string; createdAt: number }[]>([]);

  // Real-time Firestore Stats
  const [growthData, setGrowthData] = useState<{ name: string; viajes: number; registros: number }[]>([]);
  const [salesData, setSalesData] = useState<{ name: string; consultas: number; ventas: number }[]>([]);
  const [pendingDebts, setPendingDebts] = useState<{ id: string; name: string; amount: number; due: string; status: string }[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ id: string; type: string; text: string; branch: string; time: string; ts: number }[]>([]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    basicUsersCount: 0,
    completeClientsCount: 0,
    activeTrips: 0,
    registeredDrivers: 0,
    activeDrivers: 0,
    leadsCount: 0,
    affiliatesCount: 0,
    queriesPending: 0,
    experiencesCount: 0,
    revenue7Days: 0,
  });

  // Control de acceso: solo @travelapp.ar y ferincola@gmail.com
  const emailLower = (user?.email || '').trim().toLowerCase();
  const isAuthorized =
    emailLower.endsWith('@travelapp.ar') || emailLower === 'ferincola@gmail.com';

  // Alertas de campana (últimos mensajes a operadores)
  useEffect(() => {
    if (!isAuthorized) return;
    const q = query(collection(db, 'operator_messages'), orderBy('createdAt', 'desc'), limit(8));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          senderName: d.data().senderName || 'Operador',
          recipientEmail: (d.data().recipientEmail || 'all').toLowerCase(),
          text: d.data().text || '',
          createdAt: d.data().createdAt || 0,
        }))
        .filter((m) => m.recipientEmail === 'all' || m.recipientEmail === emailLower);
      setAlerts(list);
    });
    return () => unsub();
  }, [isAuthorized, emailLower]);

  // Métricas globales en tiempo real
  useEffect(() => {
    if (!isAuthorized) return;
    const now = Date.now();
    const dayMs = 86400000;
    const sevenDaysAgo = now - 7 * dayMs;
    const fourWeeksAgo = now - 28 * dayMs;

    let latestUsers: any[] = [];
    let latestTrips: any[] = [];
    let latestLeads: any[] = [];
    let latestReservations: any[] = [];

    const recompute = () => {
      const weeks = [0, 1, 2, 3].map((idx) => {
        const start = fourWeeksAgo + idx * 7 * dayMs;
        const end = start + 7 * dayMs;
        const registros = latestUsers.filter((u) => {
          const ts = toMs(u.createdAt);
          return ts >= start && ts < end;
        }).length;
        const viajes = latestTrips.filter((t) => {
          const ts = toMs(t.createdAt);
          return ts >= start && ts < end;
        }).length;
        return { name: `Sem ${idx + 1}`, viajes, registros };
      });
      setGrowthData(weeks);

      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const daily = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now - (6 - i) * dayMs);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const end = start + dayMs;
        const consultas = latestLeads.filter((l) => {
          const ts = toMs(l.createdAt);
          return ts >= start && ts < end;
        }).length;
        const ventas = latestReservations.filter((r) => {
          const ts = toMs(r.createdAt || r.paidAt);
          return ts >= start && ts < end && (r.estado === 'Confirmada' || r.paymentStatus === 'paid');
        }).length;
        return { name: dayNames[d.getDay()], consultas, ventas };
      });
      setSalesData(daily);

      const tripRev = latestTrips
        .filter((t) => toMs(t.paidAt || t.createdAt) >= sevenDaysAgo && (t.paymentStatus === 'paid' || t.status === 'completed'))
        .reduce((acc, t) => acc + Number(t.fare || t.amount || t.total || 0), 0);
      const expRev = latestReservations
        .filter((r) => toMs(r.paidAt || r.createdAt) >= sevenDaysAgo && (r.estado === 'Confirmada' || r.paymentStatus === 'paid'))
        .reduce((acc, r) => acc + Number(r.totalAmount || r.amount || r.total || 0), 0);
      setStats((prev) => ({ ...prev, revenue7Days: tripRev + expRev }));

      const feed: { id: string; type: string; text: string; branch: string; time: string; ts: number }[] = [];
      latestUsers.slice(0, 5).forEach((u) => {
        const ts = toMs(u.createdAt);
        feed.push({
          id: `u-${u.id}`,
          type: 'registro',
          text: `Nuevo usuario: ${u.displayName || u.name || u.email || 'Pasajero'}`,
          branch: u.branchName || 'TravelApp',
          time: formatRelativeTime(ts),
          ts,
        });
      });
      latestTrips.slice(0, 5).forEach((t) => {
        const ts = toMs(t.createdAt);
        feed.push({
          id: `t-${t.id}`,
          type: 'viaje',
          text: `Viaje ${t.id.slice(0, 6)} (${t.status || 'activo'})`,
          branch: t.branchId === '3' ? 'Tucumán' : t.branchId === '2' ? 'Pilar' : 'Retiro',
          time: formatRelativeTime(ts),
          ts,
        });
      });
      latestLeads.slice(0, 5).forEach((l) => {
        const ts = toMs(l.createdAt);
        feed.push({
          id: `l-${l.id}`,
          type: 'lead',
          text: `Lead: ${l.name || l.phone || 'Consulta'}`,
          branch: l.businessUnit || 'CRM',
          time: formatRelativeTime(ts),
          ts,
        });
      });
      feed.sort((a, b) => b.ts - a.ts);
      setRecentActivity(feed.slice(0, 6));
    };

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      latestUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const complete = latestUsers.filter((u) => isCompleteTravelerProfile(u)).length;
      const basic = latestUsers.length - complete;
      setStats((prev) => ({
        ...prev,
        totalUsers: snap.size,
        basicUsersCount: basic,
        completeClientsCount: complete,
      }));
      recompute();
    });
    const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
      latestTrips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const active = latestTrips.filter(
        (d) => d.status === 'active' || d.status === 'accepted' || d.status === 'arrived' || d.status === 'in_progress'
      ).length;
      setStats((prev) => ({ ...prev, activeTrips: active }));
      recompute();
    });
    const unsubLeads = onSnapshot(collection(db, 'leads'), (snap) => {
      latestLeads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pending = latestLeads.filter((d) => d.status === 'Nuevos' || d.status === 'Agendados').length;
      setStats((prev) => ({ ...prev, leadsCount: snap.size, queriesPending: pending }));
      recompute();
    });
    const unsubExp = onSnapshot(collection(db, 'experiences'), (snap) => {
      setStats((prev) => ({ ...prev, experiencesCount: snap.size }));
    });
    const unsubRes = onSnapshot(collection(db, 'experience_reservations'), (snap) => {
      latestReservations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const debts = latestReservations
        .filter((r) => r.estado === 'Pendiente' || r.paymentStatus === 'pending')
        .slice(0, 6)
        .map((r) => ({
          id: r.reservationCode || r.id.slice(0, 8),
          name: r.passengerName || r.customerName || r.experienceTitle || 'Reserva',
          amount: Number(r.totalAmount || r.amount || 0),
          due: r.dueDate || 'Pendiente',
          status: r.paymentStatus === 'partial' ? 'partial' : 'pending',
        }));
      setPendingDebts(debts);
      recompute();
    });
    const unsubDrivers = onSnapshot(collection(db, 'partners'), (snap) => {
      const active = snap.docs.filter((d) => d.data().status === 'approved' || d.data().status === 'active').length;
      setStats((prev) => ({ ...prev, registeredDrivers: snap.size, activeDrivers: active }));
    });
    const unsubAffiliates = onSnapshot(collection(db, 'experience_partners'), (snap) => {
      setStats((prev) => ({ ...prev, affiliatesCount: snap.size }));
    });

    return () => {
      unsubUsers();
      unsubTrips();
      unsubLeads();
      unsubExp();
      unsubRes();
      unsubDrivers();
      unsubAffiliates();
    };
  }, [isAuthorized]);

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0a2a5b] border-t-transparent" />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white via-[#F5F7FA] to-[#ECEFF4] px-4 text-center"
        style={{ fontFamily: "'Quicksand', sans-serif" }}
      >
        <ShieldAlert className="w-12 h-12 text-[#0a2a5b] mb-3" />
        <h1 className="text-xl font-bold text-[#0a2a5b]">Acceso Restringido — Visión General</h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2">
          Este módulo está habilitado únicamente para cuentas corporativas <span className="font-bold">@travelapp.ar</span> autorizadas.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45] transition"
          >
            Volver al Inicio
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-white transition cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const navItems: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'metricas', label: 'Métricas Generales', icon: BarChart3 },
    { key: 'sucursales', label: 'Gestión de Sucursales', icon: Building2 },
    { key: 'usuarios', label: 'Gestión de Usuarios', icon: Users },
    { key: 'fiscal', label: 'Información Fiscal', icon: FileText },
  ];

  const displayName = user.displayName || user.email?.split('@')[0] || 'Operador';

  return (
    <div
      className="flex min-h-screen bg-gradient-to-b from-white via-[#F5F7FA] to-[#ECEFF4] text-slate-800"
      style={{ fontFamily: "'Quicksand', sans-serif" }}
    >
      {/* Detalle sutil superior */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#0a2a5b] z-40" />

      {/* Sidebar Lateral (solo los 4 botones solicitados) */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white/95 border-r border-slate-200/90 flex flex-col justify-between pt-6 pb-5 px-4 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <img
              src="/assets/travelapp_original.svg"
              alt="TravelApp"
              className="h-9 w-auto object-contain"
            />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-500 hover:text-[#0a2a5b]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Visión General
            </p>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    active
                      ? 'bg-[#0a2a5b] text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Submenú Gestión TravelCab */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setCabMenuOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab.startsWith('cab_')
                    ? 'bg-[#0a2a5b]/10 text-[#0a2a5b]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Car className="w-4 h-4 shrink-0" />
                  <span>Gestión TravelCab</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${cabMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {(cabMenuOpen || activeTab.startsWith('cab_')) && (
                <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-1">
                  {[
                    { key: 'cab_tarifas' as TabKey, label: 'Gestión de Tarifas' },
                    { key: 'cab_servicio' as TabKey, label: 'Crear Servicio' },
                    { key: 'cab_categoria' as TabKey, label: 'Crear Categoría' },
                  ].map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(sub.key);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeTab === sub.key
                          ? 'bg-[#0a2a5b] text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200/80">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-[#0a2a5b] hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Concorde 360</span>
          </Link>
        </div>
      </aside>

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Menú superior minimalista: solo Campana, Idioma, Perfil y Cerrar sesión */}
        <header className="sticky top-1 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-[#0a2a5b]">
              {navItems.find((n) => n.key === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Campana de alertas */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAlertsOpen((v) => !v)}
                aria-label="Alertas"
                className="relative p-2 rounded-lg text-slate-600 hover:text-[#0a2a5b] hover:bg-slate-100 transition cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#ff6b00]" />
                )}
              </button>

              {alertsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-50">
                  <p className="text-xs font-bold text-[#0a2a5b] mb-2">Alertas y Mensajes</p>
                  {alerts.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-3 text-center">Sin alertas nuevas.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {alerts.map((a) => (
                        <div key={a.id} className="rounded-lg bg-slate-50 p-2 text-[11px]">
                          <p className="font-bold text-[#0a2a5b]">{a.senderName}</p>
                          <p className="text-slate-600">{a.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selector de idioma */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-white">
              <Globe className="w-3.5 h-3.5 text-[#0a2a5b]" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as 'ES' | 'EN' | 'PT')}
                aria-label="Idioma"
                className="text-xs font-bold text-[#0a2a5b] bg-transparent outline-none cursor-pointer"
              >
                <option value="ES">ES</option>
                <option value="EN">EN</option>
                <option value="PT">PT</option>
              </select>
            </div>

            {/* Perfil */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <UserCircle2 className="w-5 h-5 text-[#0a2a5b]" />
              <div className="leading-tight">
                <p className="text-xs font-bold text-[#0a2a5b] capitalize">{displayName}</p>
                <p className="text-[10px] text-slate-400">{user.email}</p>
              </div>
            </div>

            {/* Cerrar sesión */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* Contenido dinámico */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'metricas' && (
            <div className="space-y-6">
              {/* Monitor de estabilidad + Mensajería a operadores */}
              <StabilityAndMessages />

              {/* KPIs Principales Reales */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200/90 bg-white/75 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Pasajeros</span>
                    <Users className="w-4 h-4 text-[#0a2a5b]" />
                  </div>
                  <p className="text-2xl font-bold text-[#0a2a5b] mt-2">{stats.totalUsers}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Registrados en Firestore</p>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white/75 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Viajes Activos / Flota</span>
                    <Car className="w-4 h-4 text-[#0a2a5b]" />
                  </div>
                  <p className="text-2xl font-bold text-[#0a2a5b] mt-2">
                    {stats.activeTrips}{' '}
                    <span className="text-xs font-semibold text-slate-400">
                      / {stats.activeDrivers} cond.
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{stats.registeredDrivers} postulados</p>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white/75 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Leads & Experiencias</span>
                    <Ticket className="w-4 h-4 text-[#0a2a5b]" />
                  </div>
                  <p className="text-2xl font-bold text-[#0a2a5b] mt-2">{stats.leadsCount}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {stats.queriesPending} pendientes · {stats.experiencesCount} exp.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white/75 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Ingresos (7 días)</span>
                    <Wallet className="w-4 h-4 text-[#0a2a5b]" />
                  </div>
                  <p className="text-2xl font-bold text-[#0a2a5b] mt-2">
                    ${stats.revenue7Days.toLocaleString('es-AR')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Viajes + Reservas confirmadas</p>
                </div>
              </div>

              {/* Segmentación & Trazabilidad 360° (Acceso directo a CRM) */}
              <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0a2a5b] flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" /> Segmentación &amp; Trazabilidad 360° (CRM)
                  </h3>
                  <Link href="/crm/customers" className="text-[11px] font-bold text-[#0a2a5b] hover:underline">
                    Abrir Directorio →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { tab: 'leads', label: 'Leads (Datos)', value: stats.leadsCount, icon: MessageSquare, color: 'text-blue-700 bg-blue-50/70 border-blue-200' },
                    { tab: 'usuarios', label: 'Usuarios App', value: stats.basicUsersCount, icon: Users, color: 'text-slate-700 bg-slate-50 border-slate-200' },
                    { tab: 'clientes', label: 'Clientes Turismo', value: stats.completeClientsCount, icon: Crown, color: 'text-amber-700 bg-amber-50/70 border-amber-200' },
                    { tab: 'conductores', label: 'Conductores', value: stats.registeredDrivers, icon: Car, color: 'text-indigo-700 bg-indigo-50/70 border-indigo-200' },
                    { tab: 'afiliados', label: 'Afiliados', value: stats.affiliatesCount, icon: Award, color: 'text-purple-700 bg-purple-50/70 border-purple-200' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.tab}
                        href={`/crm/customers?tab=${item.tab}`}
                        className={`rounded-xl border p-3 hover:shadow-sm transition-all flex flex-col justify-between ${item.color}`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>{item.label}</span>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-xl font-bold mt-1.5">{item.value}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Gráficos Reales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200/90 bg-white/75 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-[#0a2a5b]" />
                    <h3 className="text-sm font-bold text-[#0a2a5b]">Crecimiento (Últimas 4 semanas)</h3>
                  </div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip />
                        <Area type="monotone" dataKey="viajes" stroke="#0a2a5b" fill="#0a2a5b" fillOpacity={0.12} name="Viajes" />
                        <Area type="monotone" dataKey="registros" stroke="#ff6b00" fill="#ff6b00" fillOpacity={0.12} name="Registros" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white/75 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-[#0a2a5b]" />
                    <h3 className="text-sm font-bold text-[#0a2a5b]">Consultas vs Ventas (7 días)</h3>
                  </div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="consultas" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Consultas" />
                        <Bar dataKey="ventas" fill="#0a2a5b" radius={[4, 4, 0, 0]} name="Ventas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Actividad Reciente + Deudas Pendientes Reales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200/90 bg-white/75 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-[#0a2a5b]" />
                    <h3 className="text-sm font-bold text-[#0a2a5b]">Actividad Reciente en Vivo</h3>
                  </div>
                  <div className="space-y-2.5">
                    {recentActivity.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Sin actividad reciente registrada.</p>
                    ) : (
                      recentActivity.map((act) => (
                        <div key={act.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                          <div>
                            <p className="font-semibold text-slate-800">{act.text}</p>
                            <p className="text-[11px] text-slate-400">{act.branch}</p>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">{act.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white/75 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4 text-[#0a2a5b]" />
                    <h3 className="text-sm font-bold text-[#0a2a5b]">Reservas Pendientes de Cobro</h3>
                  </div>
                  <div className="space-y-2.5">
                    {pendingDebts.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Sin deudas pendientes.</p>
                    ) : (
                      pendingDebts.map((deb) => (
                        <div key={deb.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                          <div>
                            <p className="font-semibold text-slate-800">{deb.name}</p>
                            <p className="text-[11px] text-slate-400">Ref: {deb.id}</p>
                          </div>
                          <span className="font-bold text-[#0a2a5b]">
                            ${deb.amount.toLocaleString('es-AR')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sucursales' && <BranchesTab />}
          {activeTab === 'usuarios' && <UsersTab />}
          {activeTab === 'fiscal' && <FiscalTab />}
          {activeTab.startsWith('cab_') && (
            <TravelCabManagement
              section={activeTab.replace('cab_', '') as TravelCabSection}
              onChangeSection={(s) => setActiveTab(`cab_${s}` as TabKey)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
