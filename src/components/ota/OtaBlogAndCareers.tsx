"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  X,
  Send,
  Upload,
} from "lucide-react";

export interface BlogPostData {
  title: string;
  category: string;
  date: string;
  readTime: string;
  excerpt: string;
  imageUrl: string;
  slug: string;
}

interface OtaBlogAndCareersProps {
  latestPost?: BlogPostData;
}

const DEFAULT_POST: BlogPostData = {
  title: "Guía Secreta: 5 Rincones Inexplorados del Norte Argentino para Visitar en 2026",
  category: "Destinos & Consejos",
  date: "10 de Septiembre, 2026",
  readTime: "4 min de lectura",
  excerpt:
    "Desde cascadas ocultas en las yungas tucumanas hasta senderos de altura en los valles calchaquíes. Te contamos los mejores tips de guías locales para vivir una aventura inolvidable sin multitudes.",
  imageUrl:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=90",
  slug: "/blog/rincones-inexplorados-norte-argentino",
};

export function OtaBlogAndCareers({ latestPost = DEFAULT_POST }: OtaBlogAndCareersProps) {
  const post = latestPost || DEFAULT_POST;
  const [careerModalOpen, setCareerModalOpen] = useState(false);
  const [careerFormSent, setCareerFormSent] = useState(false);
  const [careerData, setCareerData] = useState({
    name: "",
    email: "",
    phone: "",
    area: "Tecnología & Producto",
    cvLink: "",
  });

  const handleCareerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCareerFormSent(true);
    setTimeout(() => {
      setCareerFormSent(false);
      setCareerModalOpen(false);
    }, 2500);
  };

  return (
    <section id="blog" className="py-16 sm:py-24 bg-slate-50 font-sans border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Columna 1: Última Noticia del Blog de Viajes (7 columnas) */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0a2a5b] text-xs font-bold uppercase">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Última Noticia del Blog</span>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {post.date}
                </span>
              </div>

              {/* Imagen del Post */}
              <div className="relative h-60 sm:h-72 w-full rounded-2xl overflow-hidden mb-6 bg-slate-900 group">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[#0a2a5b] text-xs font-bold uppercase shadow-xs">
                    {post.category}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{post.readTime}</span>
                  </span>
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug mb-3">
                {post.title}
              </h3>

              <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">
                {post.excerpt}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={post.slug || "/blog"}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0a2a5b] hover:text-[#ff5a19] transition-colors"
              >
                <span>Leer nota completa en el Blog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Columna 2: Trabaja con Nosotros (5 columnas) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0a2a5b] to-blue-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase mb-4 border border-white/10">
                <Briefcase className="w-3.5 h-3.5 text-[#ff5a19]" />
                <span>Oportunidades de Empleo</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
                Trabajá con Nosotros en TravelApp
              </h3>

              <p className="text-sm text-slate-200 font-medium leading-relaxed mb-6">
                Estamos construyendo el ecosistema de viajes y movilidad más innovador de la región. Si te apasiona la tecnología, el turismo y el impacto real, queremos conocerte.
              </p>

              {/* Beneficios de trabajar en TravelApp */}
              <div className="space-y-3 mb-8 text-xs text-slate-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Modalidad remota & oficinas de coworking en todo el país</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Créditos de viaje anuales y descuentos en el Marketplace</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Crecimiento acelerado en equipo de alto rendimiento</span>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setCareerModalOpen(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#ff5a19] hover:bg-[#e04c10] text-white font-bold text-sm shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Postularme / Enviar mi CV</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Postulación / Trabaja con Nosotros */}
      {careerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100 text-slate-900">
            <button
              onClick={() => setCareerModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {careerFormSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  ¡CV Recibido con Éxito!
                </h3>
                <p className="text-sm text-slate-600">
                  Nuestro equipo de Recursos Humanos revisará tu perfil y se pondrá en contacto a la brevedad.
                </p>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0a2a5b] text-xs font-bold uppercase mb-3">
                  <Briefcase className="w-3.5 h-3.5 text-[#ff5a19]" />
                  <span>Equipo TravelApp</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black mb-1">
                  Sumate a nuestro equipo
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Dejanos tus datos de contacto y link a tu CV o perfil de LinkedIn.
                </p>

                <form onSubmit={handleCareerSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Nombre y Apellido
                    </label>
                    <input
                      type="text"
                      required
                      value={careerData.name}
                      onChange={(e) => setCareerData({ ...careerData, name: e.target.value })}
                      placeholder="Ej. Juan Pérez"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0a2a5b]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={careerData.email}
                        onChange={(e) => setCareerData({ ...careerData, email: e.target.value })}
                        placeholder="tu@email.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0a2a5b]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        WhatsApp / Teléfono
                      </label>
                      <input
                        type="tel"
                        required
                        value={careerData.phone}
                        onChange={(e) => setCareerData({ ...careerData, phone: e.target.value })}
                        placeholder="+54 9..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0a2a5b]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Área de Interés
                    </label>
                    <select
                      value={careerData.area}
                      onChange={(e) => setCareerData({ ...careerData, area: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0a2a5b]"
                    >
                      <option value="Tecnología & Producto">Tecnología & Producto (Dev / UX)</option>
                      <option value="Operaciones & Reservas">Operaciones & Emisión de Viajes</option>
                      <option value="Atención al Cliente & Travis">Atención al Cliente & Soporte</option>
                      <option value="Marketing & Alianzas">Marketing & Red de Afiliados</option>
                      <option value="Comercial & Sucursales">Comercial & Sucursales</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Enlace a CV o Perfil de LinkedIn
                    </label>
                    <input
                      type="url"
                      required
                      value={careerData.cvLink}
                      onChange={(e) => setCareerData({ ...careerData, cvLink: e.target.value })}
                      placeholder="https://linkedin.com/in/... o Google Drive"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0a2a5b]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-[#0a2a5b] hover:bg-[#071d3f] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Postulación</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
