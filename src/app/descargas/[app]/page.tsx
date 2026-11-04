import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Smartphone, Car, ShieldCheck, Download, CheckCircle2, AlertCircle, UserCheck, ArrowLeft } from 'lucide-react';
import { findApkBySlug } from '../apkConfig';
import AutoDownloadTrigger from './AutoDownloadTrigger';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app } = await params;
  const apk = findApkBySlug(app);

  if (!apk) {
    return {
      title: 'Descargas — TravelApp',
    };
  }

  return {
    title: `Descargar ${apk.name} — Instalación Directa (APK)`,
    description: `${apk.subtitle} Descarga directa 1 clic para Android (${apk.size}) sin pasar por Expo.`,
    openGraph: {
      title: `📲 Descargar ${apk.name} (APK Oficial)`,
      description: `${apk.subtitle} Tocá para descargar e instalar directamente en tu celular Android.`,
      type: 'website',
    },
  };
}

function getIconComponent(iconName: 'smartphone' | 'car' | 'shield') {
  if (iconName === 'car') return Car;
  if (iconName === 'shield') return ShieldCheck;
  return Smartphone;
}

export default async function SingleApkDownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ app: string }>;
  searchParams?: Promise<{ ref?: string; supervisor?: string }>;
}) {
  const { app } = await params;
  const apk = findApkBySlug(app);

  if (!apk) {
    notFound();
  }

  const resolvedSearch = searchParams ? await searchParams : {};
  const supervisorCode = resolvedSearch.ref || resolvedSearch.supervisor;
  const Icon = getIconComponent(apk.iconName);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-emerald-500/15 via-blue-500/10 to-transparent blur-3xl rounded-full" />
      </div>

      <main className="relative max-w-xl mx-auto w-full px-4 sm:px-6 py-12 flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-emerald-400 tracking-wide uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" /> Descarga Oficial Directa — {apk.badge}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {apk.name}
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Instalador oficial para Android. Descarga en 1 clic sin cuenta de Expo.
          </p>
        </div>

        {/* Supervisor Invitation Banner if ref present */}
        {supervisorCode && (
          <div className="mb-6 bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-5 backdrop-blur-md shadow-2xl shadow-amber-950/20">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                  Vinculación de Flota Oficial
                </div>
                <h2 className="text-base font-bold text-white">
                  Código de Supervisor: <span className="text-amber-400 font-mono">{supervisorCode}</span>
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Al abrir la aplicación, ingresá este código durante tu alta de conductor para quedar vinculado a tu flota.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Exclusive Card for the Selected App */}
        <div className="bg-slate-900/90 rounded-3xl p-7 border border-slate-800 shadow-2xl shadow-black/60 backdrop-blur-md mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className={`p-3.5 rounded-2xl border ${apk.iconBg}`}>
              <Icon className={`w-7 h-7 ${apk.iconColor}`} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-200">
              {apk.badge}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{apk.name}</h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">{apk.subtitle}</p>

          <div className="flex items-center justify-between text-xs text-slate-400 py-3.5 border-y border-slate-800/80 mb-6">
            <span>
              Archivo: <strong className="text-slate-200 font-mono">{apk.fileName}</strong>
            </span>
            <span>
              Tamaño: <strong className="text-slate-200">{apk.size}</strong>
            </span>
            <span>
              Versión: <strong className="text-slate-200">{apk.version}</strong>
            </span>
          </div>

          <a
            href={apk.url}
            download={apk.fileName}
            className={`w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-bold text-base text-white bg-gradient-to-r ${apk.btnGradient} transition-all duration-200 shadow-lg active:scale-95`}
          >
            <Download className="w-5 h-5 animate-bounce" />
            Descargar {apk.name} (.APK)
          </a>

          <AutoDownloadTrigger url={apk.url} fileName={apk.fileName} />
        </div>

        {/* Instructions banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm mb-6">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs text-slate-300">
              <h3 className="font-semibold text-white text-sm">Cómo instalar en Android:</h3>
              <p className="text-slate-400 leading-relaxed">
                1. Abrí el archivo <strong>{apk.fileName}</strong> una vez descargado.<br />
                2. Si Android solicita permiso para <em>&quot;Instalar apps desconocidas&quot;</em>, tocá <strong>Configuración → Permitir de esta fuente</strong> y luego <strong>Instalar</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/descargas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Ver todas las aplicaciones del ecosistema
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-400">
        TravelApp Ecosystem &copy; {new Date().getFullYear()} — travelapp.ar
      </footer>
    </div>
  );
}
