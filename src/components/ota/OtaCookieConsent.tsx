"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Cookie, Settings, Check, X, ChevronRight, Lock } from "lucide-react";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = "ta_cookie_consent_v1";

export function OtaCookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Siempre obligatoria
    analytics: true,
    marketing: true,
    timestamp: "",
  });

  useEffect(() => {
    // Verificar si ya se guardó la preferencia
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Mostrar banner tras 1.5s
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    } else {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        setIsVisible(true);
      }
    }

    // Escuchar evento global desde el Footer u otros enlaces para reabrir configuración
    const handleOpenSettings = () => {
      setModalOpen(true);
    };
    window.addEventListener("open-cookie-settings", handleOpenSettings);
    return () => window.removeEventListener("open-cookie-settings", handleOpenSettings);
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    const updated = { ...prefs, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setPreferences(updated);
    setIsVisible(false);
    setModalOpen(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: "",
    });
  };

  const handleRejectNonEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: "",
    });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  return (
    <>
      {/* Banner Flotante Inferior */}
      {isVisible && !modalOpen && (
        <aside
          role="region"
          aria-label="Aviso y consentimiento de cookies"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 animate-in slide-in-from-bottom-5 duration-300 font-sans"
        >
          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0a2a5b] flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                Privacidad & Cookies en TravelApp
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                Utilizamos cookies propias y de terceros para garantizar la seguridad de tus transacciones, personalizar tu experiencia, analizar el rendimiento y gestionar beneficios de afiliados, conforme a la Ley 25.326.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mb-4 pl-1">
            Podés consultar el detalle técnico en nuestra{" "}
            <Link
              href="/politica-de-cookies"
              className="text-[#0a2a5b] font-bold underline hover:text-[#ff5a19]"
            >
              Política de Cookies
            </Link>
            .
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="py-2.5 px-3 rounded-xl bg-[#0a2a5b] hover:bg-[#071d3f] text-white font-bold text-xs shadow-xs transition-colors text-center cursor-pointer"
              >
                Aceptar Todas
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors text-center cursor-pointer"
              >
                Solo Necesarias
              </button>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Personalizar Preferencias</span>
            </button>
          </div>
        </aside>
      )}

      {/* Modal de Configuración Granular de Cookies */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0a2a5b] text-xs font-bold uppercase mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff5a19]" />
              <span>Centro de Preferencias de Privacidad</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              Configuración de Cookies
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mb-6">
              Elegí qué categorías de cookies permitís en tu navegación. Las cookies esenciales no se pueden deshabilitar ya que son necesarias para el funcionamiento y seguridad de la plataforma.
            </p>

            <div className="space-y-4 mb-6">
              {/* Categoría 1: Esenciales */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      Técnicas y Esenciales
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Obligatorias
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Permiten la autenticación del usuario, persistencia de sesión segura, prevención de fraudes y el funcionamiento del carrito y pasarela de checkout.
                </p>
              </div>

              {/* Categoría 2: Analíticas */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Analítica y Rendimiento
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0a2a5b]" />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Nos ayudan a entender cómo interactúan los usuarios con el buscador y el catálogo para optimizar la velocidad y corregir errores.
                </p>
              </div>

              {/* Categoría 3: Marketing y Afiliados */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Marketing y Red de Afiliados
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) =>
                        setPreferences({ ...preferences, marketing: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ff5a19]" />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Permiten la integración de Travis Omnichannel (asistencia en vivo), atribución de comisiones a los creadores de la Red de Afiliados y promociones a medida.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveCustom}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#0a2a5b] hover:bg-[#071d3f] text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
              >
                Guardar Mis Preferencias
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="py-3 px-4 rounded-2xl bg-[#ff5a19] hover:bg-[#e04c10] text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
              >
                Aceptar Todas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
