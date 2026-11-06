"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  Building2,
  Bus,
  Compass,
  Car,
  Key,
  ShieldCheck,
  Ticket,
  Search,
  Calendar,
  MapPin,
  Users,
  Sparkles,
  ArrowRight,
  X,
  MessageSquare,
  CheckCircle2,
  Palmtree
} from "lucide-react";

export type OtaSearchTab = 
  | "paquetes"
  | "vuelos" 
  | "hoteles" 
  | "buses" 
  | "actividades" 
  | "traslados" 
  | "autos" 
  | "asistencia" 
  | "parques";

export interface OtaSearchEngineProps {
  enabledTabs?: {
    paquetes?: boolean;
    vuelos?: boolean;
    hoteles?: boolean;
    buses?: boolean;
    actividades?: boolean;
    traslados?: boolean;
    autos?: boolean;
    asistencia?: boolean;
    parques?: boolean;
  };
  onSearch?: (tab: OtaSearchTab, params: any) => void;
}

export function OtaSearchEngine({ enabledTabs, onSearch }: OtaSearchEngineProps) {
  const router = useRouter();

  // Configuración de pestañas activables por switch (por defecto todas true)
  const isEnabled = (tab: OtaSearchTab) => {
    if (!enabledTabs) return true;
    return enabledTabs[tab] !== false;
  };

  const allTabs: { id: OtaSearchTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: "paquetes",
      label: "Paquetes",
      icon: <Palmtree className="w-4 h-4 text-[#FF5A19]" />,
    },
    { id: "vuelos", label: "Vuelos", icon: <Plane className="w-4 h-4" /> },
    { id: "hoteles", label: "Hoteles", icon: <Building2 className="w-4 h-4" /> },
    { id: "buses", label: "Buses", icon: <Bus className="w-4 h-4" /> },
    {
      id: "actividades",
      label: "Actividades",
      icon: <Compass className="w-4 h-4 text-[#FF4F5A]" />,
    },
    {
      id: "traslados",
      label: "Traslados",
      icon: <Car className="w-4 h-4 text-[#FF5A19]" />,
    },
    { id: "autos", label: "Autos", icon: <Key className="w-4 h-4 text-emerald-500" /> },
    { id: "asistencia", label: "Asistencia al Viajero", icon: <ShieldCheck className="w-4 h-4 text-blue-500" /> },
    { id: "parques", label: "Parques", icon: <Ticket className="w-4 h-4 text-amber-500" /> },
  ];

  // Filtrar solo las pestañas habilitadas mediante switch
  const visibleTabs = allTabs.filter((t) => isEnabled(t.id));

  // Tab activo actual (por defecto paquetes)
  const [activeTab, setActiveTab] = useState<OtaSearchTab>(visibleTabs[0]?.id || "paquetes");

  // Form State
  const [origin, setOrigin] = useState("Buenos Aires (BUE)");
  const [destination, setDestination] = useState("San Miguel de Tucumán (TUC)");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("2 Pasajeros");

  // Modal para cotización asistida en servicios sin API directa
  const [assistedQuoteModal, setAssistedQuoteModal] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (onSearch) {
      onSearch(activeTab, { origin, destination, departureDate, returnDate, passengers });
      return;
    }

    if (activeTab === "paquetes") {
      router.push(`/marketplace?destination=${encodeURIComponent(destination)}`);
      return;
    }

    if (activeTab === "actividades") {
      router.push(`/landing/experience/marketplace?destination=${encodeURIComponent(destination)}`);
      return;
    }

    if (activeTab === "traslados") {
      router.push(`/landing/travelcab?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}`);
      return;
    }

    if (activeTab === "buses") {
      router.push("/buses?brand=ecosistema");
      return;
    }

    if (activeTab === "vuelos" || activeTab === "hoteles") {
      router.push(`/marketplace?destination=${encodeURIComponent(destination)}&tab=${activeTab}`);
      return;
    }

    // Para autos, asistencia y parques (cotización asistida inmediata)
    setAssistedQuoteModal(true);
  };

  const getWhatsAppQuoteUrl = () => {
    const text = `Hola TravelApp! Quiero cotizar ${activeTab.toUpperCase()}:\n• Origen/Punto: ${origin}\n• Destino: ${destination}\n• Fecha salida: ${departureDate || "A convenir"}\n• Fecha regreso: ${returnDate || "Solo ida"}\n• Pasajeros/Personas: ${passengers}\n¿Tienen tarifas vigentes y promociones?`;
    return `https://wa.me/5493812000712?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl border border-white/60 font-sans text-slate-800">
      
      {/* Pestañas de Servicios (Hasta 8 activables por switch) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-3 scrollbar-none overscroll-x-contain select-none flex-nowrap border-b border-slate-100">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === "buses") {
                  router.push("/buses?brand=ecosistema");
                  return;
                }
                setActiveTab(tab.id);
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#0A2A5B] text-white shadow-md shadow-blue-950/20 scale-[1.02]"
                  : "bg-slate-100/90 hover:bg-slate-200 text-slate-700 hover:text-slate-900"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
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

      {/* Formulario de Búsqueda Adaptativo */}
      {activeTab === "buses" ? (
        <div className="mt-3.5 sm:mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0A2A5B] to-[#103b7c] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5A19] flex items-center justify-center shrink-0 shadow-md">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                ✦ Boletería Oficial Habilitada · Central de Pasajes
              </span>
              <h4 className="text-sm sm:text-base font-black">
                Pasajes Nacionales en Micro a +1.600 Destinos + Puntos Rewards
              </h4>
              <p className="text-xs text-white/80 mt-0.5">
                Cotizá en vivo en nuestro buscador oficial, emití tu E-Ticket al instante y reservá tu TravelCab a la Terminal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/buses?brand=ecosistema")}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#FF5A19] hover:bg-[#e04c10] text-white font-black text-xs sm:text-sm whitespace-nowrap transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shrink-0"
          >
            <span>Ir a Boletería de Buses</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
      <form onSubmit={handleSearchSubmit} className="mt-3.5 sm:mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Campo 1: Origen o Lugar */}
          <div className="relative group">
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {activeTab === "hoteles" || activeTab === "actividades" || activeTab === "parques" ? "Destino o Ciudad" : "Origen / Partida"}
            </label>
            <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0A2A5B] focus-within:bg-white transition-all">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-[#FF5A19]" />
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder={activeTab === "hoteles" ? "Ej. Bariloche, Mendoza..." : "Ciudad de partida..."}
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Campo 2: Destino */}
          <div className="relative group">
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {activeTab === "hoteles" ? "Alojamiento / Hotel" : activeTab === "actividades" ? "Tour o Excursión" : activeTab === "parques" ? "Parque Temático" : activeTab === "paquetes" ? "Destino del Paquete" : "Destino / Llegada"}
            </label>
            <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0A2A5B] focus-within:bg-white transition-all">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-[#0A2A5B]" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={activeTab === "paquetes" ? "Ej. Cancún, Bariloche, Europa..." : "Ciudad de llegada o hotel..."}
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Campo 3: Fechas de Viaje */}
          <div className="relative group">
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Fechas de Viaje (Ida / Vuelta)
            </label>
            <div className="grid grid-cols-2 gap-1 px-2.5 sm:px-3 py-2 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0A2A5B] focus-within:bg-white transition-all">
              <div className="flex items-center gap-1 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full bg-transparent text-[11px] sm:text-xs font-semibold text-slate-800 focus:outline-none min-w-0"
                />
              </div>
              <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 min-w-0">
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-transparent text-[11px] sm:text-xs font-semibold text-slate-800 focus:outline-none min-w-0"
                />
              </div>
            </div>
          </div>

          {/* Campo 4: Pasajeros y Botón Buscar */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="relative flex-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Pasajeros / Cupos
              </label>
              <div className="flex items-center gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0A2A5B] focus-within:bg-white transition-all">
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
              className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#FF5A19] hover:bg-[#e04c10] text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2 shrink-0 h-[44px] cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </button>
          </div>
        </div>
      </form>
      )}

      {/* Modal de Cotización Asistida para Autos, Asistencia y Parques */}
      {assistedQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100 text-slate-800">
            <button
              onClick={() => setAssistedQuoteModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0A2A5B] text-xs font-bold uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5A19]" />
              <span>Cotización Inmediata TravelApp</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              Cotizar {activeTab.toUpperCase()} para {destination}
            </h3>

            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Te conectamos directamente con nuestro equipo de emisión para congelar tarifa, confirmar cupos y ofrecerte financiación en cuotas fijas.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="font-bold">Servicio:</span>
                <span className="font-extrabold uppercase text-[#0A2A5B]">{activeTab}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Ruta / Destino:</span>
                <span className="font-semibold">{origin} → {destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Fechas:</span>
                <span className="font-semibold">{departureDate || "A convenir"} al {returnDate || "A convenir"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Pasajeros:</span>
                <span className="font-semibold">{passengers}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={getWhatsAppQuoteUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Consultar por WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setAssistedQuoteModal(false)}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
