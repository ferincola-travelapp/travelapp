"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { doc, onSnapshot, collection, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OtaPackage } from "@/types/ota";
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
  Phone,
  Mail,
  MapPin,
  X,
  Eye,
  Target,
  HeartHandshake,
  Star,
  Clock,
  Shield
} from "lucide-react";

import { OtaHeader } from "@/components/ota/OtaHeader";
import { OtaHeroSlider, HeroSlide } from "@/components/ota/OtaHeroSlider";
import { OtaSearchEngine } from "@/components/ota/OtaSearchEngine";
import { OtaFloatingPromos } from "@/components/ota/OtaFloatingPromos";
import { OtaMarketplaceCarousel, MarketplaceItem } from "@/components/ota/OtaMarketplaceCarousel";
import { OtaAppSection } from "@/components/ota/OtaAppSection";
import { OtaRewardsSection } from "@/components/ota/OtaRewardsSection";
import { OtaTravisSection } from "@/components/ota/OtaTravisSection";
import { OtaCareersSection } from "@/components/ota/OtaCareersSection";
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
    ctaUrl: "/marketplace?destination=Cancún",
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
    ctaUrl: "/marketplace?destination=Bariloche",
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
    ctaUrl: "/marketplace?destination=Iguazú",
  },
];

const DEFAULT_ECOSISTEMA_CMS = {
  hero: {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=95",
    overlayOpacity: 72,
    badge: "✦ EL ECOSISTEMA DE VIAJES MÁS COMPLETO DE ARGENTINA",
    title: "Un Ecosistema Diseñado\npara el Viajero Moderno",
    subtitle: "Experiencias auténticas, paquetes emisivos a todo el mundo, movilidad urbana segura y recompensas que crecen con cada aventura. Todo en un solo lugar.",
    ctaText: "Descubrí el Ecosistema",
    whatsappUrl: "https://wa.me/5493812000712",
    whatsappText: "Hablá con Nosotros",
  },
  unidades: [
    {
      id: "emisivo",
      nombre: "TravelMarket Turismo Emisivo",
      descripcionBreve: "Salidas grupales propias con coordinador, paquetes internacionales con operadores mayoristas y cruceros.",
      imagenUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      url: "/marketplace",
      tag: "Turismo Emisivo",
      cta: "Ver Paquetes & Salidas",
      accent: "text-blue-600 bg-blue-50"
    },
    {
      id: "receptivo",
      nombre: "Turismo Receptivo NOA",
      descripcionBreve: "Excursiones de día guiadas, bodegas, aventura en 4x4 y turismo receptivo en el Norte Argentino con guías certificados.",
      imagenUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80",
      url: "/landing/experience",
      tag: "Turismo Receptivo",
      cta: "Ver Receptivo",
      accent: "text-red-500 bg-red-50"
    },
    {
      id: "travelcab",
      nombre: "TravelCab Movilidad",
      descripcionBreve: "Traslados urbanos y conexiones seguras a aeropuertos con tarifas fijas, conductores verificados y reserva previa.",
      imagenUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
      url: "/landing/travelcab",
      tag: "Movilidad Urbana",
      cta: "Pedir o Cotizar Móvil",
      accent: "text-[#FF5A19] bg-orange-50"
    },
    {
      id: "rewards",
      nombre: "TravelApp Rewards & Afiliados",
      descripcionBreve: "Programa integral donde cada viaje suma puntos canjeables por beneficios, y red de afiliados con comisiones semanales.",
      imagenUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
      url: "/landing/rewards",
      tag: "Club & Embajadores",
      cta: "Catálogo & Beneficios",
      accent: "text-amber-600 bg-amber-50"
    },
  ],
  quienesSomos: {
    badge: "Nuestra Historia",
    titulo: "Construyendo el Futuro del Turismo Argentino",
    mision: "Empoderar a cada viajero conectándolo con las mejores opciones de transporte, alojamiento y experiencias guiadas con tarifas transparentes, atención 24/7 impulsada por IA y un ecosistema que premia cada kilómetro recorrido.",
    vision: "Ser la plataforma líder de turismo y movilidad integrada de Argentina y Latinoamérica, unificando paquetes emisivos de clase mundial, turismo receptivo regional y traslados seguros bajo un modelo de innovación continua, transparencia y fidelización real.",
    valores: "Transparencia, excelencia en el servicio, innovación constante e impacto positivo en las comunidades donde operamos."
  },
  stats: [
    { valor: "+15.000", label: "Pasajeros Transportados", icono: "Users" },
    { valor: "98.5%", label: "Satisfacción & Reseñas 5★", icono: "Star" },
    { valor: "24 / 7", label: "Coordinación & Soporte", icono: "Shield" },
    { valor: "100%", label: "Salidas Garantizadas con Time-to-Pay", icono: "Clock" },
  ],
  showStats: false,
  promoPushPop: {
    enabled: true,
    badge: "🔥 TRAVEL SALE 2026",
    title: "¡Hasta 40% OFF en Paquetes y Puntos Dobles!",
    subtitle: "Aprovechá las mejores salidas de turismo emisivo y sumá doble puntaje TravelApp Rewards en todas tus reservas.",
    discountCode: "TRAVELSALE",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    ctaText: "Ver Ofertas Especiales",
    ctaUrl: "/marketplace"
  },
  contacto: {
    telefono: "0810-220-0018",
    whatsapp: "https://wa.me/5493812000712",
    email: "hola@travelapp.ar"
  },
  redesSociales: {
    facebook: "",
    instagram: "",
    whatsapp: "https://wa.me/5493812000712",
    linkedin: "",
    youtube: "",
    tiktok: ""
  },
  legales: {
    razonSocial: "TravelApp S.A.S.",
    cuit: "30-71829304-8",
    domicilio: "San Miguel de Tucumán, Argentina",
    terminos: "Al utilizar nuestros servicios, el usuario acepta los términos y condiciones vigentes de TravelApp S.A.S.",
    privacidad: "TravelApp S.A.S. garantiza la protección de datos personales de conformidad con la Ley 25.326."
  }
};

export default function EcosistemaLandingClient({
  initialCms,
}: EcosistemaLandingClientProps) {
  const [cms, setCms] = useState<any>(() => {
    if (initialCms && Object.keys(initialCms).length > 0) {
      return { ...DEFAULT_ECOSISTEMA_CMS, ...initialCms };
    }
    return DEFAULT_ECOSISTEMA_CMS;
  });
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");

  // Modales interactivos
  const [quienesSomosModal, setQuienesSomosModal] = useState<"vision" | "mision" | "valores" | null>(null);
  const [contactoModal, setContactoModal] = useState(false);

  // Cargar preferencia de moneda guardada
  useEffect(() => {
    const savedCurrency = localStorage.getItem("ta_currency") as "ARS" | "USD" | null;
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
  }, []);

  const handleCurrencyChange = (c: "ARS" | "USD") => {
    setCurrency(c);
    localStorage.setItem("ta_currency", c);
  };

  // Escuchar cambios del CMS en Firestore en tiempo real (landing_ecosistema)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "cms", "landing_ecosistema"), (docSnap) => {
      if (docSnap.exists()) {
        const loaded = docSnap.data();
        setCms((prev: any) => ({
          ...DEFAULT_ECOSISTEMA_CMS,
          ...loaded,
          hero: { ...DEFAULT_ECOSISTEMA_CMS.hero, ...(loaded.hero || {}) },
          quienesSomos: { ...DEFAULT_ECOSISTEMA_CMS.quienesSomos, ...(loaded.quienesSomos || {}) },
          promoPushPop: loaded.promoPushPop || loaded.pushPopPromo || DEFAULT_ECOSISTEMA_CMS.promoPushPop,
          redesSociales: { ...DEFAULT_ECOSISTEMA_CMS.redesSociales, ...(loaded.redesSociales || {}) },
          legales: { ...DEFAULT_ECOSISTEMA_CMS.legales, ...(loaded.legales || {}) },
          contacto: { ...DEFAULT_ECOSISTEMA_CMS.contacto, ...(loaded.contacto || {}) }
        }));
      }
    }, (err) => {
      console.warn("Firestore cms/landing_ecosistema onSnapshot err:", err);
    });
    return () => unsub();
  }, []);

  // Construcción reactiva de los Slides del Hero basada en los datos del CMS
  const heroSlides: HeroSlide[] = React.useMemo(() => {
    if (Array.isArray(cms.heroSlider) && cms.heroSlider.length > 0) {
      return cms.heroSlider;
    }
    if (cms.hero?.mediaUrl) {
      return [
        {
          id: "hero-cms-active",
          mediaType: cms.hero.mediaType || "image",
          mediaUrl: cms.hero.mediaUrl,
          badge: cms.hero.badge || "✦ EL ECOSISTEMA DE VIAJES MÁS COMPLETO",
          title: cms.hero.title || "Un Ecosistema Diseñado para el Viajero Moderno",
          subtitle: cms.hero.subtitle || "Experiencias auténticas, movilidad segura y recompensas que crecen con cada aventura.",
          ctaText: cms.hero.ctaText || "Descubrí el Ecosistema",
          ctaUrl: cms.hero.whatsappUrl || "/marketplace",
        },
        ...DEFAULT_SLIDES.slice(1)
      ];
    }
    return DEFAULT_SLIDES;
  }, [cms.hero, cms.heroSlider]);

  // Configuración de la promo flotante PushPop
  const promoConfig: PromoPushPopConfig = cms.promoPushPop || cms.pushPopPromo || DEFAULT_ECOSISTEMA_CMS.promoPushPop;

  // Teléfono oficial para Header y Footer
  const officialPhone = cms.contacto?.telefono || cms.redesSociales?.whatsapp || "0810-220-0018";

  // Configuración del Footer conectado al CMS (oculta redes y sellos sin datos cargados)
  const footerConfig = React.useMemo(() => {
    const sellos = cms.sellosLegales || {};
    const trustBadges = [
      { id: "arca", name: "ARCA Fiscal", codeOrImageUrl: sellos.arcaQr || "", active: Boolean(sellos.arcaQr?.trim()) },
      { id: "bases_datos", name: "Bases de Datos (Ley 25.326)", codeOrImageUrl: sellos.baseDatosSello || "", active: Boolean(sellos.baseDatosSello?.trim()) },
      { id: "atavyt", name: "ATAVyT", codeOrImageUrl: sellos.atavyt || "", active: Boolean(sellos.atavyt?.trim()) },
      { id: "faevyt", name: "FAEVYT", codeOrImageUrl: sellos.faevyt || "", active: Boolean(sellos.faevyt?.trim()) },
      { id: "iata", name: "IATA Member", codeOrImageUrl: sellos.iata || "", active: Boolean(sellos.iata?.trim()) },
    ];

    return {
      razonSocial: cms.legales?.razonSocial || "TravelApp S.A.S.",
      cuit: cms.legales?.cuit || "30-71829304-8",
      domicilio: cms.legales?.domicilio || "San Miguel de Tucumán, Argentina",
      phone: officialPhone,
      email: cms.contacto?.email || "hola@travelapp.ar",
      showFacebook: Boolean(cms.redesSociales?.facebook?.trim()),
      facebookUrl: cms.redesSociales?.facebook?.trim() || "",
      showInstagram: Boolean(cms.redesSociales?.instagram?.trim()),
      instagramUrl: cms.redesSociales?.instagram?.trim() || "",
      showLinkedin: Boolean(cms.redesSociales?.linkedin?.trim()),
      linkedinUrl: cms.redesSociales?.linkedin?.trim() || "",
      showYoutube: Boolean(cms.redesSociales?.youtube?.trim()),
      youtubeUrl: cms.redesSociales?.youtube?.trim() || "",
      showTiktok: Boolean(cms.redesSociales?.tiktok?.trim()),
      tiktokUrl: cms.redesSociales?.tiktok?.trim() || "",
      trustBadges,
    };
  }, [cms.legales, cms.contacto, cms.redesSociales, cms.sellosLegales, officialPhone]);

  // Unidades dinámicas del ecosistema
  const ecosystemUnits = Array.isArray(cms.unidades) && cms.unidades.length > 0
    ? cms.unidades
    : DEFAULT_ECOSISTEMA_CMS.unidades;

  // Estado del slide flagship del Hero
  const [activeSlide, setActiveSlide] = useState(0);

  // Paquetes reales del Marketplace desde Firestore (ota_packages)
  const [livePackages, setLivePackages] = useState<OtaPackage[]>([]);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>("Todos");

  useEffect(() => {
    const q = query(collection(db, "ota_packages"), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }) as OtaPackage)
          .filter((p) => (p as any).status !== "pausado" && (p as any).status !== "inactivo");
        list.sort((a: any, b: any) =>
          String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))
        );
        setLivePackages(list);
      },
      (err) => {
        console.warn("Firestore ota_packages carousel err:", err);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const currentHero = heroSlides[activeSlide] || heroSlides[0];

  // Filtros rápidos editables desde CMS (hasta 6)
  const quickFilters: { label: string; href: string }[] =
    Array.isArray(cms.quickFilters) && cms.quickFilters.length > 0
      ? cms.quickFilters.slice(0, 6)
      : [
          { label: "Verano 2027", href: "/marketplace?q=Verano%202027" },
          { label: "Argentina", href: "/marketplace?region=Argentina" },
          { label: "Caribe", href: "/marketplace?region=Caribe" },
          { label: "Viajes Grupales", href: "/marketplace?type=salida_grupal" },
          { label: "Brasil", href: "/marketplace?region=Brasil" },
          { label: "Escapadas", href: "/marketplace?type=escapada" },
        ];

  // Mapear y filtrar paquetes reales para el carrusel
  const carouselItems: MarketplaceItem[] = React.useMemo(() => {
    const source = livePackages;
    const norm = (s: string) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const filtered =
      activeQuickFilter === "Todos"
        ? source
        : source.filter((p) => {
            const f = norm(activeQuickFilter);
            const hay = norm(
              [
                p.title,
                p.destination,
                p.country,
                p.region,
                p.type,
                p.tripKind,
                p.modality,
                p.description,
                (p.departureDates || []).join(" "),
                (p.customTags || []).join(" "),
              ]
                .filter(Boolean)
                .join(" ")
            );
            if (f.includes("grupal")) {
              return p.type === "salida_grupal" || p.modality === "Salida Grupal Acompañada" || hay.includes("grupal");
            }
            if (f.includes("escapada")) {
              return p.type === "escapada" || hay.includes("escapada");
            }
            return hay.includes(f);
          });

    return filtered.map((p) => {
      const priceArs = p.currency === "ARS" ? (p.price || p.priceArs || 0) : Math.round((p.price || p.priceUsd || 0) * 1250);
      const priceUsd = p.currency === "USD" ? (p.price || p.priceUsd || 0) : Math.round((p.price || p.priceArs || 0) / 1250);
      const isBus = p.transportType === "Bus" || p.transportType === "Bus Cama" || p.transportType === "Bus Semicama";
      const isAir = p.transportType === "Aéreo" || p.transportType === "Avión";
      const servicesList = [
        isAir
          ? (p.airline ? `Aéreo con ${p.airline}` : "Aéreos incluidos")
          : isBus
          ? `Bus ${p.busType || (p.transportType === "Bus Cama" ? "Cama" : "Semicama")}`
          : p.transportType && p.transportType !== "Sin Transporte"
          ? `Transporte: ${p.transportType}`
          : "Traslados según itinerario",
        p.hotelName
          ? `${p.hotelName}${p.hotelStars ? ` ${p.hotelStars}★` : ""}`
          : "Alojamiento seleccionado",
        p.foodPlan || "Régimen según itinerario",
      ];

      return {
        id: p.id,
        title: p.title,
        category: p.region || "Turismo Emisivo",
        destination: p.country ? `${p.destination}, ${p.country}` : p.destination,
        duration:
          p.durationDays && p.durationNights
            ? `${p.durationDays} Días / ${p.durationNights} Noches`
            : "Consultar duración",
        imageUrl:
          p.imageUrl ||
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=90",
        priceArs,
        priceUsd,
        pointsEarned: p.rewardsPointsEarned || Math.round(priceArs / 100),
        badge:
          p.stockBadge ||
          (p.type === "salida_grupal" || p.modality === "Salida Grupal Acompañada" ? "Salida Grupal" : undefined),
        includedServices: servicesList,
        installmentsText: p.financingText || p.installments,
        url: `/marketplace?id=${encodeURIComponent(p.id)}`,
      };
    });
  }, [livePackages, activeQuickFilter]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col selection:bg-[#0A2A5B] selection:text-white w-full overflow-x-hidden">
      {/* 1. Header Oficial: Sincronizado con teléfono y redes del CMS */}
      <OtaHeader
        phone={officialPhone}
        onOpenQuienesSomos={(tab) => setQuienesSomosModal(tab)}
        onOpenContacto={() => setContactoModal(true)}
      />

      {/* 2. Slider Hero con imágenes 100% puras y limpias (sin capa oscura) */}
      <section className="relative w-full bg-white overflow-hidden">
        <div className="relative w-full h-[420px] sm:h-[540px] lg:h-[600px] overflow-hidden bg-slate-100">
          {currentHero?.mediaType === "video" ? (
            <video
              key={currentHero.mediaUrl}
              src={currentHero.mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={currentHero?.mediaUrl}
              src={currentHero?.mediaUrl}
              alt={currentHero?.title || "TravelApp"}
              className="w-full h-full object-cover"
            />
          )}

          {/* Texto flotante directo sobre la imagen limpia y llamados a la acción centrados */}
          <div className="absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-8">
            <div className="max-w-3xl text-center">
              <span className="inline-block text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.2em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] mb-3">
                {currentHero?.badge || "TRAVELAPP ECOSYSTEM"}
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white whitespace-pre-line mb-3 drop-shadow-[0_3px_14px_rgba(0,0,0,0.6)]">
                {currentHero?.title}
              </h1>
              <p className="text-xs sm:text-base text-white font-semibold leading-relaxed mb-6 max-w-2xl mx-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                {currentHero?.subtitle}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={currentHero?.ctaUrl || "/marketplace"}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[#0A2A5B] text-white text-xs sm:text-sm font-bold hover:bg-slate-900 transition-colors shadow-lg"
                >
                  <span>{currentHero?.ctaText || "Explorar Paquetes"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={cms.hero?.whatsappUrl || "https://wa.me/5493812000712"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-sm border border-white bg-white/95 text-[#0A2A5B] text-xs sm:text-sm font-bold hover:bg-white transition-colors shadow-lg"
                >
                  <span>{cms.hero?.whatsappText || "Hablá con Nosotros"}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Indicadores rectos de slides */}
          {heroSlides.length > 1 && (
            <div className="absolute bottom-4 right-6 z-20 flex items-center gap-2">
              {heroSlides.map((s, idx) => (
                <button
                  key={s.id || idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-1.5 transition-all cursor-pointer ${
                    idx === activeSlide ? "w-8 bg-[#0A2A5B]" : "w-3 bg-white/80 hover:bg-white"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. Buscador Multimodal Profesional (entre el Slider y la barra de promociones) */}
      <section className="relative z-20 bg-slate-50 border-y border-slate-200 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <OtaSearchEngine enabledTabs={cms.enabledSearchTabs} />
        </div>
      </section>

      {/* 4. Barra de Promociones Bancarias y Financiación (libre escritura desde el CMS) */}
      <OtaFloatingPromos />

      {/* 5. Filtros Rápidos Editables desde el CMS + Carrusel de Tarjetas Cuadradas enlazado al Marketplace real */}
      <section className="bg-white pt-10 sm:pt-14 pb-4 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2">
              Explorar por:
            </span>
            <button
              type="button"
              onClick={() => setActiveQuickFilter("Todos")}
              className={`px-4 py-2 rounded-sm border text-xs font-bold transition-colors cursor-pointer ${
                activeQuickFilter === "Todos"
                  ? "bg-[#0A2A5B] text-white border-[#0A2A5B]"
                  : "border-slate-300 bg-white text-slate-800 hover:border-[#0A2A5B]"
              }`}
            >
              Todos
            </button>
            {quickFilters.map((f, i) => {
              const isSelected = activeQuickFilter === f.label;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveQuickFilter(isSelected ? "Todos" : f.label)}
                  className={`px-4 py-2 rounded-sm border text-xs font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#0A2A5B] text-white border-[#0A2A5B]"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-[#0A2A5B] hover:text-white hover:border-[#0A2A5B]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <OtaMarketplaceCarousel
        currency={currency}
        items={carouselItems}
      />

      {/* 6. Unidades de Negocio (Formato Editorial Motorola: fotos cuadradas y grandes, puras y limpias) */}
      <section id="ecosistema" className="py-14 sm:py-24 bg-slate-50 border-t border-slate-200 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 sm:mb-16 max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0A2A5B] mb-2">
              NUESTRAS UNIDADES DE NEGOCIO
            </p>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Todo el ecosistema TravelApp en un mismo lugar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
            {ecosystemUnits.map((unit: any, idx: number) => {
              const unitUrl = unit.url || (
                unit.id === 'emisivo' ? '/marketplace' :
                unit.id === 'experience' || unit.id === 'receptivo' ? '/landing/experience' :
                unit.id === 'travelcab' ? '/landing/travelcab' :
                unit.id === 'rewards' ? '/landing/rewards' : '/marketplace'
              );

              return (
                <Link
                  key={unit.id || idx}
                  href={unitUrl}
                  className="group bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col hover:border-[#0A2A5B] transition-colors"
                >
                  {/* Foto Cuadrada y Grande, 100% pura y limpia sin capa oscura */}
                  <div className="relative w-full aspect-square overflow-hidden bg-slate-100">
                    {unit.imagenUrl ? (
                      <img
                        src={unit.imagenUrl}
                        alt={unit.nombre}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[#0A2A5B]">
                        <Compass className="w-16 h-16" />
                      </div>
                    )}
                  </div>

                  {/* Bloque editorial limpio debajo de la foto */}
                  <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0A2A5B] block mb-2">
                        {unit.tag || "Unidad Oficial"}
                      </span>
                      <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-[#0A2A5B] transition-colors">
                        {unit.nombre}
                      </h3>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">
                        {unit.descripcionBreve || unit.descripcion}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0A2A5B] pt-4 border-t border-slate-100">
                      <span>{unit.cta || "Explorar Unidad"}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Métricas / Stats del CMS si están activadas */}
          {cms.showStats === true && Array.isArray(cms.stats) && cms.stats.length > 0 && (
            <div className="mt-14 pt-10 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-6">
              {cms.stats.map((st: any, i: number) => (
                <div key={i} className="text-left p-5 bg-white border border-slate-200 rounded-sm">
                  <div className="text-2xl sm:text-3xl font-black text-[#0A2A5B] mb-1 tracking-tight">
                    {st.valor || st.number}
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {st.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. Sección 2: TravelApp App Móvil (Opcional desde CMS) */}
      {cms.apps?.enabled !== false && (
        <OtaAppSection
          titulo={cms.apps?.titulo}
          subtitulo={cms.apps?.subtitulo}
          appPreviewImageUrl={cms.apps?.appPreviewImageUrl || ""}
          showPlayStore={Boolean(cms.apps?.showPlayStore !== false && cms.apps?.playStoreUrl?.trim())}
          showAppStore={Boolean(cms.apps?.showAppStore !== false && cms.apps?.appStoreUrl?.trim())}
          playStoreUrl={cms.apps?.playStoreUrl?.trim() || ""}
          appStoreUrl={cms.apps?.appStoreUrl?.trim() || ""}
        />
      )}

      {/* 7. Sección 3: TravelApp Rewards (Resumen del Programa y CTA Registro) */}
      <OtaRewardsSection />

      {/* 8. Sección 4: Travis Asistente Virtual Inteligente 24/7 con IA */}
      <OtaTravisSection whatsappUrl={cms.redesSociales?.whatsapp || cms.contacto?.whatsapp} />

      {/* 9. Sección 5: Sumate al Equipo (Oportunidades Laborales y Carga de CV) */}
      <OtaCareersSection positions={cms.trabajaNosotros?.puestos || cms.jobPositions} />

      {/* 10. Footer Oficial: Sincronizado en vivo con datos legales y redes del CMS */}
      <OtaFooter config={footerConfig} />

      {/* 11. Push Pop Promocional Emergente (TravelSale, Puntos Dobles, etc.) */}
      <OtaPromoPushPop config={promoConfig} />

      {/* 12. Banner y Modal de Aceptación de Cookies (Ley 25.326) */}
      <OtaCookieConsent />

      {/* 13. Asistente Flotante Permanente Travis Omnichannel */}
      <TravisOmnichannelWidget
        businessUnit="OTA"
        primaryColor="#0A2A5B"
        brandName="Travis IA"
        whatsappUrl={
          cms.contacto?.whatsapp ||
          cms.redesSociales?.whatsapp ||
          "https://wa.me/5493812000712?text=Hola%20Travis!%20Quiero%20consultar%20por%20un%20viaje"
        }
      />

      {/* MODAL INSTITUCIONAL: VISIÓN, MISIÓN Y VALORES (Conectado al CMS) */}
      {quienesSomosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-8 shadow-2xl relative border border-slate-100 text-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setQuienesSomosModal(null)}
              aria-label="Cerrar modal"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Tabs Visión / Misión / Valores */}
            <div className="flex gap-2 border-b border-slate-100 pb-3 sm:pb-4 mb-4 sm:mb-6">
              <button
                type="button"
                onClick={() => setQuienesSomosModal("vision")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  quienesSomosModal === "vision"
                    ? "bg-blue-50 text-tech-blue border border-blue-200"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Visión
              </button>
              <button
                type="button"
                onClick={() => setQuienesSomosModal("mision")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  quienesSomosModal === "mision"
                    ? "bg-orange-50 text-[#FF5A19] border border-orange-200"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Target className="w-3.5 h-3.5" /> Misión
              </button>
              <button
                type="button"
                onClick={() => setQuienesSomosModal("valores")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  quienesSomosModal === "valores"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" /> Valores
              </button>
            </div>

            {quienesSomosModal === "vision" && (
              <div className="space-y-3 animate-in fade-in">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">Nuestra Visión</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {cms.quienesSomos?.vision || "Ser la plataforma líder de turismo y movilidad integrada de Argentina y Latinoamérica, unificando paquetes emisivos de clase mundial, turismo receptivo regional y traslados seguros bajo un modelo de innovación continua, transparencia y fidelización real."}
                </p>
              </div>
            )}

            {quienesSomosModal === "mision" && (
              <div className="space-y-3 animate-in fade-in">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">Nuestra Misión</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {cms.quienesSomos?.mision || "Empoderar a cada viajero conectándolo con las mejores opciones de transporte, alojamiento y experiencias guiadas con tarifas transparentes, atención 24/7 impulsada por IA y un ecosistema que premia cada kilómetro recorrido."}
                </p>
              </div>
            )}

            {quienesSomosModal === "valores" && (
              <div className="space-y-3 animate-in fade-in">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">Nuestros Valores</h3>
                {typeof cms.quienesSomos?.valores === "string" && cms.quienesSomos.valores.trim().length > 0 ? (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {cms.quienesSomos.valores}
                  </p>
                ) : (
                  <ul className="text-xs sm:text-sm text-slate-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Transparencia:</strong> Tarifas claras sin cargos ocultos ni sorpresas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Seguridad y Formalidad:</strong> Operadores certificados, licencias oficiales y respaldo regulatorio.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Pasión por el Viajero:</strong> Asistencia cálida y resolutiva las 24 horas del día.</span>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONTACTO DIRECTO */}
      {contactoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl relative border border-slate-100 text-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setContactoModal(false)}
              aria-label="Cerrar modal"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-tech-blue text-xs font-bold uppercase mb-3">
              <Phone className="w-3.5 h-3.5 text-[#FF5A19]" />
              <span>Canales de Atención Oficial</span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-2">Contactate con TravelApp</h3>
            <p className="text-xs text-slate-500 mb-6">Estamos a tu disposición para cotizaciones, asistencia en viaje o consultas corporativas.</p>

            <div className="space-y-3">
              <a
                href="tel:08102200018"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-tech-blue transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-tech-blue flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-800">Línea Telefónica Nacional</span>
                    <span className="text-[11px] text-slate-500 font-bold">0810-220-0018</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-tech-blue transition-colors" />
              </a>

              <a
                href={cms.contacto?.whatsapp || "https://wa.me/5493812000712"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 hover:border-emerald-500 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-emerald-900">WhatsApp Comercial & Travis IA</span>
                    <span className="text-[11px] text-emerald-600 font-bold">+54 9 381 200-0712</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
              </a>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-black text-slate-800 block">Oficina Central:</span>
                <span className="text-slate-500">San Miguel de Tucumán, Argentina · Atención Lunes a Sábado de 09:00 a 20:00 hs</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
