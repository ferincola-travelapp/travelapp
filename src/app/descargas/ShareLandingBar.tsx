'use client';

import React, { useState } from 'react';
import { Share2, Check, MessageCircle } from 'lucide-react';

const SHARE_URL = 'https://travelcab.ar/descargas';
const WHATSAPP_TEXT =
  '¡Sumate a la Beta de TravelCab! 🚕📲 Descargá la app para Usuarios o Conductores acá (incluye guía rápida de instalación): https://travelcab.ar/descargas';

export function ShareLandingBar() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback ignored if clipboard permission denied
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Compartir por WhatsApp
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold backdrop-blur-sm transition-all active:scale-95 cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-300" />
            ¡Enlace copiado!
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5 text-white/80" />
            Copiar link
          </>
        )}
      </button>
    </div>
  );
}
