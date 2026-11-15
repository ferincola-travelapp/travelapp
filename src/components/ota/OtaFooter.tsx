"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  QrCode,
  Lock,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  X,
  Send,
  AlertTriangle,
  RotateCcw,
  Award,
  FileCheck
} from "lucide-react";

// Íconos SVG oficiales de redes sociales
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.5 12 3.5 12 3.5s-7.518 0-9.388.503a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11C4.482 20.5 12 20.5 12 20.5s7.518 0 9.388-.503a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.032 2.61-.019 3.91-.006.03 1.56.7 2.92 1.94 3.79.79.56 1.7.93 2.65 1.11.01 1.41-.01 2.82.003 4.23-.88-.13-1.74-.46-2.52-.94-.85-.52-1.55-1.24-2.02-2.11v6.92c-.01 1.43-.37 2.85-1.07 4.09-.76 1.34-1.92 2.4-3.32 2.99-1.57.66-3.37.76-5.02.26-1.5-.45-2.83-1.46-3.69-2.82-1-1.58-1.28-3.56-.78-5.38.48-1.76 1.7-3.26 3.34-4.08 1.15-.58 2.44-.81 3.72-.66v4.3c-.76-.23-1.61-.13-2.3.29-.63.39-1.05 1.05-1.16 1.79-.17.99.31 2.05 1.17 2.53.69.39 1.54.43 2.26.11.83-.37 1.39-1.19 1.44-2.1.03-3.64.01-7.28.02-10.93.01-.13.01-.26.01-.39z" />
  </svg>
);

export interface TrustBadgeConfig {
  id: string;
  name: string;
  codeOrImageUrl?: string;
  active: boolean;
}

export interface FooterConfig {
  razonSocial?: string;
  cuit?: string;
  domicilio?: string;
  phone?: string;
  email?: string;
  // Redes con switch
  showFacebook?: boolean;
  facebookUrl?: string;
  showInstagram?: boolean;
  instagramUrl?: string;
  showYoutube?: boolean;
  youtubeUrl?: string;
  showTiktok?: boolean;
  tiktokUrl?: string;
  showLinkedin?: boolean;
  linkedinUrl?: string;
  // Distintivos de confianza cargables desde CMS
  trustBadges?: TrustBadgeConfig[];
}

interface OtaFooterProps {
  config?: FooterConfig;
}

const DEFAULT_TRUST_BADGES: TrustBadgeConfig[] = [
  { id: "arca", name: "ARCA Fiscal", active: true },
  { id: "bases_datos", name: "Bases de Datos (Ley 25.326)", active: true },
  { id: "atavyt", name: "ATAVyT", active: true },
  { id: "faevyt", name: "FAEVYT", active: true },
  { id: "iata", name: "IATA Member", active: true },
];

export function OtaFooter({ config }: OtaFooterProps) {
  const razonSocial = config?.razonSocial || "TravelApp S.A.S.";
  const cuit = config?.cuit || "30-71829304-8";
  const domicilio = config?.domicilio || "San Miguel de Tucumán, Argentina";
  const phone = config?.phone || "0810-220-0018";
  const email = config?.email || "hola@travelapp.ar";

  // Redes: solo se muestran si tienen URL cargada en el CMS
  const fbUrl = config?.facebookUrl?.trim() || "";
  const igUrl = config?.instagramUrl?.trim() || "";
  const ytUrl = config?.youtubeUrl?.trim() || "";
  const ttUrl = config?.tiktokUrl?.trim() || "";
  const liUrl = config?.linkedinUrl?.trim() || "";

  const showFb = config?.showFacebook !== false && fbUrl.length > 0;
  const showIg = config?.showInstagram !== false && igUrl.length > 0;
  const showYt = config?.showYoutube !== false && ytUrl.length > 0;
  const showTt = config?.showTiktok !== false && ttUrl.length > 0;
  const showLi = config?.showLinkedin !== false && liUrl.length > 0;
  const hasAnySocial = showFb || showIg || showYt || showTt || showLi;

  // Distintivos de confianza: ocultos si no tienen código o imagen cargada
  const trustBadges = (config?.trustBadges || []).filter(
    (b) => b.active !== false && Boolean(b.codeOrImageUrl && b.codeOrImageUrl.trim().length > 0)
  );

  // Modales
  const [legalModal, setLegalModal] = useState<{ title: string; content: string } | null>(null);
  const [arrepentimientoModal, setArrepentimientoModal] = useState(false);
  const [arrepentimientoSent, setArrepentimientoSent] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [dni, setDni] = useState("");
  const [reason, setReason] = useState("");

  const handleArrepentimientoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setArrepentimientoSent(true);
    setTimeout(() => {
      setArrepentimientoSent(false);
      setArrepentimientoModal(false);
      setBookingCode("");
      setDni("");
      setReason("");
    }, 3500);
  };

  return (
    <footer className="bg-slate-950 text-white font-sans pt-16 pb-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* FILA PRINCIPAL: 3 COLUMNAS EXACTAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80 items-start">
          
          {/* COLUMNA 1 (IZQUIERDA): LOGO PEQUEÑO + DISTINTIVOS Y QR DE CONFIANZA */}
          <div className="lg:col-span-4 space-y-5">
            {/* Logo TravelApp pequeño pero legible */}
            <Link href="/landing/ecosistema" className="inline-block relative h-8 w-36">
              <Image
                src="/assets/travelapp_blanco.svg"
                alt="TravelApp Logo"
                fill
                className="object-contain object-left"
              />
            </Link>

            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
              Plataforma integral de turismo, paquetes de operadores mayoristas y movilidad urbana de Argentina.
            </p>

            {/* Espacio para Distintivos de Confianza: solo visible si hay códigos/imágenes cargados */}
            {trustBadges.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2.5">
                  Certificaciones & Distintivos de Confianza
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {trustBadges.map((badge) => {
                    const val = (badge.codeOrImageUrl || "").trim();
                    const isImage =
                      val.startsWith("http://") ||
                      val.startsWith("https://") ||
                      val.startsWith("/") ||
                      val.startsWith("data:image");
                    return (
                      <div
                        key={badge.id}
                        className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 hover:border-slate-700 transition-colors"
                      >
                        {isImage ? (
                          <img
                            src={val}
                            alt={badge.name}
                            className="h-7 w-auto max-w-[60px] object-contain rounded bg-white p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                            <FileCheck className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold text-slate-300 leading-tight truncate">
                            {badge.name}
                          </span>
                          {!isImage && (
                            <span className="block text-[9px] font-mono text-slate-400 truncate">
                              {val}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA 2 (CENTRO): SEGUINOS EN NUESTRAS REDES SOCIALES */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center text-center space-y-4 py-4 lg:py-0">
            {hasAnySocial && (
              <>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Seguinos en nuestras redes sociales
                </h4>

                <p className="text-xs text-slate-400 max-w-xs">
                  Enterate antes que nadie de promociones relámpago, cupos de temporada y novedades del ecosistema.
                </p>

                {/* Íconos Oficiales Activables desde CMS (solo con URL cargada) */}
                <div className="flex items-center gap-3 pt-1">
                  {showFb && (
                    <a
                      href={fbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-800 hover:border-blue-500 shadow-md cursor-pointer"
                    >
                      <FacebookIcon className="w-4 h-4" />
                    </a>
                  )}

                  {showIg && (
                    <a
                      href={igUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-pink-600 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-800 hover:border-pink-500 shadow-md cursor-pointer"
                    >
                      <InstagramIcon className="w-4 h-4" />
                    </a>
                  )}

                  {showYt && (
                    <a
                      href={ytUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="YouTube"
                      className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-800 hover:border-red-500 shadow-md cursor-pointer"
                    >
                      <YoutubeIcon className="w-4 h-4" />
                    </a>
                  )}

                  {showTt && (
                    <a
                      href={ttUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                      className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-800 hover:border-slate-600 shadow-md cursor-pointer"
                    >
                      <TiktokIcon className="w-4 h-4" />
                    </a>
                  )}

                  {showLi && (
                    <a
                      href={liUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                      className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-blue-700 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-800 hover:border-blue-600 shadow-md cursor-pointer"
                    >
                      <LinkedinIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </>
            )}

            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-500">
                Atención Telefónica Oficial:{" "}
                <a href={`tel:${phone.replace(/[^0-9]/g, "")}`} className="text-[#FF7A00] font-black hover:underline">
                  {phone}
                </a>
              </span>
            </div>
          </div>

          {/* COLUMNA 3 (DERECHA): POLÍTICA, TÉRMINOS Y BOTÓN DE ARREPENTIMIENTO */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end text-center lg:text-right space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
              Marco Legal & Transparencia
            </h4>

            <div className="space-y-2 text-xs font-semibold w-full max-w-xs">
              <button
                type="button"
                onClick={() =>
                  setLegalModal({
                    title: "Política de Privacidad y Protección de Datos",
                    content:
                      "En TravelApp S.A.S. la confidencialidad de tus datos personales es prioridad absoluta. En estricto cumplimiento de la Ley N° 25.326 de Protección de los Datos Personales de la República Argentina, te garantizamos que la información suministrada es utilizada únicamente para la emisión de pasajes, reservas de hotel, contratación de seguros y gestión de tu cuenta TravelApp Rewards. Tus datos están resguardados en servidores seguros con cifrado de grado bancario. Podés ejercer tus derechos de acceso, rectificación y supresión en cualquier momento mediante solicitud formal a legal@travelapp.ar.",
                  })
                }
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold text-left lg:text-right cursor-pointer"
              >
                Política de Privacidad
              </button>

              <button
                type="button"
                onClick={() =>
                  setLegalModal({
                    title: "Términos y Condiciones Generales de Contratación",
                    content:
                      "Los presentes Términos y Condiciones regulan la intermediación turística de viajes, vuelos, traslados y excursiones provistos por TravelApp S.A.S. Toda contratación de servicios mayoristas, aéreos o de transporte terrestre está sujeta a las condiciones generales de transporte de IATA y la legislación comercial y aeronáutica aplicable. Las tarifas publicadas están expresadas con los tributos e impuestos vigentes de acuerdo con la legislación argentina. Los puntos Rewards acumulados no tienen valor monetario transferible fuera del ecosistema.",
                  })
                }
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold text-left lg:text-right cursor-pointer"
              >
                Términos y Condiciones
              </button>

              {/* BOTÓN DE ARREPENTIMIENTO (LEY DE DEFENSA DEL CONSUMIDOR - RES. 424/2020) */}
              <button
                type="button"
                onClick={() => setArrepentimientoModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-800/60 text-red-300 hover:text-red-100 transition-all text-xs font-black text-left lg:text-right flex items-center justify-between lg:justify-end gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                <span>Botón de Arrepentimiento</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed pt-1">
              Conforme Resolución 424/2020 de la Secretaría de Comercio Interior: revocación directa de compras dentro de los 10 días corridos de contratado el servicio.
            </p>
          </div>
        </div>

        {/* AL PIE: DATOS LEGALES, DOMICILIO Y CONTACTO */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <div className="text-center md:text-left space-y-1">
            <p className="font-bold text-slate-300">
              {razonSocial} · CUIT: {cuit}
            </p>
            <p className="text-[11px] text-slate-500">
              Domicilio: {domicilio} · Tel: {phone} · Email: {email}
            </p>
          </div>

          <div className="text-center md:text-right text-[11px] text-slate-500 font-bold">
            Todos los derechos reservados por TravelApp s.a.s. - 2026
          </div>
        </div>
      </div>

      {/* MODAL LEGAL (POLÍTICA / TÉRMINOS) */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-8 text-white relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setLegalModal(null)}
              aria-label="Cerrar modal"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg sm:text-xl font-black mb-4 text-[#FF7A00] pr-8">{legalModal.title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pr-2">
              {legalModal.content}
            </p>
          </div>
        </div>
      )}

      {/* MODAL BOTÓN DE ARREPENTIMIENTO */}
      {arrepentimientoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-900/60 rounded-3xl max-w-lg w-full p-5 sm:p-8 text-white relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setArrepentimientoModal(false)}
              aria-label="Cerrar modal"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold w-fit mb-3">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revocación de Compra Online (Ley 24.240)</span>
            </div>

            <h3 className="text-xl font-black mb-2">Formulario de Arrepentimiento</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Tenés derecho a revocar la contratación dentro de los 10 días corridos contados a partir de la fecha de compra, sin costo ni penalidad alguna.
            </p>

            {arrepentimientoSent ? (
              <div className="p-6 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-black text-emerald-200">¡Solicitud de Revocación Recibida!</h4>
                <p className="text-xs text-emerald-300">
                  Hemos generado tu código de cancelación y te enviamos la confirmación a tu correo. El reembolso se procesará por el mismo medio de pago.
                </p>
              </div>
            ) : (
              <form onSubmit={handleArrepentimientoSubmit} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Código de Reserva / Localizador *</label>
                  <input
                    type="text"
                    required
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value)}
                    placeholder="Ej. OTA-PKG-8823 o TRP-9021"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">DNI o CUIT del Titular *</label>
                  <input
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Ej. 34.567.890"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Motivo (Opcional)</label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Contanos brevemente el motivo de la cancelación..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Confirmar Revocación de Compra
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
