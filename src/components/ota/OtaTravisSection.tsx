"use client";

import React from "react";
import Image from "next/image";
import {
  Bot,
  MessageSquare,
  Zap,
  Clock,
  ShieldCheck,
  ArrowRight,
  Send,
} from "lucide-react";

export interface OtaTravisSectionConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  features?: Array<{ title: string; desc: string }>;
}

interface OtaTravisSectionProps {
  whatsappUrl?: string;
  config?: OtaTravisSectionConfig;
  onOpenContacto?: () => void;
}

const DEFAULT_FEATURES = [
  {
    title: "Cotizaciones al Instante",
    desc: "Decile qué presupuesto tenés y cuántos viajan. Travis busca las mejores combinaciones de aéreo + hotel.",
  },
  {
    title: "Disponibilidad 24/7",
    desc: "Respondé dudas a las 3 de la mañana, fines de semana o feriados. Travis siempre está despierto para vos.",
  },
  {
    title: "Omnicanal por WhatsApp",
    desc: "Podés chatear desde la web o directamente agregarlo a WhatsApp para enviar notas de voz o mensajes.",
  },
  {
    title: "Soporte Operativo",
    desc: "Consultá el estado de tu vuelo, tu reserva de hotel o pedí un móvil de TravelCab a través de Travis.",
  },
];

export function OtaTravisSection({
  whatsappUrl = "https://wa.me/5493812000712?text=Hola%20Travis!%20Quiero%20planificar%20un%20viaje%20con%20TravelApp",
  config,
  onOpenContacto,
}: OtaTravisSectionProps) {
  if (config?.enabled === false) return null;

  const badge = config?.badge || "Inteligencia Artificial de Viajes";
  const title = config?.title || "Conocé a Travis, tu copiloto y asistente virtual 24/7";
  const subtitle =
    config?.subtitle ||
    "Travis no es un chatbot tradicional: es un asistente inteligente entrenado exclusivamente con las tarifas, rutas, hoteles y excursiones del ecosistema TravelApp. Te atiende en segundos, sin esperas y por el canal que prefieras.";
  const primaryCtaText = config?.primaryCtaText || "Hablar con Travis por WhatsApp";
  const secondaryCtaText = config?.secondaryCtaText || "Conocer Más";
  const features =
    Array.isArray(config?.features) && config.features.length > 0
      ? config.features
      : DEFAULT_FEATURES;

  const featureIcons = [Zap, Clock, MessageSquare, ShieldCheck];

  return (
    <section id="travis" className="py-16 sm:py-24 bg-slate-50 text-slate-900 font-sans border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Columna Izquierda: Presentación y Funciones de Travis */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white border border-slate-200 text-[#0A2A5B] text-xs font-extrabold uppercase tracking-wider">
              <Bot className="w-4 h-4 text-[#0A2A5B]" />
              <span>{badge}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-slate-900">
              {title}
            </h2>

            <p className="text-sm sm:text-lg text-slate-600 font-medium leading-relaxed">
              {subtitle}
            </p>

            {/* Grilla de 4 Capacidades Principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 text-left">
              {features.map((feat, idx) => {
                const IconComp = featureIcons[idx % featureIcons.length];
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-sm bg-white border border-slate-200 hover:border-[#0A2A5B]/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-sm bg-[#0A2A5B] text-white flex items-center justify-center mb-3">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      {feat.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Botones de Acción */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center sm:justify-start gap-3 sm:gap-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-sm bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{primaryCtaText}</span>
              </a>

              <a
                href="#contacto"
                onClick={(e) => {
                  if (onOpenContacto) {
                    e.preventDefault();
                    onOpenContacto();
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-sm bg-white hover:bg-slate-100 text-[#0A2A5B] font-bold text-xs sm:text-sm border border-slate-300 transition-colors"
              >
                <span>{secondaryCtaText}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta / Interfaz Interactiva de Travis */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-md bg-white rounded-sm p-5 sm:p-6 border border-slate-200 shadow-lg relative">
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200">
                <div className="relative w-12 h-12 rounded-sm bg-[#0A2A5B] p-1 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/assets/travis_primer_plano.svg"
                    alt="Travis Asistente Oficial"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">Travis AI</h4>
                    <span className="text-[10px] font-bold text-[#0A2A5B] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-sm">Oficial</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    En línea · Responde en segundos
                  </p>
                </div>
              </div>

              <div className="py-4 space-y-3.5 text-xs">
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-sm bg-[#0A2A5B] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    T
                  </div>
                  <div className="bg-slate-100 p-3 rounded-sm text-slate-700 leading-relaxed border border-slate-200">
                    ¡Hola! Soy Travis de TravelApp ✈️ ¿Estás pensando en una escapada o unas vacaciones largas?
                  </div>
                </div>

                <div className="flex gap-2.5 items-start justify-end">
                  <div className="bg-[#0A2A5B] p-3 rounded-sm text-white leading-relaxed max-w-[80%] font-medium">
                    Hola Travis! Busco paquete a Cancún para 2 personas en noviembre con All Inclusive.
                  </div>
                </div>

                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-sm bg-[#0A2A5B] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    T
                  </div>
                  <div className="bg-slate-100 p-3 rounded-sm text-slate-700 leading-relaxed border border-slate-200 space-y-2">
                    <p>
                      ¡Excelente elección! Tengo una salida confirmada con <strong className="text-slate-900">Juliá Tours</strong> en el <strong className="text-slate-900">Riu Tequila 5★</strong>:
                    </p>
                    <div className="bg-white p-2.5 rounded-sm border border-slate-200 text-[11px] space-y-1">
                      <div className="text-[#0A2A5B] font-extrabold">🌴 8 Días / 7 Noches All Inclusive 24hs</div>
                      <div className="text-slate-600">✈️ Vuelos directos con Copa Airlines + Equipaje</div>
                      <div className="text-slate-900 font-extrabold">💳 Hasta 6 cuotas fijas + 850 pts Rewards</div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ¿Querés que te reserve los cupos o te envíe el PDF completo?
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
                <div className="flex-1 bg-slate-50 rounded-sm px-3 py-2 text-xs text-slate-400 border border-slate-200">
                  Escribí tu consulta para Travis...
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-sm bg-[#0A2A5B] hover:bg-[#071d3f] text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
