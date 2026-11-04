"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Filter,
  X,
  Plane,
  Ship,
  Bus,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Award,
  Crown,
  Heart,
  Share2,
  HelpCircle,
  Phone,
  MessageCircle,
  ChevronRight,
  ArrowRight,
  Tag,
  Utensils,
  Hotel,
  ArrowLeft,
  Send,
  Check,
  CreditCard,
  Briefcase,
  Ticket,
  Luggage,
  Users,
  Compass
} from "lucide-react";
import { collection, onSnapshot, addDoc, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OtaPackage, OtaPackageType, OtaProviderCategory, OtaModality, OtaActionType } from "@/types/ota";
import { DEFAULT_OTA_PACKAGES } from "@/lib/mockOtaPackages";
import { OtaHeader } from "@/components/ota/OtaHeader";
import { OtaFooter } from "@/components/ota/OtaFooter";

interface OtaMarketplaceClientProps {
  initialCms?: any;
}

export default function OtaMarketplaceClient({ initialCms }: OtaMarketplaceClientProps) {
  const [packages, setPackages] = useState<OtaPackage[]>(DEFAULT_OTA_PACKAGES);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedModality, setSelectedModality] = useState<string>("all");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all");
  const [selectedFoodPlan, setSelectedFoodPlan] = useState<string>("all");
  const [priceSort, setPriceSort] = useState<"none" | "asc" | "desc">("none");

  // Modal de Detalle / Cotización / Reserva
  const [selectedPackage, setSelectedPackage] = useState<OtaPackage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"detalle" | "reserva" | "senar" | "pagar">("detalle");
  const [leadForm, setLeadForm] = useState({ name: "", email: "", phone: "", notes: "", passengersCount: 2 });
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Escuchar paquetes desde Firestore (colección ota_packages), con fallback a DEFAULT_OTA_PACKAGES
  useEffect(() => {
    try {
      const q = query(collection(db, "ota_packages"), limit(50));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            })) as OtaPackage[];
            list.sort((a: any, b: any) =>
              String(b.updatedAt || b.createdAt || "").localeCompare(
                String(a.updatedAt || a.createdAt || "")
              )
            );
            setPackages(list);
          } else {
            setPackages(DEFAULT_OTA_PACKAGES);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore ota_packages no disponible o vacío, usando fallback:", error);
          setPackages(DEFAULT_OTA_PACKAGES);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch {
      setPackages(DEFAULT_OTA_PACKAGES);
      setLoading(false);
    }
  }, []);

  // Filtrado reactivo
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = pkg.title.toLowerCase().includes(q);
        const matchDest = pkg.destination.toLowerCase().includes(q);
        const matchCountry = pkg.country.toLowerCase().includes(q);
        if (!matchTitle && !matchDest && !matchCountry) return false;
      }

      // Región
      if (selectedRegion !== "all" && pkg.region !== selectedRegion) return false;

      // Modalidad (Salida Grupal Acompañada vs Individual)
      if (selectedModality !== "all") {
        if (selectedModality === "grupal" && pkg.modality !== "Salida Grupal Acompañada" && pkg.type !== "salida_grupal") return false;
        if (selectedModality === "individual" && pkg.modality !== "Individual" && pkg.type === "salida_grupal") return false;
      }

      // Proveedor (Salida Propia vs Operador Verificado)
      if (selectedProvider !== "all") {
        const isPropio = pkg.providerCategory === "propio" || pkg.providerType === "propio";
        if (selectedProvider === "propio" && !isPropio) return false;
        if (selectedProvider === "operador_verificado" && isPropio) return false;
      }

      // Moneda de Publicación (USD o ARS)
      if (selectedCurrency !== "all" && pkg.currency !== selectedCurrency) return false;

      // Régimen de comidas
      if (selectedFoodPlan !== "all" && pkg.foodPlan !== selectedFoodPlan) return false;

      return true;
    }).sort((a, b) => {
      const priceA = a.price || a.priceUsd || a.priceArs || 0;
      const priceB = b.price || b.priceUsd || b.priceArs || 0;
      if (priceSort === "asc") return priceA - priceB;
      if (priceSort === "desc") return priceB - priceA;
      return 0;
    });
  }, [packages, searchQuery, selectedRegion, selectedModality, selectedProvider, selectedCurrency, selectedFoodPlan, priceSort]);

  // Manejar consulta directa a CRM y creación de File en Concorde 360 (TravelApp Emisivo)
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || !leadForm.name || !leadForm.phone) return;

    setSubmittingLead(true);
    try {
      const unitPrice = Number(selectedPackage.price || selectedPackage.priceUsd || selectedPackage.priceArs || 0);
      const totalAmount = unitPrice * (leadForm.passengersCount || 1);
      const fileCode = `TA-EMI-${Math.floor(100000 + Math.random() * 900000)}`;

      await Promise.all([
        addDoc(collection(db, "crm_leads"), {
          customerName: leadForm.name,
          customerPhone: leadForm.phone,
          customerEmail: leadForm.email || "",
          passengersCount: leadForm.passengersCount,
          notes: leadForm.notes || "",
          packageId: selectedPackage.id,
          packageTitle: selectedPackage.title,
          destination: selectedPackage.destination,
          currency: selectedPackage.currency,
          price: unitPrice,
          source: "Marketplace OTA Emisivo",
          businessUnit: "travelapp",
          modalMode,
          status: "Nuevo",
          createdAt: new Date().toISOString(),
        }),
        addDoc(collection(db, "experience_reservations"), {
          fileCode,
          businessUnit: "travelapp",
          source: "TravelApp Marketplace (OTA Emisivo)",
          customerName: leadForm.name,
          customerPhone: leadForm.phone,
          customerEmail: leadForm.email || "",
          tourId: selectedPackage.id,
          tourName: selectedPackage.title,
          destination: selectedPackage.destination,
          operatorName: selectedPackage.operatorName || "TravelApp Emisivo",
          paxCount: leadForm.passengersCount || 1,
          cantidadPersonas: leadForm.passengersCount || 1,
          currency: selectedPackage.currency || "USD",
          totalPrice: totalAmount,
          paidAmount: 0,
          status: modalMode === "pagar" || modalMode === "senar" ? "pending_payment" : "pending",
          notes: leadForm.notes || "",
          createdAt: new Date().toISOString(),
        }),
      ]);
      setLeadSubmitted(true);
    } catch (err) {
      console.error("Error al registrar lead/file en Concorde 360:", err);
      alert("Hubo un error al enviar tu consulta. Por favor comunícate directamente por WhatsApp.");
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleShare = (pkg: OtaPackage) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/marketplace?id=${pkg.id}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const openModalWithAction = (pkg: OtaPackage, mode: "detalle" | "reserva" | "senar" | "pagar") => {
    setSelectedPackage(pkg);
    setModalMode(mode);
    setModalOpen(true);
    setLeadSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header Oficial OTA */}
      <OtaHeader />

      {/* Hero Comercial OTA */}
      <section className="relative bg-gradient-to-br from-[#07162c] via-[#0A2A5B] to-[#124285] text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-sky-200 text-xs font-bold uppercase tracking-wider mb-4">
            <Plane className="w-3.5 h-3.5 text-sky-300" />
            <span>TravelMarket Turismo Emisivo</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Paquetes Turísticos & Salidas Acompañadas
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Explorá salidas grupales exclusivas con coordinador TravelApp y paquetes de operadores internacionales verificados.
            Tarifas transparentes publicadas en su moneda oficial y beneficios exclusivos para socios del Club Rewards.
          </p>

          {/* Barra de Búsqueda Rápida */}
          <div className="mt-8 max-w-4xl mx-auto bg-white p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-slate-200 text-slate-800">
            <div className="flex flex-col md:flex-row items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl w-full">
                <Search className="h-5 w-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="¿A dónde querés viajar? (ej. Cancún, Bariloche, Europa, Brasil...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs sm:text-sm font-semibold outline-none w-full placeholder:text-slate-400 text-slate-800"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Selector de Modalidad y Región */}
              <div className="flex items-center gap-1.5 w-full md:w-auto">
                <select
                  value={selectedModality}
                  onChange={(e) => setSelectedModality(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 outline-none cursor-pointer w-full md:w-auto"
                >
                  <option value="all">Todas las Modalidades</option>
                  <option value="grupal">👥 Salidas Grupales Acompañadas</option>
                  <option value="individual">👤 Viajes Individuales</option>
                </select>

                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 outline-none cursor-pointer w-full md:w-auto"
                >
                  <option value="all">Todas las Regiones</option>
                  <option value="Nacional">Destinos Nacionales</option>
                  <option value="Internacional">Destinos Internacionales</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido Principal con Filtros y Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Filtros avanzados en pills */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5" /> Filtrar:
            </span>

            {/* Pill: Salida Propia vs Operador Verificado */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedProvider("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedProvider === "all" ? "bg-white text-tech-blue shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Todos los Proveedores
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider("propio")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedProvider === "propio" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ⭐ Salidas Propias
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider("operador_verificado")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedProvider === "operador_verificado" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🛡️ Operadores Verificados
              </button>
            </div>

            {/* Pill: Moneda */}
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer shadow-xs"
            >
              <option value="all">Todas las Monedas</option>
              <option value="USD">💵 Publicados en USD</option>
              <option value="ARS">🇦🇷 Publicados en ARS</option>
            </select>

            {/* Pill: Régimen */}
            <select
              value={selectedFoodPlan}
              onChange={(e) => setSelectedFoodPlan(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer shadow-xs"
            >
              <option value="all">Cualquier Régimen</option>
              <option value="All Inclusive">All Inclusive</option>
              <option value="Media Pensión">Media Pensión</option>
              <option value="Desayuno">Con Desayuno</option>
              <option value="Pensión Completa">Pensión Completa</option>
            </select>
          </div>

          {/* Ordenar y contador */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">
              {filteredPackages.length} viaje{filteredPackages.length === 1 ? "" : "s"} disponible{filteredPackages.length === 1 ? "" : "s"}
            </span>

            <select
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value as any)}
              className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer shadow-xs"
            >
              <option value="none">Ordenar: Recomendados</option>
              <option value="asc">Precio: Menor a Mayor</option>
              <option value="desc">Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>

        {/* Notificación de Copiado de Link */}
        {copiedLink && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
            <Check className="h-4 w-4" /> Enlace copiado al portapapeles
          </div>
        )}

        {/* Grid de Paquetes OTA */}
        {filteredPackages.length === 0 ? (
          <div className="py-20 text-center">
            <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No encontramos viajes con esos filtros</h3>
            <p className="text-xs text-slate-400 mt-1">Probá cambiando los términos de búsqueda o limpiando los filtros.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedRegion("all");
                setSelectedModality("all");
                setSelectedProvider("all");
                setSelectedCurrency("all");
                setSelectedFoodPlan("all");
              }}
              className="mt-4 px-4 py-2 bg-tech-blue text-white rounded-xl text-xs font-bold hover:bg-tech-blue/90"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPackages.map((pkg) => {
              const isPropio = pkg.providerCategory === "propio" || pkg.providerType === "propio";
              const isGrupal = pkg.modality === "Salida Grupal Acompañada" || pkg.type === "salida_grupal";
              const currencySymbol = pkg.currency === "USD" ? "USD " : "$ ";
              const mainPrice = pkg.price || (pkg.currency === "USD" ? pkg.priceUsd : pkg.priceArs) || 0;
              const actions: OtaActionType[] = pkg.enabledActions && pkg.enabledActions.length > 0
                ? pkg.enabledActions
                : ['ver_detalle', 'whatsapp', 'reservar'];

              return (
                <div
                  key={pkg.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                >
                  {/* Imagen y Badges */}
                  <div className="relative h-60 w-full overflow-hidden bg-slate-100">
                    <img
                      src={pkg.imageUrl}
                      alt={pkg.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

                    {/* Badges Superiores Izquierdos */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      {/* Badge de Modalidad */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm text-white ${
                        isGrupal ? "bg-purple-600/90" : "bg-slate-800/90"
                      }`}>
                        <Users className="h-3 w-3" />
                        {isGrupal ? "Salida Grupal Acompañada" : "Viaje Individual"}
                      </span>

                      {/* Badge de Origen / Operador: OMITIR nombre de mayorista, solo 'Operador Verificado' o 'Salida Propia' */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm text-white ${
                        isPropio ? "bg-emerald-600/95" : "bg-blue-600/95"
                      }`}>
                        {isPropio ? <Award className="h-3 w-3 text-amber-300" /> : <ShieldCheck className="h-3 w-3 text-sky-200" />}
                        {isPropio ? "⭐ Salida Propia TravelApp" : "🛡️ Operador Verificado"}
                      </span>

                      {/* Badge de Cupos: SÓLO para stock de salidas propias */}
                      {isPropio && pkg.stockBadge && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 shadow-md">
                          <Sparkles className="h-3 w-3" />
                          {pkg.stockBadge}
                        </span>
                      )}
                    </div>

                    {/* Botón Compartir */}
                    <button
                      type="button"
                      onClick={() => handleShare(pkg)}
                      title="Copiar enlace del viaje"
                      className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center transition-all shadow-md backdrop-blur-xs"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>

                    {/* Destino y Duración en la base de la foto */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="flex items-center gap-1 font-bold bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                        <MapPin className="h-3.5 w-3.5 text-sky-300" />
                        {pkg.destination}, {pkg.country}
                      </span>
                      <span className="flex items-center gap-1 font-extrabold bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                        <Clock className="h-3.5 w-3.5 text-amber-300" />
                        {pkg.durationDays}D / {pkg.durationNights}N
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo de la Card */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Título */}
                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug group-hover:text-tech-blue transition-colors line-clamp-2">
                        {pkg.title}
                      </h3>

                      {/* Descripción corta */}
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                        {pkg.description}
                      </p>

                      {/* Bloque Logística & Transporte */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-700">
                        {/* Transporte: Aéreo */}
                        {pkg.transportType === "Aéreo" && (
                          <>
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-tech-blue border border-blue-100 px-2 py-1 rounded-lg">
                              <Plane className="h-3 w-3 text-tech-blue" />
                              {pkg.airline || "Vuelo Incluido"}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-lg">
                              <Luggage className="h-3 w-3 text-slate-500" />
                              {typeof pkg.luggageIncluded === "string"
                                ? pkg.luggageIncluded
                                : pkg.luggageIncluded
                                ? "Equipaje en bodega incluido"
                                : "Solo equipaje de mano"}
                            </span>
                          </>
                        )}

                        {/* Transporte: Bus */}
                        {(pkg.transportType === "Bus" || pkg.transportType === "Bus Cama" || pkg.transportType === "Bus Semicama") && (
                          <>
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg">
                              <Bus className="h-3 w-3 text-amber-600" />
                              Bus {pkg.busType || (pkg.transportType === "Bus Cama" ? "Cama" : "Semicama")}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-lg">
                              <Luggage className="h-3 w-3 text-slate-500" />
                              {typeof pkg.luggageIncluded === "string" ? pkg.luggageIncluded : "Bodega de bus incluida"}
                            </span>
                          </>
                        )}

                        {/* Transporte: Crucero */}
                        {pkg.transportType === "Crucero" && (
                          <>
                            <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-1 rounded-lg">
                              <Ship className="h-3 w-3 text-cyan-600" />
                              Crucero
                            </span>
                            {pkg.cruiseCabin && (
                              <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg">
                                {pkg.cruiseCabin}
                              </span>
                            )}
                          </>
                        )}

                        {/* Hotel y Régimen */}
                        {pkg.hotelName && (
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                            <Hotel className="h-3 w-3 text-indigo-500" />
                            {pkg.hotelStars ? `${pkg.hotelStars}★ ` : ""}{pkg.hotelName}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                          <Utensils className="h-3 w-3 text-emerald-600" />
                          {pkg.foodPlan}
                        </span>
                      </div>

                      {/* Escalas si es crucero */}
                      {pkg.transportType === "Crucero" && pkg.cruisePorts && (
                        <div className="mt-2 text-[10px] text-slate-500 font-semibold bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1">
                          <Compass className="h-3.5 w-3.5 text-cyan-600 shrink-0 mt-0.5" />
                          <span><strong>Escalas:</strong> {pkg.cruisePorts}</span>
                        </div>
                      )}

                      {/* Chips de Salidas */}
                      {pkg.departureDates && pkg.departureDates.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" /> Salidas Programadas:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {pkg.departureDates.map((date, idx) => (
                              <span
                                key={idx}
                                className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50/80 text-tech-blue border border-blue-100"
                              >
                                {date}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Precios, Financiación y Rewards */}
                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      {/* Precios (Moneda de publicación única, sin conversión automática) */}
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tarifa por Pasajero ({pkg.currency})
                          </span>
                          <span className="text-2xl font-black text-slate-900 tracking-tight">
                            {currencySymbol}{mainPrice.toLocaleString("es-AR")}
                          </span>
                        </div>

                        {/* Puntos Acumulables al viajar */}
                        {pkg.rewardsPointsEarned && (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                              <Sparkles className="h-3 w-3 text-amber-500" />
                              +{pkg.rewardsPointsEarned} pts Rewards
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Precio para Miembros Rewards (si está configurado) */}
                      {pkg.memberPrice && (
                        <div className="bg-gradient-to-r from-emerald-50 to-lime-50 border border-emerald-200/80 rounded-xl p-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                            <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>Precio Socio Club Rewards:</span>
                          </div>
                          <span className="font-black text-emerald-900 text-sm">
                            {currencySymbol}{pkg.memberPrice.toLocaleString("es-AR")}
                          </span>
                        </div>
                      )}

                      {/* Texto Libre de Financiación */}
                      {(pkg.financingText || pkg.installments) && (
                        <div className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-tech-blue shrink-0" />
                          <span>{pkg.financingText || pkg.installments}</span>
                        </div>
                      )}

                      {/* Puntos Necesarios para Canjear el Viaje */}
                      {pkg.rewardsPointsRequired && (
                        <div className="text-[10px] font-bold text-purple-700 bg-purple-50/70 border border-purple-100 px-2 py-1 rounded-lg flex items-center justify-between">
                          <span>Canje 100% con Puntos Rewards:</span>
                          <span className="font-black">{pkg.rewardsPointsRequired.toLocaleString("es-AR")} pts</span>
                        </div>
                      )}

                      {/* Botones de Acción Seleccionables */}
                      <div className="pt-2 grid grid-cols-2 gap-2">
                        {actions.includes("ver_detalle") && (
                          <button
                            type="button"
                            onClick={() => openModalWithAction(pkg, "detalle")}
                            className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                          >
                            Ver Detalle
                          </button>
                        )}

                        {actions.includes("whatsapp") && (
                          <a
                            href={`https://wa.me/5493812000712?text=${encodeURIComponent(
                              `Hola TravelApp! Me interesa consultar por el viaje "${pkg.title}" (${pkg.id}) con destino a ${pkg.destination}. ¿Tienen disponibilidad y opciones de pago?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        )}

                        {actions.includes("reservar") && (
                          <button
                            type="button"
                            onClick={() => openModalWithAction(pkg, "reserva")}
                            className="py-2.5 px-3 rounded-xl bg-tech-blue hover:bg-blue-700 text-white text-xs font-black transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Ticket className="h-3.5 w-3.5" /> Reservar
                          </button>
                        )}

                        {actions.includes("senar") && (
                          <button
                            type="button"
                            onClick={() => openModalWithAction(pkg, "senar")}
                            className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                          >
                            Señar Cupo
                          </button>
                        )}

                        {actions.includes("pagar") && (
                          <button
                            type="button"
                            onClick={() => openModalWithAction(pkg, "pagar")}
                            className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Pagar Viaje
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Detalle, Reserva, Seña o Pago */}
      {modalOpen && selectedPackage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header con Foto */}
            <div className="relative h-60 w-full">
              <img
                src={selectedPackage.imageUrl}
                alt={selectedPackage.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-all"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 px-2 py-0.5 rounded-full">
                    {selectedPackage.providerCategory === "propio" || selectedPackage.providerType === "propio"
                      ? "⭐ Salida Propia TravelApp"
                      : "🛡️ Operador Verificado"}
                  </span>
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    {selectedPackage.modality || "Salida Turística"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">{selectedPackage.title}</h2>
                <p className="text-xs text-slate-200">
                  {selectedPackage.destination}, {selectedPackage.country} · {selectedPackage.durationDays} Días / {selectedPackage.durationNights} Noches
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Descripción del Viaje</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{selectedPackage.description}</p>
              </div>

              {/* Servicios Incluidos */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">Servicios Incluidos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedPackage.includedServices.map((srv, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{srv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fechas y Salidas */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block">Salidas Programadas:</span>
                    <span className="font-extrabold text-slate-800">{selectedPackage.departureDates.join(" · ")}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block">Origen:</span>
                    <span className="font-extrabold text-slate-800">{selectedPackage.departureOrigin}</span>
                  </div>
                </div>
              </div>

              {/* Formulario de Cotización / Reserva / Seña */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
                  <Send className="h-4 w-4 text-[#FF7A00]" />
                  {modalMode === "senar"
                    ? "Señar Cupo con Time-to-Pay"
                    : modalMode === "pagar"
                    ? "Pagar Viaje / Checkout Directo"
                    : modalMode === "reserva"
                    ? "Completar Solicitud de Reserva"
                    : "Solicitar Cotización Oficial"}
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Un asesor de TravelApp coordinará tus cupos, formas de pago (NAVE Galicia, Transferencia o Tarjeta) y documentación.
                </p>

                {leadSubmitted ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <h5 className="text-sm font-black text-emerald-800">¡Solicitud Recibida con Éxito!</h5>
                    <p className="text-xs text-emerald-700">Te asignamos un asesor oficial que te enviará la confirmación por WhatsApp a la brevedad.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitLead} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Completo *</label>
                        <input
                          type="text"
                          required
                          value={leadForm.name}
                          onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                          placeholder="Tu nombre y apellido"
                          className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-tech-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">WhatsApp / Teléfono *</label>
                        <input
                          type="tel"
                          required
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          placeholder="+54 9 ..."
                          className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-tech-blue"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Correo Electrónico</label>
                        <input
                          type="email"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                          placeholder="tu@email.com"
                          className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-tech-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Cantidad de Pasajeros</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={leadForm.passengersCount}
                          onChange={(e) => setLeadForm({ ...leadForm, passengersCount: Number(e.target.value) })}
                          className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-tech-blue"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Comentarios / Fecha preferida</label>
                      <textarea
                        rows={2}
                        value={leadForm.notes}
                        onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                        placeholder="Indicá fecha aproximada, tipo de habitación o dudas..."
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-tech-blue resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingLead}
                      className="w-full py-3 rounded-xl bg-tech-blue hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingLead ? "Enviando..." : modalMode === "senar" ? "Confirmar y Señar Cupo" : "Enviar Solicitud"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Oficial */}
      <OtaFooter />
    </div>
  );
}
