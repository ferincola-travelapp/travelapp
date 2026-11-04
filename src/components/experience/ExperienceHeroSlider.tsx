"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

export interface HeroSlideItem {
  id?: string;
  mediaType?: "image" | "video";
  imageUrl?: string;
  bgImage?: string;
  videoUrl?: string;
  badge?: string;
  title: string;
  subtitle?: string;
  text?: string;
  ctaText?: string;
  ctaHref?: string;
  ctaUrl?: string;
  overlayOpacity?: number;
}

export const MAX_HERO_SLIDES = 20;

const DEFAULT_SLIDES: HeroSlideItem[] = [
  {
    id: "salinas-4k",
    mediaType: "image",
    imageUrl:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=2560&q=95",
    title: "Salinas Grandes",
    subtitle: "Inmensidad blanca a 3.450 metros de altura.",
    ctaText: "Más información",
    ctaHref: "#catalogo-excursiones",
  },
  {
    id: "tafi-valles",
    mediaType: "image",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2560&q=95",
    title: "Valles Calchaquíes",
    subtitle: "Ruta del vino de altura, historia y paisajes milenarios.",
    ctaText: "Más información",
    ctaHref: "#catalogo-excursiones",
  },
  {
    id: "cafayate-vineyards",
    mediaType: "image",
    imageUrl:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=2560&q=95",
    title: "Bodegas de Cafayate",
    subtitle: "Degustaciones privadas en el corazón de los Valles.",
    ctaText: "Más información",
    ctaHref: "#catalogo-excursiones",
  },
  {
    id: "humahuaca-hornocal",
    mediaType: "image",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2560&q=95",
    title: "Serranía del Hornocal",
    subtitle: "El cerro de los 14 colores en la Quebrada de Humahuaca.",
    ctaText: "Más información",
    ctaHref: "#catalogo-excursiones",
  },
  {
    id: "traslados-ejecutivos",
    mediaType: "image",
    imageUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=2560&q=95",
    title: "Traslados Privados",
    subtitle: "Conexión puntual entre aeropuertos, hoteles y destinos.",
    ctaText: "Cotizar traslado",
    ctaHref: "#buscador-experience",
  },
];

interface ExperienceHeroSliderProps {
  slides?: HeroSlideItem[];
  cmsHero?: {
    title?: string;
    subtitle?: string;
    heroImageUrl?: string;
    heroVideoUrl?: string;
  };
  children?: React.ReactNode;
}

function isVideoAsset(slide: HeroSlideItem): boolean {
  if (slide.mediaType === "video" || Boolean(slide.videoUrl?.trim())) return true;
  const img = slide.imageUrl || slide.bgImage || "";
  return Boolean(img.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i));
}

export function ExperienceHeroSlider({
  slides,
  cmsHero,
  children,
}: ExperienceHeroSliderProps) {
  const activeSlides: HeroSlideItem[] = React.useMemo(() => {
    let rawList: HeroSlideItem[] = [];
    if (Array.isArray(slides) && slides.length > 0) {
      rawList = slides
        .filter((s) => s && (s.imageUrl || s.bgImage || s.videoUrl))
        .map((s, idx) => ({
          ...s,
          id: s.id || `cms-slide-${idx}`,
          imageUrl: s.imageUrl || s.bgImage || DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].imageUrl,
          videoUrl: s.videoUrl?.trim() || "",
          title: s.title || DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].title,
          subtitle: s.subtitle || s.text || "",
          ctaText: s.ctaText || "Más información",
          ctaHref: s.ctaHref || s.ctaUrl || "#catalogo-excursiones",
        }));
    }

    if (rawList.length === 0 && (cmsHero?.heroImageUrl || cmsHero?.heroVideoUrl)) {
      rawList = [
        {
          id: "cms-primary",
          mediaType: cmsHero.heroVideoUrl ? "video" : "image",
          imageUrl: cmsHero.heroImageUrl || DEFAULT_SLIDES[0].imageUrl,
          videoUrl: cmsHero.heroVideoUrl,
          title: cmsHero.title || DEFAULT_SLIDES[0].title,
          subtitle: cmsHero.subtitle || DEFAULT_SLIDES[0].subtitle,
          ctaText: "Más información",
          ctaHref: "#catalogo-excursiones",
        },
        ...DEFAULT_SLIDES.slice(1),
      ];
    }

    if (rawList.length === 0) {
      rawList = DEFAULT_SLIDES;
    }

    return rawList.slice(0, MAX_HERO_SLIDES);
  }, [slides, cmsHero]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (activeSlides.length <= 1 || !isPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [activeSlides.length, isPlaying]);

  const currentSlide = activeSlides[currentIndex] || DEFAULT_SLIDES[0];

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? activeSlides.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  return (
    <section className="relative w-full h-[580px] sm:h-[650px] overflow-hidden bg-black select-none">
      {/* CAPA DE MEDIOS 4K / ULTRA HD */}
      {activeSlides.map((slide, index) => {
        const isCurrent = index === currentIndex;
        const showVideo = isVideoAsset(slide);
        const resolvedImage =
          slide.imageUrl || slide.bgImage || DEFAULT_SLIDES[0].imageUrl;
        const videoSource = slide.videoUrl || resolvedImage;
        const customOpacity =
          typeof slide.overlayOpacity === "number"
            ? Math.min(0.85, Math.max(0.1, slide.overlayOpacity / 100))
            : null;

        return (
          <div
            key={slide.id || index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Imagen de respaldo siempre presente detrás por si el video tarda o falla */}
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-[8000ms] ease-out"
              style={{
                backgroundImage: `url('${resolvedImage}')`,
                transform: isCurrent ? "scale(1.03)" : "scale(1)",
              }}
            />

            {showVideo && videoSource && (
              <video
                key={videoSource}
                src={videoSource}
                poster={resolvedImage}
                autoPlay
                loop
                muted
                playsInline
                className="relative z-[1] w-full h-full object-cover object-center"
              />
            )}

            {/* Degradado sutil estilo Apple (oscurece suavemente arriba para dar contraste limpio al texto) */}
            <div
              className="absolute inset-0 z-[2] bg-gradient-to-b from-black/60 via-black/20 to-black/50"
              style={
                customOpacity !== null
                  ? { backgroundColor: `rgba(0,0,0,${customOpacity * 0.65})` }
                  : undefined
              }
            />
          </div>
        );
      })}

      {/* CONTENIDO CENTRAL SUPERIOR (Tipografía editorial idéntica a apple.com/la/) */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 pt-14 sm:pt-20 text-center flex flex-col items-center">
        <h1 className="text-[38px] sm:text-[56px] font-semibold text-white tracking-[-0.025em] leading-[1.07]">
          {currentSlide.title}
        </h1>

        {currentSlide.subtitle && (
          <p className="mt-2 text-[18px] sm:text-[23px] font-normal text-white/90 tracking-[-0.01em] leading-[1.25] max-w-2xl">
            {currentSlide.subtitle}
          </p>
        )}

        {/* Par de Botones Píldora Estilo Apple */}
        <div className="mt-5 flex items-center justify-center gap-3.5">
          <a
            href={currentSlide.ctaHref || "#catalogo-excursiones"}
            className="px-[22px] py-[9px] rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] sm:text-[15px] font-normal tracking-[-0.01em] transition-colors"
          >
            {currentSlide.ctaText || "Más información"}
          </a>

          <a
            href="#catalogo-excursiones"
            className="px-[22px] py-[9px] rounded-full border border-white/85 text-white hover:bg-white hover:text-[#1d1d1f] text-[14px] sm:text-[15px] font-normal tracking-[-0.01em] transition-colors"
          >
            Reservar
          </a>
        </div>
      </div>

      {/* FLECHAS LATERALES DISCRETAS */}
      {activeSlides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/25 hover:bg-black/50 backdrop-blur-md text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/25 hover:bg-black/50 backdrop-blur-md text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* INDICADORES INFERIORES ESTILO APPLE TV / APPLE.COM */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/40 backdrop-blur-md">
            {activeSlides.map((slide, idx) => (
              <button
                key={slide.id || idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Ir a tarjeta ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex
                    ? "w-6 bg-white"
                    : "w-2 bg-white/45 hover:bg-white/75"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
        </div>
      )}

      {children}
    </section>
  );
}
