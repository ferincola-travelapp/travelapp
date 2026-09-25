"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Sparkles, Copy, Check, ArrowRight, Tag } from "lucide-react";

export interface PromoPushPopConfig {
  enabled: boolean;
  badge?: string;
  title: string;
  subtitle: string;
  discountCode?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
}

interface OtaPromoPushPopProps {
  config?: PromoPushPopConfig;
}

export function OtaPromoPushPop({ config }: OtaPromoPushPopProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!config || !config.enabled) return;

    // Verificar si ya fue visto en esta sesión
    const hasSeen = sessionStorage.getItem("ta_pushpop_dismissed");
    if (!hasSeen) {
      // Pequeño delay de 1.2 segundos para una entrada suave al cargar la página
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [config]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("ta_pushpop_dismissed", "true");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen || !config || !config.enabled) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300 font-sans">
      <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-colors cursor-pointer"
          aria-label="Cerrar ventana emergente"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Imagen o Banner de la Promoción (opcional) */}
        {config.imageUrl ? (
          <div className="relative h-48 sm:h-56 w-full bg-slate-900">
            <Image
              src={config.imageUrl}
              alt={config.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            {config.badge && (
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-[#ff5a19] text-white text-xs font-black uppercase tracking-wider shadow-md">
                  {config.badge}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-[#0a2a5b] to-blue-900 p-6 text-white text-center">
            {config.badge && (
              <span className="inline-block px-3 py-1 rounded-full bg-[#ff5a19] text-white text-xs font-black uppercase tracking-wider shadow-md mb-2">
                {config.badge}
              </span>
            )}
            <h2 className="text-2xl font-black text-amber-300">
              {config.title}
            </h2>
          </div>
        )}

        {/* Contenido */}
        <div className="p-6 sm:p-8 text-center">
          {config.imageUrl && (
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 leading-tight">
              {config.title}
            </h2>
          )}

          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed mb-6">
            {config.subtitle}
          </p>

          {/* Código de Descuento Copiable */}
          {config.discountCode && (
            <div className="mb-6 p-3 bg-amber-50 rounded-2xl border border-dashed border-amber-300 flex items-center justify-between gap-3 max-w-sm mx-auto">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Tag className="w-4 h-4 text-[#ff5a19]" />
                <span>Cupón:</span>
                <span className="font-mono text-sm tracking-wider uppercase text-slate-950 font-black">
                  {config.discountCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(config.discountCode!)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-800" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Botón CTA y Cerrar */}
          <div className="space-y-2">
            {config.ctaUrl && config.ctaText && (
              <Link
                href={config.ctaUrl}
                onClick={handleClose}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#ff5a19] hover:bg-[#e04c10] text-white font-bold text-sm shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>{config.ctaText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors py-1 cursor-pointer"
            >
              Cerrar y continuar navegando
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
