'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Save, Image, Link as LinkIcon, Shield, Sparkles, 
  Trash2, Plus, ArrowRight, Eye, CheckCircle2, AlertCircle, RefreshCw,
  Upload, X, HelpCircle, Users
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper function to compress images using Canvas to bypass Firestore 1MB limits
const compressImage = (file: File, maxWidth = 800, maxHeight = 600, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Optimized text input component to prevent typing lag by maintaining local state
const CMSInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) => {
  const [localVal, setLocalVal] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(value);
    }
  }, [value, isFocused]);

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>}
      <input
        type={type}
        value={localVal || ''}
        onChange={(e) => setLocalVal(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onChange(localVal);
        }}
        placeholder={placeholder}
        className={className || "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none"}
      />
    </div>
  );
};

// Optimized textarea component to prevent typing lag by maintaining local state
const CMSTextarea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) => {
  const [localVal, setLocalVal] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(value);
    }
  }, [value, isFocused]);

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>}
      <textarea
        rows={rows}
        value={localVal || ''}
        onChange={(e) => setLocalVal(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onChange(localVal);
        }}
        placeholder={placeholder}
        className={className || "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none"}
      />
    </div>
  );
};

const DEFAULT_CMS_DATA = {
  pasajeroHero: {
    badge: "✓ EL ESTÁNDAR MÁS ALTO EN MOVILIDAD URBANA",
    title: "La Ciudad a tu Ritmo",
    subtitle: "Viajes urbanos premium con el soporte local más confiable. Disfruta de seguridad monitoreada 24/7, choferes profesionales certificados y la tarifa más justa del mercado.",
    backgroundImage: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1920&q=80",
    opacity: 55
  },
  conductorHero: {
    badge: "✓ ÚNETE A LA RED DE MOVILIDAD MÁS GRANDE DE TUCUMÁN",
    title: "Conduce y Gana Bajo tus Propios Términos",
    subtitle: "Sé tu propio jefe y maximiza tus ingresos reales con el modelo híbrido único. Retén el 100% de tus viajes con una membresía fija o paga una baja comisión por viaje.",
    backgroundImage: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80",
    ctaText: "Registrarme como Conductor",
    opacity: 55
  },
  servicios: [
    {
      id: "standard",
      name: "TravelCab Standard",
      description: "Sedán moderno, climatizado, ideal para tus traslados diarios de forma rápida.",
      subTag: "Servicio Urbano",
      ctaText: "Cotizar Standard",
      eta: "3 - 5 min",
      imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "premium",
      name: "TravelCab Premium",
      description: "Auto de gama alta, máximo confort, chofer corporativo bilingüe y espacio extra.",
      subTag: "Servicio Corporativo",
      ctaText: "Cotizar Premium",
      eta: "2 - 4 min",
      imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80"
    }
  ],
  tiposTrabajo: {
    title: "Elige tu Esquema de Trabajo",
    subtitle: "Un modelo adaptado a cada ritmo de vida, garantizando transparencia total.",
    comisionTitulo: "Esquema por Comisión",
    comisionTexto: "Paga únicamente un 15% de comisión por viaje realizado. Ideal para conductores eventuales que buscan ingresos complementarios.",
    membresiaTitulo: "Membresía Fija",
    membresiaTexto: "Retén el 100% del valor de tus viajes pagando una suscripción mensual plana. Excelente para choferes de dedicación completa."
  },
  resumenRewards: {
    title: "Tus Viajes Tienen Premio",
    subtitle: "Acumula puntos automáticamente en cada trayecto que realizas. Canjéalos por viajes gratis, prioridades y beneficios en todo el ecosistema de TravelApp.",
    pointsText: "300 pts de Bienvenida",
    badgeText: "PROGRAMA REWARDS",
    imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80"
  },
  redesSociales: {
    facebook: "https://facebook.com/travelcab",
    instagram: "https://instagram.com/travelcab.ar",
    messenger: "https://m.me/travelcab",
    whatsapp: "https://wa.me/5493814188106",
    youtube: "",
    tiktok: ""
  },
  sellosLegales: {
    arcaQr: "",
    baseDatosSello: "",
    arcaQrUrl: "https://www.afip.gob.ar/images/f960/DATAWEB.jpg",
    baseDatosSelloUrl: "https://www.argentina.gob.ar/sites/default/files/aaip-logo-sello.png"
  },
  faq: {
    title: "Preguntas Frecuentes",
    subtitle: "Todo lo que necesitas saber sobre el servicio de movilidad premium",
    items: [
      {
        question: "¿Cómo funciona el Despachador Web Inteligente?",
        answer: "El despachador te permite ingresar origen y destino, calcular una tarifa estimada instantáneamente y elegir tu categoría. Al confirmar, te redirigirá a WhatsApp con un mensaje pre-configurado para que nuestra central asigne el chofer más cercano en segundos."
      },
      {
        question: "¿Qué es el 'Modelo Híbrido' para conductores (Membresía vs. Comisión)?",
        answer: "Es un esquema flexible único. Como conductor, puedes optar por pagar una membresía mensual fija (retienes el 100% del valor de tus viajes) o bien operar bajo el esquema tradicional de comisión baja (15%) por cada traslado realizado."
      },
      {
        question: "¿Qué métodos de pago puedo utilizar?",
        answer: "Ofrecemos flexibilidad total. Puedes abonar en efectivo directo al chofer, realizar transferencias instantáneas mediante Mercado Pago o billeteras virtuales, o registrar de forma segura tarjetas de débito/crédito corporativas."
      },
      {
        question: "¿Cómo se garantiza la seguridad de mi viaje?",
        answer: "Todos nuestros traslados son monitoreados satelitalmente las 24 horas. Además, nuestros choferes pasan por rigurosas pruebas de antecedentes penales, análisis psicofísicos y validación de vehículos de forma presencial."
      },
      {
        question: "¿Qué requisitos debe cumplir un vehículo para ser aceptado?",
        answer: "El vehículo debe ser modelo 2018 o posterior, contar con 4 puertas, aire acondicionado en óptimas condiciones, seguro comercial al día y pasar una revisión técnica e higiénica presencial en nuestras oficinas locales."
      },
      {
        question: "¿Ofrecen soluciones de movilidad corporativa para empresas?",
        answer: "Sí, contamos con un área dedicada para cuentas corporativas. Ofrecemos facturación mensual unificada, paneles de control para administrar traslados del personal y tarifas corporativas especiales."
      },
      {
        question: "¿Cómo funciona el sistema de Puntos Rewards?",
        answer: "Cada kilómetro recorrido en TravelCab acumula puntos automáticamente en tu perfil del ecosistema. Estos puntos pueden ser canjeados por descuentos en tus próximos viajes o beneficios exclusivos con partners."
      },
      {
        question: "¿Qué es el servicio de Auto Rural Compartido (ARC)?",
        answer: "ARC es una alternativa económica diseñada para viajes interurbanos o rurales. Permite a varios pasajeros compartir un mismo trayecto planificado, reduciendo el costo del viaje hasta en un 35% por persona."
      },
      {
        question: "¿Quién es la IA 'Travis' y cómo me ayuda?",
        answer: "Travis es nuestro asistente virtual inteligente disponible las 24 horas en WhatsApp. Está capacitado para cotizar tarifas, responder dudas sobre los servicios y guiar de forma rápida a los conductores en su proceso de registro."
      },
      {
        question: "¿Los conductores reciben capacitación antes de empezar?",
        answer: "Absolutamente. Todos los choferes de la red completan de manera obligatoria una inducción integral en servicio de atención premium al cliente, normas de seguridad vial, conducción defensiva y uso del despachador digital."
      }
    ]
  },
  legales: {
    quienesSomos: "### Quiénes Somos en TravelCab\n\nSomos una empresa de movilidad y transporte premium nacida con la misión de conectar a personas con choferes altamente calificados de forma segura, puntual y transparente.\n\nContamos con un soporte local dedicado las 24 horas y soporte inteligente de IA a través de Travis en WhatsApp. Creemos en esquemas justos para nuestros conductores asociados a través de nuestro modelo híbrido de comisión o membresía fija y en premiar la fidelidad de nuestros usuarios con el sistema Rewards.",
    terminosCondiciones: "### Términos y Condiciones Generales de Uso de TravelCab\n\nBienvenido a TravelCab. Al acceder y utilizar nuestros servicios de transporte y movilidad, usted acepta de manera incondicional estar sujeto a los siguientes términos y condiciones de uso:\n\n1. **Naturaleza del Servicio:** TravelCab es una plataforma de tecnología de movilidad premium que conecta a pasajeros con choferes profesionales locales.\n2. **Uso de la Plataforma:** El usuario se compromete a hacer uso de los traslados y el despachador web únicamente con fines lícitos. Queda terminantemente prohibido cualquier tipo de conducta que atente contra la seguridad del chofer o la flota.\n3. **Tarifas y Estimaciones:** Las tarifas visualizadas en el Despachador Inteligente son estimaciones y pueden ser modificadas por tráfico congestionado, horarios especiales o condiciones climáticas adversas.\n4. **Monitoreo Satelital:** Con fines de seguridad, todos los trayectos son grabados y geolocalizados en tiempo real por nuestra central operativa de seguridad 24/7.",
    politicasPrivacidad: "### Políticas de Privacidad y Protección de Datos Personales\n\nEn TravelCab estamos plenamente comprometidos con el resguardo, confidencialidad y protección de los datos de nuestros pasajeros y conductores. Al registrarse en la plataforma, usted acepta el tratamiento de su información conforme a lo siguiente:\n\n1. **Recolección de Información:** Al registrarse como pasajero o conductor, almacenamos sus datos personales identificativos (Nombre, Apellido, Email, Teléfono, Ubicación y en el caso de conductores, licencias y habilitaciones oficiales).\n2. **Uso del Perfil y Gamificación:** Los datos provistos por los pasajeros se utilizan para habilitar su cuenta y el programa de fidelización Rewards, otorgando el incentivo inicial de 300 puntos más 150 puntos extra al completar su fotografía de perfil.\n3. **Uso de las Imágenes:** La foto de perfil cargada se almacena únicamente con fines de verificación de identidad del pasajero para asegurar traslados tranquilos para toda la flota.\n4. **No divulgación:** TravelCab garantiza que en ningún caso comercializará o transferirá sus datos de carácter personal a terceras empresas sin su expreso consentimiento escrito previo."
  }
};

const DEFAULT_EXPERIENCE_CMS_DATA = {
  header: {
    logo: "/assets/travelapp_logo.svg",
    brand: "TravelApp",
    product: "Experiences",
    announcementText: "🔥 Preventa Temporada 2026: Reservá hoy en cuotas fijas o con Time-to-Pay garantizado",
    announcementUrl: "/marketplace",
    ctaText: "Explorar Catálogo",
    ctaUrl: "/marketplace",
    loginUrl: "/login"
  },
  heroPromoBanner: {
    enabled: true,
    tag: "PROMO EXCLUSIVA",
    text: "🔥 12 Cuotas fijas sin interés en paquetes propios + Time-to-Pay garantizado",
    subtext: "Congelá tu tarifa hoy sin tarjeta de crédito y asegurá tu butaca"
  },
  marketplaceHero: {
    bgType: "image",
    bgSolidColor: "#0f172a",
    bgImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    title: "Marketplace de Viajes, Cruceros & Experiencias",
    titleColor: "#FFFFFF",
    subtitle: "Salidas grupales propias con bus cama, cruceros internacionales y circuitos por el mundo. Reservá online con Time-to-Pay garantizado o consultá con nuestros especialistas.",
    subtitleColor: "#CBD5E1",
    tag: "CATÁLOGO OFICIAL 2026",
    tagColor: "#EF4444",
    tagBgColor: "rgba(239, 68, 68, 0.15)",
    overlayOpacity: 45
  },
  enabledSearchTabs: {
    paquetes: true,
    vuelos: false,
    hoteles: false,
    buses: false,
    civitatis: false,
    travelcab: true
  },
  heroSlides: [
    {
      title: "Viví Argentina y el Mundo con Calidad Premium",
      subtitle: "Salidas Grupales con Bus Propio, Cruceros & Circuitos Internacionales",
      text: "Recorridos acompañados por coordinadores 24/7, hoteles seleccionados y la mejor tarifa garantizada.",
      bgImage: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=80",
      ctaText: "Ver Salidas 2026",
      ctaUrl: "/marketplace"
    },
    {
      title: "Norte Argentino & Paisajes Mágicos",
      subtitle: "Salta, Jujuy, Cafayate & Quebrada de Humahuaca",
      text: "Transporte cama ejecutivo, pensión completa y excursiones exclusivas.",
      bgImage: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1920&q=80",
      ctaText: "Descubrir Itinerario",
      ctaUrl: "/marketplace"
    },
    {
      title: "Cruceros & Travesías Internacionales",
      subtitle: "Brasil, Caribe y Mediterráneo All Inclusive",
      text: "Cabinas con balcón, gastronomía de primer nivel y espectáculos a bordo.",
      bgImage: "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1920&q=80",
      ctaText: "Cotizar Crucero",
      ctaUrl: "/marketplace"
    }
  ],
  metrics: [
    { number: "+15.000", label: "Pasajeros Transportados", icon: "Users" },
    { number: "98.5%", label: "Satisfacción & Reseñas 5★", icon: "Star" },
    { number: "24 / 7", label: "Coordinación & Soporte en Destino", icon: "Shield" },
    { number: "100%", label: "Salidas Garantizadas con Time-to-Pay", icon: "Clock" }
  ],
  testimonials: [
    {
      name: "Marta & Roberto González",
      location: "Córdoba Capital",
      comment: "Viajamos al Norte con TravelApp y la coordinación fue impecable. El micro súper cómodo y los hoteles de primer nivel. ¡Ya señamos para las Cataratas!",
      rating: 5,
      trip: "Norte Argentino Fascinante",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
    },
    {
      name: "Carlos Silveira",
      location: "San Miguel de Tucumán",
      comment: "La reserva con Time-to-Pay me permitió congelar el viaje mientras coordinaba con mi familia. Muy transparente y la App móvil te acompaña todo el recorrido.",
      rating: 5,
      trip: "Mendoza & Ruta del Vino",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
    },
    {
      name: "Valeria Benítez",
      location: "Buenos Aires",
      comment: "El crucero por Brasil superó todas las expectativas. Atención personalizada desde el primer día y nos sumó puntos Club Rewards para usar en TravelCab.",
      rating: 5,
      trip: "Crucero MSC Brasil & Ilhabela",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"
    }
  ],
  carouselOffers: [
    {
      imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80",
      title: "Mendoza Wine Tasting VIP",
      link: "#catalog"
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=600&q=80",
      title: "Aventura en Jujuy 4x4",
      link: "#catalog"
    }
  ],
  servicios: [
    {
      id: "adventure",
      title: "Aventura & Naturaleza",
      summary: "Trekking, senderismo y experiencias en el entorno natural más espectacular de Argentina.",
      imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
      modalDetail: "Detalles del servicio de aventura: Contamos con vehículos 4x4 equipados, guías profesionales de montaña inscritos en Parques Nacionales y seguros completos para cada pasajero."
    },
    {
      id: "food",
      title: "Cultura & Gastronomía",
      summary: "Tours de bodegas, degustaciones exclusivas, y cenas privadas con chefs locales destacados.",
      imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
      modalDetail: "Disfruta de Mendoza y el norte con los mejores maridajes. Ofrecemos reservas directas en restaurantes de bodegas con estrella Michelin y catas dirigidas por sommeliers certificados."
    }
  ],
  rewardsBlock: {
    title: "Viajá con TravelApp Rewards",
    subtitle: "Acumulá puntos en cada viaje de experiencias y canjealos por traslados gratis con TravelCab o descuentos en tus próximos destinos.",
    pointsText: "Obtené tarifas reducidas en todas nuestras experiencias al registrarte.",
    badgeText: "ECOSISTEMA REWARDS",
    imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80"
  },
  redesSociales: {
    facebook: "https://facebook.com/travelapp.ar",
    instagram: "https://instagram.com/travelapp.ar",
    messenger: "https://m.me/travelapp.ar",
    whatsapp: "https://wa.me/5493814188106",
    youtube: "",
    tiktok: ""
  },
  sellosLegales: {
    arcaQr: "",
    baseDatosSello: ""
  },
  footer: {
    brandText: "TravelApp Experiences",
    copyrightText: "© 2026 TravelApp Experiences. Una marca de TravelApp s.a.s."
  }
};

const DEFAULT_ECOSISTEMA_CMS_DATA = {
  hero: {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    overlayOpacity: 72,
    badge: "✦ EL ECOSISTEMA DE VIAJES MÁS COMPLETO DE ARGENTINA",
    title: "Un Ecosistema Diseñado\npara el Viajero Moderno",
    subtitle: "Experiencias auténticas, movilidad segura y recompensas que crecen con cada aventura. Todo en un solo lugar.",
    ctaText: "Descubrí el Ecosistema",
    whatsappUrl: "https://wa.me/5493814188106",
    whatsappText: "Hablá con Nosotros",
    playStoreUrl: "",
    appStoreUrl: "",
  },
  unidades: [
    { id: "experience", nombre: "TravelApp Experience", descripcionBreve: "Descubrí Argentina como nunca la viviste. Excursiones curadas, guías certificados y destinos únicos.", descripcionExtendida: "TravelApp Experience es nuestra unidad de turismo premium. Diseñamos circuitos exclusivos, experiencias gastronómicas, aventura y cultura.", imagenUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80" },
    { id: "rewards", nombre: "TravelApp Rewards", descripcionBreve: "Cada viaje suma puntos. Canjéalos por traslados gratuitos, descuentos en experiencias o beneficios exclusivos.", descripcionExtendida: "TravelApp Rewards es el corazón del ecosistema. Un programa de fidelización cruzado que conecta todas las unidades.", imagenUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80" },
    { id: "travelcab", nombre: "TravelCab", descripcionBreve: "La movilidad urbana reinventada. Choferes certificados, tarifas transparentes y monitoreo satelital.", descripcionExtendida: "TravelCab es nuestra unidad de transporte premium. Flota certificada, choferes verificados y modelo híbrido de comisión o membresía.", imagenUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80" },
  ],
  quienesSomos: { badge: "Nuestra Historia", titulo: "Construyendo el Futuro del Turismo Argentino", mision: "Conectar viajeros con experiencias auténticas, movilidad confiable y recompensas que hacen que cada viaje valga más.", vision: "Ser el ecosistema de viajes de referencia en Argentina.", valores: "Transparencia, excelencia en el servicio, innovación constante e impacto positivo en las comunidades donde operamos.", imagenUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80" },
  stats: [
    { valor: "10.000+", label: "Viajes Realizados", icono: "Car" },
    { valor: "500+", label: "Experiencias Únicas", icono: "Compass" },
    { valor: "25.000+", label: "Miembros Rewards", icono: "Users" },
    { valor: "12", label: "Ciudades Activas", icono: "MapPin" },
  ],
  apps: { playStoreUrl: "", appStoreUrl: "", titulo: "Llevá el Ecosistema en tu Bolsillo", subtitulo: "Descargá la app de TravelApp y gestioná tus viajes, puntos y experiencias desde cualquier lugar." },
  trabajaNosotros: { titulo: "Sumate al Equipo TravelApp", subtitulo: "Buscamos personas apasionadas por los viajes, la tecnología y el servicio de excelencia.", puestos: ["Conductor Socio TravelCab", "Guía de Experiencias", "Atención al Cliente", "Desarrollo de Software", "Marketing Digital", "Operaciones", "Ventas B2B", "Otro"] },
  legales: { razonSocial: "TravelApp s.a.s.", cuit: "30-XXXXXXXX-X", domicilio: "San Miguel de Tucumán, Argentina", terminos: "Al utilizar nuestros servicios, el usuario acepta los términos y condiciones vigentes de TravelApp s.a.s.", privacidad: "TravelApp s.a.s. garantiza la protección de datos personales de conformidad con la Ley 25.326." },
  redesSociales: { facebook: "https://facebook.com/travelapp.ar", instagram: "https://instagram.com/travelapp.ar", whatsapp: "https://wa.me/5493814188106", linkedin: "", youtube: "", tiktok: "" },
  sellosLegales: {
    arcaQr: "",
    baseDatosSello: ""
  },
  showStats: false,
  promoPushPop: {
    enabled: true,
    badge: "🔥 TRAVEL SALE 2026",
    title: "¡Hasta 40% OFF en Experiencias y Puntos Dobles!",
    subtitle: "Aprovechá las mejores escapadas de fin de semana largo y sumá doble puntaje TravelApp Rewards en todas tus reservas.",
    discountCode: "TRAVELSALE",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    ctaText: "Ver Ofertas Especiales",
    ctaUrl: "/landing/experience/marketplace"
  },
};

const DEFAULT_REWARDS_CMS_DATA_FOR_CMS = {
  heroSlides: [
    {
      title: "Tus viajes tienen recompensa",
      subtitle: "Acumulá puntos en cada viaje y canjeálos por beneficios exclusivos en todo el ecosistema TravelApp.",
      text: "Gratis, automático y sin costos ocultos.",
      bgImage: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1920&q=80",
      ctaText: "Ver Catálogo de Canjes",
      ctaUrl: "/canjes",
      overlayOpacity: 65,
    }
  ],
  howItWorks: [
    { step: "01", title: "Viajá o Reservá", description: "Pedí un TravelCab o reservá una experiencia desde tu cuenta." },
    { step: "02", title: "Sumá Puntos", description: "Tus puntos se acreditan automáticamente al finalizar." },
    { step: "03", title: "Canjeá Beneficios", description: "Ingresá al catálogo y elegí tu recompensa favorita." },
  ],
  benefits: [
    { icon: "Plane", title: "Viajes Bonificados", description: "Usá tus puntos para pagar total o parcialmente tus próximos viajes en TravelCab." },
    { icon: "Coffee", title: "Gastronomía", description: "Descuentos en cafeterías y restaurantes adheridos." },
    { icon: "ShoppingBag", title: "Retail & Compras", description: "Vouchers de descuento en marcas exclusivas." },
    { icon: "Star", title: "Status Premium", description: "Subís de categoría con más viajes para obtener mejores beneficios." },
  ],
  ctaBlock: {
    title: "Empezá a sumar hoy mismo",
    subtitle: "Iniciá sesión o registrate gratis para activar tu Travel Wallet.",
    buttonText: "Activar mi Billetera Rewards",
    buttonUrl: "/login",
  },
  businessSection: {
    title: "¿Tenés un negocio?",
    subtitle: "Sumate al ecosistema TravelApp y ofrecé beneficios Rewards a tus clientes.",
    buttonText: "Quiero ser Partner",
    buttonUrl: "mailto:partners@travelapp.ar",
    features: [
      "Visibilidad en el catálogo de canjes",
      "Integración automática de puntos",
      "Panel de control de métricas",
      "Soporte comercial dedicado",
    ],
  },
  redesSociales: { facebook: "", instagram: "", whatsapp: "", youtube: "", tiktok: "" },
  sellosLegales: { arcaQr: "", baseDatosSello: "" },
  footer: { copyrightText: "© 2026 TravelApp Rewards. Una marca de TravelApp s.a.s." },
};

import { OverlappingCardCarousel } from '@/components/ui/OverlappingCardCarousel';

const DEFAULT_APP_INICIO_CMS_DATA = {
  id: "block-1",
  blockTitle: "Novedades del Ecosistema",
  cards: [
    {
      title: "150 Puntos Extra",
      badge: "🎁 REWARDS",
      subtitle: "Completá tu foto de perfil y sumá puntos gratis.",
      description: "Completá tu foto de perfil y ganá 150 puntos extra al instante para tu próximo canje.",
      ctaText: "Sumar Puntos",
      imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/rewards"
    },
    {
      title: "Yungas & Aventura",
      badge: "🌿 EXPERIENCES",
      subtitle: "Paseos de aventura y traslados rurales.",
      description: "Agendá paseos de aventura y traslados rurales en las yungas tucumanas.",
      ctaText: "Explorar",
      imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/experiences"
    },
    {
      title: "Travis Asistente IA",
      badge: "🤖 CHATBOT 24/7",
      subtitle: "Cotizá y programá tus viajes con inteligencia artificial.",
      description: "Hablá con nuestro asistente inteligente de viajes para cotizar al instante.",
      ctaText: "Chatear",
      imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/chatbot"
    },
    {
      title: "Viajá Compartido 40% OFF",
      badge: "👥 AHORRO",
      subtitle: "Compartí tu ruta con otros pasajeros y pagá menos.",
      description: "Viajá con otros pasajeros en la misma dirección y ahorrá hasta un 40%.",
      ctaText: "Aprovechar",
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/share"
    },
    {
      title: "Generá Ingresos con tu Auto",
      badge: "🚗 CONDUCTORES",
      subtitle: "Registrate en TravelCab con soporte local 24hs.",
      description: "Registrá tu auto o taxi y empezá a generar ingresos con soporte local certificado.",
      ctaText: "Sumarme",
      imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/conductor"
    }
  ]
};

const DEFAULT_APP_BENEFICIOS_CMS_DATA = {
  id: "block-2",
  blockTitle: "Beneficios Rewards",
  cards: [
    {
      title: "20% OFF Gastronomía",
      badge: "🍔 BENEFICIO",
      subtitle: "Presentá tu QR en restaurantes adheridos.",
      description: "Obtené un 20% de descuento en restaurantes adheridos presentando tu código QR.",
      ctaText: "Ver Locales",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/rewards/food"
    },
    {
      title: "15% OFF Hotelería",
      badge: "🏨 HOTELES",
      subtitle: "Ahorrá en estadías seleccionadas del Norte.",
      description: "Ahorrá hasta un 15% en estadías seleccionadas de TravelApp Experiences.",
      ctaText: "Reservar",
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/rewards/hotel"
    }
  ]
};

const DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS = {
  header: {
    brand: 'TravelApp',
    product: 'Experience Partners',
    ctaText: 'Ser Embajador',
    loginUrl: '/afiliados/login',
    registerUrl: '/afiliados/register',
  },
  hero: {
    badge: 'PROGRAMA DE AFILIADOS & EMBAJADORES',
    title: 'Monetizá tu audiencia recomendando experiencias inolvidables',
    subtitle: 'Ganá hasta un 10% de comisión por cada reserva, regalá cupones de descuento exclusivos a tus seguidores y cobrá al instante vía Mercado Pago o semanalmente por CBU.',
    primaryCtaText: 'Registrarme Gratis',
    secondaryCtaText: 'Conocer Niveles',
    heroImage: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80',
  },
  payoutMethods: {
    title: 'Cobrá tus comisiones como vos prefieras',
    subtitle: 'Garantizamos transparencia total en cada venta realizada con tu código o enlace de referido.',
    optionMpTitle: 'Split Mercado Pago Instantáneo',
    optionMpDesc: 'Vincularás tu cuenta de Mercado Pago vía OAuth. Cada vez que un cliente reserve una experiencia con tu enlace, tu comisión se acredita en el acto a tu cuenta de Mercado Pago (Split Inverso).',
    optionCbuTitle: 'CBU / CVU Liquidación Semanal',
    optionCbuDesc: 'Si preferís transferencia bancaria tradicional, acumulás todas tus comisiones de la semana y las recibís todos los Lunes directamente en tu cuenta bancaria o billetera virtual.',
  },
  faqs: [
    {
      q: '¿Tiene algún costo unirme al Programa de Embajadores?',
      a: 'No, es 100% gratuito y no requiere inversión inicial. Solo necesitás registrarte para obtener tu enlace y tu código de cupón personal.'
    },
    {
      q: '¿Cómo funcionan los niveles de comisión?',
      a: 'Comenzás en el Nivel 1 (Starter) ganando un 3% de comisión. A medida que concretás reservas pasás a Pro Creator (5%), Master Partner (7%) y VIP Ambassador (10%).'
    },
    {
      q: '¿Cómo reciben el descuento mis seguidores?',
      a: 'Les entregamos un código de cupón personalizado con tu nombre (ej. FLOR10OFF) para que obtengan descuentos exclusivos en todo el catálogo de turismo y experiencias.'
    },
    {
      q: '¿Cuándo y cómo cobro mis comisiones?',
      a: 'Podés elegir cobrar al instante a través de Split Inverso en Mercado Pago o recibir transferencias automáticas por CBU/CVU todos los días Lunes.'
    }
  ],
  footer: {
    brandText: 'TravelApp Experience Partners',
    copyrightText: '© 2026 TravelApp Ecosistema. Todos los derechos reservados.'
  }
};

type ActiveTab = 'hero' | 'servicios' | 'conductores' | 'rewards' | 'faq' | 'legales' | 'slider' | 'ofertas' | 'social' | 'eco_hero' | 'eco_promo' | 'eco_unidades' | 'eco_quienes' | 'eco_stats' | 'eco_apps' | 'eco_trabaja' | 'eco_legales' | 'rew_slider' | 'rew_beneficios' | 'rew_social' | 'rew_negocio' | 'rew_legales' | 'app_cards' | 'app_rewards' | 'afi_hero' | 'afi_cobro' | 'afi_faq' | 'afi_footer' | 'exp_marketplace' | 'exp_buscador' | 'exp_metrics' | 'exp_testimonials';

export default function CMSPage() {
  const [selectedLanding, setSelectedLanding] = useState<'travelcab' | 'experience' | 'ecosistema' | 'rewards' | 'app-inicio' | 'afiliados'>('travelcab');
  const [activeTab, setActiveTab] = useState<ActiveTab>('hero');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cargar datos actuales de Firestore
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (selectedLanding === 'app-inicio') {
          const docRef1 = doc(db, 'cms_blocks', 'block-1');
          const docSnap1 = await getDoc(docRef1);
          
          const docRef2 = doc(db, 'cms_blocks', 'block-2');
          const docSnap2 = await getDoc(docRef2);
          
          const block1Data = docSnap1.exists() ? docSnap1.data() : DEFAULT_APP_INICIO_CMS_DATA;
          const block2Data = docSnap2.exists() ? docSnap2.data() : DEFAULT_APP_BENEFICIOS_CMS_DATA;

          setData({
            block1: {
              ...DEFAULT_APP_INICIO_CMS_DATA,
              ...block1Data
            },
            block2: {
              ...DEFAULT_APP_BENEFICIOS_CMS_DATA,
              ...block2Data
            }
          });
        } else if (selectedLanding === 'afiliados') {
          const docRef = doc(db, 'cms_blocks', 'landing_afiliados');
          const docSnap = await getDoc(docRef);
          setData(docSnap.exists() ? { ...DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS, ...docSnap.data() } : DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS);
        } else {
          const docId = selectedLanding === 'travelcab' ? 'landing_travelcab' : selectedLanding === 'experience' ? 'landing_experience' : selectedLanding === 'rewards' ? 'landing_rewards' : 'landing_ecosistema';
          const docRef = doc(db, 'cms', docId);
          const docSnap = await getDoc(docRef);
          const defaultData = selectedLanding === 'travelcab' ? DEFAULT_CMS_DATA : selectedLanding === 'experience' ? DEFAULT_EXPERIENCE_CMS_DATA : selectedLanding === 'rewards' ? DEFAULT_REWARDS_CMS_DATA_FOR_CMS : DEFAULT_ECOSISTEMA_CMS_DATA;
          if (docSnap.exists()) {
            const loadedData = docSnap.data();
            // Normalizar unidades para asegurar compatibilidad de campos imagenUrl y imageUrl
            if (loadedData.unidades) {
              loadedData.unidades = loadedData.unidades.map((u: any) => ({
                ...u,
                imagenUrl: u.imagenUrl || u.imageUrl,
                imageUrl: u.imageUrl || u.imagenUrl
              }));
            }
            setData({
              ...defaultData,
              ...loadedData
            });
          } else {
            setData(defaultData);
          }
        }
      } catch (err) {
        console.error("Error al leer CMS de Firestore:", err);
        const defaultData = selectedLanding === 'app-inicio' ? { block1: DEFAULT_APP_INICIO_CMS_DATA, block2: DEFAULT_APP_BENEFICIOS_CMS_DATA } : selectedLanding === 'afiliados' ? DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS : selectedLanding === 'travelcab' ? DEFAULT_CMS_DATA : selectedLanding === 'experience' ? DEFAULT_EXPERIENCE_CMS_DATA : selectedLanding === 'rewards' ? DEFAULT_REWARDS_CMS_DATA_FOR_CMS : DEFAULT_ECOSISTEMA_CMS_DATA;
        setData(defaultData);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // Reset active tab depending on the landing to prevent visual inconsistencies
    if (selectedLanding === 'experience') {
      setActiveTab('slider');
    } else if (selectedLanding === 'ecosistema') {
      setActiveTab('eco_hero');
    } else if (selectedLanding === 'rewards') {
      setActiveTab('rew_slider');
    } else if (selectedLanding === 'app-inicio') {
      setActiveTab('app_cards');
    } else if (selectedLanding === 'afiliados') {
      setActiveTab('afi_hero');
    } else {
      setActiveTab('hero');
    }
  }, [selectedLanding]);

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      // Sanitizar el objeto para eliminar cualquier valor undefined, prototipo custom o propiedad no serializable
      const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
      }));
      if (selectedLanding === 'app-inicio') {
        const docRef1 = doc(db, 'cms_blocks', 'block-1');
        await setDoc(docRef1, sanitizedData.block1);
        const docRef2 = doc(db, 'cms_blocks', 'block-2');
        await setDoc(docRef2, sanitizedData.block2);
      } else if (selectedLanding === 'afiliados') {
        const docRef = doc(db, 'cms_blocks', 'landing_afiliados');
        await setDoc(docRef, sanitizedData);
      } else {
        const docId = selectedLanding === 'travelcab' ? 'landing_travelcab' : selectedLanding === 'experience' ? 'landing_experience' : selectedLanding === 'rewards' ? 'landing_rewards' : 'landing_ecosistema';
        const docRef = doc(db, 'cms', docId);
        await setDoc(docRef, sanitizedData);
      }
      setStatusMsg({ type: 'success', text: '¡Cambios guardados e implementados en tiempo real!' });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      console.error("Error al guardar CMS en Firestore:", err);
      setStatusMsg({ type: 'error', text: `Error al guardar: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section: string, field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateService = (idx: number, field: string, value: any) => {
    if (selectedLanding === 'ecosistema') {
      const updated = [...data.unidades];
      if (field === 'imageUrl' || field === 'imagenUrl') {
        updated[idx] = { ...updated[idx], imagenUrl: value, imageUrl: value };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      setData((prev: any) => ({ ...prev, unidades: updated }));
    } else {
      const updated = [...data.servicios];
      updated[idx] = { ...updated[idx], [field]: value };
      setData((prev: any) => ({ ...prev, servicios: updated }));
    }
  };

  const deleteService = (idx: number) => {
    const updated = data.servicios.filter((_: any, i: number) => i !== idx);
    setData((prev: any) => ({ ...prev, servicios: updated }));
  };

  const addService = () => {
    if (selectedLanding === 'travelcab') {
      const newSvc = {
        id: `service_${Date.now()}`,
        name: "Nueva Categoría",
        description: "Descripción de la categoría de transporte y comodidades del sedán.",
        subTag: "Servicio Premium",
        ctaText: "Cotizar Ahora",
        eta: "4 - 7 min",
        imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80"
      };
      setData((prev: any) => ({
        ...prev,
        servicios: [...prev.servicios, newSvc]
      }));
    } else {
      const newSvc = {
        id: `service_${Date.now()}`,
        title: "Nuevo Servicio",
        summary: "Resumen corto del servicio.",
        imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
        modalDetail: "Detalles completos de la experiencia para mostrar en el popup modal."
      };
      setData((prev: any) => ({
        ...prev,
        servicios: [...prev.servicios, newSvc]
      }));
    }
  };

  // Funciones específicas para FAQ
  const updateFaq = (idx: number, field: string, value: any) => {
    const items = [...data.faq.items];
    items[idx] = { ...items[idx], [field]: value };
    setData((prev: any) => ({
      ...prev,
      faq: {
        ...prev.faq,
        items
      }
    }));
  };

  const deleteFaq = (idx: number) => {
    const items = data.faq.items.filter((_: any, i: number) => i !== idx);
    setData((prev: any) => ({
      ...prev,
      faq: {
        ...prev.faq,
        items
      }
    }));
  };

  const addFaq = () => {
    const newFaq = {
      question: "¿Nueva Pregunta Frecuente?",
      answer: "Detalle o respuesta de la pregunta frecuente editable."
    };
    setData((prev: any) => ({
      ...prev,
      faq: {
        ...prev.faq,
        items: [...prev.faq.items, newFaq]
      }
    }));
  };

  // Helper functions for Experience heroSlides
  const updateHeroSlide = (idx: number, field: string, value: any) => {
    const updated = [...data.heroSlides];
    updated[idx] = { ...updated[idx], [field]: value };
    setData((prev: any) => ({ ...prev, heroSlides: updated }));
  };

  const deleteHeroSlide = (idx: number) => {
    const updated = data.heroSlides.filter((_: any, i: number) => i !== idx);
    setData((prev: any) => ({ ...prev, heroSlides: updated }));
  };

  const addHeroSlide = () => {
    if ((data.heroSlides || []).length >= 10) {
      alert('Límite de 10 diapositivas alcanzado');
      return;
    }
    const newSlide = {
      title: "Nueva Diapositiva",
      subtitle: "Subtítulo de la diapositiva",
      text: "Texto descriptivo de prueba.",
      bgImage: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=80",
      ctaText: "Ver Más",
      ctaUrl: "#catalog"
    };
    setData((prev: any) => ({
      ...prev,
      heroSlides: [...(prev.heroSlides || []), newSlide]
    }));
  };

  // Helper functions for Experience carouselOffers
  const updateCarouselOffer = (idx: number, field: string, value: any) => {
    const updated = [...data.carouselOffers];
    updated[idx] = { ...updated[idx], [field]: value };
    setData((prev: any) => ({ ...prev, carouselOffers: updated }));
  };

  const deleteCarouselOffer = (idx: number) => {
    const updated = data.carouselOffers.filter((_: any, i: number) => i !== idx);
    setData((prev: any) => ({ ...prev, carouselOffers: updated }));
  };

  const addCarouselOffer = () => {
    if ((data.carouselOffers || []).length >= 6) {
      alert('Límite de 6 ofertas alcanzado');
      return;
    }
    const newOffer = {
      imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80",
      title: "Nueva Oferta de Viaje",
      link: "#catalog"
    };
    setData((prev: any) => ({
      ...prev,
      carouselOffers: [...(prev.carouselOffers || []), newOffer]
    }));
  };

  const SlideImageUploader = ({ idx, value }: { idx: number; value: string }) => {
    const [localVal, setLocalVal] = useState(value);
    useEffect(() => {
      setLocalVal(value);
    }, [value]);

    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={localVal || ''}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => updateHeroSlide(idx, 'bgImage', localVal)}
          placeholder="Ingresa la URL de la foto..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
        />
        <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-tech-blue border border-tech-blue bg-white hover:bg-tech-blue/5 px-3 py-1 rounded-lg transition-all shadow-sm">
          <Upload className="h-3.5 w-3.5" />
          Subir
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const compressed = await compressImage(file);
                  updateHeroSlide(idx, 'bgImage', compressed);
                  setLocalVal(compressed);
                } catch (err) {
                  console.error(err);
                }
              }
            }}
          />
        </label>
      </div>
    );
  };

  const OfferImageUploader = ({ idx, value }: { idx: number; value: string }) => {
    const [localVal, setLocalVal] = useState(value);
    useEffect(() => {
      setLocalVal(value);
    }, [value]);

    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={localVal || ''}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => updateCarouselOffer(idx, 'imageUrl', localVal)}
          placeholder="Ingresa la URL de la foto..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
        />
        <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-tech-blue border border-tech-blue bg-white hover:bg-tech-blue/5 px-3 py-1 rounded-lg transition-all shadow-sm">
          <Upload className="h-3.5 w-3.5" />
          Subir
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const compressed = await compressImage(file);
                  updateCarouselOffer(idx, 'imageUrl', compressed);
                  setLocalVal(compressed);
                } catch (err) {
                  console.error(err);
                }
              }
            }}
          />
        </label>
      </div>
    );
  };

  // Helper functions for App Inicio cards
  const updateAppCard = (blockKey: 'block1' | 'block2', idx: number, field: string, value: any) => {
    const updated = [...(data[blockKey]?.cards || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setData((prev: any) => ({
      ...prev,
      [blockKey]: {
        ...prev[blockKey],
        cards: updated
      }
    }));
  };

  const deleteAppCard = (blockKey: 'block1' | 'block2', idx: number) => {
    const updated = (data[blockKey]?.cards || []).filter((_: any, i: number) => i !== idx);
    setData((prev: any) => ({
      ...prev,
      [blockKey]: {
        ...prev[blockKey],
        cards: updated
      }
    }));
  };

  const addAppCard = (blockKey: 'block1' | 'block2') => {
    const newCard = {
      title: blockKey === 'block1' ? "Nueva Promoción/Socio" : "Nuevo Beneficio/Canje",
      description: "Descripción detallada.",
      imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/rewards"
    };
    setData((prev: any) => ({
      ...prev,
      [blockKey]: {
        ...prev[blockKey],
        cards: [...(prev[blockKey]?.cards || []), newCard]
      }
    }));
  };

  const updateBlockTitle = (blockKey: 'block1' | 'block2', title: string) => {
    setData((prev: any) => ({
      ...prev,
      [blockKey]: {
        ...prev[blockKey],
        blockTitle: title
      }
    }));
  };

  const AppCardImageUploader = ({ blockKey, idx, value }: { blockKey: 'block1' | 'block2'; idx: number; value: string }) => {
    const [localVal, setLocalVal] = useState(value);
    useEffect(() => {
      setLocalVal(value);
    }, [value]);

    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={localVal || ''}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => updateAppCard(blockKey, idx, 'imageUrl', localVal)}
          placeholder="Ingresa la URL de la foto..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
        />
        <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-tech-blue border border-tech-blue bg-white hover:bg-tech-blue/5 px-3 py-1 rounded-lg transition-all shadow-sm">
          <Upload className="h-3.5 w-3.5" />
          Subir
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const compressed = await compressImage(file);
                  updateAppCard(blockKey, idx, 'imageUrl', compressed);
                  setLocalVal(compressed);
                } catch (err) {
                  console.error(err);
                }
              }
            }}
          />
        </label>
      </div>
    );
  };

  // Componente de entrada reutilizable con opción de URL o Subida local (Base64)
  const ImageUploaderInput = ({ label, section, field, value }: { label: string; section: string; field: string; value: string }) => {
    const [localVal, setLocalVal] = useState(value);
    useEffect(() => {
      setLocalVal(value);
    }, [value]);

    return (
      <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-200/50">
        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">{label}</label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={localVal || ''}
              onChange={(e) => setLocalVal(e.target.value)}
              onBlur={() => updateField(section, field, localVal)}
              placeholder="Ingresa la URL de la foto..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none"
            />
            <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-tech-blue border border-tech-blue bg-white hover:bg-tech-blue/5 px-3 py-2 rounded-lg transition-all shadow-sm">
              <Upload className="h-3.5 w-3.5" />
              Subir Archivo
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const compressed = await compressImage(file);
                      updateField(section, field, compressed);
                      setLocalVal(compressed);
                    } catch (err) {
                      console.error("Error compressing image, falling back to original:", err);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateField(section, field, reader.result as string);
                        setLocalVal(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }}
              />
            </label>
          </div>
          {value && (
            <div className="relative w-24 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 group">
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => updateField(section, field, '')}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ServiceImageUploader = ({ idx, value }: { idx: number; value: string }) => {
    const [localVal, setLocalVal] = useState(value);
    useEffect(() => {
      setLocalVal(value);
    }, [value]);

    return (
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500">Imagen de la Categoría</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={localVal || ''}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={() => updateService(idx, 'imageUrl', localVal)}
            placeholder="Pegar URL de la imagen..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] bg-white focus:outline-none"
          />
          <label className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
            <Upload className="h-3 w-3" />
            Subir
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const compressed = await compressImage(file);
                    updateService(idx, 'imageUrl', compressed);
                    setLocalVal(compressed);
                  } catch (err) {
                    console.error("Error compressing service image, falling back to original:", err);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      updateService(idx, 'imageUrl', reader.result as string);
                      setLocalVal(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }
              }}
            />
          </label>
        </div>
      </div>
    );
  };

  const ServiceInput = ({ label, value, idx, field, placeholder, className }: { label: string; value: string; idx: number; field: string; placeholder?: string; className?: string }) => {
    const [localVal, setLocalVal] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) {
        setLocalVal(value);
      }
    }, [value, isFocused]);

    return (
      <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label>
        <input
          type="text"
          value={localVal || ''}
          placeholder={placeholder}
          onChange={(e) => setLocalVal(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            updateService(idx, field, localVal);
          }}
          className={className || "w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"}
        />
      </div>
    );
  };

  const FaqInput = ({ label, value, idx, field }: { label: string; value: string; idx: number; field: string }) => {
    const [localVal, setLocalVal] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) {
        setLocalVal(value);
      }
    }, [value, isFocused]);

    return (
      <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label>
        <input
          type="text"
          value={localVal || ''}
          onChange={(e) => setLocalVal(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            updateFaq(idx, field, localVal);
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
        />
      </div>
    );
  };

  const FaqTextarea = ({ label, value, idx, field }: { label: string; value: string; idx: number; field: string }) => {
    const [localVal, setLocalVal] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) {
        setLocalVal(value);
      }
    }, [value, isFocused]);

    return (
      <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label>
        <textarea
          rows={3}
          value={localVal || ''}
          onChange={(e) => setLocalVal(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            updateFaq(idx, field, localVal);
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-12 text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin text-tech-blue mb-3" />
        <p className="text-sm font-semibold tracking-wide">Cargando base de datos del CMS...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 overflow-y-auto">
      
      {/* HEADER DEL CMS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-tech-blue flex items-center gap-2">
                      <FileText className="h-7 w-7 text-tech-blue" />
            Editor CMS — {selectedLanding === 'travelcab' ? 'TravelCab Landing' : selectedLanding === 'experience' ? 'TravelApp Experience' : selectedLanding === 'rewards' ? '🎁 TravelApp Rewards' : selectedLanding === 'app-inicio' ? '📱 App Cliente (Tarjetas)' : '🌐 Ecosistema TravelApp'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra visualmente y en tiempo real el contenido de tu Ecosistema sin modificar código.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedLanding !== 'app-inicio' && (
            <a
              href={selectedLanding === 'travelcab' ? "/landing/travelcab" : selectedLanding === 'experience' ? "/landing/experience" : "/landing/ecosistema"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
            >
              <Eye className="h-4 w-4" />
              Previsualizar Landing
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-tech-blue px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: '#ff6b00' }}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* SELECTOR DE LANDING */}
      <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Seleccionar Landing a Editar</span>
          <span className="text-sm font-bold text-slate-700">Elige cuál de las landing pages del ecosistema deseas modificar</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedLanding('travelcab')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
              selectedLanding === 'travelcab' 
                ? 'bg-tech-blue border-tech-blue text-white shadow-sm' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🚗 TravelCab
          </button>
          <button
            onClick={() => setSelectedLanding('experience')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
              selectedLanding === 'experience' 
                ? 'bg-tech-blue border-tech-blue text-white shadow-sm' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🌴 TravelApp Experience
          </button>
          <button
            onClick={() => setSelectedLanding('rewards')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
              selectedLanding === 'rewards' 
                ? 'bg-violet-600 border-violet-600 text-white shadow-sm' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎁 TravelApp Rewards
          </button>
          <button
            onClick={() => setSelectedLanding('ecosistema')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
              selectedLanding === 'ecosistema' 
                ? 'bg-tech-blue border-tech-blue text-white shadow-sm' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🌐 Ecosistema TravelApp
          </button>
          <button
            onClick={() => setSelectedLanding('afiliados')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
              selectedLanding === 'afiliados' 
                ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⭐ Embajadores & Afiliados
          </button>
          <button
            onClick={() => setSelectedLanding('app-inicio')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
              selectedLanding === 'app-inicio' 
                ? 'bg-amber-600 border-amber-600 text-white shadow-sm' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            📱 App Tarjetas
          </button>
        </div>
      </div>

      {/* MENSAJES DE ESTADO */}
      {statusMsg && (
        <div className={`mb-6 rounded-xl border p-4 flex items-start gap-3 shadow-sm animate-fadeIn ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="font-bold text-sm">{statusMsg.type === 'success' ? 'Éxito' : 'Error'}</p>
            <p className="text-xs mt-0.5">{statusMsg.text}</p>
          </div>
        </div>
      )}

      {/* PESTAÑAS DE EDICIÓN */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 bg-white px-4 pt-3 rounded-t-xl">
        {(selectedLanding === 'travelcab' 
          ? ['hero', 'servicios', 'conductores', 'rewards', 'faq', 'legales'] 
          : selectedLanding === 'experience'
          ? ['slider', 'exp_marketplace', 'exp_buscador', 'exp_metrics', 'exp_testimonials', 'rewards', 'social']
          : selectedLanding === 'rewards'
          ? ['rew_slider', 'rew_beneficios', 'rew_social', 'rew_negocio', 'rew_legales']
          : selectedLanding === 'app-inicio'
          ? ['app_cards', 'app_rewards']
          : selectedLanding === 'afiliados'
          ? ['afi_hero', 'afi_cobro', 'afi_faq', 'afi_footer']
          : ['eco_hero', 'eco_promo', 'eco_unidades', 'eco_quienes', 'eco_stats', 'eco_apps', 'eco_trabaja', 'eco_legales']
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as ActiveTab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'border-tech-blue text-tech-blue bg-slate-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
            }`}
          >
            {tab === 'hero' && '1. Heros y Portada'}
            {tab === 'slider' && '1. Hero Slider & Promo Banner'}
            {tab === 'exp_marketplace' && '2. Cabecera Marketplace'}
            {tab === 'exp_buscador' && '3. Buscador Multiproducto (APIs)'}
            {tab === 'exp_metrics' && '4. Métricas Institucionales'}
            {tab === 'exp_testimonials' && '5. Testimonios de Pasajeros'}
            {tab === 'ofertas' && '2. Ofertas Carrusel (Max 6)'}
            {tab === 'servicios' && (selectedLanding === 'travelcab' ? '2. Servicios & Categorías' : '3. Tarjetas Servicios')}
            {tab === 'conductores' && '3. Híbrido Conductor'}
            {tab === 'rewards' && (selectedLanding === 'travelcab' ? '4. Resumen Rewards' : '6. Bloque Rewards')}
            {tab === 'faq' && '5. FAQ (Preguntas Frecuentes)'}
            {tab === 'legales' && '6. Legales & Redes'}
            {tab === 'social' && (selectedLanding === 'experience' ? '7. Redes, Contacto & ARCA QR' : '5. Redes & Footer')}
            {tab === 'eco_hero' && '1. Hero (Imagen/Video)'}
            {tab === 'eco_promo' && '🔔 Push Pop Promocional (TravelSale / Puntos)'}
            {tab === 'eco_unidades' && '2. Unidades de Negocio'}
            {tab === 'eco_quienes' && '3. Quiénes Somos'}
            {tab === 'eco_stats' && '4. Métricas'}
            {tab === 'eco_apps' && '5. App Stores'}
            {tab === 'eco_trabaja' && '6. Trabaja con Nosotros'}
            {tab === 'eco_legales' && '7. Legal & Redes'}
            {tab === 'app_cards' && '📱 Tarjetas Novedades App'}
            {tab === 'app_rewards' && '🎁 Beneficios Rewards App'}
            {tab === 'afi_hero' && '⭐ 1. Hero & Propuesta de Valor'}
            {tab === 'afi_cobro' && '⚡ 2. Métodos de Cobro (MP / CBU)'}
            {tab === 'afi_faq' && '❓ 3. Preguntas Frecuentes (FAQ)'}
            {tab === 'afi_footer' && '🏷️ 4. Marcas & Footer'}
          </button>
        ))}
      </div>

      {/* CUERPO DEL EDITOR */}
      <div className="bg-white border border-slate-200 border-t-0 p-6 rounded-b-xl shadow-sm space-y-6">
        
        {/* ======================================================== */}
        {/* EDITORES TRAVELCAB */}
        {/* ======================================================== */}
        
        {selectedLanding === 'travelcab' && activeTab === 'hero' && (
          <div className="space-y-8">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-vial-orange" />
                Hero de Portada: Vista Pasajeros (Usuarios)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Este bloque se muestra al cargar la landing con el enfoque en usuarios de pasajeros.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Badge Superior"
                  value={data.pasajeroHero?.badge || ''}
                  onChange={(val) => updateField('pasajeroHero', 'badge', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Título Principal"
                  value={data.pasajeroHero?.title || ''}
                  onChange={(val) => updateField('pasajeroHero', 'title', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Subtítulo / Bajada descriptiva"
                  rows={2}
                  value={data.pasajeroHero?.subtitle || ''}
                  onChange={(val) => updateField('pasajeroHero', 'subtitle', val)}
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploaderInput 
                  label="Fondo de Imagen Principal" 
                  section="pasajeroHero" 
                  field="backgroundImage" 
                  value={data.pasajeroHero?.backgroundImage || ''} 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex justify-between">
                  <span>Opacidad de la Capa Oscura (Transparencia)</span>
                  <span className="text-tech-blue font-black">{data.pasajeroHero?.opacity !== undefined ? data.pasajeroHero.opacity : 55}%</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={data.pasajeroHero?.opacity !== undefined ? data.pasajeroHero.opacity : 55}
                    onChange={(e) => updateField('pasajeroHero', 'opacity', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-tech-blue"
                  />
                  <span className="text-xs text-slate-400 font-bold min-w-[70px]">
                    {Number(data.pasajeroHero?.opacity || 55) <= 35 ? 'Muy Claro' : Number(data.pasajeroHero?.opacity || 55) >= 70 ? 'Muy Oscuro' : 'Equilibrado'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Un porcentaje menor hace que la imagen de fondo sea más visible, pero ten cuidado de que los textos en blanco sigan siendo legibles.</p>
              </div>
            </div>

            <div className="border-b border-slate-100 pb-4 pt-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                <Users className="h-5 w-5 text-tech-blue" />
                Hero de Portada: Vista Conductores (Socios)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Bloque que aparece cuando el usuario cambia a modo "Quiero Conducir".</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Badge Superior Conductor"
                  value={data.conductorHero?.badge || ''}
                  onChange={(val) => updateField('conductorHero', 'badge', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Título Conductor"
                  value={data.conductorHero?.title || ''}
                  onChange={(val) => updateField('conductorHero', 'title', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Subtítulo Conductor"
                  rows={2}
                  value={data.conductorHero?.subtitle || ''}
                  onChange={(val) => updateField('conductorHero', 'subtitle', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Texto del Botón de Registro"
                  value={data.conductorHero?.ctaText || ''}
                  onChange={(val) => updateField('conductorHero', 'ctaText', val)}
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploaderInput 
                  label="Fondo de Imagen Conductor" 
                  section="conductorHero" 
                  field="backgroundImage" 
                  value={data.conductorHero?.backgroundImage || ''} 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex justify-between">
                  <span>Opacidad de la Capa Oscura (Transparencia)</span>
                  <span className="text-tech-blue font-black">{data.conductorHero?.opacity !== undefined ? data.conductorHero.opacity : 55}%</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={data.conductorHero?.opacity !== undefined ? data.conductorHero.opacity : 55}
                    onChange={(e) => updateField('conductorHero', 'opacity', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-tech-blue"
                  />
                  <span className="text-xs text-slate-400 font-bold min-w-[70px]">
                    {Number(data.conductorHero?.opacity || 55) <= 35 ? 'Muy Claro' : Number(data.conductorHero?.opacity || 55) >= 70 ? 'Muy Oscuro' : 'Equilibrado'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Un porcentaje menor hace que la imagen de fondo sea más visible, pero ten cuidado de que los textos en blanco sigan siendo legibles.</p>
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'servicios' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Categorías de Transporte (Servicios)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las categorías de vehículos, descripciones y ETAs de viaje.</p>
              </div>
              <button
                onClick={addService}
                className="inline-flex items-center gap-1.5 rounded-lg border border-tech-blue bg-tech-blue/5 px-3.5 py-2 text-xs font-bold text-tech-blue hover:bg-tech-blue hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Categoría
              </button>
            </div>

            <div className="space-y-4">
              {data.servicios?.map((item: any, idx: number) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteService(idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Categoría"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ServiceInput
                      label="Nombre Categoría"
                      value={item.name}
                      idx={idx}
                      field="name"
                    />
                    <ServiceInput
                      label="Subtítulo / Tag"
                      value={item.subTag}
                      idx={idx}
                      field="subTag"
                    />
                    <ServiceInput
                      label="ETA Estimado"
                      value={item.eta}
                      idx={idx}
                      field="eta"
                    />
                    <div className="md:col-span-2">
                      <ServiceInput
                        label="Descripción Corta"
                        value={item.description}
                        idx={idx}
                        field="description"
                      />
                    </div>
                    <ServiceInput
                      label="Texto Botón Llamado Acción"
                      value={item.ctaText}
                      idx={idx}
                      field="ctaText"
                    />
                    <div className="md:col-span-3">
                      <ServiceImageUploader
                        idx={idx}
                        value={item.imageUrl}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'conductores' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Sección Esquemas de Trabajo de Socios</h3>
              <p className="text-xs text-slate-400 mt-1">Configura los detalles sobre Comisión y Membresía del portal de conductores.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Título Sección"
                  value={data.tiposTrabajo?.title || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'title', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Subtítulo Sección"
                  value={data.tiposTrabajo?.subtitle || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'subtitle', val)}
                />
              </div>
              <div className="border-t border-slate-100 pt-4 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Esquema Comisión</h4>
              </div>
              <div>
                <CMSInput
                  label="Título Comisión"
                  value={data.tiposTrabajo?.comisionTitulo || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'comisionTitulo', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Detalles de Comisión"
                  value={data.tiposTrabajo?.comisionTexto || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'comisionTexto', val)}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Esquema Membresía Fija</h4>
              </div>
              <div>
                <CMSInput
                  label="Título Membresía"
                  value={data.tiposTrabajo?.membresiaTitulo || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'membresiaTitulo', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Detalles de Membresía"
                  value={data.tiposTrabajo?.membresiaTexto || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'membresiaTexto', val)}
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'rewards' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Bloque Informativo Rewards</h3>
              <p className="text-xs text-slate-400 mt-1">Configura la sección que promociona el sistema de acumulación de puntos de fidelidad.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Título Informativo"
                  value={data.resumenRewards?.title || ''}
                  onChange={(val) => updateField('resumenRewards', 'title', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Badge del Programa"
                  value={data.resumenRewards?.badgeText || ''}
                  onChange={(val) => updateField('resumenRewards', 'badgeText', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Texto Regalo / Puntos Bienvenida"
                  value={data.resumenRewards?.pointsText || ''}
                  onChange={(val) => updateField('resumenRewards', 'pointsText', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Subtítulo Explicativo"
                  value={data.resumenRewards?.subtitle || ''}
                  onChange={(val) => updateField('resumenRewards', 'subtitle', val)}
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploaderInput 
                  label="Imagen Ilustrativa Rewards" 
                  section="resumenRewards" 
                  field="imageUrl" 
                  value={data.resumenRewards?.imageUrl || ''} 
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Preguntas Frecuentes (FAQ)</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <HelpCircle className="h-4 w-4 text-tech-blue" />
                  Administra las preguntas que se mostrarán en la sección de FAQ de la Landing Page.
                </p>
              </div>
              <button
                onClick={addFaq}
                className="inline-flex items-center gap-1.5 rounded-lg border border-tech-blue bg-tech-blue/5 px-3.5 py-2 text-xs font-bold text-tech-blue hover:bg-tech-blue hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Pregunta
              </button>
            </div>

            <div className="space-y-4">
              {data.faq?.items?.map((item: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteFaq(idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Pregunta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  <div className="grid grid-cols-1 gap-3 max-w-[90%]">
                    <FaqInput
                      label={`Pregunta Frecuente N° ${idx + 1}`}
                      value={item.question}
                      idx={idx}
                      field="question"
                    />
                    <FaqTextarea
                      label="Respuesta / Explicación"
                      value={item.answer}
                      idx={idx}
                      field="answer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'legales' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Enlaces de Redes Sociales</h3>
              <p className="text-xs text-slate-400 mt-1">Modifica los perfiles oficiales y el número de la flota de WhatsApp.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Página de Facebook"
                  value={data.redesSociales?.facebook || ''}
                  onChange={(val) => updateField('redesSociales', 'facebook', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Página de Instagram"
                  value={data.redesSociales?.instagram || ''}
                  onChange={(val) => updateField('redesSociales', 'instagram', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Canal de Facebook Messenger"
                  value={data.redesSociales?.messenger || ''}
                  onChange={(val) => updateField('redesSociales', 'messenger', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Enlace / API WhatsApp (Mensaje por defecto)"
                  value={data.redesSociales?.whatsapp || ''}
                  onChange={(val) => updateField('redesSociales', 'whatsapp', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Canal de YouTube"
                  value={data.redesSociales?.youtube || ''}
                  onChange={(val) => updateField('redesSociales', 'youtube', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Perfil de TikTok"
                  value={data.redesSociales?.tiktok || ''}
                  onChange={(val) => updateField('redesSociales', 'tiktok', val)}
                />
              </div>
            </div>

            <div className="border-b border-slate-100 pb-4 pt-4">
              <h3 className="text-base font-extrabold text-slate-800">Sellos Gubernamentales y de Registro</h3>
              <p className="text-xs text-slate-400 mt-1">Configura el código QR de ARCA y el sello de Registro Nacional de Base de Datos (soporta código HTML/script o URL de imagen).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSTextarea
                label="Código o URL del Sello QR ARCA"
                value={data.sellosLegales?.arcaQr || ''}
                onChange={(val) => updateField('sellosLegales', 'arcaQr', val)}
                rows={3}
              />
              <CMSTextarea
                label="Código o URL del Sello Registro Nacional de Base de Datos"
                value={data.sellosLegales?.baseDatosSello || ''}
                onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)}
                rows={3}
              />
            </div>

            <div className="border-b border-slate-100 pb-4 pt-4">
              <h3 className="text-base font-extrabold text-slate-800">Contenido Legal Integrado (Popups / Modales)</h3>
              <p className="text-xs text-slate-400 mt-1">Escribe las bases legales y Quiénes Somos.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <CMSTextarea
                  label="Quiénes Somos (Presentación de la Empresa)"
                  rows={4}
                  value={data.legales?.quienesSomos || ''}
                  onChange={(val) => updateField('legales', 'quienesSomos', val)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <CMSTextarea
                  label="Términos y Condiciones Generales"
                  rows={5}
                  value={data.legales?.terminosCondiciones || ''}
                  onChange={(val) => updateField('legales', 'terminosCondiciones', val)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <CMSTextarea
                  label="Políticas de Privacidad"
                  rows={5}
                  value={data.legales?.politicasPrivacidad || ''}
                  onChange={(val) => updateField('legales', 'politicasPrivacidad', val)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* EDITORES TRAVELAPP EXPERIENCE */}
        {/* ======================================================== */}

        {selectedLanding === 'experience' && activeTab === 'slider' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Slider Principal (Hasta 10 Diapositivas)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las fotos de fondo, textos y botones del carrusel superior.</p>
              </div>
              <button
                onClick={addHeroSlide}
                className="inline-flex items-center gap-1.5 rounded-lg border border-tech-blue bg-tech-blue/5 px-3.5 py-2 text-xs font-bold text-tech-blue hover:bg-tech-blue hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Diapositiva
              </button>
            </div>

            <div className="space-y-4">
              {(data.heroSlides || []).map((slide: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteHeroSlide(idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Diapositiva"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="text-xs font-black text-slate-400 uppercase">Diapositiva N° {idx + 1}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Título de la diapositiva</label>
                      <input
                        type="text"
                        value={slide.title || ''}
                        onChange={(e) => updateHeroSlide(idx, 'title', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Subtítulo</label>
                      <input
                        type="text"
                        value={slide.subtitle || ''}
                        onChange={(e) => updateHeroSlide(idx, 'subtitle', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Texto descriptivo</label>
                      <textarea
                        rows={2}
                        value={slide.text || ''}
                        onChange={(e) => updateHeroSlide(idx, 'text', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Texto del Botón CTA</label>
                      <input
                        type="text"
                        value={slide.ctaText || ''}
                        onChange={(e) => updateHeroSlide(idx, 'ctaText', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Enlace del Botón CTA</label>
                      <input
                        type="text"
                        value={slide.ctaUrl || ''}
                        onChange={(e) => updateHeroSlide(idx, 'ctaUrl', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Imagen de fondo</label>
                      <SlideImageUploader idx={idx} value={slide.bgImage} />
                    </div>
                    {slide.bgImage && (
                      <div className="w-32 h-20 border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
                        <img src={slide.bgImage} alt="slide preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Opacidad de la capa oscura del Hero: <strong>{slide.overlayOpacity ?? 65}%</strong>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={slide.overlayOpacity ?? 65}
                        onChange={(e) => updateHeroSlide(idx, 'overlayOpacity', Number(e.target.value))}
                        className="w-full accent-tech-blue"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                        <span>0% (sin capa)</span>
                        <span>50% (medio)</span>
                        <span>100% (negro)</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(data.heroSlides || []).length === 0 && (
                <p className="text-slate-400 text-center py-8 text-sm">No hay diapositivas cargadas en el slider. Agrega una arriba.</p>
              )}
            </div>

            {/* BANNER PROMO EDITABLE EN EL HERO */}
            <div className="mt-8 bg-red-50/60 p-6 rounded-2xl border border-red-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-red-900">🔥 Banner Promocional Flotante en el Hero</h4>
                  <p className="text-xs text-red-700">Muestra un aviso destacado de alto impacto (ej: 12 Cuotas fijas sin interés en paquetes propios).</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = data.heroPromoBanner?.enabled !== false;
                    setData((prev: any) => ({
                      ...prev,
                      heroPromoBanner: {
                        ...(prev.heroPromoBanner || {}),
                        enabled: !current
                      }
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    data.heroPromoBanner?.enabled !== false
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {data.heroPromoBanner?.enabled !== false ? 'Activo' : 'Desactivado'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Texto Principal del Banner</label>
                  <input
                    type="text"
                    value={data.heroPromoBanner?.text || ''}
                    onChange={(e) => setData((prev: any) => ({
                      ...prev,
                      heroPromoBanner: { ...(prev.heroPromoBanner || {}), text: e.target.value }
                    }))}
                    placeholder="Ej: 🔥 12 Cuotas fijas sin interés en paquetes propios reservando hoy"
                    className="w-full rounded-xl border border-slate-200 p-2 bg-white font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Etiqueta / Badge</label>
                  <input
                    type="text"
                    value={data.heroPromoBanner?.tag || ''}
                    onChange={(e) => setData((prev: any) => ({
                      ...prev,
                      heroPromoBanner: { ...(prev.heroPromoBanner || {}), tag: e.target.value }
                    }))}
                    placeholder="Ej: PROMO EXCLUSIVA"
                    className="w-full rounded-xl border border-slate-200 p-2 bg-white font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXPERIENCE: CABECERA DEL MARKETPLACE */}
        {selectedLanding === 'experience' && activeTab === 'exp_marketplace' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">🛍️ Cabecera &amp; Portada del Marketplace</h3>
              <p className="text-xs text-slate-400 mt-1">
                Personaliza la cabecera superior del Marketplace oficial de viajes, su fondo (imagen o color sólido) y los colores tipográficos.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
              
              {/* 1. Tipo de Fondo */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Tipo de Fondo de la Cabecera
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setData((prev: any) => ({
                      ...prev,
                      marketplaceHero: { ...(prev.marketplaceHero || {}), bgType: 'image' }
                    }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      data.marketplaceHero?.bgType !== 'solid'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    🖼️ Imagen de Fondo HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setData((prev: any) => ({
                      ...prev,
                      marketplaceHero: { ...(prev.marketplaceHero || {}), bgType: 'solid' }
                    }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      data.marketplaceHero?.bgType === 'solid'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    🎨 Color Sólido
                  </button>
                </div>
              </div>

              {/* Si es Imagen de Fondo */}
              {data.marketplaceHero?.bgType !== 'solid' ? (
                <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">URL Imagen de Fondo</label>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-200">
                      📐 Medida recomendada: 1920 x 600 px (JPG o WebP)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={data.marketplaceHero?.bgImageUrl || ''}
                    onChange={(e) => setData((prev: any) => ({
                      ...prev,
                      marketplaceHero: { ...(prev.marketplaceHero || {}), bgImageUrl: e.target.value }
                    }))}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono bg-slate-50"
                  />

                  {/* Vista previa de imagen */}
                  {data.marketplaceHero?.bgImageUrl && (
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-200 relative">
                      <img
                        src={data.marketplaceHero.bgImageUrl}
                        alt="Marketplace Hero Preview"
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0 bg-slate-950 flex items-center justify-center text-white text-xs font-black"
                        style={{ opacity: (data.marketplaceHero?.overlayOpacity ?? 45) / 100 }}
                      >
                        Capa de Oscurecimiento: {data.marketplaceHero?.overlayOpacity ?? 45}%
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Opacidad de la capa protectora del texto: <strong>{data.marketplaceHero?.overlayOpacity ?? 45}%</strong>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={data.marketplaceHero?.overlayOpacity ?? 45}
                      onChange={(e) => setData((prev: any) => ({
                        ...prev,
                        marketplaceHero: { ...(prev.marketplaceHero || {}), overlayOpacity: Number(e.target.value) }
                      }))}
                      className="w-full accent-red-600"
                    />
                  </div>
                </div>
              ) : (
                /* Si es Color Sólido */
                <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700">Color Sólido de Fondo (Hex)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={data.marketplaceHero?.bgSolidColor || '#0f172a'}
                      onChange={(e) => setData((prev: any) => ({
                        ...prev,
                        marketplaceHero: { ...(prev.marketplaceHero || {}), bgSolidColor: e.target.value }
                      }))}
                      className="h-10 w-16 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={data.marketplaceHero?.bgSolidColor || '#0f172a'}
                      onChange={(e) => setData((prev: any) => ({
                        ...prev,
                        marketplaceHero: { ...(prev.marketplaceHero || {}), bgSolidColor: e.target.value }
                      }))}
                      className="w-36 rounded-xl border border-slate-200 p-2 font-mono text-xs uppercase font-bold"
                    />
                    {/* Presets rápidos */}
                    <div className="flex gap-1.5">
                      {['#0f172a', '#1e293b', '#831843', '#065f46', '#1e3a8a', '#312e81'].map(hex => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setData((prev: any) => ({
                            ...prev,
                            marketplaceHero: { ...(prev.marketplaceHero || {}), bgSolidColor: hex }
                          }))}
                          className="h-7 w-7 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Textos & Colores Tipográficos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Título Principal */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Título Principal</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">Color:</span>
                      <input
                        type="color"
                        value={data.marketplaceHero?.titleColor || '#FFFFFF'}
                        onChange={(e) => setData((prev: any) => ({
                          ...prev,
                          marketplaceHero: { ...(prev.marketplaceHero || {}), titleColor: e.target.value }
                        }))}
                        className="h-6 w-8 rounded cursor-pointer border border-slate-200 p-0.5"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={data.marketplaceHero?.title || ''}
                    onChange={(e) => setData((prev: any) => ({
                      ...prev,
                      marketplaceHero: { ...(prev.marketplaceHero || {}), title: e.target.value }
                    }))}
                    placeholder="Ej: Marketplace de Viajes, Cruceros & Experiencias"
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-black text-slate-900 bg-slate-50"
                  />
                </div>

                {/* Subtítulo / Descripción */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Subtítulo / Descripción</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">Color:</span>
                      <input
                        type="color"
                        value={data.marketplaceHero?.subtitleColor || '#CBD5E1'}
                        onChange={(e) => setData((prev: any) => ({
                          ...prev,
                          marketplaceHero: { ...(prev.marketplaceHero || {}), subtitleColor: e.target.value }
                        }))}
                        className="h-6 w-8 rounded cursor-pointer border border-slate-200 p-0.5"
                      />
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={data.marketplaceHero?.subtitle || ''}
                    onChange={(e) => setData((prev: any) => ({
                      ...prev,
                      marketplaceHero: { ...(prev.marketplaceHero || {}), subtitle: e.target.value }
                    }))}
                    placeholder="Ej: Salidas grupales propias con bus cama, cruceros..."
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-slate-50"
                  />
                </div>

                {/* Etiqueta / Badge Superior */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Etiqueta Superior / Tag</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">Color:</span>
                      <input
                        type="color"
                        value={data.marketplaceHero?.tagColor || '#EF4444'}
                        onChange={(e) => setData((prev: any) => ({
                          ...prev,
                          marketplaceHero: { ...(prev.marketplaceHero || {}), tagColor: e.target.value }
                        }))}
                        className="h-6 w-8 rounded cursor-pointer border border-slate-200 p-0.5"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={data.marketplaceHero?.tag || ''}
                    onChange={(e) => setData((prev: any) => ({
                      ...prev,
                      marketplaceHero: { ...(prev.marketplaceHero || {}), tag: e.target.value }
                    }))}
                    placeholder="Ej: CATÁLOGO OFICIAL 2026"
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-800 bg-slate-50"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* EXPERIENCE: MÓDULOS DEL BUSCADOR EN EL HERO */}
        {selectedLanding === 'experience' && activeTab === 'exp_buscador' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">🔍 Configuración del Buscador del Hero</h3>
              <p className="text-xs text-slate-400 mt-1">
                Habilita o deshabilita los módulos de búsqueda según tengas activas las conexiones API con cada proveedor.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'paquetes', label: '🚍 Paquetes & Salidas Propias', desc: 'Conectado al Marketplace propio' },
                { id: 'vuelos', label: '✈️ Vuelos GDS / Basset API', desc: 'Búsqueda de vuelos comerciales' },
                { id: 'hoteles', label: '🏨 Hoteles & Bedbanks', desc: 'Búsqueda de alojamiento' },
                { id: 'buses', label: '🚌 Micros de Línea / Unibus', desc: 'Pasajes de bus de larga distancia' },
                { id: 'civitatis', label: '🎯 Tours & Civitatis API', desc: 'Excursiones y actividades' },
                { id: 'travelcab', label: '🚕 Traslados TravelCab', desc: 'Cotización de transfers punto a punto' },
              ].map((module) => {
                const isEnabled = data.enabledSearchTabs?.[module.id] !== false && (module.id === 'paquetes' || module.id === 'travelcab' || data.enabledSearchTabs?.[module.id] === true);

                return (
                  <div key={module.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{module.label}</div>
                      <div className="text-[10px] text-slate-400">{module.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setData((prev: any) => ({
                          ...prev,
                          enabledSearchTabs: {
                            ...(prev.enabledSearchTabs || {}),
                            [module.id]: !isEnabled
                          }
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                        isEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isEnabled ? 'Habilitado' : 'Oculto'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EXPERIENCE: MÉTRICAS INSTITUCIONALES */}
        {selectedLanding === 'experience' && activeTab === 'exp_metrics' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">📊 Métricas &amp; Barra de Confianza (4 Estadísticas)</h3>
              <p className="text-xs text-slate-400 mt-1">Cifras institucionales que generan confianza antes de contratar un viaje.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(data.metrics || DEFAULT_EXPERIENCE_CMS_DATA.metrics).map((m: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-black text-slate-400 uppercase">Métrica #{idx + 1}</span>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Cifra / Número</label>
                      <input
                        type="text"
                        value={m.number || ''}
                        onChange={(e) => {
                          const updated = [...(data.metrics || DEFAULT_EXPERIENCE_CMS_DATA.metrics)];
                          updated[idx] = { ...updated[idx], number: e.target.value };
                          setData((prev: any) => ({ ...prev, metrics: updated }));
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs font-black text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Etiqueta / Descripción</label>
                      <input
                        type="text"
                        value={m.label || ''}
                        onChange={(e) => {
                          const updated = [...(data.metrics || DEFAULT_EXPERIENCE_CMS_DATA.metrics)];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setData((prev: any) => ({ ...prev, metrics: updated }));
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium text-slate-700 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPERIENCE: TESTIMONIOS DE PASAJEROS */}
        {selectedLanding === 'experience' && activeTab === 'exp_testimonials' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">⭐ Testimonios &amp; Reseñas de Pasajeros</h3>
                <p className="text-xs text-slate-400 mt-1">Opiniones y calificaciones reales de viajeros que contrataron servicios.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setData((prev: any) => ({
                    ...prev,
                    testimonials: [
                      ...(prev.testimonials || []),
                      {
                        name: "Nuevo Pasajero",
                        location: "Ciudad",
                        trip: "Destino del Viaje",
                        rating: 5,
                        comment: "Excelente experiencia y coordinación.",
                        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                      }
                    ]
                  }));
                }}
                className="px-3.5 py-2 bg-tech-blue text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                + Agregar Testimonio
              </button>
            </div>

            <div className="space-y-4">
              {(data.testimonials || DEFAULT_EXPERIENCE_CMS_DATA.testimonials).map((t: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (data.testimonials || []).filter((_: any, i: number) => i !== idx);
                      setData((prev: any) => ({ ...prev, testimonials: updated }));
                    }}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <span className="text-xs font-black text-slate-400 uppercase">Testimonio #{idx + 1}</span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Nombre del Pasajero</label>
                      <input
                        type="text"
                        value={t.name || ''}
                        onChange={(e) => {
                          const updated = [...(data.testimonials || [])];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setData((prev: any) => ({ ...prev, testimonials: updated }));
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Ubicación / Ciudad</label>
                      <input
                        type="text"
                        value={t.location || ''}
                        onChange={(e) => {
                          const updated = [...(data.testimonials || [])];
                          updated[idx] = { ...updated[idx], location: e.target.value };
                          setData((prev: any) => ({ ...prev, testimonials: updated }));
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Viaje / Tour Realizado</label>
                      <input
                        type="text"
                        value={t.trip || ''}
                        onChange={(e) => {
                          const updated = [...(data.testimonials || [])];
                          updated[idx] = { ...updated[idx], trip: e.target.value };
                          setData((prev: any) => ({ ...prev, testimonials: updated }));
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Comentario / Reseña</label>
                      <textarea
                        rows={2}
                        value={t.comment || ''}
                        onChange={(e) => {
                          const updated = [...(data.testimonials || [])];
                          updated[idx] = { ...updated[idx], comment: e.target.value };
                          setData((prev: any) => ({ ...prev, testimonials: updated }));
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">URL Avatar / Foto</label>
                      <input
                        type="text"
                        value={t.avatar || ''}
                        onChange={(e) => {
                          const updated = [...(data.testimonials || [])];
                          updated[idx] = { ...updated[idx], avatar: e.target.value };
                          setData((prev: any) => ({ ...prev, testimonials: updated }));
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 bg-white font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* EDITORES TRAVELAPP REWARDS */}
        {/* ======================================================== */}

        {/* REWARDS: SLIDER */}
        {selectedLanding === 'rewards' && activeTab === 'rew_slider' && data && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-violet-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-violet-800">🎁 Slider Principal Rewards (Hasta 10 Diapositivas)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las imágenes, textos y opacidad de cada slide del carrusel.</p>
              </div>
              <button
                onClick={() => {
                  if ((data.heroSlides || []).length >= 10) { alert('Límite de 10 diapositivas'); return; }
                  setData((prev: any) => ({
                    ...prev,
                    heroSlides: [...(prev.heroSlides || []), {
                      title: "Nueva Diapositiva",
                      subtitle: "Subtítulo descriptivo del programa Rewards.",
                      text: "Texto adicional.",
                      bgImage: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1920&q=80",
                      ctaText: "Ver Catálogo de Canjes",
                      ctaUrl: "/canjes",
                      overlayOpacity: 65,
                    }]
                  }));
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-600 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 hover:bg-violet-600 hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Diapositiva
              </button>
            </div>

            <div className="space-y-4">
              {(data.heroSlides || []).map((slide: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-violet-100 p-4 bg-violet-50/30 shadow-sm relative space-y-3">
                  <button
                    onClick={() => {
                      const updated = data.heroSlides.filter((_: any, i: number) => i !== idx);
                      setData((prev: any) => ({ ...prev, heroSlides: updated }));
                    }}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Diapositiva"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="text-xs font-black text-violet-400 uppercase">Diapositiva N° {idx + 1}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Título</label>
                      <input type="text" value={slide.title || ''} onChange={(e) => { const u = [...data.heroSlides]; u[idx] = { ...u[idx], title: e.target.value }; setData((p: any) => ({ ...p, heroSlides: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Subtítulo</label>
                      <input type="text" value={slide.subtitle || ''} onChange={(e) => { const u = [...data.heroSlides]; u[idx] = { ...u[idx], subtitle: e.target.value }; setData((p: any) => ({ ...p, heroSlides: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Texto descriptivo</label>
                      <textarea rows={2} value={slide.text || ''} onChange={(e) => { const u = [...data.heroSlides]; u[idx] = { ...u[idx], text: e.target.value }; setData((p: any) => ({ ...p, heroSlides: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Texto Botón CTA</label>
                      <input type="text" value={slide.ctaText || ''} onChange={(e) => { const u = [...data.heroSlides]; u[idx] = { ...u[idx], ctaText: e.target.value }; setData((p: any) => ({ ...p, heroSlides: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Enlace del Botón CTA</label>
                      <input type="text" value={slide.ctaUrl || ''} onChange={(e) => { const u = [...data.heroSlides]; u[idx] = { ...u[idx], ctaUrl: e.target.value }; setData((p: any) => ({ ...p, heroSlides: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">URL de imagen de fondo</label>
                      <input type="text" value={slide.bgImage || ''} onChange={(e) => { const u = [...data.heroSlides]; u[idx] = { ...u[idx], bgImage: e.target.value }; setData((p: any) => ({ ...p, heroSlides: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" placeholder="https://..." />
                    </div>
                    {slide.bgImage && (
                      <div className="w-32 h-20 border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
                        <img src={slide.bgImage} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Opacidad de la capa oscura del Hero: <strong>{slide.overlayOpacity ?? 65}%</strong>
                      </label>
                      <input
                        type="range" min="0" max="100"
                        value={slide.overlayOpacity ?? 65}
                        onChange={(e) => { const u = [...data.heroSlides]; u[idx] = { ...u[idx], overlayOpacity: Number(e.target.value) }; setData((p: any) => ({ ...p, heroSlides: u })); }}
                        className="w-full accent-violet-600"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                        <span>0% (sin capa)</span>
                        <span>50% (medio)</span>
                        <span>100% (negro)</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(data.heroSlides || []).length === 0 && (
                <p className="text-slate-400 text-center py-8 text-sm">No hay diapositivas. Agrega una arriba.</p>
              )}
            </div>
          </div>
        )}

        {/* REWARDS: BENEFICIOS */}
        {selectedLanding === 'rewards' && activeTab === 'rew_beneficios' && data && (
          <div className="space-y-6">
            <div className="border-b border-violet-100 pb-4">
              <h3 className="text-base font-extrabold text-violet-800">🎁 Cómo Sumar Puntos + Beneficios</h3>
              <p className="text-xs text-slate-400 mt-1">Editá los 3 pasos de cómo sumar puntos y las 4 tarjetas de beneficios.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-600 uppercase">Pasos: ¿Cómo sumar puntos?</h4>
              {(data.howItWorks || []).map((step: any, idx: number) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Número (ej: 01)</label>
                    <input type="text" value={step.step || ''} onChange={(e) => { const u = [...data.howItWorks]; u[idx] = { ...u[idx], step: e.target.value }; setData((p: any) => ({ ...p, howItWorks: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Título</label>
                    <input type="text" value={step.title || ''} onChange={(e) => { const u = [...data.howItWorks]; u[idx] = { ...u[idx], title: e.target.value }; setData((p: any) => ({ ...p, howItWorks: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Descripción</label>
                    <input type="text" value={step.description || ''} onChange={(e) => { const u = [...data.howItWorks]; u[idx] = { ...u[idx], description: e.target.value }; setData((p: any) => ({ ...p, howItWorks: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-slate-600 uppercase">Tarjetas de Beneficios</h4>
              {(data.benefits || []).map((b: any, idx: number) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ícono (Plane, Coffee, ShoppingBag, Star)</label>
                    <input type="text" value={b.icon || ''} onChange={(e) => { const u = [...data.benefits]; u[idx] = { ...u[idx], icon: e.target.value }; setData((p: any) => ({ ...p, benefits: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Título</label>
                    <input type="text" value={b.title || ''} onChange={(e) => { const u = [...data.benefits]; u[idx] = { ...u[idx], title: e.target.value }; setData((p: any) => ({ ...p, benefits: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Descripción</label>
                    <input type="text" value={b.description || ''} onChange={(e) => { const u = [...data.benefits]; u[idx] = { ...u[idx], description: e.target.value }; setData((p: any) => ({ ...p, benefits: u })); }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 pt-2 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <h4 className="text-xs font-black text-slate-600 uppercase">CTA Final (activar cuenta)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CMSInput label="Título del CTA" value={data.ctaBlock?.title || ''} onChange={(val) => updateField('ctaBlock', 'title', val)} />
                <CMSInput label="Texto del botón" value={data.ctaBlock?.buttonText || ''} onChange={(val) => updateField('ctaBlock', 'buttonText', val)} />
                <CMSTextarea label="Subtítulo" value={data.ctaBlock?.subtitle || ''} onChange={(val) => updateField('ctaBlock', 'subtitle', val)} rows={2} />
                <CMSInput label="URL del botón" value={data.ctaBlock?.buttonUrl || ''} onChange={(val) => updateField('ctaBlock', 'buttonUrl', val)} />
              </div>
            </div>
          </div>
        )}

        {/* REWARDS: SUMÁ TU NEGOCIO */}
        {selectedLanding === 'rewards' && activeTab === 'rew_negocio' && data && (
          <div className="space-y-6">
            <div className="border-b border-violet-100 pb-4">
              <h3 className="text-base font-extrabold text-violet-800">🏢 Sección "Sumá tu Negocio al Ecosistema"</h3>
              <p className="text-xs text-slate-400 mt-1">Editá la sección de captación de partners comerciales.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput label="Título" value={data.businessSection?.title || ''} onChange={(val) => updateField('businessSection', 'title', val)} />
              <CMSInput label="Texto del botón" value={data.businessSection?.buttonText || ''} onChange={(val) => updateField('businessSection', 'buttonText', val)} />
              <CMSTextarea label="Subtítulo" value={data.businessSection?.subtitle || ''} onChange={(val) => updateField('businessSection', 'subtitle', val)} rows={3} />
              <CMSInput label="URL del botón" value={data.businessSection?.buttonUrl || ''} onChange={(val) => updateField('businessSection', 'buttonUrl', val)} />
            </div>
          </div>
        )}

        {/* REWARDS: REDES SOCIALES */}
        {selectedLanding === 'rewards' && activeTab === 'rew_social' && data && (
          <div className="space-y-4">
            <div className="border-b border-violet-100 pb-4">
              <h3 className="text-base font-extrabold text-violet-800">📱 Redes Sociales de Rewards</h3>
            </div>
            <CMSInput label="Facebook" value={data.redesSociales?.facebook || ''} onChange={(val) => updateField('redesSociales', 'facebook', val)} placeholder="https://facebook.com/..." />
            <CMSInput label="Instagram" value={data.redesSociales?.instagram || ''} onChange={(val) => updateField('redesSociales', 'instagram', val)} placeholder="https://instagram.com/..." />
            <CMSInput label="WhatsApp" value={data.redesSociales?.whatsapp || ''} onChange={(val) => updateField('redesSociales', 'whatsapp', val)} placeholder="https://wa.me/..." />
            <CMSInput label="YouTube" value={data.redesSociales?.youtube || ''} onChange={(val) => updateField('redesSociales', 'youtube', val)} placeholder="https://youtube.com/..." />
            <CMSInput label="TikTok" value={data.redesSociales?.tiktok || ''} onChange={(val) => updateField('redesSociales', 'tiktok', val)} placeholder="https://tiktok.com/..." />
          </div>
        )}

        {/* REWARDS: SELLOS LEGALES */}
        {selectedLanding === 'rewards' && activeTab === 'rew_legales' && data && (
          <div className="space-y-4">
            <div className="border-b border-violet-100 pb-4">
              <h3 className="text-base font-extrabold text-violet-800">⚖️ Sellos Legales y Copyright de Rewards</h3>
            </div>
            <CMSTextarea label="Sello ARCA / AFIP (URL de imagen o HTML del iframe)" value={data.sellosLegales?.arcaQr || ''} onChange={(val) => updateField('sellosLegales', 'arcaQr', val)} rows={3} />
            <CMSTextarea label="Sello Base de Datos (URL de imagen o HTML del iframe)" value={data.sellosLegales?.baseDatosSello || ''} onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)} rows={3} />
            <CMSInput label="Texto de Copyright" value={data.footer?.copyrightText || ''} onChange={(val) => updateField('footer', 'copyrightText', val)} />
          </div>
        )}

        {selectedLanding === 'experience' && activeTab === 'ofertas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Ofertas Destacadas en Carrusel (Hasta 6)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las fotos de ofertas que enlazan al catálogo de viajes.</p>
              </div>
              <button
                onClick={addCarouselOffer}
                className="inline-flex items-center gap-1.5 rounded-lg border border-tech-blue bg-tech-blue/5 px-3.5 py-2 text-xs font-bold text-tech-blue hover:bg-tech-blue hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Oferta
              </button>
            </div>

            <div className="space-y-4">
              {(data.carouselOffers || []).map((offer: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteCarouselOffer(idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Oferta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="text-xs font-black text-slate-400 uppercase">Oferta N° {idx + 1}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Título de la oferta / Destino</label>
                      <input
                        type="text"
                        value={offer.title || ''}
                        onChange={(e) => updateCarouselOffer(idx, 'title', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Enlace de redirección</label>
                      <input
                        type="text"
                        value={offer.link || ''}
                        onChange={(e) => updateCarouselOffer(idx, 'link', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Imagen de la oferta</label>
                      <OfferImageUploader idx={idx} value={offer.imageUrl} />
                    </div>
                    {offer.imageUrl && (
                      <div className="w-32 h-20 border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
                        <img src={offer.imageUrl} alt="offer preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(data.carouselOffers || []).length === 0 && (
                <p className="text-slate-400 text-center py-8 text-sm">No hay ofertas cargadas en el carrusel. Agrega una arriba.</p>
              )}
            </div>
          </div>
        )}

        {selectedLanding === 'experience' && activeTab === 'servicios' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Nuestros Servicios de Experiencia (Tarjetas Flotantes)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las tarjetas de servicio y el modal que se despliega de cada una.</p>
              </div>
              <button
                onClick={addService}
                className="inline-flex items-center gap-1.5 rounded-lg border border-tech-blue bg-tech-blue/5 px-3.5 py-2 text-xs font-bold text-tech-blue hover:bg-tech-blue hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Servicio
              </button>
            </div>

            <div className="space-y-4">
              {data.servicios?.map((item: any, idx: number) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteService(idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Servicio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <ServiceInput
                        label="Título del Servicio"
                        value={item.title}
                        idx={idx}
                        field="title"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <ServiceInput
                        label="Resumen corto (tarjeta)"
                        value={item.summary}
                        idx={idx}
                        field="summary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Detalle para modal emergente</label>
                      <textarea
                        rows={3}
                        value={item.modalDetail || ''}
                        onChange={(e) => updateService(idx, 'modalDetail', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <ServiceImageUploader
                        idx={idx}
                        value={item.imageUrl}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'experience' && activeTab === 'rewards' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Bloque Informativo Rewards (Experiencias)</h3>
              <p className="text-xs text-slate-400 mt-1">Configura la sección destacada de Rewards para motivar la suscripción de viajeros.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Título Informativo"
                  value={data.rewardsBlock?.title || ''}
                  onChange={(val) => updateField('rewardsBlock', 'title', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Badge del Bloque"
                  value={data.rewardsBlock?.badgeText || ''}
                  onChange={(val) => updateField('rewardsBlock', 'badgeText', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Texto Puntos / Regalo"
                  value={data.rewardsBlock?.pointsText || ''}
                  onChange={(val) => updateField('rewardsBlock', 'pointsText', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Subtítulo Explicativo"
                  value={data.rewardsBlock?.subtitle || ''}
                  onChange={(val) => updateField('rewardsBlock', 'subtitle', val)}
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploaderInput 
                  label="Imagen Ilustrativa Rewards" 
                  section="rewardsBlock" 
                  field="imageUrl" 
                  value={data.rewardsBlock?.imageUrl || ''} 
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'experience' && activeTab === 'social' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Enlaces de Redes Sociales (Experiencias)</h3>
              <p className="text-xs text-slate-400 mt-1">Configura las redes oficiales de TravelApp Experience.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Página de Facebook"
                  value={data.redesSociales?.facebook || ''}
                  onChange={(val) => updateField('redesSociales', 'facebook', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Página de Instagram (@usuario)"
                  value={data.redesSociales?.instagram || ''}
                  onChange={(val) => updateField('redesSociales', 'instagram', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Canal de Messenger"
                  value={data.redesSociales?.messenger || ''}
                  onChange={(val) => updateField('redesSociales', 'messenger', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="WhatsApp de Reservas / Contacto"
                  value={data.redesSociales?.whatsapp || ''}
                  onChange={(val) => updateField('redesSociales', 'whatsapp', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Canal de YouTube"
                  value={data.redesSociales?.youtube || ''}
                  onChange={(val) => updateField('redesSociales', 'youtube', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Perfil de TikTok"
                  value={data.redesSociales?.tiktok || ''}
                  onChange={(val) => updateField('redesSociales', 'tiktok', val)}
                />
              </div>
            </div>

            <div className="border-b border-slate-100 pb-4 pt-4">
              <h3 className="text-base font-extrabold text-slate-800">Sellos Gubernamentales y de Registro</h3>
              <p className="text-xs text-slate-400 mt-1">Configura el código QR de ARCA y el sello de Registro Nacional de Base de Datos para el footer de experiencias (soporta código HTML/script o URL de imagen).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSTextarea
                label="Código o URL del Sello QR ARCA"
                value={data.sellosLegales?.arcaQr || ''}
                onChange={(val) => updateField('sellosLegales', 'arcaQr', val)}
                rows={3}
              />
              <CMSTextarea
                label="Código o URL del Sello Registro Nacional de Base de Datos"
                value={data.sellosLegales?.baseDatosSello || ''}
                onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)}
                rows={3}
              />
            </div>

            <div className="border-b border-slate-100 pb-4 pt-4">
              <h3 className="text-base font-extrabold text-slate-800">Footer y Branding</h3>
              <p className="text-xs text-slate-400 mt-1">Configura los derechos de autor y textos en el pie de página de la landing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Marca Principal Footer"
                  value={data.footer?.brandText || ''}
                  onChange={(val) => updateField('footer', 'brandText', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Derechos de Autor (Copyright)"
                  value={data.footer?.copyrightText || ''}
                  onChange={(val) => updateField('footer', 'copyrightText', val)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* EDITORES ECOSISTEMA */}
        {/* ======================================================== */}

        {/* ECO: HERO */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_hero' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Hero — Imagen o Video de Fondo</h3>
              <p className="text-xs text-slate-400 mt-1">Configurá el banner principal. Podés usar una imagen estática o un video en loop.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipo de Media del Hero</label>
                <select
                  value={data.hero?.mediaType || 'image'}
                  onChange={(e) => updateField('hero', 'mediaType', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none"
                >
                  <option value="image">🖼️  Imagen de Fondo</option>
                  <option value="video">🎬  Video en Loop (autoplay muted)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Opacidad del Overlay (0-100)</label>
                <input
                  type="number" min="0" max="100"
                  value={data.hero?.overlayOpacity ?? 72}
                  onChange={(e) => updateField('hero', 'overlayOpacity', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none"
                />
              </div>
            </div>

            <ImageUploaderInput label="URL o Archivo del Hero (imagen/video)" section="hero" field="mediaUrl" value={data.hero?.mediaUrl || ''} />

            {data.hero?.mediaUrl && (
              <div className="rounded-xl border border-slate-200 overflow-hidden h-32 relative bg-slate-100">
                {data.hero.mediaType === 'video' ? (
                  <video src={data.hero.mediaUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={data.hero.mediaUrl} alt="Hero Preview" className="w-full h-full object-cover" />
                )}
                <span className="absolute top-2 left-2 text-[10px] font-black bg-slate-900/70 text-white px-2 py-0.5 rounded">PREVIEW</span>
              </div>
            )}

            <CMSInput label="Badge / Etiqueta Superior" value={data.hero?.badge || ''} onChange={(val) => updateField('hero', 'badge', val)} placeholder="Texto del badge animado..." />
            <CMSTextarea label="Título Principal (usa \n para salto de línea entre palabras)" value={data.hero?.title || ''} onChange={(val) => updateField('hero', 'title', val)} rows={2} />
            <CMSTextarea label="Subtítulo" value={data.hero?.subtitle || ''} onChange={(val) => updateField('hero', 'subtitle', val)} rows={2} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput label="Texto CTA Principal" value={data.hero?.ctaText || ''} onChange={(val) => updateField('hero', 'ctaText', val)} />
              <CMSInput label="URL WhatsApp" value={data.hero?.whatsappUrl || ''} onChange={(val) => updateField('hero', 'whatsappUrl', val)} />
              <CMSInput label="Texto Botón WhatsApp" value={data.hero?.whatsappText || ''} onChange={(val) => updateField('hero', 'whatsappText', val)} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-black text-slate-600 uppercase tracking-wider">📱 URLs App Stores (dejar vacío para ocultar)</p>
              <CMSInput label="Google Play Store URL" value={data.hero?.playStoreUrl || ''} onChange={(val) => updateField('hero', 'playStoreUrl', val)} placeholder="https://play.google.com/store/apps/details?id=..." />
              <CMSInput label="Apple App Store URL" value={data.hero?.appStoreUrl || ''} onChange={(val) => updateField('hero', 'appStoreUrl', val)} placeholder="https://apps.apple.com/ar/app/..." />
            </div>
          </div>
        )}

        {/* ECO: PROMO PUSH POP */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_promo' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>🔔 Push Pop Promocional (TravelSale / Puntos Dobles)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ventana emergente configurable que se muestra a los viajeros cuando ingresan a la plataforma.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Activar Push Pop Promocional</h4>
                <p className="text-[11px] text-slate-500">Si está desactivado, no se mostrará ninguna ventana emergente a los visitantes.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.promoPushPop?.enabled || false}
                  onChange={(e) => updateField('promoPushPop', 'enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff5a19]" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Badge / Etiqueta Promocional"
                value={data.promoPushPop?.badge || ''}
                onChange={(val) => updateField('promoPushPop', 'badge', val)}
                placeholder="Ej. 🔥 TRAVEL SALE 2026"
              />
              <CMSInput
                label="Cupón de Descuento (opcional)"
                value={data.promoPushPop?.discountCode || ''}
                onChange={(val) => updateField('promoPushPop', 'discountCode', val)}
                placeholder="Ej. TRAVELSALE"
              />
            </div>

            <CMSInput
              label="Título de la Promoción"
              value={data.promoPushPop?.title || ''}
              onChange={(val) => updateField('promoPushPop', 'title', val)}
              placeholder="Ej. ¡Hasta 40% OFF en Experiencias y Puntos Dobles!"
            />

            <CMSTextarea
              label="Texto / Descripción de la Promoción"
              value={data.promoPushPop?.subtitle || ''}
              onChange={(val) => updateField('promoPushPop', 'subtitle', val)}
              rows={2}
              placeholder="Detalles del beneficio, cuotas o vigencia..."
            />

            <ImageUploaderInput
              label="Banner o Imagen de la Promoción (opcional)"
              section="promoPushPop"
              field="imageUrl"
              value={data.promoPushPop?.imageUrl || ''}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Texto del Botón CTA"
                value={data.promoPushPop?.ctaText || ''}
                onChange={(val) => updateField('promoPushPop', 'ctaText', val)}
                placeholder="Ej. Ver Ofertas Especiales"
              />
              <CMSInput
                label="Enlace del Botón CTA"
                value={data.promoPushPop?.ctaUrl || ''}
                onChange={(val) => updateField('promoPushPop', 'ctaUrl', val)}
                placeholder="Ej. /landing/experience/marketplace"
              />
            </div>
          </div>
        )}

        {/* ECO: UNIDADES */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_unidades' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Tarjetas de Unidades de Negocio</h3>
              <p className="text-xs text-slate-400 mt-1">Editá la imagen, descripción breve y descripción extendida (modal) de cada unidad.</p>
            </div>
            {(data.unidades || []).map((unit: any, idx: number) => (
              <div key={unit.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                  <div className="h-8 w-8 rounded-lg bg-tech-blue/10 flex items-center justify-center">
                    <span className="text-sm font-black text-tech-blue">0{idx+1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-700">{unit.nombre}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{unit.id}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500">Imagen Representativa</label>
                  <ServiceImageUploader idx={idx} value={unit.imagenUrl || ''} />
                </div>
                <ServiceInput label="Nombre de la Unidad" value={unit.nombre || ''} idx={idx} field="nombre" />
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Descripción Breve (tarjeta)</label>
                  <textarea
                    rows={2}
                    value={unit.descripcionBreve || ''}
                    onChange={(e) => {
                      const updated = [...data.unidades];
                      updated[idx] = { ...updated[idx], descripcionBreve: e.target.value };
                      setData((prev: any) => ({ ...prev, unidades: updated }));
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Descripción Extendida (modal "Leer Más")</label>
                  <textarea
                    rows={3}
                    value={unit.descripcionExtendida || ''}
                    onChange={(e) => {
                      const updated = [...data.unidades];
                      updated[idx] = { ...updated[idx], descripcionExtendida: e.target.value };
                      setData((prev: any) => ({ ...prev, unidades: updated }));
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ECO: QUIÉNES SOMOS */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_quienes' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Quiénes Somos</h3>
            </div>
            <ImageUploaderInput label="Imagen de la Sección" section="quienesSomos" field="imagenUrl" value={data.quienesSomos?.imagenUrl || ''} />
            <CMSInput label="Badge / Etiqueta" value={data.quienesSomos?.badge || ''} onChange={(val) => updateField('quienesSomos', 'badge', val)} />
            <CMSInput label="Título Principal" value={data.quienesSomos?.titulo || ''} onChange={(val) => updateField('quienesSomos', 'titulo', val)} />
            <CMSTextarea label="Misión" value={data.quienesSomos?.mision || ''} onChange={(val) => updateField('quienesSomos', 'mision', val)} rows={3} />
            <CMSTextarea label="Visión" value={data.quienesSomos?.vision || ''} onChange={(val) => updateField('quienesSomos', 'vision', val)} rows={3} />
            <CMSTextarea label="Valores" value={data.quienesSomos?.valores || ''} onChange={(val) => updateField('quienesSomos', 'valores', val)} rows={3} />
          </div>
        )}

        {/* ECO: STATS */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_stats' && data && (
          <div className="space-y-6">
            {/* Toggle showStats */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-xs font-black text-slate-700">Mostrar Sección de Métricas</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Habilita o deshabilita la sección "Números que Hablan" en la landing page.</p>
              </div>
              <button
                type="button"
                onClick={() => setData((prev: any) => ({ ...prev, showStats: !prev.showStats }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  data.showStats ? 'bg-orange-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    data.showStats ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Métricas de Impacto</h3>
                <p className="text-xs text-slate-400 mt-1">Los contadores se animan al hacer scroll. Íconos válidos: Car, Compass, Users, MapPin, Globe, Star, Award, Sparkles</p>
              </div>
              <button
                onClick={() => setData((prev: any) => ({ ...prev, stats: [...(prev.stats || []), { valor: '1.000+', label: 'Nueva Métrica', icono: 'Star' }] }))}
                className="flex items-center gap-1 text-xs font-bold text-tech-blue border border-tech-blue/30 bg-tech-blue/5 px-3 py-1.5 rounded-lg hover:bg-tech-blue/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
            {(data.stats || []).map((stat: any, idx: number) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Valor</label>
                      <input value={stat.valor || ''} onChange={(e) => { const s = [...data.stats]; s[idx] = {...s[idx], valor: e.target.value}; setData((p: any) => ({...p, stats: s})); }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Etiqueta</label>
                      <input value={stat.label || ''} onChange={(e) => { const s = [...data.stats]; s[idx] = {...s[idx], label: e.target.value}; setData((p: any) => ({...p, stats: s})); }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Ícono</label>
                      <input value={stat.icono || ''} onChange={(e) => { const s = [...data.stats]; s[idx] = {...s[idx], icono: e.target.value}; setData((p: any) => ({...p, stats: s})); }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                  </div>
                </div>
                <button onClick={() => { const s = data.stats.filter((_: any, i: number) => i !== idx); setData((p: any) => ({...p, stats: s})); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ECO: APPS */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_apps' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Sección Descarga de la App</h3>
              <p className="text-xs text-slate-400 mt-1">Dejá las URLs vacías para ocultar la sección de app stores en la landing.</p>
            </div>
            <CMSInput label="Título de la Sección" value={data.apps?.titulo || ''} onChange={(val) => updateField('apps', 'titulo', val)} />
            <CMSTextarea label="Subtítulo / Descripción" value={data.apps?.subtitulo || ''} onChange={(val) => updateField('apps', 'subtitulo', val)} rows={2} />
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 space-y-4">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">URLs de Descarga</p>
              <CMSInput label="Google Play Store URL" value={data.apps?.playStoreUrl || ''} onChange={(val) => updateField('apps', 'playStoreUrl', val)} placeholder="https://play.google.com/store/apps/details?id=ar.travelapp" />
              <CMSInput label="Apple App Store URL" value={data.apps?.appStoreUrl || ''} onChange={(val) => updateField('apps', 'appStoreUrl', val)} placeholder="https://apps.apple.com/ar/app/travelapp/id..." />
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
              <strong>Nota:</strong> Las URLs también están disponibles en el tab Hero para mostrar los badges directamente en el banner principal.
            </div>
          </div>
        )}

        {/* ECO: TRABAJA CON NOSOTROS */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_trabaja' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Sección "Trabaja con Nosotros"</h3>
            </div>
            <CMSInput label="Título de la Sección" value={data.trabajaNosotros?.titulo || ''} onChange={(val) => updateField('trabajaNosotros', 'titulo', val)} />
            <CMSTextarea label="Subtítulo" value={data.trabajaNosotros?.subtitulo || ''} onChange={(val) => updateField('trabajaNosotros', 'subtitulo', val)} rows={2} />
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-slate-600">Puestos / Áreas Disponibles</label>
                <button
                  onClick={() => setData((prev: any) => ({ ...prev, trabajaNosotros: { ...prev.trabajaNosotros, puestos: [...(prev.trabajaNosotros?.puestos || []), 'Nuevo Puesto'] } }))}
                  className="flex items-center gap-1 text-xs font-bold text-tech-blue border border-tech-blue/30 bg-tech-blue/5 px-3 py-1.5 rounded-lg hover:bg-tech-blue/10 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar Puesto
                </button>
              </div>
              <div className="space-y-2">
                {(data.trabajaNosotros?.puestos || []).map((p: string, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={p}
                      onChange={(e) => {
                        const puestos = [...(data.trabajaNosotros?.puestos || [])];
                        puestos[idx] = e.target.value;
                        setData((prev: any) => ({ ...prev, trabajaNosotros: { ...prev.trabajaNosotros, puestos } }));
                      }}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const puestos = (data.trabajaNosotros?.puestos || []).filter((_: any, i: number) => i !== idx);
                        setData((prev: any) => ({ ...prev, trabajaNosotros: { ...prev.trabajaNosotros, puestos } }));
                      }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ECO: LEGAL & REDES */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_legales' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Información Legal & Redes Sociales</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput label="Razón Social" value={data.legales?.razonSocial || ''} onChange={(val) => updateField('legales', 'razonSocial', val)} />
              <CMSInput label="CUIT" value={data.legales?.cuit || ''} onChange={(val) => updateField('legales', 'cuit', val)} />
              <CMSInput label="Domicilio Legal" value={data.legales?.domicilio || ''} onChange={(val) => updateField('legales', 'domicilio', val)} />
            </div>
            <CMSTextarea label="Términos y Condiciones" value={data.legales?.terminos || ''} onChange={(val) => updateField('legales', 'terminos', val)} rows={4} />
            <CMSTextarea label="Política de Privacidad" value={data.legales?.privacidad || ''} onChange={(val) => updateField('legales', 'privacidad', val)} rows={4} />

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-extrabold text-slate-700 mb-4">Redes Sociales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput label="Facebook URL" value={data.redesSociales?.facebook || ''} onChange={(val) => updateField('redesSociales', 'facebook', val)} />
                <CMSInput label="Instagram URL" value={data.redesSociales?.instagram || ''} onChange={(val) => updateField('redesSociales', 'instagram', val)} />
                <CMSInput label="WhatsApp URL" value={data.redesSociales?.whatsapp || ''} onChange={(val) => updateField('redesSociales', 'whatsapp', val)} />
                <CMSInput label="LinkedIn URL" value={data.redesSociales?.linkedin || ''} onChange={(val) => updateField('redesSociales', 'linkedin', val)} />
                <CMSInput label="YouTube URL" value={data.redesSociales?.youtube || ''} onChange={(val) => updateField('redesSociales', 'youtube', val)} />
                <CMSInput label="TikTok URL" value={data.redesSociales?.tiktok || ''} onChange={(val) => updateField('redesSociales', 'tiktok', val)} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-extrabold text-slate-700 mb-2">Sellos Gubernamentales y de Registro</h3>
              <p className="text-xs text-slate-400 mb-4">Configura el código QR de ARCA y el sello de Registro Nacional de Base de Datos para el pie de página de Ecosistema y Rewards (soporta código HTML/script o URL de imagen).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSTextarea
                  label="Código o URL del Sello QR ARCA"
                  value={data.sellosLegales?.arcaQr || ''}
                  onChange={(val) => updateField('sellosLegales', 'arcaQr', val)}
                  rows={3}
                />
                <CMSTextarea
                  label="Código o URL del Sello Registro Nacional de Base de Datos"
                  value={data.sellosLegales?.baseDatosSello || ''}
                  onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* APP INICIO - NOVEDADES CARDS */}
        {selectedLanding === 'app-inicio' && activeTab === 'app_cards' && data?.block1 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Tarjetas Flotantes de la App (Carrusel Superpuesto)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las tarjetas de novedades, promociones y beneficios con efecto de superposición dinámica (Swipe estilo Mercado Pago).</p>
              </div>
              <button
                onClick={() => addAppCard('block1')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600 bg-amber-600/5 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Tarjeta
              </button>
            </div>

            {/* PREVISUALIZADOR EN VIVO ESTILO MERCADO PAGO */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200/60 p-4 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-amber-600" /> Vista Previa Interactiva (Simulador de Móvil)
                </span>
                <span className="text-[9px] font-bold text-slate-400">Deslizá con el mouse o dedo</span>
              </div>
              <div className="bg-white rounded-2xl p-2 shadow-md max-w-md mx-auto">
                <OverlappingCardCarousel
                  cards={data.block1.cards || []}
                  title={data.block1.blockTitle || "Novedades del Ecosistema"}
                  subtitle="Deslizá para descubrir promociones exclusivas"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-extrabold text-slate-700 mb-1">Título de la Sección en la App</label>
              <input
                type="text"
                value={data.block1.blockTitle || ''}
                onChange={(e) => updateBlockTitle('block1', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Ej: Novedades del Ecosistema"
              />
            </div>

            <div className="space-y-4">
              {(data.block1.cards || []).map((card: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteAppCard('block1', idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Tarjeta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="text-xs font-black text-amber-600 uppercase">Tarjeta N° {idx + 1}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Título Principal (Corto y directo)</label>
                      <input
                        type="text"
                        value={card.title || ''}
                        onChange={(e) => updateAppCard('block1', idx, 'title', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: 150 Puntos Extra"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Badge Superior (Etiqueta Flotante)</label>
                      <input
                        type="text"
                        value={card.badge || ''}
                        onChange={(e) => updateAppCard('block1', idx, 'badge', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: 🎁 REWARDS / 20% OFF"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Subtítulo Corto (1 línea)</label>
                      <input
                        type="text"
                        value={card.subtitle || card.description || ''}
                        onChange={(e) => {
                          updateAppCard('block1', idx, 'subtitle', e.target.value);
                          updateAppCard('block1', idx, 'description', e.target.value);
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: Completá tu foto de perfil y sumá puntos gratis."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Texto del Botón CTA</label>
                      <input
                        type="text"
                        value={card.ctaText || 'Ver Beneficio'}
                        onChange={(e) => updateAppCard('block1', idx, 'ctaText', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: Sumar Puntos / Explorar"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Enlace / URL de redirección</label>
                      <input
                        type="text"
                        value={card.url || ''}
                        onChange={(e) => updateAppCard('block1', idx, 'url', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Imagen de Fondo de la Tarjeta</label>
                      <AppCardImageUploader blockKey="block1" idx={idx} value={card.imageUrl || ''} />
                      {card.imageUrl ? (
                        <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-slate-200">
                          <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {(data.block1.cards || []).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay tarjetas agregadas. Haz clic en "Agregar Tarjeta" para crear una.
                </div>
              )}
            </div>
          </div>
        )}

        {/* APP INICIO - BENEFICIOS REWARDS CARDS */}
        {selectedLanding === 'app-inicio' && activeTab === 'app_rewards' && data?.block2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Tarjetas de Beneficios Rewards (Carrusel Superpuesto)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las tarjetas del carrusel de beneficios directos de Rewards con efecto de superposición dinámica (Swipe estilo Mercado Pago).</p>
              </div>
              <button
                onClick={() => addAppCard('block2')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600 bg-amber-600/5 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Tarjeta
              </button>
            </div>

            {/* PREVISUALIZADOR EN VIVO ESTILO MERCADO PAGO */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200/60 p-4 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-amber-600" /> Vista Previa Interactiva (Simulador de Móvil)
                </span>
                <span className="text-[9px] font-bold text-slate-400">Deslizá con el mouse o dedo</span>
              </div>
              <div className="bg-white rounded-2xl p-2 shadow-md max-w-md mx-auto">
                <OverlappingCardCarousel
                  cards={data.block2.cards || []}
                  title={data.block2.blockTitle || "Beneficios Rewards"}
                  subtitle="Canjes y promociones exclusivas para miembros"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-extrabold text-slate-700 mb-1">Título de la Sección en la App</label>
              <input
                type="text"
                value={data.block2.blockTitle || ''}
                onChange={(e) => updateBlockTitle('block2', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Ej: Beneficios Rewards"
              />
            </div>

            <div className="space-y-4">
              {(data.block2.cards || []).map((card: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteAppCard('block2', idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Tarjeta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="text-xs font-black text-amber-600 uppercase">Tarjeta N° {idx + 1}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Título Principal</label>
                      <input
                        type="text"
                        value={card.title || ''}
                        onChange={(e) => updateAppCard('block2', idx, 'title', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: 20% OFF Gastronomía"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Badge Superior</label>
                      <input
                        type="text"
                        value={card.badge || ''}
                        onChange={(e) => updateAppCard('block2', idx, 'badge', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: 🍔 BENEFICIO / 🏨 HOTELES"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Subtítulo Corto (1 línea)</label>
                      <input
                        type="text"
                        value={card.subtitle || card.description || ''}
                        onChange={(e) => {
                          updateAppCard('block2', idx, 'subtitle', e.target.value);
                          updateAppCard('block2', idx, 'description', e.target.value);
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: Presentá tu QR en restaurantes adheridos."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Texto del Botón CTA</label>
                      <input
                        type="text"
                        value={card.ctaText || 'Ver Beneficio'}
                        onChange={(e) => updateAppCard('block2', idx, 'ctaText', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: Ver Locales / Reservar"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Enlace / URL de redirección</label>
                      <input
                        type="text"
                        value={card.url || ''}
                        onChange={(e) => updateAppCard('block2', idx, 'url', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Imagen de Fondo de la Tarjeta</label>
                      <AppCardImageUploader blockKey="block2" idx={idx} value={card.imageUrl || ''} />
                      {card.imageUrl ? (
                        <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-slate-200">
                          <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {(data.block2.cards || []).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay tarjetas agregadas. Haz clic en "Agregar Tarjeta" para crear una.
                </div>
              )}
            </div>
          </div>
        )}

        {/* LANDING AFILIADOS EDITORS */}
        {selectedLanding === 'afiliados' && activeTab === 'afi_hero' && data?.hero && (
          <div className="space-y-6">
            <h3 className="text-base font-extrabold text-purple-700">1. Hero Principal & Propuesta de Valor (Afiliados)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Badge Superior (Etiqueta)"
                value={data.hero.badge || ''}
                onChange={(val) => updateField('hero', 'badge', val)}
                placeholder="PROGRAMA DE AFILIADOS & EMBAJADORES"
              />
              <CMSInput
                label="Título Principal"
                value={data.hero.title || ''}
                onChange={(val) => updateField('hero', 'title', val)}
                placeholder="Monetizá tu audiencia..."
              />
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Subtítulo / Descripción"
                  value={data.hero.subtitle || ''}
                  onChange={(val) => updateField('hero', 'subtitle', val)}
                  rows={3}
                />
              </div>
              <CMSInput
                label="Texto Botón Primario"
                value={data.hero.primaryCtaText || ''}
                onChange={(val) => updateField('hero', 'primaryCtaText', val)}
              />
              <CMSInput
                label="Texto Botón Secundario"
                value={data.hero.secondaryCtaText || ''}
                onChange={(val) => updateField('hero', 'secondaryCtaText', val)}
              />
              <div className="md:col-span-2">
                <ImageUploaderInput
                  label="Imagen Destacada Hero"
                  section="hero"
                  field="heroImage"
                  value={data.hero.heroImage || ''}
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'afiliados' && activeTab === 'afi_cobro' && data?.payoutMethods && (
          <div className="space-y-6">
            <h3 className="text-base font-extrabold text-purple-700">2. Explicación Métodos de Cobro (MP / CBU)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Título Sección Cobros"
                value={data.payoutMethods.title || ''}
                onChange={(val) => updateField('payoutMethods', 'title', val)}
              />
              <CMSInput
                label="Subtítulo Transparencia"
                value={data.payoutMethods.subtitle || ''}
                onChange={(val) => updateField('payoutMethods', 'subtitle', val)}
              />
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 md:col-span-2 space-y-3">
                <span className="text-xs font-bold text-purple-900">Opción 1: Split Mercado Pago Instantáneo</span>
                <CMSInput
                  label="Título Opción MP"
                  value={data.payoutMethods.optionMpTitle || ''}
                  onChange={(val) => updateField('payoutMethods', 'optionMpTitle', val)}
                />
                <CMSTextarea
                  label="Descripción Split Inverso MP"
                  value={data.payoutMethods.optionMpDesc || ''}
                  onChange={(val) => updateField('payoutMethods', 'optionMpDesc', val)}
                  rows={2}
                />
              </div>
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 md:col-span-2 space-y-3">
                <span className="text-xs font-bold text-amber-900">Opción 2: CBU / CVU Liquidación Semanal</span>
                <CMSInput
                  label="Título Opción CBU"
                  value={data.payoutMethods.optionCbuTitle || ''}
                  onChange={(val) => updateField('payoutMethods', 'optionCbuTitle', val)}
                />
                <CMSTextarea
                  label="Descripción CBU Semanal"
                  value={data.payoutMethods.optionCbuDesc || ''}
                  onChange={(val) => updateField('payoutMethods', 'optionCbuDesc', val)}
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'afiliados' && activeTab === 'afi_faq' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-purple-700">3. Preguntas Frecuentes (FAQ)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las preguntas y respuestas para embajadores.</p>
              </div>
              <button
                onClick={() => addFaq()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-600 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-600 hover:text-white transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Pregunta
              </button>
            </div>

            <div className="space-y-4">
              {(data.faqs || []).map((faqItem: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative space-y-3">
                  <button
                    onClick={() => deleteFaq(idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="text-xs font-black text-purple-700">Pregunta N° {idx + 1}</div>
                  <FaqInput label="Pregunta" value={faqItem.q || ''} idx={idx} field="q" />
                  <FaqTextarea label="Respuesta" value={faqItem.a || ''} idx={idx} field="a" />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'afiliados' && activeTab === 'afi_footer' && (
          <div className="space-y-6">
            <h3 className="text-base font-extrabold text-[#0A2A5B]">4. Pie de Página (Footer) & Datos Legales Institucionales</h3>
            
            {/* Información Legal Corporativa */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-[#0A2A5B] uppercase tracking-wider">Información Legal & Razón Social</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CMSInput
                  label="Razón Social"
                  value={data.legales?.razonSocial || ''}
                  onChange={(val) => updateField('legales', 'razonSocial', val)}
                  placeholder="TravelApp s.a.s."
                />
                <CMSInput
                  label="CUIT"
                  value={data.legales?.cuit || ''}
                  onChange={(val) => updateField('legales', 'cuit', val)}
                  placeholder="30-71829340-9"
                />
                <CMSInput
                  label="Domicilio Legal"
                  value={data.legales?.domicilio || ''}
                  onChange={(val) => updateField('legales', 'domicilio', val)}
                  placeholder="San Miguel de Tucumán, Argentina"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSTextarea
                  label="Términos y Condiciones"
                  value={data.legales?.terminos || ''}
                  onChange={(val) => updateField('legales', 'terminos', val)}
                  rows={3}
                />
                <CMSTextarea
                  label="Política de Privacidad"
                  value={data.legales?.privacidad || ''}
                  onChange={(val) => updateField('legales', 'privacidad', val)}
                  rows={3}
                />
              </div>
            </div>

            {/* Redes Sociales & Contacto */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-[#0A2A5B] uppercase tracking-wider">Redes Sociales & Canales de Contacto</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CMSInput
                  label="WhatsApp Oficial"
                  value={data.redesSociales?.whatsapp || ''}
                  onChange={(val) => updateField('redesSociales', 'whatsapp', val)}
                  placeholder="https://wa.me/5493814188106"
                />
                <CMSInput
                  label="Instagram URL"
                  value={data.redesSociales?.instagram || ''}
                  onChange={(val) => updateField('redesSociales', 'instagram', val)}
                  placeholder="https://instagram.com/travelapp.ar"
                />
                <CMSInput
                  label="Facebook URL"
                  value={data.redesSociales?.facebook || ''}
                  onChange={(val) => updateField('redesSociales', 'facebook', val)}
                  placeholder="https://facebook.com/travelapp.ar"
                />
                <CMSInput
                  label="YouTube URL"
                  value={data.redesSociales?.youtube || ''}
                  onChange={(val) => updateField('redesSociales', 'youtube', val)}
                />
                <CMSInput
                  label="TikTok URL"
                  value={data.redesSociales?.tiktok || ''}
                  onChange={(val) => updateField('redesSociales', 'tiktok', val)}
                />
                <CMSInput
                  label="LinkedIn URL"
                  value={data.redesSociales?.linkedin || ''}
                  onChange={(val) => updateField('redesSociales', 'linkedin', val)}
                />
              </div>
            </div>

            {/* Sellos Legales & Fiscales */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-[#0A2A5B] uppercase tracking-wider">Sellos Fiscales & Registros (ARCA / Base de Datos)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSTextarea
                  label="Sello ARCA / AFIP (Código QR o Script)"
                  value={data.sellosLegales?.arcaQr || ''}
                  onChange={(val) => updateField('sellosLegales', 'arcaQr', val)}
                  rows={2}
                />
                <CMSTextarea
                  label="Sello Protección de Datos Personales"
                  value={data.sellosLegales?.baseDatosSello || ''}
                  onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)}
                  rows={2}
                />
              </div>
            </div>

            {/* Copyright & Marca */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Nombre de Marca Footer"
                value={data.footer?.brandText || ''}
                onChange={(val) => updateField('footer', 'brandText', val)}
              />
              <CMSInput
                label="Texto Copyright"
                value={data.footer?.copyrightText || ''}
                onChange={(val) => updateField('footer', 'copyrightText', val)}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
