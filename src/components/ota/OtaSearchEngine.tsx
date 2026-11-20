"use client";

import React, { useState, useEffect } from "react";
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
  whatsappUrl?: string;
  onSearch?: (tab: OtaSearchTab, params: any) => void;
}

export function OtaSearchEngine({
  enabledTabs,
  whatsappUrl = "https://wa.me/5493812000712",
  onSearch,
}: OtaSearchEngineProps) {
  const router = useRouter();

  // Configuración de pestañas activables por switch (por defecto todas true)
  const isEnabled = (tab: OtaSearchTab) => {
    if (!enabledTabs) return true;
    return enabledTabs[tab] !== false;
  };

  const allTabs: { id: OtaSearchTab; label: string; icon: (active: boolean) => React.ReactNode; badge?: string }[] = [
    {
      id: "paquetes",
      label: "Paquetes",
      icon: (active) => <Palmtree className={`w-4 h-4 ${active ? "text-white" : "text-[#0A2A5B]"}`} />,
    },
    { id: "vuelos", label: "Vuelos", icon: (active) => <Plane className={`w-4 h-4 ${active ? "text-white" : "text-[#0A2A5B]"}`} /> },
    { id: "hoteles", label: "Hoteles", icon: (active) => <Building2 className={`w-4 h-4 ${active ? "text-white" : "text-[#0A2A5B]"}`} /> },
    { id: "buses", label: "Buses", icon: (active) => <Bus className={`w-4 h-4 ${active ? "text-white" : "text-[#0A2A5B]"}`} /> },
    {
      id: "actividades",
      label: "Actividades",
      icon: (active) => <Compass className={`w-4 h-4 ${active ? "text-white" : "text-[#0A2A5B]"}`} />,
    },
    {
      id: "traslados",
      label: "Traslados",
      icon: (active) => <Car className={`w-4 h-4 ${active ? "text-white" : "text-[#0A2A5B]"}`} />,
    },
    { id: "autos", label: "Autos", icon: (active) => <Key className={`w-4 h-4 ${active ? "text-white" : "text-[#0A2A5B]"}`} /> },
    { id: "asistencia", label: "Asistencia al Viajero", icon: (active) => <ShieldCheck className={`w-4 h-4 ${active ? "text-white" : "text-[#0A2A5B]"}`} /> },
    { id: "parques", label: "Parques", icon: (active) => <Ticket className={`w-4 h-4 ${active ? "text-white" : "text-[#0A2A5B]"}`} /> },
  ];

  // Filtrar solo las pestañas habilitadas mediante switch
  const visibleTabs = allTabs.filter((t) => isEnabled(t.id));

  // Tab activo actual (por defecto paquetes)
  const [activeTab, setActiveTab] = useState<OtaSearchTab>(visibleTabs[0]?.id || "paquetes");

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [enabledTabs, activeTab]);

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
    const baseDigits = whatsappUrl.replace(/\D/g, "") || "5493812000712";
    return `https://wa.me/${baseDigits}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="w-full bg-white rounded-sm p-4 sm:p-6 shadow-md border border-slate-200 font-sans text-slate-800">
      
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
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-sm text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#0A2A5B] text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#0A2A5B]"
              }`}
            >
              {tab.icon(isActive)}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-sm font-black ${
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
        <div className="mt-3.5 sm:mt-5 p-4 sm:p-5 rounded-sm bg-[#0A2A5B] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-sm bg-red-600 flex items-center justify-center shrink-0">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 block">
                Boletería Oficial Habilitada · Central de Pasajes
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
            className="w-full sm:w-auto px-5 py-3 rounded-sm bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm whitespace-nowrap transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
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
            <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2.5 rounded-sm bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0A2A5B] focus-within:bg-white transition-all">
              <MapPin className="w-4 h-4 text-[#0A2A5B] shrink-0" />
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
            <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2.5 rounded-sm bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0A2A5B] focus-within:bg-white transition-all">
              <MapPin className="w-4 h-4 text-[#0A2A5B] shrink-0" />
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
            <div className="grid grid-cols-2 gap-1 px-2.5 sm:px-3 py-2 rounded-sm bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0A2A5B] focus-within:bg-white transition-all">
              <div className="flex items-center gap-1 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-[#0A2A5B] shrink-0" />
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
              <div className="flex items-center gap-2 px-3 sm:px-3.5 py-2.5 rounded-sm bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus-within:border-[#0A2A5B] focus-within:bg-white transition-all">
                <Users className="w-4 h-4 text-[#0A2A5B] shrink-0" />
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
              className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-2.5 rounded-sm bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-black text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shrink-0 h-[44px] cursor-pointer"
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
          <div className="bg-white rounded-sm max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 text-slate-800">
            <button
              onClick={() => setAssistedQuoteModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-sm hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-slate-100 text-[#0A2A5B] text-xs font-bold uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#0A2A5B]" />
              <span>Cotización Inmediata TravelApp</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              Cotizar {activeTab.toUpperCase()} para {destination}
            </h3>

            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Te conectamos directamente con nuestro equipo de emisión para congelar tarifa, confirmar cupos y ofrecerte financiación en cuotas fijas.
            </p>

            <div className="bg-slate-50 rounded-sm p-4 mb-6 border border-slate-200 text-xs space-y-1.5 text-slate-700">
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
                className="flex-1 py-3 px-4 rounded-sm bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Consultar por WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setAssistedQuoteModal(false)}
                className="py-3 px-4 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
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
