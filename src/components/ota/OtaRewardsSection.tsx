"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight, Award, Zap } from "lucide-react";

export interface OtaRewardsSectionConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
  steps?: Array<{ num: string; title: string; desc: string }>;
  primaryCtaText?: string;
  primaryCtaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
}

const DEFAULT_STEPS = [
  {
    num: "01",
    title: "Viajá & Acumulá",
    desc: "Cada reserva de vuelos, hoteles, excursiones o traslados te acredita puntos automáticos en tu cuenta.",
  },
  {
    num: "02",
    title: "Subí de Nivel",
    desc: "Desbloqueá categorías Silver, Gold y Black con acceso a promociones exclusivas y atención prioritaria.",
  },
  {
    num: "03",
    title: "Canjeá sin Vueltas",
    desc: "Usá tus puntos para pagar hasta el 100% de tus próximas aventuras o combiná Puntos + Dinero.",
  },
];

export function OtaRewardsSection({ config }: { config?: OtaRewardsSectionConfig }) {
  if (config?.enabled === false) return null;

  const badge = config?.badge || "Programa de Fidelidad Exclusivo";
  const title = config?.title || "Tus viajes ahora tienen premio con";
  const highlight = config?.highlight !== undefined ? config.highlight : "TravelApp Rewards";
  const subtitle =
    config?.subtitle ||
    "No dejes que tus kilómetros se pierdan. Convertí cada experiencia en crédito directo para tus próximas vacaciones. Sin letra chica ni vencimientos sorpresivos.";
  const steps =
    Array.isArray(config?.steps) && config.steps.length > 0 ? config.steps : DEFAULT_STEPS;
  const primaryCtaText = config?.primaryCtaText || "Conocer Más de Rewards";
  const primaryCtaUrl = config?.primaryCtaUrl || "/landing/rewards";
  const secondaryCtaText = config?.secondaryCtaText || "Activar mi Cuenta Gratis";
  const secondaryCtaUrl = config?.secondaryCtaUrl || "/registro";

  return (
    <section id="rewards" className="py-12 sm:py-24 bg-gradient-to-b from-white to-amber-50/40 font-sans border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Columna Izquierda: Información y Funcionamiento */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-200/80 text-amber-900 text-xs font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#e5a93b]" />
              <span>{badge}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {title}{" "}
              {highlight && <span className="text-[#e5a93b]">{highlight}</span>}
            </h2>

            <p className="text-sm sm:text-lg text-slate-600 font-medium leading-relaxed">
              {subtitle}
            </p>

            {/* 3 Pasos Ilustrativos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 text-left">
              {steps.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-100 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="text-xl sm:text-2xl font-black text-[#e5a93b]/50 mb-1.5 sm:mb-2">
                    {s.num || `0${idx + 1}`}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">
                    {s.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Llamados a la Acción */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center sm:justify-start gap-3 sm:gap-4 pt-2 sm:pt-4">
              <Link
                href={primaryCtaUrl}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#e5a93b] hover:bg-[#d49626] text-slate-950 font-bold text-xs sm:text-sm shadow-lg hover:shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{primaryCtaText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href={secondaryCtaUrl}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border border-slate-200 transition-colors shadow-xs cursor-pointer"
              >
                <span>{secondaryCtaText}</span>
              </Link>
            </div>
          </div>

          {/* Columna Derecha: Gráfica Premium con Card y Logos */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md bg-gradient-to-tr from-slate-900 to-[#0a2a5b] p-6 sm:p-8 rounded-3xl shadow-2xl text-white overflow-hidden border border-white/10">
              <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#e5a93b]/20 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-8">
                <div className="relative h-8 w-28">
                  <Image
                    src="/assets/rewards_blanco.svg"
                    alt="TravelApp Rewards"
                    fill
                    className="object-contain object-left"
                  />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                  Nivel Gold Member
                </span>
              </div>

              <div className="space-y-1 mb-8">
                <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                  Saldo Disponible
                </span>
                <div className="text-3xl sm:text-4xl font-black text-amber-400 flex items-center gap-2">
                  <span>3.750</span>
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    Puntos
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 font-medium block">
                  Equivalente aproximado a $37.500 ARS en canjes
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">Próximo canje disponible:</span>
                  <span className="font-bold text-amber-300">Escapada Yungas</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#e5a93b] h-full w-[78%] rounded-full" />
                </div>
                <div className="text-[11px] text-slate-300 flex justify-between">
                  <span>Progreso 78%</span>
                  <span>Faltan 850 pts</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Descuentos de hasta 25%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Canje Instantáneo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
