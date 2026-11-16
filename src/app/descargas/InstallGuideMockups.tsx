import React from 'react';
import {
  Download,
  ShieldAlert,
  Settings,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  FileWarning,
  Smartphone,
} from 'lucide-react';

export function InstallGuideMockups() {
  return (
    <section
      id="guia-instalacion"
      aria-labelledby="guia-instalacion-title"
      className="scroll-mt-20"
    >
      <div className="text-center space-y-2.5 mb-8">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#ff5a19]/10 border border-[#ff5a19]/25 text-[#ff5a19] text-[11px] font-bold uppercase tracking-wider">
          Guía rápida para Testers Android
        </span>
        <h2
          id="guia-instalacion-title"
          className="text-2xl sm:text-3xl font-black text-[#0a2a5b] tracking-tight"
        >
          ¿Cómo instalar el <span className="text-[#ff5a19]">.APK</span> sin trabas?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Como es una versión <strong className="text-[#0a2a5b]">Beta</strong> previa a Google Play Store, Android muestra{' '}
          <strong className="text-[#ff5a19]">2 avisos de seguridad</strong> normales. Seguí estos 3 pasos tal como aparecen en tu pantalla:
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PASO 1: Descarga en Chrome / WhatsApp */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-lg shadow-slate-200/60">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-[#0a2a5b] text-white font-black text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#0a2a5b] leading-tight">
                  Descargá y abrí el archivo
                </h3>
                <p className="text-[11px] text-slate-500">
                  Aviso inicial del navegador
                </p>
              </div>
            </div>

            {/* Mockup real estilo Chrome Android */}
            <div className="rounded-lg bg-slate-50 text-slate-900 p-4 border border-slate-200 mb-4 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <FileWarning className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">
                    ¿Descargar archivo de todos modos?
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Es posible que <span className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-slate-200">travelapp.apk</span> sea dañino.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                <span className="px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  Cancelar
                </span>
                <span className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-sm ring-2 ring-[#ff5a19] ring-offset-2 ring-offset-slate-50">
                  Descargar de todos modos
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
            <Download className="w-4 h-4 text-[#0a2a5b] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tocá <strong className="text-[#0a2a5b]">Descargar de todos modos</strong>. Al terminar, tocá <strong className="text-[#ff5a19]">Abrir</strong> en la notificación de arriba o en <em>Descargas</em>.
            </p>
          </div>
        </div>

        {/* PASO 2: Cartel 1 - Fuentes desconocidas */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-lg shadow-slate-200/60">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-[#ff5a19] text-white font-black text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#0a2a5b] leading-tight">
                  Cartel 1: Permiso de Android
                </h3>
                <p className="text-[11px] text-[#ff5a19] font-semibold">
                  Instalar apps desconocidas
                </p>
              </div>
            </div>

            {/* Mockup real diálogo Android */}
            <div className="space-y-2.5 mb-4">
              <div className="rounded-lg bg-slate-50 text-slate-900 p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <p className="text-xs font-bold text-slate-900">
                    Por tu seguridad
                  </p>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug mb-3">
                  Tu teléfono no tiene permitido instalar apps desconocidas desde esta fuente.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <span className="px-2.5 py-1 text-[11px] font-medium text-slate-500">
                    Cancelar
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-sm ring-2 ring-[#ff5a19] ring-offset-2 ring-offset-slate-50">
                    <Settings className="w-3 h-3" />
                    Configuración
                  </span>
                </div>
              </div>

              {/* Mini toggle de Android */}
              <div className="rounded-xl bg-slate-50 text-slate-900 px-3.5 py-2.5 flex items-center justify-between border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-800">
                  Permitir desde esta fuente
                </span>
                <div className="w-9 h-5 rounded-full bg-emerald-500 p-0.5 flex justify-end items-center shadow-inner">
                  <div className="w-4 h-4 rounded-full bg-white shadow" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
            <ArrowRight className="w-4 h-4 text-[#ff5a19] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tocá <strong className="text-[#0a2a5b]">Configuración</strong>, activá <strong className="text-[#ff5a19]">Permitir desde esta fuente</strong>, volvé atrás y tocá <strong className="text-[#0a2a5b]">Instalar</strong>.
            </p>
          </div>
        </div>

        {/* PASO 3: Cartel 2 - Google Play Protect */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-lg shadow-slate-200/60">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-[#0a2a5b] text-white font-black text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#0a2a5b] leading-tight">
                  Cartel 2: Google Play Protect
                </h3>
                <p className="text-[11px] text-sky-700 font-semibold">
                  App bloqueada / Analizar app
                </p>
              </div>
            </div>

            {/* Mockup real Google Play Protect */}
            <div className="rounded-lg bg-slate-50 text-slate-900 p-4 border border-slate-200 shadow-sm mb-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    Play Protect no reconoce a este desarrollador
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Google Play Protect
                  </p>
                </div>
              </div>

              <div className="my-2.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-700">
                  1° Tocá: Más detalles
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-blue-700" />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-500 text-emerald-800 text-[11px] font-bold">
                  2° Instalar de todos modos
                </span>
                <span className="px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold">
                  Entendido
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tocá <strong className="text-[#0a2a5b]">Más detalles</strong> y luego <strong className="text-emerald-700">Instalar de todos modos</strong>. Si te pide <strong className="text-[#0a2a5b]">Analizar app</strong>, aceptalo y luego instalá.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
