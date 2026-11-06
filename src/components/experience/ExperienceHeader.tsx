"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone, ChevronDown, Menu, X } from "lucide-react";

interface ExperienceHeaderProps {
  onOpenQuienesSomos?: (tab: "vision" | "mision" | "valores") => void;
  onOpenContacto?: () => void;
  onSelectSearchMode?: (mode: "excursiones" | "traslados") => void;
}

export function ExperienceHeader({
  onOpenQuienesSomos,
  onOpenContacto,
  onSelectSearchMode,
}: ExperienceHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [nosotrosDropdownOpen, setNosotrosDropdownOpen] = useState(false);
  const [serviciosDropdownOpen, setServiciosDropdownOpen] = useState(false);

  const handleSelectMode = (mode: "excursiones" | "traslados") => {
    setServiciosDropdownOpen(false);
    setMobileMenuOpen(false);
    if (onSelectSearchMode) {
      onSelectSearchMode(mode);
    }
    const targetId =
      mode === "traslados" ? "buscador-experience" : "catalogo-excursiones";
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a2a5b]/95 backdrop-blur-md text-white border-b border-white/10 transition-all">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-6">
          
          {/* 1. LOGO TRAVELAPP EXPERIENCE BLANCO */}
          <Link
            href="/landing/experience"
            className="flex items-center shrink-0 focus:outline-none group"
          >
            <Image
              src="/assets/experience_blanco.svg"
              alt="TravelApp Experience"
              width={240}
              height={64}
              priority
              className="h-11 sm:h-12 w-auto object-contain transition-opacity group-hover:opacity-90"
            />
          </Link>

          {/* NAVEGACIÓN DESKTOP (Estilo Apple: tipografía limpia, sin recargos visuales, orden exacto) */}
          <nav className="hidden lg:flex items-center justify-between flex-1 max-w-3xl mx-auto text-[13px] font-normal tracking-[-0.01em] text-white/85">
            
            {/* 2. BOTÓN 1: NOSOTROS */}
            <div
              className="relative"
              onMouseEnter={() => setNosotrosDropdownOpen(true)}
              onMouseLeave={() => setNosotrosDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setNosotrosDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 py-2 hover:text-white transition-colors cursor-pointer"
              >
                <span>Nosotros</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${
                    nosotrosDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {nosotrosDropdownOpen && (
                <div className="absolute left-0 top-full pt-1 w-48 z-50">
                  <div className="bg-[#0a2a5b]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/15 py-1.5 text-[13px] text-white/90">
                    <button
                      type="button"
                      onClick={() => {
                        setNosotrosDropdownOpen(false);
                        onOpenQuienesSomos?.("vision");
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      Nuestra Visión
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNosotrosDropdownOpen(false);
                        onOpenQuienesSomos?.("mision");
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      Nuestra Misión
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNosotrosDropdownOpen(false);
                        onOpenQuienesSomos?.("valores");
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      Nuestros Valores
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. BOTÓN 2: MENÚ DESPLEGABLE (EXPERIENCIAS / TRASLADOS) */}
            <div
              className="relative"
              onMouseEnter={() => setServiciosDropdownOpen(true)}
              onMouseLeave={() => setServiciosDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setServiciosDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 py-2 hover:text-white transition-colors cursor-pointer"
              >
                <span>Experiencias / Traslados</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${
                    serviciosDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {serviciosDropdownOpen && (
                <div className="absolute left-0 top-full pt-1 w-52 z-50">
                  <div className="bg-[#0a2a5b]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/15 py-1.5 text-[13px] text-white/90">
                    <button
                      type="button"
                      onClick={() => handleSelectMode("excursiones")}
                      className="w-full px-4 py-2 text-left hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      Experiencias y Excursiones
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMode("traslados")}
                      className="w-full px-4 py-2 text-left hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      Traslados Punto a Punto
                    </button>
                    <Link
                      href="/buses?brand=experience"
                      onClick={() => setServiciosDropdownOpen(false)}
                      className="block w-full px-4 py-2 text-left hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Pasajes en Bus (NOA & Nacional)
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 4. CONTACTO */}
            <button
              type="button"
              onClick={() => onOpenContacto?.()}
              className="py-2 hover:text-white transition-colors cursor-pointer"
            >
              Contacto
            </button>

            {/* 5. TRAVEL MARKET & PASAJES EN BUS */}
            <Link
              href="/landing/experience/marketplace"
              className="py-2 hover:text-white transition-colors"
            >
              Travel Market
            </Link>
            <Link
              href="/buses?brand=experience"
              className="py-2 hover:text-white transition-colors font-medium text-white"
            >
              Pasajes en Bus
            </Link>

            {/* 6. BOTÓN DE LOGIN / REGISTRO */}
            <div className="flex items-center gap-1">
              <Link
                href="/login"
                className="py-2 hover:text-white transition-colors"
              >
                Login
              </Link>
              <span className="text-white/30">/</span>
              <Link
                href="/registro"
                className="py-2 hover:text-white transition-colors"
              >
                Registro
              </Link>
            </div>
          </nav>

          {/* 7. TELÉFONO: ICONO + 0810-220-0018 */}
          <div className="hidden lg:flex items-center shrink-0">
            <a
              href="tel:08102200018"
              className="flex items-center gap-1.5 text-[13px] font-medium text-white/90 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-white/80" />
              <span className="tracking-tight">0810-220-0018</span>
            </a>
          </div>

          {/* CONTROLES MOBILE */}
          <div className="flex lg:hidden items-center gap-4">
            <a
              href="tel:08102200018"
              className="flex items-center gap-1 text-xs font-medium text-white/90"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>0810-220-0018</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Abrir menú"
              className="p-1.5 text-white/90 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MENÚ DESPLEGABLE MOBILE (Estilo Cortina Apple) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0a2a5b] border-t border-white/10 px-6 py-6 space-y-4 text-[15px] font-normal text-white/90">
          <div className="space-y-2 border-b border-white/10 pb-4">
            <div className="text-[11px] uppercase tracking-wider text-white/40">
              Nosotros
            </div>
            <div className="flex flex-col space-y-2 pl-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuienesSomos?.("vision");
                }}
                className="text-left py-1 hover:text-white"
              >
                Visión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuienesSomos?.("mision");
                }}
                className="text-left py-1 hover:text-white"
              >
                Misión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuienesSomos?.("valores");
                }}
                className="text-left py-1 hover:text-white"
              >
                Valores
              </button>
            </div>
          </div>

          <div className="space-y-2 border-b border-white/10 pb-4">
            <div className="text-[11px] uppercase tracking-wider text-white/40">
              Servicios
            </div>
            <div className="flex flex-col space-y-2 pl-2">
              <button
                type="button"
                onClick={() => handleSelectMode("excursiones")}
                className="text-left py-1 hover:text-white"
              >
                Experiencias
              </button>
              <button
                type="button"
                onClick={() => handleSelectMode("traslados")}
                className="text-left py-1 hover:text-white"
              >
                Traslados
              </button>
            </div>
          </div>

          <div className="flex flex-col space-y-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenContacto?.();
              }}
              className="text-left hover:text-white"
            >
              Contacto
            </button>

            <Link
              href="/landing/experience/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white"
            >
              Travel Market
            </Link>

            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white"
              >
                Login
              </Link>
              <span className="text-white/30">/</span>
              <Link
                href="/registro"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white"
              >
                Registro
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
