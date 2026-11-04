import React from 'react';
import Link from 'next/link';
import { Smartphone, Car, ShieldCheck, Download, CheckCircle2, AlertCircle, UserCheck } from 'lucide-react';

export const metadata = {
  title: 'Descargas de APKs — TravelApp Testing',
  description: 'Descarga directa de aplicaciones para testers de TravelApp: Pasajero, Conductor y Supervisor.',
};

const APKS = [
  {
    id: 'usuario',
    name: 'TravelApp Pasajero',
    subtitle: 'App de usuarios para pedir viajes en tiempo real y traslados',
    version: '1.0.0 (Prod Ready OTA)',
    size: '96.4 MB',
    icon: Smartphone,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    btnGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50',
    url: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-usuario.apk?alt=media&token=f4664ee8-e1f4-4e61-97df-8effa1b8d0c8',
    badge: 'Pasajeros'
  },
  {
    id: 'conductor',
    name: 'TravelApp Conductor',
    subtitle: 'Recepción de viajes, telemetría y Taxímetro Digital',
    version: '1.0.0 (Prod Ready OTA)',
    size: '92.2 MB',
    icon: Car,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    btnGradient: 'from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-950/50',
    url: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-conductor.apk?alt=media&token=3136322a-771f-4ac0-909e-e47703685dda',
    badge: 'Conductores'
  },
  {
    id: 'supervisor',
    name: 'TravelApp Supervisor',
    subtitle: 'Monitoreo de flota en vivo con mapa satelital Leaflet y gestión',
    version: '1.0.0 (Prod Ready OTA)',
    size: '92.1 MB',
    icon: ShieldCheck,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    btnGradient: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-950/50',
    url: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-supervisor.apk?alt=media&token=6c9548ca-06f0-45eb-89c3-78a69f8f5069',
    badge: 'Supervisión'
  }
];

export default async function DescargasPage({
  searchParams,
}: {
  searchParams?: Promise<{ ref?: string; supervisor?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const supervisorCode = resolvedParams.ref || resolvedParams.supervisor;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-emerald-500/15 via-blue-500/10 to-transparent blur-3xl rounded-full" />
      </div>

      <main className="relative max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex-1">
        {/* Header */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-emerald-400 tracking-wide uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ecosistema TravelApp — APKs Oficiales
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Descargas de Prueba <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">1 Clic</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Descarga directa de los paquetes APK para Android. No requiere cuenta de Expo ni inicio de sesión previo.
          </p>
        </div>

        {/* Supervisor Invitation Banner if ref present */}
        {supervisorCode && (
          <div className="mb-10 bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-7 backdrop-blur-md shadow-2xl shadow-amber-950/20">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                <UserCheck className="w-7 h-7" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  Vinculación de Flota Oficial
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Invitación de Supervisor asignada
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Estás ingresando con el código de supervisor: <strong className="text-amber-400 font-mono text-base px-2 py-0.5 bg-slate-950 rounded border border-amber-500/30">{supervisorCode}</strong>.
                  Descargá la app <strong className="text-white">TravelApp Conductor</strong> a continuación para completar tu alta de chofer bajo este equipo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {APKS.map((apk) => {
            const Icon = apk.icon;
            const isDriver = apk.id === 'conductor';
            const isHighlighted = Boolean(supervisorCode && isDriver);

            return (
              <div
                key={apk.id}
                className={`group relative bg-slate-900/80 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60 backdrop-blur-md border ${
                  isHighlighted 
                    ? 'border-amber-500/80 ring-2 ring-amber-500/30 shadow-xl shadow-amber-950/40 bg-slate-900' 
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-3 rounded-2xl border ${apk.iconBg}`}>
                      <Icon className={`w-6 h-6 ${apk.iconColor}`} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300">
                      {apk.badge}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white mb-1.5 group-hover:text-emerald-300 transition-colors">
                    {apk.name}
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {apk.subtitle}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 py-3 border-t border-slate-800/80 mb-6">
                    <span>Tamaño: <strong className="text-slate-200">{apk.size}</strong></span>
                    <span>Versión: <strong className="text-slate-200">{apk.version}</strong></span>
                  </div>
                </div>

                <a
                  href={apk.url}
                  download
                  className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r ${apk.btnGradient} transition-all duration-200 shadow-lg active:scale-95`}
                >
                  <Download className="w-4 h-4 animate-bounce" />
                  Descargar APK Directo
                </a>
              </div>
            );
          })}
        </div>

        {/* Instructions banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-slate-300">
              <h3 className="font-semibold text-white text-sm">Instalación en dispositivos Android:</h3>
              <p className="text-slate-400 leading-relaxed">
                Al descargar el archivo APK, Android puede solicitar confirmación (&quot;Permitir descarga de fuentes desconocidas&quot; o &quot;Instalar app desconocida&quot;). Haz clic en <strong>Aceptar / Permitir</strong> para completar la instalación sin inconvenientes.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-400">
        TravelApp Ecosystem &copy; {new Date().getFullYear()} — Entorno de Pruebas y Certificación
      </footer>
    </div>
  );
}
