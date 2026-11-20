"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Menu,
  X,
  Phone,
  Mail,
  Briefcase,
  QrCode,
} from "lucide-react";
import { doc, onSnapshot, collection, addDoc } from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { DEFAULT_EXPERIENCE_TIERS } from "@/lib/commissions";
import { TravisOmnichannelWidget } from "@/components/shared/TravisOmnichannelWidget";
import { OtaPromoPushPop } from "@/components/ota/OtaPromoPushPop";

const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_FALLBACK_DATAURL_BYTES = 700 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo adjunto."));
    reader.readAsDataURL(file);
  });
}

const RenderLegalSeal = ({ content, alt }: { content?: string; alt: string }) => {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http") || trimmed.startsWith("/assets") || trimmed.startsWith("data:image")) {
    return (
      <img
        src={trimmed}
        alt={alt}
        className="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity object-contain"
      />
    );
  }
  return (
    <div
      dangerouslySetInnerHTML={{ __html: trimmed }}
      className="opacity-90 hover:opacity-100 transition-opacity max-h-12 overflow-hidden text-[10px] [&_img]:max-h-10 [&_img]:w-auto"
    />
  );
};

const DEFAULT_AFILIADOS_CMS_DATA = {
  header: {
    brand: "TravelApp",
    product: "Experience Partners",
    ctaText: "Ser Embajador",
    loginUrl: "/afiliados/login",
    registerUrl: "/afiliados/register",
  },
  hero: {
    badge: "PROGRAMA OFICIAL DE AFILIADOS & PARTNERS",
    title: "Monetizá tu audiencia recomendando experiencias reales.",
    subtitle:
      "Obtené hasta un 10% de comisión por cada reserva confirmada, otorgá códigos de descuento exclusivos a tu comunidad y recibí tu liquidación en el acto vía Mercado Pago o semanalmente por CBU.",
    primaryCtaText: "Registrarme Gratis",
    secondaryCtaText: "Explorar Niveles",
    heroImage:
      "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1800&q=85",
    ribbonText:
      "Comisiones de hasta el 10% con acreditación inmediata vía Split Mercado Pago o CBU semanal.",
    demoCode: "TUCUMAN10OFF",
  },
  promoPopup: {
    enabled: false,
    badge: "PROGRAMA PARTNERS",
    title: "Sumate como Embajador TravelApp",
    subtitle:
      "Registrate sin costo y empezá a generar comisiones instantáneas recomendando experiencias en todo el país.",
    showDiscountCode: false,
    discountCode: "",
    discountBadge: "",
    ctaText: "Registrarme Gratis",
    ctaUrl: "/afiliados/register",
    imageUrl: "",
    delaySeconds: 4,
  },
  stats: [
    { label: "Comisión Máxima", value: "10%", detail: "por reserva confirmada" },
    { label: "Cupones Seguidores", value: "Hasta 20% OFF", detail: "código personalizado" },
    { label: "Liquidación", value: "Instantánea", detail: "Split MP o CBU semanal" },
    { label: "Puntos Rewards", value: "Bonificación VIP", detail: "por rendimiento mensual" },
  ],
  payoutMethods: {
    title: "Liquidación transparente y automatizada.",
    subtitle:
      "Trazabilidad completa en cada venta realizada con tu código promocional o enlace de atribución directa.",
    optionMpTitle: "Split Mercado Pago Instantáneo",
    optionMpDesc:
      "Vinculá tu cuenta de Mercado Pago mediante OAuth oficial. Con cada reserva abonada a través de tu enlace, tu porcentaje de comisión se separa y acredita en el acto en tu cuenta.",
    optionCbuTitle: "Liquidación Semanal por CBU / CVU",
    optionCbuDesc:
      "Preferí la acreditación bancaria directa: el sistema consolida todas las reservas de la semana y ejecuta la transferencia automática todos los días lunes a tu CBU o alias.",
    panel3Title: "Códigos Nominales y Enlaces QR.",
    panel3Desc:
      "Otorgá hasta un 20% de descuento real en excursiones y traslados. Cada uso de tu cupón se registra en vivo en tu consola de afiliado.",
    panel3Image:
      "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1400&q=85",
    panel4Title: "Creadores, Conserjerías y Hoteles.",
    panel4Desc:
      "Tanto si tenés una comunidad digital como si recibís turistas en recepción hotelera, recomendá circuitos habilitados con respaldo operativo 24/7.",
    panel4Image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85",
    nivelesTitle: "A mayor volumen de reservas, mayor porcentaje de comisión.",
    nivelesSubtitle:
      "Tu cuenta asciende de categoría automáticamente a medida que tus referidos completan sus excursiones y traslados.",
  },
  faqs: [
    {
      q: "¿Tiene algún costo unirme al Programa de Embajadores?",
      a: "No. El registro y mantenimiento de tu cuenta de Partner es 100% gratuito. Solo necesitás completar tu alta para recibir tu código promocional y enlace de atribución.",
    },
    {
      q: "¿Cómo funcionan las escalas de comisión?",
      a: "Iniciás en la categoría Starter con un 3% de comisión directa. A medida que sumás reservas confirmadas, el sistema actualiza automáticamente tu rango a Pro Creator (5%), Master Partner (7%) y VIP Ambassador (10%).",
    },
    {
      q: "¿Cómo aplica el descuento mi audiencia o mis huéspedes?",
      a: "Se te asigna un código nominal (por ejemplo, TUCUMAN10OFF) que el pasajero ingresa al momento de reservar su excursión o traslado en TravelApp Experience, aplicando el descuento en el acto.",
    },
    {
      q: "¿Cuándo y cómo se liquidan mis comisiones?",
      a: "Podés optar por liquidación inmediata en cada transacción mediante Split de Mercado Pago o liquidación consolidada semanal todos los lunes vía transferencia bancaria CBU/CVU.",
    },
  ],
  contacto: {
    telefono: "0810-220-0018",
    email: "hola@travelapp.ar",
    whatsapp: "5493812000712",
    whatsappDisplay: "+54 9 381 200-0712",
  },
  legales: {
    razonSocial: "TravelApp S.A.S.",
    cuit: "30-71829340-9",
    domicilio: "San Miguel de Tucumán, Argentina",
    terminos:
      "Al participar del Programa de Afiliados y Partners, el usuario acepta los términos comerciales y de atribución vigentes de TravelApp S.A.S.",
    privacidad:
      "TravelApp S.A.S. garantiza la confidencialidad y protección de los datos personales y bancarios de conformidad con la Ley N° 25.326.",
  },
  redesSociales: {
    facebook: "https://facebook.com/travelapp.ar",
    instagram: "https://instagram.com/travelapp.ar",
    whatsapp: "https://wa.me/5493812000712",
    linkedin: "https://linkedin.com/company/travelapp-sas",
    youtube: "https://youtube.com/@travelapp_ar",
    tiktok: "https://tiktok.com/@travelapp.ar",
    messenger: "https://m.me/travelapp",
  },
  sellosLegales: {
    arcaQr: "",
    baseDatosSello: "",
  },
  footer: {
    brandText: "TravelApp Experience Partners",
    description:
      "El Ecosistema de Viajes más completo de Argentina. Turismo receptivo, movilidad segura y programa de partners.",
    copyrightText: "Copyright © 2026 TravelApp S.A.S. Todos los derechos reservados.",
  },
};

export default function AfiliadosLandingClient() {
  const [cmsData, setCmsData] = useState(DEFAULT_AFILIADOS_CMS_DATA);
  const [tiers, setTiers] = useState(DEFAULT_EXPERIENCE_TIERS);
  const [livePositions, setLivePositions] = useState<
    { id: string; title: string; area: string }[]
  >([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showTravisChannels, setShowTravisChannels] = useState(false);
  const [legalModal, setLegalModal] = useState<{
    title: string;
    content: string;
  } | null>(null);

  // Escuchar matriz de niveles en tiempo real desde Firestore
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, "settings", "affiliate_tiers"),
        (snap) => {
          if (snap.exists() && snap.data()?.tiers) {
            setTiers(snap.data().tiers);
          }
        },
        (err) => {
          console.warn("[Tiers listener error]:", err?.message || err);
        }
      );
      return () => unsub();
    } catch (err) {
      console.warn("[Tiers listener error]:", err);
    }
  }, []);

  // Escuchar búsquedas laborales activas desde RRHH (/hr)
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "job_openings"),
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((j) => j.active !== false && j.publishedOnWeb !== false)
            .map((j) => ({
              id: j.id,
              title: j.title || "Puesto disponible",
              area: j.area || "General",
            }));
          setLivePositions(list);
        },
        (err) => {
          console.warn("[RRHH job_openings listener]:", err?.message || err);
        }
      );
      return () => unsub();
    } catch (err) {
      console.warn("[RRHH listener error]:", err);
    }
  }, []);

  // Estado Modal Trabajá con Nosotros (sincronizado con módulo RRHH /hr)
  const [showJobModal, setShowJobModal] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [jobForm, setJobForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    jobTitle: "",
    motivation: "",
    linkedinOrCvUrl: "",
  });

  // Escuchar cambios dinámicos del CMS en tiempo real
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, "cms_blocks", "landing_afiliados"),
        (snap) => {
          if (snap.exists()) {
            const val = snap.data();
            setCmsData({
              ...DEFAULT_AFILIADOS_CMS_DATA,
              ...val,
              header: { ...DEFAULT_AFILIADOS_CMS_DATA.header, ...(val.header || {}) },
              hero: { ...DEFAULT_AFILIADOS_CMS_DATA.hero, ...(val.hero || {}) },
              promoPopup: {
                ...DEFAULT_AFILIADOS_CMS_DATA.promoPopup,
                ...(val.promoPopup || {}),
              },
              stats:
                Array.isArray(val.stats) && val.stats.length > 0
                  ? val.stats
                  : DEFAULT_AFILIADOS_CMS_DATA.stats,
              payoutMethods: {
                ...DEFAULT_AFILIADOS_CMS_DATA.payoutMethods,
                ...(val.payoutMethods || {}),
              },
              faqs:
                Array.isArray(val.faqs) && val.faqs.length > 0
                  ? val.faqs
                  : DEFAULT_AFILIADOS_CMS_DATA.faqs,
              contacto: {
                ...DEFAULT_AFILIADOS_CMS_DATA.contacto,
                ...(val.contacto || {}),
              },
              legales: { ...DEFAULT_AFILIADOS_CMS_DATA.legales, ...(val.legales || {}) },
              redesSociales: {
                ...DEFAULT_AFILIADOS_CMS_DATA.redesSociales,
                ...(val.redesSociales || {}),
              },
              sellosLegales: {
                ...DEFAULT_AFILIADOS_CMS_DATA.sellosLegales,
                ...(val.sellosLegales || {}),
              },
              footer: { ...DEFAULT_AFILIADOS_CMS_DATA.footer, ...(val.footer || {}) },
            });
          }
        },
        (err) => {
          console.warn("[CMS Afiliados listener error]:", err?.message || err);
        }
      );
      return () => unsub();
    } catch (err) {
      console.warn("[CMS Afiliados listener error]:", err);
    }
  }, []);

  const demoCode = cmsData.hero?.demoCode || "TUCUMAN10OFF";
  const phoneDisplay = cmsData.contacto?.telefono || "0810-220-0018";
  const phoneHref = `tel:${phoneDisplay.replace(/[^0-9+]/g, "")}`;
  const contactEmail = cmsData.contacto?.email || "hola@travelapp.ar";
  const rawWhatsapp =
    cmsData.contacto?.whatsapp || cmsData.redesSociales?.whatsapp || "5493812000712";
  const whatsappDigits = rawWhatsapp.replace(/\D/g, "") || "5493812000712";
  const whatsappBaseUrl = rawWhatsapp.startsWith("http")
    ? rawWhatsapp
    : `https://wa.me/${whatsappDigits}`;
  const whatsappDisplay = cmsData.contacto?.whatsappDisplay || "+54 9 381 200-0712";
  const messengerUrl = cmsData.redesSociales?.messenger || "https://m.me/travelapp";
  const instagramUrl = cmsData.redesSociales?.instagram || "https://instagram.com/travelapp.ar";

  const handleCopyDemoCode = () => {
    navigator.clipboard.writeText(demoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobError(null);

    if (
      !jobForm.fullName.trim() ||
      !jobForm.email.trim() ||
      !jobForm.phone.trim() ||
      !jobForm.whatsapp.trim() ||
      !jobForm.motivation.trim()
    ) {
      setJobError("Por favor completá todos los campos obligatorios.");
      return;
    }

    if (!cvFile && !jobForm.linkedinOrCvUrl.trim()) {
      setJobError("Adjuntá tu Currículum Vitae (PDF/DOCX) o pegá un enlace a tu CV/LinkedIn.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    try {
      let cvUrl = "";
      let cvFileName = "";
      let cvMimeType = "";

      if (cvFile) {
        if (cvFile.size > MAX_CV_BYTES) {
          throw new Error("El archivo del Currículum supera el límite máximo de 5 MB.");
        }
        cvFileName = cvFile.name;
        cvMimeType = cvFile.type || "application/pdf";
        const safeName = cvFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        try {
          const fileRef = storageRef(storage, `cv_submissions/${Date.now()}_${safeName}`);
          await uploadBytes(fileRef, cvFile);
          cvUrl = await getDownloadURL(fileRef);
        } catch (storageErr) {
          console.warn("Fallback CV upload:", storageErr);
          if (cvFile.size <= MAX_FALLBACK_DATAURL_BYTES) {
            cvUrl = await readFileAsDataUrl(cvFile);
          } else {
            throw new Error(
              "No pudimos subir un archivo mayor a 700 KB en este momento. Probá con un PDF más liviano o pegá un enlace de Drive / LinkedIn."
            );
          }
        }
      }

      const matchedJob = livePositions.find((p) => p.title === jobForm.jobTitle);
      const chosenTitle = jobForm.jobTitle || "Postulación Espontánea";

      await addDoc(collection(db, "job_applications"), {
        fullName: jobForm.fullName.trim(),
        name: jobForm.fullName.trim(),
        email: jobForm.email.trim(),
        phone: jobForm.phone.trim(),
        whatsapp: jobForm.whatsapp.trim(),
        jobId: matchedJob?.id || null,
        jobTitle: chosenTitle,
        positionTitle: chosenTitle,
        jobArea: matchedJob?.area || "General",
        motivation: jobForm.motivation.trim(),
        message: jobForm.motivation.trim(),
        cvUrl,
        cvFileName,
        cvMimeType,
        cvLink: jobForm.linkedinOrCvUrl.trim(),
        source: "afiliados.travelapp.ar",
        status: "Nueva",
        createdAt: Date.now(),
        timestamp: Date.now(),
      });

      setSubmitStatus("success");
    } catch (err: any) {
      console.error(err);
      setJobError(
        err?.message || "No se pudo enviar tu postulación. Intentá nuevamente en unos minutos."
      );
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetJobModal = () => {
    setShowJobModal(false);
    setCvFile(null);
    setJobError(null);
    setSubmitStatus("idle");
    setJobForm({
      fullName: "",
      email: "",
      phone: "",
      whatsapp: "",
      jobTitle: "",
      motivation: "",
      linkedinOrCvUrl: "",
    });
  };

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] font-sans antialiased selection:bg-[#0a2a5b] selection:text-white overflow-x-hidden">
      {/* ════════════════════════════════════════════════════════════════
          1. HEADER CORPORATIVO — AZUL TECH #0a2a5b + LOGO EXPERIENCE BLANCO
      ════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full bg-[#0a2a5b] text-white border-b border-white/10">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/landing/afiliados" className="flex items-center gap-3 shrink-0">
            <img
              src="/assets/experience_blanco.svg"
              alt="TravelApp Experience"
              className="h-9 sm:h-10 w-auto object-contain brightness-100 contrast-125"
            />
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 border border-white/25 text-white/90">
              PARTNERS
            </span>
          </Link>

          {/* Navegación Central Estilo Apple */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-normal text-white/85 tracking-tight">
            <a href="#cobro" className="hover:text-white transition-colors">
              Liquidación & Herramientas
            </a>
            <a href="#niveles" className="hover:text-white transition-colors">
              Niveles y Comisiones
            </a>
            <a href="#faqs" className="hover:text-white transition-colors">
              Preguntas Frecuentes
            </a>
            <a href="#travis-afiliados" className="hover:text-white transition-colors">
              Travis
            </a>
            <Link
              href="/landing/experience/marketplace"
              className="hover:text-white transition-colors"
            >
              Travel Market
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowJobModal(true);
                setSubmitStatus("idle");
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Trabajá con Nosotros
            </button>
          </nav>

          {/* Acciones Derecha */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <a
              href={phoneHref}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/90 hover:text-white px-2.5 py-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#dc2626]" />
              <span>{phoneDisplay}</span>
            </a>

            <Link
              href="/mi-perfil"
              className="text-[12px] font-medium text-white/90 hover:text-white px-3 py-1.5 border border-white/25 hover:border-white transition-colors"
            >
              Crear Perfil
            </Link>

            <Link
              href={cmsData.header.loginUrl}
              className="text-[12px] font-medium text-white/90 hover:text-white px-3.5 py-1.5 border border-white/25 hover:border-white transition-colors"
            >
              Iniciar Sesión
            </Link>

            <Link
              href={cmsData.header.registerUrl}
              className="inline-flex items-center gap-1.5 bg-[#c81e1e] hover:bg-[#a81818] text-white text-[12px] font-medium px-4 py-1.5 rounded-full transition-colors"
            >
              <span>{cmsData.header.ctaText}</span>
            </Link>
          </div>

          {/* Botón Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-white/90 hover:text-white"
            aria-label="Menú"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Menú Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0a2a5b] border-t border-white/10 px-6 py-5 space-y-3 text-[14px]">
            <a
              href="#cobro"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-white/90 border-b border-white/10"
            >
              Liquidación & Herramientas
            </a>
            <a
              href="#niveles"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-white/90 border-b border-white/10"
            >
              Niveles y Comisiones
            </a>
            <a
              href="#faqs"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-white/90 border-b border-white/10"
            >
              Preguntas Frecuentes
            </a>
            <Link
              href="/landing/experience/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-white/90 border-b border-white/10"
            >
              Travel Market
            </Link>
            <a
              href={phoneHref}
              className="flex items-center gap-2 py-2 text-white font-medium"
            >
              <Phone className="w-4 h-4 text-[#dc2626]" />
              {phoneDisplay}
            </a>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                href={cmsData.header.loginUrl}
                className="w-full text-center py-2.5 border border-white/30 text-white text-[13px] font-medium"
              >
                Iniciar Sesión
              </Link>
              <Link
                href={cmsData.header.registerUrl}
                className="w-full text-center py-2.5 bg-[#c81e1e] text-white text-[13px] font-medium"
              >
                {cmsData.header.ctaText}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ════════════════════════════════════════════════════════════════
          2. CINTA SUPERIOR INFORMATIVA (Estilo Apple Ribbon)
      ════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-[#f5f5f7] border-b border-[#d2d2d7]/70 py-2.5 px-4 text-center">
        <p className="text-[12px] text-[#1d1d1f] tracking-tight">
          <span className="font-semibold text-[#0a2a5b]">
            {cmsData.footer?.brandText || "TravelApp Experience Partners"}:
          </span>{" "}
          {cmsData.hero?.ribbonText ||
            "Comisiones de hasta el 10% con acreditación inmediata vía Split Mercado Pago o CBU semanal."}{" "}
          <Link
            href={cmsData.header.registerUrl}
            className="text-[#c81e1e] hover:underline font-medium inline-flex items-center gap-0.5 ml-1"
          >
            Solicitar alta sin cargo <ChevronRight className="w-3 h-3" />
          </Link>
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          3. HERO CORPORATIVO FULL-BLEED ESTILO APPLE.COM/LA
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full min-h-[620px] bg-[#000000] text-white overflow-hidden flex flex-col justify-between">
        {/* Imagen de Fondo de Alta Definición con Viñeta Sobria */}
        <div className="absolute inset-0">
          <img
            src={cmsData.hero.heroImage}
            alt="TravelApp Experience Partners"
            className="w-full h-full object-cover object-center opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#000000]/85 via-[#0a2a5b]/55 to-[#000000]/95" />
        </div>

        {/* Contenido Central */}
        <div className="relative z-10 max-w-[980px] mx-auto px-6 pt-16 pb-12 text-center space-y-5 my-auto">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#ef4444]">
            {cmsData.hero.badge}
          </p>
          <h1 className="text-[38px] sm:text-[52px] md:text-[62px] font-semibold tracking-[-0.03em] leading-[1.06] text-white max-w-4xl mx-auto">
            {cmsData.hero.title}
          </h1>
          <p className="text-[17px] sm:text-[20px] text-white/80 font-normal leading-[1.4] max-w-2xl mx-auto">
            {cmsData.hero.subtitle}
          </p>

          {/* Doble Botón Píldora Estilo Apple.com/la */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href={cmsData.header.registerUrl}
              className="px-6 py-2.5 rounded-full bg-[#c81e1e] hover:bg-[#a81818] text-white text-[14px] font-normal tracking-tight transition-colors"
            >
              {cmsData.hero.primaryCtaText}
            </Link>
            <a
              href="#niveles"
              className="px-6 py-2.5 rounded-full border border-white/60 hover:bg-white hover:text-[#1d1d1f] text-white text-[14px] font-normal tracking-tight transition-colors"
            >
              {cmsData.hero.secondaryCtaText}
            </a>
          </div>
        </div>

        {/* Barra Inferior de Métricas + Demo de Cupón en Vivo */}
        <div className="relative z-10 w-full border-t border-white/15 bg-black/60 backdrop-blur-md">
          <div className="max-w-[1160px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {cmsData.stats.map((s, idx) => (
                <div key={idx} className="border-l border-white/15 pl-4 first:border-l-0 first:pl-0">
                  <p className="text-[11px] uppercase tracking-wider text-white/55">
                    {s.label}
                  </p>
                  <p className="text-[22px] sm:text-[24px] font-semibold text-white tracking-tight mt-0.5">
                    {s.value}
                  </p>
                  <p className="text-[11px] text-white/65">{s.detail}</p>
                </div>
              ))}
            </div>

            {/* Simulador de Cupón de Atribución */}
            <div className="lg:col-span-4 flex items-center justify-between bg-white/10 border border-white/20 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/65">
                  DEMO CÓDIGO DE EMBAJADOR
                </p>
                <p className="text-[16px] font-mono font-semibold text-white tracking-wider">
                  {demoCode}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyDemoCode}
                className="px-3.5 py-1.5 bg-[#c81e1e] hover:bg-[#a81818] text-white text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Probar Cupón
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          4. MOSAICO EDITORIAL 2x2 ESTILO APPLE.COM/LA (#cobro)
          4 paneles arquitectónicos de corte recto (gap-3 p-3)
      ════════════════════════════════════════════════════════════════ */}
      <section id="cobro" className="w-full bg-white p-3">
        {(cmsData.payoutMethods?.title || cmsData.payoutMethods?.subtitle) && (
          <div className="max-w-[1160px] mx-auto px-3 sm:px-6 pt-12 pb-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c81e1e] mb-2">
              MODELO DE COBRO Y HERRAMIENTAS
            </p>
            <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-[-0.025em] text-[#1d1d1f] leading-[1.08]">
              {cmsData.payoutMethods.title}
            </h2>
            {cmsData.payoutMethods.subtitle && (
              <p className="mt-2.5 text-[16px] text-[#6e6e73] max-w-2xl mx-auto">
                {cmsData.payoutMethods.subtitle}
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* PANEL 1 (OSCURO #000000): SPLIT MERCADO PAGO INSTANTÁNEO */}
          <div className="relative h-[540px] sm:h-[570px] bg-[#000000] text-white overflow-hidden flex flex-col justify-between p-8 sm:p-12">
            <div className="text-center max-w-lg mx-auto space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ef4444]">
                LIQUIDACIÓN EN TIEMPO REAL
              </p>
              <h2 className="text-[30px] sm:text-[36px] font-semibold tracking-[-0.025em] leading-[1.08]">
                {cmsData.payoutMethods.optionMpTitle}
              </h2>
              <p className="text-[15px] text-white/75 font-normal leading-[1.4]">
                {cmsData.payoutMethods.optionMpDesc}
              </p>
              <div className="pt-3 flex items-center justify-center gap-3">
                <Link
                  href={cmsData.header.registerUrl}
                  className="px-5 py-2 rounded-full bg-[#c81e1e] hover:bg-[#a81818] text-white text-[13px] font-normal transition-colors"
                >
                  Vincular cuenta
                </Link>
                <a
                  href="#niveles"
                  className="px-5 py-2 rounded-full border border-white/50 hover:bg-white hover:text-[#1d1d1f] text-white text-[13px] font-normal transition-colors"
                >
                  Ver comisiones
                </a>
              </div>
            </div>

            {/* Especificación Financiera Inferior */}
            <div className="w-full max-w-md mx-auto bg-[#141416] border border-white/15 p-6 space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/60">
                  EJEMPLO DE CONCILIACIÓN OAUTH
                </span>
                <span className="text-[11px] font-mono text-[#ef4444] font-semibold">
                  SPLIT AUTOMÁTICO
                </span>
              </div>
              <div className="flex justify-between text-[13px] text-white/80">
                <span>Reserva Excursión Confirmada</span>
                <span className="font-mono text-white">$100.000 ARS</span>
              </div>
              <div className="flex justify-between text-[14px] font-semibold text-white border-t border-white/10 pt-3">
                <span>Acreditación Inmediata Partner (10%)</span>
                <span className="font-mono text-[#ef4444]">+$10.000 ARS</span>
              </div>
              <div className="flex justify-between text-[12px] text-white/50">
                <span>Tiempo de liquidación</span>
                <span>0 segundos (En el acto)</span>
              </div>
            </div>
          </div>

          {/* PANEL 2 (AZUL TECH #0a2a5b): LIQUIDACIÓN SEMANAL CBU / CVU */}
          <div className="relative h-[540px] sm:h-[570px] bg-[#0a2a5b] text-white overflow-hidden flex flex-col justify-between p-8 sm:p-12">
            <div className="text-center max-w-lg mx-auto space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                TESORERÍA BANCARIA DIRECTA
              </p>
              <h2 className="text-[30px] sm:text-[36px] font-semibold tracking-[-0.025em] leading-[1.08]">
                {cmsData.payoutMethods.optionCbuTitle}
              </h2>
              <p className="text-[15px] text-white/80 font-normal leading-[1.4]">
                {cmsData.payoutMethods.optionCbuDesc}
              </p>
              <div className="pt-3 flex items-center justify-center gap-3">
                <Link
                  href={cmsData.header.registerUrl}
                  className="px-5 py-2 rounded-full bg-white text-[#0a2a5b] hover:bg-white/90 text-[13px] font-medium transition-colors"
                >
                  Configurar mi CBU
                </Link>
                <a
                  href="#faqs"
                  className="px-5 py-2 rounded-full border border-white/50 hover:bg-white hover:text-[#0a2a5b] text-white text-[13px] font-normal transition-colors"
                >
                  Más información
                </a>
              </div>
            </div>

            {/* Especificación Bancaria Inferior */}
            <div className="w-full max-w-md mx-auto bg-[#071d40] border border-white/15 p-6 space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/60">
                  RESUMEN DE LIQUIDACIÓN SEMANAL
                </span>
                <span className="text-[11px] font-mono text-white font-semibold">
                  CADA LUNES
                </span>
              </div>
              <div className="flex justify-between text-[13px] text-white/80">
                <span>Comisiones Acumuladas en la Semana</span>
                <span className="font-mono text-white">$148.500 ARS</span>
              </div>
              <div className="flex justify-between text-[14px] font-semibold text-white border-t border-white/10 pt-3">
                <span>Transferencia Bancaria Directa</span>
                <span className="font-mono text-white">$148.500 ARS</span>
              </div>
              <div className="flex justify-between text-[12px] text-white/55">
                <span>Comprobante y liquidación</span>
                <span>Disponible en tu Panel Partner</span>
              </div>
            </div>
          </div>

          {/* PANEL 3 (GRIS HIELO #f5f5f7): ATRIBUCIÓN POR CUPÓN Y QR */}
          <div className="relative h-[540px] sm:h-[570px] bg-[#f5f5f7] text-[#1d1d1f] overflow-hidden flex flex-col justify-between">
            <div className="px-8 pt-12 pb-6 text-center max-w-lg mx-auto space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c81e1e]">
                HERRAMIENTAS DE CONVERSIÓN
              </p>
              <h2 className="text-[30px] sm:text-[36px] font-semibold tracking-[-0.025em] leading-[1.08]">
                {cmsData.payoutMethods.panel3Title || "Códigos Nominales y Enlaces QR."}
              </h2>
              <p className="text-[15px] text-[#515154] font-normal leading-[1.4]">
                {cmsData.payoutMethods.panel3Desc ||
                  "Otorgá hasta un 20% de descuento real en excursiones y traslados. Cada uso de tu cupón se registra en vivo en tu consola de afiliado."}
              </p>
              <div className="pt-3 flex items-center justify-center gap-3">
                <Link
                  href={cmsData.header.registerUrl}
                  className="px-5 py-2 rounded-full bg-[#0a2a5b] hover:bg-[#071d40] text-white text-[13px] font-normal transition-colors"
                >
                  Crear mi código
                </Link>
                <Link
                  href="/landing/experience/marketplace"
                  className="px-5 py-2 rounded-full border border-[#0a2a5b] text-[#0a2a5b] hover:bg-[#0a2a5b] hover:text-white text-[13px] font-normal transition-colors"
                >
                  Ver excursiones
                </Link>
              </div>
            </div>

            <div className="relative w-full h-[270px] mt-auto overflow-hidden">
              <img
                src={
                  cmsData.payoutMethods.panel3Image ||
                  "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1400&q=85"
                }
                alt="Atribución Digital"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          {/* PANEL 4 (SUPERFICIE CLARA #edf1f7): HOTELES, RECEPCIONISTAS Y CREADORES */}
          <div className="relative h-[540px] sm:h-[570px] bg-[#edf1f7] text-[#1d1d1f] overflow-hidden flex flex-col justify-between">
            <div className="px-8 pt-12 pb-6 text-center max-w-lg mx-auto space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a2a5b]">
                PERFILES HABILITADOS
              </p>
              <h2 className="text-[30px] sm:text-[36px] font-semibold tracking-[-0.025em] leading-[1.08]">
                {cmsData.payoutMethods.panel4Title || "Creadores, Conserjerías y Hoteles."}
              </h2>
              <p className="text-[15px] text-[#515154] font-normal leading-[1.4]">
                {cmsData.payoutMethods.panel4Desc ||
                  "Tanto si tenés una comunidad digital como si recibís turistas en recepción hotelera, recomendá circuitos habilitados con respaldo operativo 24/7."}
              </p>
              <div className="pt-3 flex items-center justify-center gap-3">
                <Link
                  href={cmsData.header.registerUrl}
                  className="px-5 py-2 rounded-full bg-[#c81e1e] hover:bg-[#a81818] text-white text-[13px] font-normal transition-colors"
                >
                  Registrarme ahora
                </Link>
                <a
                  href="#travis-afiliados"
                  className="px-5 py-2 rounded-full border border-[#0a2a5b] text-[#0a2a5b] hover:bg-[#0a2a5b] hover:text-white text-[13px] font-normal transition-colors"
                >
                  Consultar a Travis
                </a>
              </div>
            </div>

            <div className="relative w-full h-[270px] mt-auto overflow-hidden">
              <img
                src={
                  cmsData.payoutMethods.panel4Image ||
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85"
                }
                alt="Hotelería y Turismo Receptivo"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          5. MATRIZ DE NIVELES Y COMISIONES (#niveles)
          Estilo Tabla de Especificaciones de Apple (Corte Recto, Sin Tarjetas Globosas)
      ════════════════════════════════════════════════════════════════ */}
      <section
        id="niveles"
        className="w-full bg-white py-20 sm:py-24 px-4 sm:px-6 border-t border-b border-[#d2d2d7]"
      >
        <div className="max-w-[1160px] mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[#c81e1e] mb-2">
              ESCALA DE RENDIMIENTO
            </p>
            <h2 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.025em] text-[#1d1d1f] leading-[1.08]">
              {cmsData.payoutMethods.nivelesTitle ||
                "A mayor volumen de reservas, mayor porcentaje de comisión."}
            </h2>
            <p className="mt-3 text-[17px] text-[#6e6e73] font-normal leading-[1.45]">
              {cmsData.payoutMethods.nivelesSubtitle ||
                "Tu cuenta asciende de categoría automáticamente a medida que tus referidos completan sus excursiones y traslados."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-b border-[#d2d2d7] divide-y md:divide-y-0 md:divide-x divide-[#d2d2d7]">
            {tiers.map((tier, idx) => (
              <div
                key={tier.id}
                className="p-8 flex flex-col justify-between bg-white hover:bg-[#f5f5f7]/60 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#6e6e73]">
                      NIVEL 0{idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 bg-[#0a2a5b] text-white">
                      {tier.name}
                    </span>
                  </div>

                  <div className="mb-8 pb-6 border-b border-[#e5e5ea]">
                    <p className="text-[48px] font-semibold tracking-[-0.03em] text-[#1d1d1f] leading-none">
                      {tier.commissionPct}%
                    </p>
                    <p className="text-[13px] text-[#6e6e73] mt-2">
                      Comisión directa por reserva
                    </p>
                  </div>

                  <ul className="space-y-3.5 text-[13px] text-[#1d1d1f] mb-8">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#c81e1e] shrink-0 mt-0.5" />
                      <span>
                        Volumen:{" "}
                        <strong>
                          {tier.minBookings} a {tier.maxBookings || "∞"}
                        </strong>{" "}
                        reservas
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#c81e1e] shrink-0 mt-0.5" />
                      <span>
                        Descuento comunidad:{" "}
                        <strong>{tier.couponDiscountPct}% OFF</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#0a2a5b] shrink-0 mt-0.5" />
                      <span>
                        Bonificación:{" "}
                        <strong>+{tier.bonusRewardPoints} Puntos Rewards</strong>
                      </span>
                    </li>
                  </ul>
                </div>

                <Link
                  href={cmsData.header.registerUrl}
                  className="w-full py-2.5 px-4 rounded-full bg-[#0a2a5b] hover:bg-[#c81e1e] text-white text-[13px] font-normal text-center transition-colors"
                >
                  Comenzar en este nivel
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          6. PREGUNTAS FRECUENTES (#faqs) — ESTILO EDITORIAL APPLE
      ════════════════════════════════════════════════════════════════ */}
      <section id="faqs" className="w-full bg-[#f5f5f7] py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-[980px] mx-auto">
          <div className="mb-12">
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[#c81e1e] mb-2">
              SOPORTE A EMBAJADORES
            </p>
            <h2 className="text-[34px] sm:text-[42px] font-semibold tracking-[-0.025em] text-[#1d1d1f]">
              Preguntas frecuentes.
            </h2>
          </div>

          <div className="border-t border-[#d2d2d7] divide-y divide-[#d2d2d7]">
            {cmsData.faqs.map((faq, idx) => (
              <div
                key={idx}
                className="py-7 grid grid-cols-1 md:grid-cols-12 gap-4 items-start"
              >
                <h3 className="md:col-span-5 text-[17px] font-semibold text-[#1d1d1f] tracking-tight pr-4">
                  {faq.q}
                </h3>
                <p className="md:col-span-7 text-[15px] text-[#515154] leading-[1.5]">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          7. SECCIÓN TRAVIS EXPERIENCE PARTNERS (#travis-afiliados)
      ════════════════════════════════════════════════════════════════ */}
      <section
        id="travis-afiliados"
        className="w-full bg-white py-20 px-4 sm:px-6 border-t border-[#d2d2d7]"
      >
        <div className="max-w-[1080px] mx-auto bg-[#0a2a5b] text-white p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="w-24 h-24 bg-white p-3 flex items-center justify-center mb-4">
                <img
                  src="/assets/travis_formal.svg"
                  alt="Travis Concierge"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ef4444]">
                MESA DE AYUDA PARTNERS
              </span>
              <h3 className="text-[26px] font-semibold text-white tracking-tight mt-1">
                Asistencia Travis 24/7
              </h3>
            </div>

            <div className="lg:col-span-8 space-y-5">
              <p className="text-[16px] sm:text-[18px] text-white/85 font-normal leading-relaxed">
                ¿Necesitás asistencia para vincular tu cuenta de Mercado Pago, dar de alta a tu hotel o consultar la disponibilidad de una excursión para tus clientes? Contactá a{" "}
                <strong className="font-semibold text-white">Travis</strong> en tiempo real.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTravisChannels(!showTravisChannels)}
                  className="px-6 py-2.5 rounded-full bg-[#c81e1e] hover:bg-[#a81818] text-white text-[13px] font-medium transition-colors cursor-pointer"
                >
                  {showTravisChannels
                    ? "Ocultar canales de atención"
                    : "Desplegar canales de Travis"}
                </button>
                <a
                  href={`https://wa.me/${whatsappDigits}?text=Hola%20Travis,%20quiero%20sumarme%20al%20Programa%20de%20Afiliados%20de%20TravelApp%20Experience`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 rounded-full border border-white/50 hover:bg-white hover:text-[#0a2a5b] text-white text-[13px] font-normal transition-colors"
                >
                  WhatsApp Oficial ({whatsappDisplay})
                </a>
              </div>

              {showTravisChannels && (
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 border-t border-white/15">
                  <a
                    href={`https://wa.me/${whatsappDigits}?text=Hola%20Travis,%20consulta%20Programa%20de%20Afiliados`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 border border-white/15 p-3.5 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      WA
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white">WhatsApp</p>
                      <p className="text-[11px] text-white/70">{whatsappDisplay}</p>
                    </div>
                  </a>

                  {messengerUrl && (
                    <a
                      href={messengerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/10 hover:bg-white/20 border border-white/15 p-3.5 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#0084FF] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        FB
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-white">Messenger</p>
                        <p className="text-[11px] text-white/70">Chat directo</p>
                      </div>
                    </a>
                  )}

                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/10 hover:bg-white/20 border border-white/15 p-3.5 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#E1306C] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        IG
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-white">Instagram</p>
                        <p className="text-[11px] text-white/70">Mensaje Directo</p>
                      </div>
                    </a>
                  )}

                  <a
                    href={phoneHref}
                    className="bg-white/10 hover:bg-white/20 border border-white/15 p-3.5 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-white text-[#0a2a5b] flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white">Teléfono</p>
                      <p className="text-[11px] text-white/70">{phoneDisplay}</p>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          8. FOOTER CORPORATIVO OFICIAL (#0a2a5b)
      ════════════════════════════════════════════════════════════════ */}
      <footer className="w-full bg-[#0a2a5b] text-white/85 font-sans border-t border-white/10">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/15">
            {/* Columna 1: Marca */}
            <div className="md:col-span-4 space-y-5">
              <img
                src="/assets/travelapp_blanco.svg"
                alt={cmsData.footer?.brandText || "TravelApp Ecosistema"}
                className="h-9 w-auto object-contain"
              />
              <p className="text-[12px] text-white/65 leading-relaxed max-w-xs">
                {cmsData.footer?.description ||
                  "El Ecosistema de Viajes más completo de Argentina. Turismo receptivo, movilidad segura y programa de partners."}
              </p>

              <div className="flex items-center gap-2.5 pt-1">
                {cmsData.redesSociales?.facebook && (
                  <a
                    href={cmsData.redesSociales.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#1877F2] transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                  </a>
                )}
                {cmsData.redesSociales?.instagram && (
                  <a
                    href={cmsData.redesSociales.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#E1306C] transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
                {cmsData.redesSociales?.tiktok && (
                  <a
                    href={cmsData.redesSociales.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-black transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </a>
                )}
                {cmsData.redesSociales?.youtube && (
                  <a
                    href={cmsData.redesSociales.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#FF0000] transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                )}
                {cmsData.redesSociales?.linkedin && (
                  <a
                    href={cmsData.redesSociales.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#0A66C2] transition-colors flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Columna 2: Unidades del Ecosistema */}
            <div className="md:col-span-3 space-y-2.5 text-[12px]">
              <h4 className="font-semibold text-white tracking-tight">
                Unidades de Negocio
              </h4>
              <ul className="space-y-2.5 text-white/70">
                <li>
                  <Link
                    href="/landing/experience"
                    className="hover:text-white transition-colors"
                  >
                    TravelApp Experience
                  </Link>
                </li>
                <li>
                  <Link
                    href="/landing/experience/marketplace"
                    className="hover:text-white transition-colors"
                  >
                    Travel Market
                  </Link>
                </li>
                <li>
                  <Link
                    href="/landing/rewards"
                    className="hover:text-white transition-colors"
                  >
                    TravelApp Rewards
                  </Link>
                </li>
                <li>
                  <Link
                    href="/landing/travelcab"
                    className="hover:text-white transition-colors"
                  >
                    TravelCab
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 3: Información Legal */}
            <div className="md:col-span-2 space-y-2.5 text-[12px]">
              <h4 className="font-semibold text-white tracking-tight">Legales</h4>
              <ul className="space-y-2 text-white/70">
                <li>{cmsData.legales?.razonSocial}</li>
                <li>CUIT: {cmsData.legales?.cuit}</li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      setLegalModal({
                        title: "Términos y Condiciones",
                        content: cmsData.legales?.terminos,
                      })
                    }
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Términos y condiciones
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      setLegalModal({
                        title: "Política de Privacidad",
                        content: cmsData.legales?.privacidad,
                      })
                    }
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Política de privacidad
                  </button>
                </li>
              </ul>
            </div>

            {/* Columna 4: Contacto & RRHH */}
            <div className="md:col-span-3 space-y-2.5 text-[12px]">
              <h4 className="font-semibold text-white tracking-tight">
                Atención y Contacto
              </h4>
              <ul className="space-y-2 text-white/70">
                <li>
                  <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors">
                    Contacto: <span className="text-white">{contactEmail}</span>
                  </a>
                </li>
                <li>
                  <a href={phoneHref} className="hover:text-white transition-colors">
                    Teléfono: <span className="text-white">{phoneDisplay}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={whatsappBaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    WhatsApp (Travis):{" "}
                    <span className="text-white">{whatsappDisplay}</span>
                  </a>
                </li>
                <li className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowJobModal(true);
                      setSubmitStatus("idle");
                      setJobError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-white hover:underline underline-offset-4 cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-[#ef4444]" />
                    Trabajá con Nosotros
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Barra Institucional QR ARCA + ATAVyT + RNBD */}
          <div className="py-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              {cmsData.sellosLegales?.arcaQr ? (
                <div className="flex items-center gap-2.5">
                  <RenderLegalSeal content={cmsData.sellosLegales.arcaQr} alt="ARCA Data Fiscal" />
                  <div className="text-[11px] leading-tight">
                    <div className="font-semibold text-white">Inscripción ARCA</div>
                    <div className="text-white/60">Data Fiscal Oficial</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-white p-1 flex items-center justify-center shrink-0">
                    <QrCode className="w-8 h-8 text-[#0a2a5b]" />
                  </div>
                  <div className="text-[11px] leading-tight">
                    <div className="font-semibold text-white">Inscripción ARCA</div>
                    <div className="text-white/60">Data Fiscal Oficial</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 pl-6 border-l border-white/15">
                <div className="px-2.5 py-1.5 bg-white/10 border border-white/20 text-[11px] font-semibold text-white tracking-tight">
                  ATAVyT
                </div>
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold text-white">Socio Activo</div>
                  <div className="text-white/60">Agencias de Viajes y Turismo</div>
                </div>
              </div>

              {cmsData.sellosLegales?.baseDatosSello ? (
                <div className="flex items-center gap-2.5 pl-6 border-l border-white/15">
                  <RenderLegalSeal
                    content={cmsData.sellosLegales.baseDatosSello}
                    alt="Base de Datos"
                  />
                  <div className="text-[11px] leading-tight">
                    <div className="font-semibold text-white">Base de Datos</div>
                    <div className="text-white/60">Ley N° 25.326 PDP</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 pl-6 border-l border-white/15">
                  <div className="px-2.5 py-1.5 bg-white/10 border border-white/20 text-[11px] font-semibold text-white tracking-tight">
                    RNBD
                  </div>
                  <div className="text-[11px] leading-tight">
                    <div className="font-semibold text-white">Base de Datos</div>
                    <div className="text-white/60">Ley N° 25.326 PDP</div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-[11px] text-white/50">
              Ecosistema Auditado · Concorde 360
            </div>
          </div>

          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/55">
            <p>
              {cmsData.footer?.copyrightText ||
                `© 2026 ${cmsData.legales?.razonSocial || "TravelApp S.A.S."} — Todos los derechos reservados.`}
            </p>
            <p>{cmsData.legales?.domicilio}</p>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════════════════════
          MODAL LEGAL
      ════════════════════════════════════════════════════════════════ */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="bg-white border border-[#d2d2d7] p-8 max-w-lg w-full text-[#1d1d1f] space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#d2d2d7] pb-4">
              <h3 className="text-[20px] font-semibold text-[#0a2a5b]">
                {legalModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="text-[#6e6e73] hover:text-[#1d1d1f] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[13px] text-[#515154] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
              {legalModal.content}
            </p>
            <button
              type="button"
              onClick={() => setLegalModal(null)}
              className="w-full py-2.5 bg-[#0a2a5b] text-white text-[13px] font-medium cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL DE POSTULACIÓN LABORAL (TRABAJÁ CON NOSOTROS · SYNC RRHH)
      ════════════════════════════════════════════════════════════════ */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/65 backdrop-blur-sm overflow-y-auto font-sans">
          <div className="w-full max-w-2xl bg-white shadow-2xl mb-8 overflow-hidden border border-[#d2d2d7]">
            <div className="relative bg-[#0a2a5b] p-8 text-white">
              <button
                type="button"
                onClick={resetJobModal}
                className="absolute top-5 right-5 h-9 w-9 bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5 text-white" />
              </button>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ef4444]">
                RECURSOS HUMANOS · POSTULACIONES ABIERTAS
              </span>
              <h3 className="text-[26px] font-semibold mt-1 leading-snug">
                Sumate al Equipo TravelApp
              </h3>
              <p className="text-[13px] text-white/75 mt-1">
                Postulate a nuestras búsquedas activas o enviá tu postulación espontánea directa a RRHH.
              </p>
            </div>

            {submitStatus === "success" ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 bg-[#0a2a5b] text-white flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="text-[22px] font-semibold text-[#0a2a5b]">
                  Postulación recibida correctamente
                </h4>
                <p className="text-[#515154] text-[13px]">
                  Tu perfil y Currículum Vitae fueron registrados en el módulo de Recursos Humanos de Concorde 360.
                </p>
                <button
                  type="button"
                  onClick={resetJobModal}
                  className="bg-[#0a2a5b] text-white px-8 py-2.5 text-[13px] font-medium cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleJobSubmit} className="p-8 space-y-4 text-[13px]">
                {jobError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {jobError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-[#1d1d1f] mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: María Sofía González"
                      value={jobForm.fullName}
                      onChange={(e) =>
                        setJobForm((p) => ({ ...p, fullName: e.target.value }))
                      }
                      className="w-full border border-[#d2d2d7] px-3.5 py-2.5 bg-[#f5f5f7] focus:bg-white focus:border-[#0a2a5b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#1d1d1f] mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="nombre@correo.com"
                      value={jobForm.email}
                      onChange={(e) =>
                        setJobForm((p) => ({ ...p, email: e.target.value }))
                      }
                      className="w-full border border-[#d2d2d7] px-3.5 py-2.5 bg-[#f5f5f7] focus:bg-white focus:border-[#0a2a5b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#1d1d1f] mb-1">
                      Teléfono *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="+54 9 381 ..."
                      value={jobForm.phone}
                      onChange={(e) =>
                        setJobForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      className="w-full border border-[#d2d2d7] px-3.5 py-2.5 bg-[#f5f5f7] focus:bg-white focus:border-[#0a2a5b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#1d1d1f] mb-1">
                      WhatsApp *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="+54 9 381 ..."
                      value={jobForm.whatsapp}
                      onChange={(e) =>
                        setJobForm((p) => ({ ...p, whatsapp: e.target.value }))
                      }
                      className="w-full border border-[#d2d2d7] px-3.5 py-2.5 bg-[#f5f5f7] focus:bg-white focus:border-[#0a2a5b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#1d1d1f] mb-1">
                      Puesto al que te postulás *
                    </label>
                    <select
                      required
                      value={jobForm.jobTitle}
                      onChange={(e) =>
                        setJobForm((p) => ({ ...p, jobTitle: e.target.value }))
                      }
                      className="w-full border border-[#d2d2d7] px-3.5 py-2.5 bg-[#f5f5f7] focus:bg-white focus:border-[#0a2a5b] focus:outline-none"
                    >
                      <option value="">Seleccioná un puesto...</option>
                      {livePositions.map((pos) => (
                        <option key={pos.id} value={pos.title}>
                          {pos.title} ({pos.area})
                        </option>
                      ))}
                      <option value="Postulación Espontánea">Postulación Espontánea</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[#1d1d1f] mb-1">
                    ¿Por qué querés formar parte de TravelApp y qué valor aportarías al equipo? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Contanos brevemente tu motivación, experiencia relevante y qué aporte te gustaría sumar a nuestra operación..."
                    value={jobForm.motivation}
                    onChange={(e) =>
                      setJobForm((p) => ({ ...p, motivation: e.target.value }))
                    }
                    className="w-full border border-[#d2d2d7] px-3.5 py-2.5 bg-[#f5f5f7] focus:bg-white focus:border-[#0a2a5b] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-[#1d1d1f] mb-1">
                      Adjuntar Currículum Vitae (PDF/DOCX · máx. 5 MB)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setCvFile(f);
                      }}
                      className="w-full text-[12px] text-[#515154]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#1d1d1f] mb-1">
                      O enlace a LinkedIn / CV online (Opcional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/..."
                      value={jobForm.linkedinOrCvUrl}
                      onChange={(e) =>
                        setJobForm((p) => ({ ...p, linkedinOrCvUrl: e.target.value }))
                      }
                      className="w-full border border-[#d2d2d7] px-3.5 py-2 bg-[#f5f5f7] focus:bg-white focus:border-[#0a2a5b] focus:outline-none text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#0a2a5b] hover:bg-[#071d40] text-white font-medium text-[13px] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Enviando postulación..." : "Enviar Postulación a RRHH"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Push Pop Promocional / Aviso Minimalista */}
      <OtaPromoPushPop
        config={cmsData.promoPopup}
        brandName={cmsData.footer?.brandText || "TravelApp Partners"}
        storageKey="afiliados_promo_dismissed_v1"
      />

      {/* Widget Flotante Omnicanal Travis */}
      <TravisOmnichannelWidget
        businessUnit="Experiences"
        whatsappUrl={whatsappBaseUrl}
        messengerUrl={messengerUrl}
        instagramUrl={instagramUrl}
        primaryColor="#0a2a5b"
        brandName="Experience Partners"
      />
    </div>
  );
}
