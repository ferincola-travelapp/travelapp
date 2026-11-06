"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  ChevronDown,
  Menu,
  X,
  User as UserIcon,
  Sparkles,
  LogOut,
  Plane,
  Bus,
  Building2,
  Compass,
  Gift,
  Users,
  Car,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Target,
  Eye,
  HeartHandshake,
  MessageSquare,
  Globe
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface OtaHeaderProps {
  phone?: string;
  onOpenQuienesSomos?: (tab: "vision" | "mision" | "valores") => void;
  onOpenContacto?: () => void;
}

export function OtaHeader({
  phone = "0810-220-0018",
  onOpenQuienesSomos,
  onOpenContacto,
}: OtaHeaderProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quienesSomosOpen, setQuienesSomosOpen] = useState(false);
  const [ecosistemaOpen, setEcosistemaOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const quienesSomosRef = useRef<HTMLDivElement>(null);
  const ecosistemaRef = useRef<HTMLDivElement>(null);
  const marketplaceRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (quienesSomosRef.current && !quienesSomosRef.current.contains(target)) {
        setQuienesSomosOpen(false);
      }
      if (ecosistemaRef.current && !ecosistemaRef.current.contains(target)) {
        setEcosistemaOpen(false);
      }
      if (marketplaceRef.current && !marketplaceRef.current.contains(target)) {
        setMarketplaceOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-sans ${
        isScrolled
          ? "bg-[#0A2A5B]/95 backdrop-blur-md py-2.5 shadow-xl border-b border-blue-900/50"
          : "bg-[#0A2A5B] py-3.5 shadow-md border-b border-blue-950"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          
          {/* 1. LOGO TRAVELAPP ORIGINAL EN LETRAS BLANCAS CON BRILLO ANIMADO */}
          <Link href="/landing/ecosistema" className="flex items-center gap-1 sm:gap-2 group shrink-0 relative">
            <div className="relative h-8 sm:h-10 w-28 xs:w-36 sm:w-44 overflow-hidden rounded-lg">
              <Image
                src="/assets/travelapp_blanco.svg"
                alt="TravelApp Logo Oficial"
                fill
                priority
                className="object-contain object-left transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {/* Efecto de Brillo Sutil Animado (Shine Overlay) */}
              <div 
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-25deg] pointer-events-none animate-[shimmer_3.5s_infinite]"
                style={{
                  animation: "shimmer 4s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                }}
              />
            </div>
          </Link>

          {/* 2. MENÚ DE NAVEGACIÓN DESPLEGABLE (DESKTOP) */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-3 text-white">
            
            {/* DESPLEGABLE 1: QUIÉNES SOMOS */}
            <div className="relative" ref={quienesSomosRef}>
              <button
                type="button"
                onClick={() => {
                  setQuienesSomosOpen(!quienesSomosOpen);
                  setEcosistemaOpen(false);
                  setMarketplaceOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  quienesSomosOpen 
                    ? "bg-white/15 text-white" 
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>Quiénes somos</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${quienesSomosOpen ? "rotate-180" : ""}`} />
              </button>

              {quienesSomosOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <a
                    href="#vision"
                    onClick={(e) => {
                      setQuienesSomosOpen(false);
                      if (onOpenQuienesSomos) {
                        e.preventDefault();
                        onOpenQuienesSomos("vision");
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-tech-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">Visión</span>
                      <span className="text-[10px] text-slate-400 font-normal">Hacia dónde vamos</span>
                    </div>
                  </a>

                  <a
                    href="#mision"
                    onClick={(e) => {
                      setQuienesSomosOpen(false);
                      if (onOpenQuienesSomos) {
                        e.preventDefault();
                        onOpenQuienesSomos("mision");
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#FF5A19] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">Misión</span>
                      <span className="text-[10px] text-slate-400 font-normal">Nuestro propósito</span>
                    </div>
                  </a>

                  <a
                    href="#valores"
                    onClick={(e) => {
                      setQuienesSomosOpen(false);
                      if (onOpenQuienesSomos) {
                        e.preventDefault();
                        onOpenQuienesSomos("valores");
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <HeartHandshake className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">Valores</span>
                      <span className="text-[10px] text-slate-400 font-normal">Lo que nos define</span>
                    </div>
                  </a>
                </div>
              )}
            </div>

            {/* DESPLEGABLE 2: EL ECOSISTEMA */}
            <div className="relative" ref={ecosistemaRef}>
              <button
                type="button"
                onClick={() => {
                  setEcosistemaOpen(!ecosistemaOpen);
                  setQuienesSomosOpen(false);
                  setMarketplaceOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  ecosistemaOpen 
                    ? "bg-white/15 text-white" 
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>El Ecosistema</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${ecosistemaOpen ? "rotate-180" : ""}`} />
              </button>

              {ecosistemaOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    href="/landing/ecosistema"
                    onClick={() => setEcosistemaOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-tech-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">TravelApp Institucional</span>
                      <span className="text-[10px] text-slate-400 font-normal">Plataforma OTA Global</span>
                    </div>
                  </Link>

                  <Link
                    href="/landing/experience"
                    onClick={() => setEcosistemaOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-[#FF4F5A] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">TravelApp Experience</span>
                      <span className="text-[10px] text-slate-400 font-normal">Turismo Receptivo & Tours</span>
                    </div>
                  </Link>

                  <Link
                    href="/landing/travelcab"
                    onClick={() => setEcosistemaOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#FF5A19] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">TravelCab</span>
                      <span className="text-[10px] text-slate-400 font-normal">Movilidad Urbana & Choferes</span>
                    </div>
                  </Link>

                  <Link
                    href="/landing/rewards"
                    onClick={() => setEcosistemaOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-[#E5A93B] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">TravelApp Rewards</span>
                      <span className="text-[10px] text-slate-400 font-normal">Puntos & Canjes en Comercios</span>
                    </div>
                  </Link>

                  <Link
                    href="/landing/afiliados"
                    onClick={() => setEcosistemaOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">Red de Afiliados</span>
                      <span className="text-[10px] text-slate-400 font-normal">Embajadores & Comisiones</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* DESPLEGABLE 3: TRAVELMARKET (EMISIVO Y RECEPTIVO) */}
            <div className="relative" ref={marketplaceRef}>
              <button
                type="button"
                onClick={() => {
                  setMarketplaceOpen(!marketplaceOpen);
                  setQuienesSomosOpen(false);
                  setEcosistemaOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  marketplaceOpen 
                    ? "bg-white/15 text-white" 
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>travelmarket</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${marketplaceOpen ? "rotate-180" : ""}`} />
              </button>

              {marketplaceOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    href="/marketplace"
                    onClick={() => setMarketplaceOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-tech-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plane className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">Turismo Emisivo</span>
                      <span className="text-[10px] text-slate-400 font-normal">Paquetes, Cruceros y Mayoristas</span>
                    </div>
                  </Link>

                  <Link
                    href="/landing/experience/marketplace"
                    onClick={() => setMarketplaceOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-[#FF4F5A] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">Turismo Receptivo</span>
                      <span className="text-[10px] text-slate-400 font-normal">Excursiones, Bodegas & Traslados</span>
                    </div>
                  </Link>

                  <Link
                    href="/buses?brand=ecosistema"
                    onClick={() => setMarketplaceOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#FF5A19] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-800">Pasajes en Bus</span>
                      <span className="text-[10px] text-slate-400 font-normal">Boletería Oficial Central de Pasajes</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* BOTÓN DIRECTO PASajes EN BUS */}
            <Link
              href="/buses?brand=ecosistema"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-all"
            >
              <Bus className="w-3.5 h-3.5 text-[#FF5A19]" />
              <span>Pasajes en Bus</span>
            </Link>

            {/* BOTÓN CONTACTO */}
            <a
              href="#contacto"
              onClick={(e) => {
                if (onOpenContacto) {
                  e.preventDefault();
                  onOpenContacto();
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-all"
            >
              Contacto
            </a>
          </nav>

          {/* 3. ZONA DERECHA: TELÉFONO 0810 + INGRESAR / REGISTRO */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Teléfono 0810-220-0018 */}
            <a
              href={`tel:${phone.replace(/[^0-9]/g, "")}`}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all text-xs font-black shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span className="tracking-wide">{phone}</span>
            </a>

            {/* Botones de Autenticación / Login */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all text-xs font-bold"
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="max-w-[100px] truncate">{user.displayName || user.email?.split("@")[0]}</span>
                  <ChevronDown className="w-3 h-3 text-slate-300" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100">
                    <div className="px-4 py-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mi Cuenta</p>
                      <p className="text-xs font-black text-tech-blue truncate">{user.displayName || user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/marketplace"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Plane className="w-3.5 h-3.5 text-tech-blue" />
                        <span>Mis Viajes & Reservas</span>
                      </Link>
                      <Link
                        href="/landing/rewards"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Gift className="w-3.5 h-3.5 text-amber-500" />
                        <span>Puntos TravelRewards</span>
                      </Link>
                    </div>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setUserMenuOpen(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/login"
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-white hover:bg-white/10 transition-all border border-white/20 bg-white/5 whitespace-nowrap"
                >
                  Ingresar
                </Link>
                <Link
                  href="/registro"
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black bg-[#FF5A19] hover:bg-[#e04c10] text-white shadow-md shadow-orange-900/30 hover:shadow-orange-900/50 transition-all transform hover:scale-[1.02] whitespace-nowrap"
                >
                  Registro
                </Link>
              </div>
            )}

            {/* Botón Menú Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menú"
              className="lg:hidden p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 4. MENÚ MOBILE DESPLEGABLE */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-blue-900/60 pb-4 space-y-3 text-white animate-in slide-in-from-top-4 duration-200">
            {/* Teléfono Mobile */}
            <a
              href={`tel:${phone.replace(/[^0-9]/g, "")}`}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-black"
            >
              <Phone className="w-4 h-4 text-[#FF7A00]" />
              <span>{phone}</span>
            </a>

            {/* Links Mobile */}
            <div className="space-y-1 text-xs font-bold">
              <div className="px-3 py-1.5 text-[11px] font-black uppercase text-blue-300">travelmarket</div>
              <Link
                href="/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 rounded-xl hover:bg-white/10"
              >
                ✈️ Turismo Emisivo
              </Link>
              <Link
                href="/landing/experience/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 rounded-xl hover:bg-white/10 text-red-300"
              >
                🏔️ Turismo Receptivo
              </Link>

              <div className="px-3 pt-3 pb-1 text-[11px] font-black uppercase text-blue-300">Ecosistema</div>
              <Link
                href="/landing/experience"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 rounded-xl hover:bg-white/10"
              >
                🌴 TravelApp Experience
              </Link>
              <Link
                href="/landing/travelcab"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 rounded-xl hover:bg-white/10"
              >
                🚗 TravelCab Movilidad
              </Link>
              <Link
                href="/landing/rewards"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 rounded-xl hover:bg-white/10"
              >
                🎁 TravelApp Rewards
              </Link>
              <Link
                href="/landing/afiliados"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 rounded-xl hover:bg-white/10"
              >
                ⭐ Red de Afiliados
              </Link>

              <div className="px-3 pt-3 pb-1 text-[11px] font-black uppercase text-blue-300">Institucional</div>
              <a
                href="#vision"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 rounded-xl hover:bg-white/10"
              >
                Visión, Misión y Valores
              </a>
              <a
                href="#contacto"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 rounded-xl hover:bg-white/10"
              >
                Contacto Directo
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
