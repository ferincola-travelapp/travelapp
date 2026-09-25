"use client";

import React from "react";
import { CreditCard, ShieldCheck, Sparkles, Headphones } from "lucide-react";

export function OtaTrustBar() {
  const benefits = [
    {
      icon: <CreditCard className="w-5 h-5 text-[#0a2a5b]" />,
      title: "Financiación en Cuotas",
      desc: "Hasta 6 o 12 cuotas fijas con las principales tarjetas",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: "Pagos 100% Seguros",
      desc: "Transacciones encriptadas y confirmación inmediata",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-[#e5a93b]" />,
      title: "Sumá Puntos Rewards",
      desc: "Puntos acumulables en cada viaje para futuros canjes",
    },
    {
      icon: <Headphones className="w-5 h-5 text-[#ff5a19]" />,
      title: "Atención Humana 24/7",
      desc: "Soporte antes, durante y después de tu experiencia",
    },
  ];

  return (
    <div className="w-full bg-slate-50 border-y border-slate-200/80 py-5 sm:py-6 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-4">
          {benefits.map((b, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-white hover:shadow-xs transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-slate-200/60 flex items-center justify-center shrink-0">
                {b.icon}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {b.title}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight mt-0.5">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
