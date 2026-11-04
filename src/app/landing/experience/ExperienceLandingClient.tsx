"use client";

import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ExperienceHeader } from "@/components/experience/ExperienceHeader";
import { ExperienceHeroSlider } from "@/components/experience/ExperienceHeroSlider";
import {
  ExperienceSearchEngine,
  ExcursionSearchFilters,
} from "@/components/experience/ExperienceSearchEngine";
import { ExperienceCatalogCarousel } from "@/components/experience/ExperienceCatalogCarousel";
import { ExperienceTravisSection } from "@/components/experience/ExperienceTravisSection";
import { ExperienceFooter } from "@/components/experience/ExperienceFooter";
import { TravisOmnichannelWidget } from "@/components/shared/TravisOmnichannelWidget";
import { X, Phone, Mail, MessageCircle, CheckCircle2 } from "lucide-react";

interface ExperienceLandingClientProps {
  initialCms?: any;
}

export default function ExperienceLandingClient({
  initialCms,
}: ExperienceLandingClientProps) {
  const [cms, setCms] = useState<any>(initialCms || {});

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "cms", "landing_experience"),
      (snap) => {
        if (snap.exists()) {
          setCms(snap.data());
        }
      },
      () => {
        // Mantiene initialCms si Firestore está restringido
      }
    );
    return () => unsub();
  }, []);

  const [searchMode, setSearchMode] = useState<"excursiones" | "traslados">(
    "excursiones"
  );

  const [excursionFilters, setExcursionFilters] =
    useState<ExcursionSearchFilters>({
      origen: "",
      tiempoExcursion: "",
      fecha: "",
    });

  const [quienesSomosModal, setQuienesSomosModal] = useState<
    "vision" | "mision" | "valores" | null
  >(null);

  const [contactoModal, setContactoModal] = useState(false);
  const [contactSubject, setContactSubject] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  const handleOpenConsultar = (experienceTitle?: string) => {
    if (experienceTitle) {
      setContactSubject(experienceTitle);
      setContactMessage(
        `Hola Travis, quiero consultar por la excursión: ${experienceTitle}`
      );
    } else {
      setContactSubject("");
    }
    setContactoModal(true);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `*Consulta Turismo Receptivo - TravelApp Experience*${
      contactSubject ? `\n• *Excursión:* ${contactSubject}` : ""
    }
• *Nombre:* ${contactName}
• *Teléfono:* ${contactPhone}
• *Mensaje:* ${contactMessage}`;
    const url = `https://wa.me/5493812000712?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    setContactSent(true);
    setTimeout(() => {
      setContactSent(false);
      setContactoModal(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] font-sans antialiased overflow-x-hidden selection:bg-[#0071e3] selection:text-white">
      {/* 1. HEADER AZUL TECH #0a2a5b */}
      <ExperienceHeader
        onOpenQuienesSomos={(tab) => setQuienesSomosModal(tab)}
        onOpenContacto={() => handleOpenConsultar()}
        onSelectSearchMode={(mode) => setSearchMode(mode)}
      />

      {/* 2. HERO SLIDER 4K / ULTRA HD (Hasta 20 tarjetas) */}
      <ExperienceHeroSlider
        slides={cms?.heroSlides || cms?.slides || initialCms?.heroSlides || initialCms?.slides}
        cmsHero={cms?.marketplaceHero || cms?.hero || initialCms?.marketplaceHero || initialCms?.hero}
      />

      {/* 3. BARRA BUSCADORA DE EXCURSIONES Y TRASLADOS */}
      <ExperienceSearchEngine
        activeMode={searchMode}
        onModeChange={(mode) => setSearchMode(mode)}
        onFilterExcursions={(filters) => setExcursionFilters(filters)}
      />

      {/* 4. SECTOR 3: GRILLA DE TARJETAS ESTILO APPLE.COM/LA */}
      <ExperienceCatalogCarousel
        filters={excursionFilters}
        onOpenConsultar={handleOpenConsultar}
      />

      {/* 5. SECCIÓN 4: TRAVIS CONCIERGE Y CANALES OFICIALES */}
      <ExperienceTravisSection />

      {/* 6. FOOTER OFICIAL */}
      <ExperienceFooter
        onOpenQuienesSomos={() => setQuienesSomosModal("vision")}
        onOpenContacto={() => handleOpenConsultar()}
        onSelectSearchMode={(mode) => setSearchMode(mode)}
      />

      {/* Burbuja Flotante Omnicanal Travis */}
      <TravisOmnichannelWidget
        businessUnit="Experiences"
        primaryColor="#0a2a5b"
        brandName="TravelApp Experience"
        whatsappUrl="https://wa.me/5493812000712"
      />

      {/* MODAL INSTITUCIONAL: NOSOTROS */}
      {quienesSomosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-[#1d1d1f] animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setQuienesSomosModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex p-1 rounded-full bg-[#f5f5f7] mb-6">
              {(["vision", "mision", "valores"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setQuienesSomosModal(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    quienesSomosModal === tab
                      ? "bg-white text-[#1d1d1f] shadow-sm"
                      : "text-[#86868b] hover:text-[#1d1d1f]"
                  }`}
                >
                  {tab === "vision"
                    ? "Visión"
                    : tab === "mision"
                    ? "Misión"
                    : "Valores"}
                </button>
              ))}
            </div>

            {quienesSomosModal === "vision" && (
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
                  Nuestra Visión
                </h3>
                <p className="text-[15px] text-[#86868b] leading-relaxed">
                  Ser la plataforma líder de turismo receptivo inteligente en
                  Argentina y Sudamérica, transformando la manera en que los
                  viajeros descubren experiencias auténticas y conectando
                  prestadores locales con tecnología de vanguardia.
                </p>
              </div>
            )}

            {quienesSomosModal === "mision" && (
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
                  Nuestra Misión
                </h3>
                <p className="text-[15px] text-[#86868b] leading-relaxed">
                  Diseñar, coordinar y brindar experiencias turísticas genuinas
                  en territorio, integrando la calidez del anfitrión local con
                  la eficiencia de nuestra infraestructura tecnológica y
                  asistencia permanente.
                </p>
              </div>
            )}

            {quienesSomosModal === "valores" && (
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
                  Nuestros Valores
                </h3>
                <div className="space-y-2.5 text-sm text-[#86868b]">
                  <div className="p-3.5 rounded-2xl bg-[#f5f5f7]">
                    <strong className="text-[#1d1d1f] block">
                      Autenticidad y Respeto Cultural
                    </strong>
                    Valoramos las raíces y las comunidades que nos reciben.
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#f5f5f7]">
                    <strong className="text-[#1d1d1f] block">
                      Seguridad Operativa
                    </strong>
                    Estándares estrictos de guías matriculados, seguros y
                    unidades habilitadas.
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#f5f5f7]">
                    <strong className="text-[#1d1d1f] block">
                      Innovación Centrada en las Personas
                    </strong>
                    Tecnología simple y transparente al servicio del viajero.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONTACTO Y CANALES OFICIALES (Se abre desde Contacto o desde el botón "Consultar" de cada tarjeta) */}
      {contactoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-[#1d1d1f] animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setContactoModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight mb-1">
              {contactSubject ? `Consultar: ${contactSubject}` : "Contacto y Canales Oficiales"}
            </h3>
            <p className="text-sm text-[#86868b] mb-5">
              Comunicate por tu canal preferido con Travis o envianos tu
              consulta directa.
            </p>

            {/* Canales Oficiales Directos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5 text-xs">
              <a
                href={`https://wa.me/5493812000712?text=${encodeURIComponent(
                  contactSubject
                    ? `Hola Travis, quiero consultar por la excursión: ${contactSubject}`
                    : "Hola Travis, necesito asesoramiento en TravelApp Experience."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-[#f5f5f7] hover:bg-[#e5e5ea] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366] mb-1.5" />
                <div className="text-[#86868b]">WhatsApp Travis</div>
                <div className="font-semibold text-[#1d1d1f]">
                  +54 9 381 200-0712
                </div>
              </a>

              <a
                href="https://m.me/travelapp.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-[#f5f5f7] hover:bg-[#e5e5ea] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#0084FF] mb-1.5" />
                <div className="text-[#86868b]">Messenger</div>
                <div className="font-semibold text-[#1d1d1f]">Chat Oficial</div>
              </a>

              <a
                href="https://ig.me/m/travelapp.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-[#f5f5f7] hover:bg-[#e5e5ea] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#E1306C] mb-1.5" />
                <div className="text-[#86868b]">Instagram DM</div>
                <div className="font-semibold text-[#1d1d1f]">@travelapp.ar</div>
              </a>

              <a
                href="tel:08102200018"
                className="p-3 rounded-2xl bg-[#f5f5f7] hover:bg-[#e5e5ea] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#0a2a5b] mb-1.5" />
                <div className="text-[#86868b]">Teléfono</div>
                <div className="font-semibold text-[#1d1d1f]">0810-220-0018</div>
              </a>

              <a
                href="mailto:hola@travelapp.ar"
                className="p-3 rounded-2xl bg-[#f5f5f7] hover:bg-[#e5e5ea] transition-colors col-span-2 sm:col-span-2"
              >
                <Mail className="w-4 h-4 text-[#0071e3] mb-1.5" />
                <div className="text-[#86868b]">Correo Electrónico</div>
                <div className="font-semibold text-[#1d1d1f]">
                  hola@travelapp.ar
                </div>
              </a>
            </div>

            {contactSent ? (
              <div className="py-4 text-center space-y-1 bg-[#f5f5f7] rounded-2xl p-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                <div className="text-sm font-semibold text-[#1d1d1f]">
                  Consulta enviada a Travis
                </div>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nombre y apellido"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                />
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Teléfono / WhatsApp"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                />
                <textarea
                  rows={3}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="¿En qué podemos ayudarte?"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-normal transition-colors cursor-pointer"
                >
                  Enviar consulta
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
