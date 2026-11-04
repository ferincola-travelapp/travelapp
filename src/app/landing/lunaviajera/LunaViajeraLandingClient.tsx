"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Compass,
  MapPin,
  Clock,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle,
  Users,
  Mountain,
  Sun,
  Moon,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Star,
  X,
  ExternalLink,
  Bus,
  CreditCard,
  QrCode,
  Check,
  Calendar,
  Layers,
  Heart,
  Search,
  Filter,
  Bot,
  MessageSquare,
  HelpCircle,
  Send,
  Eye,
  Award,
  Sliders,
  Settings,
  Camera,
  Maximize2
} from "lucide-react";
import { doc, onSnapshot, collection, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TravisOmnichannelWidget } from "@/components/shared/TravisOmnichannelWidget";

interface LunaViajeraLandingProps {
  initialCms?: any;
}

// Datos predeterminados del CMS para Luna Viajera
const DEFAULT_LUNA_CMS = {
  hero: {
    badge: "✦ EXCURSIONES REGIONALES & SALIDAS DE 1 DÍA",
    title: "Descubrí la magia de los Valles y las Yungas",
    subtitle: "Excursiones de día completo con transporte ida y vuelta desde Yerba Buena, guías locales habilitados y grupos reducidos.",
    slides: [
      {
        id: "slide-1",
        mediaUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=90",
        badge: "✦ VALLES CALCHAQUÍES",
        title: "Tafí del Valle & Quebrada Los Sosa",
        subtitle: "Recorré 30 km de selva subtropical por la mítica Ruta 307 hasta llegar a los monolitos de más de 2000 años y el lago La Angostura."
      },
      {
        id: "slide-2",
        mediaUrl: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=2560&q=90",
        badge: "✦ SELVA NUBICELVA",
        title: "Selva de Yungas & El Cadillal",
        subtitle: "Caminatas bajo helechos gigantes, ríos de montaña de aguas transparentes y el imponente embalse encajonado entre cerros verdes."
      },
      {
        id: "slide-3",
        mediaUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=2560&q=90",
        badge: "✦ CIELOS LIMPIOS",
        title: "Astroturismo & Fogón Bajo las Estrellas",
        subtitle: "Observación telescópica guiada por astrónomos locales, cata de vinos de altura y relatos ancestrales junto al fuego."
      }
    ]
  },
  floatingCards: [
    {
      id: "card-1",
      tag: "Logística",
      title: "Transporte Puerta a Puerta",
      desc: "Salidas puntuales desde Yerba Buena y San Miguel de Tucumán en combis ejecutivas con seguro.",
      iconName: "bus"
    },
    {
      id: "card-2",
      tag: "Coordinación",
      title: "Guías Nativos Habilitados",
      desc: "Acompañamiento de especialistas locales con profundo amor por la historia, flora y leyendas.",
      iconName: "users"
    },
    {
      id: "card-3",
      tag: "Para Todos",
      title: "Dificultad Accesible",
      desc: "Itinerarios relajados aptos para toda la familia, niños y adultos mayores con paradas fotográficas.",
      iconName: "mountain"
    },
    {
      id: "card-4",
      tag: "Valores",
      title: "Turismo Responsable",
      desc: "Compromiso de huella cero: cuidamos nuestros senderos, ríos y apoyamos a las comunidades del valle.",
      iconName: "heart"
    },
    {
      id: "card-5",
      tag: "Flexibilidad",
      title: "Seña Online (30%)",
      desc: "Congelá tu butaca con seña mínima o pagá el total con tarjeta de crédito, débito o billeteras virtuales.",
      iconName: "card"
    }
  ],
  galeria: {
    badge: "Recuerdos & Postales",
    title: "Galería de Experiencias",
    subtitle: "Momentos reales compartidos por nuestros viajeros en los rincones más mágicos del norte argentino.",
    images: [
      {
        id: "gal-1",
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
        caption: "Amanecer en Tafí del Valle",
        location: "Valles Calchaquíes"
      },
      {
        id: "gal-2",
        url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80",
        caption: "Sendero en la Selva de Yungas",
        location: "Yungas Tucumanas"
      },
      {
        id: "gal-3",
        url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
        caption: "Noche de Estrellas y Telescopio",
        location: "Cielos del Valle"
      },
      {
        id: "gal-4",
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        caption: "Cascadas y Ríos de Montaña",
        location: "Quebrada Los Sosa"
      },
      {
        id: "gal-5",
        url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
        caption: "Dique La Angostura",
        location: "El Mollar"
      },
      {
        id: "gal-6",
        url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80",
        caption: "Bosques Nublados y Helechos",
        location: "San Javier"
      }
    ]
  },
  quienesSomos: {
    badge: "Filosofía Luna Viajera",
    title: "Creando Recuerdos en las Tierras Tucumanas",
    description: "Luna Viajera nació con la convicción de que las mejores aventuras están muy cerca de casa. Diseñamos experiencias de cercanía para desconectar del ritmo diario y reconectar con la naturaleza de nuestras sierras, la calidez de su gente y la inmensidad de los Valles Calchaquíes.",
    tagline: "Turismo Responsable y Espiritual",
    originCity: "Yerba Buena — Tucumán, Argentina"
  },
  travis: {
    title: "Consulta algunas dudas a Travis nuestro asistente con IA",
    subtitle: "Travis te responde al instante sobre ropa recomendada, horarios de partida desde Yerba Buena, nivel de senderismo y cupos disponibles.",
    whatsappUrl: "https://wa.me/5493812000712?text=Hola%20Travis!%20Tengo%20una%20consulta%20sobre%20las%20excursiones%20de%20Luna%20Viajera",
    defaultQuestions: [
      "¿Qué ropa y calzado me recomiendan llevar a Tafí?",
      "¿A qué hora salimos y desde dónde nos buscan?",
      "¿Las excursiones son aptas para niños?",
      "¿Cómo abono la seña del 30% para asegurar lugar?"
    ]
  },
  contacto: {
    whatsapp: "381 398-1479",
    telefono: "0810-220-0018",
    email: "lunaviajera@travelapp.ar",
    instagram: "@lunaviajera.turismo",
    ubicacion: "Yerba Buena — Tucumán"
  }
};

// Catálogo por defecto basado en los afiches oficiales de Luna Viajera
const DEFAULT_EXCURSIONES = [
  {
    id: "tafi-del-valle",
    category: "valles",
    categoryLabel: "⛰️ Valles Calchaquíes",
    title: "TAFÍ DEL VALLE Day Trip",
    tagline: "Descubre la belleza de los Valles Calchaquíes",
    detail: "Excursión panorámica de día completo recorriendo la Quebrada de Los Sosa, el Dique La Angostura y los míticos menhires milenarios. Tiempo libre para almorzar empanadas vallistas y pasear por la villa veraniega.",
    badge: "Salida Tradicional",
    duration: "8 - 9 hs",
    departureTime: "08:00 hs — Regreso aprox. 17:00 hs",
    departurePoint: "Yerba Buena — Tucumán",
    difficulty: "Baja · Para todas las edades",
    price: 45000,
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    stops: [
      "Quebrada Los Sosa (30 km de selva montañosa por Ruta 307)",
      "Reserva Arqueológica Los Menhires (+50 monolitos)",
      "Dique La Angostura (vistas panorámicas del valle)"
    ],
    includes: [
      "Transporte ida y vuelta desde Yerba Buena",
      "Guía local especializado durante todo el trayecto",
      "Paradas en miradores panorámicos",
      "Tiempo libre en Tafí del Valle"
    ]
  },
  {
    id: "selva-de-yungas",
    category: "yungas",
    categoryLabel: "🌿 Selva de Yungas",
    title: "SELVA DE YUNGAS",
    tagline: "Yungas Tucumán · Naturaleza, Río y Embalse",
    detail: "Aventura inmersiva por los senderos nublados de las yungas tucumanas con avistaje de flora autóctona, paradas en arroyos de montaña de aguas cristalinas y vistas únicas del embalse El Cadillal.",
    badge: "100% Selva Nublada",
    duration: "8 hs",
    departureTime: "08:30 hs — Regreso 16:30 hs",
    departurePoint: "Yerba Buena / San Miguel de Tucumán",
    difficulty: "Baja - Media · Senderismo ameno",
    price: 39000,
    imageUrl: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80",
    stops: [
      "Bosque Nublado con helechos gigantes y musgos",
      "Río de montaña con pozones de aguas cristalinas",
      "Embalse El Cadillal encajonado entre cerros"
    ],
    includes: [
      "Traslado ida y vuelta desde punto de encuentro",
      "Guía local especializado en flora y fauna",
      "Caminata por senderos selváticos seguros",
      "Paradas fotográficas y tiempo de contemplación"
    ]
  },
  {
    id: "astroturismo-valles",
    category: "astroturismo",
    categoryLabel: "🌌 Astroturismo",
    title: "ASTROTURISMO & FOGÓN",
    tagline: "Cielos Limpios en las Alturas del Valle",
    detail: "Vivencia nocturna bajo el cielo diáfano de altura con guiada astronómica, reconocimiento de constelaciones con puntero láser, observación con telescopio computarizado y fogón con relatos ancestrales.",
    badge: "Experiencia Mágica",
    duration: "6 hs",
    departureTime: "17:00 hs — Regreso 23:30 hs",
    departurePoint: "Yerba Buena — Tucumán",
    difficulty: "Baja · Para toda la familia",
    price: 42000,
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80",
    stops: [
      "Atardecer dorado sobre los cerros",
      "Observación con telescopio computarizado",
      "Fogón con relatos ancestrales y cata de vino"
    ],
    includes: [
      "Transporte ida y vuelta coordinado",
      "Telescopio profesional y guía astronómico",
      "Copa de vino regional o té serrano caliente",
      "Seguro de actividad y asistencia"
    ]
  }
];

export default function LunaViajeraLandingClient({ initialCms }: LunaViajeraLandingProps) {
  // Sincronización en tiempo real del CMS con Firestore
  const [cms, setCms] = useState<any>(initialCms || DEFAULT_LUNA_CMS);
  const [excursiones, setExcursiones] = useState<any[]>(
    initialCms?.excursiones && Array.isArray(initialCms.excursiones) && initialCms.excursiones.length > 0
      ? initialCms.excursiones
      : DEFAULT_EXCURSIONES
  );

  // Escuchar cambios del documento 'landing_lunaviajera' y catálogo receptivo 'experiences' en tiempo real
  useEffect(() => {
    let cmsExcursionesList: any[] =
      initialCms?.excursiones && Array.isArray(initialCms.excursiones) && initialCms.excursiones.length > 0
        ? initialCms.excursiones
        : DEFAULT_EXCURSIONES;
    let receptivoDbList: any[] = [];

    const isReceptivoDoc = (id: string, item: any) => {
      if (!item) return false;
      const isEmisivoOrInternational =
        id.startsWith("OTA-PKG-") ||
        item.tourismVertical === "emisivo" ||
        item.scope === "Internacional" ||
        item.region === "Internacional" ||
        ["operador_mayorista", "crucero", "salida_propia", "paquete_viaje"].includes(
          item.productType || ""
        );
      return !isEmisivoOrInternational;
    };

    const mergeReceptivoCatalog = () => {
      const mergedMap = new Map<string, any>();
      // Primero las excursiones receptivas sincronizadas desde la colección 'experiences'
      receptivoDbList.forEach((item) => {
        mergedMap.set(item.id, item);
      });
      // Luego las excursiones propias del CMS de Luna Viajera (solo receptivas)
      cmsExcursionesList
        .filter((item) => isReceptivoDoc(String(item.id || ""), item))
        .forEach((item) => {
          if (!mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
          }
        });
      const finalCatalog = Array.from(mergedMap.values());
      setExcursiones(finalCatalog.length > 0 ? finalCatalog : DEFAULT_EXCURSIONES);
    };

    const unsubCms = onSnapshot(doc(db, "cms", "landing_lunaviajera"), (snap) => {
      if (snap.exists()) {
        const loaded = snap.data();
        setCms({ ...DEFAULT_LUNA_CMS, ...loaded });
        if (loaded.excursiones && Array.isArray(loaded.excursiones) && loaded.excursiones.length > 0) {
          cmsExcursionesList = loaded.excursiones;
          mergeReceptivoCatalog();
        }
      }
    });

    // Escuchar catálogo de Turismo Receptivo en Firestore (colección 'experiences', acotado con limit)
    const unsubExp = onSnapshot(
      query(collection(db, "experiences"), limit(40)),
      (snapshot) => {
        const dbList: any[] = [];
        snapshot.forEach((d) => {
          const item = d.data();
          if (!isReceptivoDoc(d.id, item)) return;

          const rawCat = String(item.category || item.tripType || "tradicional")
            .toLowerCase()
            .trim();
          dbList.push({
            id: d.id,
            category: rawCat,
            categoryLabel: item.categoryLabel || `🏔️ ${item.category || "Receptivo NOA"}`,
            title: item.title || item.name || "Excursión Receptiva",
            tagline: item.tagline || item.location || item.region || "Norte Argentino",
            detail:
              item.detail ||
              item.description ||
              item.observations ||
              "Excursión receptiva con traslados y guía habilitado.",
            badge: item.badge || "Turismo Receptivo",
            duration: item.duration || "Día Completo",
            departureTime: item.departureTime || "08:00 hs — Regreso 18:00 hs",
            departurePoint: item.departureOrigin || item.departurePoint || "San Miguel de Tucumán / Yerba Buena",
            difficulty: item.difficulty || "Baja · Para toda la familia",
            price: Number(item.price || item.basePrice || 45000),
            imageUrl:
              (Array.isArray(item.images) && item.images[0]) ||
              item.imageUrl ||
              DEFAULT_EXCURSIONES[0].imageUrl,
            stops:
              Array.isArray(item.stops) && item.stops.length > 0
                ? item.stops
                : Array.isArray(item.itinerary) && item.itinerary.length > 0
                ? item.itinerary.map((it: any) => (typeof it === "string" ? it : `${it.time || ""} ${it.activity || ""}`.trim()))
                : ["Recorrido panorámico guiado", "Paradas fotográficas en miradores", "Tiempo libre para almuerzo regional"],
            includes:
              Array.isArray(item.services) && item.services.length > 0
                ? item.services
                : Array.isArray(item.includes) && item.includes.length > 0
                ? item.includes
                : DEFAULT_EXCURSIONES[0].includes,
          });
        });
        receptivoDbList = dbList;
        mergeReceptivoCatalog();
      },
      () => {}
    );

    return () => {
      unsubCms();
      unsubExp();
    };
  }, []);

  // Favicon dinámico exclusivo sin fondo para la landing de Luna Viajera
  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    const originalHref = link ? link.getAttribute("href") : "/assets/favicom.png";

    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = "/assets/luna_viajera_gold.png";

    return () => {
      if (link && originalHref) {
        link.href = originalHref;
      }
    };
  }, []);

  // Control del Hero Slider
  const slides = cms?.hero?.slides || DEFAULT_LUNA_CMS.hero.slides;
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  // Filtros del Catálogo Dinámicos (Creados por el usuario desde el Dashboard)
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("todas");

  // Etiquetas de filtro dinámicas generadas a partir de las excursiones cargadas
  const availableCategories = useMemo(() => {
    const list: { id: string; label: string }[] = [{ id: "todas", label: "🌟 Todas" }];
    const seen = new Set<string>(["todas"]);

    excursiones.forEach((item) => {
      if (item.category) {
        const catKey = String(item.category).toLowerCase().trim();
        if (!seen.has(catKey)) {
          seen.add(catKey);
          list.push({
            id: catKey,
            label: item.categoryLabel || (catKey.charAt(0).toUpperCase() + catKey.slice(1))
          });
        }
      }
    });

    return list;
  }, [excursiones]);

  const filteredExcursiones = useMemo(() => {
    return excursiones.filter((item) => {
      const itemCat = String(item.category || "").toLowerCase().trim();
      const matchesCategory = activeCategory === "todas" || itemCat === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.tagline?.toLowerCase().includes(q) ||
        item.detail?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.departurePoint?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [excursiones, activeCategory, searchQuery]);

  // Modal de Detalle de Excursión ("Ver detalle")
  const [selectedDetailExcursion, setSelectedDetailExcursion] = useState<any | null>(null);

  // Modal Lightbox de Foto de Galería
  const [previewImage, setPreviewImage] = useState<any | null>(null);

  // Modal de Reserva / Checkout Limpio
  const [selectedExcursion, setSelectedExcursion] = useState<any | null>(null);
  const [bookingMode, setBookingMode] = useState<"deposit" | "full">("deposit");
  const [passengerCount, setPassengerCount] = useState(1);
  const [passengerName, setPassengerName] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerDni, setPassengerDni] = useState("");
  const [resStatus, setResStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [createdFile, setCreatedFile] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");

  const handleOpenBooking = (excursion: any, mode: "deposit" | "full") => {
    setSelectedExcursion(excursion);
    setBookingMode(mode);
    setResStatus("idle");
    setCreatedFile("");
    setCheckoutUrl("");
  };

  const handleProcessBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExcursion || resStatus === "loading") return;
    setResStatus("loading");

    try {
      const resCode = `LV-${Math.floor(100000 + Math.random() * 900000)}`;
      const totalAmount = selectedExcursion.price * passengerCount;
      const amountToPay = bookingMode === "deposit" ? Math.round(totalAmount * 0.3) : totalAmount;
      const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

      const reservationPayload = {
        reservationCode: resCode,
        tourId: selectedExcursion.id,
        tourTitle: selectedExcursion.title,
        destination: selectedExcursion.tagline || "Norte Argentino",
        productType: "excursion_local",
        businessUnit: "lunaviajera",
        bookingMode: bookingMode === "deposit" ? "sena_30_nave" : "total_nave",
        nombrePasajero: passengerName,
        passengerName,
        telefonoPasajero: passengerPhone,
        passengerPhone,
        emailPasajero: passengerEmail,
        dniPasajero: passengerDni,
        cantidadPersonas: passengerCount,
        quantity: passengerCount,
        estado: "Pendiente_Pago_Nave",
        financials: {
          currency: "ARS",
          unitPrice: selectedExcursion.price,
          totalPrice: totalAmount,
          paidAmount: 0,
          pendingAmount: totalAmount,
          requestedAdvance: amountToPay,
        },
        source: "WEB_LUNA_VIAJERA",
        createdAt: new Date().toISOString(),
      };

      const res = await fetch("/api/checkout/nave-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalPaymentId: resCode,
          amount: amountToPay,
          currency: "ARS",
          productName: `Luna Viajera: ${selectedExcursion.title}`,
          productDescription: `${selectedExcursion.title} (${passengerCount} pax) · ${bookingMode === "deposit" ? "Seña 30%" : "Pago Total"}`,
          buyer: {
            name: passengerName,
            email: passengerEmail,
            docNumber: passengerDni,
            phone: passengerPhone
          },
          reservationPayload,
          callbackUrl: `${appOrigin}/checkout/success?file=${resCode}&type=lunaviajera&amount=${amountToPay}`
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        alert(data.error || "Demasiados intentos seguidos. Por favor aguardá unos segundos.");
        setResStatus("idle");
        return;
      }

      if (res.ok && data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
      }

      setCreatedFile(resCode);
      setResStatus("success");
    } catch (err) {
      console.error("Error creating reservation:", err);
      setResStatus("error");
    }
  };

  // Preguntas para Travis
  const [travisInput, setTravisInput] = useState("");
  const [travisResponse, setTravisResponse] = useState<string | null>(null);

  const handleAskTravis = (question: string) => {
    setTravisInput(question);
    if (question.toLowerCase().includes("ropa")) {
      setTravisResponse("🥾 Para Tafí del Valle te recomendamos llevar abrigo en capas (campera liviana y polar), calzado cómodo para caminar y lentes de sol. En la montaña el clima cambia rápido y por la tarde suele refrescar.");
    } else if (question.toLowerCase().includes("hora") || question.toLowerCase().includes("salimos")) {
      setTravisResponse("🚐 Las salidas son a las 08:00 hs desde nuestro punto de encuentro en Yerba Buena (con opción de coordinación en San Miguel). El regreso estimado es a las 17:00 hs.");
    } else if (question.toLowerCase().includes("niños") || question.toLowerCase().includes("familia")) {
      setTravisResponse("👨‍👩‍👧‍👦 ¡Totalmente! Nuestras salidas tradicionales son de dificultad baja y están pensadas para disfrutar en familia con niños y personas mayores.");
    } else {
      setTravisResponse("🌟 Podés asegurar tu lugar con una seña del 30% online con tarjeta, débito o billetera. ¡El 70% restante lo abonás el día de la salida antes de subir a la combi!");
    }
  };

  const getPilarIcon = (name: string) => {
    switch (name) {
      case "bus":
        return Bus;
      case "users":
        return Users;
      case "mountain":
        return Mountain;
      case "heart":
        return Heart;
      default:
        return CreditCard;
    }
  };

  return (
    <div className="min-h-screen bg-[#072118] text-[#F5F2EB] font-sans selection:bg-[#DFB15B] selection:text-[#0A2E20] flex flex-col justify-between">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER DEL ECOSISTEMA CON LOGO DORADO TRANSPARENTE DESTACADO
          ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0A2E20]/95 backdrop-blur-md border-b border-[#DFB15B]/30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          
          {/* Logo Oficial de Luna Viajera - Tamaño Prominente (La luna con el explorador resalta mucho) */}
          <Link href="/landing/lunaviajera" className="flex items-center gap-4 group py-1">
            <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[#DFB15B]/20 rounded-full blur-xl group-hover:bg-[#DFB15B]/35 transition duration-300" />
              <img
                src="/assets/luna_viajera_gold.png"
                alt="Luna Viajera - Explorador y Luna"
                className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-[0_0_25px_rgba(223,177,91,0.9)] group-hover:scale-105 transition duration-300 relative z-10"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-black text-2xl sm:text-3xl tracking-widest text-[#DFB15B] block leading-none font-serif drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
                LUNA VIAJERA
              </span>
              <span className="text-[11px] sm:text-xs tracking-[0.28em] uppercase font-extrabold text-emerald-200/95 block mt-1.5 drop-shadow">
                — Creando Recuerdos —
              </span>
            </div>
          </Link>

          {/* Menú de Navegación del Ecosistema (Sin botón Travis en Header) */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-[#EDE6D8]">
            <a href="#hero" className="hover:text-[#DFB15B] transition py-1">
              Inicio
            </a>
            <a href="#excursiones" className="hover:text-[#DFB15B] transition flex items-center gap-1.5 py-1">
              <span>Excursiones</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#DFB15B]"></span>
            </a>
            <a href="#galeria" className="hover:text-[#DFB15B] transition py-1">
              Galería
            </a>
            <a href="#quienes-somos" className="hover:text-[#DFB15B] transition py-1">
              Quiénes Somos
            </a>
            <a href="#contacto" className="hover:text-[#DFB15B] transition py-1">
              Contacto
            </a>
          </nav>

          {/* Acciones del Header: Auth Oficial */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-[#EDE6D8] hover:text-[#DFB15B] px-3.5 py-2 rounded-xl border border-[#DFB15B]/40 hover:border-[#DFB15B] transition"
            >
              Ingresar
            </Link>

            <Link
              href="/registro"
              className="text-xs font-black text-[#0A2E20] bg-gradient-to-r from-[#DFB15B] via-[#F4D375] to-[#C59B3F] hover:from-[#FEE69A] hover:to-[#DFB15B] px-4 py-2 rounded-xl transition shadow-md shadow-[#DFB15B]/20 flex items-center gap-1.5"
            >
              <span>Registrarse</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SLIDER DEL ECOSISTEMA (FOTOGRAFÍA LIMPIA + TEXTOS CON SOMBRA INTENSA)
          ───────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative w-full h-[580px] sm:h-[660px] overflow-hidden bg-[#0A2E20]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides de Fondo en Rotación Suave - Soporta Imagen HD y Video MP4/WebM */}
        {slides.map((slide: any, idx: number) => {
          const isActive = idx === currentSlideIdx;
          const imgSrc = slide.mediaUrl || slide.bgImage || slide.imageUrl || DEFAULT_LUNA_CMS.hero.slides[0].mediaUrl;
          const videoSrc =
            slide.videoUrl ||
            (slide.mediaType === "video" || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(imgSrc) ? imgSrc : "");
          return (
            <div
              key={slide.id || idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Imagen de Fondo HD Limpia */}
              <img
                src={imgSrc}
                alt={slide.title || "Luna Viajera"}
                className="w-full h-full object-cover object-center filter brightness-100 contrast-105"
              />
              {videoSrc && (
                <video
                  key={videoSrc}
                  src={videoSrc}
                  poster={imgSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              )}
              
              {/* Sutil difuminado únicamente al pie del Hero para conectar con las tarjetas superpuestas */}
              <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-[#072118] via-[#072118]/60 to-transparent pointer-events-none" />
            </div>
          );
        })}

        {/* Contenido Central del Slide Activo con Sombras de Alto Contraste para que Resalte */}
        <div className="relative z-20 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <div className="max-w-3xl space-y-5">
            
            {/* Badge Dorado con Sombra Intensa */}
            <div className="inline-flex items-center gap-2 bg-[#0A2E20]/95 border-2 border-[#DFB15B] px-4 py-2 rounded-full text-xs font-black text-[#F4D375] tracking-widest uppercase shadow-[0_8px_30px_rgba(0,0,0,0.9)] backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-[#DFB15B]" />
              <span>{slides[currentSlideIdx]?.badge || cms?.hero?.badge}</span>
            </div>

            {/* Título Principal con Marcada Sombra de Relieve para Destacar sobre la Imagen Limpia */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.08] font-serif drop-shadow-[0_8px_25px_rgba(0,0,0,0.98)] [text-shadow:_0_5px_30px_rgba(0,0,0,1),_0_2px_12px_rgba(0,0,0,0.95)]">
              {slides[currentSlideIdx]?.title || cms?.hero?.title}
            </h1>

            {/* Subtítulo con Sombra para Lectura Impecable */}
            <p className="text-base sm:text-xl md:text-2xl text-[#FFF8EB] font-bold leading-relaxed drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)] [text-shadow:_0_3px_20px_rgba(0,0,0,0.98)] max-w-2xl">
              {slides[currentSlideIdx]?.subtitle || cms?.hero?.subtitle}
            </p>

            {/* Botones de Acción / Llamada a la Acción con Sombra Fuerte y Elevada */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <a
                href="#excursiones"
                className="px-8 py-4 bg-gradient-to-r from-[#DFB15B] via-[#F4D375] to-[#C59B3F] hover:from-[#FEE69A] hover:to-[#DFB15B] text-[#0A2E20] font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition shadow-[0_12px_35px_rgba(0,0,0,0.9)] hover:shadow-[0_16px_45px_rgba(223,177,91,0.7)] flex items-center justify-center gap-2.5 border-2 border-[#FFF0B8] active:scale-95"
              >
                <Compass className="h-5 w-5" />
                <span>Explorar Excursiones</span>
              </a>

              <a
                href="#quienes-somos"
                className="px-8 py-4 bg-[#0A2E20]/95 hover:bg-[#0A2E20] text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl border-2 border-[#DFB15B] transition shadow-[0_12px_35px_rgba(0,0,0,0.9)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.95)] flex items-center justify-center gap-2.5 active:scale-95 backdrop-blur-md"
              >
                <Mountain className="h-5 w-5 text-[#DFB15B]" />
                <span>Nuestra Filosofía</span>
              </a>
            </div>

          </div>
        </div>

        {/* Flechas y Controles del Slider */}
        <div className="absolute z-20 bottom-8 right-6 sm:right-12 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentSlideIdx((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
            className="h-10 w-10 rounded-full bg-[#0A2E20]/80 border border-[#DFB15B]/40 text-[#DFB15B] hover:bg-[#DFB15B] hover:text-[#0A2E20] flex items-center justify-center transition shadow-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          {/* Puntos Indicadores */}
          <div className="flex gap-1.5 px-2">
            {slides.map((_: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlideIdx(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlideIdx ? "w-6 bg-[#DFB15B]" : "w-2 bg-[#EDE6D8]/40"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCurrentSlideIdx((prev) => (prev + 1) % slides.length)}
            className="h-10 w-10 rounded-full bg-[#0A2E20]/80 border border-[#DFB15B]/40 text-[#DFB15B] hover:bg-[#DFB15B] hover:text-[#0A2E20] flex items-center justify-center transition shadow-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. TARJETAS FLOTANTES SUPERPUESTAS (OVERLAPPING CARDS)
          ───────────────────────────────────────────────────────────── */}
      <section className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 sm:-mt-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {(cms?.floatingCards || DEFAULT_LUNA_CMS.floatingCards).map((card: any, idx: number) => {
            const IconComponent = getPilarIcon(card.iconName);
            return (
              <div
                key={card.id || idx}
                className="bg-[#0B3324] rounded-2xl p-4 sm:p-5 border-2 border-[#DFB15B]/40 hover:border-[#DFB15B] transition-all duration-300 shadow-2xl flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-[#082419] border border-[#DFB15B]/50 flex items-center justify-center text-[#DFB15B] group-hover:scale-110 transition shadow-inner">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#F4D375] bg-[#082419] border border-[#DFB15B]/30 px-2 py-0.5 rounded-md">
                      {card.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-white group-hover:text-[#DFB15B] transition font-serif">
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-[#EDE6D8]/80 mt-1 leading-snug font-medium">
                      {card.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#DFB15B]/20 mt-3 flex items-center justify-between text-[11px] font-bold text-[#DFB15B]">
                  <span>Incluido</span>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. CATÁLOGO CON BUSCADOR Y FILTROS DEL ECOSISTEMA
          ───────────────────────────────────────────────────────────── */}
      <section id="excursiones" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Cabecera del Catálogo */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-[#DFB15B]/30 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#DFB15B] uppercase tracking-wider mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Catálogo Oficial Luna Viajera</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-serif">
              Excursiones y Salidas de 1 Día
            </h2>
            <p className="text-xs sm:text-sm text-[#EDE6D8]/80 font-medium mt-1">
              Seleccioná tu próxima salida. Tarifas finales en pesos con cupos limitados y seguro de viaje incluido.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#F4D375] bg-[#093223] border border-[#DFB15B]/40 px-3.5 py-1.5 rounded-full shadow-sm">
              {filteredExcursiones.length} {filteredExcursiones.length === 1 ? "Salida Disponible" : "Salidas Disponibles"}
            </span>
          </div>
        </div>

        {/* Barra de Filtros del Ecosistema */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-[#093223]/70 p-3 rounded-2xl border border-[#DFB15B]/30 backdrop-blur-sm">
          
          {/* Buscador de Texto */}
          <div className="sm:col-span-5 relative">
            <Search className="h-4 w-4 text-[#DFB15B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por destino, Tafí, Yungas, río..."
              className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-[#072118] border border-[#DFB15B]/40 font-bold text-xs text-white placeholder-[#EDE6D8]/50 focus:outline-none focus:border-[#DFB15B]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Categorías en Chips Dinámicas (Nutridas desde el Dashboard) */}
          <div className="sm:col-span-7 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeCategory === cat.id
                    ? "bg-gradient-to-r from-[#DFB15B] to-[#C59B3F] text-[#0A2E20] font-black shadow-md shadow-[#DFB15B]/20"
                    : "bg-[#072118] text-[#EDE6D8] hover:text-white border border-[#DFB15B]/30"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

        </div>

        {/* Grid de Tarjetas de Excursiones (Formato Ecosistema con Detalles de Afiche) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExcursiones.map((excursion) => (
            <div
              key={excursion.id}
              className="rounded-3xl border-2 border-[#DFB15B]/50 hover:border-[#DFB15B] bg-[#0B3324] overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 group"
            >
              <div>
                {/* Imagen Principal */}
                <div className="h-52 overflow-hidden relative">
                  <img
                    src={excursion.imageUrl}
                    alt={excursion.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B3324] via-transparent to-transparent" />
                  
                  {/* Badges Flotantes sobre la Imagen */}
                  <span className="absolute top-3 left-3 bg-[#0A2E20]/90 text-[#F4D375] border border-[#DFB15B]/50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                    {excursion.badge}
                  </span>

                  <span className="absolute top-3 right-3 bg-[#0A2E20]/90 text-white border border-[#DFB15B]/50 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm">
                    <Clock className="h-3 w-3 text-[#DFB15B]" />
                    <span>{excursion.duration}</span>
                  </span>
                </div>

                {/* Contenido de la Tarjeta */}
                <div className="p-5 space-y-3.5">
                  <div>
                    <h3 className="text-xl font-black text-[#DFB15B] font-serif group-hover:text-[#F4D375] transition">
                      {excursion.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#EDE6D8]/80 mt-1 leading-snug">
                      {excursion.tagline}
                    </p>
                  </div>

                  {/* Espacio de Texto Libre: Detalle de la Excursión */}
                  {(excursion.detail || excursion.description) && (
                    <div className="bg-[#082419]/90 p-3 rounded-xl border border-[#DFB15B]/30 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#DFB15B] block">
                        Detalle de la Excursión:
                      </span>
                      <p className="text-xs text-[#EDE6D8] leading-relaxed font-normal whitespace-pre-line">
                        {excursion.detail || excursion.description}
                      </p>
                    </div>
                  )}

                  {/* Paradas Destacadas */}
                  {excursion.stops && (
                    <div className="bg-[#082419] p-3 rounded-xl border border-[#DFB15B]/30 space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DFB15B] block">
                        Paradas y Atractivos:
                      </span>
                      <ul className="text-[11px] text-[#EDE6D8] space-y-1">
                        {excursion.stops.map((stop: string, sIdx: number) => (
                          <li key={sIdx} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-[#DFB15B] font-bold">•</span>
                            <span>{stop}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Salida y Dificultad */}
                  <div className="text-xs text-[#EDE6D8] space-y-1 pt-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-[#DFB15B]" />
                      <span><strong>Salida:</strong> {excursion.departurePoint}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[#DFB15B]" />
                      <span><strong>Horario:</strong> {excursion.departureTime}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Pie de Tarjeta con Precio y Botones Limpios */}
              <div className="p-5 pt-0 space-y-3">
                <div className="pt-3 border-t border-[#DFB15B]/20 flex items-baseline justify-between">
                  <span className="text-xs text-[#EDE6D8]/80 font-bold">Por persona:</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white font-serif">
                      ${excursion.price?.toLocaleString("es-AR")}
                    </span>
                    <span className="text-[10px] font-bold text-[#F4D375] block -mt-1">ARS Final</span>
                  </div>
                </div>

                {/* Botones de Acción Solicitados: Ver Detalle, Consultar y Contratar */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {/* 1. Ver detalle */}
                    <button
                      type="button"
                      onClick={() => setSelectedDetailExcursion(excursion)}
                      className="py-2.5 px-3 bg-[#082419] hover:bg-[#0c3525] text-[#EDE6D8] border border-[#DFB15B]/40 hover:border-[#DFB15B] rounded-xl font-black text-xs uppercase tracking-wider transition text-center flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#DFB15B]" />
                      <span>Ver detalle</span>
                    </button>

                    {/* 2. Consultar */}
                    <button
                      type="button"
                      onClick={() => handleAskTravis(`Hola Travis! Deseo consultar información y disponibilidad para la excursión: ${excursion.title}`)}
                      className="py-2.5 px-3 bg-[#0A2E20] hover:bg-[#0e3f2c] text-[#F4D375] border border-[#DFB15B]/50 hover:border-[#DFB15B] rounded-xl font-black text-xs uppercase tracking-wider transition text-center flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-[#DFB15B]" />
                      <span>Consultar</span>
                    </button>
                  </div>

                  {/* 3. Contratar */}
                  <button
                    type="button"
                    onClick={() => handleOpenBooking(excursion, "deposit")}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-[#DFB15B] via-[#F4D375] to-[#C59B3F] hover:from-[#FEE69A] hover:to-[#DFB15B] text-[#0A2E20] rounded-xl font-black text-xs uppercase tracking-wider transition text-center shadow-md shadow-[#DFB15B]/25 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CreditCard className="h-4 w-4 text-[#0A2E20]" />
                    <span>Contratar</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. GALERÍA DE IMÁGENES & EXPERIENCIAS REALES (CARGADA DESDE EL DASHBOARD)
          ───────────────────────────────────────────────────────────── */}
      <section id="galeria" className="py-20 bg-[#072118] border-t-2 border-[#DFB15B]/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Encabezado de la Galería */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#0A2E20] border border-[#DFB15B]/50 px-3.5 py-1 rounded-full text-xs font-black text-[#F4D375] uppercase tracking-wider shadow-sm">
              <Camera className="h-4 w-4 text-[#DFB15B]" />
              <span>{cms?.galeria?.badge || DEFAULT_LUNA_CMS.galeria.badge}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white font-serif tracking-tight">
              {cms?.galeria?.title || DEFAULT_LUNA_CMS.galeria.title}
            </h2>

            <p className="text-sm sm:text-base text-[#EDE6D8]/80 font-medium leading-relaxed">
              {cms?.galeria?.subtitle || DEFAULT_LUNA_CMS.galeria.subtitle}
            </p>
          </div>

          {/* Grid de Fotos Responsive con Hover y Lightbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(cms?.galeria?.images || DEFAULT_LUNA_CMS.galeria.images).map((photo: any, pIdx: number) => (
              <div
                key={photo.id || pIdx}
                onClick={() => setPreviewImage(photo)}
                className="group relative h-72 rounded-3xl overflow-hidden border-2 border-[#DFB15B]/40 hover:border-[#DFB15B] shadow-xl bg-[#0B3324] cursor-pointer transition-all duration-300 hover:-translate-y-1"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || `Postal Luna Viajera ${pIdx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-700 ease-out"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#072118]/90 via-[#072118]/30 to-transparent opacity-80 group-hover:opacity-95 transition" />

                {/* Badge de Ubicación Flotante */}
                {photo.location && (
                  <div className="absolute top-4 left-4 bg-[#0A2E20]/90 border border-[#DFB15B]/50 px-3 py-1 rounded-full text-[10px] font-black text-[#F4D375] uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 shadow-md">
                    <MapPin className="h-3 w-3 text-[#DFB15B]" />
                    <span>{photo.location}</span>
                  </div>
                )}

                {/* Ícono de Zoom en Hover */}
                <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-[#0A2E20]/80 border border-[#DFB15B]/60 text-[#DFB15B] flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 shadow-md">
                  <Maximize2 className="h-4 w-4" />
                </div>

                {/* Título / Epígrafe en la Base */}
                <div className="absolute bottom-4 inset-x-4">
                  <p className="text-white font-serif font-black text-lg group-hover:text-[#F4D375] transition leading-snug drop-shadow-md">
                    {photo.caption}
                  </p>
                  <span className="text-[11px] font-bold text-emerald-200/90 flex items-center gap-1 mt-0.5">
                    <span>Ver postal completa</span>
                    <ChevronRight className="h-3 w-3 text-[#DFB15B]" />
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. SECCIÓN INTERACTIVA DE TRAVIS (CONSULTAS Y DUDAS 24/7)
          ───────────────────────────────────────────────────────────── */}
      <section id="travis-asistente" className="py-16 bg-[#082419] border-y-2 border-[#DFB15B]/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-[#0B3324] rounded-3xl border-2 border-[#DFB15B] p-6 sm:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Información y Preguntas Rápidas */}
              <div className="lg:col-span-8 space-y-4">
                
                <div className="inline-flex items-center gap-2 bg-[#082419] border border-[#DFB15B]/50 px-3.5 py-1 rounded-full text-xs font-black text-[#F4D375] uppercase tracking-wider">
                  <Bot className="h-4 w-4 text-[#DFB15B]" />
                  <span>Asistente Oficial de Viajes</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-white font-serif leading-tight">
                  {cms?.travis?.title || "Consulta algunas dudas a Travis nuestro asistente con IA"}
                </h2>

                <p className="text-sm text-[#EDE6D8] font-medium leading-relaxed">
                  {cms?.travis?.subtitle || "Travis es tu copiloto de viaje en Luna Viajera. Te responde al instante sobre ropa recomendada, horarios de partida desde Yerba Buena, nivel de senderismo y cupos disponibles."}
                </p>

                {/* Preguntas Sugeridas con 1 Clic */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-extrabold text-[#DFB15B] uppercase tracking-wider block">
                    Preguntas frecuentes rápidas:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(cms?.travis?.defaultQuestions || DEFAULT_LUNA_CMS.travis.defaultQuestions).map((q: string, qIdx: number) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleAskTravis(q)}
                        className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-[#082419] hover:bg-[#0c3525] border border-[#DFB15B]/40 text-[#EDE6D8] hover:text-[#F4D375] transition text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Respuesta Dinámica de Travis */}
                {travisResponse && (
                  <div className="p-4 rounded-2xl bg-[#082419] border border-[#DFB15B]/60 text-xs text-white leading-relaxed animate-in fade-in space-y-2 shadow-inner">
                    <div className="flex items-center gap-2 text-[#DFB15B] font-extrabold">
                      <Bot className="h-4 w-4" />
                      <span>Respuesta de Travis Guía:</span>
                    </div>
                    <p>{travisResponse}</p>
                  </div>
                )}

                {/* Botón Directo para Abrir WhatsApp con Travis */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <a
                    href={cms?.travis?.whatsappUrl || DEFAULT_LUNA_CMS.travis.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#DFB15B] via-[#F4D375] to-[#C59B3F] hover:from-[#FEE69A] hover:to-[#DFB15B] text-[#0A2E20] font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-[#DFB15B]/20 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Chatear con Travis por WhatsApp</span>
                  </a>

                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>En línea 24/7 sin esperas</span>
                  </div>
                </div>

              </div>

              {/* Avatar Aventurero de Travis */}
              <div className="lg:col-span-4 flex justify-center">
                <div className="relative">
                  <div className="h-48 w-48 sm:h-56 sm:w-56 rounded-3xl bg-[#082419] border-2 border-[#DFB15B] p-4 shadow-2xl flex items-center justify-center">
                    <img
                      src="/assets/travis_casual.svg"
                      alt="Travis Asistente de Viajes"
                      className="h-36 sm:h-44 w-auto object-contain"
                    />
                  </div>
                  <div className="absolute -bottom-3 -right-2 bg-[#DFB15B] text-[#0A2E20] px-3.5 py-1 rounded-full font-black text-xs uppercase tracking-wider shadow-lg">
                    Copiloto IA
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. QUIÉNES SOMOS & FILOSOFÍA (ECOSISTEMA TRAVELAPP)
          ───────────────────────────────────────────────────────────── */}
      <section id="quienes-somos" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0B3324] rounded-3xl border border-[#DFB15B]/30 p-8 sm:p-12 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-[#DFB15B]">
                {cms?.quienesSomos?.badge || "Filosofía Luna Viajera"}
              </span>

              <h2 className="text-2xl sm:text-4xl font-black text-white font-serif leading-tight">
                {cms?.quienesSomos?.title || "Creando Recuerdos en las Tierras Tucumanas"}
              </h2>

              <p className="text-sm sm:text-base text-[#EDE6D8] font-medium leading-relaxed">
                {cms?.quienesSomos?.description || "Luna Viajera nació con la convicción de que las mejores aventuras están muy cerca de casa. Diseñamos experiencias de cercanía para desconectar del ritmo diario y reconectar con la naturaleza de nuestras sierras, la calidez de su gente y la inmensidad de los Valles Calchaquíes."}
              </p>

              <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold text-[#F4D375]">
                <div className="flex items-center gap-1.5 bg-[#082419] px-3.5 py-2 rounded-xl border border-[#DFB15B]/30">
                  <MapPin className="h-4 w-4 text-[#DFB15B]" />
                  <span>Yerba Buena — Tucumán</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#082419] px-3.5 py-2 rounded-xl border border-[#DFB15B]/30">
                  <Heart className="h-4 w-4 text-[#DFB15B]" />
                  <span>Turismo Responsable y Espiritual</span>
                </div>
              </div>
            </div>

            {/* Logo Medallón */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="h-44 w-44 rounded-full bg-[#082419] border-2 border-[#DFB15B] flex flex-col items-center justify-center p-4 shadow-2xl">
                <img
                  src="/assets/luna_viajera_gold.png"
                  alt="Luna Viajera Isotipo"
                  className="h-20 w-20 object-contain drop-shadow-[0_0_10px_rgba(223,177,91,0.5)]"
                />
                <span className="text-xs font-black text-[#DFB15B] font-serif mt-1">LUNA VIAJERA</span>
                <span className="text-[9px] uppercase font-bold text-emerald-300">Tucumán</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. FOOTER INSTITUCIONAL DEL ECOSISTEMA
          ───────────────────────────────────────────────────────────── */}
      <footer id="contacto" className="bg-[#051A13] border-t-2 border-[#DFB15B]/30 pt-16 pb-12 text-[#EDE6D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
            
            {/* Columna 1: Marca Luna Viajera */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/luna_viajera_gold.png"
                  alt="Luna Viajera"
                  className="h-10 w-10 object-contain drop-shadow-[0_0_8px_rgba(223,177,91,0.5)]"
                />
                <div>
                  <span className="font-extrabold text-xl text-[#DFB15B] block leading-none font-serif">
                    LUNA VIAJERA
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-200">
                    — Creando Recuerdos —
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#EDE6D8]/80 leading-relaxed max-w-sm">
                Excursiones locales de día completo, paseos de naturaleza y senderismo seguro con base operativa en Yerba Buena, Tucumán.
              </p>

              {/* Miembro Oficial del Ecosistema */}
              <div className="p-3 bg-[#082419] rounded-xl border border-[#DFB15B]/30 flex items-center gap-3 max-w-md">
                <img
                  src="/assets/travelapp_blanco.svg"
                  alt="TravelApp Logo"
                  className="h-6 w-auto object-contain opacity-90"
                />
                <span className="text-[11px] text-[#EDE6D8] font-semibold leading-tight">
                  Miembro oficial del ecosistema de viajes y tecnología de <strong>TravelApp s.a.s.</strong>
                </span>
              </div>
            </div>

            {/* Columna 2: Central de Consultas & Travis */}
            <div className="lg:col-span-4 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#DFB15B]">
                Consultas & Dudas
              </h4>

              <div className="space-y-2 text-xs">
                <a
                  href={cms?.travis?.whatsappUrl || DEFAULT_LUNA_CMS.travis.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-[#DFB15B] transition font-bold text-white text-sm"
                >
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  <span>WhatsApp Travis: {cms?.contacto?.whatsapp || "381 398-1479"}</span>
                </a>

                <a
                  href="tel:08102200018"
                  className="flex items-center gap-2 hover:text-[#DFB15B] transition font-semibold"
                >
                  <Phone className="h-4 w-4 text-[#DFB15B]" />
                  <span>Central Telefónica: {cms?.contacto?.telefono || "0810-220-0018"}</span>
                </a>

                <div className="flex items-center gap-2 text-[#EDE6D8]/80">
                  <MapPin className="h-4 w-4 text-[#DFB15B]" />
                  <span>{cms?.contacto?.ubicacion || "Yerba Buena — Tucumán, Argentina"}</span>
                </div>

                <div className="flex items-center gap-2 text-[#EDE6D8]/80">
                  <Mail className="h-4 w-4 text-[#DFB15B]" />
                  <span>{cms?.contacto?.email || "lunaviajera@travelapp.ar"}</span>
                </div>
              </div>
            </div>

            {/* Columna 3: Sellos Legales y Redes */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#DFB15B]">
                Confianza & Redes
              </h4>

              <div className="space-y-2">
                <a
                  href="https://instagram.com/lunaviajera.turismo"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-white hover:text-[#DFB15B] block"
                >
                  📸 {cms?.contacto?.instagram || "@lunaviajera.turismo"}
                </a>

                <div className="pt-2 flex flex-wrap gap-2">
                  <div className="bg-[#082419] px-2.5 py-1.5 rounded-lg border border-[#DFB15B]/30 text-[10px] font-bold text-[#EDE6D8]">
                    🏛️ ARCA / AFIP
                  </div>
                  <div className="bg-[#082419] px-2.5 py-1.5 rounded-lg border border-[#DFB15B]/30 text-[10px] font-bold text-[#EDE6D8]">
                    🔒 Ley 25.326 Datos
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Copyright Final */}
          <div className="pt-8 border-t border-[#DFB15B]/20 flex flex-col sm:flex-row items-center justify-between text-xs text-[#EDE6D8]/60 gap-4">
            <p>© {new Date().getFullYear()} Luna Viajera. Creando Recuerdos. Ecosistema TravelApp s.a.s.</p>
            <p className="text-[11px]">Agencia de Viajes y Turismo Minorista • Salidas Locales</p>
          </div>

        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          8. BURBUJA FLOTANTE DE TRAVIS OMNICHANNEL WIDGET
          ───────────────────────────────────────────────────────────── */}
      <TravisOmnichannelWidget
        businessUnit="Experiences"
        brandName="Luna Viajera"
        primaryColor="#DFB15B"
        whatsappUrl={cms?.travis?.whatsappUrl || DEFAULT_LUNA_CMS.travis.whatsappUrl}
      />

      {/* ─────────────────────────────────────────────────────────────
          9. MODAL DE RESERVA / SEÑA (FLUIDO, SEGURO Y LIMPIO)
          ───────────────────────────────────────────────────────────── */}
      {selectedExcursion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B3324] border-2 border-[#DFB15B] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            
            {/* Header del Modal */}
            <div className="flex items-start justify-between border-b border-[#DFB15B]/30 pb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#DFB15B]">
                  {bookingMode === "deposit" ? "Abonar Seña (30%)" : "Pago Total de Excursión"}
                </span>
                <h3 className="font-extrabold text-lg text-white mt-0.5 font-serif">
                  {selectedExcursion.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExcursion(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {resStatus === "success" ? (
              <div className="py-6 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-[#082419] text-[#25D366] border border-[#25D366]/50 flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-xl text-white font-serif">¡Reserva Generada con Éxito!</h4>
                  <p className="text-xs text-[#EDE6D8]">
                    Expediente: <strong className="text-[#DFB15B]">{createdFile}</strong>
                  </p>
                </div>

                {checkoutUrl && (
                  <div className="pt-2">
                    <a
                      href={checkoutUrl}
                      className="w-full py-3.5 bg-gradient-to-r from-[#DFB15B] via-[#F4D375] to-[#C59B3F] hover:from-[#FEE69A] hover:to-[#DFB15B] text-[#0A2E20] rounded-2xl font-black text-xs uppercase tracking-wider text-center transition flex items-center justify-center gap-2 shadow-lg shadow-[#DFB15B]/20"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Completar Pago Seguro</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <a
                    href={`https://wa.me/5493812000712?text=Hola%20Travis!%20Acabo%20de%20reservar%20${encodeURIComponent(selectedExcursion.title)}%20con%20codigo%20${createdFile}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-[#0A2E20] rounded-2xl font-black text-xs text-center transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Avisar a Travis por WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedExcursion(null)}
                    className="px-5 py-3 bg-[#082419] hover:bg-[#072116] text-[#EDE6D8] rounded-2xl font-bold text-xs border border-[#DFB15B]/30"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProcessBooking} className="space-y-4">
                
                {/* Cantidad de Pasajeros */}
                <div className="flex items-center justify-between bg-[#082419] p-3 rounded-2xl border border-[#DFB15B]/30">
                  <span className="text-xs font-bold text-[#EDE6D8]">Cantidad de Pasajeros:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                      className="h-8 w-8 rounded-lg bg-[#0B3324] text-white font-bold flex items-center justify-center border border-[#DFB15B]/30"
                    >
                      -
                    </button>
                    <span className="font-extrabold text-sm text-white w-6 text-center">{passengerCount}</span>
                    <button
                      type="button"
                      onClick={() => setPassengerCount(passengerCount + 1)}
                      className="h-8 w-8 rounded-lg bg-[#0B3324] text-white font-bold flex items-center justify-center border border-[#DFB15B]/30"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Campos de Pasajero */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#EDE6D8] block mb-1">Nombre y Apellido del Titular</label>
                    <input
                      type="text"
                      required
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      placeholder="Ej. Sofía Martínez"
                      className="w-full bg-[#082419] border border-[#DFB15B]/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#DFB15B]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#EDE6D8] block mb-1">DNI / Pasaporte</label>
                      <input
                        type="text"
                        required
                        value={passengerDni}
                        onChange={(e) => setPassengerDni(e.target.value)}
                        placeholder="Sin puntos"
                        className="w-full bg-[#082419] border border-[#DFB15B]/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#DFB15B]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#EDE6D8] block mb-1">WhatsApp de Contacto</label>
                      <input
                        type="tel"
                        required
                        value={passengerPhone}
                        onChange={(e) => setPassengerPhone(e.target.value)}
                        placeholder="381..."
                        className="w-full bg-[#082419] border border-[#DFB15B]/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#DFB15B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#EDE6D8] block mb-1">Email para Enviar Voucher</label>
                    <input
                      type="email"
                      required
                      value={passengerEmail}
                      onChange={(e) => setPassengerEmail(e.target.value)}
                      placeholder="tuemail@ejemplo.com"
                      className="w-full bg-[#082419] border border-[#DFB15B]/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#DFB15B]"
                    />
                  </div>
                </div>

                {/* Resumen de Tarifas */}
                <div className="bg-[#082419] p-3.5 rounded-2xl border border-[#DFB15B]/40 space-y-1.5">
                  <div className="flex justify-between text-xs text-[#EDE6D8]">
                    <span>Total excursión ({passengerCount} pax):</span>
                    <span className="font-bold text-white">
                      ${(selectedExcursion.price * passengerCount).toLocaleString("es-AR")} ARS
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[#DFB15B] pt-1 border-t border-[#DFB15B]/20">
                    <span>Monto a abonar ahora ({bookingMode === "deposit" ? "30% Seña" : "100% Total"}):</span>
                    <span>
                      ${(bookingMode === "deposit" ? Math.round(selectedExcursion.price * passengerCount * 0.3) : selectedExcursion.price * passengerCount).toLocaleString("es-AR")} ARS
                    </span>
                  </div>
                </div>

                {/* Botón de Confirmación Limpio */}
                <button
                  type="submit"
                  disabled={resStatus === "loading"}
                  className="w-full py-3.5 bg-gradient-to-r from-[#DFB15B] via-[#F4D375] to-[#C59B3F] hover:from-[#FEE69A] hover:to-[#DFB15B] text-[#0A2E20] rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg shadow-[#DFB15B]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resStatus === "loading" ? (
                    <span>Procesando...</span>
                  ) : (
                    <>
                      <span>{bookingMode === "deposit" ? "Confirmar Seña y Asegurar Lugar" : "Confirmar y Pagar Excursión"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL DE DETALLE COMPLETO DE LA EXCURSIÓN ("Ver detalle")
          ───────────────────────────────────────────────────────────── */}
      {selectedDetailExcursion && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-[#0B3324] rounded-3xl border-2 border-[#DFB15B] overflow-hidden shadow-2xl my-8">
            
            {/* Botón de Cierre */}
            <button
              type="button"
              onClick={() => setSelectedDetailExcursion(null)}
              className="absolute top-4 right-4 z-20 h-9 w-9 rounded-full bg-[#0A2E20]/90 text-white hover:text-[#DFB15B] border border-[#DFB15B]/60 flex items-center justify-center transition shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Cabecera con Foto */}
            <div className="h-64 sm:h-72 relative overflow-hidden">
              <img
                src={selectedDetailExcursion.imageUrl}
                alt={selectedDetailExcursion.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B3324] via-[#0B3324]/40 to-transparent" />
              
              <div className="absolute bottom-4 left-6 right-6">
                <span className="bg-[#0A2E20]/90 text-[#F4D375] border border-[#DFB15B]/50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm inline-block mb-2">
                  {selectedDetailExcursion.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#DFB15B] font-serif leading-tight">
                  {selectedDetailExcursion.title}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-[#EDE6D8] mt-1">
                  {selectedDetailExcursion.tagline}
                </p>
              </div>
            </div>

            {/* Contenido del Detalle */}
            <div className="p-6 space-y-5 text-xs text-[#EDE6D8]">
              
              {/* Espacio de Texto Libre: Detalle de la Excursión */}
              {(selectedDetailExcursion.detail || selectedDetailExcursion.description) && (
                <div className="bg-[#082419] p-4 rounded-2xl border border-[#DFB15B]/30 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#DFB15B] block">
                    Detalle & Experiencia:
                  </span>
                  <p className="text-xs text-[#EDE6D8] leading-relaxed whitespace-pre-line font-normal">
                    {selectedDetailExcursion.detail || selectedDetailExcursion.description}
                  </p>
                </div>
              )}

              {/* Información Logística */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#082419] p-4 rounded-2xl border border-[#DFB15B]/30">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DFB15B] block">Duración</span>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Clock className="h-3.5 w-3.5 text-[#DFB15B]" />
                    <span>{selectedDetailExcursion.duration}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DFB15B] block">Punto de Salida</span>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <MapPin className="h-3.5 w-3.5 text-[#DFB15B]" />
                    <span className="truncate">{selectedDetailExcursion.departurePoint}</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DFB15B] block">Horario</span>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Calendar className="h-3.5 w-3.5 text-[#DFB15B]" />
                    <span>{selectedDetailExcursion.departureTime}</span>
                  </div>
                </div>
              </div>

              {/* Paradas y Atractivos */}
              {selectedDetailExcursion.stops && (
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#DFB15B] block">
                    Paradas y Recorrido Oficial:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDetailExcursion.stops.map((stop: string, sIdx: number) => (
                      <div key={sIdx} className="flex items-center gap-2 bg-[#082419] p-2.5 rounded-xl border border-[#DFB15B]/20">
                        <CheckCircle className="h-3.5 w-3.5 text-[#DFB15B] flex-shrink-0" />
                        <span className="text-xs font-medium text-white">{stop}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Qué incluye el servicio */}
              {selectedDetailExcursion.included && (
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#DFB15B] block">
                    Qué incluye la experiencia:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDetailExcursion.included.map((inc: string, iIdx: number) => (
                      <div key={iIdx} className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Precio y Acciones Finales */}
              <div className="pt-4 border-t border-[#DFB15B]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-[#EDE6D8]/80 font-bold block">Tarifa final por persona:</span>
                  <span className="text-3xl font-black text-white font-serif">
                    ${selectedDetailExcursion.price?.toLocaleString("es-AR")} <span className="text-xs font-bold text-[#F4D375]">ARS</span>
                  </span>
                  <span className="text-[10px] text-emerald-300 font-semibold block">Seña de congelamiento: ${(selectedDetailExcursion.price * 0.3)?.toLocaleString("es-AR")} ARS</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const ex = selectedDetailExcursion;
                      setSelectedDetailExcursion(null);
                      handleAskTravis(`Hola Travis! Deseo consultar detalles sobre la excursión ${ex.title}`);
                    }}
                    className="flex-1 sm:flex-none px-4 py-3 bg-[#082419] hover:bg-[#0c3525] border border-[#DFB15B]/50 text-[#F4D375] rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Consultar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const ex = selectedDetailExcursion;
                      setSelectedDetailExcursion(null);
                      handleOpenBooking(ex, "deposit");
                    }}
                    className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-[#DFB15B] via-[#F4D375] to-[#C59B3F] hover:from-[#FEE69A] hover:to-[#DFB15B] text-[#0A2E20] rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md shadow-[#DFB15B]/20 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Contratar</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LIGHTBOX MODAL DE FOTO DE LA GALERÍA
          ───────────────────────────────────────────────────────────── */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="relative max-w-4xl w-full bg-[#0B3324] rounded-3xl border-2 border-[#DFB15B] overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-[#0A2E20]/90 text-white hover:text-[#DFB15B] border border-[#DFB15B]/60 flex items-center justify-center transition shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-h-[70vh] overflow-hidden bg-black flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.caption}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-6 bg-[#082419] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-[#DFB15B] font-serif">
                  {previewImage.caption}
                </h3>
                {previewImage.location && (
                  <p className="text-xs text-[#EDE6D8]/80 font-bold flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-[#DFB15B]" />
                    <span>{previewImage.location}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-5 py-2.5 bg-[#0A2E20] hover:bg-[#0c3525] border border-[#DFB15B]/50 text-[#F4D375] rounded-xl text-xs font-black uppercase tracking-wider transition self-start sm:self-auto"
              >
                Cerrar Postal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
