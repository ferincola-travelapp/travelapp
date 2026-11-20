"use client";

import React, { useRef, useState } from "react";
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
  Percent,
  Gift,
  ShieldCheck,
  Plane,
  Compass,
} from "lucide-react";

export interface OtaFloatingPromoItem {
  id: string;
  badge: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  icon?: string;
  colorTheme?: "blue" | "orange" | "amber" | "red" | "emerald";
  enabled?: boolean;
}

export const DEFAULT_OTA_FLOATING_PROMOS: OtaFloatingPromoItem[] = [
  {
    id: "cuotas",
    badge: "Financiación Exclusiva",
    icon: "CreditCard",
    colorTheme: "blue",
    title: "Hasta 12 Cuotas Fijas",
    desc: "Pagá tus vuelos y paquetes con Visa, Mastercard y promociones bancarias.",
    cta: "Ver bancos",
    href: "/marketplace?filter=financiacion",
    enabled: true,
  },
  {
    id: "sale",
    badge: "🔥 Oferta de Temporada",
    icon: "Flame",
    colorTheme: "orange",
    title: "Travel Sale: Hasta 40% OFF",
    desc: "Descuentos directos en paquetes a Bariloche, Mendoza y el Caribe.",
    cta: "Ver ofertas",
    href: "/marketplace?promo=travelsale",
    enabled: true,
  },
  {
    id: "rewards",
    badge: "Club de Puntos",
    icon: "Sparkles",
    colorTheme: "amber",
    title: "Sumá 5% de Cashback",
    desc: "Cada viaje acumula puntos Rewards para canjear en tus próximas vacaciones.",
    cta: "Conocer Rewards",
    href: "/landing/rewards",
    enabled: true,
  },
  {
    id: "travelcab",
    badge: "Ecosistema Integrado",
    icon: "Car",
    colorTheme: "red",
    title: "Traslados Bonificados",
    desc: "TravelCab te lleva al aeropuerto sin cargo con la compra de tu paquete.",
    cta: "Pedir traslado",
    href: "/landing/travelcab",
    enabled: true,
  },
  {
    id: "atencion",
    badge: "Atención Humana 24/7",
    icon: "Headphones",
    colorTheme: "emerald",
    title: "Asesores Reales en Argentina",
    desc: "Soporte personalizado vía WhatsApp antes, durante y después del viaje.",
    cta: "Consultar ahora",
    href: "https://wa.me/5493812000712",
    enabled: true,
  },
];

const THEME_STYLES: Record<
  string,
  { badgeColor: string; accent: string; iconColor: string }
> = {
  blue: {
    badgeColor: "bg-blue-100 text-[#0a2a5b]",
    accent: "border-blue-100 hover:border-blue-300",
    iconColor: "text-[#0a2a5b]",
  },
  orange: {
    badgeColor: "bg-orange-100 text-[#ff5a19]",
    accent: "border-orange-100 hover:border-orange-300",
    iconColor: "text-[#ff5a19]",
  },
  amber: {
    badgeColor: "bg-amber-100 text-amber-900",
    accent: "border-amber-100 hover:border-amber-300",
    iconColor: "text-[#e5a93b]",
  },
  red: {
    badgeColor: "bg-red-100 text-[#ff4f5a]",
    accent: "border-red-100 hover:border-red-300",
    iconColor: "text-[#ff5a19]",
  },
  emerald: {
    badgeColor: "bg-emerald-100 text-emerald-800",
    accent: "border-emerald-100 hover:border-emerald-300",
    iconColor: "text-emerald-600",
  },
};

function renderPromoIcon(iconName: string | undefined, className: string) {
  switch (iconName) {
    case "Flame":
      return <Flame className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Car":
      return <Car className={className} />;
    case "Headphones":
      return <Headphones className={className} />;
    case "Percent":
      return <Percent className={className} />;
    case "Gift":
      return <Gift className={className} />;
    case "ShieldCheck":
      return <ShieldCheck className={className} />;
    case "Plane":
      return <Plane className={className} />;
    case "Compass":
      return <Compass className={className} />;
    case "CreditCard":
    default:
      return <CreditCard className={className} />;
  }
}

interface OtaFloatingPromosProps {
  promos?: OtaFloatingPromoItem[];
  sectionTitle?: string;
  whatsappUrl?: string;
}

export function OtaFloatingPromos({
  promos,
  sectionTitle = "Beneficios & Financiación",
  whatsappUrl = "https://wa.me/5493812000712",
}: OtaFloatingPromosProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const sourcePromos =
    Array.isArray(promos) && promos.length > 0
      ? promos.filter((p) => p && p.enabled !== false)
      : DEFAULT_OTA_FLOATING_PROMOS.map((item) =>
          item.id === "atencion" ? { ...item, href: whatsappUrl } : item
        );

  if (sourcePromos.length === 0) return null;

  const themeOrder = ["blue", "orange", "amber", "red", "emerald"] as const;

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = 280;
      const newIdx = Math.round(scrollLeft / cardWidth);
      setActiveIdx(Math.min(Math.max(newIdx, 0), sourcePromos.length - 1));
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -280 : 280;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const scrollToIdx = (idx: number) => {
    if (scrollRef.current) {
      const cardWidth = 280;
      scrollRef.current.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
      setActiveIdx(idx);
    }
  };

  return (
    <section className="relative z-30 mt-3 sm:-mt-10 lg:-mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
      <div className="relative">
        <div className="flex items-center justify-between mb-2.5 sm:mb-2 px-1">
          <span className="text-xs font-bold text-slate-800 sm:text-white/90 drop-shadow-sm flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-[#e5a93b]" />
            {sectionTitle} ({sourcePromos.length})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Beneficio anterior"
              className="p-1.5 rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Beneficio siguiente"
              className="p-1.5 rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none overscroll-x-contain select-none snap-x snap-proximity scroll-smooth"
        >
          {sourcePromos.map((item, idx) => {
            const themeKey = item.colorTheme || themeOrder[idx % themeOrder.length];
            const styles = THEME_STYLES[themeKey] || THEME_STYLES.blue;
            const href = item.href || "/marketplace";
            const isExternal = /^https?:\/\//i.test(href);
            const cardClasses = `flex-none w-[76vw] max-w-[275px] sm:w-[290px] bg-white rounded-2xl p-4 sm:p-5 shadow-xl hover:shadow-2xl transition-all duration-300 border ${styles.accent} flex flex-col justify-between group snap-start cursor-pointer`;

            const inner = (
              <>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${styles.badgeColor}`}>
                      {item.badge}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      {renderPromoIcon(item.icon, `w-5 h-5 ${styles.iconColor}`)}
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
                  <span>{item.cta || "Ver más"}</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </>
            );

            return isExternal ? (
              <a
                key={item.id || idx}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                className={cardClasses}
              >
                {inner}
              </a>
            ) : (
              <Link
                key={item.id || idx}
                href={href}
                draggable={false}
                className={cardClasses}
              >
                {inner}
              </Link>
            );
          })}
          <div className="w-4 flex-none" />
        </div>

        <div className="flex justify-center items-center gap-1.5 mt-2 sm:hidden">
          {sourcePromos.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToIdx(idx)}
              aria-label={`Ir al beneficio ${idx + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                idx === activeIdx
                  ? "w-5 h-1.5 bg-[#FF5A19]"
                  : "w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
