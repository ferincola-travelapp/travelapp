"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Upload,
  ArrowRight,
  CheckCircle2,
  Users,
  Sparkles,
  X,
  FileText,
  Send
} from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface JobPosition {
  id: string;
  title: string;
  area: string;
  type: string; // "Presencial" | "Remoto" | "Híbrido"
}

interface OtaCareersSectionProps {
  positions?: JobPosition[];
}

const DEFAULT_POSITIONS: JobPosition[] = [
  { id: "pos-1", title: "Asesores Comerciales de Viajes (OTA)", area: "Ventas", type: "Híbrido / Remoto" },
  { id: "pos-2", title: "Coordinadores de Tours Receptivos", area: "Operaciones", type: "Tucumán / NOA" },
  { id: "pos-3", title: "Conductores Profesionales", area: "TravelCab", type: "Tucumán / CABA / Pilar" },
  { id: "pos-4", title: "Especialistas en Atención al Cliente 24/7", area: "Soporte", type: "Remoto" },
];

export function OtaCareersSection({ positions = DEFAULT_POSITIONS }: OtaCareersSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    area: positions[0]?.title || "Ventas",
    linkedinOrCvUrl: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    setSubmitting(true);
    try {
      // Guardar en la colección de postulaciones de RRHH de Concorde 360
      await addDoc(collection(db, "job_applications"), {
        fullName: formData.name,
        email: formData.email,
        phone: formData.phone,
        positionTitle: formData.area,
        cvLink: formData.linkedinOrCvUrl || "",
        message: formData.message || "",
        status: "Pendiente",
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Error guardando postulación:", err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="careers" className="py-14 sm:py-18 bg-slate-50 font-sans border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Lado Izquierdo: Textos y Puestos */}
          <div className="space-y-4 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-tech-blue text-xs font-black uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5 text-[#FF5A19]" />
              <span>Oportunidades Laborales</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Sumate al equipo de TravelApp
            </h3>

            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Estamos en constante crecimiento en turismo, logística y tecnología. Buscamos personas apasionadas para sumarse a nuestro equipo en todo el país.
            </p>

            {/* Chips de Puestos Disponibles */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
              {positions.map((pos, idx) => (
                <span
                  key={pos.id || idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {pos.title} <span className="text-[10px] text-slate-400 font-normal">({pos.type})</span>
                </span>
              ))}
            </div>
          </div>

          {/* Lado Derecho: Botón CTA */}
          <div className="w-full sm:w-auto shrink-0">
            <button
              onClick={() => {
                setModalOpen(true);
                setSubmitted(false);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer transform hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4 text-[#FF7A00]" />
              <span>Cargá tu CV / Postulate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal para Carga de CV / Postulación */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl relative border border-slate-100 text-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              aria-label="Cerrar modal"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-tech-blue text-xs font-bold uppercase mb-3">
              <Briefcase className="w-3.5 h-3.5 text-[#FF5A19]" />
              <span>Trabajá con Nosotros</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              Postulación a TravelApp
            </h3>

            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
              Completá tus datos y enlace a tu CV o perfil de LinkedIn. Tu perfil llegará directamente a nuestro equipo de Recursos Humanos en Concorde 360.
            </p>

            {submitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-black text-emerald-800">¡Postulación Enviada con Éxito!</h4>
                <p className="text-xs text-emerald-700">Muchas gracias por tu interés en TravelApp. Nuestro equipo de selección revisará tu perfil.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre y Apellido *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-tech-blue"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-tech-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+54 9 ..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-tech-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Área o Puesto de Interés</label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-tech-blue cursor-pointer"
                  >
                    {positions.map((p, idx) => (
                      <option key={p.id || idx} value={p.title}>{p.title}</option>
                    ))}
                    <option value="Otra Postulación Espontánea">Otra Postulación Espontánea</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Enlace a CV en Drive / LinkedIn / Portfolio</label>
                  <input
                    type="url"
                    value={formData.linkedinOrCvUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinOrCvUrl: e.target.value })}
                    placeholder="https://drive.google.com/... o https://linkedin.com/in/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-tech-blue"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-tech-blue hover:bg-tech-blue/90 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Enviando..." : "Enviar Postulación"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
