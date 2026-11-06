"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { CheckCircle2, Loader2 } from "lucide-react";

export interface ExcursionSearchFilters {
  origen: string;
  tiempoExcursion: string;
  fecha: string;
}

interface ExperienceSearchEngineProps {
  activeMode?: "excursiones" | "traslados";
  onModeChange?: (mode: "excursiones" | "traslados") => void;
  onFilterExcursions?: (filters: ExcursionSearchFilters) => void;
}

interface TransferTariff {
  id: string;
  origin: string;
  destination: string;
  price: number;
  currency?: string;
}

const FALLBACK_TRANSFER_TARIFFS: TransferTariff[] = [
  {
    id: "tf-1",
    origin: "Aeropuerto Tucumán (TUC)",
    destination: "Hoteles Centro San Miguel de Tucumán",
    price: 22000,
  },
  {
    id: "tf-2",
    origin: "San Miguel de Tucumán",
    destination: "Tafí del Valle",
    price: 95000,
  },
  {
    id: "tf-3",
    origin: "San Miguel de Tucumán",
    destination: "Termas de Río Hondo",
    price: 85000,
  },
  {
    id: "tf-4",
    origin: "Aeropuerto Salta (SLA)",
    destination: "Hoteles Salta Capital",
    price: 24000,
  },
  {
    id: "tf-5",
    origin: "Salta Capital",
    destination: "Cafayate",
    price: 115000,
  },
  {
    id: "tf-6",
    origin: "Salta Capital",
    destination: "Purmamarca / Tilcara",
    price: 125000,
  },
];

const ORIGENES_EXCURSIONES = [
  "Todos los orígenes",
  "San Miguel de Tucumán",
  "Salta Capital",
  "San Salvador de Jujuy",
  "Purmamarca / Tilcara",
  "Cafayate",
  "San Fernando del Valle de Catamarca",
];

const TIEMPOS_EXCURSION = [
  "Cualquier duración",
  "Medio Día (4 a 5 hs)",
  "Día Completo (8 a 12 hs)",
  "Nocturna / Astroturismo",
  "Travesía Multi-día (2 o más días)",
];

export function ExperienceSearchEngine({
  activeMode = "excursiones",
  onModeChange,
  onFilterExcursions,
}: ExperienceSearchEngineProps) {
  const [mode, setMode] = useState<"excursiones" | "traslados">(activeMode);

  useEffect(() => {
    setMode(activeMode);
  }, [activeMode]);

  const handleTabSwitch = (newMode: "excursiones" | "traslados") => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  // Estado Buscador Excursiones (Origen - Tiempo de excursión - Fecha)
  const [origenExcursion, setOrigenExcursion] = useState("");
  const [tiempoExcursion, setTiempoExcursion] = useState("");
  const [fechaExcursion, setFechaExcursion] = useState("");

  // Estado Despachador de Traslados (Réplica exacta del Despachador solo Traslados)
  const [transferTariffs, setTransferTariffs] = useState<TransferTariff[]>(
    FALLBACK_TRANSFER_TARIFFS
  );
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "TRANSFER" | "WALLET" | "MERCADOPAGO"
  >("MERCADOPAGO");
  const [transferOrigin, setTransferOrigin] = useState("");
  const [transferDestination, setTransferDestination] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [transferSuccessId, setTransferSuccessId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "tariffs"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter(
            (t) =>
              t.type === "transfers" &&
              t.origin &&
              t.destination &&
              typeof t.price === "number"
          ) as TransferTariff[];

        if (list.length > 0) {
          setTransferTariffs(list);
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const uniqueOrigins = Array.from(
    new Set(transferTariffs.map((t) => t.origin))
  );
  const availableDestinations = transferTariffs.filter(
    (t) => t.origin === transferOrigin
  );
  const selectedTariff = transferTariffs.find(
    (t) => t.origin === transferOrigin && t.destination === transferDestination
  );

  const handleExcursionSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterExcursions?.({
      origen:
        origenExcursion === "Todos los orígenes" ? "" : origenExcursion,
      tiempoExcursion:
        tiempoExcursion === "Cualquier duración" ? "" : tiempoExcursion,
      fecha: fechaExcursion,
    });

    const catalogEl = document.getElementById("catalogo-excursiones");
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDispatchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferOrigin || !transferDestination || !passengerPhone) return;

    setSubmittingTransfer(true);
    setTransferSuccessId(null);

    try {
      const price = selectedTariff?.price || 25000;
      const docRef = await addDoc(collection(db, "trips"), {
        serviceType: "TRANSFER",
        modality: "PASSENGER",
        status: "SEARCHING",
        origin: { address: transferOrigin, lat: -26.8241, lng: -65.2226 },
        destination: {
          address: transferDestination,
          lat: -26.84,
          lng: -65.11,
        },
        passengerName: passengerName || "Pasajero Web Experience",
        passengerPhone,
        paymentMethod,
        scheduledDate:
          transferDate || new Date().toISOString().split("T")[0],
        notes: flightNumber ? `Vuelo / Ref: ${flightNumber}` : "",
        estimatedFare: price,
        tariffId: selectedTariff?.id || null,
        source: "WEB_EXPERIENCE_DISPATCHER",
        createdAt: serverTimestamp(),
      });

      setTransferSuccessId(docRef.id.slice(0, 8).toUpperCase());
      setPassengerName("");
      setPassengerPhone("");
      setFlightNumber("");
    } catch {
      const text = `*Solicitud de Traslado Punto a Punto - TravelApp Experience*
• *Pasajero:* ${passengerName || "Pasajero"} (${passengerPhone})
• *Origen:* ${transferOrigin}
• *Destino:* ${transferDestination}
• *Fecha:* ${transferDate || "A coordinar"}
• *Tarifa Fija:* $${(selectedTariff?.price || 25000).toLocaleString("es-AR")}`;
      window.open(
        `https://wa.me/5493812000712?text=${encodeURIComponent(text)}`,
        "_blank"
      );
    } finally {
      setSubmittingTransfer(false);
    }
  };

  return (
    <div
      id="buscador-experience"
      className="w-full bg-white border-b border-[#d2d2d7]"
    >
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-7 sm:py-9">
        
        {/* CABECERA MINIMALISTA + CONTROL SEGMENTADO ESTILO APPLE */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[21px] sm:text-[24px] font-semibold text-[#1d1d1f] tracking-[-0.015em]">
              {mode === "excursiones"
                ? "Encontrá tu próxima experiencia."
                : "Solicitá tu traslado punto a punto."}
            </h2>
          </div>

          {/* Segmented Control Estilo Apple iOS / macOS */}
          <div className="inline-flex p-1 rounded-full bg-[#f5f5f7] border border-[#e5e5ea]">
            <button
              type="button"
              onClick={() => handleTabSwitch("excursiones")}
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-[-0.01em] transition-all cursor-pointer ${
                mode === "excursiones"
                  ? "bg-white text-[#1d1d1f] shadow-sm"
                  : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              Excursiones
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch("traslados")}
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-[-0.01em] transition-all cursor-pointer ${
                mode === "traslados"
                  ? "bg-white text-[#1d1d1f] shadow-sm"
                  : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              Traslados
            </button>
            <a
              href="/buses?brand=experience"
              className="px-5 py-1.5 rounded-full text-[13px] font-medium tracking-[-0.01em] text-[#86868b] hover:text-[#1d1d1f] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Pasajes en Bus</span>
            </a>
          </div>
        </div>

        {/* MODO 1: BUSCADOR DE EXCURSIONES (Origen - Tiempo de excursión - Fecha) */}
        {mode === "excursiones" ? (
          <form
            onSubmit={handleExcursionSearch}
            className="grid grid-cols-1 md:grid-cols-12 rounded-2xl border border-[#d2d2d7] bg-[#fbfbfd] overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#d2d2d7]"
          >
            {/* Campo 1: Origen */}
            <div className="md:col-span-4 px-5 py-3.5 flex flex-col justify-center">
              <label className="text-[11px] font-medium text-[#86868b] tracking-tight">
                Origen
              </label>
              <select
                value={origenExcursion}
                onChange={(e) => setOrigenExcursion(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-[15px] font-medium text-[#1d1d1f] focus:outline-none cursor-pointer"
              >
                {ORIGENES_EXCURSIONES.map((orig) => (
                  <option key={orig} value={orig}>
                    {orig}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo 2: Tiempo de excursión */}
            <div className="md:col-span-4 px-5 py-3.5 flex flex-col justify-center">
              <label className="text-[11px] font-medium text-[#86868b] tracking-tight">
                Tiempo de excursión
              </label>
              <select
                value={tiempoExcursion}
                onChange={(e) => setTiempoExcursion(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-[15px] font-medium text-[#1d1d1f] focus:outline-none cursor-pointer"
              >
                {TIEMPOS_EXCURSION.map((tiempo) => (
                  <option key={tiempo} value={tiempo}>
                    {tiempo}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo 3: Fecha */}
            <div className="md:col-span-2 px-5 py-3.5 flex flex-col justify-center">
              <label className="text-[11px] font-medium text-[#86868b] tracking-tight">
                Fecha
              </label>
              <input
                type="date"
                value={fechaExcursion}
                onChange={(e) => setFechaExcursion(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-[14px] font-medium text-[#1d1d1f] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Botón Buscar */}
            <div className="md:col-span-2 p-2.5 flex items-center justify-center bg-white">
              <button
                type="submit"
                className="w-full h-full min-h-[42px] rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-normal tracking-[-0.01em] transition-colors cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </form>
        ) : (
          /* MODO 2: RÉPLICA DE LA TARJETA DE BÚSQUEDA DEL DESPACHADOR (SOLO TRASLADOS) */
          <form
            onSubmit={handleDispatchTransfer}
            className="rounded-2xl border border-[#d2d2d7] bg-[#fbfbfd] p-5 sm:p-6 space-y-5"
          >
            {/* Fila 1: Pasajero, Teléfono, Medio de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-[#d2d2d7] px-4 py-2.5">
                <label className="block text-[11px] font-medium text-[#86868b]">
                  Nombre del Pasajero
                </label>
                <input
                  type="text"
                  required
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Nombre y apellido"
                  className="mt-0.5 w-full bg-transparent text-[14px] font-medium text-[#1d1d1f] focus:outline-none"
                />
              </div>

              <div className="bg-white rounded-xl border border-[#d2d2d7] px-4 py-2.5">
                <label className="block text-[11px] font-medium text-[#86868b]">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="+54 9 381 ..."
                  className="mt-0.5 w-full bg-transparent text-[14px] font-medium text-[#1d1d1f] focus:outline-none"
                />
              </div>

              <div className="bg-white rounded-xl border border-[#d2d2d7] px-4 py-2.5">
                <label className="block text-[11px] font-medium text-[#86868b]">
                  Medio de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mt-0.5 w-full bg-transparent text-[14px] font-medium text-[#1d1d1f] focus:outline-none cursor-pointer"
                >
                  <option value="MERCADOPAGO">MercadoPago / Tarjeta</option>
                  <option value="TRANSFER">Transferencia Bancaria</option>
                  <option value="CASH">Efectivo</option>
                  <option value="WALLET">Billetera TravelApp</option>
                </select>
              </div>
            </div>

            {/* Fila 2: Origen del Traslado, Destino del Traslado, Fecha y Vuelo */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-4 bg-white rounded-xl border border-[#d2d2d7] px-4 py-2.5">
                <label className="block text-[11px] font-medium text-[#86868b]">
                  Origen del Traslado
                </label>
                <select
                  required
                  value={transferOrigin}
                  onChange={(e) => {
                    setTransferOrigin(e.target.value);
                    setTransferDestination("");
                  }}
                  className="mt-0.5 w-full bg-transparent text-[14px] font-medium text-[#1d1d1f] focus:outline-none cursor-pointer"
                >
                  <option value="">Seleccionar origen...</option>
                  {uniqueOrigins.map((orig) => (
                    <option key={orig} value={orig}>
                      {orig}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4 bg-white rounded-xl border border-[#d2d2d7] px-4 py-2.5">
                <label className="block text-[11px] font-medium text-[#86868b]">
                  Destino del Traslado
                </label>
                <select
                  required
                  disabled={!transferOrigin}
                  value={transferDestination}
                  onChange={(e) => setTransferDestination(e.target.value)}
                  className="mt-0.5 w-full bg-transparent text-[14px] font-medium text-[#1d1d1f] focus:outline-none disabled:opacity-40 cursor-pointer"
                >
                  <option value="">
                    {transferOrigin
                      ? "Seleccionar destino..."
                      : "Primero elegí origen..."}
                  </option>
                  {availableDestinations.map((t) => (
                    <option key={t.id} value={t.destination}>
                      {t.destination} — ${t.price.toLocaleString("es-AR")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 bg-white rounded-xl border border-[#d2d2d7] px-4 py-2.5">
                <label className="block text-[11px] font-medium text-[#86868b]">
                  Fecha
                </label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="mt-0.5 w-full bg-transparent text-[14px] font-medium text-[#1d1d1f] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 bg-white rounded-xl border border-[#d2d2d7] px-4 py-2.5">
                <label className="block text-[11px] font-medium text-[#86868b]">
                  Vuelo / Hotel
                </label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  placeholder="Ej. AR 1472"
                  className="mt-0.5 w-full bg-transparent text-[14px] font-medium text-[#1d1d1f] focus:outline-none"
                />
              </div>
            </div>

            {/* Fila 3: Resumen Tarifario + Botón Píldora Apple */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#e5e5ea]">
              <div className="text-[14px] text-[#86868b]">
                {selectedTariff ? (
                  <span>
                    Tarifa oficial punto a punto:{" "}
                    <strong className="text-[#1d1d1f] font-semibold">
                      ${selectedTariff.price.toLocaleString("es-AR")} ARS
                    </strong>
                  </span>
                ) : (
                  <span>
                    Seleccioná origen y destino para visualizar la tarifa fija.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {transferSuccessId && (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Traslado #{transferSuccessId} registrado
                  </span>
                )}

                <button
                  type="submit"
                  disabled={
                    submittingTransfer ||
                    !transferOrigin ||
                    !transferDestination
                  }
                  className="px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-40 text-white text-[14px] font-normal tracking-[-0.01em] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {submittingTransfer && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span>Confirmar traslado</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
