"use client";

import React, { useRef, useState } from "react";
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
  {
    id: "item-ushuaia",
    title: "Ushuaia Fin del Mundo & Canal Beagle",
    category: "Tierra del Fuego",
    destination: "Ushuaia, Argentina",
    duration: "5 Días / 4 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=90",
    priceArs: 720000,
    priceUsd: 580,
    pointsEarned: 7200,
    rating: 4.9,
    badge: "Fin del Mundo",
    includedServices: ["Aéreos incluidos", "Hotel céntrico 4★", "Navegación Canal Beagle"],
    installmentsText: "12 cuotas fijas de $77.000",
    url: "/marketplace?id=ushuaia-fin-del-mundo",
  },
  {
    id: "item-salta-jujuy",
    title: "Norte Argentino: Salta, Cafayate & Purmamarca",
    category: "Paisajes & Tradición",
    destination: "Salta y Jujuy, Argentina",
    duration: "6 Días / 5 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=90",
    priceArs: 490000,
    priceUsd: 395,
    pointsEarned: 4900,
    rating: 4.9,
    badge: "Circuito Norte",
    includedServices: ["Vuelos ida y vuelta", "Hoteles con desayuno", "Excursiones guiadas"],
    installmentsText: "12 cuotas fijas de $52.500",
    url: "/marketplace?id=norte-argentino",
  },
  {
    id: "item-madrid-paris",
    title: "Europa Soñada: Madrid, Barcelona & París",
    category: "Circuito Europeo",
    destination: "España y Francia",
    duration: "14 Días / 12 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=90",
    priceArs: 4850000,
    priceUsd: 3680,
    pointsEarned: 48500,
    rating: 5.0,
    badge: "Operador Mayorista: Dertour",
    includedServices: ["Vuelos intercontinentales", "Hoteles 4★ con desayuno", "Guía en español"],
    installmentsText: "Financiación bancaria disponible",
    url: "/marketplace?id=madrid-paris-europa",
  },
  {
    id: "item-crucero-brasil",
    title: "Crucero Costa: Río de Janeiro & Punta del Este",
    category: "Cruceros Costa / Ola",
    destination: "Brasil y Uruguay",
    duration: "9 Días / 8 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1200&q=90",
    priceArs: 2450000,
    priceUsd: 1850,
    pointsEarned: 24500,
    rating: 4.9,
    badge: "Pensión Completa",
    includedServices: ["Cabina con balcón", "Todas las comidas", "Tasas y propinas incluidas"],
    installmentsText: "6 cuotas fijas sin interés",
    url: "/marketplace?id=crucero-costa-brasil",
  },
  {
    id: "item-rio-janeiro",
    title: "Río de Janeiro, Copacabana & Cristo Redentor",
    category: "Playas de Brasil",
    destination: "Río de Janeiro, Brasil",
    duration: "7 Días / 6 Noches",
    imageUrl:
      "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&q=90",
    priceArs: 1150000,
    priceUsd: 890,
    pointsEarned: 11500,
    rating: 4.8,
    badge: "Sol & Bossa Nova",
    includedServices: ["Vuelo directo", "Hotel frente al mar", "City Tour y Cristo Redentor"],
    installmentsText: "12 cuotas fijas de $123.000",
    url: "/marketplace?id=rio-de-janeiro-copacabana",
  },
];

export function OtaMarketplaceCarousel({
  currency,
  items,
}: OtaMarketplaceCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeItems = items !== undefined ? items : PIAMONTE_ITEMS;

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = 320;
      const newIdx = Math.round(scrollLeft / cardWidth);
      setActiveIdx(Math.min(Math.max(newIdx, 0), Math.max(activeItems.length - 1, 0)));
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -340 : 340;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <section id="paquetes-destacados" className="py-10 sm:py-16 bg-white font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado Editorial */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-slate-100 border border-slate-200 text-[#0A2A5B] text-xs font-bold uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0A2A5B]" />
              <span>Salidas Seleccionadas</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Paquetes de Viaje Recomendados
            </h2>
            <p className="text-xs sm:text-base text-slate-500 font-medium mt-1.5 sm:mt-2 max-w-2xl">
              Salidas confirmadas con aéreos, hotelería de excelencia, traslados y el respaldo del equipo TravelApp.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Ver anterior"
              className="p-2.5 sm:p-3 rounded-sm border border-slate-300 text-[#0A2A5B] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Ver siguiente"
              className="p-2.5 sm:p-3 rounded-sm border border-slate-300 text-[#0A2A5B] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Carrusel de Tarjetas Cuadradas */}
        {activeItems.length === 0 ? (
          <div className="p-10 rounded-sm border border-slate-200 bg-slate-50 text-center space-y-3">
            <p className="text-sm font-bold text-slate-700">
              No hay paquetes publicados para este filtro en este momento.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#0A2A5B] text-white text-xs font-bold hover:bg-[#071d3f] transition-colors"
            >
              <span>Ver todo el catálogo en travelmarket</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 scrollbar-none overscroll-x-contain select-none snap-x snap-proximity scroll-smooth"
        >
          {activeItems.map((item) => {
            const formattedPrice =
              currency === "ARS"
                ? `$${item.priceArs.toLocaleString("es-AR")}`
                : `u$s ${item.priceUsd}`;
            const services = item.includedServices || [
              "Aéreo ida y vuelta",
              "Alojamiento con desayuno",
              "Traslados TravelCab",
            ];

            return (
              <div
                key={item.id}
                className="flex-none w-[82vw] max-w-[330px] sm:w-[340px] bg-white rounded-sm overflow-hidden border border-slate-200 hover:border-[#0A2A5B]/40 hover:shadow-xl transition-all duration-300 flex flex-col snap-start group"
              >
                {/* 1. Fotografía Cuadrada 100% Pura y Limpia */}
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 330px, 340px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Badge de Duración limpio */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-white/95 text-[#0A2A5B] text-[11px] font-bold shadow-sm border border-slate-200/80">
                    <Clock className="w-3 h-3 text-[#0A2A5B]" />
                    <span>{item.duration}</span>
                  </div>

                  {/* Badge promocional */}
                  {item.badge && (
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-sm bg-[#0A2A5B] text-white text-[11px] font-extrabold shadow-sm">
                      {item.badge}
                    </div>
                  )}

                  {/* Texto Flotante con Detalle de Servicios Incluidos (hover / focus) */}
                  <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200">
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-sm p-3.5 shadow-xl">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#0A2A5B] mb-2">
                        Servicios incluidos
                      </p>
                      <div className="space-y-1.5">
                        {services.map((srv, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0A2A5B] shrink-0" />
                            <span>{srv}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Info Básica: Destino, Título, Precio Público y Rewards */}
                <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0A2A5B]" />
                      <span>{item.destination}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug group-hover:text-[#0A2A5B] transition-colors mb-2">
                      {item.title}
                    </h3>

                    <p className="text-[11px] font-semibold text-slate-400">
                      Pasá el cursor sobre la imagen para ver servicios incluidos
                    </p>
                  </div>

                  {/* 3. Bloque de Precio Público y Rewards */}
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Precio público
                      </span>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-slate-100 text-[#0A2A5B] text-[11px] font-extrabold">
                        <Sparkles className="w-3 h-3" />
                        <span>+{item.pointsEarned} pts Rewards</span>
                      </div>
                    </div>

                    <div className="text-2xl font-black text-[#0A2A5B] leading-tight">
                      {formattedPrice}
                    </div>

                    {item.installmentsText && currency === "ARS" && (
                      <p className="text-xs font-bold text-slate-600 mt-0.5">
                        o {item.installmentsText}
                      </p>
                    )}

                    {/* Botón de Acción Directo */}
                    <Link
                      href={item.url || "/marketplace"}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-sm bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      <span>Ver Itinerario & Reservar</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Espaciador final para permitir scroll completo */}
          <div className="w-4 flex-none" />
        </div>
        )}

        {/* Indicadores de puntos en mobile */}
        <div className="flex justify-center items-center gap-1.5 mt-3 sm:hidden">
          {activeItems.slice(0, 8).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (scrollRef.current) {
                  const cardWidth = 320;
                  scrollRef.current.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
                  setActiveIdx(idx);
                }
              }}
              aria-label={`Ir al paquete ${idx + 1}`}
              className={`transition-all duration-300 rounded-sm cursor-pointer ${
                idx === activeIdx
                  ? "w-6 h-1.5 bg-[#0A2A5B]"
                  : "w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>

        {/* 4. Llamado a la Acción (CTA) para el Marketplace Completo */}
        <div className="mt-12 p-8 sm:p-10 rounded-sm bg-[#0A2A5B] text-white border border-[#0A2A5B] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl text-center md:text-left">
            <span className="px-3 py-1 rounded-sm bg-white/10 text-white text-xs font-bold uppercase tracking-wider inline-block mb-3">
              Catálogo Completo travelmarket
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              ¿Buscás otro destino o fechas personalizadas?
            </h3>
            <p className="text-sm sm:text-base text-slate-200 font-medium mt-2">
              Explorá más de 150 paquetes de Turismo Emisivo, vuelos nacionales e internacionales, hoteles y actividades con confirmación inmediata.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="flex items-center gap-3 px-8 py-4 rounded-sm bg-white hover:bg-slate-100 text-[#0A2A5B] font-extrabold text-sm sm:text-base transition-colors shrink-0 cursor-pointer"
          >
            <span>Explorar travelmarket</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
