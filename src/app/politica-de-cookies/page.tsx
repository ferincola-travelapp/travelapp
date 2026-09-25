"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Cookie, Shield, CheckCircle2, Lock, Sliders, ExternalLink } from "lucide-react";

export default function PoliticaDeCookiesPage() {
  const triggerCookieSettings = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-cookie-settings"));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enlace Volver */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#0a2a5b] hover:text-[#ff5a19] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a TravelApp.ar</span>
          </Link>
        </div>

        {/* Encabezado Principal */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xs border border-slate-200/80 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-[#0a2a5b] text-xs font-bold uppercase mb-4">
            <Cookie className="w-4 h-4 text-[#ff5a19]" />
            <span>Marco Legal & Transparencia Digital</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
            Política de Aceptación y Uso de Cookies
          </h1>

          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed mb-6">
            Última actualización: Septiembre de 2026. Esta política describe cómo TravelApp utiliza cookies y tecnologías de almacenamiento local en cumplimiento con la <strong>Ley 25.326 de Protección de los Datos Personales de la República Argentina</strong> y los estándares internacionales de privacidad.
          </p>

          <button
            type="button"
            onClick={triggerCookieSettings}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0a2a5b] hover:bg-[#071d3f] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Abrir Panel de Configuración de Cookies</span>
          </button>
        </div>

        {/* Cuerpo del Documento */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xs border border-slate-200/80 space-y-8 text-sm leading-relaxed text-slate-700">
          {/* Sección 1 */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-[#0a2a5b] flex items-center justify-center text-xs font-black">
                1
              </span>
              <span>¿Qué es una cookie?</span>
            </h2>
            <p>
              Una cookie es un pequeño archivo de texto que los sitios web descargan en su dispositivo (computadora, tableta o teléfono móvil) cuando los visita. Permiten que la plataforma recuerde información sobre su visita, como su sesión activa, su moneda preferida (ARS o USD), su carrito de compras y facilitan una navegación más ágil y personalizada.
            </p>
          </section>

          {/* Sección 2 */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-[#0a2a5b] flex items-center justify-center text-xs font-black">
                2
              </span>
              <span>Categorías de Cookies Utilizadas en TravelApp.ar</span>
            </h2>
            <p className="mb-4">
              En TravelApp clasificamos las cookies en tres grupos bien diferenciados:
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>A) Cookies Técnicas y Esenciales (Obligatorias)</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Son indispensables para que la plataforma funcione correctamente. Incluyen la autenticación de usuarios (<code>ta_session</code>), protección contra ataques CSRF, mantenimiento del estado de cotización en el buscador y el procesamiento seguro de pagos. No requieren consentimiento previo ya que sin ellas el servicio no puede prestarse.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#0a2a5b]" />
                  <span>B) Cookies de Análisis y Rendimiento (Opcionales)</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Recopilan información agregada y anónima sobre cómo los viajeros navegan por el sitio, páginas más visitadas, tiempos de respuesta y posibles errores en las búsquedas. Esta información nos permite optimizar la velocidad y confiabilidad de TravelApp.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#ff5a19]" />
                  <span>C) Cookies de Marketing y Red de Afiliados (Opcionales)</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Gestionan la atribución de comisiones para los creadores y embajadores que forman parte de la <strong>Red de Afiliados TravelApp</strong>, garantizando que cuando un viajero reserva mediante un enlace recomendado, el beneficio se compute con precisión. Asimismo, permiten la interacción con el widget omnicanal de <strong>Travis (ManyChat)</strong> para soporte en vivo.
                </p>
              </div>
            </div>
          </section>

          {/* Sección 3: Tabla de Cookies */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-[#0a2a5b] flex items-center justify-center text-xs font-black">
                3
              </span>
              <span>Tabla de Cookies Técnicas Específicas</span>
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Proveedor</th>
                    <th className="p-3">Finalidad</th>
                    <th className="p-3">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-900">ta_session</td>
                    <td className="p-3">TravelApp.ar</td>
                    <td className="p-3">Sesión segura del usuario autenticado</td>
                    <td className="p-3">Sesión / 30 días</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-900">ta_cookie_consent_v1</td>
                    <td className="p-3">TravelApp.ar</td>
                    <td className="p-3">Registro de consentimiento del usuario</td>
                    <td className="p-3">1 año</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-900">ta_currency</td>
                    <td className="p-3">TravelApp.ar</td>
                    <td className="p-3">Preferencia de visualización ARS / USD</td>
                    <td className="p-3">1 año</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-900">ta_aff_ref</td>
                    <td className="p-3">TravelApp.ar</td>
                    <td className="p-3">Atribución de comisión a embajador afiliado</td>
                    <td className="p-3">60 días</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-900">__mc_uid</td>
                    <td className="p-3">ManyChat (Travis)</td>
                    <td className="p-3">Widget de chat y atención al cliente</td>
                    <td className="p-3">1 año</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Sección 4: Cómo deshabilitar */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-[#0a2a5b] flex items-center justify-center text-xs font-black">
                4
              </span>
              <span>Cómo Deshabilitar o Revocar Cookies en su Navegador</span>
            </h2>
            <p className="mb-3">
              Además de nuestro panel de configuración, usted puede permitir, bloquear o eliminar las cookies instaladas en su equipo mediante las opciones del navegador que utilice:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li><strong>Google Chrome:</strong> Configuración &gt; Privacidad y seguridad &gt; Cookies y otros datos de sitios.</li>
              <li><strong>Mozilla Firefox:</strong> Opciones &gt; Privacidad y Seguridad &gt; Cookies y datos del sitio.</li>
              <li><strong>Apple Safari:</strong> Preferencias &gt; Privacidad &gt; Bloquear todas las cookies.</li>
              <li><strong>Microsoft Edge:</strong> Configuración &gt; Permisos del sitio &gt; Cookies y datos del sitio.</li>
            </ul>
          </section>

          {/* Sección 5: Contacto */}
          <section className="pt-4 border-t border-slate-100">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-[#0a2a5b] flex items-center justify-center text-xs font-black">
                5
              </span>
              <span>Canal de Consultas de Privacidad</span>
            </h2>
            <p>
              Si tiene dudas sobre nuestra política de cookies o el tratamiento de sus datos personales bajo la Ley 25.326, puede comunicarse con nuestro Oficial de Privacidad a través de <strong>privacidad@travelapp.ar</strong> o por correo postal a la sede legal de TravelApp.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
