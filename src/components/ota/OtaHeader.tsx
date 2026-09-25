"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  MessageCircle,
  ChevronDown,
  Menu,
  X,
  User as UserIcon,
  Sparkles,
  LogOut,
  Plane,
  Building2,
  Compass,
  Gift,
  Users,
  Car,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface OtaHeaderProps {
  currency: "ARS" | "USD";
  onCurrencyChange: (c: "ARS" | "USD") => void;
  phone?: string;
  whatsappUrl?: string;
}

export function OtaHeader({
  currency,
  onCurrencyChange,
  phone = "+54 9 381 202-0050",
  whatsappUrl = "https://wa.me/5493812020050?text=Hola%20TravelApp!%20Quiero%20consultar%20por%20un%20viaje",
}: OtaHeaderProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (loginRef.current && !loginRef.current.contains(event.target as Node)) {
        setLoginMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-sans ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm py-2.5 border-b border-slate-100"
          : "bg-white py-3.5 border-b border-slate-100 shadow-xs"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 lg:gap-6">
          {/* Logo Oficial SVG */}
          <Link href="/landing/ecosistema" className="flex items-center gap-2 group shrink-0">
            <div className="relative h-9 sm:h-10 w-36 sm:w-44">
              <Image
                src="/assets/travelapp_original.svg"
                alt="TravelApp Logo Oficial"
                fill
                priority
                className="object-contain object-left transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </div>
          </Link>

          {/* Navegación Central Estilo Despegar (Pills con Iconos) */}
          <nav className="hidden xl:flex items-center gap-1.5 2xl:gap-2">
            {/* 1. Vuelos & Paquetes */}
            <Link
              href="/marketplace"
              className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-[#0a2a5b] hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all"
            >
              <Plane className="w-4 h-4 text-[#0a2a5b]" />
              <span>Vuelos & Paquetes</span>
            </Link>

            {/* 2. Alojamientos */}
            <Link
              href="/marketplace?tab=hoteles"
              className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-[#0a2a5b] hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all"
            >
              <Building2 className="w-4 h-4 text-[#0a2a5b]" />
              <span>Alojamientos</span>
            </Link>

            {/* 3. Experiencias (Coral #FF4F5A) */}
            <Link
              href="/landing/experience"
              className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-[#ff4f5a] hover:bg-red-50/50 border border-transparent hover:border-red-100 transition-all group"
            >
              <Compass className="w-4 h-4 text-[#ff4f5a] group-hover:rotate-45 transition-transform" />
              <span>Experiencias</span>
            </Link>

            {/* 4. TravelCab (Naranja #FF5A19) */}
            <Link
              href="/landing/travelcab"
              className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-[#ff5a19] hover:bg-orange-50/50 border border-transparent hover:border-orange-100 transition-all"
            >
              <Car className="w-4 h-4 text-[#ff5a19]" />
              <span>TravelCab</span>
            </Link>

            {/* 5. Rewards (Dorado #E5A93B) */}
            <Link
              href="/landing/rewards"
              className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-[#e5a93b] hover:bg-amber-50/50 border border-transparent hover:border-amber-100 transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#e5a93b]" />
              <span>Rewards</span>
            </Link>
          </nav>

          {/* Acciones del Header: Moneda, WhatsApp, y Login Dual (Estilo Despegar) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* WhatsApp Concierge */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/60 transition-colors"
              title="Atención inmediata por WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
              <span className="hidden sm:inline">Ayuda</span>
            </a>

            {/* Selector de Moneda (ARS / USD) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/60 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => onCurrencyChange("ARS")}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  currency === "ARS"
                    ? "bg-[#0a2a5b] text-white shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                ARS $
              </button>
              <button
                type="button"
                onClick={() => onCurrencyChange("USD")}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  currency === "USD"
                    ? "bg-[#0a2a5b] text-white shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                USD u$s
              </button>
            </div>

            {/* Menú Login Dual Estilo Despegar */}
            <div className="relative" ref={loginRef}>
              {user ? (
                /* Estado Logueado */
                <div className="flex items-center gap-2">
                  <Link
                    href={user.role === "admin" ? "/cms" : "/rewards"}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#e5a93b]" />
                    <span>Puntos Rewards</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setLoginMenuOpen(!loginMenuOpen)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#0a2a5b] text-white flex items-center justify-center text-xs font-bold">
                      {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${loginMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {loginMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 text-xs z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-[11px] text-slate-500">Sesión iniciada como</p>
                        <p className="font-bold text-slate-800 truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          href={user.role === "admin" ? "/cms" : "/marketplace"}
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 font-bold text-slate-700"
                          onClick={() => setLoginMenuOpen(false)}
                        >
                          <span>{user.role === "admin" ? "Panel Administrador" : "Mis Reservas"}</span>
                        </Link>
                        <Link
                          href="/rewards"
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 font-bold text-[#e5a93b]"
                          onClick={() => setLoginMenuOpen(false)}
                        >
                          <span>Club Rewards</span>
                          <Sparkles className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setLoginMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 font-bold text-left transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Estado No Logueado: Botón Ingresar con Dropdown Dual */
                <div>
                  <button
                    type="button"
                    onClick={() => setLoginMenuOpen(!loginMenuOpen)}
                    className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold text-[#0a2a5b] bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all shadow-2xs hover:shadow-xs"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#0a2a5b]" />
                    <span>Ingresar</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                        loginMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Dual Despegar: Usuarios vs Embajadores */}
                  {loginMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 text-xs z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-1 mb-2">
                        <p className="text-xs font-bold text-slate-900">Elegí cómo ingresar al ecosistema:</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Acceso personalizado según tu rol</p>
                      </div>

                      {/* Opción 1: Soy Viajero */}
                      <Link
                        href="/login"
                        onClick={() => setLoginMenuOpen(false)}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-blue-50/60 border border-transparent hover:border-blue-100 transition-colors group mb-2"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#0a2a5b]/10 text-[#0a2a5b] flex items-center justify-center shrink-0 group-hover:bg-[#0a2a5b] group-hover:text-white transition-colors">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 group-hover:text-[#0a2a5b] flex items-center justify-between">
                            <span>Soy Viajero / Usuario</span>
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                            Gestioná tus compras, vuelos, traslados y canjeá puntos Rewards acumulados.
                          </p>
                        </div>
                      </Link>

                      {/* Opción 2: Embajadores & Afiliados */}
                      <Link
                        href="/landing/afiliados"
                        onClick={() => setLoginMenuOpen(false)}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-emerald-50/60 border border-transparent hover:border-emerald-100 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 group-hover:text-emerald-700 flex items-center justify-between">
                            <span>Portal Embajadores & Afiliados</span>
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                            Accedé a tus métricas de afiliado, generá links de recomendación y cobrá comisiones.
                          </p>
                        </div>
                      </Link>

                      {/* Footer del Dropdown: Registro Rápido */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 text-center">
                        <Link
                          href="/login?tab=register"
                          onClick={() => setLoginMenuOpen(false)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0a2a5b] hover:underline"
                        >
                          <span>¿Primera vez en TravelApp? Creá tu cuenta gratis</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botón Mobile Menu */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Abrir menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Drawer Mobile Responsivo */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <Link
              href="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#0a2a5b]"
            >
              <Plane className="w-4 h-4 text-[#0a2a5b]" />
              <span>Vuelos & Paquetes</span>
            </Link>

            <Link
              href="/marketplace?tab=hoteles"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#0a2a5b]"
            >
              <Building2 className="w-4 h-4 text-[#0a2a5b]" />
              <span>Alojamientos</span>
            </Link>

            <Link
              href="/landing/experience"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-red-50/60 text-[#ff4f5a]"
            >
              <Compass className="w-4 h-4 text-[#ff4f5a]" />
              <span>Experiencias</span>
            </Link>

            <Link
              href="/landing/travelcab"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-xl bg-orange-50/60 text-[#ff5a19]"
            >
              <Car className="w-4 h-4 text-[#ff5a19]" />
              <span>TravelCab</span>
            </Link>
          </div>

          <Link
            href="/landing/rewards"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3 rounded-xl bg-amber-50 text-amber-900 font-bold text-xs"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#e5a93b]" />
              <span>Club TravelApp Rewards</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#e5a93b]" />
          </Link>

          {/* Acceso Embajadores en Mobile */}
          <Link
            href="/landing/afiliados"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Portal Embajadores & Afiliados</span>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600" />
          </Link>

          {/* Accesos de Login Mobile */}
          {!user && (
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-[#0a2a5b] font-bold text-center text-xs hover:bg-slate-50"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/login?tab=register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 rounded-xl bg-[#0a2a5b] text-white font-bold text-center text-xs hover:bg-[#071d3f]"
              >
                Crear Cuenta
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
