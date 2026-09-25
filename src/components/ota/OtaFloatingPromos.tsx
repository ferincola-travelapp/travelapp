"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  CreditCard,
  Flame,
  Sparkles,
  Car,
  Headphones,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Percent,
} from "lucide-react";

export function OtaFloatingPromos() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const promos = [
    {
      id: "cuotas",
      badge: "Financiación Exclusiva",
      badgeColor: "bg-blue-100 text-[#0a2a5b]",
      icon: <CreditCard className="w-5 h-5 text-[#0a2a5b]" />,
      title: "Hasta 12 Cuotas Fijas",
      desc: "Pagá tus vuelos y paquetes con Visa, Mastercard y promociones bancarias.",
      cta: "Ver bancos",
      href: "/marketplace?filter=financiacion",
      accent: "border-blue-100 hover:border-blue-300",
    },
    {
      id: "sale",
      badge: "🔥 Oferta de Temporada",
      badgeColor: "bg-orange-100 text-[#ff5a19]",
      icon: <Flame className="w-5 h-5 text-[#ff5a19]" />,
      title: "Travel Sale: Hasta 40% OFF",
      desc: "Descuentos directos en paquetes a Bariloche, Mendoza y el Caribe.",
      cta: "Ver ofertas",
      href: "/marketplace?promo=travelsale",
      accent: "border-orange-100 hover:border-orange-300",
    },
    {
      id: "rewards",
      badge: "Club de Puntos",
      badgeColor: "bg-amber-100 text-amber-900",
      icon: <Sparkles className="w-5 h-5 text-[#e5a93b]" />,
      title: "Sumá 5% de Cashback",
      desc: "Cada viaje acumula puntos Rewards para canjear en tus próximas vacaciones.",
      cta: "Conocer Rewards",
      href: "/landing/rewards",
      accent: "border-amber-100 hover:border-amber-300",
    },
    {
      id: "travelcab",
      badge: "Ecosistema Integrado",
      badgeColor: "bg-red-100 text-[#ff4f5a]",
      icon: <Car className="w-5 h-5 text-[#ff5a19]" />,
      title: "Traslados Bonificados",
      desc: "TravelCab te lleva al aeropuerto sin cargo con la compra de tu paquete.",
      cta: "Pedir traslado",
      href: "/landing/travelcab",
      accent: "border-red-100 hover:border-red-300",
    },
    {
      id: "atencion",
      badge: "Atención Humana 24/7",
      badgeColor: "bg-emerald-100 text-emerald-800",
      icon: <Headphones className="w-5 h-5 text-emerald-600" />,
      title: "Asesores Reales en Argentina",
      desc: "Soporte personalizado vía WhatsApp antes, durante y después del viaje.",
      cta: "Consultar ahora",
      href: "https://wa.me/5493812020050",
      accent: "border-emerald-100 hover:border-emerald-300",
    },
  ];

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <section className="relative z-30 -mt-10 sm:-mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
      {/* Contenedor Flotante Estilo Dock */}
      <div className="relative">
        {/* Controles de Navegación sutiles en desktop */}
        <div className="hidden lg:flex items-center justify-between absolute -top-8 left-0 right-0 pointer-events-none px-1">
          <span className="text-xs font-bold text-white/90 drop-shadow-sm flex items-center gap-1.5 pointer-events-auto">
            <Percent className="w-3.5 h-3.5 text-[#e5a93b]" />
            Beneficios & Financiación del Ecosistema
          </span>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Beneficio anterior"
              className="p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Beneficio siguiente"
              className="p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carrusel Horizontal de Tarjetas Flotantes */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory"
        >
          {promos.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex-none w-[260px] sm:w-[290px] bg-white rounded-2xl p-4 sm:p-5 shadow-xl hover:shadow-2xl transition-all duration-300 border ${item.accent} flex flex-col justify-between group snap-start`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug group-hover:text-[#0a2a5b] transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                  {item.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0a2a5b] group-hover:text-[#ff5a19] transition-colors">
                <span>{item.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
