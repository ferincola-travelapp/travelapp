"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  QrCode,
  ShieldCheck,
  X,
  FileText,
  AlertCircle,
  Send,
} from "lucide-react";

export interface ExperienceFooterConfig {
  description?: string;
  email?: string;
  phone?: string;
  whatsappUrl?: string;
  whatsappDisplay?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  arcaQr?: string;
  atavyt?: string;
  baseDatosSello?: string;
  privacidad?: string;
  terminos?: string;
  copyrightText?: string;
}

interface ExperienceFooterProps {
  config?: ExperienceFooterConfig;
  onOpenQuienesSomos?: () => void;
  onOpenContacto?: () => void;
  onSelectSearchMode?: (mode: "excursiones" | "traslados") => void;
}

export function ExperienceFooter({
  config,
  onOpenQuienesSomos,
  onOpenContacto,
  onSelectSearchMode,
}: ExperienceFooterProps) {
  const [modalType, setModalType] = useState<
    "privacidad" | "terminos" | "arrepentimiento" | null
  >(null);
  const [arrepentimientoCode, setArrepentimientoCode] = useState("");
  const [arrepentimientoEmail, setArrepentimientoEmail] = useState("");
  const [arrepentimientoSent, setArrepentimientoSent] = useState(false);

  const description =
    config?.description ||
    "Ecosistema integral de turismo receptivo, movilidad y experiencias en destino.";
  const email = config?.email?.trim() || "hola@travelapp.ar";
  const phone = config?.phone?.trim() || "0810-220-0018";
  const phoneHref = `tel:${phone.replace(/[^+\d]/g, "") || "08102200018"}`;
  const whatsappUrl = config?.whatsappUrl?.trim() || "https://wa.me/5493812000712";
  const whatsappDisplay = config?.whatsappDisplay?.trim() || "+54 9 381 200-0712";
  const copyrightText =
    config?.copyrightText ||
    "Copyright © 2026 TravelApp Ecosistema. Todos los derechos reservados.";

  // Si se pasa config explícita, ocultar redes vacías; si no hay config, mostrar defaults
  const hasConfig = Boolean(config);
  const facebookUrl = hasConfig ? (config?.facebookUrl?.trim() || "") : "https://facebook.com/travelapp.ar";
  const instagramUrl = hasConfig ? (config?.instagramUrl?.trim() || "") : "https://instagram.com/travelapp.ar";
  const tiktokUrl = hasConfig ? (config?.tiktokUrl?.trim() || "") : "https://tiktok.com/@travelapp.ar";
  const youtubeUrl = hasConfig ? (config?.youtubeUrl?.trim() || "") : "https://youtube.com/@travelapp_ar";
  const linkedinUrl = hasConfig ? (config?.linkedinUrl?.trim() || "") : "https://linkedin.com/company/travelapp-sas";

  const arcaQr = config?.arcaQr?.trim() || "";
  const isArcaHtml = arcaQr.includes("<") && arcaQr.includes(">");
  const isArcaImg = /^https?:\/\/|^data:image\/|^\//i.test(arcaQr);

  const handleArrepentimientoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setArrepentimientoSent(true);
    setTimeout(() => {
      setArrepentimientoSent(false);
      setModalType(null);
    }, 3000);
  };

  return (
    <footer className="w-full bg-[#0a2a5b] text-white/85 font-sans border-t border-white/10">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-12">
        
        {/* 1. DIRECTORIO PRINCIPAL ESTILO APPLE (Columnas limpias de 12px) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/15">
          
          {/* Columna Marca: Logo Ecosistema TravelApp + Redes Sociales */}
          <div className="md:col-span-4 space-y-5">
            <Link href="/landing/ecosistema" className="inline-block">
              <Image
                src="/assets/travelapp_blanco.svg"
                alt="TravelApp Ecosistema"
                width={185}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </Link>

            <p className="text-[12px] text-white/65 leading-relaxed max-w-xs">
              {description}
            </p>

            {/* Iconos de Redes Sociales (solo se muestran las configuradas en CMS) */}
            {(facebookUrl || instagramUrl || tiktokUrl || youtubeUrl || linkedinUrl) && (
              <div className="flex items-center gap-2.5 pt-1">
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#1877F2] transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                  </a>
                )}

                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#E1306C] transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}

                {tiktokUrl && (
                  <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-black transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </a>
                )}

                {youtubeUrl && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#FF0000] transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                )}

                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#0A66C2] transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Columna Secciones */}
          <div className="md:col-span-2 space-y-2.5 text-[12px]">
            <h4 className="font-semibold text-white tracking-tight">
              Secciones
            </h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenQuienesSomos?.()}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Nosotros
                </button>
              </li>
              <li>
                <a
                  href="#catalogo-excursiones"
                  onClick={() => onSelectSearchMode?.("excursiones")}
                  className="hover:text-white transition-colors"
                >
                  Experiencias
                </a>
              </li>
              <li>
                <a
                  href="#buscador-experience"
                  onClick={() => onSelectSearchMode?.("traslados")}
                  className="hover:text-white transition-colors"
                >
                  Traslados
                </a>
              </li>
              <li>
                <Link
                  href="/landing/experience/marketplace"
                  className="hover:text-white transition-colors"
                >
                  Travel Market
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-white transition-colors"
                >
                  Login / Registro
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna Contacto Directo */}
          <div className="md:col-span-3 space-y-2.5 text-[12px]">
            <h4 className="font-semibold text-white tracking-tight">
              Atención y Contacto
            </h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <a
                  href={`mailto:${email}`}
                  className="hover:text-white transition-colors"
                >
                  Contacto: <span className="text-white">{email}</span>
                </a>
              </li>
              <li>
                <a
                  href={phoneHref}
                  className="hover:text-white transition-colors"
                >
                  Teléfono: <span className="text-white">{phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp (Travis):{" "}
                  <span className="text-white">{whatsappDisplay}</span>
                </a>
              </li>
              <li className="pt-1">
                <button
                  type="button"
                  onClick={() => onOpenContacto?.()}
                  className="hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  Formulario de contacto
                </button>
              </li>
            </ul>
          </div>

          {/* Columna Legales y Botón de Arrepentimiento */}
          <div className="md:col-span-3 space-y-2.5 text-[12px]">
            <h4 className="font-semibold text-white tracking-tight">
              Legales
            </h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <button
                  type="button"
                  onClick={() => setModalType("privacidad")}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Política de privacidad
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setModalType("terminos")}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Términos y condiciones de uso de la app
                </button>
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => setModalType("arrepentimiento")}
                  className="px-4 py-2 rounded-full border border-white/30 hover:border-white text-white text-[12px] font-normal transition-colors cursor-pointer"
                >
                  Botón de arrepentimiento
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* 2. BARRA INSTITUCIONAL: QR ARCA + ATAVyT + BASE DE DATOS */}
        <div className="py-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Espacio Código QR ARCA */}
            <div className="flex items-center gap-2.5">
              {isArcaHtml ? (
                <div
                  className="bg-white rounded-lg p-1 flex items-center justify-center [&_img]:h-10 [&_img]:w-auto [&_img]:object-contain"
                  dangerouslySetInnerHTML={{ __html: arcaQr }}
                />
              ) : isArcaImg ? (
                <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={arcaQr} alt="QR ARCA" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                  <QrCode className="w-8 h-8 text-[#0a2a5b]" />
                </div>
              )}
              <div className="text-[11px] leading-tight">
                <div className="font-semibold text-white">Inscripción ARCA</div>
                <div className="text-white/60">Data Fiscal Oficial</div>
              </div>
            </div>

            {/* Espacio Logo ATAVyT */}
            {(!hasConfig || config?.atavyt !== "") && (
              <div className="flex items-center gap-2.5 pl-6 border-l border-white/15">
                {config?.atavyt && /^https?:\/\/|^data:image\/|^\//i.test(config.atavyt.trim()) ? (
                  <img src={config.atavyt.trim()} alt="ATAVyT" className="h-8 w-auto object-contain rounded bg-white p-1" />
                ) : (
                  <div className="px-2.5 py-1.5 rounded bg-white/10 border border-white/20 text-[11px] font-semibold text-white tracking-tight">
                    {config?.atavyt?.trim() || "ATAVyT"}
                  </div>
                )}
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold text-white">Socio Activo</div>
                  <div className="text-white/60">Agencias de Viajes y Turismo</div>
                </div>
              </div>
            )}

            {/* Espacio Base de Datos */}
            {(!hasConfig || config?.baseDatosSello !== "") && (
              <div className="flex items-center gap-2.5 pl-6 border-l border-white/15">
                {config?.baseDatosSello && /^https?:\/\/|^data:image\/|^\//i.test(config.baseDatosSello.trim()) ? (
                  <img src={config.baseDatosSello.trim()} alt="RNBD" className="h-8 w-auto object-contain rounded bg-white p-1" />
                ) : (
                  <div className="px-2.5 py-1.5 rounded bg-white/10 border border-white/20 text-[11px] font-semibold text-white tracking-tight">
                    RNBD
                  </div>
                )}
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold text-white">Base de Datos</div>
                  <div className="text-white/60">Ley N° 25.326 PDP</div>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-white/50">
            {copyrightText}
          </div>
        </div>
      </div>

      {/* MODALES LEGALES */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-[#1d1d1f] animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {modalType === "privacidad" && (
              <div>
                <h3 className="text-xl font-semibold mb-3 text-[#1d1d1f]">
                  Política de Privacidad
                </h3>
                {config?.privacidad?.trim() ? (
                  <div className="text-sm text-[#86868b] leading-relaxed whitespace-pre-line">
                    {config.privacidad}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-[#86868b] leading-relaxed">
                    <p>
                      En <strong className="text-[#1d1d1f]">TravelApp Ecosistema</strong> protegemos los datos personales de nuestros usuarios conforme a la Ley N° 25.326 de Protección de Datos Personales.
                    </p>
                    <p>
                      La información recabada en las reservas de excursiones y traslados se utiliza exclusivamente para la coordinación operativa, emisión de seguros y facturación ante ARCA.
                    </p>
                  </div>
                )}
              </div>
            )}

            {modalType === "terminos" && (
              <div>
                <h3 className="text-xl font-semibold mb-3 text-[#1d1d1f]">
                  Términos y Condiciones de Uso de la App
                </h3>
                {config?.terminos?.trim() ? (
                  <div className="text-sm text-[#86868b] leading-relaxed whitespace-pre-line">
                    {config.terminos}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-[#86868b] leading-relaxed">
                    <p>
                      <strong className="text-[#1d1d1f]">1. Tiempo de Reserva:</strong> Toda reserva respeta el plazo de confirmación y pago configurado según la anticipación del servicio.
                    </p>
                    <p>
                      <strong className="text-[#1d1d1f]">2. Operatoria Oficial:</strong> Todos los servicios son operados con vehículos habilitados y guías matriculados.
                    </p>
                  </div>
                )}
              </div>
            )}

            {modalType === "arrepentimiento" && (
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#1d1d1f]">
                  Botón de Arrepentimiento
                </h3>
                <p className="text-xs text-[#86868b] mb-4">
                  Conforme a la Ley 24.240 y Resolución 424/2020, podés solicitar la revocación de tu compra o reserva dentro de los 10 días corridos desde su realización.
                </p>

                {arrepentimientoSent ? (
                  <div className="py-6 text-center space-y-2 bg-[#f5f5f7] rounded-2xl p-4">
                    <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="text-sm font-semibold text-[#1d1d1f]">
                      Solicitud Registrada
                    </div>
                    <div className="text-xs text-[#86868b]">
                      Recibirás el comprobante en tu correo electrónico.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleArrepentimientoSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#86868b] mb-1">
                        Código de Reserva
                      </label>
                      <input
                        type="text"
                        required
                        value={arrepentimientoCode}
                        onChange={(e) => setArrepentimientoCode(e.target.value)}
                        placeholder="Ej. EXP-2026-9812"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#86868b] mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        required
                        value={arrepentimientoEmail}
                        onChange={(e) => setArrepentimientoEmail(e.target.value)}
                        placeholder="tuemail@ejemplo.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-normal transition-colors cursor-pointer"
                    >
                      Confirmar solicitud
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
