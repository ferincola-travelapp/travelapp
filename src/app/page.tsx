'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Globe,
  Megaphone,
  Target,
  MessageSquare,
  Building2,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface LauncherModule {
  id: string;
  label: string;
  description: string;
  href: string;
  row: 'top' | 'center' | 'bottom';
  logoSrc?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const LAUNCHER_MODULES: LauncherModule[] = [
  // Parte superior
  {
    id: 'vision_general',
    label: 'Visión General',
    description: 'Métricas globales y operación en vivo',
    href: '/vision-general',
    row: 'top',
    icon: LayoutDashboard,
  },
  {
    id: 'administracion',
    label: 'Administración',
    description: 'Finanzas, sucursales y auditoría',
    href: '/audit',
    row: 'top',
    icon: ShieldCheck,
  },
  {
    id: 'recursos_humanos',
    label: 'Recursos Humanos',
    description: 'Staff, conductores y supervisores',
    href: '/hr',
    row: 'top',
    icon: Users,
  },
  {
    id: 'cms_web',
    label: 'CMS Web',
    description: 'Contenidos, landings y banners',
    href: '/cms',
    row: 'top',
    icon: Globe,
  },

  // Parte central (Unidades de Negocio con logos oficiales)
  {
    id: 'travelcab',
    label: 'TravelCab',
    description: 'Despacho, flota y tarifas',
    href: '/travelcab',
    row: 'center',
    logoSrc: '/assets/travelcab_original.svg',
  },
  {
    id: 'travelapp',
    label: 'TravelApp',
    description: 'Usuarios, apps y ecosistema',
    href: '/users',
    row: 'center',
    logoSrc: '/assets/travelapp_original.svg',
  },
  {
    id: 'travelapp_experience',
    label: 'TravelApp Experience',
    description: 'Excursiones, reservas y salidas',
    href: '/experiences',
    row: 'center',
    logoSrc: '/assets/experience_original.svg',
  },
  {
    id: 'travelapp_rewards',
    label: 'TravelApp Rewards',
    description: 'Puntos, comercios y canjes',
    href: '/rewards',
    row: 'center',
    logoSrc: '/assets/rewards_original.svg',
  },

  // Parte inferior
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Campañas, afiliados y crecimiento',
    href: '/marketing',
    row: 'bottom',
    icon: Megaphone,
  },
  {
    id: 'crm',
    label: 'CRM',
    description: 'Leads, clientes y agenda',
    href: '/crm',
    row: 'bottom',
    icon: Target,
  },
  {
    id: 'mensajeria',
    label: 'Centro de Mensajería',
    description: 'WhatsApp, redes y Travis IA',
    href: '/messages',
    row: 'bottom',
    icon: MessageSquare,
  },
  {
    id: 'panel_b2b',
    label: 'Panel B2B',
    description: 'Hoteles, recepción y convenios',
    href: '/experiences/hotel-reception',
    row: 'bottom',
    icon: Building2,
  },
];

export default function ConcordeHomeLauncher() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Operador');

  // Preparado para filtrar por permisos del usuario (por ahora superadmin/admin ve todo)
  const allowedModules = null as string[] | null;
  const visibleModules = allowedModules
    ? LAUNCHER_MODULES.filter((m) => allowedModules.includes(m.id))
    : LAUNCHER_MODULES;

  const topRow = visibleModules.filter((m) => m.row === 'top');
  const centerRow = visibleModules.filter((m) => m.row === 'center');
  const bottomRow = visibleModules.filter((m) => m.row === 'bottom');

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  return (
    <div
      className="relative flex min-h-screen flex-col justify-between bg-gradient-to-b from-white via-[#F5F7FA] to-[#ECEFF4] text-slate-800 px-4 sm:px-8 lg:px-12 py-6"
      style={{ fontFamily: "'Quicksand', sans-serif" }}
    >
      {/* Detalle sutil superior en azul institucional */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#0a2a5b] z-20" />

      {/* Barra superior minimalista con cierre de sesión */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-end">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0a2a5b] transition cursor-pointer py-1 px-2 rounded-md hover:bg-white/70"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>

      {/* Cabecera: Logo centrado + Bienvenida */}
      <header className="w-full max-w-4xl mx-auto flex flex-col items-center text-center pt-2 pb-6 sm:pb-8">
        <img
          src="/assets/travelapp_original.svg"
          alt="TravelApp"
          className="h-14 sm:h-16 md:h-20 w-auto object-contain select-none"
        />
        <div className="mt-3 h-0.5 w-12 rounded-full bg-[#0a2a5b]/25" />
        <h1 className="mt-4 text-lg sm:text-xl md:text-2xl font-bold text-[#0a2a5b] tracking-tight">
          Bienvenido, <span className="capitalize">{displayName}</span> al centro de control Concorde 360
        </h1>
      </header>

      {/* Grilla de módulos (3 filas x 4 botones, sin tarjetas flotantes) */}
      <main className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center gap-5 sm:gap-7 py-2">
        {/* Parte superior */}
        {topRow.length > 0 && (
          <section aria-label="Gestión y Plataforma">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {topRow.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.id}
                    href={mod.href}
                    className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white/60 hover:bg-white hover:border-[#0a2a5b]/40 p-4 sm:p-5 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0a2a5b]/[0.06] text-[#0a2a5b] group-hover:bg-[#0a2a5b] group-hover:text-white transition-colors">
                        {Icon && <Icon className="w-5 h-5" />}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#0a2a5b] transition-colors" />
                    </div>
                    <div className="mt-4">
                      <h2 className="text-sm sm:text-base font-bold text-[#0a2a5b]">
                        {mod.label}
                      </h2>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 line-clamp-1">
                        {mod.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Parte central: Unidades de negocio con logos oficiales */}
        {centerRow.length > 0 && (
          <section aria-label="Unidades de Negocio">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {centerRow.map((mod) => (
                <Link
                  key={mod.id}
                  href={mod.href}
                  className="group relative flex flex-col items-center justify-center text-center rounded-xl border border-[#0a2a5b]/15 bg-white/85 hover:bg-white hover:border-[#0a2a5b]/50 px-4 py-6 sm:py-7 transition-all duration-200"
                >
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#0a2a5b] absolute top-3 right-3 transition-colors" />
                  <div className="h-12 sm:h-14 flex items-center justify-center">
                    {mod.logoSrc && (
                      <img
                        src={mod.logoSrc}
                        alt={mod.label}
                        className="max-h-11 sm:max-h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
                      />
                    )}
                  </div>
                  <span className="mt-3 text-xs sm:text-sm font-bold text-[#0a2a5b]">
                    {mod.label}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-1">
                    {mod.description}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Parte inferior */}
        {bottomRow.length > 0 && (
          <section aria-label="Comercial y Canales">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {bottomRow.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.id}
                    href={mod.href}
                    className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white/60 hover:bg-white hover:border-[#0a2a5b]/40 p-4 sm:p-5 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0a2a5b]/[0.06] text-[#0a2a5b] group-hover:bg-[#0a2a5b] group-hover:text-white transition-colors">
                        {Icon && <Icon className="w-5 h-5" />}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#0a2a5b] transition-colors" />
                    </div>
                    <div className="mt-4">
                      <h2 className="text-sm sm:text-base font-bold text-[#0a2a5b]">
                        {mod.label}
                      </h2>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 line-clamp-1">
                        {mod.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto pt-8 pb-2 text-center">
        <p className="text-[11px] sm:text-xs font-bold text-[#0a2a5b]/80 tracking-wide">
          TravelApp s.a.s. - C.U.I.T. 30-71922034-3 - Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
