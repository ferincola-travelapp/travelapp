"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X, Copy, Check, ArrowRight, Tag } from "lucide-react";

export interface PromoPushPopConfig {
  enabled: boolean;
  badge?: string;
  title: string;
  subtitle: string;
  showDiscountCode?: boolean;
  discountCode?: string;
  discountBadge?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  delaySeconds?: number;
}

interface OtaPromoPushPopProps {
  config?: PromoPushPopConfig;
  brandName?: string;
  storageKey?: string;
}

export function OtaPromoPushPop({
  config,
  brandName,
  storageKey = "ta_pushpop_dismissed",
}: OtaPromoPushPopProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!config || !config.enabled) return;

    const hasSeen = sessionStorage.getItem(storageKey);
    if (!hasSeen) {
      const delayMs =
        typeof config.delaySeconds === "number" && config.delaySeconds >= 0
          ? config.delaySeconds * 1000
          : 1200;
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [config, storageKey]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem(storageKey, "true");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen || !config || !config.enabled) return null;

  const hasImage = Boolean(config.imageUrl && config.imageUrl.trim().length > 0);
  const showCoupon =
    config.showDiscountCode !== false &&
    Boolean(config.discountCode && config.discountCode.trim().length > 0);
  const isExternalCta = Boolean(config.ctaUrl && /^https?:\/\//i.test(config.ctaUrl));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
      onClick={handleClose}
    >
      <div
        className={`relative w-full bg-white rounded-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 ${
          hasImage ? "max-w-2xl grid grid-cols-1 md:grid-cols-12" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Línea institucional superior */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#0A2A5B] z-30" />

        {/* Botón Cerrar minimalista */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-white/90 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200/80 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Cerrar aviso promocional"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Columna Visual (Split limpio en desktop si hay imagen) */}
        {hasImage && (
          <div className="relative h-48 sm:h-56 md:h-auto md:col-span-5 bg-slate-100 overflow-hidden">
            <img
              src={config.imageUrl}
              alt={config.title || "Promoción TravelApp"}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Columna Editorial Minimalista */}
        <div
          className={`p-6 sm:p-8 flex flex-col justify-between text-left ${
            hasImage ? "md:col-span-7" : ""
          }`}
        >
          <div className="space-y-3 pr-6">
            {(config.badge || brandName) && (
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0A2A5B]">
                {config.badge || brandName}
              </p>
            )}

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {config.title}
            </h2>

            {config.subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                {config.subtitle}
              </p>
            )}
          </div>

          <div className="mt-6 space-y-3.5">
            {/* Código promocional sobrio (opcional — se puede habilitar o deshabilitar desde el CMS) */}
            {showCoupon && (
              <div className="px-3.5 py-2.5 bg-slate-50 rounded-sm border border-dashed border-slate-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-600 text-xs min-w-0 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-[#0A2A5B] shrink-0" />
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                    {config.discountBadge || "Código"}
                  </span>
                  <span className="font-mono text-xs sm:text-sm tracking-widest uppercase text-slate-900 font-bold truncate">
                    {config.discountCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(config.discountCode!)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-white hover:bg-slate-100 border border-slate-200 text-[#0A2A5B] font-semibold text-[11px] transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-2 pt-1">
              {config.ctaUrl && config.ctaText && (
                isExternalCta ? (
                  <a
                    href={config.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleClose}
                    className="w-full py-2.5 px-5 rounded-sm bg-[#0A2A5B] hover:bg-[#071f45] text-white font-semibold text-xs sm:text-sm tracking-tight transition-colors flex items-center justify-center gap-2"
                  >
                    <span>{config.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <Link
                    href={config.ctaUrl}
                    onClick={handleClose}
                    className="w-full py-2.5 px-5 rounded-sm bg-[#0A2A5B] hover:bg-[#071f45] text-white font-semibold text-xs sm:text-sm tracking-tight transition-colors flex items-center justify-center gap-2"
                  >
                    <span>{config.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )
              )}

              <button
                type="button"
                onClick={handleClose}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors py-1 cursor-pointer text-center"
              >
                {showCoupon ? "Continuar sin aplicar" : "Cerrar aviso"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
