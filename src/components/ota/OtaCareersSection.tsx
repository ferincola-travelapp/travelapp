"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase,
  Upload,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
  Loader2,
  MapPin,
} from "lucide-react";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export interface JobPosition {
  id: string;
  title: string;
  area: string;
  type: string;
  description?: string;
}

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FALLBACK_DATAURL_BYTES = 700 * 1024; // 700 KB fallback seguro para Firestore

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo adjunto."));
    reader.readAsDataURL(file);
  });

export function OtaCareersSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [livePositions, setLivePositions] = useState<JobPosition[]>([]);
  const [loadingOpenings, setLoadingOpenings] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    jobTitle: "Postulación Espontánea",
    motivation: "",
    linkedinOrCvUrl: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincronización automática en vivo con los puestos creados en RRHH (/hr -> job_openings)
  useEffect(() => {
    const q = query(collection(db, "job_openings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: JobPosition[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((j) => j.active !== false && j.publishedOnWeb !== false)
          .map((j) => ({
            id: j.id,
            title: j.title || "Puesto disponible",
            area: j.area || "Operaciones",
            type: j.modality || j.type || "Presencial / Híbrido",
            description: j.description || "",
          }));
        setLivePositions(list);
        setLoadingOpenings(false);
      },
      (err) => {
        console.warn("Error leyendo job_openings:", err);
        setLivePositions([]);
        setLoadingOpenings(false);
      }
    );
    return () => unsub();
  }, []);

  const openModalForJob = (job?: JobPosition) => {
    setErrorMsg(null);
    setSubmitted(false);
    if (job) {
      setSelectedJobId(job.id);
      setFormData((prev) => ({ ...prev, jobTitle: job.title }));
    } else if (livePositions.length > 0) {
      setSelectedJobId(livePositions[0].id);
      setFormData((prev) => ({ ...prev, jobTitle: livePositions[0].title }));
    } else {
      setSelectedJobId("");
      setFormData((prev) => ({ ...prev, jobTitle: "Postulación Espontánea" }));
    }
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      whatsapp: "",
      jobTitle: livePositions[0]?.title || "Postulación Espontánea",
      motivation: "",
      linkedinOrCvUrl: "",
    });
    setSelectedJobId(livePositions[0]?.id || "");
    setCvFile(null);
    setErrorMsg(null);
    setSubmitted(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_CV_BYTES) {
      setErrorMsg("El archivo del Currículum supera el límite máximo de 5 MB.");
      e.target.value = "";
      return;
    }
    setCvFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.whatsapp.trim() ||
      !formData.motivation.trim()
    ) {
      setErrorMsg("Por favor completá todos los campos obligatorios.");
      return;
    }

    if (!cvFile && !formData.linkedinOrCvUrl.trim()) {
      setErrorMsg("Adjuntá tu Currículum Vitae (PDF/DOCX) o pegá un enlace a tu CV/LinkedIn.");
      return;
    }

    setSubmitting(true);
    try {
      let cvUrl = "";
      let cvFileName = "";
      let cvMimeType = "";

      if (cvFile) {
        cvFileName = cvFile.name;
        cvMimeType = cvFile.type || "application/pdf";
        const safeName = cvFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        try {
          const fileRef = storageRef(storage, `cv_submissions/${Date.now()}_${safeName}`);
          await uploadBytes(fileRef, cvFile);
          cvUrl = await getDownloadURL(fileRef);
        } catch (storageErr) {
          console.warn("Fallback CV upload (Storage no disponible para público):", storageErr);
          if (cvFile.size <= MAX_FALLBACK_DATAURL_BYTES) {
            cvUrl = await readFileAsDataUrl(cvFile);
          } else {
            throw new Error(
              "No pudimos subir un archivo tan pesado en este momento. Probá con un PDF menor a 700 KB o pegá el enlace de Google Drive / LinkedIn."
            );
          }
        }
      }

      const matchedJob = livePositions.find((p) => p.title === formData.jobTitle);

      await addDoc(collection(db, "job_applications"), {
        fullName: formData.fullName.trim(),
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim(),
        jobId: matchedJob?.id || selectedJobId || null,
        jobTitle: formData.jobTitle || "Postulación Espontánea",
        positionTitle: formData.jobTitle || "Postulación Espontánea",
        jobArea: matchedJob?.area || "General",
        motivation: formData.motivation.trim(),
        message: formData.motivation.trim(),
        cvUrl,
        cvFileName,
        cvMimeType,
        cvLink: formData.linkedinOrCvUrl.trim(),
        source: "travelapp.ar",
        status: "Nueva",
        createdAt: Date.now(),
        timestamp: Date.now(),
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error("Error guardando postulación:", err);
      setErrorMsg(
        err?.message ||
          "No se pudo enviar tu postulación en este momento. Por favor intentá nuevamente en unos minutos."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activeJobObj = livePositions.find((j) => j.title === formData.jobTitle);

  return (
    <section id="careers" className="py-14 sm:py-18 bg-slate-50 font-sans border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-sm p-6 sm:p-10 border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Lado Izquierdo: Textos y Puestos Sincronizados desde RRHH */}
          <div className="space-y-4 max-w-2xl text-center lg:text-left w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-slate-100 border border-slate-200 text-[#0A2A5B] text-xs font-black uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5 text-[#0A2A5B]" />
              <span>Oportunidades Laborales · RRHH</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Sumate al equipo de TravelApp
            </h3>

            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Estamos en constante crecimiento en turismo, logística y tecnología. Seleccioná una búsqueda activa o envianos tu perfil para futuras incorporaciones.
            </p>

            {/* Búsquedas Activas creadas desde el módulo RRHH (/hr) */}
            {!loadingOpenings && livePositions.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                {livePositions.map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => openModalForJob(pos)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-100 hover:bg-[#0A2A5B] border border-slate-200 hover:border-[#0A2A5B] text-xs font-bold text-slate-700 hover:text-white transition-colors cursor-pointer group"
                    title="Clic para postularte a este puesto"
                  >
                    <span className="w-1.5 h-1.5 rounded-sm bg-[#0A2A5B] group-hover:bg-white" />
                    <span>{pos.title}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-white/75 font-normal">
                      ({pos.area} · {pos.type})
                    </span>
                  </button>
                ))}
              </div>
            ) : !loadingOpenings ? (
              <p className="text-xs text-slate-500 font-medium">
                Actualmente recibimos <strong className="text-slate-700">postulaciones espontáneas</strong> para todas nuestras áreas operativas, comerciales y tecnológicas.
              </p>
            ) : null}
          </div>

          {/* Lado Derecho: Botón CTA */}
          <div className="w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => openModalForJob()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 sm:py-4 rounded-sm bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-black text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>Cargá tu CV / Postulate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Profesional de Postulación -> Directo al Módulo RRHH (/hr) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-md max-w-xl w-full p-5 sm:p-8 shadow-2xl relative border border-slate-200 text-slate-800 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#0A2A5B]" />
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Cerrar modal"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-slate-100 border border-slate-200 text-[#0A2A5B] text-[11px] font-bold uppercase tracking-wider mb-3">
              <Briefcase className="w-3.5 h-3.5 text-[#0A2A5B]" />
              <span>Trabajá con Nosotros</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5">
              Postulación a TravelApp
            </h3>

            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-5">
              Completá tus datos y adjuntá tu Currículum Vitae. Tu perfil ingresará directamente al equipo de Recursos Humanos en Concorde 360.
            </p>

            {submitted ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-sm text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-base font-black text-[#0A2A5B]">
                  ¡Postulación Recibida con Éxito!
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Muchas gracias por tu interés en formar parte de TravelApp. Nuestro equipo de selección analizará tu perfil y tu Currículum Vitae.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setModalOpen(false);
                    }}
                    className="px-5 py-2 rounded-sm bg-[#0A2A5B] text-white text-xs font-bold hover:bg-[#071d3f] cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
                {errorMsg && (
                  <div className="p-3 rounded-sm bg-red-50 border border-red-200 text-red-700 flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Puesto al que se postula */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Puesto al que te postulás *
                  </label>
                  <select
                    value={formData.jobTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = livePositions.find((p) => p.title === val);
                      setSelectedJobId(found?.id || "");
                      setFormData({ ...formData, jobTitle: val });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-sm border border-slate-200 bg-white outline-none focus:border-[#0A2A5B] cursor-pointer"
                  >
                    {livePositions.map((p) => (
                      <option key={p.id} value={p.title}>
                        {p.title} ({p.area} · {p.type})
                      </option>
                    ))}
                    <option value="Postulación Espontánea">Postulación Espontánea</option>
                  </select>

                  {activeJobObj?.description && (
                    <div className="mt-2 p-2.5 rounded-sm bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-normal leading-relaxed">
                      <span className="font-bold text-[#0A2A5B] inline-flex items-center gap-1 mr-1">
                        <MapPin className="w-3 h-3" /> Detalle del puesto:
                      </span>
                      {activeJobObj.description}
                    </div>
                  )}
                </div>

                {/* Nombre Completo + Correo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Ej. María Laura González"
                      className="w-full px-3.5 py-2.5 rounded-sm border border-slate-200 outline-none focus:border-[#0A2A5B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="nombre@ejemplo.com"
                      className="w-full px-3.5 py-2.5 rounded-sm border border-slate-200 outline-none focus:border-[#0A2A5B]"
                    />
                  </div>
                </div>

                {/* Teléfono + WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Ej. 381 555-1234"
                      className="w-full px-3.5 py-2.5 rounded-sm border border-slate-200 outline-none focus:border-[#0A2A5B]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        WhatsApp *
                      </label>
                      {formData.phone && formData.whatsapp !== formData.phone && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, whatsapp: prev.phone }))}
                          className="text-[10px] font-bold text-[#0A2A5B] hover:underline cursor-pointer"
                        >
                          Usar el mismo teléfono
                        </button>
                      )}
                    </div>
                    <input
                      type="tel"
                      required
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="Ej. +54 9 381 555-1234"
                      className="w-full px-3.5 py-2.5 rounded-sm border border-slate-200 outline-none focus:border-[#0A2A5B]"
                    />
                  </div>
                </div>

                {/* Pregunta motivacional profesional */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 leading-snug">
                    ¿Por qué te gustaría formar parte del equipo de TravelApp y qué valor diferencial aportarías con tu presencia? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.motivation}
                    onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                    placeholder="Contanos brevemente tu motivación, experiencia relevante y cómo podrías contribuir al crecimiento del equipo..."
                    className="w-full px-3.5 py-2.5 rounded-sm border border-slate-200 outline-none focus:border-[#0A2A5B] resize-y font-normal"
                  />
                </div>

                {/* Adjuntar Currículum Vitae (PDF / DOCX / Imagen) */}
                <div className="p-3.5 rounded-sm bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Adjuntar Currículum Vitae (PDF, DOC, DOCX o Imagen · máx. 5 MB) *
                  </label>
                  {cvFile ? (
                    <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-sm border border-emerald-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {cvFile.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({Math.round(cvFile.size / 1024)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCvFile(null)}
                        className="text-[11px] font-bold text-red-600 hover:underline shrink-0 cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-sm border border-dashed border-slate-300 bg-white hover:border-[#0A2A5B] hover:bg-slate-50/80 text-xs font-bold text-[#0A2A5B] transition-colors cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Seleccionar archivo de Currículum (.pdf, .docx)</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}

                  <div className="pt-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Enlace opcional a LinkedIn / Portfolio / Google Drive
                    </label>
                    <input
                      type="url"
                      value={formData.linkedinOrCvUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, linkedinOrCvUrl: e.target.value })
                      }
                      placeholder="https://linkedin.com/in/... o https://drive.google.com/..."
                      className="w-full px-3 py-2 rounded-sm border border-slate-200 bg-white outline-none focus:border-[#0A2A5B] font-normal"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-sm bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando postulación y currículum...</span>
                    </>
                  ) : (
                    <span>Enviar Postulación</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
