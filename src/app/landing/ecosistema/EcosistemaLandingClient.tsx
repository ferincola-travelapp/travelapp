"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Compass,
  Gift,
  Users,
  Car,
  Sparkles,
  ShieldCheck,
  Building2,
  CheckCircle2,
  ArrowRight,
  Globe,
  Award,
  Zap,
} from "lucide-react";

import { OtaHeader } from "@/components/ota/OtaHeader";
import { OtaHeroSlider, HeroSlide } from "@/components/ota/OtaHeroSlider";
import { OtaSearchEngine } from "@/components/ota/OtaSearchEngine";
import { OtaFloatingPromos } from "@/components/ota/OtaFloatingPromos";
import { OtaMarketplaceCarousel, MarketplaceItem } from "@/components/ota/OtaMarketplaceCarousel";
import { OtaRewardsSection } from "@/components/ota/OtaRewardsSection";
import { OtaAffiliatesSection } from "@/components/ota/OtaAffiliatesSection";
import { OtaBlogAndCareers, BlogPostData } from "@/components/ota/OtaBlogAndCareers";
import { OtaFooter } from "@/components/ota/OtaFooter";
import { OtaPromoPushPop, PromoPushPopConfig } from "@/components/ota/OtaPromoPushPop";
import { OtaCookieConsent } from "@/components/ota/OtaCookieConsent";
import { TravisOmnichannelWidget } from "@/components/shared/TravisOmnichannelWidget";

interface EcosistemaLandingClientProps {
  initialCms: any;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "slide-1",
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
    id: "slide-2",
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
    id: "slide-3",
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

const DEFAULT_PROMO_PUSHPOP: PromoPushPopConfig = {
  enabled: true,
  badge: "🔥 TRAVEL SALE 2026",
  title: "¡Hasta 40% OFF en Experiencias y Puntos Dobles!",
  subtitle:
    "Aprovechá las mejores escapadas de fin de semana largo y sumá doble puntaje TravelApp Rewards en todas tus reservas.",
  discountCode: "TRAVELSALE",
  imageUrl:
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
  ctaText: "Ver Ofertas Especiales",
  ctaUrl: "/landing/experience/marketplace",
};

export default function EcosistemaLandingClient({
  initialCms,
}: EcosistemaLandingClientProps) {
  const [cms, setCms] = useState<any>(initialCms || {});
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");

  // Cargar preferencia de moneda guardada
  useEffect(() => {
    const savedCurrency = localStorage.getItem("ta_currency") as "ARS" | "USD" | null;
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
  }, []);

  const handleCurrencyChange = (newCurr: "ARS" | "USD") => {
    setCurrency(newCurr);
    localStorage.setItem("ta_currency", newCurr);
  };

  // Suscripción en tiempo real a Firestore para actualización instantánea desde el CMS
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "cms", "landing_ecosistema"),
      (snap) => {
        if (snap.exists()) {
          setCms((prev: any) => ({ ...prev, ...snap.data() }));
        }
      },
      (error) => {
        console.warn("Aviso: No se pudo conectar en tiempo real al CMS de Firestore, usando cache inicial:", error);
      }
    );
    return () => unsub();
  }, []);

  // Slides del Hero (priorizamos fotos HD de turismo real, filtrando imágenes corporativas viejas en base64)
  const heroSlides: HeroSlide[] =
    cms.heroSliders && cms.heroSliders.length > 0
      ? cms.heroSliders
      : cms.hero?.mediaUrl && !cms.hero.mediaUrl.startsWith("data:image")
      ? [
          {
            id: "slide-cms",
            mediaType: cms.hero.mediaType || "image",
            mediaUrl: cms.hero.mediaUrl,
            badge: cms.hero.badge || "✦ DESTINOS PARADISÍACOS 2026",
            title: cms.hero.title || "Viajá donde siempre soñaste",
            subtitle:
              cms.hero.subtitle ||
              "Experiencias auténticas, movilidad segura y recompensas que crecen con cada aventura.",
            ctaText: cms.hero.ctaText || "Descubrí el Ecosistema",
            ctaUrl: cms.hero.ctaUrl || "/marketplace",
          },
          ...DEFAULT_SLIDES.slice(1),
        ]
      : DEFAULT_SLIDES;

  const promoConfig: PromoPushPopConfig = cms.promoPushPop || DEFAULT_PROMO_PUSHPOP;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-[#ff5a19]/20 selection:text-[#0a2a5b]">
      {/* 1. Header Global OTA */}
      <OtaHeader
        currency={currency}
        onCurrencyChange={handleCurrencyChange}
        phone={cms.contacto?.telefono || "+54 9 381 202-0050"}
        whatsappUrl={
          cms.contacto?.whatsapp ||
          "https://wa.me/5493812020050?text=Hola%20TravelApp!%20Quiero%20consultar%20por%20un%20viaje"
        }
      />

      {/* 2. Hero Slider Ultra HD Estilo Emirates / Ravello (Descomprimido y sin velo oscuro) */}
      <OtaHeroSlider slides={heroSlides}>
        <OtaSearchEngine />
      </OtaHeroSlider>

      {/* 3. Barra Flotante de Promociones & Financiación en Carrusel */}
      <OtaFloatingPromos />

      {/* 4. Carrusel de Viajes Destacados (80% Imagen HD / 20% Info puntual) */}
      <OtaMarketplaceCarousel
        currency={currency}
        items={cms.marketplaceDestacados}
      />

      {/* 5. Sección Institucional: Quiénes Somos & El Ecosistema */}
      <section id="quienes-somos" className="py-16 sm:py-24 bg-slate-50 font-sans border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-[#0a2a5b] text-xs font-bold uppercase mb-3">
              <Building2 className="w-3.5 h-3.5 text-[#ff5a19]" />
              <span>Conocé TravelApp</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
              La Red Integrada de Turismo y Movilidad de Argentina
            </h2>
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
              Nacimos para transformar la forma en que las personas viajan, se desplazan y disfrutan. Combinamos tecnología de punta con la calidez de guías y operadores locales en cada rincón del país.
            </p>
          </div>

          {/* Grid de 4 Unidades del Ecosistema */}
          <div id="servicios" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Unidad 1: Experience */}
            <Link
              href="/landing/experience"
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#ff4f5a] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#ff4f5a] transition-colors">
                  TravelApp Experience
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mb-4">
                  Excursiones auténticas, aventura, bodegas y escapadas guiadas por expertos con confirmación inmediata.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#ff4f5a] pt-3 border-t border-slate-100">
                <span>Ver experiencias</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Unidad 2: Rewards */}
            <Link
              href="/landing/rewards"
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#e5a93b] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Gift className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#e5a93b] transition-colors">
                  TravelApp Rewards
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mb-4">
                  El programa de beneficios donde cada reserva suma puntos canjeables por viajes, hoteles y descuentos exclusivos.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#e5a93b] pt-3 border-t border-slate-100">
                <span>Conocer programa</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Unidad 3: Afiliados */}
            <Link
              href="/landing/afiliados"
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  Red de Afiliados
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mb-4">
                  Monetizá tu audiencia recomendando viajes con links y cupones únicos. Cobrá comisiones mensuales en pesos o dólares.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 pt-3 border-t border-slate-100">
                <span>Sumarme como afiliado</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Unidad 4: TravelCab */}
            <Link
              href="/landing/travelcab"
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff5a19] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Car className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#ff5a19] transition-colors">
                  TravelCab Movilidad
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mb-4">
                  Traslados urbanos y de conexión a aeropuertos con tarifa transparente, conductores verificados y reserva anticipada.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#ff5a19] pt-3 border-t border-slate-100">
                <span>Pedir o programar traslado</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Sección TravelApp Rewards */}
      <OtaRewardsSection />

      {/* 7. Sección Afiliados & Embajadores */}
      <OtaAffiliatesSection />

      {/* 8. Blog de Viajes & Trabaja con Nosotros */}
      <OtaBlogAndCareers latestPost={cms.latestBlogPost} />

      {/* 9. Footer Oficial y Cumplimiento Regulatorio */}
      <OtaFooter config={cms.legales} />

      {/* 10. Push Pop Promocional Emergente (TravelSale, Puntos Dobles, etc.) */}
      <OtaPromoPushPop config={promoConfig} />

      {/* 11. Banner y Modal de Aceptación de Cookies (Ley 25.326) */}
      <OtaCookieConsent />

      {/* 12. Asistente Travis Omnichannel ManyChat */}
      <TravisOmnichannelWidget
        businessUnit="General"
        primaryColor="#0a2a5b"
        brandName="TravelApp"
        whatsappUrl={
          cms.contacto?.whatsapp ||
          "https://wa.me/5493812020050?text=Hola%20TravelApp!%20Quiero%20consultar%20por%20un%20viaje"
        }
      />
    </div>
  );
}
