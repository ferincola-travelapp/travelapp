"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  limit,
} from "firebase/firestore";
import {
  calculateTimeToPayDeadline,
  getTimeRemainingInfo,
} from "@/types/experiences";
import { ExcursionSearchFilters } from "./ExperienceSearchEngine";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Tag,
  CreditCard,
  CalendarClock,
  Users,
  MapPin,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export interface ExperienceItem {
  id: string;
  title: string;
  region: string;
  category: string;
  description: string;
  detail: string;
  duration: string;
  difficulty: "Baja" | "Media" | "Alta" | string;
  minPassengers: number;
  price: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  images?: string[];
  videoUrl?: string;
  mediaType?: "image" | "video";
  cardTheme?: "dark" | "light-ice" | "light-sky";
  badge?: string;
  includes: string[];
  itinerary?: string[];
}

const DEFAULT_HOTELS: string[] = [
  "Sheraton Tucumán Hotel (San Miguel de Tucumán)",
  "Hotel Catalinas Park (San Miguel de Tucumán)",
  "Hilton Garden Inn Tucumán (San Miguel de Tucumán)",
  "Hotel Bicentenario Suites & Spa (San Miguel de Tucumán)",
  "Grand Hotel Tucumán (San Miguel de Tucumán)",
  "Alejandro I Hotel (Salta Capital)",
  "Sheraton Salta Hotel (Salta Capital)",
  "Design Suites Salta (Salta Capital)",
  "Legado Mítico Salta (Salta Capital)",
  "Patios de Cafayate Wine Hotel (Cafayate)",
  "Grace Cafayate (Cafayate)",
  "El Manantial del Silencio (Purmamarca)",
  "Hotel Huacalera (Quebrada de Humahuaca)",
  "Las Marías Hotel Boutique (Tilcara)",
  "Estancia Las Carreras (Tafí del Valle)",
  "Hotel Colonial (Tafí del Valle)",
];

const BUILTIN_DISCOUNT_CODES: Record<
  string,
  { percent: number; label: string }
> = {
  TRAVEL10: { percent: 10, label: "10% OFF Comunidad TravelApp" },
  TRAVIS10: { percent: 10, label: "10% OFF Beneficio Travis" },
  EXPERIENCE15: { percent: 15, label: "15% OFF Lanzamiento Experience" },
  BIENVENIDO: { percent: 10, label: "10% OFF Primera Reserva" },
};

const DEFAULT_EXPERIENCES: ExperienceItem[] = [
  {
    id: "exp-salinas-purmamarca",
    title: "Salinas Grandes",
    region: "Salta & Jujuy",
    category: "Alta Montaña",
    description:
      "Descubre la inmensidad blanca y el Cerro de los 7 Colores.",
    detail:
      "Purmamarca, Paseo de los Colorados, Cuesta de Lipán (4.170 msnm) y desierto de sal con guía matriculado.",
    duration: "Día Completo (12 hs)",
    difficulty: "Baja",
    minPassengers: 2,
    price: 98000,
    currency: "ARS",
    rating: 4.9,
    reviewsCount: 342,
    cardTheme: "dark",
    imageUrl:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1800&q=90",
    images: [
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1800&q=90",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1800&q=90",
    ],
    includes: [
      "Pick-up por hotel",
      "Guía bilingüe matriculado",
      "Seguro de pasajero en tránsito",
    ],
  },
  {
    id: "exp-cafayate-bodegas",
    title: "Bodegas de Cafayate",
    region: "Salta",
    category: "Enoturismo",
    description:
      "Descubre la magia de la Quebrada de las Conchas y vinos de altura.",
    detail:
      "Garganta del Diablo, El Anfiteatro, visita y degustación en 2 bodegas boutique de los Valles Calchaquíes.",
    duration: "Día Completo (11 hs)",
    difficulty: "Baja",
    minPassengers: 2,
    price: 85000,
    currency: "ARS",
    rating: 4.9,
    reviewsCount: 289,
    cardTheme: "dark",
    imageUrl:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1800&q=90",
    images: [
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1800&q=90",
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1800&q=90",
    ],
    includes: [
      "Degustación en 2 bodegas",
      "Guía especializado",
      "Traslado ejecutivo",
    ],
  },
  {
    id: "exp-tafi-quilmes",
    title: "Tafí del Valle y Quilmes",
    region: "Tucumán",
    category: "Cultura & Arqueología",
    description:
      "Selva de yungas, valles de altura y la Ciudad Sagrada de Quilmes.",
    detail:
      "Quebrada de los Sosa, El Indio, Tafí del Valle, Abra del Infiernillo (3.042 msnm) y sitio arqueológico Quilmes.",
    duration: "Día Completo (10 hs)",
    difficulty: "Baja",
    minPassengers: 2,
    price: 79000,
    currency: "ARS",
    rating: 4.8,
    reviewsCount: 412,
    cardTheme: "light-ice",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=90",
    images: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=90",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=90",
    ],
    includes: [
      "Ingreso a Ciudad Sagrada de Quilmes",
      "Guía oficial",
      "Pick-up en hotel",
    ],
  },
  {
    id: "exp-humahuaca-hornocal",
    title: "Hornocal 14 Colores",
    region: "Jujuy",
    category: "Patrimonio UNESCO",
    description:
      "Expedición panorámica a 4.350 metros en la Quebrada de Humahuaca.",
    detail:
      "Tilcara, Trópico de Capricornio, Iglesia de Uquía, Humahuaca y ascenso 4x4 al Mirador del Hornocal.",
    duration: "Día Completo (12 hs)",
    difficulty: "Media",
    minPassengers: 2,
    price: 105000,
    currency: "ARS",
    rating: 5.0,
    reviewsCount: 518,
    cardTheme: "light-sky",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1800&q=90",
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1800&q=90",
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1800&q=90",
    ],
    includes: [
      "Ascenso 4x4 al Mirador del Hornocal",
      "Visita a Tilcara y Uquía",
      "Seguro de altura",
    ],
  },
  {
    id: "exp-cachi-cardones",
    title: "Cachi y Los Cardones",
    region: "Salta",
    category: "Naturaleza & Paisajes",
    description:
      "Cuesta del Obispo, Recta del Tin-Tin y pueblo histórico de Cachi.",
    detail:
      "Quebrada de Escoipe, Piedra del Molino (3.348 msnm), Parque Nacional Los Cardones y casco histórico colonial.",
    duration: "Día Completo (10 hs)",
    difficulty: "Baja",
    minPassengers: 2,
    price: 84000,
    currency: "ARS",
    rating: 4.9,
    reviewsCount: 195,
    cardTheme: "dark",
    imageUrl:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1800&q=90",
    images: [
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1800&q=90",
    ],
    includes: [
      "Cuesta del Obispo y Piedra del Molino",
      "Parque Nacional Los Cardones",
      "Guía matriculado",
    ],
  },
  {
    id: "exp-campo-piedra-pomez",
    title: "Piedra Pómez 4x4",
    region: "Catamarca",
    category: "Expedición 4x4",
    description:
      "Travesía exclusiva por el laberinto volcánico de la Puna.",
    detail:
      "Expedición en camionetas 4x4 por El Peñón, Campo de Piedra Pómez, dunas blancas y Laguna Carachi Pampa.",
    duration: "Día Completo (11 hs)",
    difficulty: "Alta",
    minPassengers: 3,
    price: 165000,
    currency: "ARS",
    rating: 5.0,
    reviewsCount: 124,
    cardTheme: "light-ice",
    imageUrl:
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1800&q=90",
    images: [
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1800&q=90",
    ],
    includes: [
      "Camioneta 4x4 equipada",
      "Guía experto en Puna",
      "Permisos de reserva natural",
    ],
  },
];

function isVideoItem(item: ExperienceItem): boolean {
  if (item.mediaType === "video" || Boolean(item.videoUrl)) return true;
  return Boolean(item.imageUrl?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i));
}

function resolveCardTheme(
  exp: ExperienceItem,
  index: number
): "dark" | "light-ice" | "light-sky" {
  if (exp.cardTheme) return exp.cardTheme;
  const row = Math.floor(index / 2);
  if (row % 2 === 0) return "dark";
  return index % 2 === 0 ? "light-ice" : "light-sky";
}

interface ExperienceCatalogCarouselProps {
  filters?: ExcursionSearchFilters;
  onOpenConsultar?: (experienceTitle?: string) => void;
}

export function ExperienceCatalogCarousel({
  filters,
  onOpenConsultar,
}: ExperienceCatalogCarouselProps) {
  const [experiences, setExperiences] =
    useState<ExperienceItem[]>(DEFAULT_EXPERIENCES);
  const [hotelsList, setHotelsList] = useState<string[]>(DEFAULT_HOTELS);
  const [firestoreDiscounts, setFirestoreDiscounts] = useState<
    Record<string, { percent: number; label: string }>
  >({});

  // Índice de imagen activa por tarjeta cuando tiene múltiples imágenes
  const [activeImageByCard, setActiveImageByCard] = useState<
    Record<string, number>
  >({});

  // Modal "Reservar / Comprar"
  const [bookingExp, setBookingExp] = useState<ExperienceItem | null>(null);
  const [paxCount, setPaxCount] = useState<number>(2);
  const [passengerNames, setPassengerNames] = useState<string[]>(["", ""]);
  const [passengerPhone, setPassengerPhone] = useState("");
  const [selectedHotel, setSelectedHotel] = useState("");
  const [customOriginAddress, setCustomOriginAddress] = useState("");
  const [bookingDate, setBookingDate] = useState("");

  // Código de descuento y NAVE
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    percent: number;
    label: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState("");

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [submittingMode, setSubmittingMode] = useState<
    "reservar" | "comprar" | null
  >(null);

  // Sincronización con el panel TravelApp Experience Receptivo y CMS Web (Concorde 360)
  useEffect(() => {
    const unsubExp = onSnapshot(
      query(collection(db, "experiences"), limit(40)),
      (snapshot) => {
        if (!snapshot.empty) {
          const receptivoDocs = snapshot.docs.filter((docSnap) => {
            const d = docSnap.data();
            const isEmisivoOrInternational =
              docSnap.id.startsWith("OTA-PKG-") ||
              d.tourismVertical === "emisivo" ||
              d.scope === "Internacional" ||
              d.region === "Internacional" ||
              ["operador_mayorista", "crucero", "salida_propia", "paquete_viaje"].includes(
                d.productType || ""
              );
            return !isEmisivoOrInternational;
          });

          if (receptivoDocs.length === 0) {
            setExperiences(DEFAULT_EXPERIENCES);
            return;
          }

          const loaded = receptivoDocs.map((docSnap, idx) => {
            const d = docSnap.data();
            const fallback =
              DEFAULT_EXPERIENCES[idx % DEFAULT_EXPERIENCES.length];
            const gallery: string[] =
              Array.isArray(d.images) && d.images.length > 0
                ? d.images
                : [d.imageUrl || fallback.imageUrl];
            return {
              id: docSnap.id,
              title: d.name || d.title || fallback.title,
              region: d.location || d.region || fallback.region,
              category: d.category || d.type || fallback.category,
              description: d.description || fallback.description,
              detail:
                d.detail ||
                d.details ||
                d.shortDetail ||
                (Array.isArray(d.includes) && d.includes.length > 0
                  ? d.includes.join(" · ")
                  : fallback.detail),
              duration: d.duration || fallback.duration,
              difficulty: d.difficulty || d.dificultad || fallback.difficulty,
              minPassengers: Number(
                d.minPassengers || d.minPax || fallback.minPassengers || 2
              ),
              price: Number(d.price || d.basePrice || fallback.price),
              currency: d.currency || "ARS",
              rating: Number(d.rating || 4.9),
              reviewsCount: Number(d.reviewsCount || 120),
              imageUrl: gallery[0],
              images: gallery,
              videoUrl: d.videoUrl || "",
              mediaType: d.mediaType || (d.videoUrl ? "video" : "image"),
              cardTheme: d.cardTheme || undefined,
              badge: d.badge || "Destacada",
              includes: Array.isArray(d.includes)
                ? d.includes
                : fallback.includes,
              itinerary: Array.isArray(d.itinerary) ? d.itinerary : undefined,
            } as ExperienceItem;
          });
          setExperiences(loaded);
        } else {
          setExperiences(DEFAULT_EXPERIENCES);
        }
      },
      () => {}
    );

    // Listado de hoteles cargados desde Firestore (si existen en pickup_hotels)
    const unsubHotels = onSnapshot(
      query(collection(db, "pickup_hotels"), limit(50)),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedHotels = snapshot.docs
            .map((docSnap) => {
              const data = docSnap.data();
              return data.name
                ? data.city
                  ? `${data.name} (${data.city})`
                  : String(data.name)
                : "";
            })
            .filter(Boolean);
          if (loadedHotels.length > 0) {
            setHotelsList(
              Array.from(new Set([...loadedHotels, ...DEFAULT_HOTELS]))
            );
          }
        }
      },
      () => {}
    );

    // Códigos de descuento desde Firestore (si existen en discount_codes)
    const unsubDiscounts = onSnapshot(
      query(collection(db, "discount_codes"), limit(30)),
      (snapshot) => {
        if (!snapshot.empty) {
          const map: Record<string, { percent: number; label: string }> = {};
          snapshot.docs.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.active !== false && d.code) {
              map[String(d.code).toUpperCase().trim()] = {
                percent: Number(d.percent || d.discountPercent || 10),
                label: d.label || d.description || "Descuento aplicado",
              };
            }
          });
          setFirestoreDiscounts(map);
        }
      },
      () => {}
    );

    return () => {
      unsubExp();
      unsubHotels();
      unsubDiscounts();
    };
  }, []);

  const filteredExperiences = experiences.filter((exp) => {
    if (!filters) return true;
    const matchOrigen =
      !filters.origen ||
      exp.region.toLowerCase().includes(filters.origen.toLowerCase()) ||
      exp.title.toLowerCase().includes(filters.origen.toLowerCase()) ||
      exp.description.toLowerCase().includes(filters.origen.toLowerCase());

    const matchTiempo =
      !filters.tiempoExcursion ||
      exp.duration
        .toLowerCase()
        .includes(filters.tiempoExcursion.split(" ")[0].toLowerCase());

    return matchOrigen && matchTiempo;
  });

  const openBookingModal = (exp: ExperienceItem) => {
    const initialPax = Math.max(1, exp.minPassengers || 2);
    setBookingExp(exp);
    setPaxCount(initialPax);
    setPassengerNames(Array(initialPax).fill(""));
    setPassengerPhone("");
    setSelectedHotel("");
    setCustomOriginAddress("");
    setDiscountCodeInput("");
    setAppliedDiscount(null);
    setDiscountError("");
    setBookingSuccess(false);
  };

  const handlePaxCountChange = (newCount: number) => {
    const minPax = bookingExp?.minPassengers || 1;
    const safeCount = Math.max(minPax, Math.min(30, newCount));
    setPaxCount(safeCount);
    setPassengerNames((prev) => {
      const next = [...prev];
      if (safeCount > next.length) {
        while (next.length < safeCount) next.push("");
      } else if (safeCount < next.length) {
        next.length = safeCount;
      }
      return next;
    });
  };

  const handlePassengerNameChange = (index: number, value: string) => {
    setPassengerNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleApplyDiscount = () => {
    setDiscountError("");
    const clean = discountCodeInput.toUpperCase().trim();
    if (!clean) {
      setAppliedDiscount(null);
      return;
    }
    const allCodes = { ...BUILTIN_DISCOUNT_CODES, ...firestoreDiscounts };
    const found = allCodes[clean];
    if (found) {
      setAppliedDiscount({
        code: clean,
        percent: found.percent,
        label: found.label,
      });
    } else {
      setAppliedDiscount(null);
      setDiscountError("El código ingresado no es válido o ha expirado.");
    }
  };

  const selectedDateDeadlineInfo = React.useMemo(() => {
    if (!bookingDate) return null;
    const calc = calculateTimeToPayDeadline(bookingDate);
    const remaining = getTimeRemainingInfo(calc.deadlineIso);
    return {
      deadline: new Date(calc.deadlineIso),
      label: calc.label,
      remainingLabel: remaining?.label || `${calc.hours} hs para confirmar`,
    };
  }, [bookingDate]);

  const subtotalAmount = bookingExp ? bookingExp.price * paxCount : 0;
  const discountAmount = appliedDiscount
    ? Math.round((subtotalAmount * appliedDiscount.percent) / 100)
    : 0;
  const finalAmount = Math.max(0, subtotalAmount - discountAmount);

  const resolveOriginString = () => {
    if (selectedHotel === "OTRO") {
      return customOriginAddress.trim()
        ? `Dirección: ${customOriginAddress.trim()}`
        : "Otra dirección (a confirmar)";
    }
    return selectedHotel || "A confirmar";
  };

  // Acción 1: Botón "Reservar" (bloquea cupo manteniendo el tiempo de reserva configurado)
  const handleReserveOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingExp || submittingMode) return;
    setSubmittingMode("reservar");

    const paymentDeadline = calculateTimeToPayDeadline(
      bookingDate || undefined
    );
    const leadPassenger =
      passengerNames[0]?.trim() || "Pasajero TravelApp Experience";
    const resolvedOrigin = resolveOriginString();

    try {
      await addDoc(collection(db, "experience_reservations"), {
        experienceId: bookingExp.id,
        experienceTitle: bookingExp.title,
        region: bookingExp.region,
        passengerName: leadPassenger,
        passengerNames: passengerNames.map((n) => n.trim()).filter(Boolean),
        passengerPhone,
        passengerHotel: resolvedOrigin,
        originType: selectedHotel === "OTRO" ? "CUSTOM_ADDRESS" : "HOTEL",
        bookingDate: bookingDate || null,
        paxCount,
        unitPrice: bookingExp.price,
        subtotalAmount,
        discountCode: appliedDiscount?.code || null,
        discountAmount,
        totalAmount: finalAmount,
        currency: bookingExp.currency,
        status: "RESERVED_WAITING_PAYMENT",
        timeToPayDeadline: paymentDeadline.deadlineIso,
        source: "WEB_EXPERIENCE_LANDING",
        createdAt: serverTimestamp(),
      });

      try {
        await addDoc(collection(db, "contracted_trips"), {
          type: "EXCURSION_RECEPTIVA",
          title: bookingExp.title,
          region: bookingExp.region,
          clientName: leadPassenger,
          passengerList: passengerNames.map((n) => n.trim()).filter(Boolean),
          clientPhone: passengerPhone,
          hotelPickup: resolvedOrigin,
          serviceDate: bookingDate || null,
          passengers: paxCount,
          totalPrice: finalAmount,
          paymentDeadline: paymentDeadline.deadlineIso,
          status: "PENDING",
          createdAt: serverTimestamp(),
        });
      } catch {
        // Ignora error de permisos en contracted_trips para visitante público
      }

      setBookingSuccess(true);
    } catch {
      const text = `*Reserva Excursión - TravelApp Experience*
• *Excursión:* ${bookingExp.title}
• *Pasajeros (${paxCount}):* ${passengerNames.filter(Boolean).join(", ")}
• *Teléfono / WhatsApp:* ${passengerPhone}
• *Origen:* ${resolvedOrigin}
• *Total:* $${finalAmount.toLocaleString("es-AR")} ${bookingExp.currency}`;
      window.open(
        `https://wa.me/5493812000712?text=${encodeURIComponent(text)}`,
        "_blank"
      );
      setBookingSuccess(true);
    } finally {
      setSubmittingMode(null);
    }
  };

  // Acción 2: Botón "Comprar" (aplica descuento si existe y enlaza con NAVE)
  const handleBuyWithNave = async () => {
    if (!bookingExp || submittingMode) return;

    const leadPassenger = passengerNames[0]?.trim();
    if (!leadPassenger || !passengerPhone.trim() || !selectedHotel) {
      alert(
        "Por favor completá los nombres de los pasajeros, teléfono/WhatsApp y el origen antes de continuar al pago con NAVE."
      );
      return;
    }
    if (selectedHotel === "OTRO" && !customOriginAddress.trim()) {
      alert("Por favor ingresá la dirección de retiro en el campo de dirección.");
      return;
    }

    setSubmittingMode("comprar");
    const paymentDeadline = calculateTimeToPayDeadline(
      bookingDate || undefined
    );
    const resolvedOrigin = resolveOriginString();
    const externalPaymentId = `EXP-${Date.now()}`;

    const reservationPayload = {
      experienceId: bookingExp.id,
      experienceTitle: bookingExp.title,
      region: bookingExp.region,
      passengerName: leadPassenger,
      passengerNames: passengerNames.map((n) => n.trim()).filter(Boolean),
      passengerPhone,
      passengerHotel: resolvedOrigin,
      originType: selectedHotel === "OTRO" ? "CUSTOM_ADDRESS" : "HOTEL",
      bookingDate: bookingDate || null,
      paxCount,
      unitPrice: bookingExp.price,
      subtotalAmount,
      discountCode: appliedDiscount?.code || null,
      discountPercent: appliedDiscount?.percent || 0,
      discountAmount,
      totalAmount: finalAmount,
      currency: bookingExp.currency,
      paymentGateway: "NAVE",
      externalPaymentId,
      status: "INITIATED_NAVE_CHECKOUT",
      timeToPayDeadline: paymentDeadline.deadlineIso,
      source: "WEB_EXPERIENCE_LANDING",
      createdAt: new Date().toISOString(),
    };

    let reservationDocId = "";
    try {
      const docRef = await addDoc(collection(db, "experience_reservations"), {
        ...reservationPayload,
        createdAt: serverTimestamp(),
      });
      reservationDocId = docRef.id;
    } catch {
      // Continúa hacia la pasarela NAVE aún si Firestore está en modo lectura
    }

    try {
      const appOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
      const response = await fetch("/api/checkout/nave-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalPaymentId,
          amount: finalAmount,
          currency: bookingExp.currency || "ARS",
          productName: `${bookingExp.title} (${paxCount} ${
            paxCount === 1 ? "pasajero" : "pasajeros"
          })`,
          productDescription: `Excursión ${bookingExp.title} - Origen: ${resolvedOrigin}${
            appliedDiscount ? ` - Descuento ${appliedDiscount.code}` : ""
          }`,
          buyer: {
            name: leadPassenger,
            phone: passengerPhone,
          },
          reservationId: reservationDocId || undefined,
          reservationPayload: !reservationDocId ? reservationPayload : undefined,
          callbackUrl: `${appOrigin}/checkout/success?file=${externalPaymentId}&type=experience&amount=${finalAmount}`,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.status === 429) {
        alert(
          data.error ||
            "Demasiados intentos seguidos. Por favor aguardá unos segundos."
        );
        return;
      }
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      alert(
        data?.error ||
          "No se pudo iniciar la pasarela NAVE en este momento. Intentá nuevamente."
      );
    } catch (err) {
      console.error("Error conectando con NAVE:", err);
      alert("Error de conexión al iniciar el pago con NAVE.");
    } finally {
      setSubmittingMode(null);
    }
  };

  return (
    <section id="catalogo-excursiones" className="w-full bg-white">
      {/* GRILLA DE 2 COLUMNAS ESTILO APPLE.COM/LA (CONTENIDO GESTIONADO DESDE CONCORDE 360 / RECEPTIVO) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white">
        {filteredExperiences.map((exp, idx) => {
          const showVideo = isVideoItem(exp);
          const videoSrc = exp.videoUrl || exp.imageUrl;
          const theme = resolveCardTheme(exp, idx);
          const isDark = theme === "dark";

          const gallery =
            exp.images && exp.images.length > 0 ? exp.images : [exp.imageUrl];
          const activeImgIdx = activeImageByCard[exp.id] || 0;
          const currentImageUrl = gallery[activeImgIdx] || exp.imageUrl;

          return (
            <article
              key={exp.id}
              className={`group relative min-h-[600px] sm:min-h-[630px] w-full overflow-hidden select-none flex flex-col items-center justify-between text-center pt-10 sm:pt-12 ${
                isDark
                  ? "bg-black text-white"
                  : theme === "light-sky"
                  ? "bg-gradient-to-b from-[#bce1f7] via-[#dcf0fc] to-[#f4f9fd] text-[#1d1d1f]"
                  : "bg-gradient-to-b from-[#d8ecf8] via-[#eaf4fc] to-[#f5f7fa] text-[#1d1d1f]"
              }`}
            >
              {/* MODO 1: TARJETA OSCURA FULL-BLEED (Como Apple Watch / AirPods en la referencia) */}
              {isDark && (
                <div className="absolute inset-0 z-0">
                  {showVideo ? (
                    <video
                      src={videoSrc}
                      poster={currentImageUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <img
                      src={currentImageUrl}
                      alt={exp.title}
                      className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/45 to-black/60" />
                </div>
              )}

              {/* Controles de galería si la tarjeta tiene múltiples imágenes (Modo oscuro) */}
              {isDark && !showVideo && gallery.length > 1 && (
                <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-1.5">
                  {gallery.map((_, imgI) => (
                    <button
                      key={imgI}
                      type="button"
                      onClick={() =>
                        setActiveImageByCard((prev) => ({
                          ...prev,
                          [exp.id]: imgI,
                        }))
                      }
                      aria-label={`Ver imagen ${imgI + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        activeImgIdx === imgI
                          ? "w-5 bg-white"
                          : "w-1.5 bg-white/45 hover:bg-white/75"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* BLOQUE SUPERIOR DE INFORMACIÓN DE LA TARJETA */}
              <div className="relative z-20 max-w-xl mx-auto px-6 flex flex-col items-center">
                {/* 1. TÍTULO O NOMBRE */}
                <h3
                  className={`text-[30px] sm:text-[38px] font-semibold tracking-[-0.02em] leading-[1.08] ${
                    isDark ? "text-white" : "text-[#1d1d1f]"
                  }`}
                >
                  {exp.title}
                </h3>

                {/* 2. DESCRIPCIÓN */}
                <p
                  className={`mt-1.5 text-[16px] sm:text-[18px] font-normal tracking-[-0.01em] leading-[1.25] max-w-md ${
                    isDark ? "text-white/95" : "text-[#1d1d1f]"
                  }`}
                >
                  {exp.description}
                </p>

                {/* 3. DETALLE */}
                <p
                  className={`mt-1.5 text-[13px] sm:text-[14px] font-normal leading-relaxed max-w-lg ${
                    isDark ? "text-white/75" : "text-[#424245]"
                  }`}
                >
                  {exp.detail}
                </p>

                {/* 4. DURACIÓN · DIFICULTAD · CANTIDAD MÍNIMA DE PASAJEROS */}
                <div
                  className={`mt-3 flex flex-wrap items-center justify-center gap-2 text-[12px] font-medium ${
                    isDark ? "text-white/85" : "text-[#1d1d1f]/80"
                  }`}
                >
                  <span
                    className={`px-2.5 py-0.5 rounded-full ${
                      isDark
                        ? "bg-white/15 backdrop-blur-md"
                        : "bg-black/[0.06]"
                    }`}
                  >
                    Duración: {exp.duration}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full ${
                      isDark
                        ? "bg-white/15 backdrop-blur-md"
                        : "bg-black/[0.06]"
                    }`}
                  >
                    Dificultad: {exp.difficulty}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full ${
                      isDark
                        ? "bg-white/15 backdrop-blur-md"
                        : "bg-black/[0.06]"
                    }`}
                  >
                    Mín. {exp.minPassengers}{" "}
                    {exp.minPassengers === 1 ? "pasajero" : "pasajeros"}
                  </span>
                </div>

                {/* 5. PRECIO DESDE */}
                <p
                  className={`mt-2.5 text-[15px] sm:text-[16px] font-semibold tracking-[-0.01em] ${
                    isDark ? "text-white" : "text-[#1d1d1f]"
                  }`}
                >
                  Precio desde: ${exp.price.toLocaleString("es-AR")}{" "}
                  {exp.currency}
                </p>

                {/* 6. BOTONES PÍLDORA APPLE: "Consultar" y "Reservar" */}
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenConsultar?.(exp.title)}
                    className="px-[22px] py-[8px] rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-normal tracking-[-0.01em] transition-colors cursor-pointer"
                  >
                    Consultar
                  </button>

                  <button
                    type="button"
                    onClick={() => openBookingModal(exp)}
                    className={`px-[22px] py-[8px] rounded-full text-[14px] font-normal tracking-[-0.01em] transition-colors cursor-pointer ${
                      isDark
                        ? "border border-[#2997ff] text-[#2997ff] hover:bg-[#0071e3] hover:border-[#0071e3] hover:text-white"
                        : "border border-[#0071e3] text-[#0071e3] hover:bg-[#0071e3] hover:text-white"
                    }`}
                  >
                    Reservar
                  </button>
                </div>
              </div>

              {/* MODO 2: IMAGEN / GALERÍA CENTRADA ABAJO EN TARJETAS CLARAS (Igual a MacBook Air / iPad Air) */}
              {!isDark && (
                <div className="relative z-10 w-full px-6 sm:px-10 pb-6 pt-4 flex items-end justify-center flex-1">
                  <div className="relative w-full max-w-[460px] h-[230px] sm:h-[260px] rounded-2xl overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.14)]">
                    {showVideo ? (
                      <video
                        src={videoSrc}
                        poster={currentImageUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    ) : (
                      <img
                        src={currentImageUrl}
                        alt={exp.title}
                        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    )}

                    {!showVideo && gallery.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageByCard((prev) => ({
                              ...prev,
                              [exp.id]:
                                (activeImgIdx - 1 + gallery.length) %
                                gallery.length,
                            }))
                          }
                          aria-label="Imagen anterior"
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageByCard((prev) => ({
                              ...prev,
                              [exp.id]: (activeImgIdx + 1) % gallery.length,
                            }))
                          }
                          aria-label="Siguiente imagen"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* MODAL DE RESERVA Y COMPRA DIRECTA CON NAVE */}
      {bookingExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-[#1d1d1f] my-8 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setBookingExp(null)}
              className="
                absolute top-5 right-5 w-8 h-8 rounded-full
                bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f]
                flex items-center justify-center transition-colors cursor-pointer
              "
            >
              <X className="w-4 h-4" />
            </button>

            {bookingSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-semibold text-[#1d1d1f]">
                  Reserva Registrada
                </h3>
                <p className="text-sm text-[#86868b] max-w-md mx-auto">
                  Tu solicitud para <strong>{bookingExp.title}</strong> ({paxCount}{" "}
                  {paxCount === 1 ? "pasajero" : "pasajeros"}) quedó registrada
                  respetando el tiempo de reserva configurado.
                </p>
                {selectedDateDeadlineInfo && (
                  <div className="p-3.5 rounded-2xl bg-[#f5f5f7] text-xs font-medium text-[#1d1d1f]">
                    Vencimiento de reserva:{" "}
                    <strong>
                      {selectedDateDeadlineInfo.deadline.toLocaleString("es-AR")}
                    </strong>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setBookingExp(null)}
                  className="px-6 py-2.5 rounded-full bg-[#0071e3] text-white text-sm font-normal cursor-pointer"
                >
                  Listo
                </button>
              </div>
            ) : (
              <div>
                <div className="text-xs font-medium text-[#0071e3] mb-1">
                  Reserva y Compra Online · {bookingExp.region}
                </div>
                <h3 className="text-2xl font-semibold text-[#1d1d1f] mb-1">
                  {bookingExp.title}
                </h3>
                <p className="text-xs text-[#86868b] mb-5">
                  Duración: {bookingExp.duration} · Dificultad:{" "}
                  {bookingExp.difficulty} · Mín. {bookingExp.minPassengers}{" "}
                  pasajeros · Precio desde: $
                  {bookingExp.price.toLocaleString("es-AR")} {bookingExp.currency}
                </p>

                <form onSubmit={handleReserveOnly} className="space-y-4">
                  {/* 1. CANTIDAD DE PASAJEROS Y FECHA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                        <Users className="w-3.5 h-3.5 text-[#0071e3]" />
                        Cantidad de Pasajeros (Mín. {bookingExp.minPassengers})
                      </label>
                      <div className="flex items-center border border-[#d2d2d7] rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handlePaxCountChange(paxCount - 1)}
                          disabled={paxCount <= (bookingExp.minPassengers || 1)}
                          className="px-3.5 py-2 bg-[#f5f5f7] hover:bg-[#e5e5ea] disabled:opacity-40 text-sm font-semibold cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={bookingExp.minPassengers || 1}
                          max={30}
                          required
                          value={paxCount}
                          onChange={(e) =>
                            handlePaxCountChange(Number(e.target.value))
                          }
                          className="w-full text-center py-2 text-sm font-semibold text-[#1d1d1f] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handlePaxCountChange(paxCount + 1)}
                          className="px-3.5 py-2 bg-[#f5f5f7] hover:bg-[#e5e5ea] text-sm font-semibold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-[#0071e3]" />
                        Fecha de Salida
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                      />
                    </div>
                  </div>

                  {/* 2. NOMBRE Y APELLIDO DINÁMICOS DE ACUERDO A LA CANTIDAD DE PASAJEROS */}
                  <div className="space-y-2.5 bg-[#f5f5f7] p-4 rounded-2xl">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                      Nombre y Apellido de los Pasajeros ({paxCount})
                    </label>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {passengerNames.map((nameVal, pIdx) => (
                        <div key={pIdx}>
                          <input
                            type="text"
                            required
                            value={nameVal}
                            onChange={(e) =>
                              handlePassengerNameChange(pIdx, e.target.value)
                            }
                            placeholder={`Pasajero ${pIdx + 1}${
                              pIdx === 0 ? " (Titular)" : ""
                            } — Nombre y Apellido`}
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. TELÉFONO / WHATSAPP */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      placeholder="+54 9 381 ..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                    />
                  </div>

                  {/* 4. ORIGEN: LISTADO DE HOTELES + ITEM "OTRO" CON CAMPO DE DIRECCIÓN */}
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                      <MapPin className="w-3.5 h-3.5 text-[#0071e3]" />
                      Origen (Punto de Retiro / Hotel)
                    </label>
                    <select
                      required
                      value={selectedHotel}
                      onChange={(e) => setSelectedHotel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] bg-white focus:outline-none focus:border-[#0071e3]"
                    >
                      <option value="">Seleccionar hotel de origen...</option>
                      {hotelsList.map((hotelName) => (
                        <option key={hotelName} value={hotelName}>
                          {hotelName}
                        </option>
                      ))}
                      <option value="OTRO">
                        Otro (Colocar dirección exacta)
                      </option>
                    </select>

                    {selectedHotel === "OTRO" && (
                      <div className="animate-in fade-in duration-150">
                        <input
                          type="text"
                          required
                          value={customOriginAddress}
                          onChange={(e) =>
                            setCustomOriginAddress(e.target.value)
                          }
                          placeholder="Ingresá la dirección exacta (Calle, número, localidad)"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#0071e3] bg-[#f0f7ff] text-sm text-[#1d1d1f] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* 5. CÓDIGO DE DESCUENTO (PARA COMPRAR) */}
                  <div className="p-3.5 rounded-2xl border border-[#e5e5ea] bg-[#fafafa] space-y-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                      <Tag className="w-3.5 h-3.5 text-[#0071e3]" />
                      Código de Descuento (Opcional para Compra)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={discountCodeInput}
                        onChange={(e) =>
                          setDiscountCodeInput(e.target.value.toUpperCase())
                        }
                        placeholder="Ej: TRAVEL10"
                        className="flex-1 px-3 py-2 rounded-xl border border-[#d2d2d7] bg-white text-xs font-medium uppercase text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyDiscount}
                        className="px-4 py-2 rounded-xl bg-[#1d1d1f] hover:bg-[#333336] text-white text-xs font-medium transition-colors cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>
                    {appliedDiscount && (
                      <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                        <span className="flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {appliedDiscount.code}: {appliedDiscount.label}
                        </span>
                        <span className="font-semibold">
                          -${discountAmount.toLocaleString("es-AR")}
                        </span>
                      </div>
                    )}
                    {discountError && (
                      <p className="text-[11px] text-red-600">{discountError}</p>
                    )}
                  </div>

                  {/* Aviso de Tiempo de Reserva Configurado */}
                  {selectedDateDeadlineInfo && (
                    <div className="p-3 rounded-xl bg-[#f5f5f7] text-xs text-[#1d1d1f] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">
                          Tiempo de reserva garantizado hasta:{" "}
                          {selectedDateDeadlineInfo.deadline.toLocaleString(
                            "es-AR"
                          )}
                        </span>
                        <span className="text-[#86868b]">
                          {selectedDateDeadlineInfo.label} ·{" "}
                          {selectedDateDeadlineInfo.remainingLabel}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* RESUMEN DE TOTAL */}
                  <div className="p-4 rounded-2xl bg-[#f5f5f7] flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-medium text-[#86868b]">
                        Total ({paxCount}{" "}
                        {paxCount === 1 ? "pasajero" : "pasajeros"})
                      </span>
                      {appliedDiscount && (
                        <span className="text-[11px] text-[#86868b] line-through">
                          ${subtotalAmount.toLocaleString("es-AR")}{" "}
                          {bookingExp.currency}
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-semibold text-[#1d1d1f]">
                      ${finalAmount.toLocaleString("es-AR")}{" "}
                      {bookingExp.currency}
                    </span>
                  </div>

                  {/* 6. BOTONES DE RESERVAR Y COMPRAR (ENLAZADO CON NAVE) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={submittingMode !== null}
                      className="w-full py-3 px-4 rounded-full border border-[#0071e3] text-[#0071e3] hover:bg-[#f0f7ff] text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submittingMode === "reservar" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Reservando...</span>
                        </>
                      ) : (
                        <span>Reservar</span>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={submittingMode !== null}
                      onClick={handleBuyWithNave}
                      className="w-full py-3 px-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      {submittingMode === "comprar" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Conectando con NAVE...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Comprar con NAVE</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
