"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Users, TrendingUp, Share2, DollarSign, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export function OtaAffiliatesSection() {
  const steps = [
    {
      num: "01",
      title: "Generá tu Enlace",
      desc: "Creá links personalizados para cualquier vuelo, hotel, paquete o experiencia de TravelApp con 1 click.",
    },
    {
      num: "02",
      title: "Compartí con tu Comunidad",
      desc: "Recomendá viajes en tus redes, WhatsApp, blog o agencia física con tu código exclusivo de embajador.",
    },
    {
      num: "03",
      title: "Cobrá tus Comisiones",
      desc: "Recibí pagos mensuales en pesos o dólares, o canjeá tus ganancias con bonificación extra en viajes.",
    },
  ];

  return (
    <section id="afiliados" className="py-16 sm:py-24 bg-white font-sans border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Columna Izquierda: Gráfica Premium de Afiliados */}
          <div className="lg:col-span-5 order-2 lg:order-1 relative">
            <div className="relative mx-auto max-w-md bg-gradient-to-tr from-emerald-950 via-slate-900 to-[#0a2a5b] p-6 sm:p-8 rounded-3xl shadow-2xl text-white overflow-hidden border border-white/10">
              <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm tracking-wide text-white">
                    Panel de Embajador
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  Comisión Activa 12%
                </span>
              </div>

              <div className="space-y-1 mb-8">
                <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                  Comisiones Generadas este Mes
                </span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 flex items-center gap-2">
                  <span>$184.200</span>
                  <span className="text-xs font-bold text-slate-300 uppercase">
                    ARS
                  </span>
                </div>
                <span className="text-[11px] text-emerald-300/80 font-medium block">
                  ↑ 24% más que el mes anterior (18 reservas completadas)
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">Enlace más compartido:</span>
                  <span className="font-bold text-white">travelapp.ar/ref/tu-nombre</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/20 rounded-xl px-3 py-2 text-[11px] text-slate-300 font-mono truncate">
                    https://travelapp.ar/exp/yungas-4x4?aff=884
                  </div>
                  <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">
                    Copiar
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Tracking transparente</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>Sin tope de ganancias</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Información y Funcionamiento */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold uppercase">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Red de Afiliados & Embajadores</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Monetizá tu pasión por viajar con{" "}
              <span className="text-emerald-600">TravelApp Afiliados</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
              Tanto si sos creador de contenido, viajero frecuente o tenés una comunidad interesada en descubrir nuevos destinos, nuestro programa te recompensa por cada reserva confirmada.
            </p>

            {/* 3 Pasos Ilustrativos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {steps.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="text-2xl font-black text-emerald-600/40 mb-2">
                    {s.num}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    {s.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Llamados a la Acción */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/landing/afiliados"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg hover:shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5"
              >
                <span>Conocer Más del Programa</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/landing/afiliados#registro"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 transition-colors shadow-xs"
              >
                <span>Registrarme como Embajador</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
