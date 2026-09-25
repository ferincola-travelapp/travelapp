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
  Sliders,
} from "lucide-react";

// Íconos SVG para redes sociales oficiales
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

export interface FooterConfig {
  razonSocial?: string;
  cuit?: string;
  dnavLegajo?: string;
  domicilio?: string;
  phone?: string;
  email?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  tiktokUrl?: string;
}

interface OtaFooterProps {
  config?: FooterConfig;
}

export function OtaFooter({ config }: OtaFooterProps) {
  const razonSocial = config?.razonSocial || "TravelApp s.a.s.";
  const cuit = config?.cuit || "30-71829304-8";
  const dnavLegajo = config?.dnavLegajo || "EVyT Legajo N° 18.942 - Res. 412/2024";
  const domicilio = config?.domicilio || "San Miguel de Tucumán, Argentina";
  const phone = config?.phone || "+54 9 381 202-0050";
  const email = config?.email || "hola@travelapp.ar";

  // Modales legales y de arrepentimiento
  const [legalModal, setLegalModal] = useState<{ title: string; content: string } | null>(null);
  const [arrepentimientoModal, setArrepentimientoModal] = useState(false);
  const [arrepentimientoSent, setArrepentimientoSent] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [dni, setDni] = useState("");
  const [reason, setReason] = useState("");

  const handleOpenCookieSettings = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-cookie-settings"));
    }
  };

  const handleArrepentimientoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setArrepentimientoSent(true);
    setTimeout(() => {
      setArrepentimientoSent(false);
      setArrepentimientoModal(false);
    }, 3000);
  };

  return (
    <footer className="bg-slate-950 text-white font-sans pt-16 pb-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Fila Principal: Logo, Ecosistema, Contacto, Redes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 pb-12 border-b border-slate-800/80">
          {/* Columna 1: Marca & Misión */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block relative h-9 w-40">
              <Image
                src="/assets/travelapp_blanco.svg"
                alt="TravelApp Logo"
                fill
                className="object-contain object-left"
              />
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-sm">
              La plataforma de viajes y movilidad inteligente de Argentina. Conectamos experiencias auténticas, alojamientos, vuelos, traslados urbanos y recompensas exclusivas en un solo lugar.
            </p>

            {/* Redes Sociales Oficiales */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={config?.facebookUrl || "https://facebook.com/travelapp.ar"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a
                href={config?.instagramUrl || "https://instagram.com/travelapp.ar"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-pink-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href={config?.youtubeUrl || "https://youtube.com/@travelapp"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <YoutubeIcon className="w-4 h-4" />
              </a>
              <a
                href={config?.linkedinUrl || "https://linkedin.com/company/travelapp-ar"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-blue-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <LinkedinIcon className="w-4 h-4" />
              </a>
              <a
                href={config?.tiktokUrl || "https://tiktok.com/@travelapp.ar"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <TiktokIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Columna 2: Ecosistema & Servicios */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Ecosistema
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/landing/experience" className="hover:text-white transition-colors">
                  TravelApp Experience
                </Link>
              </li>
              <li>
                <Link href="/landing/rewards" className="hover:text-white transition-colors">
                  TravelApp Rewards
                </Link>
              </li>
              <li>
                <Link href="/landing/afiliados" className="hover:text-white transition-colors">
                  Red de Afiliados
                </Link>
              </li>
              <li>
                <Link href="/landing/travelcab" className="hover:text-white transition-colors">
                  TravelCab Movilidad
                </Link>
              </li>
              <li>
                <Link href="/landing/experience/marketplace" className="hover:text-white transition-colors">
                  Marketplace de Viajes
                </Link>
              </li>
              <li>
                <Link href="#blog" className="hover:text-white transition-colors">
                  Blog & Guías de Destinos
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Sucursales & Puntos Físicos */}
          <div id="sucursales" className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Sucursales
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#ff5a19] shrink-0 mt-0.5" />
                <span>Casa Central: San Miguel de Tucumán</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#ff5a19] shrink-0 mt-0.5" />
                <span>Punto Retiro: Terminal Retiro, CABA</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#ff5a19] shrink-0 mt-0.5" />
                <span>Punto Pilar: KM 50 Panamericana, Bs As</span>
              </li>
              <li className="pt-1 text-[11px] text-slate-500">
                Atención presencial de Lunes a Sábados de 9 a 20 hs.
              </li>
            </ul>
          </div>

          {/* Columna 4: Contacto & Administración */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Contacto & Soporte
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <a href={`tel:${phone}`} className="hover:text-white transition-colors">
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <a href={`mailto:${email}`} className="hover:text-white transition-colors">
                  {email}
                </a>
              </li>
              <li className="pt-2">
                <a
                  href="https://admin.travelapp.ar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-800 transition-colors"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Acceso Operadores & Admin</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Sellos Regulatorios y Fiscales (DNAV, ARCA, Datos Personales) */}
        <div className="py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-slate-800/80">
          {/* Sello DNAV EVyT */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white uppercase">Sello DNAV</div>
              <div className="text-[10px] text-slate-400">{dnavLegajo}</div>
            </div>
          </div>

          {/* QR ARCA (ex AFIP F960/D) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white uppercase">QR ARCA / AFIP</div>
              <div className="text-[10px] text-slate-400">Formulario 960/D Fiscal Digital</div>
            </div>
          </div>

          {/* Base de Datos Personales (Ley 25.326) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white uppercase">Protección de Datos</div>
              <div className="text-[10px] text-slate-400">Reg. Nacional Ley 25.326</div>
            </div>
          </div>

          {/* Botón de Arrepentimiento (Defensa del Consumidor Argentina) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-white uppercase">Defensa del Consumidor</div>
              <div className="text-[10px] text-slate-400">Cancelación en 10 días corridos</div>
            </div>
            <button
              type="button"
              onClick={() => setArrepentimientoModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#ff5a19] hover:bg-[#e04c10] text-white text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
            >
              Arrepentimiento
            </button>
          </div>
        </div>

        {/* Fila Inferior: Razón Social, CUIT, Enlaces Legales y Cookies */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="text-center md:text-left space-y-1">
            <p>
              © 2026 {razonSocial} — CUIT {cuit} — Domicilio: {domicilio}.
            </p>
            <p className="text-[11px] text-slate-600">
              Agencia de Viajes y Turismo habilitada por la Secretaría de Turismo de la Nación.
            </p>
          </div>

          {/* Enlaces Legales y Botón Cookies */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <button
              type="button"
              onClick={() =>
                setLegalModal({
                  title: "Términos y Condiciones Generales",
                  content:
                    "Al utilizar nuestros servicios, el usuario acepta los términos y condiciones vigentes de TravelApp. Todos los servicios de viaje, excursiones y transporte son prestados conforme a la legislación turística argentina aplicable (Ley 18.829 y concordantes). Las reservas quedan confirmadas únicamente contra emisión de voucher oficial.",
                })
              }
              className="hover:text-white transition-colors cursor-pointer"
            >
              Términos y Condiciones
            </button>

            <button
              type="button"
              onClick={() =>
                setLegalModal({
                  title: "Política de Privacidad de Datos",
                  content:
                    "TravelApp garantiza la debida custodia y confidencialidad de los datos personales suministrados por los usuarios en conformidad con la Ley 25.326. Los datos no son comercializados ni compartidos con terceros ajenos a la prestación de los servicios contratados.",
                })
              }
              className="hover:text-white transition-colors cursor-pointer"
            >
              Política de Privacidad
            </button>

            <Link
              href="/politica-de-cookies"
              className="hover:text-white transition-colors font-semibold text-slate-300"
            >
              Política de Cookies
            </Link>

            <button
              type="button"
              onClick={handleOpenCookieSettings}
              className="inline-flex items-center gap-1 text-[#ff5a19] hover:text-orange-400 transition-colors font-bold cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>Configurar Cookies</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Legal (Términos / Privacidad) */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLegalModal(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black mb-4">{legalModal.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {legalModal.content}
            </p>
            <button
              type="button"
              onClick={() => setLegalModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#0a2a5b] text-white font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Botón de Arrepentimiento */}
      {arrepentimientoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs text-slate-900">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setArrepentimientoModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {arrepentimientoSent ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black mb-2">Solicitud de Cancelación Recibida</h3>
                <p className="text-xs text-slate-600">
                  Hemos registrado tu solicitud de arrepentimiento. Se te enviará el comprobante de reintegro conforme a la Res. 424/2020 de Defensa del Consumidor.
                </p>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-[#ff5a19] text-xs font-bold uppercase mb-3">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Botón de Arrepentimiento Legal</span>
                </div>
                <h3 className="text-xl font-black mb-1">Solicitar Cancelación de Compra</h3>
                <p className="text-xs text-slate-500 mb-5">
                  Conforme a la normativa argentina de Defensa del Consumidor, podés solicitar la revocación dentro de los 10 días corridos de realizada la compra online.
                </p>

                <form onSubmit={handleArrepentimientoSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Código de Reserva o Factura
                    </label>
                    <input
                      type="text"
                      required
                      value={bookingCode}
                      onChange={(e) => setBookingCode(e.target.value)}
                      placeholder="Ej. TRP-9842"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0a2a5b]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      DNI / CUIT del Titular
                    </label>
                    <input
                      type="text"
                      required
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      placeholder="Ej. 35123456"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0a2a5b]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Motivo (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Contanos brevemente el motivo..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0a2a5b]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#ff5a19] hover:bg-[#e04c10] text-white font-bold text-sm shadow-md transition-colors"
                  >
                    Confirmar Solicitud de Arrepentimiento
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
