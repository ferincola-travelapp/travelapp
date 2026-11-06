"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TravisOmnichannelWidget } from "@/components/shared/TravisOmnichannelWidget";
import {
  ArrowRight,
  Gift,
  Star,
  Zap,
  TrendingUp,
  Award,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  CreditCard,
  Plane,
  Coffee,
  ShoppingBag,
  Phone,
  Building2,
  Check,
  QrCode,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ════════════════════════════════════════════════════════════
   CMS DEFAULT DATA (Sincronizado con Concorde 360 -> cms/landing_rewards)
════════════════════════════════════════════════════════════ */
const DEFAULT_REWARDS_CMS_DATA = {
  heroSlides: [
    {
      title: "Tus viajes tienen recompensa.",
      subtitle:
        "Acumulá puntos automáticamente en cada traslado o excursión y canjealos por beneficios reales en todo el ecosistema TravelApp.",
      text: "Membresía digital sin cargo. Acreditación inmediata en tu Travel Wallet.",
      bgImage:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85",
      ctaText: "Explorar Catálogo de Canjes",
      ctaUrl: "/canjes",
      overlayOpacity: 60,
    },
  ],
  howItWorks: [
    {
      step: "01",
      title: "Viajá o Reservá",
      description:
        "Solicitá un traslado en TravelCab o contratá una excursión en TravelApp Experience con tu cuenta registrada.",
    },
    {
      step: "02",
      title: "Sumá Puntos en el Acto",
      description:
        "Tus Puntos Travel se acreditan automáticamente en tu billetera digital al finalizar cada servicio.",
    },
    {
      step: "03",
      title: "Canjeá sin Fricción",
      description:
        "Accedé al catálogo online, seleccioná tu beneficio y utilizá tu voucher digital al instante.",
    },
  ],
  benefits: [
    {
      icon: "Plane",
      title: "Traslados y Excursiones",
      description:
        "Utilizá tus puntos acumulados para bonificar total o parcialmente tus próximos viajes y experiencias.",
      image:
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=85",
    },
    {
      icon: "Star",
      title: "Categorías & Status VIP",
      description:
        "Ascendé de nivel con cada kilómetro recorrido para acceder a atención prioritaria y preventas exclusivas.",
      image:
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85",
    },
    {
      icon: "Coffee",
      title: "Gastronomía de Autor",
      description:
        "Beneficios directos en cafeterías de especialidad, restaurantes y bodegas adheridas al programa.",
      image:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85",
    },
    {
      icon: "ShoppingBag",
      title: "Retail & Lifestyle",
      description:
        "Vouchers de descuento y beneficios en marcas seleccionadas de indumentaria, equipamiento y tecnología.",
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85",
    },
  ],
  ctaBlock: {
    title: "Activá tu Travel Wallet hoy mismo.",
    subtitle:
      "Iniciá sesión o creá tu cuenta sin costo para empezar a acumular puntos en cada experiencia y traslado.",
    buttonText: "Activar mi Billetera Rewards",
    buttonUrl: "/login",
  },
  businessSection: {
    title: "Integrá tu marca al ecosistema TravelApp Rewards.",
    subtitle:
      "Posicioná tu comercio frente a miles de viajeros y usuarios recurrentes. Fidelizá clientes con acreditación y canje digital inmediato.",
    buttonText: "Solicitar Alianza Comercial",
    buttonUrl: "mailto:partners@travelapp.ar",
    features: [
      "Presencia destacada en el Catálogo Oficial de Canjes",
      "Validación digital de vouchers y puntos en tiempo real",
      "Reportes ejecutivos de conversión y recurrencia en Concorde 360",
      "Ejecutivo de cuentas dedicado y campañas co-branded",
    ],
  },
  redesSociales: {
    facebook: "https://facebook.com/travelapp.ar",
    instagram: "https://instagram.com/travelapp.ar",
    whatsapp: "https://wa.me/5493812000712",
    youtube: "https://youtube.com/@travelapp_ar",
    tiktok: "https://tiktok.com/@travelapp.ar",
    linkedin: "https://linkedin.com/company/travelapp-sas",
  },
  sellosLegales: {
    arcaQr: "",
    baseDatosSello: "",
  },
  footer: {
    copyrightText:
      "Copyright © 2026 TravelApp S.A.S. Todos los derechos reservados.",
  },
};

const RenderLegalSeal = ({ content, alt }: { content?: string; alt: string }) => {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("<") || trimmed.includes("<script")) {
    return (
      <div
        className="flex items-center justify-center min-h-[40px] max-h-14 overflow-hidden [&_img]:max-h-10 [&_img]:w-auto"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  return (
    <div className="flex items-center gap-2 border border-white/20 bg-white/5 px-3 py-1.5">
      <img src={trimmed} alt={alt} className="h-6 w-auto object-contain" />
      <span className="text-[10px] font-semibold text-white/70 uppercase">{alt}</span>
    </div>
  );
};

export default function RewardsLandingClient({ initialCms }: { initialCms?: any }) {
  const [cmsData, setCmsData] = useState<any>(
    initialCms ? { ...DEFAULT_REWARDS_CMS_DATA, ...initialCms } : DEFAULT_REWARDS_CMS_DATA
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showTravisChannels, setShowTravisChannels] = useState(false);
  const [legalModal, setLegalModal] = useState<
    "privacidad" | "terminos" | "arrepentimiento" | "contacto" | null
  >(null);
  const [arrepentimientoSent, setArrepentimientoSent] = useState(false);

  // Sincronización en tiempo real con CMS Concorde 360
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "cms", "landing_rewards"),
      (snap) => {
        if (snap.exists()) {
          setCmsData({ ...DEFAULT_REWARDS_CMS_DATA, ...snap.data() });
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  // Auto-avance del Hero Slider
  useEffect(() => {
    const slidesCount = cmsData.heroSlides?.length || 1;
    if (slidesCount <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesCount);
    }, 6500);
    return () => clearInterval(interval);
  }, [cmsData.heroSlides]);

  const slides = cmsData.heroSlides || DEFAULT_REWARDS_CMS_DATA.heroSlides;
  const howItWorks = cmsData.howItWorks || DEFAULT_REWARDS_CMS_DATA.howItWorks;
  const rawBenefits = cmsData.benefits || DEFAULT_REWARDS_CMS_DATA.benefits;
  const ctaBlock = cmsData.ctaBlock || DEFAULT_REWARDS_CMS_DATA.ctaBlock;
  const businessSection = cmsData.businessSection || DEFAULT_REWARDS_CMS_DATA.businessSection;

  // Imágenes editoriales por defecto para el mosaico 2x2 estilo apple.com/la
  const defaultPanelImages = [
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85",
  ];

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] font-sans antialiased selection:bg-[#0a2a5b] selection:text-white overflow-x-hidden">
      {/* ════════════════════════════════════════════════════════════════
          1. HEADER CORPORATIVO — AZUL TECH #0a2a5b (ADN DE MARCA)
      ════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full bg-[#0a2a5b] text-white border-b border-white/10">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo Oficial TravelApp Rewards en Blanco */}
          <Link href="/landing/rewards" className="flex items-center shrink-0">
            <img
              src="/assets/rewards_blanco.svg"
              alt="TravelApp Rewards"
              className="h-9 sm:h-10 w-auto object-contain brightness-100 contrast-125"
            />
          </Link>

          {/* Navegación Central Estilo Apple */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-normal text-white/85 tracking-tight">
            <a href="#beneficios" className="hover:text-white transition-colors">
              Beneficios
            </a>
            <a href="#como-sumar" className="hover:text-white transition-colors">
              Cómo Sumar
            </a>
            <Link href="/canjes" className="hover:text-white transition-colors">
              Catálogo de Canjes
            </Link>
            <a href="#wallet" className="hover:text-white transition-colors">
              Travel Wallet
            </a>
            <a href="#negocios" className="hover:text-white transition-colors">
              Comercios Partners
            </a>
            <a href="#travis-rewards" className="hover:text-white transition-colors">
              Travis
            </a>
            <button
              type="button"
              onClick={() => setLegalModal("contacto")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Contacto
            </button>
          </nav>

          {/* Acciones Derecha: Teléfono Oficial + Login / Activación */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <a
              href="tel:08102200018"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/90 hover:text-white px-2.5 py-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#e85d04]" />
              <span>0810-220-0018</span>
            </a>

            <Link
              href="/login"
              className="text-[12px] font-medium text-white/90 hover:text-white px-3.5 py-1.5 border border-white/25 hover:border-white transition-colors"
            >
              Mi Wallet
            </Link>

            <Link
              href={ctaBlock?.buttonUrl || "/login"}
              className="inline-flex items-center gap-1.5 bg-[#d95b00] hover:bg-[#c25000] text-white text-[12px] font-medium px-4 py-1.5 rounded-full transition-colors"
            >
              <span>Activar Cuenta</span>
            </Link>
          </div>

          {/* Botón Menú Mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-white/90 hover:text-white"
            aria-label="Menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Menú Mobile Desplegable */}
        {mobileOpen && (
          <div className="lg:hidden bg-[#0a2a5b] border-t border-white/10 px-6 py-5 space-y-3 text-[14px]">
            <a
              href="#beneficios"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-white/90 border-b border-white/10"
            >
              Beneficios
            </a>
            <a
              href="#como-sumar"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-white/90 border-b border-white/10"
            >
              Cómo Sumar Puntos
            </a>
            <Link
              href="/canjes"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-white/90 border-b border-white/10"
            >
              Catálogo de Canjes
            </Link>
            <a
              href="#negocios"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-white/90 border-b border-white/10"
            >
              Comercios Partners
            </a>
            <a
              href="tel:08102200018"
              className="flex items-center gap-2 py-2 text-white font-medium"
            >
              <Phone className="w-4 h-4 text-[#e85d04]" />
              0810-220-0018
            </a>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                href="/login"
                className="w-full text-center py-2.5 border border-white/30 text-white text-[13px] font-medium"
              >
                Ingresar a Mi Wallet
              </Link>
              <Link
                href={ctaBlock?.buttonUrl || "/login"}
                className="w-full text-center py-2.5 bg-[#d95b00] text-white text-[13px] font-medium"
              >
                Activar Cuenta
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ════════════════════════════════════════════════════════════════
          2. CINTA DE ESTADO INSTITUCIONAL (Estilo Apple Ribbon)
      ════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-[#f5f5f7] border-b border-[#d2d2d7]/70 py-2.5 px-4 text-center">
        <p className="text-[12px] text-[#1d1d1f] tracking-tight">
          <span className="font-semibold text-[#0a2a5b]">TravelApp Rewards:</span>{" "}
          Sumá 10 Puntos Travel por cada kilómetro recorrido o reserva confirmada.{" "}
          <Link
            href="/canjes"
            className="text-[#d95b00] hover:underline font-medium inline-flex items-center gap-0.5 ml-1"
          >
            Explorar catálogo de canjes <ChevronRight className="w-3 h-3" />
          </Link>
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          3. HERO FULL-BLEED ESTILO APPLE.COM/LA
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full h-[600px] md:h-[660px] bg-[#000000] overflow-hidden select-none">
        {slides.map((slide: any, idx: number) => {
          const isCurrent = currentSlide === idx;
          return (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-700 ${
                isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Imagen de fondo con tratamiento editorial oscuro */}
              <img
                src={
                  slide.bgImage ||
                  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85"
                }
                alt={slide.title || "TravelApp Rewards"}
                className="w-full h-full object-cover object-center opacity-55 scale-100 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#000000]/80 via-[#0a2a5b]/45 to-[#000000]/90" />

              {/* Contenido Editorial Centrado Estilo Apple */}
              <div className="relative z-20 max-w-[980px] mx-auto h-full px-6 pt-16 pb-24 flex flex-col items-center justify-between text-center text-white">
                <div className="space-y-4 max-w-3xl mt-4">
                  <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.18em] text-[#e85d04]">
                    PROGRAMA DE LEALTAD OFICIAL
                  </p>
                  <h1 className="text-[40px] sm:text-[54px] md:text-[64px] font-semibold tracking-[-0.03em] leading-[1.05] text-white">
                    {slide.title}
                  </h1>
                  <p className="text-[17px] sm:text-[20px] text-white/85 font-normal leading-[1.38] max-w-2xl mx-auto">
                    {slide.subtitle}
                  </p>
                  {slide.text && (
                    <p className="text-[13px] text-white/60 font-normal pt-1">
                      {slide.text}
                    </p>
                  )}

                  {/* Doble Botón Píldora Estilo Apple.com/la */}
                  <div className="pt-5 flex flex-wrap items-center justify-center gap-3.5">
                    <Link
                      href={slide.ctaUrl || "/canjes"}
                      className="px-6 py-2.5 rounded-full bg-[#d95b00] hover:bg-[#c25000] text-white text-[14px] font-normal tracking-tight transition-colors"
                    >
                      {slide.ctaText || "Ver Catálogo de Canjes"}
                    </Link>
                    <Link
                      href="/login"
                      className="px-6 py-2.5 rounded-full border border-white/60 hover:bg-white hover:text-[#1d1d1f] text-white text-[14px] font-normal tracking-tight transition-colors"
                    >
                      Activar mi Wallet
                    </Link>
                  </div>
                </div>

                {/* Barra Inferior de Métricas de Precisión (Corte Arquitectónico) */}
                <div className="w-full max-w-4xl border-t border-white/15 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
                  <div>
                    <p className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-white">
                      1 Km = 10 Pts
                    </p>
                    <p className="text-[12px] text-white/65">
                      Conversión directa en viajes
                    </p>
                  </div>
                  <div>
                    <p className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-white">
                      +50 Marcas
                    </p>
                    <p className="text-[12px] text-white/65">
                      Gastronomía, turismo y retail
                    </p>
                  </div>
                  <div>
                    <p className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-white">
                      100% Digital
                    </p>
                    <p className="text-[12px] text-white/65">
                      Acreditación automática
                    </p>
                  </div>
                  <div>
                    <p className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-[#e85d04]">
                      $0 Costo
                    </p>
                    <p className="text-[12px] text-white/65">
                      Membresía libre de mantenimiento
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Controles si hay múltiples slides en CMS */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          4. MOSAICO EDITORIAL 2x2 ESTILO APPLE.COM/LA (#beneficios)
          Sin bordes redondeados genéricos (rounded-none), separación de 12px (gap-3)
          y contraste de superficies ADN de Marca (#000000, #0a2a5b, #f5f5f7, #fafafa)
      ════════════════════════════════════════════════════════════════ */}
      <section id="beneficios" className="w-full bg-white p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rawBenefits.slice(0, 4).map((b: any, index: number) => {
            // Alternancia de temas exactamente como la captura de apple.com/la:
            // Fila 1: Oscuros (#000000 y #0a2a5b) | Fila 2: Claros (#f5f5f7 y #eef2f6)
            const isDark = index < 2;
            const bgClass =
              index === 0
                ? "bg-[#000000] text-white"
                : index === 1
                ? "bg-[#0a2a5b] text-white"
                : index === 2
                ? "bg-[#f5f5f7] text-[#1d1d1f]"
                : "bg-[#edf1f7] text-[#1d1d1f]";

            const imgSrc = b.image || defaultPanelImages[index % defaultPanelImages.length];

            return (
              <div
                key={index}
                className={`relative h-[530px] sm:h-[570px] overflow-hidden flex flex-col justify-between select-none ${bgClass}`}
              >
                {/* Bloque Superior Tipográfico Centrado (Idéntico a MacBook Air / iPad Air en apple.com/la) */}
                <div className="relative z-10 px-6 pt-12 pb-6 text-center max-w-lg mx-auto space-y-2.5">
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      isDark ? "text-[#e85d04]" : "text-[#d95b00]"
                    }`}
                  >
                    BENEFICIO 0{index + 1} · REWARDS
                  </p>
                  <h2 className="text-[32px] sm:text-[38px] font-semibold tracking-[-0.025em] leading-[1.08]">
                    {b.title}
                  </h2>
                  <p
                    className={`text-[15px] sm:text-[17px] font-normal leading-[1.38] ${
                      isDark ? "text-white/80" : "text-[#515154]"
                    }`}
                  >
                    {b.description}
                  </p>

                  {/* Doble Botón Píldora Estilo Apple */}
                  <div className="pt-3 flex items-center justify-center gap-3">
                    <Link
                      href="/canjes"
                      className={`px-5 py-2 rounded-full text-[13px] font-normal transition-colors ${
                        isDark
                          ? "bg-[#d95b00] hover:bg-[#c25000] text-white"
                          : "bg-[#0a2a5b] hover:bg-[#071d40] text-white"
                      }`}
                    >
                      Más información
                    </Link>
                    <Link
                      href="/login"
                      className={`px-5 py-2 rounded-full text-[13px] font-normal border transition-colors ${
                        isDark
                          ? "border-white/50 text-white hover:bg-white hover:text-[#1d1d1f]"
                          : "border-[#0a2a5b] text-[#0a2a5b] hover:bg-[#0a2a5b] hover:text-white"
                      }`}
                    >
                      Canjear ahora
                    </Link>
                  </div>
                </div>

                {/* Fotografía Inferior de Alto Contraste */}
                <div className="relative w-full h-[270px] sm:h-[300px] mt-auto overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={b.title}
                    className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  />
                  {isDark ? (
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-transparent" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          5. ¿CÓMO SUMAR PUNTOS? — GRILLA ARQUITECTÓNICA DE CORTE RECTO
      ════════════════════════════════════════════════════════════════ */}
      <section
        id="como-sumar"
        className="w-full bg-white py-20 sm:py-24 px-4 sm:px-6 border-t border-b border-[#d2d2d7]"
      >
        <div className="max-w-[1080px] mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#d95b00] mb-2">
              MECÁNICA DE ACREDITACIÓN
            </p>
            <h2 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.025em] text-[#1d1d1f] leading-[1.08]">
              Cómo funciona TravelApp Rewards.
            </h2>
            <p className="mt-3 text-[17px] text-[#6e6e73] font-normal leading-[1.45]">
              Un sistema unificado entre movilidad urbana, excursiones turísticas y comercios aliados. Sin formularios ni cargas manuales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-[#d2d2d7] md:divide-x md:divide-[#d2d2d7]">
            {howItWorks.map((step: any, i: number) => (
              <div
                key={i}
                className="py-10 md:px-8 first:md:pl-0 last:md:pr-0 border-b md:border-b-0 border-[#d2d2d7] flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block text-[13px] font-mono font-semibold text-[#d95b00] mb-4">
                    PASO {step.step}
                  </span>
                  <h3 className="text-[24px] font-semibold tracking-[-0.015em] text-[#1d1d1f] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[15px] text-[#6e6e73] leading-[1.5]">
                    {step.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#f5f5f7] flex items-center justify-between text-[13px] font-medium text-[#0a2a5b]">
                  <span>
                    {i === 0
                      ? "TravelCab & Experience"
                      : i === 1
                      ? "Acreditación en tiempo real"
                      : "Código QR inmediato"}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#d95b00]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          6. SHOWCASE TRAVEL WALLET & CREDENCIAL EJECUTIVA (#wallet)
      ════════════════════════════════════════════════════════════════ */}
      <section id="wallet" className="w-full bg-[#f5f5f7] py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-[1080px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Columna Izquierda: Explicación Editorial */}
          <div className="lg:col-span-6 space-y-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#d95b00]">
              TRAVELAPP WALLET
            </p>
            <h2 className="text-[36px] sm:text-[46px] font-semibold tracking-[-0.025em] text-[#1d1d1f] leading-[1.06]">
              {ctaBlock?.title || "Tu credencial digital para todo el ecosistema."}
            </h2>
            <p className="text-[17px] text-[#6e6e73] leading-[1.45]">
              {ctaBlock?.subtitle ||
                "Consultá tu balance de Puntos Travel, descargá tus vouchers de descuento y pagá tus traslados desde una única interfaz."}
            </p>

            <div className="pt-2 space-y-2.5 text-[14px] text-[#1d1d1f]">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#d95b00] shrink-0" />
                <span>Balance unificado entre TravelCab y TravelApp Experience</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#d95b00] shrink-0" />
                <span>Canje inmediato mediante código QR verificado en comercios</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#d95b00] shrink-0" />
                <span>Sin vencimiento de puntos para cuentas con actividad semestral</span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-3.5">
              <Link
                href={ctaBlock?.buttonUrl || "/login"}
                className="px-6 py-3 rounded-full bg-[#0a2a5b] hover:bg-[#071d40] text-white text-[14px] font-normal transition-colors"
              >
                {ctaBlock?.buttonText || "Activar mi Billetera Rewards"}
              </Link>
              <Link
                href="/canjes"
                className="px-6 py-3 rounded-full border border-[#1d1d1f]/30 hover:border-[#1d1d1f] text-[#1d1d1f] text-[14px] font-normal transition-colors"
              >
                Ver Catálogo Completo
              </Link>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta Corporativa Minimalista (Inspirada en Apple Card, Cero Neón) */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-[#d2d2d7] p-8 sm:p-10 shadow-sm">
              {/* Tarjeta Física/Digital Sobria */}
              <div className="bg-[#0a2a5b] text-white p-7 sm:p-8 aspect-[1.58/1] flex flex-col justify-between relative overflow-hidden border border-white/10">
                <div className="flex items-start justify-between">
                  <img
                    src="/assets/rewards_blanco.svg"
                    alt="TravelApp Rewards"
                    className="h-7 w-auto object-contain"
                  />
                  <span className="text-[11px] font-mono uppercase tracking-widest text-white/70 border border-white/20 px-2.5 py-0.5">
                    MEMBER PASS
                  </span>
                </div>

                <div className="my-auto pt-4">
                  <p className="text-[11px] uppercase tracking-widest text-white/60">
                    BALANCE DISPONIBLE
                  </p>
                  <p className="text-[32px] sm:text-[38px] font-semibold tracking-tight text-white leading-none mt-1">
                    14.850 <span className="text-[16px] font-normal text-[#e85d04]">PTS</span>
                  </p>
                </div>

                <div className="flex items-end justify-between border-t border-white/15 pt-4 text-[12px]">
                  <div>
                    <p className="text-white/50 text-[10px] uppercase tracking-wider">
                      TITULAR ECOSISTEMA
                    </p>
                    <p className="font-medium tracking-wide text-white">
                      MIEMBRO PREFERENCIAL
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-white/80">NIVEL ORO</span>
                    <div className="w-7 h-7 bg-white p-1 flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-[#0a2a5b]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie de especificación de la tarjeta */}
              <div className="mt-6 pt-5 border-t border-[#e5e5ea] grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[11px] text-[#86868b] uppercase">Cobertura</p>
                  <p className="text-[14px] font-semibold text-[#1d1d1f] mt-0.5">Nacional</p>
                </div>
                <div className="border-l border-r border-[#e5e5ea]">
                  <p className="text-[11px] text-[#86868b] uppercase">Acreditación</p>
                  <p className="text-[14px] font-semibold text-[#1d1d1f] mt-0.5">Inmediata</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#86868b] uppercase">Canje Mínimo</p>
                  <p className="text-[14px] font-semibold text-[#d95b00] mt-0.5">500 Pts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          7. SECCIÓN B2B: COMERCIOS Y EMPRESAS PARTNERS (#negocios)
      ════════════════════════════════════════════════════════════════ */}
      <section id="negocios" className="w-full bg-[#0a2a5b] text-white py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-[1080px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#e85d04]">
              TRAVELAPP BUSINESS PARTNERS
            </p>
            <h2 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.025em] leading-[1.08]">
              {businessSection?.title || "Integrá tu marca al ecosistema TravelApp Rewards."}
            </h2>
            <p className="text-[17px] text-white/80 font-normal leading-[1.45] max-w-2xl">
              {businessSection?.subtitle ||
                "Sumate al programa y ofrecé beneficios a miles de pasajeros y turistas activos cada mes."}
            </p>

            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(
                businessSection?.features ||
                DEFAULT_REWARDS_CMS_DATA.businessSection.features
              ).map((feature: string, i: number) => (
                <div
                  key={i}
                  className="border border-white/15 bg-white/5 p-4 flex items-start gap-3"
                >
                  <Check className="w-4 h-4 text-[#e85d04] shrink-0 mt-0.5" />
                  <span className="text-[13px] text-white/90 leading-snug">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <a
                href={businessSection?.buttonUrl || "mailto:partners@travelapp.ar"}
                className="px-6 py-2.5 rounded-full bg-[#d95b00] hover:bg-[#c25000] text-white text-[14px] font-normal transition-colors"
              >
                {businessSection?.buttonText || "Quiero ser Partner"}
              </a>
              <a
                href="mailto:partners@travelapp.ar"
                className="text-[13px] text-white/80 hover:text-white underline underline-offset-4"
              >
                partners@travelapp.ar
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-[#071d40] border border-white/15 p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[#e85d04] font-semibold">
                    RED DE COMERCIOS ADHERIDOS
                  </p>
                  <h3 className="text-[20px] font-semibold text-white mt-1">
                    Portal de Alianzas B2B
                  </h3>
                </div>
                <Building2 className="w-7 h-7 text-white/70" />
              </div>

              <div className="space-y-4 text-[13px]">
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-white/65">Rubros habilitados</span>
                  <span className="font-medium text-white">Gastronomía, Hotelería, Retail</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-white/65">Liquidación de canjes</span>
                  <span className="font-medium text-white">Auditoría en Concorde 360</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-white/65">Costo de adhesión</span>
                  <span className="font-medium text-[#e85d04]">Bonificado 100%</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 text-[12px] text-white/80 leading-relaxed">
                Nuestro equipo comercial configura tus beneficios en el catálogo oficial en menos de 48 horas hábiles.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          8. SECCIÓN TRAVIS REWARDS (ASISTENTE OMNICANAL OFICIAL)
      ════════════════════════════════════════════════════════════════ */}
      <section
        id="travis-rewards"
        className="w-full bg-white py-20 px-4 sm:px-6 border-t border-[#d2d2d7]"
      >
        <div className="max-w-[1080px] mx-auto bg-[#f5f5f7] border border-[#d2d2d7] p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="w-28 h-28 bg-white border border-[#d2d2d7] flex items-center justify-center p-3 mb-4">
                <img
                  src="/assets/travis_rewards.svg"
                  alt="Travis Rewards"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#d95b00]">
                CONCIERGE INTELIGENTE 24/7
              </span>
              <h3 className="text-[26px] font-semibold text-[#1d1d1f] tracking-tight mt-1">
                Travis Rewards
              </h3>
            </div>

            <div className="lg:col-span-8 space-y-5">
              <p className="text-[16px] sm:text-[18px] text-[#1d1d1f] font-normal leading-relaxed">
                Consultá tu saldo de puntos, pedí recomendaciones de canjes en destino o gestioná beneficios corporativos hablando directamente con{" "}
                <strong className="font-semibold text-[#0a2a5b]">Travis</strong> a través de todos nuestros canales verificados.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTravisChannels(!showTravisChannels)}
                  className="px-6 py-2.5 rounded-full bg-[#0a2a5b] hover:bg-[#071d40] text-white text-[13px] font-medium transition-colors cursor-pointer"
                >
                  {showTravisChannels
                    ? "Ocultar canales de atención"
                    : "Ver canales oficiales de Travis"}
                </button>
                <a
                  href="https://wa.me/5493812000712?text=Hola%20Travis,%20quiero%20consultar%20sobre%20mis%20puntos%20TravelApp%20Rewards"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 rounded-full border border-[#0a2a5b] text-[#0a2a5b] hover:bg-[#0a2a5b] hover:text-white text-[13px] font-medium transition-colors"
                >
                  WhatsApp Directo (+54 9 381 200-0712)
                </a>
              </div>

              {showTravisChannels && (
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 border-t border-[#d2d2d7]">
                  <a
                    href="https://wa.me/5493812000712?text=Hola%20Travis,%20quiero%20consultar%20sobre%20TravelApp%20Rewards"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-[#d2d2d7] hover:border-[#0a2a5b] p-3.5 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      WA
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#1d1d1f]">WhatsApp</p>
                      <p className="text-[11px] text-[#6e6e73]">+54 9 381 200-0712</p>
                    </div>
                  </a>

                  <a
                    href="https://m.me/travelapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-[#d2d2d7] hover:border-[#0a2a5b] p-3.5 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0084FF] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      FB
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#1d1d1f]">Messenger</p>
                      <p className="text-[11px] text-[#6e6e73]">@travelapp</p>
                    </div>
                  </a>

                  <a
                    href="https://ig.me/m/travelapp.ar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-[#d2d2d7] hover:border-[#0a2a5b] p-3.5 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#E1306C] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      IG
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#1d1d1f]">Instagram DM</p>
                      <p className="text-[11px] text-[#6e6e73]">@travelapp.ar</p>
                    </div>
                  </a>

                  <a
                    href="tel:08102200018"
                    className="bg-white border border-[#d2d2d7] hover:border-[#0a2a5b] p-3.5 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0a2a5b] text-white flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#1d1d1f]">Centro Telefónico</p>
                      <p className="text-[11px] text-[#6e6e73]">0810-220-0018</p>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          9. FOOTER CORPORATIVO OFICIAL (#0a2a5b)
      ════════════════════════════════════════════════════════════════ */}
      <footer className="w-full bg-[#0a2a5b] text-white/85 font-sans border-t border-white/10">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/15">
            {/* Columna Marca */}
            <div className="md:col-span-4 space-y-5">
              <div className="flex items-center gap-4">
                <img
                  src="/assets/rewards_blanco.svg"
                  alt="TravelApp Rewards"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <p className="text-[12px] text-white/65 leading-relaxed max-w-xs">
                Programa oficial de fidelización y beneficios del ecosistema TravelApp S.A.S. Acumulá y canjeá en todo el país.
              </p>

              {/* Iconos Oficiales de Redes Sociales */}
              <div className="flex items-center gap-2.5 pt-1">
                <a
                  href={cmsData.redesSociales?.facebook || "https://facebook.com/travelapp.ar"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#1877F2] transition-colors flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
                <a
                  href={cmsData.redesSociales?.instagram || "https://instagram.com/travelapp.ar"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#E1306C] transition-colors flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href={cmsData.redesSociales?.tiktok || "https://tiktok.com/@travelapp.ar"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-black transition-colors flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
                <a
                  href={cmsData.redesSociales?.youtube || "https://youtube.com/@travelapp_ar"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#FF0000] transition-colors flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com/company/travelapp-sas"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#0A66C2] transition-colors flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Columna Secciones */}
            <div className="md:col-span-2 space-y-2.5 text-[12px]">
              <h4 className="font-semibold text-white tracking-tight">Programa</h4>
              <ul className="space-y-2 text-white/70">
                <li>
                  <a href="#beneficios" className="hover:text-white transition-colors">
                    Beneficios
                  </a>
                </li>
                <li>
                  <a href="#como-sumar" className="hover:text-white transition-colors">
                    Cómo sumar
                  </a>
                </li>
                <li>
                  <Link href="/canjes" className="hover:text-white transition-colors">
                    Catálogo de Canjes
                  </Link>
                </li>
                <li>
                  <a href="#negocios" className="hover:text-white transition-colors">
                    Sumá tu Negocio
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Mi Wallet
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna Contacto */}
            <div className="md:col-span-3 space-y-2.5 text-[12px]">
              <h4 className="font-semibold text-white tracking-tight">
                Atención y Contacto
              </h4>
              <ul className="space-y-2 text-white/70">
                <li>
                  <a href="mailto:hola@travelapp.ar" className="hover:text-white transition-colors">
                    Contacto: <span className="text-white">hola@travelapp.ar</span>
                  </a>
                </li>
                <li>
                  <a href="tel:08102200018" className="hover:text-white transition-colors">
                    Teléfono: <span className="text-white">0810-220-0018</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/5493812000712"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    WhatsApp (Travis):{" "}
                    <span className="text-white">+54 9 381 200-0712</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna Legales */}
            <div className="md:col-span-3 space-y-2.5 text-[12px]">
              <h4 className="font-semibold text-white tracking-tight">Legales</h4>
              <ul className="space-y-2 text-white/70">
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal("privacidad")}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Política de privacidad
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal("terminos")}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Términos y condiciones de uso de la app
                  </button>
                </li>
                <li className="pt-2">
                  <button
                    type="button"
                    onClick={() => setLegalModal("arrepentimiento")}
                    className="px-4 py-2 rounded-full border border-white/30 hover:border-white text-white text-[12px] font-normal transition-colors cursor-pointer"
                  >
                    Botón de arrepentimiento
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Barra Institucional QR ARCA + ATAVyT + RNBD */}
          <div className="py-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-white p-1 flex items-center justify-center shrink-0">
                  <QrCode className="w-8 h-8 text-[#0a2a5b]" />
                </div>
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold text-white">Inscripción ARCA</div>
                  <div className="text-white/60">Data Fiscal Oficial</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pl-6 border-l border-white/15">
                <div className="px-2.5 py-1.5 bg-white/10 border border-white/20 text-[11px] font-semibold text-white tracking-tight">
                  ATAVyT
                </div>
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold text-white">Socio Activo</div>
                  <div className="text-white/60">Agencias de Viajes y Turismo</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pl-6 border-l border-white/15">
                <div className="px-2.5 py-1.5 bg-white/10 border border-white/20 text-[11px] font-semibold text-white tracking-tight">
                  RNBD
                </div>
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold text-white">Base de Datos</div>
                  <div className="text-white/60">Ley N° 25.326 PDP</div>
                </div>
              </div>

              {cmsData.sellosLegales && (
                <>
                  <RenderLegalSeal content={cmsData.sellosLegales?.arcaQr} alt="ARCA" />
                  <RenderLegalSeal
                    content={cmsData.sellosLegales?.baseDatosSello}
                    alt="Base de Datos"
                  />
                </>
              )}
            </div>

            <div className="text-[11px] text-white/50">
              Ecosistema Auditado · Concorde 360
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/55">
            <p>
              {cmsData.footer?.copyrightText ||
                "Copyright © 2026 TravelApp S.A.S. Todos los derechos reservados."}
            </p>
            <p>Tucumán · Argentina</p>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════════════════════
          MODALES LEGALES Y DE CONTACTO
      ════════════════════════════════════════════════════════════════ */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="bg-white text-[#1d1d1f] max-w-lg w-full p-8 border border-[#d2d2d7] shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#d2d2d7] pb-4">
              <h3 className="text-[20px] font-semibold tracking-tight text-[#0a2a5b]">
                {legalModal === "privacidad" && "Política de Privacidad"}
                {legalModal === "terminos" && "Términos y Condiciones — TravelApp Rewards"}
                {legalModal === "arrepentimiento" && "Botón de Arrepentimiento (Ley 24.240)"}
                {legalModal === "contacto" && "Canales Oficiales TravelApp Rewards"}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1 text-[#6e6e73] hover:text-[#1d1d1f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {legalModal === "privacidad" && (
              <p className="text-[13px] text-[#515154] leading-relaxed">
                TravelApp S.A.S. protege los datos personales y el historial transaccional de los miembros del programa TravelApp Rewards en cumplimiento de la Ley N° 25.326 de Protección de Datos Personales. Podés ejercer tus derechos de acceso, rectificación o supresión escribiendo a{" "}
                <strong className="text-[#1d1d1f]">hola@travelapp.ar</strong>.
              </p>
            )}

            {legalModal === "terminos" && (
              <p className="text-[13px] text-[#515154] leading-relaxed">
                Los Puntos Travel se acreditan automáticamente por servicios efectivamente completados y abonados dentro del ecosistema TravelApp. Los vouchers emitidos en el catálogo de canjes están sujetos a disponibilidad y vigencia informada en cada comercio adherido.
              </p>
            )}

            {legalModal === "contacto" && (
              <div className="space-y-3 text-[13px]">
                <a
                  href="https://wa.me/5493812000712"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
                >
                  <span className="font-medium">WhatsApp Oficial (Travis)</span>
                  <span className="font-semibold text-[#0a2a5b]">+54 9 381 200-0712</span>
                </a>
                <a
                  href="tel:08102200018"
                  className="flex items-center justify-between p-3.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
                >
                  <span className="font-medium">Atención Telefónica</span>
                  <span className="font-semibold text-[#0a2a5b]">0810-220-0018</span>
                </a>
                <a
                  href="mailto:hola@travelapp.ar"
                  className="flex items-center justify-between p-3.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
                >
                  <span className="font-medium">Correo Electrónico</span>
                  <span className="font-semibold text-[#0a2a5b]">hola@travelapp.ar</span>
                </a>
              </div>
            )}

            {legalModal === "arrepentimiento" && (
              <div>
                {arrepentimientoSent ? (
                  <div className="p-4 bg-[#f5f5f7] text-center space-y-2">
                    <p className="text-[14px] font-semibold text-[#0a2a5b]">
                      Solicitud registrada correctamente
                    </p>
                    <p className="text-[12px] text-[#6e6e73]">
                      Te enviamos el código de gestión a tu correo electrónico.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setArrepentimientoSent(true);
                      setTimeout(() => {
                        setArrepentimientoSent(false);
                        setLegalModal(null);
                      }, 2500);
                    }}
                    className="space-y-3 text-[13px]"
                  >
                    <p className="text-[#6e6e73] text-[12px]">
                      Ingresá el código de operación o canje para solicitar su revocación dentro de los 10 días corridos.
                    </p>
                    <input
                      required
                      type="text"
                      placeholder="Código de canje o reserva"
                      className="w-full px-3.5 py-2.5 border border-[#d2d2d7] text-[13px] focus:outline-none focus:border-[#0a2a5b]"
                    />
                    <input
                      required
                      type="email"
                      placeholder="Correo electrónico del titular"
                      className="w-full px-3.5 py-2.5 border border-[#d2d2d7] text-[13px] focus:outline-none focus:border-[#0a2a5b]"
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#d95b00] text-white font-medium text-[13px] cursor-pointer"
                    >
                      Enviar solicitud de baja
                    </button>
                  </form>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setLegalModal(null)}
              className="w-full py-2.5 bg-[#0a2a5b] text-white text-[13px] font-medium cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Widget Flotante Omnicanal Travis */}
      <TravisOmnichannelWidget
        businessUnit="Rewards"
        whatsappUrl={cmsData.redesSociales?.whatsapp || "https://wa.me/5493812000712"}
        messengerUrl="https://m.me/travelapp"
        instagramUrl={cmsData.redesSociales?.instagram || "https://instagram.com/travelapp.ar"}
        primaryColor="#0a2a5b"
        brandName="Rewards"
      />
    </div>
  );
}
