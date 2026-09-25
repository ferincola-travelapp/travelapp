"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  MapPin,
  Calendar,
  Compass,
  ArrowRight,
  SlidersHorizontal,
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
  // Filtramos cualquier slide que sea foto de edificio/oficina o base64 viejo del CMS
  const cleanSlides =
    slides && slides.length > 0 && !slides[0].mediaUrl.startsWith("data:image")
      ? slides
      : EMIRATES_HD_SLIDES;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [searchDestination, setSearchDestination] = useState("");
  const [serviceType, setServiceType] = useState<"paquetes" | "vuelos" | "hoteles" | "experiencias">("paquetes");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Rotación del placeholder estilo Ravello ("¿A dónde querés ir? Cancún / Bariloche...")
  useEffect(() => {
    const pTimer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SUGGESTED_DESTINATIONS.length);
    }, 2800);
    return () => clearInterval(pTimer);
  }, []);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = searchDestination.trim() || SUGGESTED_DESTINATIONS[placeholderIndex];
    router.push(`/marketplace?tab=${serviceType}&query=${encodeURIComponent(target)}`);
  };

  return (
    <section
      className="relative min-h-[620px] sm:min-h-[700px] lg:min-h-[760px] w-full overflow-hidden bg-slate-900 font-sans pt-20 sm:pt-24 flex flex-col justify-between"
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

        {/* Gradiente Ultra Sutil (Scrim Liviano): 
            Solo sombra suave al pie y arriba para legibilidad del header y textos, 
            dejando el 85% de la imagen nítida, viva y con colores HD */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/60 via-transparent to-black/25 pointer-events-none" />
        <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
      </div>

      {/* 2. Contenido Editorial Superior Estilo Emirates (Despejado y Limpio) */}
      <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-6 w-full flex-1 flex flex-col justify-center">
        <div className="max-w-3xl">
          {currentSlide.badge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold tracking-wider uppercase mb-4 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#e5a93b]" />
              <span>{currentSlide.badge}</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] mb-4 drop-shadow-lg">
            {currentSlide.title}
          </h1>

          <p className="text-lg sm:text-xl text-white/95 font-medium max-w-2xl mb-6 leading-relaxed drop-shadow-md">
            {currentSlide.subtitle}
          </p>
        </div>
      </div>

      {/* 3. Buscador Minimalista Descomprimido (Estilo Ravello / Emirates) 
          NO tapa la imagen, es una cápsula flotante ligera y elegante */}
      <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20 w-full">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-full p-2.5 sm:p-2 shadow-2xl border border-white/60">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            {/* Selector de Categoría Rápida */}
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full shrink-0">
              <button
                type="button"
                onClick={() => setServiceType("paquetes")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  serviceType === "paquetes"
                    ? "bg-[#0a2a5b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Paquetes
              </button>
              <button
                type="button"
                onClick={() => setServiceType("vuelos")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  serviceType === "vuelos"
                    ? "bg-[#0a2a5b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Vuelos
              </button>
              <button
                type="button"
                onClick={() => setServiceType("hoteles")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  serviceType === "hoteles"
                    ? "bg-[#0a2a5b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hoteles
              </button>
            </div>

            {/* Input con Placeholder Dinámico Estilo Ravello */}
            <div className="flex-1 flex items-center gap-3 px-3.5 py-1.5">
              <MapPin className="w-5 h-5 text-[#ff5a19] shrink-0" />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  placeholder={`¿A dónde querés viajar? Ej: ${SUGGESTED_DESTINATIONS[placeholderIndex]}`}
                  className="w-full bg-transparent text-sm sm:text-base font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Botón de Búsqueda de Alto Impacto */}
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#ff5a19] hover:bg-[#e04c10] text-white font-bold text-sm shadow-md hover:shadow-orange-500/30 transition-all shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Explorar</span>
            </button>
          </form>
        </div>

        {/* Toggle para Buscador Avanzado / Completo si el usuario lo desea */}
        <div className="mt-3 flex items-center justify-between text-xs text-white/90 px-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold drop-shadow-sm">Destinos populares:</span>
            <div className="hidden md:flex items-center gap-2">
              {SUGGESTED_DESTINATIONS.slice(0, 4).map((dest) => (
                <button
                  key={dest}
                  type="button"
                  onClick={() => {
                    setSearchDestination(dest);
                    router.push(`/marketplace?tab=${serviceType}&query=${encodeURIComponent(dest)}`);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xs text-[11px] font-bold text-white transition-colors"
                >
                  {dest}
                </button>
              ))}
            </div>
          </div>

          {children && (
            <button
              type="button"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="inline-flex items-center gap-1.5 font-bold hover:text-white transition-colors bg-black/25 hover:bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs border border-white/15"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvancedSearch ? "Ocultar filtros avanzados ▲" : "Filtros con fechas y pasajeros ▾"}</span>
            </button>
          )}
        </div>

        {/* Desplegable del Buscador Omnicanal Completo (si el usuario pide filtros avanzados) */}
        {showAdvancedSearch && children && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {children}
          </div>
        )}
      </div>

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
