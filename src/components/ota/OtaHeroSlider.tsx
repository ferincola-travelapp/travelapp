"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export interface HeroSlide {
  id: string;
  mediaType: "video" | "image";
  mediaUrl: string;
  posterUrl?: string;
  badge?: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaUrl?: string;
}

interface OtaHeroSliderProps {
  slides?: HeroSlide[];
  children?: React.ReactNode;
}

// Slides oficiales con fotografía HD de turismo paradisíaco (sin velos oscuros ni fotos corporativas)
const EMIRATES_HD_SLIDES: HeroSlide[] = [
  {
    id: "slide-caribe",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=95",
    badge: "✦ DESTINOS PARADISÍACOS 2026",
    title: "Viajá donde siempre soñaste",
    subtitle:
      "Playas de aguas turquesas, hoteles all inclusive y traslados seguros. Disfrutá el mundo con la tranquilidad que merecés.",
    ctaText: "Ver Paquetes Caribe",
    ctaUrl: "/marketplace?destination=Caribe",
  },
  {
    id: "slide-patagonia",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2560&q=95",
    badge: "✦ EXPERIENCIAS & AVENTURA",
    title: "Descubrí la magia de la Patagonia",
    subtitle:
      "Lagos glaciares, montañas imponentes y gastronomía de montaña con guías verificados y cuotas fijas.",
    ctaText: "Explorar la Patagonia",
    ctaUrl: "/marketplace?destination=Patagonia",
  },
  {
    id: "slide-cataratas",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1589556264800-08ae9e129a8c?auto=format&fit=crop&w=2560&q=95",
    badge: "✦ MARAVILLAS NATURALES",
    title: "La fuerza viva del Iguazú",
    subtitle:
      "Sumergite en la selva misionera con vuelos directos, paseos náuticos y hotelería de primer nivel.",
    ctaText: "Ver Salidas Iguazú",
    ctaUrl: "/marketplace?destination=Iguazu",
  },
];

const SUGGESTED_DESTINATIONS = [
  "Cancún & Riviera Maya",
  "Bariloche & Lagos",
  "Mendoza & Bodegas",
  "Cataratas del Iguazú",
  "Punta Cana",
  "Río de Janeiro",
  "Salta & Jujuy",
  "Madrid & Europa",
];

export function OtaHeroSlider({ slides, children }: OtaHeroSliderProps) {
  const router = useRouter();
  const cleanSlides =
    Array.isArray(slides) && slides.length > 0 && slides.some((s) => s && s.mediaUrl?.trim())
      ? slides.filter((s) => s && s.mediaUrl?.trim())
      : EMIRATES_HD_SLIDES;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Rotación automática suave del slider cada 8 segundos
  useEffect(() => {
    if (isPaused || cleanSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % cleanSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isPaused, cleanSlides.length]);

  const currentSlide = cleanSlides[currentIdx] || cleanSlides[0];

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev === 0 ? cleanSlides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIdx((prev) => (prev + 1) % cleanSlides.length);
  };

  return (
    <section
      className="relative min-h-[540px] sm:min-h-[660px] lg:min-h-[760px] w-full overflow-hidden bg-slate-900 font-sans pt-16 sm:pt-24 flex flex-col justify-between"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Fondo Visual HD Real (Sin velo negro pesado: la imagen se vende con su color natural) */}
      <div className="absolute inset-0 z-0">
        {cleanSlides.map((slide, idx) => {
          const isActive = idx === currentIdx;
          return (
            <div
              key={slide.id || idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {slide.mediaType === "video" ? (
                <video
                  src={slide.mediaUrl}
                  poster={slide.posterUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : slide.mediaUrl.startsWith("data:image") ? (
                <img
                  src={slide.mediaUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-10000 ease-out"
                />
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={slide.mediaUrl}
                    alt={slide.title}
                    fill
                    priority={idx === 0}
                    quality={95}
                    sizes="100vw"
                    className="object-cover object-center transform scale-105 transition-transform duration-10000 ease-out"
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Gradiente Ultra Sutil (Scrim Liviano) */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/50 via-black/15 to-transparent pointer-events-none" />
      </div>

      {/* 2. Contenido Editorial Superior Estilo Emirates (Despejado y Limpio) */}
      <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-14 pb-4 sm:pb-6 w-full flex-1 flex flex-col justify-center">
        <div className="max-w-3xl">
          {currentSlide.badge && (
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-2 sm:mb-4 shadow-sm">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#e5a93b]" />
              <span>{currentSlide.badge}</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.12] sm:leading-[1.08] mb-2 sm:mb-4 drop-shadow-lg">
            {currentSlide.title}
          </h1>

          <p className="text-xs sm:text-lg md:text-xl text-white/95 font-medium max-w-2xl mb-3 sm:mb-6 leading-relaxed drop-shadow-md">
            {currentSlide.subtitle}
          </p>
        </div>
      </div>

      {/* 3. Buscador Oficial Completo Desplegado */}
      {children && (
        <div className="relative z-30 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pb-8 sm:pb-16 w-full animate-in fade-in duration-300">
          {children}

          {/* Destinos Populares Sugeridos al pie del buscador */}
          <div className="mt-2.5 sm:mt-3.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-white/90 px-1 sm:px-2">
            <span className="font-bold drop-shadow-sm flex items-center gap-1 text-white">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#e5a93b]" />
              Destinos sugeridos:
            </span>
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              {SUGGESTED_DESTINATIONS.slice(0, 4).map((dest) => (
                <button
                  key={dest}
                  type="button"
                  onClick={() => {
                    router.push(`/marketplace?destination=${encodeURIComponent(dest)}`);
                  }}
                  className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xs text-[10px] sm:text-[11px] font-bold text-white transition-all hover:scale-105 border border-white/20 cursor-pointer"
                >
                  {dest}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Controles del Slider: Flechas y Dots Limpios */}
      {cleanSlides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Slide anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/20 hover:bg-black/50 text-white backdrop-blur-md border border-white/20 transition-all hidden sm:flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Slide siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/20 hover:bg-black/50 text-white backdrop-blur-md border border-white/20 transition-all hidden sm:flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots Indicadores al pie */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
            {cleanSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIdx
                    ? "w-8 h-2 bg-[#ff5a19]"
                    : "w-2 h-2 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
