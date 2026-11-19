import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Smartphone,
  Car,
  Download,
  CheckCircle2,
  UserCheck,
  ChevronDown,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { APKS, type ApkItem } from './apkConfig';
import { InstallGuideMockups } from './InstallGuideMockups';
import { ShareLandingBar } from './ShareLandingBar';

export const metadata: Metadata = {
  title: 'TravelCab Beta — Descargá la App Oficial (Android)',
  description:
    'Descarga directa de la versión Beta de TravelCab para Usuarios y Conductores. Instalación en 2 minutos con guía paso a paso para Android.',
  openGraph: {
    title: '📲 TravelCab Beta — Descargá la App Oficial',
    description:
      'Elegí tu app (Usuarios o Conductores), descargá el APK y seguí la guía de 3 pasos para instalarlo en tu Android.',
    url: 'https://travelcab.ar/descargas',
    siteName: 'TravelCab',
    type: 'website',
    locale: 'es_AR',
    images: [
      {
        url: '/assets/travelcab_ecosistema.png',
        width: 1200,
        height: 630,
        alt: 'TravelCab Beta — Descargas Oficiales Android',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '📲 TravelCab Beta — Descargá la App Oficial',
    description:
      'Descarga directa de los APK Beta para Usuarios y Conductores con guía paso a paso.',
    images: ['/assets/travelcab_ecosistema.png'],
  },
};

const PUBLIC_APKS = APKS.filter(
  (apk) => apk.id === 'usuario' || apk.id === 'conductor'
);

const CARD_STYLE: Record<
  'usuario' | 'conductor',
  {
    title: string;
    cta: string;
    roleNote: string;
    versionLabel: string;
    iconBox: string;
    iconColor: string;
    btnClass: string;
    badgeClass: string;
  }
> = {
  usuario: {
    title: 'TravelCab Usuarios',
    cta: 'Descargar APK Usuarios',
    roleNote:
      'Para pedir viajes, traslados y probar la experiencia completa de pasajero.',
    versionLabel: 'Beta v8',
    iconBox: 'bg-[#0a2a5b]/10 border-[#0a2a5b]/20',
    iconColor: 'text-[#0a2a5b]',
    btnClass:
      'bg-[#0a2a5b] hover:bg-[#0d3573] text-white shadow-[#0a2a5b]/25',
    badgeClass: 'bg-[#0a2a5b]/10 text-[#0a2a5b] border-[#0a2a5b]/20',
  },
  conductor: {
    title: 'TravelCab Conductores',
    cta: 'Descargar APK Conductores',
    roleNote:
      'Para choferes: recepción de viajes, mapa en vivo y taxímetro digital.',
    versionLabel: 'Beta v8',
    iconBox: 'bg-[#ff5a19]/10 border-[#ff5a19]/25',
    iconColor: 'text-[#ff5a19]',
    btnClass:
      'bg-[#ff5a19] hover:bg-[#e84d10] text-white shadow-[#ff5a19]/25',
    badgeClass: 'bg-[#ff5a19]/10 text-[#ff5a19] border-[#ff5a19]/25',
  },
};

function getApkIcon(iconName: ApkItem['iconName']) {
  return iconName === 'car' ? Car : Smartphone;
}

export default async function DescargasPage({
  searchParams,
}: {
  searchParams?: Promise<{ ref?: string; supervisor?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const supervisorCode = resolvedParams.ref || resolvedParams.supervisor;

  return (
    <div className="min-h-screen bg-slate-50 text-[#0a2a5b] font-sans flex flex-col justify-between selection:bg-[#ff5a19]/20 selection:text-[#0a2a5b] overflow-x-hidden">
      {/* HEADER INSTITUCIONAL (Consistente con travelcab.ar) */}
      <header className="sticky top-0 z-50 w-full bg-[#0a2a5b]/95 backdrop-blur-md text-white border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <Link
            href="/landing/travelcab"
            className="flex items-center shrink-0 focus:outline-none group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/travelcab_blanco.svg"
              alt="TravelCab"
              className="h-9 sm:h-10 w-auto object-contain transition-opacity group-hover:opacity-90"
            />
          </Link>

          <nav className="hidden sm:flex items-center gap-6 text-[13px] text-white/85">
            <a href="#descargas" className="hover:text-white transition-colors">
              Descargas Beta
            </a>
            <a
              href="#guia-instalacion"
              className="hover:text-white transition-colors"
            >
              Cómo Instalar
            </a>
          </nav>

          <Link
            href="/landing/travelcab"
            className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#0a2a5b] hover:bg-slate-100 px-3.5 py-1.5 text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Web TravelCab
          </Link>
        </div>
      </header>

      {/* HERO INSTITUCIONAL CON IMAGEN DE TRAVELCAB */}
      <section className="relative bg-[#0a2a5b] text-white overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/travelcab-descargas-hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a5b]/70 via-[#0a2a5b]/60 to-[#0a2a5b]/90" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-20 sm:pt-14 sm:pb-24 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] sm:text-xs font-bold text-white tracking-wide uppercase backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#ff5a19]" />
            Programa Beta • Testers Android
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Descargá <span className="text-[#ff5a19]">TravelCab</span> en tu celular
          </h1>

          <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Elegí tu perfil y descargá el archivo oficial <strong className="text-white">.APK</strong> en 1 clic. Sin cuentas previas ni Play Store.
          </p>

          <div className="pt-2">
            <ShareLandingBar />
          </div>
        </div>
      </section>

      <main
        id="descargas"
        className="relative z-20 max-w-5xl mx-auto w-full px-4 sm:px-6 -mt-12 sm:-mt-14 pb-16 flex-1"
      >
        {/* Banner de invitación de Supervisor si viene ?ref= */}
        {supervisorCode && (
          <div className="mb-6 max-w-3xl mx-auto bg-white border-2 border-[#ff5a19] rounded-xl p-5 sm:p-6 shadow-xl shadow-slate-200/80">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="p-3 rounded-lg bg-[#ff5a19]/10 border border-[#ff5a19]/25 text-[#ff5a19] shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ff5a19]/10 text-[#ff5a19] font-bold text-[11px] uppercase tracking-wider">
                  Invitación de Flota Oficial
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#0a2a5b]">
                  Código de Supervisor:{' '}
                  <span className="text-[#ff5a19] font-mono px-2 py-0.5 bg-slate-100 rounded-lg border border-slate-200">
                    {supervisorCode}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Descargá <strong className="text-[#0a2a5b]">TravelCab Conductores</strong> e ingresá este código al registrarte para quedar vinculado a tu equipo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2 Tarjetas Principales: Usuarios y Conductores */}
        <section aria-label="Descargas disponibles" className="max-w-3xl mx-auto mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {PUBLIC_APKS.map((apk) => {
              const Icon = getApkIcon(apk.iconName);
              const style = CARD_STYLE[apk.id as 'usuario' | 'conductor'];
              const isHighlighted = Boolean(
                supervisorCode && apk.id === 'conductor'
              );

              return (
                <div
                  key={apk.id}
                  className={`bg-white rounded-xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-xl shadow-slate-200/70 border ${
                    isHighlighted
                      ? 'border-[#ff5a19] ring-2 ring-[#ff5a19]/20'
                      : 'border-slate-200/90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className={`p-3 rounded-lg border ${style.iconBox}`}>
                        <Icon className={`w-7 h-7 ${style.iconColor}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${style.badgeClass}`}
                        >
                          {apk.badge}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                          {style.versionLabel}
                        </span>
                      </div>
                    </div>

                    <h2 className="text-2xl font-black text-[#0a2a5b] mb-2">
                      {style.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                      {style.roleNote}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-600 py-3 px-3.5 rounded-lg bg-slate-50 border border-slate-200/80 mb-5">
                      <span>
                        Peso: <strong className="text-[#0a2a5b]">{apk.size}</strong>
                      </span>
                      <span>
                        Formato:{' '}
                        <strong className="text-[#0a2a5b] font-mono">.APK</strong>
                      </span>
                    </div>
                  </div>

                  <a
                    href={apk.url}
                    download={apk.fileName}
                    className={`w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-lg font-extrabold text-sm sm:text-base transition-all duration-200 shadow-lg active:scale-[0.98] ${style.btnClass}`}
                  >
                    <Download className="w-5 h-5" />
                    {style.cta}
                  </a>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <a
              href="#guia-instalacion"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0a2a5b] hover:text-[#ff5a19] transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-[#ff5a19]" />
              ¿Primera vez instalando un APK? Mirá los 2 carteles de Android abajo
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </a>
          </div>
        </section>

        {/* Guía visual con mockups reales de Android y Play Protect */}
        <div className="mt-10 sm:mt-14">
          <InstallGuideMockups />
        </div>
      </main>

      <footer className="bg-[#0a2a5b] text-white/80 py-6 px-4 text-center text-xs border-t border-white/10">
        TravelCab &copy; {new Date().getFullYear()} — Programa Beta de Testers •{' '}
        <span className="text-white font-semibold">travelcab.ar/descargas</span>
      </footer>
    </div>
  );
}
