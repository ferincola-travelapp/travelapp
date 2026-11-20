"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Phone, ChevronDown } from "lucide-react";

export interface ExperienceTravisConfig {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  highlights?: string[];
  ctaText?: string;
}

export interface ExperienceTravisContact {
  whatsappUrl?: string;
  whatsappDisplay?: string;
  messengerUrl?: string;
  instagramDmUrl?: string;
  instagramHandle?: string;
  phone?: string;
}

export function ExperienceTravisSection({
  config,
  contact,
}: {
  config?: ExperienceTravisConfig;
  contact?: ExperienceTravisContact;
}) {
  const [channelsOpen, setChannelsOpen] = useState(false);

  if (config?.enabled === false) return null;

  const title = config?.title || "Travis. Tu asistente personal de viaje.";
  const subtitle =
    config?.subtitle ||
    "Planificá excursiones, coordiná traslados punto a punto y recibí asistencia en ruta las 24 horas.";
  const highlights =
    Array.isArray(config?.highlights) && config.highlights.length > 0
      ? config.highlights.filter(Boolean)
      : [
          "Cotización inmediata",
          "Coordinación de pick-up en hotel",
          "Estado de rutas y clima en tiempo real",
        ];
  const ctaText = config?.ctaText || "Hablar con Travis";

  const waBase = contact?.whatsappUrl?.trim() || "https://wa.me/5493812000712";
  const waHref = waBase.includes("?")
    ? waBase
    : `${waBase}?text=${encodeURIComponent(
        "Hola Travis, quiero consultar por excursiones y traslados"
      )}`;
  const waDisplay = contact?.whatsappDisplay?.trim() || "+54 9 381 200-0712";
  const messengerHref = contact?.messengerUrl?.trim() || "https://m.me/travelapp.ar";
  const instagramDmHref = contact?.instagramDmUrl?.trim() || "https://ig.me/m/travelapp.ar";
  const instagramHandle = contact?.instagramHandle?.trim() || "@travelapp.ar";
  const phone = contact?.phone?.trim() || "0810-220-0018";
  const phoneHref = `tel:${phone.replace(/[^+\d]/g, "") || "08102200018"}`;

  return (
    <section className="w-full bg-[#f5f5f7] py-16 sm:py-24 px-4 sm:px-6 border-t border-[#e5e5ea]">
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        
        {/* IMAGEN OFICIAL DE TRAVIS */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-6 flex items-center justify-center">
          <Image
            src="/assets/travis_formal.svg"
            alt="Travis Concierge"
            width={112}
            height={112}
            className="w-full h-full object-contain"
          />
        </div>

        {/* TÍTULO Y DESCRIPCIÓN ESTILO APPLE */}
        <h2 className="text-[32px] sm:text-[44px] font-semibold text-[#1d1d1f] tracking-[-0.02em] leading-[1.1]">
          {title}
        </h2>

        <p className="mt-3 text-[17px] sm:text-[21px] font-normal text-[#86868b] tracking-[-0.01em] leading-[1.35] max-w-2xl">
          {subtitle}
        </p>

        {/* RESUMEN EDITORIAL DE CAPACIDADES */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-[#1d1d1f]/75">
          {highlights.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-[#d2d2d7]">·</span>}
              <span>{item}</span>
            </React.Fragment>
          ))}
        </div>

        {/* LLAMADO A LA ACCIÓN QUE DESPLIEGA LOS CANALES DE ATENCIÓN */}
        <div className="mt-7">
          <button
            type="button"
            onClick={() => setChannelsOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-normal tracking-[-0.01em] transition-colors cursor-pointer"
          >
            <span>{ctaText}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                channelsOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* DOCK DE CANALES OFICIALES */}
        {channelsOpen && (
          <div className="mt-8 w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* 1. WHATSAPP OFICIAL */}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#d2d2d7] hover:border-[#86868b] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.625.846 5.059 2.284 7.033l-1.494 5.455 5.602-1.47c1.897 1.045 4.077 1.642 6.398 1.642 6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[#1d1d1f]">
                  WhatsApp
                </div>
                <div className="text-[12px] text-[#86868b] truncate">
                  {waDisplay}
                </div>
              </div>
            </a>

            {/* 2. MESSENGER OFICIAL */}
            <a
              href={messengerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#d2d2d7] hover:border-[#86868b] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-[#0084FF] text-white flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.57l.05 1.78c.02.57.61.94 1.13.71l1.98-.87c.17-.08.36-.1.55-.06.88.24 1.83.37 2.88.37 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm5.89 7.58l-2.93 4.67c-.47.74-1.48.92-2.17.38l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.93-4.67c.47-.74 1.48-.92 2.17-.38l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[#1d1d1f]">
                  Messenger
                </div>
                <div className="text-[12px] text-[#86868b] truncate">
                  Chat oficial Meta
                </div>
              </div>
            </a>

            {/* 3. INSTAGRAM (DM) OFICIAL */}
            <a
              href={instagramDmHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#d2d2d7] hover:border-[#86868b] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[#1d1d1f]">
                  Instagram DM
                </div>
                <div className="text-[12px] text-[#86868b] truncate">
                  {instagramHandle}
                </div>
              </div>
            </a>

            {/* 4. TELÉFONO OFICIAL */}
            <a
              href={phoneHref}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#d2d2d7] hover:border-[#86868b] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-[#0a2a5b] text-white flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[#1d1d1f]">
                  {phone}
                </div>
                <div className="text-[12px] text-[#86868b] truncate">
                  Atención telefónica
                </div>
              </div>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
