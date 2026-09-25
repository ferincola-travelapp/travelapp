"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  Building2,
  Package,
  Compass,
  Bus,
  Car,
  Search,
  Calendar,
  MapPin,
  Users,
  Sparkles,
  ArrowRight,
  X,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

type SearchTab = "vuelos" | "hoteles" | "paquetes" | "excursiones" | "buses" | "traslados";

interface OtaSearchEngineProps {
  onSearch?: (tab: SearchTab, params: any) => void;
}

export function OtaSearchEngine({ onSearch }: OtaSearchEngineProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SearchTab>("vuelos");

  // Form State
  const [origin, setOrigin] = useState("Buenos Aires (BUE)");
  const [destination, setDestination] = useState("San Miguel de Tucumán (TUC)");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("2 Pasajeros");

  // Modal para cotización asistida en Vuelos/Hoteles/Buses mientras se adquieren APIs
  const [assistedQuoteModal, setAssistedQuoteModal] = useState(false);

  const tabs: { id: SearchTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "vuelos", label: "Vuelos", icon: <Plane className="w-4 h-4" /> },
    { id: "hoteles", label: "Hoteles", icon: <Building2 className="w-4 h-4" /> },
    { id: "paquetes", label: "Paquetes", icon: <Package className="w-4 h-4" /> },
    {
      id: "excursiones",
      label: "Excursiones",
      icon: <Compass className="w-4 h-4 text-[#ff4f5a]" />,
      badge: "Experience",
    },
    { id: "buses", label: "Buses", icon: <Bus className="w-4 h-4" /> },
    {
      id: "traslados",
      label: "Traslados",
      icon: <Car className="w-4 h-4 text-[#ff5a19]" />,
      badge: "TravelCab",
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "excursiones") {
      router.push(`/landing/experience/marketplace?destination=${encodeURIComponent(destination)}`);
      return;
    }

    if (activeTab === "traslados") {
      router.push(`/landing/travelcab?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}`);
      return;
    }

    // Para vuelos, hoteles, paquetes y buses (fase APIs en trámite)
    setAssistedQuoteModal(true);
  };

  const getWhatsAppQuoteUrl = () => {
    const text = `Hola TravelApp! Quiero cotizar ${activeTab.toUpperCase()}:\n• Origen: ${origin}\n• Destino: ${destination}\n• Fecha salida: ${departureDate || "A convenir"}\n• Fecha regreso: ${returnDate || "Solo ida"}\n• Pasajeros: ${passengers}\n¿Tienen promociones o cuotas fijas disponibles?`;
    return `https://wa.me/5493812020050?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/40 font-sans">
      {/* Pestañas de Servicios */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-3 scrollbar-none border-b border-slate-100">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-[#0a2a5b] text-white shadow-md shadow-blue-950/20 scale-[1.02]"
                  : "bg-slate-100/80 hover:bg-slate-200/80 text-slate-700"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Formulario de Búsqueda */}
      <form onSubmit={handleSearchSubmit} className="mt-4 sm:mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Origen */}
          <div className="relative group">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {activeTab === "hoteles" || activeTab === "excursiones" ? "Destino o Ciudad" : "Origen"}
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0a2a5b] focus-within:bg-white transition-all">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-[#ff5a19]" />
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder={activeTab === "hoteles" ? "Ej. Bariloche, Mendoza..." : "Ciudad de partida..."}
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Destino */}
          <div className="relative group">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {activeTab === "hoteles" || activeTab === "excursiones" ? "Zona o Alojamiento" : "Destino"}
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0a2a5b] focus-within:bg-white transition-all">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-[#0a2a5b]" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ciudad de llegada o hotel..."
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Fechas (Salida y Regreso) */}
          <div className="relative group">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Fechas de Viaje
            </label>
            <div className="grid grid-cols-2 gap-1.5 px-3 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0a2a5b] focus-within:bg-white transition-all">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-1.5">
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pasajeros / Botón Buscar */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative group">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Viajeros
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0a2a5b] focus-within:bg-white transition-all">
                <Users className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="1 Pasajero">1 Pasajero</option>
                  <option value="2 Pasajeros">2 Pasajeros</option>
                  <option value="3 Pasajeros">3 Pasajeros</option>
                  <option value="4+ Familia / Grupo">4+ Familia / Grupo</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-[#ff5a19] hover:bg-[#e04c10] text-white font-bold text-sm shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 shrink-0 h-[42px] cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </div>
        </div>
      </form>

      {/* Modal de Cotización Asistida VIP mientras se habilitan APIs de vuelos/hoteles */}
      {assistedQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setAssistedQuoteModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0a2a5b] text-xs font-bold uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#ff5a19]" />
              <span>Cotización Prioritaria TravelApp</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              Estamos buscando tu tarifa para {destination}
            </h3>

            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Para garantizarte la tarifa más conveniente, promociones en cuotas fijas y congelamiento de precio inmediato, te conectamos directamente con nuestro equipo de emisión.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="font-bold">Servicio:</span>
                <span className="capitalize">{activeTab}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Trayecto:</span>
                <span>{origin} ➔ {destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Fechas:</span>
                <span>{departureDate || "A definir"} {returnDate ? `- ${returnDate}` : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Viajeros:</span>
                <span>{passengers}</span>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href={getWhatsAppQuoteUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setAssistedQuoteModal(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-600/25 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Congelar Tarifa por WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setAssistedQuoteModal(false);
                  router.push(`/landing/experience/marketplace`);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Explorar experiencias y paquetes disponibles hoy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
