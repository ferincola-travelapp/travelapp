"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Smartphone,
  Download,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin,
  QrCode,
  BellRing
} from "lucide-react";

interface OtaAppSectionProps {
  showPlayStore?: boolean;
  showAppStore?: boolean;
  playStoreUrl?: string;
  appStoreUrl?: string;
  titulo?: string;
  subtitulo?: string;
  appPreviewImageUrl?: string;
}

export function OtaAppSection({
  showPlayStore = false,
  showAppStore = false,
  playStoreUrl = "",
  appStoreUrl = "",
  titulo,
  subtitulo,
  appPreviewImageUrl = "",
}: OtaAppSectionProps) {
  const hasPlayStore = Boolean(showPlayStore && playStoreUrl && playStoreUrl.trim() !== "" && playStoreUrl !== "#");
  const hasAppStore = Boolean(showAppStore && appStoreUrl && appStoreUrl.trim() !== "" && appStoreUrl !== "#");
  const hasCustomPreview = Boolean(appPreviewImageUrl && appPreviewImageUrl.trim() !== "");
  return (
    <section id="app" className="py-14 sm:py-24 bg-white font-sans overflow-hidden border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* Columna Izquierda: Información de la App & Descargas */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-100 border border-slate-200 text-[#0A2A5B] text-xs font-extrabold uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-[#0A2A5B]" />
              <span>TravelApp en tu Celular</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {titulo || "Toda tu experiencia de viaje en la palma de tu mano"}
            </h2>

            <p className="text-sm sm:text-lg text-slate-600 font-medium leading-relaxed">
              {subtitulo ||
                "Descargá la aplicación oficial de TravelApp. Pedí traslados en TravelCab en segundos, consultá tus vouchers de vuelo y hotel sin conexión a internet y canjeá tus puntos Rewards en comercios adheridos."}
            </p>

            {/* Bullets de Valor (Iconos monocromáticos en azul corporativo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-left">
              <div className="flex items-start gap-3 p-3.5 rounded-sm bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-sm bg-[#0A2A5B] text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Seguimiento en Vivo</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Mirá la ubicación de tu móvil TravelCab y el punto de encuentro de tus tours.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-sm bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-sm bg-[#0A2A5B] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Vouchers 100% Offline</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Accedé a tus pasajes y reservas de hotel incluso sin señal o en el avión.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-sm bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-sm bg-[#0A2A5B] text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Billetera de Puntos</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Generá tu código QR en caja para pagar con puntos Rewards en restaurantes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-sm bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-sm bg-[#0A2A5B] text-white flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Alertas de Vuelo</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Avisos automáticos de cambios de puerta, embarque y demoras en tu celular.</p>
                </div>
              </div>
            </div>

            {/* Botones de Descarga y CTA de Registro */}
            <div className="pt-2 sm:pt-4 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center sm:justify-start gap-2.5 sm:gap-3">
                {hasPlayStore && (
                  <a
                    href={playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 px-5 py-2.5 sm:py-3 rounded-sm bg-slate-900 hover:bg-slate-800 text-white transition-colors group cursor-pointer"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                    </svg>
                    <div className="text-left">
                      <span className="block text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase leading-none">Disponible en</span>
                      <span className="block text-xs font-black leading-tight mt-0.5">Google Play</span>
                    </div>
                  </a>
                )}

                {hasAppStore && (
                  <a
                    href={appStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 px-5 py-2.5 sm:py-3 rounded-sm bg-slate-900 hover:bg-slate-800 text-white transition-colors group cursor-pointer"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.09,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.13,16.69C20.1,16.79 19.71,18.14 18.71,19.5M15.97,4.88C16.65,4.06 17.11,2.92 16.98,1.77C15.97,1.81 14.77,2.45 14.06,3.28C13.43,4 12.88,5.16 13.03,6.29C14.15,6.38 15.29,5.7 15.97,4.88Z" />
                    </svg>
                    <div className="text-left">
                      <span className="block text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase leading-none">Descargar de</span>
                      <span className="block text-xs font-black leading-tight mt-0.5">App Store</span>
                    </div>
                  </a>
                )}

                <Link
                  href="/registro"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-black text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <span>Crear Cuenta Gratis</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                Registro 100% gratuito. Al crear tu cuenta recibís 500 puntos de bienvenida en Rewards.
              </p>
            </div>
          </div>

          {/* Columna Derecha: Mockup del Smartphone (con imagen real editable desde CMS) */}
          <div className="lg:col-span-5 flex justify-center w-full overflow-hidden py-2">
            <div className="relative w-[270px] xs:w-72 sm:w-80 h-[520px] sm:h-[580px] bg-slate-900 rounded-[40px] sm:rounded-[48px] p-3 sm:p-3.5 shadow-2xl border-4 border-slate-800 sm:ring-8 lg:ring-12 ring-slate-100 max-w-full">
              {/* Parlante / Cámara Superior */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-30"></div>

              {/* Pantalla de la App */}
              {hasCustomPreview ? (
                <div className="w-full h-full bg-white rounded-[38px] overflow-hidden relative">
                  <img
                    src={appPreviewImageUrl}
                    alt="Vista real de TravelApp Mobile"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-slate-50 rounded-[38px] overflow-hidden flex flex-col pt-8 relative text-slate-800 font-sans">
                  {/* Header App */}
                  <div className="bg-[#0A2A5B] p-4 text-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-200">¡Hola, Viajero!</span>
                      <span className="text-[10px] font-extrabold bg-white text-[#0A2A5B] px-2 py-0.5 rounded-sm">1.450 Pts</span>
                    </div>
                    <h4 className="text-base font-black">Próximo Viaje: Bariloche</h4>
                    <p className="text-[10px] text-slate-300">Vuelo AR 1682 · Puerta 4 · A tiempo</p>
                  </div>

                  {/* Contenido App */}
                  <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
                    {/* Tarjeta de Servicio Activo */}
                    <div className="bg-white p-3 rounded-sm border border-slate-200">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                        <span>TRAVELCAB MOVILIDAD</span>
                        <span className="text-[#0A2A5B] font-extrabold">Chofer Asignado</span>
                      </div>
                      <p className="text-xs font-black text-slate-900">Volkswagen Gol Trend · AB 123 CD</p>
                      <p className="text-[10px] text-slate-500">Conductor: Carlos M. (Llegada en 4 min)</p>
                    </div>

                    {/* Novedades / Rewards */}
                    <div className="bg-slate-100 p-3 rounded-sm border border-slate-200">
                      <div className="flex items-center gap-1 text-[10px] font-black text-[#0A2A5B] uppercase">
                        <Sparkles className="w-3 h-3 text-[#0A2A5B]" /> Beneficio Activo
                      </div>
                      <h5 className="text-xs font-black text-slate-900 mt-1">20% OFF en Gastronomía</h5>
                      <p className="text-[10px] text-slate-600 mt-0.5">Presentá tu QR en restaurantes de Bariloche.</p>
                    </div>

                    {/* Vouchers Disponibles */}
                    <div className="bg-white p-3 rounded-sm border border-slate-200 space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tus Vouchers Offline</span>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-50 p-2 rounded-sm">
                        <span>Boarding Pass Vuelo</span>
                        <span className="text-[10px] text-[#0A2A5B] font-black">Ver QR</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-50 p-2 rounded-sm">
                        <span>Hotel Edelweiss 4★</span>
                        <span className="text-[10px] text-[#0A2A5B] font-black">Confirmado</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra Inferior Simulada */}
                  <div className="bg-white border-t border-slate-200 py-2.5 px-4 flex justify-around text-slate-400 text-[10px] font-bold">
                    <span className="text-[#0A2A5B] font-black">Inicio</span>
                    <span>Viajes</span>
                    <span>TravelCab</span>
                    <span>Puntos</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
