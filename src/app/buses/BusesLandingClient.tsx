"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OtaHeader } from "@/components/ota/OtaHeader";
import { OtaFooter } from "@/components/ota/OtaFooter";
import { ExperienceHeader } from "@/components/experience/ExperienceHeader";
import { ExperienceFooter } from "@/components/experience/ExperienceFooter";
import { TravisOmnichannelWidget } from "@/components/shared/TravisOmnichannelWidget";
import { DEFAULT_REWARDS_CONFIG, subscribeGlobalRewardsConfig } from "@/lib/rewards-config";
import {
  Bus,
  MapPin,
  ShieldCheck,
  Gift,
  Car,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Ticket,
  ArrowRight,
  Phone,
  Search,
  Award,
  Loader2,
  X,
} from "lucide-react";

export type BrandVariant = "ecosistema" | "experience" | "lunaviajera";

export const CDP_IFRAME_URL =
  "https://ecommerce.centraldepasajes.com.ar/agenciaframe.aspx?Token=vRHEzGOK7U1J9jMzlp9Erv4izja%2bN5UJ4ttcpTvXwcc%3d&age=cag";

interface SlideItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  highlightTag: string;
}

const SLIDES_BY_BRAND: Record<BrandVariant, SlideItem[]> = {
  ecosistema: [
    {
      id: "eco-1",
      badge: "✦ BOLETERÍA OFICIAL NACIONAL · CENTRAL DE PASAJES",
      title: "Más de 1.600 Destinos Operados en toda Argentina",
      subtitle:
        "Comercializamos pasajes oficiales de larga distancia con todas las empresas líderes del país. Elegí tu butaca Cama Suite, Ejecutivo o Semi-Cama y recibí tu E-Ticket al instante.",
      imageUrl:
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=85",
      highlightTag: "+1.600 Destinos Nacionales",
    },
    {
      id: "eco-2",
      badge: "✦ FINANCIACIÓN Y BENEFICIOS EXCLUSIVOS",
      title: "Viajá en Micro con Cuotas y Sumá Puntos Rewards",
      subtitle:
        "Aboná con todas las tarjetas de crédito, débito y billeteras virtuales en la pasarela oficial de Central de Pasajes y registrá tu boleto para acreditar puntos en tu cuenta TravelApp.",
      imageUrl:
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=85",
      highlightTag: "Suma Puntos TravelApp Rewards",
    },
    {
      id: "eco-3",
      badge: "✦ ECOSISTEMA INTEGRADO DE MOVILIDAD",
      title: "De la Puerta de tu Casa a la Butaca del Micro",
      subtitle:
        "Combiná la compra de tu pasaje nacional con un traslado seguro de TravelCab hacia o desde la Terminal de Ómnibus con tarifa fija y chofer verificado.",
      imageUrl:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85",
      highlightTag: "Conexión Puerta a Terminal",
    },
  ],
  experience: [
    {
      id: "exp-1",
      badge: "✦ CONECTIVIDAD RECEPTIVA · NORTE ARGENTINO (NOA)",
      title: "Recorré los Destinos del NOA en Micros de Primera Línea",
      subtitle:
        "Conectá San Miguel de Tucumán, Salta, Jujuy, Cafayate, Purmamarca, Tilcara y Termas de Río Hondo con frecuencias diarias y emisión inmediata.",
      imageUrl:
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=85",
      highlightTag: "Rutas Escénicas del NOA",
    },
    {
      id: "exp-2",
      badge: "✦ TURISMO RECEPTIVO + BOLETERÍA OFICIAL",
      title: "Armá tu Circuito por Tucumán, Salta y la Quebrada",
      subtitle:
        "Sacá tus tramos en bus entre provincias y complementá tu estadía con nuestras excursiones guiadas y traslados receptivos desde la Terminal a tu hotel.",
      imageUrl:
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=85",
      highlightTag: "Conexiones Regionales Diarias",
    },
    {
      id: "exp-3",
      badge: "✦ ASISTENCIA CONCIERGE TRAVIS 24/7",
      title: "Tu Viaje por el Norte, Coordinado de Punta a Punta",
      subtitle:
        "Emití tu boleto en el buscador oficial, sumá puntos TravelApp Rewards y pedí tu TravelCab para que te esperemos en la plataforma de llegada.",
      imageUrl:
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=85",
      highlightTag: "Receptivo Oficial TravelApp",
    },
  ],
  lunaviajera: [
    {
      id: "luna-1",
      badge: "✦ LUNA VIAJERA · VALLES CALCHAQUÍES & TUCUMÁN",
      title: "Tafí del Valle y los Paisajes Mágicos de Tucumán",
      subtitle:
        "Llegá a Tucumán desde cualquier rincón del país a través de nuestra Boletería Oficial de Central de Pasajes y descubrí la Quebrada de Los Sosa, el lago La Angostura y los Valles.",
      imageUrl:
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=85",
      highlightTag: "Postal de Tafí del Valle",
    },
    {
      id: "luna-2",
      badge: "✦ AVENTURA EN LAS YUNGAS Y LOS VALLES",
      title: "Conectá tu Viaje de Larga Distancia con Salidas de 1 Día",
      subtitle:
        "Emití tu pasaje nacional de micro al instante, validá tu boleto para sumar Puntos Rewards y reservá tu lugar en nuestras excursiones desde Yerba Buena.",
      imageUrl:
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1920&q=85",
      highlightTag: "Valles & Selva de Yungas",
    },
    {
      id: "luna-3",
      badge: "✦ TRASLADO SEGURO DESDE LA TERMINAL",
      title: "Llegá a la Terminal y Subite directo a tu TravelCab",
      subtitle:
        "Coordinamos tu recepción en la Terminal de Tucumán hacia Yerba Buena o tu alojamiento para que tu única preocupación sea disfrutar la montaña.",
      imageUrl:
        "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1920&q=85",
      highlightTag: "Recepción en Terminal Tucumán",
    },
  ],
};

const DESTINOS_DESTACADOS = [
  {
    ciudad: "Tafí del Valle & Valles",
    provincia: "Tucumán · Ruta 307",
    categoria: "Conexión Regional & Excursión",
    img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    tag: "Favorito Luna Viajera",
  },
  {
    ciudad: "Salta & Cafayate",
    provincia: "Norte Argentino (NOA)",
    categoria: "Semi-Cama / Cama Ejecutivo",
    img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80",
    tag: "Circuito NOA",
  },
  {
    ciudad: "Buenos Aires (Retiro / Dellepiane)",
    provincia: "Salidas Diarias Nacionales",
    categoria: "Cama Ejecutivo / Suite",
    img: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=800&q=80",
    tag: "Alta Frecuencia",
  },
  {
    ciudad: "Córdoba & Villa Carlos Paz",
    provincia: "Región Centro / Sierras",
    categoria: "Semi-Cama / Cama",
    img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
    tag: "Salidas Diurnas y Nocturnas",
  },
  {
    ciudad: "Jujuy, Purmamarca & Tilcara",
    provincia: "Quebrada de Humahuaca",
    categoria: "Servicio Regional & Nacional",
    img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    tag: "Imperdible NOA",
  },
  {
    ciudad: "Mendoza & Bariloche",
    provincia: "Cuyo & Patagonia",
    categoria: "Cama Suite Larga Distancia",
    img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
    tag: "Larga Distancia",
  },
];

export function normalizeTicketCode(raw: string): string {
  return (raw || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export default function BusesLandingClient({ initialCms }: { initialCms?: any }) {
  const searchParams = useSearchParams();
  const [brand, setBrand] = useState<BrandVariant>("ecosistema");
  const [cms, setCms] = useState<any>(initialCms || {});
  const [currentSlide, setCurrentSlide] = useState(0);
  const [pointValue, setPointValue] = useState<number>(
    DEFAULT_REWARDS_CONFIG.universalPointValue
  );

  // Estado del Validador de Boletos para Puntos Rewards
  const [ticketNumber, setTicketNumber] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [passengerDni, setPassengerDni] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [routeOrigin, setRouteOrigin] = useState("San Miguel de Tucumán");
  const [routeDestination, setRouteDestination] = useState("");
  const [busCompany, setBusCompany] = useState("");
  const [ticketAmount, setTicketAmount] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<{
    type: "success" | "duplicate_approved" | "duplicate_pending" | "error";
    message: string;
    pointsEstimated?: number;
  } | null>(null);

  // Modal de Reserva Rápida TravelCab a Terminal
  const [travelCabModal, setTravelCabModal] = useState(false);
  const [cabDirection, setCabDirection] = useState<"hacia_terminal" | "desde_terminal">(
    "hacia_terminal"
  );
  const [cabAddress, setCabAddress] = useState("");
  const [cabTerminal, setCabTerminal] = useState("Terminal de Ómnibus de Tucumán");
  const [cabDate, setCabDate] = useState("");
  const [cabTime, setCabTime] = useState("");
  const [cabPassenger, setCabPassenger] = useState("");
  const [cabPhone, setCabPhone] = useState("");
  const [cabLoading, setCabLoading] = useState(false);
  const [cabSuccess, setCabSuccess] = useState(false);

  // Detectar marca según query param ?brand= o hostname
  useEffect(() => {
    const paramBrand = searchParams?.get("brand")?.toLowerCase();
    if (
      paramBrand === "lunaviajera" ||
      paramBrand === "experience" ||
      paramBrand === "ecosistema"
    ) {
      setBrand(paramBrand);
      return;
    }
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (host.includes("lunaviajera")) {
        setBrand("lunaviajera");
      } else if (host.includes("experience")) {
        setBrand("experience");
      } else {
        setBrand("ecosistema");
      }
    }
  }, [searchParams]);

  // Escuchar CMS de la Unidad correspondiente (landing_ecosistema, landing_experience o landing_lunaviajera)
  useEffect(() => {
    const docId =
      brand === "lunaviajera"
        ? "landing_lunaviajera"
        : brand === "experience"
        ? "landing_experience"
        : "landing_ecosistema";
    const unsubCms = onSnapshot(
      doc(db, "cms", docId),
      (snap) => {
        if (snap.exists()) setCms(snap.data());
      },
      () => {}
    );
    const unsubRewards = subscribeGlobalRewardsConfig((cfg) => {
      if (cfg.universalPointValue > 0) setPointValue(cfg.universalPointValue);
    });
    return () => {
      unsubCms();
      unsubRewards();
    };
  }, [brand]);

  const activeSlides: SlideItem[] =
    (cms?.busesSection?.slides &&
      Array.isArray(cms.busesSection.slides) &&
      cms.busesSection.slides.length > 0 &&
      cms.busesSection.slides) ||
    (cms?.slidesByBrand &&
      Array.isArray(cms.slidesByBrand[brand]) &&
      cms.slidesByBrand[brand].length > 0 &&
      cms.slidesByBrand[brand]) ||
    SLIDES_BY_BRAND[brand];

  const activeDestinos: typeof DESTINOS_DESTACADOS =
    (cms?.busesSection?.destinos &&
      Array.isArray(cms.busesSection.destinos) &&
      cms.busesSection.destinos.length > 0 &&
      cms.busesSection.destinos) ||
    DESTINOS_DESTACADOS;

  useEffect(() => {
    setCurrentSlide(0);
  }, [brand]);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  // Cálculo estimativo de puntos Rewards (ej. 5% de cashback convertido en puntos o mínimo 10 pts)
  const parsedAmount = Number(ticketAmount.replace(/[^0-9.]/g, "")) || 0;
  const estimatedPoints =
    parsedAmount > 0
      ? Math.max(5, Math.round((parsedAmount * 0.05) / (pointValue || 175)))
      : 0;

  // Enviar solicitud de validación de boleto con control anti-duplicados
  const handleClaimTicketPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimFeedback(null);

    const normalized = normalizeTicketCode(ticketNumber);
    if (normalized.length < 4) {
      setClaimFeedback({
        type: "error",
        message: "Por favor ingresá un número de boleto o voucher válido.",
      });
      return;
    }

    setClaimLoading(true);
    try {
      // 1. Verificar en Firestore si este número de boleto ya existe
      const q = query(
        collection(db, "bus_ticket_claims"),
        where("ticketNumberNormalized", "==", normalized)
      );
      const existingSnap = await getDocs(q);

      if (!existingSnap.empty) {
        let alreadyApproved = false;
        existingSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === "Aprobado" || data.estado === "Aprobado") {
            alreadyApproved = true;
          }
        });

        if (alreadyApproved) {
          setClaimFeedback({
            type: "duplicate_approved",
            message: `⚠️ Alerta de Seguridad: El boleto N.º ${ticketNumber.toUpperCase()} ya fue validado anteriormente y sus puntos TravelApp Rewards ya fueron acreditados. No se permite cargar dos veces el mismo boleto.`,
          });
          setClaimLoading(false);
          return;
        } else {
          setClaimFeedback({
            type: "duplicate_pending",
            message: `⏳ El boleto N.º ${ticketNumber.toUpperCase()} ya fue registrado en el sistema y se encuentra pendiente de verificación por un operador.`,
          });
          setClaimLoading(false);
          return;
        }
      }

      // 2. Registrar nuevo reclamo de puntos de boleto
      await addDoc(collection(db, "bus_ticket_claims"), {
        ticketNumber: ticketNumber.trim().toUpperCase(),
        ticketNumberNormalized: normalized,
        passengerName: passengerName.trim(),
        passengerDni: passengerDni.trim(),
        passengerPhone: passengerPhone.trim(),
        passengerEmail: passengerEmail.trim().toLowerCase(),
        origin: routeOrigin.trim(),
        destination: routeDestination.trim(),
        busCompany: busCompany.trim() || "Central de Pasajes",
        amountPaid: parsedAmount,
        estimatedPoints: estimatedPoints || 15,
        brandSource: brand,
        agencyCode: "cag",
        status: "Pendiente",
        createdAt: new Date().toISOString(),
      });

      setClaimFeedback({
        type: "success",
        pointsEstimated: estimatedPoints || 15,
        message: `¡Boleto N.º ${ticketNumber.toUpperCase()} registrado con éxito! Nuestro operador verificará la emisión en Central de Pasajes (Agencia CAG) y acreditará tus ${
          estimatedPoints || 15
        } Puntos TravelApp Rewards.`,
      });
      setTicketNumber("");
      setRouteDestination("");
      setTicketAmount("");
    } catch (err) {
      console.error("Error registrando boleto:", err);
      setClaimFeedback({
        type: "error",
        message:
          "No pudimos procesar la solicitud en este momento. También podés enviarnos tu boleto por WhatsApp a Travis.",
      });
    } finally {
      setClaimLoading(false);
    }
  };

  // Reserva de TravelCab hacia/desde la Terminal
  const handleBookTravelCab = async (e: React.FormEvent) => {
    e.preventDefault();
    setCabLoading(true);
    try {
      const originText =
        cabDirection === "hacia_terminal" ? cabAddress : cabTerminal;
      const destText =
        cabDirection === "hacia_terminal" ? cabTerminal : cabAddress;

      await addDoc(collection(db, "trips"), {
        passengerName: cabPassenger,
        passengerPhone: cabPhone,
        originAddress: originText,
        destinationAddress: destText,
        scheduledDate: cabDate,
        scheduledTime: cabTime,
        status: "scheduled_web",
        source: `BUSES_TERMINAL_${brand.toUpperCase()}`,
        notes: `Conexión Boletería Central de Pasajes (${
          cabDirection === "hacia_terminal" ? "Ida a Terminal" : "Recepción en Terminal"
        })`,
        createdAt: new Date().toISOString(),
      });

      setCabSuccess(true);
      const waMsg = `*Reserva TravelCab Conexión Terminal*\n• *Servicio:* ${
        cabDirection === "hacia_terminal"
          ? "Traslado hacia la Terminal"
          : "Recepción en la Terminal"
      }\n• *Origen:* ${originText}\n• *Destino:* ${destText}\n• *Fecha y Hora:* ${cabDate} ${cabTime}\n• *Pasajero:* ${cabPassenger} (${cabPhone})`;
      window.open(
        `https://wa.me/5493812000712?text=${encodeURIComponent(waMsg)}`,
        "_blank"
      );
    } catch (err) {
      console.error("Error agendando TravelCab:", err);
    } finally {
      setCabLoading(false);
    }
  };

  const isLuna = brand === "lunaviajera";
  const isExperience = brand === "experience";

  const currentSlideObj = activeSlides[currentSlide] || activeSlides[0];

  return (
    <div
      className={
        isLuna
          ? "min-h-screen bg-[#072118] text-[#F5F2EB] font-sans selection:bg-[#DFB15B] selection:text-[#0A2E20]"
          : isExperience
          ? "min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased selection:bg-[#0071e3] selection:text-white"
          : "min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#FF5A19] selection:text-white"
      }
    >
      {/* ═══════════════════════════════════════════════════════════════════
          1. HEADER CORPORATIVO SEGÚN PLATAFORMA (100% FIEL A CADA UNIDAD)
      ═══════════════════════════════════════════════════════════════════ */}
      {isLuna ? (
        <header className="sticky top-0 z-40 bg-[#0A2E20]/95 backdrop-blur-md border-b border-[#DFB15B]/30 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
            <Link href="/landing/lunaviajera" className="flex items-center gap-4 group py-1">
              <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[#DFB15B]/20 rounded-full blur-xl group-hover:bg-[#DFB15B]/35 transition duration-300" />
                <img
                  src="/assets/luna_viajera_gold.png"
                  alt="Luna Viajera"
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-[0_0_25px_rgba(223,177,91,0.9)] relative z-10"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-black text-2xl sm:text-3xl tracking-widest text-[#DFB15B] block leading-none font-serif">
                  LUNA VIAJERA
                </span>
                <span className="text-[11px] sm:text-xs tracking-[0.25em] uppercase font-extrabold text-emerald-200/95 block mt-1.5">
                  — Boletería Oficial de Micros —
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-[#EDE6D8]">
              <Link href="/landing/lunaviajera" className="hover:text-[#DFB15B] transition">
                ← Volver a Excursiones
              </Link>
              <a href="#buscador-cdp" className="text-[#DFB15B] flex items-center gap-1.5">
                <Bus className="w-4 h-4" />
                <span>Sacar Pasajes</span>
              </a>
              <a href="#sumar-puntos" className="hover:text-[#DFB15B] transition">
                Sumar Puntos Rewards
              </a>
              <button
                type="button"
                onClick={() => setTravelCabModal(true)}
                className="px-4 py-2 rounded-full bg-[#DFB15B] text-[#0A2E20] font-black text-xs uppercase tracking-wider hover:bg-[#eac474] transition cursor-pointer shadow-lg"
              >
                🚕 Reservar TravelCab a Terminal
              </button>
            </nav>
          </div>
        </header>
      ) : isExperience ? (
        <ExperienceHeader />
      ) : (
        <OtaHeader />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          2. HERO PRINCIPAL: SLIDER PERSONALIZADO + WIDGET CENTRAL DE PASAJES
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="buscador-cdp"
        className={`relative overflow-hidden py-8 sm:py-12 lg:py-16 ${
          isLuna
            ? "bg-gradient-to-b from-[#0A2E20] via-[#072118] to-[#072118] border-b border-[#DFB15B]/20"
            : isExperience
            ? "bg-gradient-to-b from-[#0a2a5b] via-[#0d336e] to-[#f5f5f7]"
            : "pt-24 sm:pt-28 bg-gradient-to-br from-[#0A2A5B] via-[#0d3573] to-[#071d40]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Selector sutil de vista si desea previsualizar los 3 sliders */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-white">
              <Bus className="w-3.5 h-3.5 text-[#FF5A19]" />
              <span>
                {isLuna
                  ? "Luna Viajera · Conexión Valles Calchaquíes & Nacional"
                  : isExperience
                  ? "TravelApp Experience · Conectividad Receptiva NOA"
                  : "TravelApp Ecosistema · Boletería Nacional Oficial"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTravelCabModal(true)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer shadow-lg ${
                  isLuna
                    ? "bg-[#DFB15B] text-[#0A2E20] hover:bg-[#e8c16d]"
                    : "bg-[#FF5A19] text-white hover:bg-[#e0480d]"
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>🚕 Reservar TravelCab a la Terminal</span>
              </button>
            </div>
          </div>

          {/* GRILLA PRINCIPAL: IZQUIERDA SLIDER PERSONALIZADO (8 COLS) | DERECHA IFRAME CDP (4 COLS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* COLUMNA IZQUIERDA: SLIDER DINÁMICO + PROPUESTA DE VALOR */}
            <div className="lg:col-span-8 flex flex-col justify-between rounded-3xl overflow-hidden relative min-h-[494px] shadow-2xl border border-white/15 group">
              {/* Imagen de fondo del slide activo */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105 group-hover:scale-100"
                style={{ backgroundImage: `url(${currentSlideObj.imageUrl})` }}
              />
              <div
                className={`absolute inset-0 ${
                  isLuna
                    ? "bg-gradient-to-t from-[#072118] via-[#072118]/75 to-[#0A2E20]/40"
                    : "bg-gradient-to-t from-[#0A2A5B] via-[#0A2A5B]/75 to-black/35"
                }`}
              />

              {/* Contenido superior del Slide */}
              <div className="relative z-10 p-6 sm:p-10 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-wider uppercase shadow-md ${
                    isLuna
                      ? "bg-[#DFB15B] text-[#0A2E20]"
                      : isExperience
                      ? "bg-[#0071e3] text-white"
                      : "bg-[#FF5A19] text-white"
                  }`}
                >
                  {currentSlideObj.badge}
                </span>

                {/* Controles del Slider */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlide(
                        (prev) => (prev - 1 + activeSlides.length) % activeSlides.length
                      )
                    }
                    className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition cursor-pointer"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlide((prev) => (prev + 1) % activeSlides.length)
                    }
                    className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition cursor-pointer"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contenido central/inferior del Slide */}
              <div className="relative z-10 p-6 sm:p-10 mt-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/15 backdrop-blur-md text-white text-xs font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{currentSlideObj.highlightTag}</span>
                </div>

                <h1
                  className={`text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight ${
                    isLuna ? "font-serif text-[#F5F2EB]" : ""
                  }`}
                >
                  {currentSlideObj.title}
                </h1>

                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-white/90 max-w-2xl leading-relaxed">
                  {currentSlideObj.subtitle}
                </p>

                {/* Píldoras de beneficios rápidos + CTA a TravelCab y Puntos */}
                <div className="mt-6 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-white/90">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      E-Ticket directo en tu celular
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-300" />
                      Sumás Puntos TravelApp Rewards
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sky-300" />
                      Agencia Oficial Habilitada
                    </span>
                  </div>

                  {/* Indicadores de página del slider */}
                  <div className="flex items-center gap-1.5">
                    {activeSlides.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx === currentSlide
                            ? isLuna
                              ? "w-7 bg-[#DFB15B]"
                              : "w-7 bg-[#FF5A19]"
                            : "w-2 bg-white/40 hover:bg-white/70"
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: CÁPSULA OFICIAL PARA EL IFRAME DE 230x494px */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <div
                className={`w-full h-full rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center justify-between border ${
                  isLuna
                    ? "bg-[#0A2E20] border-[#DFB15B]/40 text-[#F5F2EB]"
                    : "bg-white border-slate-200/80 text-slate-900"
                }`}
              >
                <div className="w-full text-center mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isLuna
                        ? "bg-[#DFB15B]/20 text-[#DFB15B] border border-[#DFB15B]/40"
                        : "bg-[#0A2A5B]/10 text-[#0A2A5B]"
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    Buscador Oficial Online
                  </span>
                  <h2
                    className={`text-base sm:text-lg font-extrabold mt-1.5 ${
                      isLuna ? "text-[#DFB15B] font-serif" : "text-[#0A2A5B]"
                    }`}
                  >
                    Sacá tu Pasaje en Micro
                  </h2>
                  <p
                    className={`text-xs ${
                      isLuna ? "text-emerald-100/80" : "text-slate-500"
                    }`}
                  >
                    Elegí origen, destino y fecha para cotizar en vivo
                  </p>
                </div>

                {/* CONTENEDOR EXACTO DEL IFRAME DE CENTRAL DE PASAJES (230x494) */}
                <div className="bg-white rounded-2xl p-2 shadow-inner border border-slate-200 flex items-center justify-center">
                  <iframe
                    src={CDP_IFRAME_URL}
                    style={{
                      border: "none",
                      width: "230px",
                      height: "494px",
                      overflow: "hidden",
                    }}
                    title="Buscador Oficial Central de Pasajes - TravelApp"
                    loading="lazy"
                  />
                </div>

                <div className="w-full mt-3 pt-3 border-t border-slate-200/20 flex items-center justify-between text-[11px]">
                  <span
                    className={
                      isLuna ? "text-emerald-200/80 font-medium" : "text-slate-500 font-medium"
                    }
                  >
                    Operado junto a Central de Pasajes
                  </span>
                  <a
                    href="#sumar-puntos"
                    className={`font-extrabold underline ${
                      isLuna ? "text-[#DFB15B]" : "text-[#FF5A19]"
                    }`}
                  >
                    ¿Ya compraste? Sumá puntos →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          3. FRANJA DE CONEXIÓN TRAVELCAB (RESERVA DE TRASLADO A LA TERMINAL)
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div
          className={`rounded-3xl p-6 sm:p-8 shadow-xl border flex flex-col lg:flex-row items-center justify-between gap-6 ${
            isLuna
              ? "bg-gradient-to-r from-[#0A2E20] via-[#0f3d2b] to-[#0A2E20] border-[#DFB15B]/40 text-[#F5F2EB]"
              : "bg-white border-slate-200/90 text-slate-900"
          }`}
        >
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isLuna
                  ? "bg-[#DFB15B] text-[#0A2E20]"
                  : "bg-[#FF5A19] text-white"
              }`}
            >
              <Car className="w-7 h-7" />
            </div>
            <div>
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isLuna ? "text-[#DFB15B]" : "text-[#FF5A19]"
                }`}
              >
                ✦ Movilidad Integrada TravelCab
              </span>
              <h3 className="text-lg sm:text-xl font-black mt-0.5">
                {cms?.busesSection?.travelCabTitle ||
                  "¿Necesitás traslado hacia o desde la Terminal de Ómnibus?"}
              </h3>
              <p
                className={`text-xs sm:text-sm mt-1 ${
                  isLuna ? "text-emerald-100/80" : "text-slate-600"
                }`}
              >
                {cms?.busesSection?.travelCabSubtitle ||
                  "Dejá programado tu TravelCab con tarifa fija y conductor verificado para llegar con tiempo a tu plataforma o para que te esperemos al bajar del micro."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setCabDirection("hacia_terminal");
                setTravelCabModal(true);
              }}
              className={`flex-1 lg:flex-initial px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                isLuna
                  ? "bg-[#DFB15B] text-[#0A2E20] hover:bg-[#e5be6d]"
                  : "bg-[#0A2A5B] text-white hover:bg-[#123c7a]"
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Reservar TravelCab a Terminal</span>
            </button>

            <Link
              href="/landing/travelcab?to=Terminal%20de%20%C3%93mnibus"
              className={`flex-1 lg:flex-initial px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold border transition flex items-center justify-center gap-1.5 ${
                isLuna
                  ? "border-[#DFB15B]/50 text-[#DFB15B] hover:bg-[#DFB15B]/10"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>Ir a TravelCab</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          4. VALIDADOR DE BOLETOS PARA PUNTOS TRAVELAPP REWARDS (ANTI-DUPLICADOS)
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="sumar-puntos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div
          className={`rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl border ${
            isLuna
              ? "bg-[#0A2E20]/90 border-[#DFB15B]/35 text-[#F5F2EB]"
              : "bg-gradient-to-br from-[#0A2A5B] to-[#081f44] border-blue-900 text-white"
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Explicación del programa de puntos en Buses */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Gift className="w-4 h-4" />
                <span>Programa TravelApp Rewards</span>
              </div>

              <h2
                className={`text-2xl sm:text-3xl font-black leading-tight ${
                  isLuna ? "font-serif text-[#DFB15B]" : "text-white"
                }`}
              >
                {cms?.busesSection?.rewardsTitle ||
                  "¿Compraste tu pasaje en nuestro buscador? ¡Reclamá tus Puntos Rewards!"}
              </h2>

              <p className="text-sm text-white/85 leading-relaxed">
                Aunque el pago se procesa de forma directa en la plataforma segura de Central de Pasajes, todas las emisiones realizadas desde nuestra web quedan registradas en nuestra agencia oficial. Cargá los datos de tu boleto para que validemos tu compra y acreditemos tus puntos en tu billetera.
              </p>

              <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-white/90">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Canjeá tus puntos por descuentos en excursiones, traslados TravelCab y premios.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    <strong>Control de Unicidad:</strong> Cada número de boleto es único y se valida contra nuestro reporte de agencia.
                  </span>
                </div>
              </div>
            </div>

            {/* Formulario Validador Anti-Duplicados */}
            <div className="lg:col-span-7">
              <form
                onSubmit={handleClaimTicketPoints}
                className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#0A2A5B]">
                      Validador de Boletos Emitidos
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ingresá el N.º de Boleto o Voucher que recibiste por correo en tu E-Ticket
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-[#FF5A19]" />
                </div>

                {claimFeedback && (
                  <div
                    className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-start gap-3 ${
                      claimFeedback.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : claimFeedback.type === "duplicate_approved"
                        ? "bg-red-50 border-red-300 text-red-800"
                        : claimFeedback.type === "duplicate_pending"
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    {claimFeedback.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p>{claimFeedback.message}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      N.º de Boleto / Voucher CDP *
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketNumber}
                      onChange={(e) => setTicketNumber(e.target.value)}
                      placeholder="Ej: B-00492817 o código de pasaje"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0A2A5B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Monto Abonado ($ ARS) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={ticketAmount}
                      onChange={(e) => setTicketAmount(e.target.value)}
                      placeholder="Ej: 65000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A2A5B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Nombre y Apellido del Pasajero *
                    </label>
                    <input
                      type="text"
                      required
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      placeholder="Como figura en el boleto"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A2A5B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      DNI del Pasajero *
                    </label>
                    <input
                      type="text"
                      required
                      value={passengerDni}
                      onChange={(e) => setPassengerDni(e.target.value)}
                      placeholder="Sin puntos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A2A5B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      WhatsApp / Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      placeholder="Ej: 381 500 0000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A2A5B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Email de tu cuenta TravelApp *
                    </label>
                    <input
                      type="email"
                      required
                      value={passengerEmail}
                      onChange={(e) => setPassengerEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A2A5B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Ciudad de Origen *
                    </label>
                    <input
                      type="text"
                      required
                      value={routeOrigin}
                      onChange={(e) => setRouteOrigin(e.target.value)}
                      placeholder="Ej: San Miguel de Tucumán"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A2A5B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Ciudad de Destino *
                    </label>
                    <input
                      type="text"
                      required
                      value={routeDestination}
                      onChange={(e) => setRouteDestination(e.target.value)}
                      placeholder="Ej: Salta / Buenos Aires / Tafí"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A2A5B] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-600">
                    {estimatedPoints > 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <Gift className="w-4 h-4" />
                        Sumarás aprox. +{estimatedPoints} Puntos TravelApp Rewards
                      </span>
                    ) : (
                      <span>Ingresá el monto abonado para calcular tus puntos estimados.</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={claimLoading}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#FF5A19] hover:bg-[#e0480d] text-white font-black text-xs sm:text-sm uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {claimLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando Boleto...</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4" />
                        <span>Validar Boleto y Sumar Puntos</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          5. GRILLA DE RUTAS Y DESTINOS CONECTADOS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span
              className={`text-xs font-black uppercase tracking-widest ${
                isLuna
                  ? "text-[#DFB15B]"
                  : isExperience
                  ? "text-[#0071e3]"
                  : "text-[#FF5A19]"
              }`}
            >
              ✦ Rutas Nacionales y Regionales
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-black mt-1 ${
                isLuna ? "font-serif text-[#F5F2EB]" : ""
              }`}
            >
              {cms?.busesSection?.destinosTitle ||
                "Destinos Más Buscados en Nuestra Boletería"}
            </h2>
          </div>
          <a
            href="#buscador-cdp"
            className={`text-xs sm:text-sm font-extrabold flex items-center gap-1.5 ${
              isLuna ? "text-[#DFB15B]" : "text-[#0A2A5B]"
            }`}
          >
            <span>Cotizar horarios en el buscador</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeDestinos.map((d, idx) => (
            <div
              key={`${d.ciudad}-${idx}`}
              className={`rounded-3xl overflow-hidden border shadow-lg group flex flex-col justify-between transition hover:-translate-y-1 ${
                isLuna
                  ? "bg-[#0A2E20] border-[#DFB15B]/30 text-[#F5F2EB]"
                  : "bg-white border-slate-200/80 text-slate-900"
              }`}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={d.img}
                  alt={d.ciudad}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-black/60 text-white backdrop-blur-md">
                  {d.tag}
                </span>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-[11px] font-semibold text-white/80">{d.provincia}</p>
                  <h3 className="text-lg font-black">{d.ciudad}</h3>
                </div>
              </div>

              <div className="p-5 flex items-center justify-between gap-3">
                <div>
                  <span
                    className={`text-[11px] font-bold block ${
                      isLuna ? "text-emerald-200/80" : "text-slate-500"
                    }`}
                  >
                    Servicio disponible
                  </span>
                  <span className="text-xs font-extrabold">{d.categoria}</span>
                </div>

                <a
                  href="#buscador-cdp"
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition ${
                    isLuna
                      ? "bg-[#DFB15B] text-[#0A2E20] hover:bg-[#e5be6d]"
                      : "bg-[#0A2A5B] text-white hover:bg-[#123b7a]"
                  }`}
                >
                  Buscar Pasajes
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          6. MODAL PARA RESERVAR TRAVELCAB HACIA O DESDE LA TERMINAL
      ═══════════════════════════════════════════════════════════════════ */}
      {travelCabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8">
            <button
              type="button"
              onClick={() => {
                setTravelCabModal(false);
                setCabSuccess(false);
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#FF5A19] text-white flex items-center justify-center shadow-md">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5A19]">
                  Conexión Segura Puerta a Terminal
                </span>
                <h3 className="text-lg font-black text-[#0A2A5B]">
                  Reservar TravelCab para tu Micro
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setCabDirection("hacia_terminal")}
                className={`py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  cabDirection === "hacia_terminal"
                    ? "bg-[#0A2A5B] text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Voy hacia la Terminal
              </button>
              <button
                type="button"
                onClick={() => setCabDirection("desde_terminal")}
                className={`py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  cabDirection === "desde_terminal"
                    ? "bg-[#0A2A5B] text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Llego a la Terminal
              </button>
            </div>

            {cabSuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-black text-base">¡Solicitud de Traslado Registrada!</h4>
                <p className="text-xs text-emerald-700">
                  Derivamos tu reserva a la central de TravelCab para asignarte chofer verificado a horario.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookTravelCab} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Terminal de Ómnibus
                  </label>
                  <input
                    type="text"
                    required
                    value={cabTerminal}
                    onChange={(e) => setCabTerminal(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    {cabDirection === "hacia_terminal"
                      ? "Dirección de Partida (Domicilio / Hotel)"
                      : "Dirección de Destino (Domicilio / Hotel)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={cabAddress}
                    onChange={(e) => setCabAddress(e.target.value)}
                    placeholder="Ej: Av. Aconquija 1200, Yerba Buena / Hotel..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Fecha del Traslado
                    </label>
                    <input
                      type="date"
                      required
                      value={cabDate}
                      onChange={(e) => setCabDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Hora de {cabDirection === "hacia_terminal" ? "Búsqueda" : "Arribo del Micro"}
                    </label>
                    <input
                      type="time"
                      required
                      value={cabTime}
                      onChange={(e) => setCabTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Tu Nombre
                    </label>
                    <input
                      type="text"
                      required
                      value={cabPassenger}
                      onChange={(e) => setCabPassenger(e.target.value)}
                      placeholder="Nombre y Apellido"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Tu WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      value={cabPhone}
                      onChange={(e) => setCabPhone(e.target.value)}
                      placeholder="381..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cabLoading}
                  className="w-full py-3.5 rounded-xl bg-[#FF5A19] hover:bg-[#e0480d] text-white font-black text-xs sm:text-sm uppercase tracking-wider transition cursor-pointer shadow-lg"
                >
                  {cabLoading ? "Coordinando..." : "Confirmar Reserva de TravelCab"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          7. FOOTER CORPORATIVO + WIDGET OMNICANAL TRAVIS IA
      ═══════════════════════════════════════════════════════════════════ */}
      {isLuna ? (
        <footer className="bg-[#051811] border-t border-[#DFB15B]/25 py-10 text-center text-xs text-emerald-100/70">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-serif font-bold text-[#DFB15B] text-sm">
              LUNA VIAJERA · Parte de TravelApp Ecosystem
            </span>
            <span>Boletería Oficial Central de Pasajes · Yerba Buena, Tucumán</span>
          </div>
        </footer>
      ) : isExperience ? (
        <ExperienceFooter />
      ) : (
        <OtaFooter />
      )}

      <TravisOmnichannelWidget
        businessUnit={isExperience || isLuna ? "Experiences" : "OTA"}
        primaryColor={isLuna ? "#0A2E20" : "#0A2A5B"}
        brandName={
          isLuna
            ? "Luna Viajera Boletería"
            : isExperience
            ? "TravelApp Experience"
            : "TravelApp Boletería Oficial"
        }
        whatsappUrl="https://wa.me/5493812000712"
      />
    </div>
  );
}
