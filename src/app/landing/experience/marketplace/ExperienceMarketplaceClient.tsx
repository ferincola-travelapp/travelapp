"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  MapPin,
  Award,
  Calendar,
  Users,
  Phone,
  ArrowLeft,
  Search,
  Filter,
  X,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Car,
  ShieldCheck,
  Tag,
  CreditCard,
  Send,
  ExternalLink,
  MessageCircle,
  Building2,
  Mountain,
  Percent,
  Loader2,
  Eye,
  Compass,
  Mail,
  SlidersHorizontal
} from "lucide-react";
import { collection, doc, onSnapshot, addDoc, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tour, calculateTimeToPayDeadline } from "@/types/experiences";
import { ExperienceHeader } from "@/components/experience/ExperienceHeader";
import { ExperienceFooter } from "@/components/experience/ExperienceFooter";
import { TravisOmnichannelWidget } from "@/components/shared/TravisOmnichannelWidget";

interface ExperienceMarketplaceClientProps {
  initialCms?: any;
}

const DEFAULT_HOTELS = [
  "Hotel Sheraton Tucumán",
  "Hotel Catalinas Park",
  "Hotel Hilton Garden Inn Tucumán",
  "Hotel Bicentenario Suites & Spa",
  "Hotel Amerian Tucumán Apart & Suites",
  "Hotel Grand Brizo San Miguel de Tucumán",
  "Hotel Carlos V",
  "Hotel Metropol",
  "Hotel Garden Park",
  "Hotel Alejandro I (Salta)",
  "Sheraton Salta Hotel",
  "Hotel Brizo Salta",
  "Design Suites Salta",
  "Patios de Cafayate Wine Hotel"
];

const DEFAULT_MARKETPLACE_TOURS: Tour[] = [
  {
    id: "EXP-NOA-001",
    title: "Cafayate & Quebrada de las Conchas",
    location: "Valles Calchaquíes, Salta / Tucumán",
    price: 98000,
    currency: "ARS",
    priceRewards: 84000,
    pointsEarned: 150,
    tripType: "Grupal",
    scope: "Nacional",
    tourismVertical: "receptivo",
    productType: "experiencia_dia",
    transportation: "Sprinter Ejecutiva VIP (TravelCab)",
    departureDate: "Salidas Diarias 07:30 hs",
    departureOrigin: "Pick-up por Hoteles Céntricos (Tucumán / Salta)",
    duration: "Día Completo (12 hs)",
    difficulty: "Baja",
    minPassengers: 2,
    services: [
      "Traslado Ida y Vuelta en Unidad Ejecutiva TravelCab",
      "Paradas fotográficas en Garganta del Diablo y El Anfiteatro",
      "Visita guiada y degustación en 2 Bodegas de Altura en Cafayate",
      "Guía profesional habilitado durante todo el recorrido"
    ],
    imageUrl: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1400&q=85",
    images: [
      "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1400&q=85"
    ],
    description: "Formaciones rojizas milenarias, el Anfiteatro natural y degustación exclusiva en bodegas de altura.",
    detail: "Recorremos la majestuosa Ruta Nacional 68 atravesando la Reserva Natural Quebrada de las Conchas. Visitamos Los Castillos, Las Ventanas, El Obelisco, La Yesera, El Anfiteatro y La Garganta del Diablo. Al llegar a Cafayate, disfrutamos de degustaciones de vinos Torrontés y Malbec de altura en bodegas boutique e históricas.",
    observations: "Llevar calzado cómodo, protector solar y abrigo liviano.",
    availability: "Disponible",
    cardTheme: "light-ice"
  },
  {
    id: "EXP-NOA-002",
    title: "Tafí del Valle & Ruinas de Quilmes",
    location: "Tucumán, Argentina",
    price: 85000,
    currency: "ARS",
    priceRewards: 72000,
    pointsEarned: 130,
    tripType: "Grupal",
    scope: "Nacional",
    tourismVertical: "receptivo",
    productType: "experiencia_dia",
    transportation: "Combi Ejecutiva / SUV TravelCab",
    departureDate: "Salidas Diarias 08:00 hs",
    departureOrigin: "San Miguel de Tucumán (Pick-up Hoteles)",
    duration: "Día Completo (10 hs)",
    difficulty: "Media",
    minPassengers: 2,
    services: [
      "Ascenso escénico por la Quebrada de los Sosa y El Indio",
      "Visita a Tafí del Valle, Dique La Angostura y El Mollar",
      "Recorrido guiado por la Ciudad Sagrada de Quilmes (Abra del Infiernillo 3.042 msnm)",
      "Asistencia permanente y coordinación TravelApp"
    ],
    imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1400&q=85",
    images: [
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85"
    ],
    description: "Ascenso por la selva de Yungas hasta el Abra del Infiernillo y la mística Ciudad Sagrada de Quilmes.",
    detail: "Iniciamos el ascenso por la RP 307 internándonos en la Quebrada del Río Los Sosa con paradas en el monumento al Indio y Parque Los Menhires. Visitamos la villa veraniega de Tafí del Valle, cruzamos el Abra del Infiernillo a 3.042 metros sobre el nivel del mar y descendemos hacia los Valles Calchaquíes para recorrer a pie la histórica Ciudad Sagrada de los Quilmes y su Centro de Interpretación.",
    observations: "No incluye entrada al Centro de Interpretación Quilmes.",
    availability: "Disponible",
    cardTheme: "light-sky"
  },
  {
    id: "EXP-NOA-003",
    title: "Salinas Grandes & Purmamarca 4x4",
    location: "Jujuy / Salta, Argentina",
    price: 125000,
    currency: "ARS",
    priceRewards: 108000,
    pointsEarned: 210,
    tripType: "Grupal",
    scope: "Nacional",
    tourismVertical: "receptivo",
    productType: "experiencia_dia",
    transportation: "Camioneta 4x4 / Minibús de Altura",
    departureDate: "Salidas Diarias 07:00 hs",
    departureOrigin: "Salta Capital / San Salvador de Jujuy",
    duration: "Día Completo (13 hs)",
    difficulty: "Media",
    minPassengers: 2,
    services: [
      "Recorrido por Purmamarca y Paseo de los Colorados",
      "Ascenso escénico por Cuesta de Lipán (4.170 msnm)",
      "Tiempo libre y sesión fotográfica en los piletones de Salinas Grandes",
      "Guía especializado en Puna y Quebrada"
    ],
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=85",
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=85"
    ],
    description: "El desierto blanco a más de 3.450 msnm y el Cerro de los Siete Colores en una travesía inolvidable.",
    detail: "Partimos temprano hacia el pueblo de Purmamarca para admirar el Cerro de los Siete Colores con la luz matinal y su feria artesanal. Luego ascendemos por la imponente Cuesta de Lipán (alcanzando los 4.170 msnm en el Abra de Potrerillos) hasta desembocar en la inmensidad blanca de las Salinas Grandes, donde visitamos los ojos de agua turquesa y las esculturas de sal.",
    observations: "Se recomienda hidratación constante y lentes de sol con filtro UV.",
    availability: "Cupos Limitados",
    cardTheme: "dark"
  },
  {
    id: "EXP-NOA-004",
    title: "Tren a las Nubes & San Antonio de los Cobres",
    location: "Puna Salteña, Salta",
    price: 145000,
    currency: "ARS",
    priceRewards: 128000,
    pointsEarned: 250,
    tripType: "Grupal",
    scope: "Nacional",
    tourismVertical: "receptivo",
    productType: "experiencia_dia",
    transportation: "Bus Turístico + Formación Ferroviaria",
    departureDate: "Martes, Jueves y Sábados 06:15 hs",
    departureOrigin: "Salta Capital (Pick-up Hoteles)",
    duration: "Día Completo (14 hs)",
    difficulty: "Alta",
    minPassengers: 1,
    services: [
      "Traslado en unidad climatizada por Quebrada del Toro y Santa Rosa de Tastil",
      "Desayuno campestre en Alfarcito y merienda regional",
      "Ticket oficial del Tren a las Nubes hasta el Viaducto La Polvorilla (4.220 msnm)",
      "Asistencia médica a bordo y oxígeno preventivo"
    ],
    imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=85",
    images: [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1400&q=85"
    ],
    description: "Ingeniería ferroviaria a 4.220 metros de altura cruzando el mítico Viaducto La Polvorilla.",
    detail: "Una de las obras de ingeniería ferroviaria más altas del mundo. Recorremos por ruta la Quebrada del Toro, el zigzagueo del Alisal y la Fundación Alfarcito del Padre Chifri. En San Antonio de los Cobres abordamos la mítica formación ferroviaria que nos lleva hasta el Viaducto La Polvorilla a 4.220 msnm, donde presenciamos el emocionante izamiento de la bandera.",
    observations: "Sujeto a condiciones climáticas de alta montaña.",
    availability: "Disponible",
    cardTheme: "dark"
  },
  {
    id: "EXP-NOA-005",
    title: "City Tour Histórico Tucumán & San Javier",
    location: "San Miguel de Tucumán & Yerba Buena",
    price: 52000,
    currency: "ARS",
    priceRewards: 44000,
    pointsEarned: 90,
    tripType: "Individual",
    scope: "Nacional",
    tourismVertical: "receptivo",
    productType: "experiencia_dia",
    transportation: "Sedán / SUV Ejecutiva TravelCab",
    departureDate: "Salidas Diarias 09:00 y 15:00 hs",
    departureOrigin: "Hoteles de San Miguel de Tucumán y Yerba Buena",
    duration: "Medio Día (5 hs)",
    difficulty: "Baja",
    minPassengers: 2,
    services: [
      "Recorrido por Plaza Independencia, Casa de Gobierno y Casa Histórica",
      "Paseo por Parque 9 de Julio y Ciudad Jardín de Yerba Buena",
      "Ascenso por las Yungas hasta el Cerro San Javier y Cristo Bendicente",
      "Traslado privado o regular en flota TravelCab"
    ],
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=85",
    images: [
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1400&q=85"
    ],
    description: "Cuna de la Independencia, templos históricos y vista panorámica desde la cumbre del Cerro San Javier.",
    detail: "Descubrimos el corazón histórico del Jardín de la República visitando los alrededores de la Plaza Independencia, la Catedral, la Casa de Gobierno de estilo Art Nouveau, el Museo de la Industria Azucarera en el Parque 9 de Julio y la emblemática Casa Histórica de la Independencia. Continuamos hacia Yerba Buena y ascendemos por el camino de yungas hasta el Cristo Bendicente en el Cerro San Javier.",
    observations: "Ideal para combinar con el espectáculo de Luz y Sonido por la noche.",
    availability: "Disponible",
    cardTheme: "light-ice"
  },
  {
    id: "EXP-NOA-006",
    title: "Ruta del Vino de Altura & Cachi Místico",
    location: "Cachi & Parque Nacional Los Cardones, Salta",
    price: 112000,
    currency: "ARS",
    priceRewards: 95000,
    pointsEarned: 180,
    tripType: "Grupal",
    scope: "Nacional",
    tourismVertical: "receptivo",
    productType: "experiencia_dia",
    transportation: "Van Ejecutiva Mercedes-Benz (TravelCab)",
    departureDate: "Salidas Diarias 07:30 hs",
    departureOrigin: "Salta Capital (Pick-up Hoteles)",
    duration: "Día Completo (11 hs)",
    difficulty: "Baja",
    minPassengers: 2,
    services: [
      "Ascenso por la Cuesta del Obispo y Piedra del Molino (3.348 msnm)",
      "Travesía por la Recta del Tin-Tin y Parque Nacional Los Cardones",
      "Visita al pueblo colonial de Cachi, Iglesia San José y Museo Arqueológico",
      "Degustación en bodega de altura calchaquí"
    ],
    imageUrl: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=85",
    images: [
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1400&q=85"
    ],
    description: "Cuesta del Obispo, Parque Nacional Los Cardones y el encanto colonial de Cachi entre viñedos.",
    detail: "Atravesamos la Quebrada de Escoipe y trepamos la zigzagueante Cuesta del Obispo hasta alcanzar la Piedra del Molino a 3.348 msnm. Cruzamos el Parque Nacional Los Cardones por la histórica Recta del Tin-Tin (trazada por los Incas) con vistas al Nevado de Cachi, para almorzar y recorrer las calles adoquinadas y bodegas de altura de Cachi.",
    observations: "Salidas garantizadas todos los días del año.",
    availability: "Disponible",
    cardTheme: "light-sky"
  }
];

export default function ExperienceMarketplaceClient({ initialCms }: ExperienceMarketplaceClientProps) {
  const [cmsData, setCmsData] = useState<any>(initialCms || {});
  const [tours, setTours] = useState<Tour[]>(DEFAULT_MARKETPLACE_TOURS);
  const [loadingTours, setLoadingTours] = useState(true);
  const [hotelsList, setHotelsList] = useState<string[]>(DEFAULT_HOTELS);

  useEffect(() => {
    const unsubCms = onSnapshot(
      doc(db, "cms", "landing_experience"),
      (snap) => {
        if (snap.exists()) {
          setCmsData((prev: any) => ({ ...prev, ...snap.data() }));
        }
      },
      () => {}
    );
    return () => unsubCms();
  }, []);

  // Tracking de Afiliados / Promotores
  const [affiliateRef, setAffiliateRef] = useState<string>("");

  // Filtros del Marketplace
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedDuration, setSelectedDuration] = useState<string>("all");
  const [priceSortOrder, setPriceSortOrder] = useState<"none" | "asc" | "desc">("none");

  // Índice de imagen activa por tarjeta para la galería
  const [activeImageIndex, setActiveImageIndex] = useState<Record<string, number>>({});

  // Modal de Ficha Técnica Completa ("Ver más")
  const [activeTourDetail, setActiveTourDetail] = useState<Tour | null>(null);

  // Modal de Consulta ("Consultar" -> Formulario de Contacto + Canales Oficiales)
  const [isConsultarModalOpen, setIsConsultarModalOpen] = useState(false);
  const [consultarTour, setConsultarTour] = useState<Tour | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  // Modal de Reserva y Compra con NAVE ("Reservar")
  const [bookingTour, setBookingTour] = useState<Tour | null>(null);
  const [paxCount, setPaxCount] = useState<number>(2);
  const [passengerNames, setPassengerNames] = useState<string[]>(["", ""]);
  const [passengerPhone, setPassengerPhone] = useState<string>("");
  const [passengerEmail, setPassengerEmail] = useState<string>("");
  const [selectedHotel, setSelectedHotel] = useState<string>(DEFAULT_HOTELS[0]);
  const [customOriginAddress, setCustomOriginAddress] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [discountCode, setDiscountCode] = useState<string>("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [discountMessage, setDiscountMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [firestoreCoupons, setFirestoreCoupons] = useState<Record<string, number>>({
    TRAVEL10: 10,
    TRAVIS10: 10,
    EXPERIENCE15: 15,
    BIENVENIDO: 10
  });
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{
    code: string;
    deadlineLabel: string;
    mode: "reserva" | "compra";
    checkoutUrl?: string;
  } | null>(null);

  // Capturar código de afiliado desde la URL (?ref=... o ?afiliado=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || params.get("afiliado") || params.get("promotor");
      if (ref) {
        setAffiliateRef(ref);
        localStorage.setItem("travelapp_affiliate_ref", ref);
      } else {
        const stored = localStorage.getItem("travelapp_affiliate_ref");
        if (stored) setAffiliateRef(stored);
      }

      // Capturar filtro inicial por URL si viene del buscador
      const qParam = params.get("q") || params.get("destino");
      if (qParam) setSearchQuery(qParam);
    }
  }, []);

  // Sincronización en tiempo real con el módulo Receptivo del Dashboard (colección 'experiences')
  useEffect(() => {
    const unsubExp = onSnapshot(
      query(collection(db, "experiences"), limit(40)),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Tour[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Tour;
            const isEmisivoOrInternational =
              docSnap.id.startsWith("OTA-PKG-") ||
              data.tourismVertical === "emisivo" ||
              data.scope === "Internacional" ||
              (data as any).region === "Internacional" ||
              ["operador_mayorista", "crucero", "salida_propia", "paquete_viaje"].includes(
                data.productType || ""
              );
            if (isEmisivoOrInternational) return;

            const fallback =
              DEFAULT_MARKETPLACE_TOURS.find((d) => d.id === docSnap.id) || DEFAULT_MARKETPLACE_TOURS[0];
            list.push({
              ...fallback,
              ...data,
              id: docSnap.id,
              duration: data.duration || fallback.duration || "Día Completo (10 hs)",
              difficulty: data.difficulty || fallback.difficulty || "Baja",
              minPassengers: data.minPassengers || fallback.minPassengers || 2,
              detail: data.detail || data.observations || fallback.detail || data.description,
              images:
                data.images && data.images.length > 0
                  ? data.images
                  : [data.imageUrl || fallback.imageUrl]
            });
          });
          if (list.length > 0) {
            setTours(list);
          } else {
            setTours(DEFAULT_MARKETPLACE_TOURS);
          }
        } else {
          setTours(DEFAULT_MARKETPLACE_TOURS);
        }
        setLoadingTours(false);
      },
      () => {
        setTours(DEFAULT_MARKETPLACE_TOURS);
        setLoadingTours(false);
      }
    );

    // Escuchar hoteles de pick-up configurados en el Dashboard
    const unsubHotels = onSnapshot(
      query(collection(db, "pickup_hotels"), limit(50)),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((d) => d.data().name).filter(Boolean);
          if (loaded.length > 0) {
            setHotelsList(loaded);
            setSelectedHotel(loaded[0]);
          }
        }
      },
      () => {}
    );

    // Escuchar cupones de descuento desde Firestore
    const unsubCoupons = onSnapshot(
      query(collection(db, "discount_codes"), limit(30)),
      (snapshot) => {
        if (!snapshot.empty) {
          const map: Record<string, number> = {
            TRAVEL10: 10,
            TRAVIS10: 10,
            EXPERIENCE15: 15,
            BIENVENIDO: 10
          };
          snapshot.docs.forEach((d) => {
            const data = d.data();
            if (data.code && data.discountPercent && data.active !== false) {
              map[String(data.code).toUpperCase().trim()] = Number(data.discountPercent);
            }
          });
          setFirestoreCoupons(map);
        }
      },
      () => {}
    );

    return () => {
      unsubExp();
      unsubHotels();
      unsubCoupons();
    };
  }, []);

  // Destinos únicos para filtro
  const uniqueDestinations = useMemo(() => {
    return Array.from(
      new Set(
        tours
          .map((t) => (t.location || "").split(",")[0].split("/")[0].trim())
          .filter(Boolean)
      )
    );
  }, [tours]);

  // Filtrado de Excursiones
  const filteredTours = useMemo(() => {
    let result = [...tours];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.location?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.detail?.toLowerCase().includes(q)
      );
    }

    if (selectedDestination !== "all") {
      result = result.filter((t) =>
        (t.location || "").toLowerCase().includes(selectedDestination.toLowerCase())
      );
    }

    if (selectedDifficulty !== "all") {
      result = result.filter(
        (t) => (t.difficulty || "Baja").toLowerCase() === selectedDifficulty.toLowerCase()
      );
    }

    if (selectedDuration !== "all") {
      if (selectedDuration === "medio_dia") {
        result = result.filter(
          (t) =>
            (t.duration || "").toLowerCase().includes("medio") ||
            (t.duration || "").toLowerCase().includes("5 hs") ||
            (t.duration || "").toLowerCase().includes("4 hs")
        );
      } else if (selectedDuration === "dia_completo") {
        result = result.filter(
          (t) =>
            (t.duration || "").toLowerCase().includes("completo") ||
            (t.duration || "").toLowerCase().includes("10 hs") ||
            (t.duration || "").toLowerCase().includes("12 hs") ||
            (t.duration || "").toLowerCase().includes("13 hs") ||
            (t.duration || "").toLowerCase().includes("14 hs")
        );
      }
    }

    if (priceSortOrder === "asc") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (priceSortOrder === "desc") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return result;
  }, [tours, searchQuery, selectedDestination, selectedDifficulty, selectedDuration, priceSortOrder]);

  const formatPrice = (value: number, currency: string = "ARS") => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "ARS",
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  // Ajustar cantidad de campos de Nombre y Apellido según cantidad de pasajeros
  const handlePaxCountChange = (newCount: number, minPax: number = 1) => {
    const safeCount = Math.max(minPax, Math.min(20, newCount));
    setPaxCount(safeCount);
    setPassengerNames((prev) => {
      const updated = [...prev];
      while (updated.length < safeCount) {
        updated.push("");
      }
      return updated.slice(0, safeCount);
    });
  };

  const handlePassengerNameChange = (idx: number, val: string) => {
    setPassengerNames((prev) => {
      const updated = [...prev];
      updated[idx] = val;
      return updated;
    });
  };

  // Abrir modal de Reserva / Compra
  const openBookingModal = (tour: Tour) => {
    const minPax = tour.minPassengers || 1;
    const initialPax = Math.max(minPax, 2);
    setBookingTour(tour);
    setPaxCount(initialPax);
    setPassengerNames(Array(initialPax).fill(""));
    setPassengerPhone("");
    setPassengerEmail("");
    setSelectedHotel(hotelsList[0] || DEFAULT_HOTELS[0]);
    setCustomOriginAddress("");
    const tomorrow = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];
    setBookingDate(tomorrow);
    setDiscountCode("");
    setAppliedDiscount(null);
    setDiscountMessage(null);
    setBookingSuccess(null);
  };

  // Abrir modal de Consulta ("Consultar")
  const openConsultarModal = (tour?: Tour) => {
    setConsultarTour(tour || null);
    setContactSent(false);
    if (tour) {
      setContactMessage(`Hola, quisiera consultar disponibilidad y detalles sobre la excursión "${tour.title}".`);
    } else {
      setContactMessage("");
    }
    setIsConsultarModalOpen(true);
  };

  // Validar código de descuento
  const handleApplyDiscount = () => {
    const clean = discountCode.trim().toUpperCase();
    if (!clean) {
      setDiscountMessage({ text: "Ingresá un código promocional.", type: "error" });
      return;
    }
    const pct = firestoreCoupons[clean];
    if (pct) {
      setAppliedDiscount({ code: clean, percent: pct });
      setDiscountMessage({ text: `¡Código ${clean} aplicado! ${pct}% de descuento.`, type: "success" });
    } else {
      setAppliedDiscount(null);
      setDiscountMessage({ text: "El código ingresado no es válido o ha expirado.", type: "error" });
    }
  };

  // Cálculos de tarifa en el modal de reserva
  const unitPrice = bookingTour?.price || 0;
  const subtotal = unitPrice * paxCount;
  const discountAmount = appliedDiscount ? Math.round(subtotal * (appliedDiscount.percent / 100)) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Procesar Reserva (Time-to-Pay) o Compra directa con NAVE
  const handleProcessAction = async (mode: "reserva" | "compra") => {
    if (!bookingTour || isSubmittingBooking) return;

    const filledNames = passengerNames.map((n) => n.trim()).filter(Boolean);
    if (filledNames.length < paxCount) {
      alert(`Por favor completá el Nombre y Apellido de los ${paxCount} pasajeros.`);
      return;
    }
    if (!passengerPhone.trim()) {
      alert("Por favor ingresá un número de Teléfono / WhatsApp de contacto.");
      return;
    }
    const originFinal =
      selectedHotel === "OTRO" ? customOriginAddress.trim() : selectedHotel;
    if (!originFinal) {
      alert("Por favor seleccioná un hotel o indicá la dirección de pick-up.");
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const ttl = calculateTimeToPayDeadline(bookingDate);
      const resCode = `EXP-${Math.floor(100000 + Math.random() * 900000)}`;
      const leadName = filledNames[0];

      const reservationPayload = {
        reservationCode: resCode,
        tourId: bookingTour.id,
        tourTitle: bookingTour.title,
        destination: bookingTour.location,
        productType: bookingTour.productType || "experiencia_dia",
        bookingMode: mode === "compra" ? "buy_nave" : "time_to_pay",
        nombrePasajero: leadName,
        passengerName: leadName,
        passengersList: filledNames,
        telefonoPasajero: passengerPhone.trim(),
        passengerPhone: passengerPhone.trim(),
        emailPasajero: passengerEmail.trim() || "reservas@travelapp.ar",
        cantidadPersonas: paxCount,
        quantity: paxCount,
        departureDate: bookingDate,
        pickupOrigin: originFinal,
        originType: selectedHotel === "OTRO" ? "direccion_personalizada" : "hotel",
        discountCode: appliedDiscount?.code || null,
        discountPercent: appliedDiscount?.percent || 0,
        discountAmount,
        estado: mode === "compra" ? "Pendiente_Pago_Nave" : "Reservada_TimeToPay",
        expiresAt: ttl.deadlineIso,
        timeToPayPolicy: ttl.label,
        financials: {
          currency: bookingTour.currency || "ARS",
          unitPrice,
          subtotal,
          discountAmount,
          totalPrice: finalTotal,
          paidAmount: 0,
          pendingAmount: finalTotal
        },
        affiliateRef: affiliateRef || null,
        createdAt: new Date().toISOString()
      };

      // 1. Guardar en experience_reservations (con fallback en servidor si las reglas bloquean escritura cliente)
      let createdResId = resCode;
      try {
        const resRef = await addDoc(collection(db, "experience_reservations"), reservationPayload);
        createdResId = resRef.id;
      } catch (fsErr) {
        console.warn("[Marketplace] Escritura cliente en experience_reservations delegada a API:", fsErr);
      }

      // 2. Sincronizar en contracted_trips (tolerante a permisos de visitante público)
      try {
        await addDoc(collection(db, "contracted_trips"), {
          reservationId: createdResId,
          reservationCode: resCode,
          tripTitle: bookingTour.title,
          destination: bookingTour.location,
          passengerName: leadName,
          passengersList: filledNames,
          passengerPhone: passengerPhone.trim(),
          departureDate: bookingDate,
          pickupOrigin: originFinal,
          status: mode === "compra" ? "En Proceso de Pago (NAVE)" : "Reservada",
          paxCount,
          payment: {
            totalAmount: finalTotal,
            paidAmount: 0,
            currency: bookingTour.currency || "ARS"
          },
          affiliateRef: affiliateRef || null,
          createdAt: new Date().toISOString()
        });
      } catch (ctErr) {
        console.warn("[Marketplace] Escritura en contracted_trips omitida para visitante público:", ctErr);
      }

      // 3. Si eligió "Comprar con NAVE", crear intención de pago y redirigir
      if (mode === "compra") {
        const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
        const naveRes = await fetch("/api/checkout/nave-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            externalPaymentId: resCode,
            amount: finalTotal,
            currency: bookingTour.currency || "ARS",
            productName: bookingTour.title,
            productDescription: `${bookingTour.title} · ${paxCount} pax · Origen: ${originFinal}`,
            buyer: {
              name: leadName,
              email: passengerEmail.trim() || "cliente@travelapp.ar",
              phone: passengerPhone.trim()
            },
            reservationId: createdResId !== resCode ? createdResId : undefined,
            reservationPayload: createdResId === resCode ? reservationPayload : undefined,
            callbackUrl: `${appOrigin}/checkout/success?file=${resCode}&type=experience&amount=${finalTotal}`
          })
        });

        const naveData = await naveRes.json().catch(() => ({}));
        if (naveRes.status === 429) {
          alert(naveData.error || "Demasiados intentos seguidos. Por favor aguardá unos segundos.");
          return;
        }

        if (naveRes.ok && naveData.checkoutUrl) {
          setBookingSuccess({
            code: resCode,
            deadlineLabel: ttl.label,
            mode: "compra",
            checkoutUrl: naveData.checkoutUrl
          });
          window.location.href = naveData.checkoutUrl;
          return;
        }
      }

      setBookingSuccess({
        code: resCode,
        deadlineLabel: ttl.label,
        mode
      });
    } catch (error) {
      console.error("Error procesando reserva/compra en Marketplace:", error);
      alert("Ocurrió un inconveniente al procesar tu solicitud. Por favor intentá nuevamente.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Enviar formulario del modal Consultar
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
  };

  const getDifficultyStyle = (diff?: string) => {
    const d = (diff || "Baja").toLowerCase();
    if (d.includes("alta")) {
      return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    }
    if (d.includes("media")) {
      return "bg-sky-500/15 text-sky-700 border-sky-500/30";
    }
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  };

  return (
    <div
      className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0071e3] selection:text-white flex flex-col"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
      }}
    >
      {/* 1. HEADER OFICIAL AZUL TECH (#0a2a5b) */}
      <ExperienceHeader
        onOpenContacto={() => openConsultarModal()}
      />

      {/* 2. HERO EDITORIAL DEL MARKETPLACE (ESTILO APPLE) */}
      <section className="bg-white border-b border-black/[0.06] pt-12 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1380px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3] mb-2.5">
                <Compass className="w-3.5 h-3.5" />
                <span>TravelApp Experience · Catálogo Oficial Receptivo</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.025em] text-[#1d1d1f] leading-[1.08]">
                Marketplace de Experiencias.
              </h1>
              <p className="mt-3 text-base sm:text-lg text-[#6e6e73] max-w-2xl font-normal leading-relaxed">
                Explorá todas nuestras excursiones verificadas con fichas técnicas completas, pick-up en tu hotel, reserva inmediata con Time-to-Pay y pago seguro con NAVE.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/landing/experience"
                className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] px-5 py-2.5 text-xs font-semibold transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver a Portada Experience
              </Link>
              <button
                type="button"
                onClick={() => openConsultarModal()}
                className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Atención Directa Travis
              </button>
            </div>
          </div>

          {/* 3. BARRA DE BÚSQUEDA Y FILTROS INTELIGENTES (APPLE GLASS BAR) */}
          <div className="mt-8 rounded-[24px] bg-[#f5f5f7] p-3 sm:p-4 border border-black/[0.05]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              {/* Buscador por texto */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 text-[#86868b] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar excursión, destino o atractivo..."
                  className="w-full rounded-2xl bg-white border border-black/[0.08] pl-10 pr-4 py-3 text-xs font-medium text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtro por Destino */}
              <div className="lg:col-span-2">
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="w-full rounded-2xl bg-white border border-black/[0.08] px-3.5 py-3 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-colors"
                >
                  <option value="all">Todos los Destinos</option>
                  {uniqueDestinations.map((dest) => (
                    <option key={dest} value={dest}>
                      {dest}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Duración */}
              <div className="lg:col-span-2">
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="w-full rounded-2xl bg-white border border-black/[0.08] px-3.5 py-3 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-colors"
                >
                  <option value="all">Cualquier Duración</option>
                  <option value="medio_dia">Medio Día (4 a 6 hs)</option>
                  <option value="dia_completo">Día Completo (9 a 14 hs)</option>
                </select>
              </div>

              {/* Filtro por Dificultad */}
              <div className="lg:col-span-2">
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full rounded-2xl bg-white border border-black/[0.08] px-3.5 py-3 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-colors"
                >
                  <option value="all">Todas las Dificultades</option>
                  <option value="Baja">Dificultad Baja</option>
                  <option value="Media">Dificultad Media</option>
                  <option value="Alta">Dificultad Alta</option>
                </select>
              </div>

              {/* Ordenar por Precio */}
              <div className="lg:col-span-2">
                <select
                  value={priceSortOrder}
                  onChange={(e) => setPriceSortOrder(e.target.value as "none" | "asc" | "desc")}
                  className="w-full rounded-2xl bg-white border border-black/[0.08] px-3.5 py-3 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-colors"
                >
                  <option value="none">Orden Destacado</option>
                  <option value="asc">Precio: Menor a Mayor</option>
                  <option value="desc">Precio: Mayor a Menor</option>
                </select>
              </div>
            </div>

            {/* Contador de resultados y limpieza */}
            <div className="mt-3 pt-2.5 border-t border-black/[0.05] flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#6e6e73]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>
                  Mostrando <strong className="text-[#1d1d1f]">{filteredTours.length}</strong> experiencias disponibles en tiempo real
                </span>
              </div>
              {(searchQuery ||
                selectedDestination !== "all" ||
                selectedDifficulty !== "all" ||
                selectedDuration !== "all" ||
                priceSortOrder !== "none") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDestination("all");
                    setSelectedDifficulty("all");
                    setSelectedDuration("all");
                    setPriceSortOrder("none");
                  }}
                  className="text-xs font-semibold text-[#0071e3] hover:underline"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. GRILLA PRINCIPAL DE TARJETAS DETALLADAS (ESTILO APPLE + FICHA RECEPTIVO) */}
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1380px] mx-auto">
          {loadingTours ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-[620px] rounded-[28px] bg-white border border-black/[0.06] p-6 animate-pulse flex flex-col justify-between"
                >
                  <div className="h-64 rounded-2xl bg-[#f5f5f7]" />
                  <div className="space-y-3">
                    <div className="h-6 w-2/3 bg-[#f5f5f7] rounded-lg" />
                    <div className="h-4 w-full bg-[#f5f5f7] rounded-lg" />
                    <div className="h-20 w-full bg-[#f5f5f7] rounded-xl" />
                  </div>
                  <div className="h-12 w-full bg-[#f5f5f7] rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredTours.length === 0 ? (
            <div className="rounded-[28px] bg-white border border-black/[0.06] p-14 text-center max-w-xl mx-auto my-8 shadow-xs">
              <Compass className="w-12 h-12 text-[#0071e3] mx-auto mb-3 opacity-80" />
              <h3 className="text-xl font-semibold text-[#1d1d1f]">
                No encontramos excursiones con esos filtros
              </h3>
              <p className="text-sm text-[#6e6e73] mt-2 leading-relaxed">
                Probá cambiar los criterios de búsqueda o consultanos directamente por salidas privadas a medida con Travis.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDestination("all");
                    setSelectedDifficulty("all");
                    setSelectedDuration("all");
                    setPriceSortOrder("none");
                  }}
                  className="rounded-full bg-[#0071e3] text-white px-6 py-2.5 text-xs font-semibold hover:bg-[#0077ed] transition-colors"
                >
                  Ver todas las excursiones
                </button>
                <button
                  type="button"
                  onClick={() => openConsultarModal()}
                  className="rounded-full border border-[#0071e3] text-[#0071e3] px-6 py-2.5 text-xs font-semibold hover:bg-[#0071e3]/5 transition-colors"
                >
                  Consultar a medida
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTours.map((tour, index) => {
                const isDark = tour.cardTheme === "dark" || index % 4 === 2 || index % 4 === 3;
                const isSky = !isDark && (tour.cardTheme === "light-sky" || index % 2 === 1);

                const bgClass = isDark
                  ? "bg-[#000000] text-white border-white/10"
                  : isSky
                  ? "bg-gradient-to-b from-[#eaf3fa] to-[#ffffff] text-[#1d1d1f] border-black/[0.06]"
                  : "bg-[#ffffff] text-[#1d1d1f] border-black/[0.06]";

                const gallery =
                  tour.images && tour.images.length > 0
                    ? tour.images
                    : [
                        tour.imageUrl ||
                          "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1400&q=85"
                      ];
                const currentImgIdx = activeImageIndex[tour.id] || 0;
                const currentImg = gallery[currentImgIdx % gallery.length];
                const minPax = tour.minPassengers || 2;
                const difficulty = tour.difficulty || "Baja";
                const duration = tour.duration || "Día Completo (10 hs)";
                const detailText = tour.detail || tour.observations || tour.description;

                return (
                  <article
                    key={tour.id}
                    className={`group relative overflow-hidden rounded-[28px] border shadow-xs hover:shadow-xl transition-all duration-500 flex flex-col justify-between ${bgClass}`}
                  >
                    {/* 1. GALERÍA DE IMÁGENES / VIDEO SUPERIOR */}
                    <div className="relative h-[280px] sm:h-[310px] w-full overflow-hidden">
                      {tour.mediaType === "video" && tour.videoUrl ? (
                        <video
                          src={tour.videoUrl}
                          poster={currentImg}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />
                      ) : (
                        <img
                          src={currentImg}
                          alt={tour.title}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />
                      )}

                      <div
                        className={`absolute inset-0 pointer-events-none ${
                          isDark
                            ? "bg-gradient-to-t from-black via-black/25 to-black/30"
                            : "bg-gradient-to-t from-black/55 via-transparent to-black/25"
                        }`}
                      />

                      {/* Controles de Galería si tiene múltiples fotos */}
                      {gallery.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveImageIndex((prev) => ({
                                ...prev,
                                [tour.id]: ((prev[tour.id] || 0) - 1 + gallery.length) % gallery.length
                              }))
                            }
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Foto anterior"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveImageIndex((prev) => ({
                                ...prev,
                                [tour.id]: ((prev[tour.id] || 0) + 1) % gallery.length
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Siguiente foto"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
                            {gallery.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                  setActiveImageIndex((prev) => ({ ...prev, [tour.id]: idx }))
                                }
                                className={`h-1.5 rounded-full transition-all ${
                                  idx === currentImgIdx % gallery.length
                                    ? "w-4 bg-white"
                                    : "w-1.5 bg-white/50"
                                }`}
                                aria-label={`Ver imagen ${idx + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Badges Superiores: Ubicación y Disponibilidad */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-[11px] font-semibold tracking-wide">
                          <MapPin className="w-3 h-3 text-[#2997ff]" />
                          {tour.location}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md ${
                            tour.availability === "Cupos Limitados"
                              ? "bg-amber-500/90 text-slate-950"
                              : "bg-emerald-500/90 text-white"
                          }`}
                        >
                          {tour.availability || "Disponible"}
                        </span>
                      </div>

                      {/* Botón rápido para abrir Galería y Ficha Técnica Completa */}
                      <button
                        type="button"
                        onClick={() => setActiveTourDetail(tour)}
                        className="absolute bottom-3 right-4 z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 hover:bg-white text-[#1d1d1f] text-[11px] font-semibold shadow-sm backdrop-blur-md transition-all"
                      >
                        <Eye className="w-3 h-3 text-[#0071e3]" />
                        Ficha técnica ({gallery.length} fotos)
                      </button>
                    </div>

                    {/* 2. CUERPO DETALLADO DE LA TARJETA */}
                    <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Título o Nombre */}
                        <h3
                          className={`text-2xl sm:text-[26px] font-semibold tracking-[-0.02em] leading-tight ${
                            isDark ? "text-white" : "text-[#1d1d1f]"
                          }`}
                        >
                          {tour.title}
                        </h3>

                        {/* Descripción */}
                        <p
                          className={`mt-2 text-sm sm:text-[15px] font-medium leading-relaxed ${
                            isDark ? "text-[#a1a1a6]" : "text-[#424245]"
                          }`}
                        >
                          {tour.description}
                        </p>

                        {/* Detalle del recorrido */}
                        {detailText && (
                          <div
                            className={`mt-3 rounded-2xl p-3.5 text-xs leading-relaxed border ${
                              isDark
                                ? "bg-white/[0.05] border-white/10 text-white/80"
                                : "bg-[#f5f5f7]/90 border-black/[0.06] text-[#6e6e73]"
                            }`}
                          >
                            <span
                              className={`font-semibold block mb-0.5 ${
                                isDark ? "text-white" : "text-[#1d1d1f]"
                              }`}
                            >
                              Detalle de la experiencia:
                            </span>
                            <p className="line-clamp-3">{detailText}</p>
                          </div>
                        )}

                        {/* Píldoras de Ficha Técnica: Duración, Dificultad, Cantidad mínima de pasajeros */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                              isDark
                                ? "bg-white/10 border-white/15 text-white"
                                : "bg-white border-black/10 text-[#1d1d1f]"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 text-[#0071e3]" />
                            <span>
                              Duración: <strong>{duration}</strong>
                            </span>
                          </span>

                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                              isDark
                                ? "bg-white/10 border-white/15 text-white"
                                : getDifficultyStyle(difficulty)
                            }`}
                          >
                            <Mountain className="w-3.5 h-3.5" />
                            <span>Dificultad: {difficulty}</span>
                          </span>

                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                              isDark
                                ? "bg-white/10 border-white/15 text-white"
                                : "bg-white border-black/10 text-[#1d1d1f]"
                            }`}
                          >
                            <Users className="w-3.5 h-3.5 text-[#0071e3]" />
                            <span>
                              Mín. <strong>{minPax}</strong> {minPax === 1 ? "pasajero" : "pasajeros"}
                            </span>
                          </span>
                        </div>

                        {/* Unidad de Transporte & Origen de Pick-up */}
                        <div
                          className={`mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-2xl p-3 text-xs border ${
                            isDark
                              ? "bg-white/[0.04] border-white/10 text-white/85"
                              : "bg-white border-black/[0.06] text-[#424245]"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Car className="w-4 h-4 text-[#0071e3] shrink-0" />
                            <div className="truncate">
                              <span className="block text-[10px] uppercase tracking-wider opacity-60 font-semibold">
                                Transporte / Unidad
                              </span>
                              <span className="font-semibold truncate">
                                {tour.transportation || "Unidad Ejecutiva TravelCab"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-[#0071e3] shrink-0" />
                            <div className="truncate">
                              <span className="block text-[10px] uppercase tracking-wider opacity-60 font-semibold">
                                Origen / Pick-up
                              </span>
                              <span className="font-semibold truncate">
                                {tour.departureOrigin || "Pick-up por Hoteles Céntricos"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Servicios Incluidos Destacados */}
                        {tour.services && tour.services.length > 0 && (
                          <div className="mt-4">
                            <span
                              className={`block text-[11px] font-semibold uppercase tracking-wider mb-2 ${
                                isDark ? "text-white/60" : "text-[#86868b]"
                              }`}
                            >
                              Incluye en la tarifa:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {tour.services.slice(0, 4).map((srv, i) => (
                                <div
                                  key={i}
                                  className={`flex items-start gap-1.5 text-xs ${
                                    isDark ? "text-white/85" : "text-[#424245]"
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="line-clamp-1">{srv}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. PRECIO DESDE + REWARDS + BOTONES CONSULTAR Y RESERVAR */}
                      <div
                        className={`mt-6 pt-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isDark ? "border-white/15" : "border-black/10"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] uppercase tracking-wider font-semibold ${
                                isDark ? "text-[#86868b]" : "text-[#6e6e73]"
                              }`}
                            >
                              Precio desde:
                            </span>
                            {tour.pointsEarned && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 px-2 py-0.5 text-[10px] font-bold">
                                <Award className="w-3 h-3" /> +{tour.pointsEarned} pts
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                              isDark ? "text-white" : "text-[#1d1d1f]"
                            }`}
                          >
                            {formatPrice(tour.price, tour.currency)}{" "}
                            <span className="text-xs font-normal opacity-75">
                              {tour.currency || "ARS"} / pax
                            </span>
                          </div>
                          {tour.priceRewards && (
                            <span className="text-[11px] font-semibold text-[#0071e3] block mt-0.5">
                              Socio Club TravelApp: {formatPrice(tour.priceRewards, tour.currency)}
                            </span>
                          )}
                        </div>

                        {/* Botones Consultar y Reservar */}
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => openConsultarModal(tour)}
                            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                              isDark
                                ? "border-[#2997ff] text-[#2997ff] hover:bg-[#2997ff] hover:text-white"
                                : "border-[#0071e3] text-[#0071e3] hover:bg-[#0071e3] hover:text-white"
                            }`}
                          >
                            Consultar
                          </button>

                          <button
                            type="button"
                            onClick={() => openBookingModal(tour)}
                            className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-xs transition-all cursor-pointer"
                          >
                            Reservar
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 5. MODAL DE FICHA TÉCNICA COMPLETA ("Ver ficha técnica") */}
      {activeTourDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0071e3] block mb-1">
                  {activeTourDetail.location}
                </span>
                <h3 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
                  {activeTourDetail.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTourDetail(null)}
                className="w-9 h-9 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] flex items-center justify-center text-[#1d1d1f]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Galería en el modal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
              {(activeTourDetail.images && activeTourDetail.images.length > 0
                ? activeTourDetail.images
                : [activeTourDetail.imageUrl]
              ).map((img, i) => (
                <div
                  key={i}
                  className={`rounded-2xl overflow-hidden bg-[#f5f5f7] ${
                    i === 0 ? "sm:col-span-2 h-52" : "h-52"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${activeTourDetail.title} - foto ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-1">
                  Descripción General
                </h4>
                <p className="text-sm text-[#1d1d1f] leading-relaxed">
                  {activeTourDetail.description}
                </p>
              </div>

              {(activeTourDetail.detail || activeTourDetail.observations) && (
                <div className="rounded-2xl bg-[#f5f5f7] p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] mb-1.5">
                    Detalle del Itinerario y Recorrido
                  </h4>
                  <p className="text-xs sm:text-sm text-[#424245] leading-relaxed">
                    {activeTourDetail.detail || activeTourDetail.observations}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-2xl bg-[#f5f5f7] p-3">
                  <span className="block text-[10px] font-bold uppercase text-[#86868b]">
                    Duración
                  </span>
                  <span className="text-xs font-semibold text-[#1d1d1f]">
                    {activeTourDetail.duration || "Día Completo"}
                  </span>
                </div>
                <div className="rounded-2xl bg-[#f5f5f7] p-3">
                  <span className="block text-[10px] font-bold uppercase text-[#86868b]">
                    Dificultad
                  </span>
                  <span className="text-xs font-semibold text-[#1d1d1f]">
                    {activeTourDetail.difficulty || "Baja"}
                  </span>
                </div>
                <div className="rounded-2xl bg-[#f5f5f7] p-3">
                  <span className="block text-[10px] font-bold uppercase text-[#86868b]">
                    Mín. Pasajeros
                  </span>
                  <span className="text-xs font-semibold text-[#1d1d1f]">
                    {activeTourDetail.minPassengers || 2} pasajeros
                  </span>
                </div>
                <div className="rounded-2xl bg-[#f5f5f7] p-3">
                  <span className="block text-[10px] font-bold uppercase text-[#86868b]">
                    Salidas
                  </span>
                  <span className="text-xs font-semibold text-[#1d1d1f]">
                    {activeTourDetail.departureDate || "Salidas Diarias"}
                  </span>
                </div>
              </div>

              {activeTourDetail.services && activeTourDetail.services.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-2">
                    Servicios Incluidos
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeTourDetail.services.map((srv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 py-2 text-xs font-medium text-[#1d1d1f]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{srv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-black/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#6e6e73] block">
                  Precio desde
                </span>
                <span className="text-2xl font-bold text-[#1d1d1f]">
                  {formatPrice(activeTourDetail.price, activeTourDetail.currency)}{" "}
                  <span className="text-xs font-normal text-[#6e6e73]">
                    {activeTourDetail.currency || "ARS"}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const t = activeTourDetail;
                    setActiveTourDetail(null);
                    openConsultarModal(t);
                  }}
                  className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-[#0071e3] text-[#0071e3] hover:bg-[#0071e3] hover:text-white transition-all"
                >
                  Consultar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = activeTourDetail;
                    setActiveTourDetail(null);
                    openBookingModal(t);
                  }}
                  className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white transition-all"
                >
                  Reservar Ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DEL BOTÓN "CONSULTAR" (FORMULARIO DE CONTACTO + CANALES OFICIALES TRAVIS) */}
      {isConsultarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[28px] max-w-xl w-full p-7 sm:p-9 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0071e3] block mb-1">
                  Canales Oficiales & Formulario de Consulta
                </span>
                <h3 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
                  {consultarTour?.title ? `Consultar: ${consultarTour.title}` : "Contacto TravelApp Experience"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConsultarModalOpen(false)}
                className="w-9 h-9 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] flex items-center justify-center text-[#1d1d1f]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario de Consulta Directa */}
            {contactSent ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-emerald-950">
                  ¡Consulta enviada con éxito!
                </h4>
                <p className="text-xs text-emerald-800 mt-1">
                  Nuestro equipo receptivo y Travis te responderán a la brevedad. También podés iniciar chat directo en un clic aquí abajo:
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase mb-1">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full rounded-xl border border-black/15 bg-[#f5f5f7]/60 px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+54 9 381 ..."
                      className="w-full rounded-xl border border-black/15 bg-[#f5f5f7]/60 px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full rounded-xl border border-black/15 bg-[#f5f5f7]/60 px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase mb-1">
                    Tu Consulta
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Escribí tu consulta sobre fechas, salidas grupales o traslados..."
                    className="w-full rounded-xl border border-black/15 bg-[#f5f5f7]/60 p-3.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold py-3 text-sm shadow-sm transition-all cursor-pointer"
                >
                  Enviar Consulta Ahora
                </button>
              </form>
            )}

            {/* Canales Oficiales Directos */}
            <div className="pt-4 border-t border-black/10">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-3">
                O comunicate directo por nuestros canales oficiales:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={`https://wa.me/5493812000712?text=${encodeURIComponent(
                    consultarTour?.title
                      ? `Hola Travis! Quiero consultar por la excursión: ${consultarTour.title}`
                      : "Hola Travis! Quiero hacer una consulta sobre TravelApp Experience."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] hover:bg-[#25D366]/10 border border-transparent hover:border-[#25D366]/30 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] block">
                      WhatsApp Oficial Travis
                    </span>
                    <span className="text-xs font-bold text-[#1d1d1f]">+54 9 381 200-0712</span>
                  </div>
                </a>

                <a
                  href="tel:08102200018"
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] hover:bg-[#0071e3]/10 border border-transparent hover:border-[#0071e3]/30 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#0a2a5b] text-white flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] block">
                      Centro de Atención
                    </span>
                    <span className="text-xs font-bold text-[#1d1d1f]">0810-220-0018</span>
                  </div>
                </a>

                <a
                  href="https://m.me/travelapp.ar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] hover:bg-[#0084FF]/10 border border-transparent hover:border-[#0084FF]/30 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#0084FF] text-white flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] block">
                      Messenger Oficial
                    </span>
                    <span className="text-xs font-bold text-[#1d1d1f]">@travelapp.ar</span>
                  </div>
                </a>

                <a
                  href="https://ig.me/m/travelapp.ar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] hover:bg-pink-500/10 border border-transparent hover:border-pink-500/30 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] block">
                      Instagram DM
                    </span>
                    <span className="text-xs font-bold text-[#1d1d1f]">@travelapp.ar</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DEL BOTÓN "RESERVAR" (PASAJEROS DINÁMICOS, HOTELES + OTRO, CÓDIGO DESCUENTO, RESERVAR Y COMPRAR CON NAVE) */}
      {bookingTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0071e3] block mb-1">
                  Reserva & Checkout Oficial TravelApp Experience
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] tracking-tight">
                  {bookingTour.title}
                </h3>
                <p className="text-xs text-[#6e6e73] mt-0.5">
                  {bookingTour.duration || "Día Completo"} · Dificultad {bookingTour.difficulty || "Baja"} · Mín.{" "}
                  {bookingTour.minPassengers || 1} pax
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingTour(null)}
                className="w-9 h-9 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] flex items-center justify-center text-[#1d1d1f] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="space-y-5 py-3">
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <div className="flex items-center gap-2 font-bold text-base mb-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>
                      {bookingSuccess.mode === "compra"
                        ? "¡Orden de Compra Generada!"
                        : "¡Reserva Confirmada con Time-to-Pay!"}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Código de Expediente: <strong className="font-mono">{bookingSuccess.code}</strong>
                  </p>
                  <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center gap-2 text-xs font-semibold text-emerald-900">
                    <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Tiempo límite de pago garantizado: {bookingSuccess.deadlineLabel}</span>
                  </div>
                </div>

                {bookingSuccess.checkoutUrl && (
                  <a
                    href={bookingSuccess.checkoutUrl}
                    className="w-full py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    Ir a Pagar con NAVE Ahora
                  </a>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <a
                    href={`https://wa.me/5493812000712?text=${encodeURIComponent(
                      `Hola Travis! Acabo de generar mi reserva ${bookingSuccess.code} para la excursión "${bookingTour.title}" (${paxCount} pasajeros).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-full bg-[#25D366] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar Voucher por WhatsApp a Travis
                  </a>
                  <button
                    type="button"
                    onClick={() => setBookingTour(null)}
                    className="px-6 py-3 rounded-full bg-[#f5f5f7] text-[#1d1d1f] font-semibold text-xs sm:text-sm hover:bg-[#e8e8ed]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Cantidad de Pasajeros + Fecha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-1.5">
                      Cantidad de Pasajeros (Mín. {bookingTour.minPassengers || 1})
                    </label>
                    <div className="flex items-center justify-between rounded-xl border border-black/15 bg-[#f5f5f7]/60 px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => handlePaxCountChange(paxCount - 1, bookingTour.minPassengers || 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-black/10 font-bold text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-[#1d1d1f]">
                        {paxCount} {paxCount === 1 ? "Pasajero" : "Pasajeros"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePaxCountChange(paxCount + 1, bookingTour.minPassengers || 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-black/10 font-bold text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-1.5">
                      Fecha de Excursión
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full rounded-xl border border-black/15 bg-[#f5f5f7]/60 px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white outline-none"
                    />
                  </div>
                </div>

                {/* 2. Nombre y Apellido dinámicos según la cantidad de pasajeros seleccionados */}
                <div className="rounded-2xl bg-[#f5f5f7] p-4 space-y-2.5 border border-black/[0.06]">
                  <label className="block text-[11px] font-semibold text-[#1d1d1f] uppercase tracking-wider">
                    Nombre y Apellido de los Pasajeros ({paxCount})
                  </label>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {passengerNames.map((nameVal, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-[11px] font-semibold text-[#6e6e73]">
                          Pasajero {idx + 1} {idx === 0 ? "(Titular)" : ""}
                        </span>
                        <input
                          type="text"
                          required
                          value={nameVal}
                          onChange={(e) => handlePassengerNameChange(idx, e.target.value)}
                          placeholder={`Nombre y Apellido del Pasajero ${idx + 1}`}
                          className="flex-1 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs sm:text-sm text-[#1d1d1f] focus:border-[#0071e3] outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Teléfono / WhatsApp y Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      placeholder="+54 9 381 ..."
                      className="w-full rounded-xl border border-black/15 bg-[#f5f5f7]/60 px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-1">
                      Email (Para envío de Voucher)
                    </label>
                    <input
                      type="email"
                      value={passengerEmail}
                      onChange={(e) => setPassengerEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full rounded-xl border border-black/15 bg-[#f5f5f7]/60 px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white outline-none"
                    />
                  </div>
                </div>

                {/* 4. Origen: Desplegable de Hoteles + Opción "Otro (Colocar dirección)" */}
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#0071e3]" />
                      Origen / Punto de Pick-up
                    </label>
                    <select
                      value={selectedHotel}
                      onChange={(e) => setSelectedHotel(e.target.value)}
                      className="w-full rounded-xl border border-black/15 bg-[#f5f5f7]/60 px-3.5 py-2.5 text-sm font-medium text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white outline-none"
                    >
                      {hotelsList.map((hotelName) => (
                        <option key={hotelName} value={hotelName}>
                          {hotelName}
                        </option>
                      ))}
                      <option value="OTRO">Otro (Colocar dirección manualmente)</option>
                    </select>
                  </div>

                  {selectedHotel === "OTRO" && (
                    <div className="animate-in fade-in duration-150">
                      <label className="block text-[11px] font-semibold text-[#0071e3] uppercase tracking-wider mb-1">
                        Dirección exacta de retiro (Calle, Número y Localidad) *
                      </label>
                      <input
                        type="text"
                        required
                        value={customOriginAddress}
                        onChange={(e) => setCustomOriginAddress(e.target.value)}
                        placeholder="Ej: Av. Aconquija 1250, Yerba Buena / San Lorenzo 450, Centro"
                        className="w-full rounded-xl border border-[#0071e3] bg-white px-3.5 py-2.5 text-sm text-[#1d1d1f] outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* 5. Código de Descuento */}
                <div className="rounded-2xl bg-[#f5f5f7] p-3.5 border border-black/[0.06]">
                  <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#0071e3]" />
                    Código de Descuento (Para compra online)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Ej: TRAVEL10"
                      className="flex-1 rounded-xl border border-black/15 bg-white px-3.5 py-2 text-xs sm:text-sm font-mono uppercase text-[#1d1d1f] focus:border-[#0071e3] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </div>
                  {discountMessage && (
                    <p
                      className={`text-xs mt-1.5 font-medium ${
                        discountMessage.type === "success" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {discountMessage.text}
                    </p>
                  )}
                </div>

                {/* 6. Resumen de Tarifa + Time-to-Pay */}
                <div className="rounded-2xl bg-[#0a2a5b]/[0.04] border border-[#0a2a5b]/15 p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#6e6e73]">
                    <span>
                      Tarifa ({paxCount} {paxCount === 1 ? "pasajero" : "pasajeros"} ×{" "}
                      {formatPrice(unitPrice, bookingTour.currency)})
                    </span>
                    <span className="font-semibold text-[#1d1d1f]">
                      {formatPrice(subtotal, bookingTour.currency)}
                    </span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" /> Descuento ({appliedDiscount.code} -{" "}
                        {appliedDiscount.percent}%)
                      </span>
                      <span>-{formatPrice(discountAmount, bookingTour.currency)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-black/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f]">
                      Total a Pagar
                    </span>
                    <span className="text-xl font-bold text-[#0a2a5b]">
                      {formatPrice(finalTotal, bookingTour.currency)}{" "}
                      <span className="text-xs font-normal">{bookingTour.currency || "ARS"}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#0071e3] pt-1 font-medium">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Política Time-to-Pay activa:{" "}
                      {calculateTimeToPayDeadline(bookingDate).label}
                    </span>
                  </div>
                </div>

                {/* 7. Botones de Acción: RESERVAR vs COMPRAR (Enlazado con NAVE) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSubmittingBooking}
                    onClick={() => handleProcessAction("reserva")}
                    className="w-full py-3.5 rounded-full border-2 border-[#0071e3] text-[#0071e3] hover:bg-[#0071e3]/5 font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingBooking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    <span>Reservar (Time-to-Pay)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingBooking}
                    onClick={() => handleProcessAction("compra")}
                    className="w-full py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingBooking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>Comprar con NAVE</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. FOOTER OFICIAL AZUL TECH (#0a2a5b) */}
      <ExperienceFooter
        onOpenContacto={() => openConsultarModal()}
      />

      {/* 9. WIDGET FLOTANTE OMNICANAL TRAVIS */}
      <TravisOmnichannelWidget
        businessUnit="Experiences"
        whatsappUrl={`https://wa.me/${String(cmsData.travisWhatsapp || "5493812000712").replace(/\D/g, "")}`}
      />
    </div>
  );
}
