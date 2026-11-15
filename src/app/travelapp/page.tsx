'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Briefcase,
  Users,
  Ticket,
  Smartphone,
  UserCheck,
  Globe,
  Calculator,
  Bell,
  UserCircle2,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TravelAppOverviewTab } from '@/components/travelapp/TravelAppOverviewTab';
import { TravelAppOperativeTab, OperativeSection } from '@/components/travelapp/TravelAppOperativeTab';
import { TravelMarketTab } from '@/components/travelapp/TravelMarketTab';
import {
  TravelAppCustomersTab,
  TravelAppReservationsTab,
  MiViajeMobileTab,
  CoordinatorsTab,
  OwnQuoterTab,
} from '@/components/travelapp/TravelAppSecondaryTabs';

type TabKey =
  | 'kpis'
  | 'op_alta_operador'
  | 'op_alta_proveedor'
  | 'op_crear_viaje'
  | 'op_pasajeros'
  | 'op_rooming'
  | 'op_calendario'
  | 'op_cupos'
  | 'clientes'
  | 'res_crear'
  | 'res_buscar'
  | 'miviaje'
  | 'coordinadores'
  | 'market'
  | 'cotizador';

export default function TravelAppModulePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('kpis');
  const [opOpen, setOpOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<'ES' | 'EN' | 'PT'>('ES');

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = mounted
    ? user?.displayName || user?.email?.split('@')[0] || 'Operador'
    : 'Operador';

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="flex min-h-screen bg-gradient-to-b from-white via-[#F5F7FA] to-[#ECEFF4] text-slate-800"
      style={{ fontFamily: "'Quicksand', sans-serif" }}
    >
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#0a2a5b] z-40" />

      {/* Sidebar Lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white/95 border-r border-slate-200/90 flex flex-col justify-between pt-6 pb-5 px-4 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5 overflow-y-auto pr-1">
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
              TravelApp · Turismo Emisivo
            </p>
          </div>

          <nav className="space-y-1">
            {/* 1. KPIs Generales */}
            <button
              type="button"
              onClick={() => selectTab('kpis')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'kpis'
                  ? 'bg-[#0a2a5b] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>KPIs Generales</span>
            </button>

            {/* 2. Tablero Operativo (desplegable) */}
            <div>
              <button
                type="button"
                onClick={() => setOpOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab.startsWith('op_')
                    ? 'bg-[#0a2a5b]/10 text-[#0a2a5b]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span>Tablero Operativo</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${opOpen ? 'rotate-180' : ''}`} />
              </button>

              {(opOpen || activeTab.startsWith('op_')) && (
                <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-1">
                  {[
                    { key: 'op_alta_operador' as TabKey, label: 'Alta de Operador' },
                    { key: 'op_alta_proveedor' as TabKey, label: 'Alta de Proveedor' },
                    { key: 'op_crear_viaje' as TabKey, label: 'Crear Viaje' },
                    { key: 'op_pasajeros' as TabKey, label: 'Listado de Pasajeros' },
                    { key: 'op_rooming' as TabKey, label: 'Rooming List Hoteles' },
                    { key: 'op_calendario' as TabKey, label: 'Calendario de Salidas' },
                    { key: 'op_cupos' as TabKey, label: 'Control de Cupos' },
                  ].map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => selectTab(sub.key)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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

            {/* 3. Clientes */}
            <button
              type="button"
              onClick={() => selectTab('clientes')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'clientes'
                  ? 'bg-[#0a2a5b] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Clientes</span>
            </button>

            {/* 4. Reservas (desplegable) */}
            <div>
              <button
                type="button"
                onClick={() => setResOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab.startsWith('res_')
                    ? 'bg-[#0a2a5b]/10 text-[#0a2a5b]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Ticket className="w-4 h-4 shrink-0" />
                  <span>Reservas</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${resOpen ? 'rotate-180' : ''}`} />
              </button>

              {(resOpen || activeTab.startsWith('res_')) && (
                <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-1">
                  <button
                    type="button"
                    onClick={() => selectTab('res_crear')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeTab === 'res_crear'
                        ? 'bg-[#0a2a5b] text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
                    }`}
                  >
                    Crear Reserva
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTab('res_buscar')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeTab === 'res_buscar'
                        ? 'bg-[#0a2a5b] text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
                    }`}
                  >
                    Buscar Reserva
                  </button>
                </div>
              )}
            </div>

            {/* 5. Gestión Mi Viaje App Móvil */}
            <button
              type="button"
              onClick={() => selectTab('miviaje')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'miviaje'
                  ? 'bg-[#0a2a5b] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Gestión &quot;Mi Viaje&quot;</span>
            </button>

            {/* 6. Gestión de Coordinadores y Guías */}
            <button
              type="button"
              onClick={() => selectTab('coordinadores')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'coordinadores'
                  ? 'bg-[#0a2a5b] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Coordinadores y Guías</span>
            </button>

            {/* 7. Gestión de Travel Market */}
            <button
              type="button"
              onClick={() => selectTab('market')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'market'
                  ? 'bg-[#0a2a5b] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>Travel Market</span>
            </button>

            {/* 8. Cotizador Propio */}
            <button
              type="button"
              onClick={() => selectTab('cotizador')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'cotizador'
                  ? 'bg-[#0a2a5b] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
              }`}
            >
              <Calculator className="w-4 h-4 shrink-0" />
              <span>Cotizador Propio</span>
            </button>
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
              TravelApp · Turismo Emisivo
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 mr-1">
              <Link
                href="/landing/ecosistema"
                target="_blank"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-[#0a2a5b] hover:bg-slate-50 transition"
              >
                travelapp.ar ↗
              </Link>
              <Link
                href="/marketplace"
                target="_blank"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-[#0a2a5b] hover:bg-slate-50 transition"
              >
                Marketplace ↗
              </Link>
              <Link
                href="/cms"
                className="px-2.5 py-1.5 rounded-lg border border-[#0a2a5b]/25 bg-[#0a2a5b]/5 text-[11px] font-bold text-[#0a2a5b] hover:bg-[#0a2a5b]/10 transition"
              >
                CMS Web
              </Link>
            </div>

            <button
              type="button"
              aria-label="Alertas"
              className="p-2 rounded-lg text-slate-600 hover:text-[#0a2a5b] hover:bg-slate-100 transition cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-white">
              <Globe className="w-3.5 h-3.5 text-[#0a2a5b]" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as 'ES' | 'EN' | 'PT')}
                className="text-xs font-bold text-[#0a2a5b] bg-transparent outline-none cursor-pointer"
              >
                <option value="ES">ES</option>
                <option value="EN">EN</option>
                <option value="PT">PT</option>
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <UserCircle2 className="w-5 h-5 text-[#0a2a5b]" />
              <div className="leading-tight">
                <p className="text-xs font-bold text-[#0a2a5b] capitalize">{displayName}</p>
                <p className="text-[10px] text-slate-400">{mounted ? user?.email || '' : ''}</p>
              </div>
            </div>

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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'kpis' && <TravelAppOverviewTab />}
          {activeTab.startsWith('op_') && (
            <TravelAppOperativeTab section={activeTab.replace('op_', '') as OperativeSection} />
          )}
          {activeTab === 'clientes' && <TravelAppCustomersTab />}
          {activeTab === 'res_crear' && <TravelAppReservationsTab mode="create" />}
          {activeTab === 'res_buscar' && <TravelAppReservationsTab mode="search" />}
          {activeTab === 'miviaje' && <MiViajeMobileTab />}
          {activeTab === 'coordinadores' && <CoordinatorsTab />}
          {activeTab === 'market' && <TravelMarketTab />}
          {activeTab === 'cotizador' && <OwnQuoterTab />}
        </main>
      </div>
    </div>
  );
}
