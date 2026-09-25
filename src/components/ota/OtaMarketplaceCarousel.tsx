"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Plane,
  Building,
  Car,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export interface MarketplaceItem {
  id: string;
  title: string;
  category: string;
  destination: string;
  duration: string;
  imageUrl: string;
  priceArs: number;
  priceUsd: number;
  pointsEarned: number;
  rating?: number;
  badge?: string;
  includedServices?: string[];
  installmentsText?: string;
  url?: string;
}

interface OtaMarketplaceCarouselProps {
  currency: "ARS" | "USD";
  items?: MarketplaceItem[];
}

// Catálogo destacado estilo Piamonte (imágenes nítidas, servicios incluidos y cuotas claras)
const PIAMONTE_ITEMS: MarketplaceItem[] = [
  {
    id: "item-cancun",
    title: "Cancún & Riviera Maya All Inclusive",
    category: "Caribe Clásico",
    destination: "Cancún, México",
    duration: "8 Días / 7 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=90",
    priceArs: 1850000,
    priceUsd: 1480,
    pointsEarned: 18500,
    rating: 4.9,
    badge: "Más Elegido",
    includedServices: ["Aéreos incluidos", "Hotel All Inclusive", "Traslado TravelCab"],
    installmentsText: "12 cuotas fijas de $198.500",
    url: "/marketplace?id=cancun-all-inclusive",
  },
  {
    id: "item-bariloche",
    title: "Bariloche Clásico, Lagos & Circuito Chico",
    category: "Patagonia & Nieve",
    destination: "Bariloche, Río Negro",
    duration: "5 Días / 4 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=90",
    priceArs: 480000,
    priceUsd: 390,
    pointsEarned: 4800,
    rating: 4.9,
    badge: "Temporada 2026",
    includedServices: ["Vuelo directo", "Hotel con Desayuno", "Excursión Circuito Chico"],
    installmentsText: "12 cuotas fijas de $51.500",
    url: "/marketplace?id=bariloche-clasico",
  },
  {
    id: "item-iguazu",
    title: "Cataratas del Iguazú Lado Argentino y Brasil",
    category: "Naturaleza Viva",
    destination: "Puerto Iguazú, Misiones",
    duration: "4 Días / 3 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1589556264800-08ae9e129a8c?auto=format&fit=crop&w=1200&q=90",
    priceArs: 395000,
    priceUsd: 320,
    pointsEarned: 3950,
    rating: 5.0,
    badge: "Salida Inmediata",
    includedServices: ["Vuelos ida y vuelta", "Hotel 4 Estrellas", "Traslado Aeropuerto"],
    installmentsText: "12 cuotas fijas de $42.300",
    url: "/marketplace?id=cataratas-iguazu",
  },
  {
    id: "item-mendoza",
    title: "Mendoza Vinos de Altura & Cordillera",
    category: "Bodegas & Montaña",
    destination: "Mendoza, Cuyo",
    duration: "4 Días / 3 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=90",
    priceArs: 420000,
    priceUsd: 345,
    pointsEarned: 4200,
    rating: 4.8,
    badge: "Gourmet & Relax",
    includedServices: ["Aéreos y Hotel", "Visita a 3 Bodegas", "Almuerzo con Maridaje"],
    installmentsText: "12 cuotas fijas de $45.000",
    url: "/marketplace?id=mendoza-vinos",
  },
  {
    id: "item-calafate",
    title: "El Calafate & Glaciar Perito Moreno VIP",
    category: "Aventura Glaciar",
    destination: "El Calafate, Santa Cruz",
    duration: "5 Días / 4 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=90",
    priceArs: 690000,
    priceUsd: 560,
    pointsEarned: 6900,
    rating: 5.0,
    badge: "Exclusivo",
    includedServices: ["Vuelos y Hotel", "Safari Náutico", "Pasarelas con Guía"],
    installmentsText: "12 cuotas fijas de $74.000",
    url: "/marketplace?id=calafate-glaciares",
  },
];

export function OtaMarketplaceCarousel({
  currency,
  items,
}: OtaMarketplaceCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeItems = items && items.length > 0 ? items : PIAMONTE_ITEMS;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -360 : 360;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <section id="paquetes-destacados" className="py-16 sm:py-24 bg-white font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado Editorial Estilo Piamonte */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-[#0a2a5b] text-xs font-bold uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#ff5a19]" />
              <span>Salidas Seleccionadas</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Paquetes de Viaje Recomendados
            </h2>
            <p className="text-base text-slate-500 font-medium mt-2 max-w-2xl">
              Salidas confirmadas con aéreos, hotelería de excelencia, traslados y el respaldo del equipo TravelApp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Ver anterior"
              className="p-3 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Ver siguiente"
              className="p-3 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carrusel de Tarjetas Estilo Piamonte */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-6 pt-2 scrollbar-none snap-x snap-mandatory"
        >
          {activeItems.map((item) => {
            const formattedPrice =
              currency === "ARS"
                ? `$${item.priceArs.toLocaleString("es-AR")}`
                : `u$s ${item.priceUsd}`;

            return (
              <div
                key={item.id}
                className="flex-none w-[300px] sm:w-[350px] bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col snap-start group"
              >
                {/* 1. Fotografía HD con Badges de Piamonte (Duración y Categoría) */}
                <div className="relative h-60 w-full overflow-hidden bg-slate-900">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 300px, 350px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Badge de Duración en pill superior */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>{item.duration}</span>
                  </div>

                  {/* Badge promocional */}
                  {item.badge && (
                    <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full bg-[#ff5a19] text-white text-xs font-extrabold shadow-sm">
                      {item.badge}
                    </div>
                  )}

                  {/* Scrim sutil en la base de la foto */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                  {/* Destino Geográfico */}
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 text-white text-xs font-bold drop-shadow-sm">
                    <MapPin className="w-3.5 h-3.5 text-[#ff5a19]" />
                    <span>{item.destination}</span>
                  </div>
                </div>

                {/* 2. Cuerpo de la Tarjeta (Datos Clave Estilo Piamonte) */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-[#0a2a5b] transition-colors mb-3">
                      {item.title}
                    </h3>

                    {/* Chips de Servicios Incluidos */}
                    <div className="space-y-1.5 mb-4">
                      {(item.includedServices || [
                        "Aéreo ida y vuelta",
                        "Alojamiento con desayuno",
                        "Traslados TravelCab",
                      ]).map((srv, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{srv}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Bloque de Precios y Financiación */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Precio por persona
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#e5a93b]">
                        <Sparkles className="w-3 h-3" />
                        <span>+{item.pointsEarned} pts</span>
                      </div>
                    </div>

                    <div className="text-2xl font-black text-[#0a2a5b] leading-tight">
                      {formattedPrice}
                    </div>

                    {item.installmentsText && currency === "ARS" && (
                      <p className="text-xs font-bold text-[#ff5a19] mt-0.5">
                        o {item.installmentsText}
                      </p>
                    )}

                    {/* Botón de Acción Directo */}
                    <Link
                      href={item.url || "/marketplace"}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0a2a5b] hover:bg-[#071d3f] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                    >
                      <span>Ver Itinerario & Reservar</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Llamado a la Acción (CTA) para el Marketplace Completo */}
        <div className="mt-12 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#0a2a5b] to-[#071d3f] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl text-center md:text-left">
            <span className="px-3.5 py-1 rounded-full bg-white/15 text-amber-300 text-xs font-bold uppercase tracking-wider inline-block mb-3">
              Catálogo Completo OTA
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              ¿Buscás otro destino o fechas personalizadas?
            </h3>
            <p className="text-sm sm:text-base text-slate-200 font-medium mt-2">
              Explorá más de 150 paquetes, vuelos nacionales e internacionales, hoteles y actividades con confirmación inmediata.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#ff5a19] hover:bg-[#e04c10] text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-orange-500/30 transition-all shrink-0 cursor-pointer"
          >
            <span>Explorar Todo el Marketplace</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
