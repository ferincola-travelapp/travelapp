"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { TravisOmnichannelWidget } from '@/components/shared/TravisOmnichannelWidget';
import { OtaPromoPushPop } from '@/components/ota/OtaPromoPushPop';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, where, doc, addDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { MUTariff, VehicleCategory } from '@/types/logistics';
import { ARGENTINA_PROVINCES } from '@/types/partners';
import { useTripAlertSound } from '@/hooks/useTripAlertSound';
import { stopTripAlert } from '@/lib/soundAlerts';
import { DEFAULT_REWARDS_CONFIG, subscribeGlobalRewardsConfig } from '@/lib/rewards-config';
import { GlobalRewardsConfig } from '@/types/rewards';

import { 
  ShieldCheck, 
  UserCheck, 
  Gift, 
  Award, 
  Zap, 
  Phone, 
  MessageCircle,
  ArrowRight, 
  Navigation, 
  Star, 
  CheckCircle,
  Menu,
  X,
  MapPin,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Clock,
  Check,
  CreditCard,
  Wallet,
  Coins,
  QrCode,
  Shield,
  Briefcase,
  ExternalLink,
  User,
  DollarSign,
  Car,
  FileText,
  Camera,
  Upload,
  AlertTriangle,
  Sparkles,
  Info
} from 'lucide-react';
import { GoogleAddressAutocomplete } from '@/components/travelcab/GoogleAddressAutocomplete';

// Importación dinámica para desactivar SSR y evitar errores de 'window is not defined' con Google Maps
const GoogleInteractiveMap = dynamic(
  () => import('@/components/travelcab/GoogleInteractiveMap').then((mod) => mod.GoogleInteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-vial-orange border-t-transparent mb-2"></div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cargando Mapa Satelital...</p>
      </div>
    )
  }
);

// Fallback estático
const LANDING_DATA_FALLBACK = {
  navigation: {
    logoText: "TravelCab",
    logoImage: "/assets/travelcab_original.svg",
    tagline: "Movilidad Premium",
    ctaText: "Pedir Ahora",
    ctaUrl: "https://wa.me/5493812000712?text=Hola!%20Quiero%20pedir%20un%20TravelCab%20ahora.",
    driverRegisterUrl: "#"
  },
  hero: {
    badge: "✓ EL ESTÁNDAR MÁS ALTO EN MOVILIDAD URBANA",
    title: "La Ciudad a tu Ritmo",
    subtitle: "Viajes urbanos premium con el soporte local más confiable. Disfruta de seguridad monitoreada 24/7, choferes profesionales certificados y la tarifa más justa del mercado.",
    stats: [
      { value: "10 min", label: "Espera promedio" },
      { value: "4.9 / 5", label: "Calificación promedio" },
      { value: "100%", label: "Viajes Monitoreados" }
    ],
    backgroundImage: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1920&q=80"
  },
  dispatcher: {
    badge: "DESPACHADOR WEB INTELIGENTE",
    title: "Solicita tu Viaje",
    subtitle: "Ingresa origen y destino para cotizar en tiempo real.",
    pickupLabel: "Punto de Origen",
    pickupPlaceholder: "¿Dónde te buscamos? (Ej. Av. Mitre 550)",
    dropoffLabel: "Punto de Destino",
    dropoffPlaceholder: "¿A dónde viajas? (Ej. Aeropuerto)",
    passengerNameLabel: "Nombre del Pasajero",
    passengerNamePlaceholder: "Escribe tu nombre y apellido",
    passengerPhoneLabel: "Número de Teléfono",
    passengerPhonePlaceholder: "Ej: +54 9 381 655-4433",
    paymentMethodLabel: "Método de Pago",
    paymentMethods: [
      { id: "Efectivo", label: "Efectivo al Conductor", icon: "Coins" },
      { id: "Billetera Virtual", label: "Billetera Virtual", icon: "Wallet" },
      { id: "Tarjeta", label: "Tarjeta de Débito / Crédito", icon: "CreditCard" }
    ],
    legalText: "* Las tarifas mostradas son estimadas y pueden variar de acuerdo con el tráfico real, horario y factores climáticos.",
    whatsappConfig: {
      phone: "5493812000712",
      messageTemplate: "¡Hola TravelCab! 🚕 Quiero solicitar un viaje desde la web:\n\n👤 *Pasajero:* {name}\n📞 *Teléfono:* {phone}\n🛣️ *Modalidad:* {modality}\n📍 *Origen:* {pickup}\n🏁 *Destino:* {dropoff}\n🚗 *Categoría:* {vehicle}\n💳 *Pago:* {payment}\n💵 *Tarifa Estimada:* {price}\n\n_Por favor, confírmenme la asignación del móvil y chofer._"
    }
  },
  passengers: {
    badge: "VIAJA SEGURO",
    title: "Confort, tranquilidad y puntualidad en cada trayecto",
    subtitle: "Hemos reinventado el servicio de traslados urbanos para brindarte la tranquilidad que te mereces cuando te trasladas por la ciudad.",
    benefits: [
      {
        id: "security",
        icon: "ShieldCheck",
        title: "Seguridad 24/7",
        description: "Monitoreo satelital activo en tiempo real. Tu recorrido está respaldado de principio a fin por nuestro centro de operaciones de alta tecnología."
      },
      {
        id: "drivers",
        icon: "UserCheck",
        title: "Conductores Calificados",
        description: "Olvídate de las sorpresas. Nuestro equipo está conformado únicamente por choferes profesionales certificados tras rigurosos análisis de antecedentes."
      },
      {
        id: "rewards",
        icon: "Gift",
        title: "Puntos Rewards",
        description: "Cada kilómetro recorrido te otorga puntos exclusivos dentro de nuestro ecosistema. Canjéalos por viajes bonificados o beneficios corporativos."
      }
    ]
  },
  drivers: {
    badge: "SISTEMA PREMIUM HÍBRIDO",
    title: "Modelo Híbrido: Membresía Fija o Comisión",
    subtitle: "Elige el esquema financiero que mejor se adapte a tu estilo de vida. Puedes abonar una membresía mensual fija y retener el 100% del valor de tus viajes, o trabajar bajo nuestro esquema tradicional de baja comisión por viaje.",
    benefits: [
      {
        icon: "Award",
        title: "Membresía Fija",
        description: "Retén el 100% de la facturación de tus viajes pagando una membresía plana mensual. Ideal para choferes de dedicación completa."
      },
      {
        icon: "Zap",
        title: "Esquema por Comisión",
        description: "Si prefieres trabajar de forma eventual, abona únicamente una comisión baja y transparente del 15% por cada viaje completado."
      },
      {
        icon: "Phone",
        title: "Soporte de la IA 'Travis'",
        description: "Soporte telefónico local y asistencia automatizada inteligente en WhatsApp a través de nuestra IA 'Travis' las 24 horas del día."
      }
    ]
  },
  faq: {
    title: "Preguntas Frecuentes",
    subtitle: "Todo lo que necesitas saber sobre el servicio de movilidad premium",
    items: [
      {
        audience: "passenger",
        question: "¿Cómo funciona el Despachador Web Inteligente?",
        answer: "El despachador te permite ingresar origen y destino, calcular una tarifa estimada instantáneamente y ver tu ruta en el mapa. Al pedir el viaje podés continuar como invitado (efectivo) o ingresar con tu cuenta para abonar con Mercado Pago o Puntos Rewards."
      },
      {
        audience: "driver",
        question: "¿Qué es el 'Modelo Híbrido' para conductores (Membresía vs. Comisión)?",
        answer: "Es un esquema flexible único. Como conductor, puedes optar por pagar una membresía mensual fija (retienes el 100% del valor de tus viajes) o bien operar bajo el esquema tradicional de comisión baja (15%) por cada traslado realizado."
      },
      {
        audience: "passenger",
        question: "¿Qué métodos de pago puedo utilizar?",
        answer: "Ofrecemos flexibilidad total. Como invitado podés abonar en efectivo directo al chofer; iniciando sesión con tu cuenta TravelApp también podés pagar con Mercado Pago / Tarjeta o canjear Puntos Rewards."
      },
      {
        audience: "passenger",
        question: "¿Cómo se garantiza la seguridad de mi viaje?",
        answer: "Todos nuestros traslados son monitoreados satelitalmente las 24 horas. Además, nuestros choferes pasan por rigurosas pruebas de antecedentes penales, análisis psicofísicos y validación de vehículos de forma presencial."
      },
      {
        audience: "driver",
        question: "¿Qué requisitos debe cumplir un vehículo para ser aceptado?",
        answer: "El vehículo debe ser modelo 2018 o posterior, contar con 4 puertas, aire acondicionado en óptimas condiciones, seguro comercial al día y pasar una revisión técnica e higiénica presencial en nuestras oficinas locales."
      },
      {
        audience: "passenger",
        question: "¿Ofrecen soluciones de movilidad corporativa para empresas?",
        answer: "Sí, contamos con un área dedicada para cuentas corporativas. Ofrecemos facturación mensual unificada, paneles de control para administrar traslados del personal y tarifas corporativas especiales."
      },
      {
        audience: "passenger",
        question: "¿Cómo funciona el sistema de Puntos Rewards?",
        answer: "Cada kilómetro recorrido en TravelCab acumula puntos automáticamente en tu perfil del ecosistema. Estos puntos pueden ser canjeados por descuentos en tus próximos viajes o beneficios exclusivos con partners."
      },
      {
        audience: "passenger",
        question: "¿Qué es el servicio de Auto Rural Compartido (ARC)?",
        answer: "ARC es una alternativa económica diseñada para viajes interurbanos o rurales. Permite a varios pasajeros compartir un mismo trayecto planificado, reduciendo el costo del viaje hasta en un 35% por persona."
      },
      {
        audience: "all",
        question: "¿Quién es la IA 'Travis' y cómo me ayuda?",
        answer: "Travis es nuestro asistente virtual inteligente disponible las 24 horas en WhatsApp. Está capacitado para cotizar tarifas, responder dudas sobre los servicios y guiar de forma rápida a los conductores en su proceso de registro."
      },
      {
        audience: "driver",
        question: "¿Los conductores reciben capacitación antes de empezar?",
        answer: "Absolutamente. Todos los choferes de la red completan de manera obligatoria una inducción integral en servicio de atención premium al cliente, normas de seguridad vial, conducción defensiva y uso del despachador digital."
      }
    ]
  },
  socials: {
    facebook: "https://facebook.com/travelcab",
    instagram: "https://instagram.com/travelcab.ar",
    messenger: "https://m.me/travelcab",
    travelappInstagram: "https://instagram.com/travelapp.ar",
    travelappFacebook: "https://facebook.com/travelapp.ar"
  },
  contact: {
    phone: "0810-220-0018",
    whatsapp: "https://wa.me/5493812000712"
  },
  footer: {
    brand: "TravelCab",
    description: "La red de movilidad urbana corporativa y particular más segura, confiable y moderna. Llevándote a donde necesitas estar, de la mejor manera posible.",
    copyright: "© 2026 TravelCab. Todos los derechos reservados. Una marca de TravelApp s.a.s.",
    legalLinks: [
      { text: "Términos de Uso", url: "#" },
      { text: "Política de Cookies", url: "#" },
      { text: "Política de Privacidad", url: "#" }
    ]
  }
};

const DEFAULT_CMS_DATA = {
  ...LANDING_DATA_FALLBACK,
  pasajeroHero: {
    badge: LANDING_DATA_FALLBACK.hero.badge,
    title: LANDING_DATA_FALLBACK.hero.title,
    subtitle: LANDING_DATA_FALLBACK.hero.subtitle,
    backgroundImage: LANDING_DATA_FALLBACK.hero.backgroundImage,
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
    whatsapp: "https://wa.me/5493812000712"
  },
  sellosLegales: {
    arcaQrUrl: "https://www.afip.gob.ar/images/f960/DATAWEB.jpg",
    baseDatosSelloUrl: "https://www.argentina.gob.ar/sites/default/files/aaip-logo-sello.png"
  },
  faq: {
    title: "Preguntas Frecuentes",
    subtitle: "Todo lo que necesitas saber sobre el servicio de movilidad premium",
    items: LANDING_DATA_FALLBACK.faq.items
  },
  legales: {
    quienesSomos: "### Quiénes Somos en TravelCab\n\nSomos una empresa de movilidad y transporte premium nacida con la misión de conectar a personas con choferes altamente calificados de forma segura, puntual y transparente.\n\nContamos con un soporte local dedicado las 24 horas y soporte inteligente de IA a través de Travis en WhatsApp. Creemos en esquemas justos para nuestros conductores asociados a través de nuestro modelo híbrido de comisión o membresía fija y en premiar la fidelidad de nuestros usuarios con el sistema Rewards.",
    terminosCondiciones: "### Términos y Condiciones Generales de Uso de TravelCab\n\nBienvenido a TravelCab. Al acceder y utilizar nuestros servicios de transporte y movilidad, usted acepta de manera incondicional estar sujeto a los siguientes términos y condiciones de uso:\n\n1. **Naturaleza del Servicio:** TravelCab es una plataforma de tecnología de movilidad premium que conecta a pasajeros con choferes profesionales locales.\n2. **Uso de la Plataforma:** El usuario se compromete a hacer uso de los traslados y el despachador web únicamente con fines lícitos. Queda terminantemente prohibido cualquier tipo de conducta que atente contra la seguridad del chofer o la flota.\n3. **Tarifas y Estimaciones:** Las tarifas visualizadas en el Despachador Inteligente son estimaciones y pueden ser modificadas por tráfico congestionado, horarios especiales o condiciones climáticas adversas.\n4. **Monitoreo Satelital:** Con fines de seguridad, todos los trayectos son grabados y geolocalizados en tiempo real por nuestra central operativa de seguridad 24/7.",
    politicasPrivacidad: "### Políticas de Privacidad y Protección de Datos Personales\n\nEn TravelCab estamos plenamente comprometidos con el resguardo, confidencialidad y protección de los datos de nuestros pasajeros y conductores. Al registrarse en la plataforma, usted acepta el tratamiento de su información conforme a lo siguiente:\n\n1. **Recolección de Información:** Al registrarse como pasajero o conductor, almacenamos sus datos personales identificativos (Nombre, Apellido, Email, Teléfono, Ubicación y en el caso de conductores, licencias y habilitaciones oficiales).\n2. **Uso del Perfil y Gamificación:** Los datos provistos por los pasajeros se utilizan para habilitar su cuenta y el programa de fidelización Rewards, otorgando el incentivo inicial de 300 puntos más 150 puntos extra al completar su fotografía de perfil.\n3. **Uso de las Imágenes:** La foto de perfil cargada se almacena únicamente con fines de verificación de identidad del pasajero para asegurar traslados tranquilos para toda la flota.\n4. **No divulgación:** TravelCab garantiza que en ningún caso comercializará o transferirá sus datos de carácter personal a terceras empresas sin su expreso consentimiento escrito previo."
  }
};

const IconMap: Record<string, any> = {
  ShieldCheck: ShieldCheck,
  UserCheck: UserCheck,
  Gift: Gift,
  Award: Award,
  Zap: Zap,
  Phone: Phone,
  Coins: Coins,
  Wallet: Wallet,
  CreditCard: CreditCard
};

const DEFAULT_MU_TARIFFS_FALLBACK: MUTariff[] = [
  {
    id: 'mu-standard-fallback',
    name: 'TravelCab Standard',
    category: 'estandar',
    baseFare: 580,
    pricePerKm: 480,
    minimumFare: 2800,
    travelMinutePrice: 120,
    waitMinutePrice: 180,
    courtesyTimeMinutes: 5,
    iva: 21,
    iibb: 3.5,
    taxMunicipal: 1.5,
    electronicPaymentFee: 5,
    commissionRate: 15,
    weeklyMembership: 5000,
    isActive: true
  },
  {
    id: 'mu-premium-fallback',
    name: 'TravelCab Premium',
    category: 'premium',
    baseFare: 850,
    pricePerKm: 680,
    minimumFare: 3800,
    travelMinutePrice: 160,
    waitMinutePrice: 200,
    courtesyTimeMinutes: 5,
    iva: 21,
    iibb: 3.5,
    taxMunicipal: 1.5,
    electronicPaymentFee: 5,
    commissionRate: 15,
    weeklyMembership: 5000,
    isActive: true
  }
];

const DEFAULT_ARC_TARIFFS_FALLBACK: any[] = [
  {
    id: 'arc-standard-fallback',
    name: 'Auto Rural Compartido Standard',
    category: 'estandar',
    iva: 21,
    iibb: 3.5,
    taxMunicipal: 1.5,
    electronicPaymentFee: 5,
    commissionRate: 15,
    weeklyMembership: 5000,
    isActive: true,
    type: 'arc',
    routes: [
      {
        id: 'fallback-route-1',
        mainOrigin: 'Tucumán',
        mainDestination: 'Concepción',
        pricePerSeat: 4500
      },
      {
        id: 'fallback-route-2',
        mainOrigin: 'Tucumán',
        mainDestination: 'Famaillá',
        pricePerSeat: 3000
      },
      {
        id: 'fallback-route-3',
        mainOrigin: 'Tucumán',
        mainDestination: 'Monteros',
        pricePerSeat: 3800
      }
    ]
  },
  {
    id: 'arc-premium-fallback',
    name: 'Auto Rural Compartido Premium',
    category: 'premium',
    iva: 21,
    iibb: 3.5,
    taxMunicipal: 1.5,
    electronicPaymentFee: 5,
    commissionRate: 15,
    weeklyMembership: 5000,
    isActive: true,
    type: 'arc',
    routes: [
      {
        id: 'fallback-route-p1',
        mainOrigin: 'Tucumán',
        mainDestination: 'Concepción',
        pricePerSeat: 6000
      },
      {
        id: 'fallback-route-p2',
        mainOrigin: 'Tucumán',
        mainDestination: 'Famaillá',
        pricePerSeat: 4000
      },
      {
        id: 'fallback-route-p3',
        mainOrigin: 'Tucumán',
        mainDestination: 'Monteros',
        pricePerSeat: 5000
      }
    ]
  }
];


const RenderLegalSeal = ({ content, alt }: { content?: string; alt: string }) => {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('<') || trimmed.includes('<script')) {
    return (
      <div 
        className="flex items-center justify-center min-h-[40px] max-h-16 overflow-hidden [&_img]:max-h-10 [&_img]:w-auto"
        dangerouslySetInnerHTML={{ __html: trimmed }} 
      />
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-950 px-3 py-1.5 hover:border-slate-800 transition-colors">
      <img src={trimmed} alt={alt} className="h-6 w-auto object-contain" />
      <span className="text-[8px] font-bold text-slate-400 uppercase">{alt}</span>
    </div>
  );
};

export default function TravelCabLanding({ initialCms }: { initialCms?: any }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Estados del Despachador Web (Travis original e intacto)
  const [dispatcherStep, setDispatcherStep] = useState<1 | 2 | 3>(1);
  const [modality, setModality] = useState<'MU' | 'ARC' | 'TRANSFER'>('MU');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  
  // Real routing outputs from Google Maps
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Errores de Validación del Despachador
  const [formErrors, setFormErrors] = useState<{
    name?: boolean;
    phone?: boolean;
    pickup?: boolean;
    dropoff?: boolean;
  }>({});

  // Categoría de Vehículo Seleccionada para el Paso 3
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState('');
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    paymentUrl: string;
    tripId: string;
    status: 'pending' | 'paid';
    amount: number;
    vehicle: any;
  }>({
    isOpen: false,
    paymentUrl: '',
    tripId: '',
    status: 'pending',
    amount: 0,
    vehicle: null
  });
  
  // Nuevos Estados para Despacho y Checkout Inteligente (Invitado vs Registrado)
  const [bookingType, setBookingType] = useState<'guest' | 'registered'>('guest');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [serviceCriteriaModal, setServiceCriteriaModal] = useState<any | null>(null);
  const [driverReqsModalOpen, setDriverReqsModalOpen] = useState(false);

  const [searchingDriverModal, setSearchingDriverModal] = useState<{
    isOpen: boolean;
    tripId: string;
    status: 'searching' | 'payment_required' | 'driver_assigned' | 'failed';
    driverInfo: any;
    amount: number;
    paymentUrl: string;
  }>({
    isOpen: false,
    tripId: '',
    status: 'searching',
    driverInfo: null,
    amount: 0,
    paymentUrl: ''
  });

  // Alerta de sonido y vibración controlada (detención automática para no quedar tildado)
  useTripAlertSound(searchingDriverModal.isOpen && searchingDriverModal.status === 'searching');

  // Firestore dynamic state (Intacto)
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [activeTariffs, setActiveTariffs] = useState<any[]>([]);
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(true);

  // --- ESTADOS DE CMS Y REGISTRO ---
  const [cmsData, setCmsData] = useState<any>(initialCms ? { ...DEFAULT_CMS_DATA, ...initialCms } : DEFAULT_CMS_DATA);
  const [viewMode, setViewMode] = useState<'passenger' | 'driver'>('passenger');

  // Modales
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: 'terms' | 'privacy' | 'about' }>({ isOpen: false, type: 'terms' });
  const [registerModal, setRegisterModal] = useState<{ isOpen: boolean; role: 'passenger' | 'driver' }>({ isOpen: false, role: 'passenger' });
  const [nosotrosDropdownOpen, setNosotrosDropdownOpen] = useState(false);
  const [institutionalModal, setInstitutionalModal] = useState<'vision' | 'mision' | 'valores' | null>(null);
  const [showQuoteMap, setShowQuoteMap] = useState(false);
  const [requestTripModalOpen, setRequestTripModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Flujo Registro Pasajero (Gamificado con Fotos/Cámara)
  const [pRegStep, setPRegStep] = useState<1 | 2 | 3>(1);
  const [pRegData, setPRegData] = useState({ firstName: '', lastName: '', email: '', phone: '', photoUrl: '' });
  const [pRegId, setPRegId] = useState('');
  const [pPoints, setPPoints] = useState(0);
  const [rewardsConfig, setRewardsConfig] = useState<GlobalRewardsConfig>(DEFAULT_REWARDS_CONFIG);

  // Sincronizar política global de rewards
  useEffect(() => {
    const unsub = subscribeGlobalRewardsConfig((cfg) => {
      setRewardsConfig(cfg);
    });
    return () => unsub();
  }, []);

  // Flujo Registro Conductor (Idéntico a HR con validación estricta y uploader)
  const [dRegStep, setDRegStep] = useState(0);
  const [dRegSubmitted, setDRegSubmitted] = useState(false);
  const [dRegData, setDRegData] = useState({
    firstName: '', lastName: '', dob: '', email: '', phone: '',
    street: '', streetNumber: '', floor: '', apartment: '',
    city: '', province: '', postalCode: '',
    taxType: 'CUIL' as 'CUIL' | 'CUIT', taxIdNumber: '', registrationType: '', arcaConstanciaUrl: '',
    cbuCvu: '', alias: '', accountHolder: '',
    make: '', model: '', year: '', color: '', licensePlate: '',
    hasSutrappa: false, sutrappaLicense: '', sutrappaHolder: '',
    cedulaFrente: '', cedulaDorso: '', fotoVehiculo: '', rtoDoc: '', seguroComercial: '',
    driverLicense: '', criminalRecord: '', conductCert: '', healthCert: '',
    referredBySupervisor: '',
  });

  // Detectar automáticamente el código o link del Supervisor/Afiliado (?ref= o ?supervisor=)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('supervisor') || params.get('spv');
      if (refCode) {
        setDRegData(prev => ({ ...prev, referredBySupervisor: refCode }));
      }
    }
  }, []);

  // Escuchar CMS, categorías y tarifas activas en tiempo real
  useEffect(() => {
    // Forzar que el diseño global oculte la barra de navegación y barra lateral del Dashboard
    document.body.classList.add("shell-free");
    return () => {
      document.body.classList.remove("shell-free");
    };
  }, []);

  useEffect(() => {
    // 1. Escucha reactiva en tiempo real al CMS de Firestore
    const unsubCms = onSnapshot(doc(db, 'cms', 'landing_travelcab'), (snap) => {
      if (snap.exists()) {
        setCmsData({
          ...DEFAULT_CMS_DATA,
          ...snap.data()
        });
      }
    }, (err) => {
      console.log('Error listening to CMS data:', err.message);
    });

    // 2. Categorías
    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as VehicleCategory);
      setCategories(list);
    }, (error) => {
      console.log('Error loading categories on landing page:', error.message);
    });

    // 3. Tarifarios Activos (tanto MU como ARC)
    const qTariffs = query(collection(db, 'tariffs'), where('isActive', '==', true));
    const unsubTariffs = onSnapshot(qTariffs, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
      setActiveTariffs(list);
      setIsLoadingTariffs(false);
    }, (error) => {
      console.log('Error loading active tariffs on landing:', error.message);
      setIsLoadingTariffs(false);
    });

    return () => {
      unsubCms();
      unsubCats();
      unsubTariffs();
    };
  }, []);

  const currentTariffs = useMemo(() => {
    const typeFilter = modality === 'ARC' ? 'arc' : 'mu';
    const filtered = activeTariffs.filter((t: any) => t.type === typeFilter && !t.isFreeTripOnly);
    if (filtered.length > 0) return filtered;
    return modality === 'ARC' ? DEFAULT_ARC_TARIFFS_FALLBACK : DEFAULT_MU_TARIFFS_FALLBACK;
  }, [activeTariffs, modality]);

  // Lista de vehículos dinámica basada en tarifarios de Firestore (Intacta)
  const vehiclesList = useMemo(() => {
    const list = currentTariffs;
    
    return list.map((tariff) => {
      const categoryObj = categories.find(c => c.id === tariff.category);
      
      let name = '';
      let description = '';
      let eta = '3 - 5 min';
      
      if (categoryObj) {
        name = categoryObj.name;
        description = categoryObj.description;
        eta = categoryObj.eta;
      } else {
        if (tariff.category === 'vip') {
          name = modality === 'ARC' ? 'Auto Compartido VIP' : 'TravelCab VIP';
          description = modality === 'ARC'
            ? 'Servicio de auto rural compartido de alta gama con chofer profesional.'
            : 'Vehículo de alta gama con chofer profesional y máximo confort corporativo.';
          eta = '3 - 5 min';
        } else if (tariff.category === 'premium') {
          name = modality === 'ARC' ? 'Auto Compartido Premium' : 'TravelCab Premium';
          description = modality === 'ARC'
            ? 'Auto de gama alta compartido, máximo confort y espacio extra.'
            : 'Auto de gama alta, máximo confort, espacio extra y chofer bilingüe.';
          eta = '2 - 4 min';
        } else {
          name = modality === 'ARC' ? 'Auto Compartido Standard' : 'TravelCab Standard';
          description = modality === 'ARC'
            ? 'El clásico servicio rural de auto compartido, cómodo y súper económico.'
            : 'Sedán moderno, climatizado, ideal para tus traslados diarios de forma rápida.';
          eta = '4 - 6 min';
        }
      }
      
      return {
        id: tariff.id,
        name: name,
        description: description,
        eta: eta,
        icon: categoryObj?.icon || '',
        category: tariff.category,
        baseRate: tariff.baseFare,
        multiplier: tariff.category === 'premium' ? 1.45 : tariff.category === 'vip' ? 1.6 : 1.0,
        tariff: tariff
      };
    });
  }, [currentTariffs, categories, modality]);

  // Calcular ruta mediante Google Maps Directions API (Intacta)
  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) {
      setDistanceKm(0);
      setDurationMin(0);
      return;
    }

    if (typeof window !== "undefined" && window.google) {
      setIsCalculatingRoute(true);
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: pickupCoords,
          destination: dropoffCoords,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          setIsCalculatingRoute(false);
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            const leg = result.routes[0].legs[0];
            const km = (leg.distance?.value || 0) / 1000;
            const mins = Math.round((leg.duration?.value || 0) / 60);
            
            setDistanceKm(Number(km.toFixed(1)));
            setDurationMin(mins);
          } else {
            console.error("Error calculando ruta en landing:", status);
          }
        }
      );
    }
  }, [pickupCoords, dropoffCoords]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const getCalculatedPriceForVehicle = (vehicle: any) => {
    let distance = distanceKm;
    let duration = durationMin;
    
    if (distance === 0) {
      const charsCount = (pickupLocation.length || 10) + (dropoffLocation.length || 10);
      distance = Math.max(5, (charsCount * 0.35));
      duration = Math.round(distance * 1.5);
    }

    const tariff = vehicle.tariff || (modality === 'ARC' ? DEFAULT_ARC_TARIFFS_FALLBACK[0] : DEFAULT_MU_TARIFFS_FALLBACK[0]);
    
    let basePricePerSeat = 0;
    
    if (modality === 'ARC') {
      // Intentar buscar una ruta que coincida en el tarifario de ARC (directa o inversa si es bidireccional)
      let arcRoutePrice: number | null = null;
      if (tariff.routes && Array.isArray(tariff.routes)) {
        const originLower = pickupLocation.toLowerCase().trim();
        const destLower = dropoffLocation.toLowerCase().trim();
        
        const matchedRoute = tariff.routes.find((r: any) => {
          const routeOrigin = (r.mainOrigin || '').toLowerCase().trim();
          const routeDest = (r.mainDestination || '').toLowerCase().trim();
          
          if (!routeOrigin || !routeDest) return false;
          
          const isDirect = (originLower.includes(routeOrigin) || routeOrigin.includes(originLower)) &&
                           (destLower.includes(routeDest) || routeDest.includes(destLower));
                           
          const isInverse = r.isBidirectional !== false &&
                            (originLower.includes(routeDest) || routeDest.includes(originLower)) &&
                            (destLower.includes(routeOrigin) || routeOrigin.includes(destLower));
                            
          return isDirect || isInverse;
        });
        
        if (matchedRoute) {
          arcRoutePrice = matchedRoute.pricePerSeat;
        }
      }
      
      if (arcRoutePrice !== null) {
        basePricePerSeat = arcRoutePrice;
      } else {
        // Fallback a cálculo basado en distancia si no hay coincidencia exacta de ruta
        const baseFare = tariff.baseFare || 800;
        const pricePerKm = tariff.pricePerKm || 380;
        const travelMinutePrice = tariff.travelMinutePrice || 100;
        basePricePerSeat = baseFare + (distance * pricePerKm) + (duration * travelMinutePrice);
      }
      
      basePricePerSeat = basePricePerSeat * selectedSeats;
    } else {
      // Modo MU (Movilidad Urbana)
      const baseFare = tariff.baseFare || 1200;
      const pricePerKm = tariff.pricePerKm || 480;
      const travelMinutePrice = tariff.travelMinutePrice || 120;
      const minimumFare = tariff.minimumFare || 2800;
      
      const calculated = baseFare + (distance * pricePerKm) + (duration * travelMinutePrice);
      basePricePerSeat = Math.max(minimumFare, Math.round(calculated));
    }
    
    // APLICAR TARIFA ESPECIAL (DÍAS Y HORARIOS ESPECÍFICOS) SOBRE EL CÁLCULO TOTAL DEL VIAJE
    if (tariff.specialRates && Array.isArray(tariff.specialRates) && basePricePerSeat > 0) {
      const DAYS_MAP = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const now = new Date();
      const currentDay = DAYS_MAP[now.getDay()];
      const currentMin = now.getHours() * 60 + now.getMinutes();
      
      for (const sr of tariff.specialRates) {
        const days = sr.daysOfWeek || [];
        const dayMatches = days.includes('Todos los días') || days.includes(currentDay);
        if (!dayMatches) continue;
        
        const [startH, startM] = (sr.startTime || '00:00').split(':').map(Number);
        const [endH, endM] = (sr.endTime || '23:59').split(':').map(Number);
        const sMin = (startH || 0) * 60 + (startM || 0);
        const eMin = (endH || 23) * 60 + (endM || 59);
        
        let matches = false;
        if (sMin <= eMin) {
          matches = currentMin >= sMin && currentMin <= eMin;
        } else {
          matches = currentMin >= sMin || currentMin <= eMin;
        }
        
        if (matches && sr.percentageModifier) {
          basePricePerSeat = Math.round(basePricePerSeat * (1 + sr.percentageModifier / 100));
          break;
        }
      }
    }
    
    // Si el pago es digital/tarjeta, aplicar recargo de pasarela si está configurado
    if (paymentMethod === 'Tarjeta' || paymentMethod === 'Billetera Virtual') {
      const cardFeePct = tariff.electronicPaymentFee !== undefined ? tariff.electronicPaymentFee : 5;
      basePricePerSeat = basePricePerSeat * (1 + cardFeePct / 100);
    }
    
    return Math.round(basePricePerSeat);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleCalculateRate = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof formErrors = {};
    if (!pickupLocation.trim()) errors.pickup = true;
    if (!dropoffLocation.trim()) errors.dropoff = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    const defaultVehicle = categories[0] || { id: 'estandar', name: 'TravelCab Standard', baseFareMultiplier: 1 };
    setSelectedVehicle(defaultVehicle);
    const priceAmount = getCalculatedPriceForVehicle(defaultVehicle);
    setCalculatedPrice(formatCurrency(priceAmount));
    setShowQuoteMap(true);
  };

  const handleSelectVehicle = async (vehicle: any) => {
    setSelectedVehicle(vehicle);
    const priceAmount = getCalculatedPriceForVehicle(vehicle);
    const formattedPrice = formatCurrency(priceAmount);
    setCalculatedPrice(formattedPrice);

    setLoadingPayment(true);
    try {
      // 1. Crear el viaje en la base de datos de Firestore
      const tripsRef = collection(db, 'trips');
      const tripDocRef = await addDoc(tripsRef, {
        passengerName,
        passengerPhone,
        origin: pickupLocation,
        destination: dropoffLocation,
        originCoords: pickupCoords || { lat: -34.6037, lng: -58.3816 },
        destinationCoords: dropoffCoords || { lat: -34.6037, lng: -58.3816 },
        status: 'Buscando Chofer',
        price: priceAmount,
        distanceKm: distanceKm || 8.5,
        durationMinutes: durationMin || 15,
        serviceType: modality,
        seats: modality === 'ARC' ? selectedSeats : 1,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'Efectivo' ? 'pending' : 'awaiting_payment',
        category: vehicle.id || 'estandar',
        createdAt: Date.now(),
        source: 'landing_page_booking'
      });

      // 2. Abrir el modal inteligente de búsqueda
      setSearchingDriverModal({
        isOpen: true,
        tripId: tripDocRef.id,
        status: 'searching',
        driverInfo: null,
        amount: priceAmount,
        paymentUrl: ''
      });

      // 3. Escuchar el estado de asignación de chofer en tiempo real
      let currentPaymentUrlGenerated = false;
      const unsub = onSnapshot(doc(db, 'trips', tripDocRef.id), async (snap) => {
        if (snap.exists()) {
          const tripData = snap.data();

          // A) Si un conductor acepta el viaje
          if (tripData.status === 'accepted' || tripData.driverId) {
            
            // Si el método es Mercado Pago y aún está pendiente de pago
            if (tripData.paymentMethod === 'Mercado Pago' && tripData.paymentStatus !== 'paid') {
              if (tripData.paymentStatus === 'failed') {
                setSearchingDriverModal(prev => ({ ...prev, status: 'failed' }));
                unsub();
                return;
              }

              // Generar link de Mercado Pago para el cobro si no se ha generado
              if (!currentPaymentUrlGenerated) {
                currentPaymentUrlGenerated = true;
                try {
                  const response = await fetch('/api/checkout/preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      amount: priceAmount,
                      description: `Viaje TravelCab de ${pickupLocation} a ${dropoffLocation}`,
                      passengerEmail: 'cliente_web@travelapp.ar',
                      tripId: tripDocRef.id
                    })
                  });
                  const data = await response.json();
                  if (data.success && data.initPoint) {
                    setSearchingDriverModal(prev => ({
                      ...prev,
                      status: 'payment_required',
                      paymentUrl: data.initPoint,
                      driverInfo: tripData
                    }));
                  }
                } catch (err) {
                  console.error('Error generando preferencia de pago:', err);
                }
              }
            } else {
              // Si ya está pagado o es en Efectivo, confirmar viaje y asignar conductor
              setSearchingDriverModal(prev => ({
                ...prev,
                status: 'driver_assigned',
                driverInfo: tripData
              }));

              // Formatear patente (dominio) tapando los 3 primeros caracteres
              const rawPlate = tripData.vehiclePlate || 'AF123JK';
              const maskedPlate = 'XXX ' + rawPlate.substring(Math.max(3, rawPlate.length - 3));

              // Abrir confirmación por WhatsApp automáticamente enviada al Pasajero (Solicitante)
              const modalityText = modality === 'MU' ? 'Movilidad Urbana (Privado)' : 'Auto Rural Compartido (ARC)';
              const whatsappMsg = `¡Tu viaje en TravelCab está confirmado! 🚖\n\n` +
                `👤 *Pasajero:* ${tripData.passengerName}\n` +
                `🛣️ *Servicio:* ${modalityText}\n` +
                `📍 *Origen:* ${tripData.origin}\n` +
                `🏁 *Destino:* ${tripData.destination}\n\n` +
                `🚘 *Vehículo:* ${tripData.vehicleModel || 'Fiat Cronos'} (Gris)\n` +
                `🔢 *Patente:* ${maskedPlate}\n` +
                `👨‍✈️ *Conductor:* ${tripData.driverName} (⭐ ${tripData.driverRating || '4.8'})\n` +
                `💵 *Tarifa:* ${formatCurrency(tripData.price)} (${tripData.paymentMethod})\n\n` +
                `_¡Tu conductor ya está en camino!_`;

              const cleanPhone = tripData.passengerPhone.replace(/[^0-9]/g, '');
              const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`;
              window.open(whatsappUrl, '_blank');

              setDispatcherStep(3);
              unsub();
            }
          }

          // B) Si el estado de pago cambia a acreditado
          if (tripData.paymentStatus === 'paid' && (tripData.status === 'accepted' || tripData.driverId)) {
            setSearchingDriverModal(prev => ({
              ...prev,
              status: 'driver_assigned',
              driverInfo: tripData
            }));
          }

          // C) Si el pago falla
          if (tripData.paymentStatus === 'failed') {
            setSearchingDriverModal(prev => ({
              ...prev,
              status: 'failed'
            }));
            unsub();
          }
        }
      });

    } catch (err: any) {
      console.error('Error al procesar el viaje en la landing:', err);
      alert('Hubo un error al guardar tu viaje: ' + err.message);
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleResetDispatcher = () => {
    setDispatcherStep(1);
    setPassengerName('');
    setPassengerPhone('');
    setPickupLocation('');
    setDropoffLocation('');
    setPaymentMethod('Efectivo');
    setSelectedVehicle(null);
    setCalculatedPrice('');
    setFormErrors({});
  };

  // --- REGISTRO PASAJERO ---
  const handlePassengerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pRegData.firstName || !pRegData.lastName || !pRegData.email || !pRegData.phone) {
      alert("Por favor completa todos los campos requeridos.");
      return;
    }

    try {
      const welcomeBonus = rewardsConfig.welcomePointsBonus || 20;
      const passengersRef = collection(db, 'passengers');
      const docRef = await addDoc(passengersRef, {
        firstName: pRegData.firstName,
        lastName: pRegData.lastName,
        email: pRegData.email,
        phone: pRegData.phone,
        photoUrl: '',
        points: welcomeBonus,
        createdAt: Date.now(),
        status: 'Activo'
      });
      setPRegId(docRef.id);
      setPPoints(welcomeBonus);
      setPRegStep(2);
    } catch (err: any) {
      alert("Error al registrar: " + err.message);
    }
  };

  const handleUploadPhotoData = (base64: string) => {
    setPRegData((prev) => ({ ...prev, photoUrl: base64 }));
  };

  const handleCompletePassengerPhoto = async () => {
    if (!pRegId) return;
    if (!pRegData.photoUrl) {
      alert(`Por favor carga tu foto de perfil para ganar los +${rewardsConfig.profilePhotoBonusPoints || 10} puntos extra.`);
      return;
    }
    try {
      const welcomeBonus = rewardsConfig.welcomePointsBonus || 20;
      const photoBonus = rewardsConfig.profilePhotoBonusPoints || 10;
      const totalPoints = welcomeBonus + photoBonus;
      const docRef = doc(db, 'passengers', pRegId);
      await setDoc(docRef, {
        photoUrl: pRegData.photoUrl,
        points: totalPoints,
        hasReceivedPhotoBonus: true,
      }, { merge: true });

      setPPoints(totalPoints);
      setPRegStep(3);
    } catch (err: any) {
      alert("Error al actualizar foto: " + err.message);
    }
  };

  // --- REGISTRO CONDUCTOR CON VALIDACIÓN ESTRICTA ---
  const isDriverStepValid = () => {
    if (dRegStep === 0) {
      return (
        dRegData.firstName.trim() !== '' &&
        dRegData.lastName.trim() !== '' &&
        dRegData.dob.trim() !== '' &&
        isAdult(dRegData.dob) &&
        dRegData.email.trim() !== '' &&
        dRegData.phone.trim() !== '' &&
        dRegData.street.trim() !== '' &&
        dRegData.streetNumber.trim() !== '' &&
        dRegData.postalCode.trim() !== '' &&
        dRegData.city.trim() !== '' &&
        dRegData.province.trim() !== ''
      );
    }
    if (dRegStep === 1) {
      const basicTaxValid = dRegData.taxIdNumber.replace(/\D/g, '').length === 11;
      const cuitConditionalValid = dRegData.taxType === 'CUIL' || (dRegData.registrationType !== '' && dRegData.arcaConstanciaUrl !== '');
      return (
        basicTaxValid &&
        cuitConditionalValid &&
        dRegData.cbuCvu.length === 22 &&
        dRegData.alias.trim() !== '' &&
        dRegData.accountHolder.trim() !== ''
      );
    }
    if (dRegStep === 2) {
      const basicVehicleValid = 
        dRegData.make.trim() !== '' &&
        dRegData.model.trim() !== '' &&
        dRegData.year.trim() !== '' &&
        dRegData.color.trim() !== '' &&
        dRegData.licensePlate.trim() !== '' &&
        dRegData.cedulaFrente !== '' &&
        dRegData.cedulaDorso !== '' &&
        dRegData.fotoVehiculo !== '' &&
        dRegData.rtoDoc !== '' &&
        dRegData.seguroComercial !== '';
      
      const sutrappaValid = !dRegData.hasSutrappa || (dRegData.sutrappaLicense.trim() !== '' && dRegData.sutrappaHolder.trim() !== '');
      return basicVehicleValid && sutrappaValid;
    }
    if (dRegStep === 3) {
      return (
        dRegData.driverLicense !== '' &&
        dRegData.criminalRecord !== ''
      );
    }
    return false;
  };

  const handleDriverNext = () => {
    if (!isDriverStepValid()) {
      alert("Por favor completa todos los campos requeridos y adjunta todos los documentos correspondientes al paso actual.");
      return;
    }
    if (dRegStep < 3) {
      setDRegStep(dRegStep + 1);
    } else {
      saveDriverToFirestore();
    }
  };

  const saveDriverToFirestore = async () => {
    try {
      const partnersRef = collection(db, 'partners');
      await addDoc(partnersRef, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        firstName: dRegData.firstName,
        lastName: dRegData.lastName,
        dob: dRegData.dob,
        email: dRegData.email,
        phone: dRegData.phone,
        photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${dRegData.firstName}`,
        address: {
          street: dRegData.street,
          number: dRegData.streetNumber,
          floor: dRegData.floor,
          apartment: dRegData.apartment,
          city: dRegData.city,
          province: dRegData.province,
          postalCode: dRegData.postalCode
        },
        taxInfo: {
          taxIdType: dRegData.taxType,
          taxIdNumber: dRegData.taxIdNumber,
          registrationType: dRegData.registrationType || undefined,
          arcaConstanciaUrl: dRegData.arcaConstanciaUrl || undefined
        },
        bankInfo: {
          cbuCvu: dRegData.cbuCvu,
          alias: dRegData.alias,
          accountHolder: dRegData.accountHolder
        },
        vehicle: {
          id: `VH-${Date.now()}`,
          make: dRegData.make,
          model: dRegData.model,
          year: parseInt(dRegData.year) || 2020,
          color: dRegData.color,
          licensePlate: dRegData.licensePlate,
          sutrappa: {
            isActive: dRegData.hasSutrappa,
            licenseNumber: dRegData.hasSutrappa ? dRegData.sutrappaLicense : undefined,
            holder: dRegData.hasSutrappa ? dRegData.sutrappaHolder : undefined
          }
        },
        cedulaFrenteUrl: dRegData.cedulaFrente,
        cedulaDorsoUrl: dRegData.cedulaDorso,
        fotoVehiculoUrl: dRegData.fotoVehiculo,
        rtoDocUrl: dRegData.rtoDoc,
        seguroComercialUrl: dRegData.seguroComercial,
        driverLicenseUrl: dRegData.driverLicense,
        criminalRecordUrl: dRegData.criminalRecord,
        conductCertificateUrl: dRegData.conductCert,
        healthCertificateUrl: dRegData.healthCert,
        status: 'En Revisión',
        wallet: {
          cashBalance: 0,
          pointsBalance: 0,
          transactions: []
        }
      });
      setDRegSubmitted(true);
    } catch (err: any) {
      alert("Error al registrar socio conductor: " + err.message);
    }
  };

  const handleFileConversion = (file: File, field: keyof typeof dRegData) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setDRegData((prev) => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const isAdult = (dob: string): boolean => {
    if (!dob) return false;
    const today = new Date();
    const birth = new Date(dob);
    const age = today.getFullYear() - birth.getFullYear() - (
      today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0
    );
    return age >= 18;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-tech-blue font-sans selection:bg-vial-orange/20 selection:text-tech-blue overflow-x-hidden animate-fadeIn">
      <span data-shell-free="true" className="hidden" />
      
      {/* ---------------- HEADER INSTITUCIONAL (ESTILO EXPERIENCE) ---------------- */}
      <header className="sticky top-0 z-50 w-full bg-[#0a2a5b]/95 backdrop-blur-md text-white border-b border-white/10 transition-all">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-6">
            {/* Logo TravelCab Institucional Blanco */}
            <a href="/landing/travelcab" className="flex items-center shrink-0 focus:outline-none group">
              <img
                src="/assets/travelcab_blanco.svg"
                alt="TravelCab"
                className="h-9 sm:h-11 w-auto object-contain transition-opacity group-hover:opacity-90"
              />
            </a>

            {/* Navegación Institucional Desktop */}
            <nav className="hidden lg:flex items-center justify-center gap-7 text-[13px] font-normal tracking-[-0.01em] text-white/85">
              {/* Nosotros */}
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
                  <ChevronRight className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${nosotrosDropdownOpen ? "rotate-90" : ""}`} />
                </button>

                {nosotrosDropdownOpen && (
                  <div className="absolute left-0 top-full pt-1 w-48 z-50">
                    <div className="bg-[#0a2a5b]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/15 py-1.5 text-[13px] text-white/90">
                      <button
                        type="button"
                        onClick={() => { setNosotrosDropdownOpen(false); setInstitutionalModal('vision'); }}
                        className="w-full px-4 py-2 text-left hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        Nuestra Visión
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNosotrosDropdownOpen(false); setInstitutionalModal('mision'); }}
                        className="w-full px-4 py-2 text-left hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        Nuestra Misión
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNosotrosDropdownOpen(false); setInstitutionalModal('valores'); }}
                        className="w-full px-4 py-2 text-left hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        Nuestros Valores
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewMode('passenger');
                  document.getElementById('web-dispatcher-card')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`py-2 transition-colors cursor-pointer ${viewMode === 'passenger' ? 'text-white font-semibold' : 'hover:text-white'}`}
              >
                Usuarios
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('driver');
                  document.getElementById('hybrid-block')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`py-2 transition-colors cursor-pointer ${viewMode === 'driver' ? 'text-white font-semibold' : 'hover:text-white'}`}
              >
                Conductores
              </button>

              <a href="#services-block" className="py-2 hover:text-white transition-colors">
                Categorías
              </a>

              <a href="#rewards-summary" className="py-2 hover:text-white transition-colors">
                Rewards
              </a>

              <a href="/landing/ecosistema" className="py-2 hover:text-white transition-colors">
                Ecosistema
              </a>
            </nav>

            {/* Zona Derecha Institucional */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <a
                href={`tel:${(cmsData.contact?.phone || '0810-220-0018').replace(/[^0-9]/g, '')}`}
                className="flex items-center gap-1.5 text-[12px] text-white/80 hover:text-white transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{cmsData.contact?.phone || '0810-220-0018'}</span>
              </a>

              <a
                href="/ingresar"
                className="px-3.5 py-1.5 rounded-full border border-white/25 text-white text-[12px] font-medium hover:bg-white/10 transition-colors"
              >
                Ingresar
              </a>
              <a
                href="/mi-perfil"
                className="px-3.5 py-1.5 rounded-full border border-white/25 text-white text-[12px] font-medium hover:bg-white/10 transition-colors"
              >
                Crear Perfil
              </a>

              <div className="relative group">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#0a2a5b] hover:bg-slate-100 px-4 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer"
                >
                  Registrarse
                  <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                </button>
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                  <button
                    onClick={() => { setPRegStep(1); setPRegData({ firstName: '', lastName: '', email: '', phone: '', photoUrl: '' }); setRegisterModal({ isOpen: true, role: 'passenger' }); }}
                    className="w-full text-left block px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#0a2a5b] border-b border-slate-100 transition-colors cursor-pointer"
                  >
                    Soy Pasajero
                  </button>
                  <button
                    onClick={() => { setDRegStep(0); setDRegSubmitted(false); setRegisterModal({ isOpen: true, role: 'driver' }); }}
                    className="w-full text-left block px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#0a2a5b] transition-colors cursor-pointer"
                  >
                    Soy Conductor
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white lg:hidden hover:bg-white/10 transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-white/10 py-4 lg:hidden flex flex-col gap-3 text-white">
              <div className="flex gap-2 p-1 bg-white/10 rounded-full">
                <button
                  onClick={() => { setViewMode('passenger'); setMobileMenuOpen(false); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-full text-center transition-all ${
                    viewMode === 'passenger' ? 'bg-white text-[#0a2a5b]' : 'text-white/80'
                  }`}
                >
                  Usuarios
                </button>
                <button
                  onClick={() => { setViewMode('driver'); setMobileMenuOpen(false); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-full text-center transition-all ${
                    viewMode === 'driver' ? 'bg-white text-[#0a2a5b]' : 'text-white/80'
                  }`}
                >
                  Conductores
                </button>
              </div>

              <div className="flex flex-col gap-1 text-sm">
                <button
                  type="button"
                  onClick={() => { setInstitutionalModal('vision'); setMobileMenuOpen(false); }}
                  className="text-left px-3 py-2 rounded-lg hover:bg-white/10"
                >
                  Nosotros (Visión, Misión y Valores)
                </button>
                <a href="#services-block" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-white/10">
                  Categorías de Transporte
                </a>
                <a href="#rewards-summary" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-white/10">
                  Programa Rewards
                </a>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <a
                  href="/ingresar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block rounded-full border border-white/25 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Ingresar
                </a>
                <a
                  href="/mi-perfil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block rounded-full border border-white/25 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Crear Perfil
                </a>
                <button
                  onClick={() => { setPRegStep(1); setRegisterModal({ isOpen: true, role: 'passenger' }); setMobileMenuOpen(false); }}
                  className="w-full text-center block rounded-full py-2 text-xs font-semibold text-[#0a2a5b] bg-white"
                >
                  Registro Usuario
                </button>
                <button
                  onClick={() => { setDRegStep(0); setDRegSubmitted(false); setRegisterModal({ isOpen: true, role: 'driver' }); setMobileMenuOpen(false); }}
                  className="w-full text-center block rounded-full py-2 text-xs font-semibold text-white border border-white/25"
                >
                  Registro Conductor
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ---------------- HERO INSTITUCIONAL (USUARIOS 35/65 DISPATCHER+MAPA | CONDUCTORES FULL-BLEED) ---------------- */}
      {viewMode === 'passenger' ? (
        <section className="relative bg-white border-b border-slate-200/80">
          <div className="mx-auto max-w-[1440px] flex flex-col lg:flex-row min-h-[600px] lg:min-h-[640px]">
            {/* Margen Izquierdo (35%): Despachador Minimalista */}
            <div
              id="web-dispatcher-card"
              className="w-full lg:w-[35%] bg-white border-b lg:border-b-0 lg:border-r border-slate-200/80 px-5 sm:px-7 py-7 flex flex-col justify-between z-20"
            >
              <div>
                {/* Switcher sutil Usuario / Conductor */}
                <div className="inline-flex items-center p-1 rounded-full bg-slate-100 border border-slate-200/80 mb-5">
                  <button
                    type="button"
                    onClick={() => setViewMode('passenger')}
                    className="px-3.5 py-1 rounded-full text-[11px] font-semibold bg-[#0a2a5b] text-white transition-all cursor-pointer"
                  >
                    Usuarios
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewMode('driver'); setShowQuoteMap(false); }}
                    className="px-3.5 py-1 rounded-full text-[11px] font-semibold text-slate-600 hover:text-[#0a2a5b] transition-all cursor-pointer"
                  >
                    Conductores
                  </button>
                </div>

                <div className="mb-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">
                    {cmsData.dispatcher?.badge || DEFAULT_CMS_DATA.dispatcher.badge}
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] mt-1">
                    {cmsData.dispatcher?.title || DEFAULT_CMS_DATA.dispatcher.title}
                  </h2>
                </div>

                {/* 3 Botones sutiles selector de servicio */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 mb-5">
                  {[
                    { id: 'MU' as const, label: 'Movilidad Urbana' },
                    { id: 'ARC' as const, label: 'Compartido' },
                    { id: 'TRANSFER' as const, label: 'Traslados' },
                  ].map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => {
                        setModality(svc.id);
                        setShowQuoteMap(false);
                      }}
                      className={`py-2 px-2 rounded-lg text-[11px] font-medium transition-all cursor-pointer leading-tight ${
                        modality === svc.id
                          ? 'bg-white text-[#0a2a5b] font-semibold shadow-xs border border-slate-200/80'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {svc.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleCalculateRate} className="space-y-4">
                  {modality === 'ARC' && (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Asientos (Compartido)
                      </label>
                      <select
                        value={selectedSeats}
                        onChange={(e) => setSelectedSeats(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:bg-white focus:border-[#0a2a5b]"
                      >
                        <option value={1}>1 Asiento</option>
                        <option value={2}>2 Asientos</option>
                        <option value={3}>3 Asientos</option>
                        <option value={4}>4 Asientos (Vehículo Completo)</option>
                      </select>
                    </div>
                  )}

                  {/* Solo 1 campo Origen */}
                  <div className="relative">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex justify-between">
                      <span>{cmsData.dispatcher?.pickupLabel || DEFAULT_CMS_DATA.dispatcher.pickupLabel}</span>
                      {pickupCoords && <span className="text-[10px] text-emerald-600 font-semibold">✓ Ubicación lista</span>}
                    </label>
                    <GoogleAddressAutocomplete
                      value={pickupLocation}
                      onChange={(val) => { setPickupLocation(val); setPickupCoords(null); }}
                      onSelect={(address, coords) => { setPickupLocation(address); setPickupCoords(coords); }}
                      placeholder={cmsData.dispatcher?.pickupPlaceholder || DEFAULT_CMS_DATA.dispatcher.pickupPlaceholder}
                      className={formErrors.pickup ? 'border-red-400 bg-red-50/30' : ''}
                    />
                  </div>

                  {/* Solo 1 campo Destino */}
                  <div className="relative">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex justify-between">
                      <span>{cmsData.dispatcher?.dropoffLabel || DEFAULT_CMS_DATA.dispatcher.dropoffLabel}</span>
                      {dropoffCoords && <span className="text-[10px] text-emerald-600 font-semibold">✓ Ubicación lista</span>}
                    </label>
                    <GoogleAddressAutocomplete
                      value={dropoffLocation}
                      onChange={(val) => { setDropoffLocation(val); setDropoffCoords(null); }}
                      onSelect={(address, coords) => { setDropoffLocation(address); setDropoffCoords(coords); }}
                      placeholder={cmsData.dispatcher?.dropoffPlaceholder || DEFAULT_CMS_DATA.dispatcher.dropoffPlaceholder}
                      className={formErrors.dropoff ? 'border-red-400 bg-red-50/30' : ''}
                    />
                  </div>

                  {/* Selector Forma de Pago: Efectivo - Mercado Pago / Tarjeta - Puntos Rewards */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      {cmsData.dispatcher?.paymentMethodLabel || DEFAULT_CMS_DATA.dispatcher.paymentMethodLabel}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Efectivo */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Efectivo')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentMethod === 'Efectivo'
                            ? 'border-[#0a2a5b] bg-[#0a2a5b]/5 text-[#0a2a5b] font-semibold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Coins className="h-4 w-4 mb-1" />
                        <span className="text-[11px] leading-tight">Efectivo</span>
                      </button>

                      {/* Mercado Pago / Tarjeta */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Mercado Pago')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentMethod === 'Mercado Pago'
                            ? 'border-[#009EE3] bg-[#009EE3]/8 text-[#007eb5] font-semibold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <CreditCard className="h-4 w-4 mb-1 text-[#009EE3]" />
                        <span className="text-[10px] leading-tight">Mercado Pago / Tarjeta</span>
                      </button>

                      {/* Puntos Rewards */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Puntos Rewards')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentMethod === 'Puntos Rewards'
                            ? 'border-[#0a2a5b] bg-[#0a2a5b]/5 text-[#0a2a5b] font-semibold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Award className="h-4 w-4 mb-1" />
                        <span className="text-[10px] leading-tight">Puntos Rewards</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 rounded-full bg-[#0a2a5b] hover:bg-[#071d3f] py-3.5 px-5 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    Calcular tarifa aproximada
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>

              <p className="mt-5 pt-4 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
                {cmsData.dispatcher?.legalText || DEFAULT_CMS_DATA.dispatcher.legalText}
              </p>
            </div>

            {/* Margen Derecho (65%): Imagen dinámica editable desde CMS -> Se convierte en Mapa con ruta trazada + Detalle + Pedir Viaje */}
            <div className="w-full lg:w-[65%] relative min-h-[420px] lg:min-h-[640px] bg-slate-900 overflow-hidden">
              {!showQuoteMap ? (
                <>
                  <img
                    src={cmsData.pasajeroHero?.backgroundImage || DEFAULT_CMS_DATA.pasajeroHero.backgroundImage}
                    alt={cmsData.pasajeroHero?.title || 'TravelCab Usuarios y Pasajeros'}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-10 lg:p-14 text-white max-w-2xl">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80 mb-2">
                      TravelCab · Movilidad Institucional
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.08] mb-3 drop-shadow-sm">
                      {cmsData.pasajeroHero?.title || DEFAULT_CMS_DATA.pasajeroHero.title}
                    </h1>
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed mb-6">
                      {cmsData.pasajeroHero?.subtitle || DEFAULT_CMS_DATA.pasajeroHero.subtitle}
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20 max-w-md">
                      {(cmsData.hero?.stats || DEFAULT_CMS_DATA.hero.stats).map((stat: any, idx: number) => (
                        <div key={idx}>
                          <p className="text-lg sm:text-xl font-semibold text-white">{stat.value}</p>
                          <p className="text-[11px] text-white/75">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full min-h-[460px] lg:min-h-[640px]">
                  <GoogleInteractiveMap
                    activeTrip={null}
                    trips={[]}
                    previewCoords={{ originCoords: pickupCoords, destinationCoords: dropoffCoords }}
                  />

                  {/* Tarjeta flotante con ruta, detalle del viaje y botón Pedir Viaje */}
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xl text-[#1d1d1f]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0a2a5b] text-white">
                            {modality === 'MU' ? 'Movilidad Urbana' : modality === 'ARC' ? 'Compartido' : 'Traslados'}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {distanceKm > 0 ? `${distanceKm} km` : 'Ruta calculada'} · {durationMin > 0 ? `${durationMin} min aprox.` : 'Tiempo estimado'}
                          </span>
                          <span className="text-xs font-medium text-slate-500">· {paymentMethod}</span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-700 truncate">
                          <span className="font-semibold text-[#0a2a5b]">Origen:</span> {pickupLocation}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-700 truncate">
                          <span className="font-semibold text-[#0a2a5b]">Destino:</span> {dropoffLocation}
                        </p>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200/80 shrink-0">
                        <div className="text-left md:text-right">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Tarifa Aproximada
                          </span>
                          <span className="text-2xl font-bold text-[#0a2a5b]">
                            {calculatedPrice || '--'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowQuoteMap(false)}
                            className="px-3.5 py-2.5 rounded-full border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            Volver
                          </button>
                          <button
                            type="button"
                            onClick={() => setRequestTripModalOpen(true)}
                            className="px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold transition-all shadow-md cursor-pointer"
                          >
                            Pedir Viaje
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden bg-slate-900 text-white">
          <div className="relative w-full min-h-[540px] lg:min-h-[600px] flex items-center">
            <img
              src={cmsData.conductorHero?.backgroundImage || DEFAULT_CMS_DATA.conductorHero.backgroundImage}
              alt={cmsData.conductorHero?.title || 'TravelCab Conductores Profesionales'}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />

            <div className="mx-auto max-w-[1200px] w-full px-4 sm:px-6 py-14 lg:py-20 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
                  <div className="inline-flex items-center p-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25">
                    <button
                      type="button"
                      onClick={() => setViewMode('passenger')}
                      className="px-4 py-1.5 rounded-full text-xs font-semibold text-white hover:text-white/90 transition-all cursor-pointer"
                    >
                      Portal Usuarios
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('driver')}
                      className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#0a2a5b] transition-all cursor-pointer"
                    >
                      Portal Conductores
                    </button>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.08] drop-shadow-md">
                    {cmsData.conductorHero?.title || DEFAULT_CMS_DATA.conductorHero.title}
                  </h1>

                  <p className="mx-auto lg:mx-0 max-w-xl text-base sm:text-lg text-white/90 leading-relaxed font-normal drop-shadow-sm">
                    {cmsData.conductorHero?.subtitle || DEFAULT_CMS_DATA.conductorHero.subtitle}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setDRegStep(0); setDRegSubmitted(false); setRegisterModal({ isOpen: true, role: 'driver' }); }}
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#0071e3] hover:bg-[#0077ed] px-7 py-3 text-center text-sm font-medium text-white transition-all cursor-pointer"
                    >
                      Registrarme
                    </button>

                    <a
                      href={`https://wa.me/${cmsData.dispatcher?.whatsappConfig?.phone || '5493812000712'}?text=${encodeURIComponent('Hola Travis! Quiero pedir información para sumarme como conductor en TravelCab.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/10 backdrop-blur-md px-6 py-3 text-center text-sm font-medium text-white hover:bg-white hover:text-[#0a2a5b] transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Pedir información
                    </a>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20 max-w-md mx-auto lg:mx-0">
                    {(cmsData.hero?.stats || DEFAULT_CMS_DATA.hero.stats).map((stat: any, idx: number) => (
                      <div key={idx} className="text-center lg:text-left">
                        <p className="text-xl sm:text-2xl font-semibold text-white tracking-tight">{stat.value}</p>
                        <p className="text-xs text-white/75 mt-0.5 leading-snug">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col justify-center items-center w-full relative z-20">
                  <div className="w-full max-w-[480px] bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 md:p-8 shadow-2xl text-[#1d1d1f]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0071e3] block mb-1">
                      Portal Exclusivo Conductores
                    </span>
                    <h3 className="text-2xl font-semibold tracking-tight text-[#0a2a5b] mb-2">
                      Empezá a generar ingresos con TravelCab
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-5">
                      Elegí membresía fija mensual (100% de tus viajes para vos) o comisión baja del 15%, con soporte operativo 24/7.
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <Award className="w-4 h-4 text-[#0a2a5b] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">100% Tuyo o 15% Comisión</p>
                          <p className="text-[11px] text-slate-500">Cambiá de esquema según tu ritmo de trabajo.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <ShieldCheck className="w-4 h-4 text-[#0a2a5b] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Requisitos Claros</p>
                          <p className="text-[11px] text-slate-500">Vehículo 2018+, 4 puertas, A/C y seguro comercial al día.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <Phone className="w-4 h-4 text-[#0a2a5b] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Asistencia 24/7 con Travis</p>
                          <p className="text-[11px] text-slate-500">Acompañamiento real de nuestra central local.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => { setDRegStep(0); setDRegSubmitted(false); setRegisterModal({ isOpen: true, role: 'driver' }); }}
                        className="w-full py-3 rounded-full bg-[#0a2a5b] hover:bg-[#071d3f] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Registrarme
                      </button>
                      <a
                        href={`https://wa.me/${cmsData.dispatcher?.whatsappConfig?.phone || '5493812000712'}?text=${encodeURIComponent('Hola Travis! Quiero pedir información para sumarme como conductor en TravelCab.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 rounded-full border border-slate-300 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Pedir información por WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- BLOQUE 2: 3 TARJETAS DE SERVICIOS EDITABLES DESDE CMS (MOVILIDAD URBANA - COMPARTIDO - TRASLADOS) ---------------- */}
      <section className="py-16 px-4 sm:px-6 bg-[#f5f5f7] border-b border-slate-200/70">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0071e3] mb-2">
              Servicios TravelCab
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1d1d1f]">
              Elegí cómo querés viajar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {((cmsData as any).serviceModalities && Array.isArray((cmsData as any).serviceModalities) && (cmsData as any).serviceModalities.length > 0
              ? (cmsData as any).serviceModalities
              : [
                  {
                    id: 'MU',
                    modality: 'MU',
                    tag: 'Ciudad 24/7',
                    title: 'Movilidad Urbana',
                    subtitle: 'Viajes inmediatos puerta a puerta en la ciudad con tarifa estimada antes de subir y monitoreo satelital.',
                    ctaText: 'Cotizar Urbano',
                    imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=80',
                    criteriaTitle: 'Criterios de Selección · Movilidad Urbana',
                    criteriaText: '• Cobertura: Radio urbano y área metropolitana habilitada.\n• Pasajeros: Hasta 4 pasajeros con equipaje de mano estándar.\n• Vehículos habilitados: Sedán o Hatchback 4/5 puertas 2018+, A/C y seguro comercial.\n• Tarifación: Cálculo automático por distancia y tiempo estimado.',
                  },
                  {
                    id: 'ARC',
                    modality: 'ARC',
                    tag: 'Ahorrá en Ruta',
                    title: 'Compartido',
                    subtitle: 'Reservá por asiento en rutas frecuentes y dividí costos viajando con pasajeros verificados.',
                    ctaText: 'Ver Compartido',
                    imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80',
                    criteriaTitle: 'Criterios de Selección · Viaje Compartido',
                    criteriaText: '• Modalidad: Reserva por asiento (1 a 4 lugares disponibles).\n• Equipaje: 1 bolso o mochila de cabina por pasajero.\n• Puntualidad: Tolerancia máxima de espera de 3 minutos en punto de encuentro.\n• Verificación: Pasajeros y conductores validados en el ecosistema TravelApp.',
                  },
                  {
                    id: 'TRANSFER',
                    modality: 'TRANSFER',
                    tag: 'Aeropuerto & Mundo',
                    title: 'Traslados',
                    subtitle: 'Transfers privados a aeropuertos, terminales y destinos turísticos con tarifa fija programada.',
                    ctaText: 'Programar Traslado',
                    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80',
                    criteriaTitle: 'Criterios de Selección · Traslados & Transfers',
                    criteriaText: '• Alcance: Aeropuertos, terminales, hoteles y traslados turísticos (próximamente red global Civitatis).\n• Equipaje: Capacidad para valijas grandes según categoría seleccionada.\n• Reserva: Programación anticipada con tarifa cerrada y seguimiento de vuelo.\n• Conductores: Unidades ejecutivas / Plus / Premium con habilitación turística o comercial.',
                  },
                ]
            ).map((card: any, idx: number) => {
              const cardModality = (card.modality || card.id || 'MU') as 'MU' | 'ARC' | 'TRANSFER';
              return (
                <div
                  key={card.id || idx}
                  onClick={() => {
                    setViewMode('passenger');
                    setModality(cardModality);
                    setShowQuoteMap(false);
                    setTimeout(() => {
                      document.getElementById('web-dispatcher-card')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-[#0a2a5b] hover:shadow-lg transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <img
                      src={card.imageUrl || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=80'}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0071e3]">
                        {card.tag || 'TravelCab'}
                      </span>
                      <h3 className="text-xl font-semibold text-[#1d1d1f] mt-1">
                        {card.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        {card.subtitle}
                      </p>
                    </div>
                    <div className="pt-4 mt-5 border-t border-slate-100 space-y-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setServiceCriteriaModal(card);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer text-center"
                      >
                        Ver criterios de selección
                      </button>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#0a2a5b]">
                          {card.ctaText || 'Seleccionar servicio'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[#0a2a5b] group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- SECCIÓN: SERVICIOS Y CATEGORÍAS (SOLO USUARIOS) ---------------- */}
      {viewMode === 'passenger' && (
      <section className="py-20 px-6 md:px-8 bg-white" id="services-block">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-vial-orange bg-vial-orange/10 px-3.5 py-1.5 rounded-full">
              CATEGORÍAS DE TRANSPORTE
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-tech-blue">
              Movilidad a la Medida de tus Necesidades
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-2xl mx-auto">
              Conoce nuestra gama de traslados urbanos premium. Cada una de nuestras categorías cuenta con vehículos de alta gama, aire acondicionado y la seguridad del soporte satelital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cmsData.servicios?.map((svc: any) => (
              <div 
                key={svc.id}
                className="group rounded-3xl border border-slate-200/60 bg-slate-50/20 p-6 hover:bg-white hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-200 border border-slate-200">
                    <img 
                      src={svc.imageUrl || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80'} 
                      alt={svc.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    />
                    <span className="absolute top-3 right-3 text-[10px] font-black uppercase text-white bg-tech-blue/90 backdrop-blur-sm px-2.5 py-1 rounded-full tracking-wider">
                      ETA: {svc.eta}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold text-tech-blue group-hover:text-vial-orange transition-colors">
                      {svc.name}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {svc.description}
                    </p>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-6">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">{svc.subTag || 'Servicio Corporativo'}</span>
                  <a
                    href="#web-dispatcher-card"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-tech-blue text-white px-5 py-2.5 text-xs font-black uppercase tracking-wide hover:bg-vial-orange hover:text-slate-950 hover:-translate-y-0.5 transition-all duration-300"
                    style={{ backgroundColor: '#0a2a5b' }}
                  >
                    {svc.ctaText || 'Cotizar'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ---------------- SECCIÓN: BENEFICIOS DE PASAJERO ---------------- */}
      {viewMode === 'passenger' && (
        <section className="py-20 px-6 md:px-8 bg-slate-50/50 border-y border-slate-200/40">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
                <span className="text-xs font-extrabold uppercase tracking-widest text-vial-orange bg-vial-orange/10 px-3 py-1 rounded-full">
                  {cmsData.passengers?.badge || DEFAULT_CMS_DATA.passengers.badge}
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-tech-blue leading-tight">
                  {cmsData.passengers?.title || DEFAULT_CMS_DATA.passengers.title}
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {cmsData.passengers?.subtitle || DEFAULT_CMS_DATA.passengers.subtitle}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => { setPRegStep(1); setPRegData({ firstName: '', lastName: '', email: '', phone: '', photoUrl: '' }); setRegisterModal({ isOpen: true, role: 'passenger' }); }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-tech-blue text-white px-6 py-3.5 text-sm font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
                    style={{ backgroundColor: '#0a2a5b' }}
                  >
                    Registrarme y Ganar 300 pts
                    <Sparkles className="h-4 w-4 text-vial-orange" />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(cmsData.passengers?.benefits || DEFAULT_CMS_DATA.passengers.benefits).map((benefit: any) => {
                  const IconComp = IconMap[benefit.icon] || ShieldCheck;
                  return (
                    <div key={benefit.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vial-orange/10 text-vial-orange">
                        <IconComp className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-slate-800 text-sm">{benefit.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{benefit.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ---------------- SECCIÓN: MODELO HÍBRIDO EXPLICATIVO (CONDUCTOR) ---------------- */}
      {viewMode === 'driver' && (
        <section className="py-20 px-6 md:px-8 bg-slate-50/50 border-y border-slate-200/40" id="hybrid-block">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-vial-orange bg-vial-orange/10 px-3.5 py-1.5 rounded-full">
                SISTEMA PREMIUM HÍBRIDO
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-tech-blue">
                {cmsData.tiposTrabajo?.title || DEFAULT_CMS_DATA.tiposTrabajo.title}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {cmsData.tiposTrabajo?.subtitle || DEFAULT_CMS_DATA.tiposTrabajo.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-24 w-24 bg-vial-orange/5 rounded-bl-full pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vial-orange/10 text-vial-orange">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    {cmsData.tiposTrabajo?.comisionTitulo || DEFAULT_CMS_DATA.tiposTrabajo.comisionTitulo}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {cmsData.tiposTrabajo?.comisionTexto || DEFAULT_CMS_DATA.tiposTrabajo.comisionTexto}
                  </p>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Comisión por viaje</span>
                  <span className="text-base font-black text-tech-blue">15% Fijo</span>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-24 w-24 bg-tech-blue/5 rounded-bl-full pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tech-blue/10 text-tech-blue">
                    <Award className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    {cmsData.tiposTrabajo?.membresiaTitulo || DEFAULT_CMS_DATA.tiposTrabajo.membresiaTitulo}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {cmsData.tiposTrabajo?.membresiaTexto || DEFAULT_CMS_DATA.tiposTrabajo.membresiaTexto}
                  </p>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ingresos retenidos</span>
                  <span className="text-base font-black text-tech-blue">100% tuyos</span>
                </div>
              </div>
            </div>

            {/* Beneficios y Requisitos Exclusivos para Conductores */}
            <div className="mt-16 pt-12 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-6">
              {(cmsData.drivers?.benefits || DEFAULT_CMS_DATA.drivers.benefits).map((b: any, i: number) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0a2a5b] text-white flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{b.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>

            {/* Bloque CMS: Split de Pagos (Mercado Pago, CBU/CVU y transición bindX) */}
            <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="max-w-3xl mb-8">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0071e3]">
                  {(cmsData as any).driverSplitPayments?.badge || 'COBRANZAS Y LIQUIDACIONES'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f] mt-1">
                  {(cmsData as any).driverSplitPayments?.title || 'Cómo funciona el Split de Pagos'}
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {(cmsData as any).driverSplitPayments?.subtitle || 'Elegí cobrar tus viajes digitales de forma automática vinculando tu cuenta de Mercado Pago o mediante transferencia a tu CBU / CVU.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-[#009EE3]/30 bg-[#009EE3]/5 p-6 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-5 h-5 text-[#009EE3]" />
                    <h4 className="text-base font-bold text-[#1d1d1f]">
                      {(cmsData as any).driverSplitPayments?.mpTitle || 'Split Automático con Mercado Pago'}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {(cmsData as any).driverSplitPayments?.mpDescription || 'Al enlazar tu cuenta de Mercado Pago desde tu perfil de conductor, cada viaje abonado con tarjeta o dinero en cuenta se divide automáticamente en el momento: recibís tu parte al instante y se descuenta solo la comisión correspondiente (o 0% si estás en Membresía Fija).'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-5 h-5 text-[#0a2a5b]" />
                    <h4 className="text-base font-bold text-[#1d1d1f]">
                      {(cmsData as any).driverSplitPayments?.cbuTitle || 'Cobros por Otro CBU / CVU'}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {(cmsData as any).driverSplitPayments?.cbuDescription || 'Si preferís operar con otro banco o billetera virtual, podés cargar tu CBU o CVU alternativo para recibir las liquidaciones acumuladas de tus viajes digitales según el cronograma semanal.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 leading-relaxed">
                <strong className="text-[#0a2a5b]">Nota de infraestructura:</strong>{' '}
                {(cmsData as any).driverSplitPayments?.bindxNote || 'Actualización programada: Una vez finalizados los trámites e integración con bindX, todo el esquema de split y acreditaciones se unificará automáticamente bajo la nueva infraestructura bancaria.'}
              </div>
            </div>

            {/* Tarjeta CMS: Requisitos de Aceptación de Conductores y Vehículos */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0071e3]">
                  {(cmsData as any).driverRequirements?.badge || 'REQUISITOS DE ACEPTACIÓN'}
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f]">
                  {(cmsData as any).driverRequirements?.title || 'Requisitos para Conductores y Vehículos'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {(cmsData as any).driverRequirements?.subtitle || 'Conocé los criterios obligatorios para postularte y mantener tu cuenta activa en TravelCab.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDriverReqsModalOpen(true)}
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full border border-[#0a2a5b] px-6 py-3 text-sm font-semibold text-[#0a2a5b] hover:bg-[#0a2a5b] hover:text-white transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                Ver Requisitos de Aceptación
              </button>
            </div>

            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => { setDRegStep(0); setDRegSubmitted(false); setRegisterModal({ isOpen: true, role: 'driver' }); }}
                className="inline-flex items-center gap-2 rounded-full bg-[#0a2a5b] hover:bg-[#071d3f] text-white px-8 py-3.5 text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>Iniciar Registro de Conductor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- SECCIÓN: PROGRAMA REWARDS (SOLO USUARIOS) ---------------- */}
      {viewMode === 'passenger' && (
      <section className="py-20 px-6 md:px-8 bg-white border-b border-slate-200/40" id="rewards-summary">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="relative rounded-3xl overflow-hidden aspect-video lg:aspect-square bg-slate-100 shadow-xl border border-slate-200">
              <img 
                src={cmsData.resumenRewards?.imageUrl || DEFAULT_CMS_DATA.resumenRewards.imageUrl}
                alt="Rewards Program"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent flex flex-col justify-end p-8 text-white">
                <span className="text-[10px] font-black uppercase text-vial-orange tracking-widest block mb-1">
                  {cmsData.resumenRewards?.badgeText || DEFAULT_CMS_DATA.resumenRewards.badgeText}
                </span>
                <h4 className="text-xl font-extrabold">Fidelización Inteligente</h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">Cada traslado en nuestra red te acerca a viajes sin costo y atenciones VIP.</p>
              </div>
            </div>

            <div className="space-y-6 text-center lg:text-left">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-100/50 px-3.5 py-1.5 rounded-full">
                {cmsData.resumenRewards?.pointsText || DEFAULT_CMS_DATA.resumenRewards.pointsText}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-tech-blue leading-tight">
                {cmsData.resumenRewards?.title || DEFAULT_CMS_DATA.resumenRewards.title}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {cmsData.resumenRewards?.subtitle || DEFAULT_CMS_DATA.resumenRewards.subtitle}
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button
                  onClick={() => { setPRegStep(1); setPRegData({ firstName: '', lastName: '', email: '', phone: '', photoUrl: '' }); setRegisterModal({ isOpen: true, role: 'passenger' }); }}
                  className="rounded-2xl bg-tech-blue text-white px-6 py-4 text-xs font-black uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all"
                  style={{ backgroundColor: '#0a2a5b' }}
                >
                  Unirme al Programa Rewards
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>
      )}

      {/* ---------------- SECCIÓN: FAQ (Preguntas Frecuentes - DINÁMICAS DESDE CMS) ---------------- */}
      <section className="py-20 px-6 md:px-8 bg-slate-50" id="faq-section">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16 space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-vial-orange bg-vial-orange/10 px-3.5 py-1.5 rounded-full">
              SOPORTE LOCAL Y RESPUESTAS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-tech-blue">
              {cmsData.faq?.title || DEFAULT_CMS_DATA.faq.title}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              {cmsData.faq?.subtitle || DEFAULT_CMS_DATA.faq.subtitle}
            </p>
          </div>

          <div className="space-y-4">
            {(cmsData.faq?.items || DEFAULT_CMS_DATA.faq.items || [])
              .filter((item: any) => !item.audience || item.audience === 'all' || item.audience === viewMode)
              .map((item: any, idx: number) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between px-6 py-4.5 text-left text-sm font-bold text-tech-blue hover:text-vial-orange transition-colors"
                  >
                    <span>{item.question}</span>
                    <ChevronRight className={`h-4.5 w-4.5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-90 text-vial-orange' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs text-slate-500 leading-relaxed border-t border-slate-100 bg-slate-50/30 animate-slideDown whitespace-pre-line">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
            {(cmsData.faq?.items?.length === 0) && (
              <p className="text-slate-400 text-center py-6 text-xs">No hay preguntas cargadas en el CMS actualmente.</p>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER PREMIUM COMPACTADO (PY-8) ---------------- */}
      <footer className="relative bg-slate-950 py-8 px-6 md:px-8 text-white border-t border-slate-900 overflow-hidden">
        <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-vial-orange/5 blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 h-30 w-30 rounded-full bg-tech-blue/10 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-4xl relative z-10 flex flex-col items-center gap-6 text-center">
          
          <img
            src="/assets/travelcab_blanco.svg"
            alt="TravelCab"
            className="h-14 w-auto opacity-90 mx-auto"
          />

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-extrabold uppercase tracking-wider text-slate-300">
            <button 
              onClick={() => setLegalModal({ isOpen: true, type: 'about' })}
              className="hover:text-vial-orange transition-colors"
            >
              Quiénes Somos
            </button>
            <button 
              onClick={() => setLegalModal({ isOpen: true, type: 'terms' })}
              className="hover:text-vial-orange transition-colors"
            >
              Términos y Condiciones
            </button>
            <button 
              onClick={() => setLegalModal({ isOpen: true, type: 'privacy' })}
              className="hover:text-vial-orange transition-colors"
            >
              Políticas de Privacidad
            </button>
            <a 
              href="/rrhh"
              className="hover:text-vial-orange transition-colors flex items-center gap-1"
            >
              Trabaja con Nosotros
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex items-center justify-center gap-2.5 text-xs text-slate-400">
            <Phone className="h-3.5 w-3.5 text-vial-orange" />
            <span>{cmsData.contact?.phone || DEFAULT_CMS_DATA.contact.phone}</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            {cmsData.redesSociales?.facebook && (
              <a
                href={cmsData.redesSociales.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-vial-orange hover:text-slate-950 transition-all duration-200"
              >
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </a>
            )}
            {cmsData.redesSociales?.instagram && (
              <a
                href={cmsData.redesSociales.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-vial-orange hover:text-slate-950 transition-all duration-200"
              >
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            )}
            {cmsData.redesSociales?.messenger && (
              <a
                href={cmsData.redesSociales.messenger}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-vial-orange hover:text-slate-950 transition-all duration-200"
              >
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464C18.627 22.222 24 17.247 24 11.111 24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z"/>
                </svg>
              </a>
            )}
            {cmsData.redesSociales?.whatsapp && (
              <a
                href={cmsData.redesSociales.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-vial-orange hover:text-slate-950 transition-all duration-200"
              >
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 11.968.01c3.178.001 6.169 1.24 8.424 3.496 2.254 2.256 3.491 5.249 3.491 8.43 0 6.615-5.337 11.953-11.905 11.953-2.006-.001-3.98-.507-5.732-1.468L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.407 9.862-9.83.001-2.628-1.02-5.1-2.871-6.955C16.6 1.965 14.138.94 11.52.94c-5.44 0-9.863 4.41-9.866 9.833-.001 1.777.464 3.51 1.346 5.034l-.993 3.626 3.73-.978c1.478.807 3.125 1.233 4.71 1.234zm11.39-7.9c-.27-.135-1.593-.787-1.84-.878-.247-.09-.427-.135-.607.135-.18.27-.697.878-.854 1.057-.158.18-.315.202-.585.067-.27-.135-1.14-.42-2.172-1.34-.803-.717-1.345-1.603-1.502-1.873-.158-.27-.017-.417.118-.552.122-.122.27-.315.405-.472.135-.158.18-.27.27-.45.09-.18.045-.337-.022-.472-.068-.135-.608-1.464-.833-2.005-.22-.53-.44-.457-.607-.466-.157-.008-.337-.01-.517-.01-.18 0-.472.067-.72.337-.247.27-.945.923-.945 2.25 0 1.327.965 2.61 1.1 2.78.135.17 1.9 2.9 4.603 4.07 1.1.48 1.758.646 2.378.736.623.09 1.134.072 1.56.009.477-.07 1.594-.652 1.819-1.282.225-.63.225-1.17.157-1.282-.067-.11-.247-.18-.517-.315z"/>
                </svg>
              </a>
            )}
            {cmsData.redesSociales?.youtube && (
              <a
                href={cmsData.redesSociales.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-vial-orange hover:text-slate-950 transition-all duration-200"
              >
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.5 12 3.5 12 3.5s-7.518 0-9.388.503a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11C4.482 20.5 12 20.5 12 20.5s7.518 0 9.388-.503a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            )}
            {cmsData.redesSociales?.tiktok && (
              <a
                href={cmsData.redesSociales.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-vial-orange hover:text-slate-950 transition-all duration-200"
              >
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.525.02c1.31-.032 2.61-.019 3.91-.006.03 1.56.7 2.92 1.94 3.79.79.56 1.7.93 2.65 1.11.01 1.41-.01 2.82.003 4.23-.88-.13-1.74-.46-2.52-.94-.85-.52-1.55-1.24-2.02-2.11v6.92c-.01 1.43-.37 2.85-1.07 4.09-.76 1.34-1.92 2.4-3.32 2.99-1.57.66-3.37.76-5.02.26-1.5-.45-2.83-1.46-3.69-2.82-1-1.58-1.28-3.56-.78-5.38.48-1.76 1.7-3.26 3.34-4.08 1.15-.58 2.44-.81 3.72-.66v4.3c-.76-.23-1.61-.13-2.3.29-.63.39-1.05 1.05-1.16 1.79-.17.99.31 2.05 1.17 2.53.69.39 1.54.43 2.26.11.83-.37 1.39-1.19 1.44-2.1.03-3.64.01-7.28.02-10.93.01-.13.01-.26.01-.39z"/>
                </svg>
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <RenderLegalSeal content={cmsData.sellosLegales?.arcaQr} alt="ARCA" />
            <RenderLegalSeal content={cmsData.sellosLegales?.baseDatosSello} alt="Base de Datos" />
          </div>

          <div className="w-full border-t border-slate-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-semibold">
            <p>{cmsData.footer?.copyright || DEFAULT_CMS_DATA.footer.copyright}</p>
            <p>Una marca registrada de TravelApp s.a.s.</p>
          </div>

        </div>
      </footer>

      {/* -------- BOTÓN FLOTANTE TRAVIS (OMNICANAL) -------- */}
      <TravisOmnichannelWidget 
        businessUnit="TravelCab" 
        whatsappUrl={cmsData.contact?.whatsapp || DEFAULT_CMS_DATA.contact.whatsapp}
        messengerUrl={cmsData.redesSociales?.messenger || DEFAULT_CMS_DATA.redesSociales.messenger}
        instagramUrl={cmsData.redesSociales?.instagram || DEFAULT_CMS_DATA.redesSociales.instagram || "https://instagram.com/travelcab.ar"}
        primaryColor="#ff7b1a" // Vial orange
        brandName="TravelCab"
      />

      {/* ========================================================
          MODAL INTELIGENTE DE BÚSQUEDA Y ASIGNACIÓN DE CHOFER
      ======================================================== */}
      {searchingDriverModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xl animate-scaleIn flex flex-col gap-6 text-center text-slate-800">
            
            {/* ESTADO 1: BUSCANDO CHOFER */}
            {searchingDriverModal.status === 'searching' && (
              <>
                <div className="relative mx-auto h-24 w-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-vial-orange/20 animate-ping duration-1000" />
                  <div className="absolute h-16 w-16 rounded-full bg-vial-orange/30 animate-pulse" />
                  <div className="relative h-12 w-12 rounded-full bg-vial-orange flex items-center justify-center text-white shadow-lg shadow-vial-orange/50">
                    <Navigation className="h-6 w-6 rotate-45 animate-bounce" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-black text-tech-blue uppercase tracking-tight">Buscando Conductor</h3>
                  <p className="text-xs text-slate-500 mt-2">
                    Estamos localizando el móvil más cercano de la flota para tu traslado de <strong>{modality === 'MU' ? 'Movilidad Urbana' : 'Auto Compartido (ARC)'}</strong>...
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-xs text-slate-500 font-bold">Pasajero:</span>
                    <span className="text-xs text-slate-800 font-black">{passengerName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-xs text-slate-500 font-bold">Desde:</span>
                    <span className="text-xs text-slate-800 font-black truncate max-w-[200px]" title={pickupLocation}>{pickupLocation}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-xs text-slate-500 font-bold">Hasta:</span>
                    <span className="text-xs text-slate-800 font-black truncate max-w-[200px]" title={dropoffLocation}>{dropoffLocation}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-xs text-slate-500 font-bold">Tarifa Estimada:</span>
                    <span className="text-xs text-vial-orange font-black">{calculatedPrice} ({paymentMethod})</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    stopTripAlert();
                    // Cancelar viaje en Firestore
                    try {
                      await updateDoc(doc(db, 'trips', searchingDriverModal.tripId), { status: 'cancelled' });
                    } catch (e) {
                      console.warn(e);
                    }
                    setSearchingDriverModal(prev => ({ ...prev, isOpen: false }));
                    setDispatcherStep(1);
                  }}
                  className="w-full bg-slate-100 text-slate-500 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-all text-center text-xs uppercase tracking-wider"
                >
                  Cancelar Solicitud
                </button>
              </>
            )}

            {/* ESTADO 2: PAGO REQUERIDO (MERCADO PAGO) */}
            {searchingDriverModal.status === 'payment_required' && (
              <>
                <div className="mx-auto h-16 w-16 rounded-full bg-sky-50 flex items-center justify-center text-[#009EE3] animate-pulse">
                  <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>

                <div>
                  <h3 className="text-xl font-black text-tech-blue uppercase tracking-tight">Pago Pendiente</h3>
                  <p className="text-xs text-slate-500 mt-2">
                    ¡Conductor encontrado! Para iniciar el traslado con <strong>{searchingDriverModal.driverInfo?.driverName || 'Roberto Gómez'}</strong>, completa el pago en el botón de Mercado Pago:
                  </p>
                </div>

                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left text-xs text-slate-500 flex flex-col gap-2">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-700">Total a Pagar:</span>
                    <span className="font-black text-[#009EE3] text-sm">${searchingDriverModal.amount.toLocaleString('es-AR')} ARS</span>
                  </div>
                  <div><span className="font-bold text-slate-700">Patente Vehículo:</span> XXX-{searchingDriverModal.driverInfo?.vehiclePlate?.substring(Math.max(0, (searchingDriverModal.driverInfo?.vehiclePlate?.length || 7) - 3))}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={searchingDriverModal.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#009EE3] text-white font-black py-3.5 rounded-2xl shadow-lg hover:bg-[#0087c4] transition-all text-center flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                  >
                    Pagar con Mercado Pago
                  </a>
                  
                  {/* Botón exclusivo de pruebas/desarrollo */}
                  <button
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'trips', searchingDriverModal.tripId), { status: 'cancelled', paymentStatus: 'failed' });
                      } catch (e) {}
                      setSearchingDriverModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-2xl hover:bg-slate-200 transition-all text-center text-xs uppercase tracking-wider"
                  >
                    Cancelar Viaje
                  </button>
                </div>
              </>
            )}

            {/* ESTADO 3: VIAJE CONFIRMADO / CONDUCTOR ASIGNADO */}
            {searchingDriverModal.status === 'driver_assigned' && (
              <>
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 animate-bounce">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">¡Viaje Confirmado!</h3>
                  <p className="text-xs text-slate-500 mt-1">El conductor ya fue asignado y se notificó a tu teléfono.</p>
                </div>

                {/* Tarjeta del Conductor */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={searchingDriverModal.driverInfo?.driverProfilePhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"}
                      className="h-14 w-14 rounded-full object-cover border border-slate-200 shadow-sm"
                      alt="Perfil"
                    />
                    <div className="text-left flex-1">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Conductor Asignado</p>
                      <p className="text-sm font-black text-slate-800">{searchingDriverModal.driverInfo?.driverName || 'Roberto Gómez'}</p>
                      <p className="text-xs text-vial-orange font-extrabold">⭐ {searchingDriverModal.driverInfo?.driverRating || '4.8'} Reputación</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-slate-200/60 pt-3">
                    <img 
                      src={searchingDriverModal.driverInfo?.driverCarPhoto || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=400"}
                      className="h-14 w-20 rounded-xl object-cover border border-slate-200 shadow-sm"
                      alt="Vehículo"
                    />
                    <div className="text-left">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Vehículo</p>
                      <p className="text-xs font-black text-slate-800">{searchingDriverModal.driverInfo?.vehicleModel || 'Fiat Cronos (Gris)'}</p>
                      <p className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1 inline-block">
                        Patente: XXX {searchingDriverModal.driverInfo?.vehiclePlate?.substring(Math.max(0, (searchingDriverModal.driverInfo?.vehiclePlate?.length || 7) - 3)) || '123'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setSearchingDriverModal(prev => ({ ...prev, isOpen: false }));
                      handleResetDispatcher();
                    }}
                    className="w-full bg-[#0A2A5B] text-white font-black py-3.5 rounded-2xl shadow-lg hover:brightness-110 transition-all text-center text-xs uppercase tracking-wider"
                  >
                    Entendido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODALES DE LEGALES / QUIÉNES SOMOS
      ======================================================== */}
      {legalModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xl animate-scaleIn max-h-[85vh] flex flex-col justify-between">
            <button
              onClick={() => setLegalModal({ isOpen: false, type: 'terms' })}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 hover:bg-slate-50 text-slate-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <h3 className="text-xl font-black text-tech-blue border-b border-slate-100 pb-3 flex items-center gap-2">
                {legalModal.type === 'about' ? <Info className="h-6 w-6 text-vial-orange" /> : <Shield className="h-6 w-6 text-vial-orange" />}
                {legalModal.type === 'about' && 'Quiénes Somos — TravelCab'}
                {legalModal.type === 'terms' && 'Términos y Condiciones Generales'}
                {legalModal.type === 'privacy' && 'Políticas de Privacidad'}
              </h3>
              <div className="text-xs text-slate-600 leading-relaxed space-y-4 whitespace-pre-line font-medium">
                {legalModal.type === 'about' && (cmsData.legales?.quienesSomos || DEFAULT_CMS_DATA.legales.quienesSomos)}
                {legalModal.type === 'terms' && (cmsData.legales?.terminosCondiciones || DEFAULT_CMS_DATA.legales.terminosCondiciones)}
                {legalModal.type === 'privacy' && (cmsData.legales?.politicasPrivacidad || DEFAULT_CMS_DATA.legales.politicasPrivacidad)}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
              <button
                onClick={() => setLegalModal({ isOpen: false, type: 'terms' })}
                className="rounded-xl bg-tech-blue px-6 py-2.5 text-xs font-bold text-white hover:brightness-110 transition-all"
                style={{ backgroundColor: '#0a2a5b' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REGISTRO DE PASAJERO (CON DOCUMENTOS Y CÁMARA)
      ======================================================== */}
      {registerModal.isOpen && registerModal.role === 'passenger' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xl animate-scaleIn">
            <button
              onClick={() => setRegisterModal({ isOpen: false, role: 'passenger' })}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 hover:bg-slate-50 text-slate-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {pRegStep === 1 && (
              <form onSubmit={handlePassengerSubmit} className="space-y-4">
                <div className="text-center space-y-2 mb-6">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-vial-orange/10 text-vial-orange">
                    <Gift className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-tech-blue">Registro de Pasajero</h3>
                  <p className="text-xs text-slate-500 leading-normal">
                    Registrate hoy y recibí **{rewardsConfig.welcomePointsBonus || 20} puntos Rewards** de bienvenida automáticamente en tu cuenta.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Nombre</label>
                    <input
                      type="text"
                      required
                      value={pRegData.firstName}
                      onChange={(e) => setPRegData({ ...pRegData, firstName: e.target.value })}
                      placeholder="Ej: Laura"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-4 focus:ring-tech-blue/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Apellido</label>
                    <input
                      type="text"
                      required
                      value={pRegData.lastName}
                      onChange={(e) => setPRegData({ ...pRegData, lastName: e.target.value })}
                      placeholder="Ej: Gómez"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-4 focus:ring-tech-blue/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={pRegData.email}
                    onChange={(e) => setPRegData({ ...pRegData, email: e.target.value })}
                    placeholder="laura@email.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-4 focus:ring-tech-blue/10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Teléfono Móvil (WhatsApp)</label>
                  <input
                    type="text"
                    required
                    value={pRegData.phone}
                    onChange={(e) => setPRegData({ ...pRegData, phone: e.target.value })}
                    placeholder="+54 9 381 000-0000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-4 focus:ring-tech-blue/10"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-6 rounded-2xl bg-tech-blue py-3.5 font-black uppercase tracking-wider text-white hover:brightness-110 shadow-lg"
                  style={{ backgroundColor: '#0a2a5b' }}
                >
                  Registrarme y Ganar Puntos
                </button>
              </form>
            )}

            {pRegStep === 2 && (
              <div className="text-center py-4 space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
                    <Sparkles className="h-7 w-7 text-vial-orange fill-vial-orange" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">¡Ganaste {pPoints} puntos!</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    Tu cuenta ha sido creada con éxito. Si cargas tu **foto de perfil** ahora mismo te regalamos **150 puntos extra** de inmediato.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-6 gap-4">
                  {pRegData.photoUrl ? (
                    <div className="relative h-20 w-20 rounded-full border-2 border-tech-blue overflow-hidden shadow-md">
                      <img src={pRegData.photoUrl} alt="Profile" className="h-full w-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setPRegData(prev => ({ ...prev, photoUrl: '' }))}
                        className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity font-bold text-xs"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <User className="h-10 w-10 text-slate-400" />
                  )}
                  
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">Foto de Perfil</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{pRegData.photoUrl ? '✓ Foto cargada exitosamente' : 'Carga un archivo o abre tu cámara'}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
                      <Upload className="h-3.5 w-3.5" />
                      Subir
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => handleUploadPhotoData(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
                      <Camera className="h-3.5 w-3.5" />
                      Cámara
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="user" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => handleUploadPhotoData(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPRegStep(3)}
                    className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 uppercase tracking-wider"
                  >
                    Saltar Paso
                  </button>
                  {pRegData.photoUrl && (
                    <button
                      onClick={handleCompletePassengerPhoto}
                      className="flex-1 rounded-xl bg-tech-blue py-3 text-xs font-bold text-white hover:brightness-110 uppercase tracking-wider"
                      style={{ backgroundColor: '#0a2a5b' }}
                    >
                      Canjear +{rewardsConfig.profilePhotoBonusPoints || 10} Puntos
                    </button>
                  )}
                </div>
              </div>
            )}

            {pRegStep === 3 && (
              <div className="text-center py-6 space-y-5 animate-fadeIn">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">¡Registro Completado!</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    Tu perfil de pasajero está activo. En tu billetera tienes un saldo de **{pPoints} puntos Rewards** listos para ser canjeados.
                  </p>
                </div>
                <button
                  onClick={() => setRegisterModal({ isOpen: false, role: 'passenger' })}
                  className="w-full mt-4 rounded-xl bg-tech-blue py-3 font-bold text-white hover:brightness-110"
                  style={{ backgroundColor: '#0a2a5b' }}
                >
                  Comenzar a Viajar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REGISTRO DE CONDUCTOR (4 PASOS COMPLETOS RRHH)
      ======================================================== */}
      {registerModal.isOpen && registerModal.role === 'driver' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xl animate-scaleIn max-h-[90vh] flex flex-col justify-between">
            <button
              onClick={() => setRegisterModal({ isOpen: false, role: 'driver' })}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 hover:bg-slate-50 text-slate-500 transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {dRegSubmitted ? (
              <div className="text-center py-10 space-y-5 animate-fadeIn">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">¡Registro completado!</h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Gracias **{dRegData.firstName} {dRegData.lastName}** por postularte como socio conductor. Tus datos y documentación han sido cargados con éxito al sistema y están bajo análisis presencial en nuestras oficinas de Tucumán. Te contactaremos vía WhatsApp a la brevedad.
                </p>
                <div className="pt-4 max-w-xs mx-auto">
                  <button
                    onClick={() => setRegisterModal({ isOpen: false, role: 'driver' })}
                    className="w-full rounded-xl bg-tech-blue py-3 font-bold text-white hover:brightness-110"
                    style={{ backgroundColor: '#0a2a5b' }}
                  >
                    Entendido
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-tech-blue flex items-center gap-2">
                    <Car className="h-6 w-6 text-vial-orange" />
                    Registro de Conductor / Socio
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Completa los 4 pasos obligatorios del registro oficial de flota.</p>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center justify-center gap-0 pb-4">
                  {['Datos', 'Fiscal', 'Vehículo', 'Docs'].map((lbl, idx) => {
                    const active = idx === dRegStep;
                    const done = idx < dRegStep;
                    return (
                      <React.Fragment key={idx}>
                        <div className="flex flex-col items-center">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-extrabold ${
                            done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'bg-tech-blue border-tech-blue text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}>
                            {done ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[9px] font-bold mt-1 ${active ? 'text-tech-blue' : done ? 'text-emerald-500' : 'text-slate-400'}`}>{lbl}</span>
                        </div>
                        {idx < 3 && <div className={`h-[2px] flex-1 max-w-[60px] mx-1 ${idx < dRegStep ? 'bg-emerald-400' : 'bg-slate-100'}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="space-y-4 text-xs font-semibold text-slate-600">
                  
                  {/* STEP 0: Personal */}
                  {dRegStep === 0 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Nombre <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.firstName}
                            onChange={(e) => setDRegData({ ...dRegData, firstName: e.target.value })}
                            placeholder="Ej: Carlos"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Apellido <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.lastName}
                            onChange={(e) => setDRegData({ ...dRegData, lastName: e.target.value })}
                            placeholder="Ej: Mamani"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            required
                            value={dRegData.dob}
                            onChange={(e) => setDRegData({ ...dRegData, dob: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                          {dRegData.dob && !isAdult(dRegData.dob) && (
                            <p className="text-[9px] text-red-500 mt-1 font-bold">Debe ser mayor de 18 años.</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Email <span className="text-red-500">*</span></label>
                          <input
                            type="email"
                            required
                            value={dRegData.email}
                            onChange={(e) => setDRegData({ ...dRegData, email: e.target.value })}
                            placeholder="conductor@email.com"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Teléfono Móvil (WhatsApp) <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={dRegData.phone}
                          onChange={(e) => setDRegData({ ...dRegData, phone: e.target.value })}
                          placeholder="+54 381 000-0000"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                        />
                      </div>
                      
                      <hr className="border-slate-100" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Domicilio</p>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 mb-1">Calle <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.street}
                            onChange={(e) => setDRegData({ ...dRegData, street: e.target.value })}
                            placeholder="Av. Belgrano"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Número <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.streetNumber}
                            onChange={(e) => setDRegData({ ...dRegData, streetNumber: e.target.value })}
                            placeholder="1250"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Piso</label>
                          <input
                            type="text"
                            value={dRegData.floor}
                            onChange={(e) => setDRegData({ ...dRegData, floor: e.target.value })}
                            placeholder="3"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Depto</label>
                          <input
                            type="text"
                            value={dRegData.apartment}
                            onChange={(e) => setDRegData({ ...dRegData, apartment: e.target.value })}
                            placeholder="B"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">CP <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.postalCode}
                            onChange={(e) => setDRegData({ ...dRegData, postalCode: e.target.value })}
                            placeholder="4000"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Localidad <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.city}
                            onChange={(e) => setDRegData({ ...dRegData, city: e.target.value })}
                            placeholder="San Miguel de Tucumán"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Provincia <span className="text-red-500">*</span></label>
                          <select
                            required
                            value={dRegData.province}
                            onChange={(e) => setDRegData({ ...dRegData, province: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          >
                            <option value="">Seleccionar...</option>
                            {ARGENTINA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 1: Fiscal */}
                  {dRegStep === 1 && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identificación Fiscal</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Tipo ID</label>
                          <select
                            value={dRegData.taxType}
                            onChange={(e) => setDRegData({ ...dRegData, taxType: e.target.value as any })}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none font-bold"
                          >
                            <option value="CUIL">CUIL</option>
                            <option value="CUIT">CUIT</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">{dRegData.taxType} (11 dígitos) <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.taxIdNumber}
                            onChange={(e) => setDRegData({ ...dRegData, taxIdNumber: e.target.value })}
                            placeholder="20-12345678-9"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                      </div>

                      {dRegData.taxType === 'CUIT' && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                          <p className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Requisitos Fiscales CUIT
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Condición ARCA <span className="text-red-500">*</span></label>
                              <select
                                value={dRegData.registrationType}
                                onChange={(e) => setDRegData({ ...dRegData, registrationType: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                              >
                                <option value="">Seleccionar...</option>
                                <option value="Monotributista">Monotributista</option>
                                <option value="Responsable Inscripto">Responsable Inscripto</option>
                                <option value="Exento">Exento</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Constancia ARCA (PDF/Foto) <span className="text-red-500">*</span></label>
                              <div className="flex gap-2">
                                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] text-slate-600 shadow-sm hover:bg-slate-50">
                                  <Upload className="h-3 w-3" />
                                  Cargar
                                  <input 
                                    type="file" 
                                    accept="image/*,application/pdf"
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileConversion(file, 'arcaConstanciaUrl');
                                    }}
                                  />
                                </label>
                                {dRegData.arcaConstanciaUrl && <span className="text-[9px] text-emerald-600 font-bold self-center">✓ Cargado</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <hr className="border-slate-100" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Datos Bancarios</p>
                      
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">CBU / CVU (22 dígitos) <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          maxLength={22}
                          value={dRegData.cbuCvu}
                          onChange={(e) => setDRegData({ ...dRegData, cbuCvu: e.target.value.replace(/\D/g, '') })}
                          placeholder="0000000000000000000000"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Alias Bancario <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.alias}
                            onChange={(e) => setDRegData({ ...dRegData, alias: e.target.value })}
                            placeholder="alias.mp"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Titular de la Cuenta <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.accountHolder}
                            onChange={(e) => setDRegData({ ...dRegData, accountHolder: e.target.value })}
                            placeholder="Nombre del Titular"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Vehículo */}
                  {dRegStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Marca <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.make}
                            onChange={(e) => setDRegData({ ...dRegData, make: e.target.value })}
                            placeholder="Volkswagen"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Modelo <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.model}
                            onChange={(e) => setDRegData({ ...dRegData, model: e.target.value })}
                            placeholder="Gol Trend"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Año <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.year}
                            onChange={(e) => setDRegData({ ...dRegData, year: e.target.value })}
                            placeholder="2020"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Color <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.color}
                            onChange={(e) => setDRegData({ ...dRegData, color: e.target.value })}
                            placeholder="Blanco"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Patente <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={dRegData.licensePlate}
                            onChange={(e) => setDRegData({ ...dRegData, licensePlate: e.target.value.toUpperCase() })}
                            placeholder="AB 123 CD"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dRegData.hasSutrappa}
                            onChange={(e) => setDRegData({ ...dRegData, hasSutrappa: e.target.checked })}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-tech-blue accent-tech-blue"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-700">¿Posee Licencia SUTRAPPA?</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Marcar si tiene habilitación municipal</p>
                          </div>
                        </label>

                        {dRegData.hasSutrappa && (
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">N° de Licencia SUTRAPPA <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={dRegData.sutrappaLicense}
                                onChange={(e) => setDRegData({ ...dRegData, sutrappaLicense: e.target.value })}
                                placeholder="REM-004512"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Titular de la Licencia <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={dRegData.sutrappaHolder}
                                onChange={(e) => setDRegData({ ...dRegData, sutrappaHolder: e.target.value })}
                                placeholder="Nombre completo"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700 outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documentos del Vehículo (Requeridos) <span className="text-red-500">*</span></p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] text-slate-500">Cédula Verde/Azul Frente</label>
                            <div className="flex gap-2">
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2 py-1 bg-white hover:bg-slate-50">
                                <Upload className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'cedulaFrente')} />
                              </label>
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2 py-1 bg-white hover:bg-slate-50">
                                <Camera className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'cedulaFrente')} />
                              </label>
                              {dRegData.cedulaFrente && <span className="text-[9px] text-emerald-600 font-bold self-center">✓</span>}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] text-slate-500">Cédula Verde/Azul Dorso</label>
                            <div className="flex gap-2">
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2 py-1 bg-white hover:bg-slate-50">
                                <Upload className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'cedulaDorso')} />
                              </label>
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2 py-1 bg-white hover:bg-slate-50">
                                <Camera className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'cedulaDorso')} />
                              </label>
                              {dRegData.cedulaDorso && <span className="text-[9px] text-emerald-600 font-bold self-center">✓</span>}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] text-slate-500">Foto Frontal/45° Vehículo</label>
                            <div className="flex gap-2">
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2 py-1 bg-white hover:bg-slate-50">
                                <Upload className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'fotoVehiculo')} />
                              </label>
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2 py-1 bg-white hover:bg-slate-50">
                                <Camera className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'fotoVehiculo')} />
                              </label>
                              {dRegData.fotoVehiculo && <span className="text-[9px] text-emerald-600 font-bold self-center">✓</span>}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] text-slate-500">RTO (Revisión Técnica)</label>
                            <div className="flex gap-2">
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2 py-1 bg-white hover:bg-slate-50">
                                <Upload className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'rtoDoc')} />
                              </label>
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2 py-1 bg-white hover:bg-slate-50">
                                <Camera className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'rtoDoc')} />
                              </label>
                              {dRegData.rtoDoc && <span className="text-[9px] text-emerald-600 font-bold self-center">✓</span>}
                            </div>
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <label className="block text-[10px] text-slate-500">Seguro Comercial (Póliza)</label>
                            <div className="flex gap-2">
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2.5 py-1 bg-white hover:bg-slate-50">
                                <Upload className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'seguroComercial')} />
                              </label>
                              <label className="flex cursor-pointer items-center justify-center gap-1 rounded border px-2.5 py-1 bg-white hover:bg-slate-50">
                                <Camera className="h-3.5 w-3.5" />
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'seguroComercial')} />
                              </label>
                              {dRegData.seguroComercial && <span className="text-[9px] text-emerald-600 font-bold self-center">✓ Seguro cargado exitosamente</span>}
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  )}

                  {/* STEP 3: Documentación Personal */}
                  {dRegStep === 3 && (
                    <div className="space-y-4">
                      <p className="text-[10px] text-slate-400 mb-4 leading-normal">
                        Adjunte los documentos del conductor utilizando la cámara o subiendo el archivo. Licencia de Conducir y Certificado de Reincidencia son obligatorios; Buena Conducta y Sanidad son opcionales.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-700">Licencia de Conducir <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                            <label className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                              <Upload className="h-3.5 w-3.5" /> Subir
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'driverLicense')} />
                            </label>
                            <label className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                              <Camera className="h-3.5 w-3.5" /> Cámara
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'driverLicense')} />
                            </label>
                          </div>
                          {dRegData.driverLicense && <p className="text-[9px] text-emerald-600 font-bold text-center">✓ Licencia cargada</p>}
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-700">Certificado de Reincidencia <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                            <label className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                              <Upload className="h-3.5 w-3.5" /> Subir
                              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'criminalRecord')} />
                            </label>
                            <label className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                              <Camera className="h-3.5 w-3.5" /> Cámara
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'criminalRecord')} />
                            </label>
                          </div>
                          {dRegData.criminalRecord && <p className="text-[9px] text-emerald-600 font-bold text-center">✓ Reincidencia cargado</p>}
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-700">Buena Conducta (Policía) <span className="text-slate-400 font-normal">(Opcional)</span></label>
                          <div className="flex gap-2">
                            <label className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                              <Upload className="h-3.5 w-3.5" /> Subir
                              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'conductCert')} />
                            </label>
                            <label className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                              <Camera className="h-3.5 w-3.5" /> Cámara
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'conductCert')} />
                            </label>
                          </div>
                          {dRegData.conductCert && <p className="text-[9px] text-emerald-600 font-bold text-center">✓ Buena conducta cargado</p>}
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-700">Certificado de Sanidad <span className="text-slate-400 font-normal">(Opcional)</span></label>
                          <div className="flex gap-2">
                            <label className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                              <Upload className="h-3.5 w-3.5" /> Subir
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'healthCert')} />
                            </label>
                            <label className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                              <Camera className="h-3.5 w-3.5" /> Cámara
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileConversion(e.target.files[0], 'healthCert')} />
                            </label>
                          </div>
                          {dRegData.healthCert && <p className="text-[9px] text-emerald-600 font-bold text-center">✓ Sanidad cargado</p>}
                        </div>

                      </div>
                    </div>
                  )}

                </div>

                <div className="mt-8 border-t border-slate-100 pt-4 flex items-center justify-between">
                  <button
                    onClick={() => { if (dRegStep > 0) setDRegStep(dRegStep - 1); }}
                    disabled={dRegStep === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 shadow-sm disabled:opacity-30"
                  >
                    Anterior
                  </button>
                  <span className="text-[10px] text-slate-400 font-bold">{dRegStep + 1} / 4</span>
                  
                  <button
                    onClick={handleDriverNext}
                    className="flex items-center gap-1.5 rounded-xl text-white px-5 py-2 text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    style={{ backgroundColor: dRegStep === 3 ? '#059669' : '#FF5A19' }}
                  >
                    {dRegStep === 3 ? 'Completar Registro' : 'Siguiente'}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal Institucional: Visión, Misión y Valores */}
      {institutionalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 text-slate-800">
            <button
              type="button"
              onClick={() => setInstitutionalModal(null)}
              aria-label="Cerrar modal"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex gap-2 border-b border-slate-100 pb-4 mb-5">
              {(['vision', 'mision', 'valores'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInstitutionalModal(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors cursor-pointer ${
                    institutionalModal === tab
                      ? 'bg-[#0a2a5b] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'vision' ? 'Visión' : tab === 'mision' ? 'Misión' : 'Valores'}
                </button>
              ))}
            </div>

            <h3 className="text-2xl font-semibold text-[#1d1d1f] mb-3">
              {institutionalModal === 'vision'
                ? 'Nuestra Visión'
                : institutionalModal === 'mision'
                ? 'Nuestra Misión'
                : 'Nuestros Valores'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {institutionalModal === 'vision'
                ? 'Consolidar la red de movilidad urbana y corporativa más confiable, segura y tecnológica de Argentina, integrando traslados urbanos con todo el ecosistema TravelApp.'
                : institutionalModal === 'mision'
                ? 'Conectar pasajeros y empresas con conductores profesionales certificados mediante tarifas transparentes, monitoreo satelital 24/7 y un modelo justo para quien conduce.'
                : 'Seguridad verificada, puntualidad, transparencia tarifaria, respeto por el conductor y excelencia en cada trayecto.'}
            </p>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Pedido: Invitado (solo Efectivo + Nombre + WhatsApp) vs Usuario (Login) */}
      {requestTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative border border-slate-200 text-[#1d1d1f]">
            <button
              type="button"
              onClick={() => setRequestTripModalOpen(false)}
              aria-label="Cerrar modal de pedido"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">
                Confirmar Traslado
              </span>
              <h3 className="text-xl font-semibold text-[#1d1d1f] mt-1">
                ¿Cómo querés pedir tu viaje?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tarifa estimada: <strong className="text-[#0a2a5b]">{calculatedPrice || '--'}</strong> · {modality === 'MU' ? 'Movilidad Urbana' : modality === 'ARC' ? 'Compartido' : 'Traslados'}
              </p>
            </div>

            {/* Selector Invitado vs Usuario */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 mb-5">
              <button
                type="button"
                onClick={() => {
                  setBookingType('guest');
                  setPaymentMethod('Efectivo');
                  setLoginError('');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  bookingType === 'guest'
                    ? 'bg-white text-[#0a2a5b] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Invitado
              </button>
              <button
                type="button"
                onClick={() => {
                  setBookingType('registered');
                  setLoginError('');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  bookingType === 'registered'
                    ? 'bg-white text-[#0a2a5b] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Usuario TravelApp
              </button>
            </div>

            {bookingType === 'guest' ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-amber-50 border border-amber-200/80 px-3.5 py-2.5 text-xs text-amber-900">
                  Los viajes como <strong>Invitado</strong> solo están habilitados en <strong>Efectivo</strong>. Para abonar con Mercado Pago o Puntos Rewards, ingresá como Usuario.
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Ej: María González"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:bg-white focus:border-[#0a2a5b]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    WhatsApp de contacto *
                  </label>
                  <input
                    type="tel"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="Ej: +54 9 381 555 1234"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:bg-white focus:border-[#0a2a5b]"
                  />
                </div>

                {loginError && <p className="text-xs font-medium text-red-600">{loginError}</p>}

                <button
                  type="button"
                  onClick={() => {
                    if (!passengerName.trim() || !passengerPhone.trim()) {
                      setLoginError('Por favor completá tu nombre y WhatsApp para confirmar.');
                      return;
                    }
                    setLoginError('');
                    setPaymentMethod('Efectivo');
                    setRequestTripModalOpen(false);
                    handleSelectVehicle(selectedVehicle || categories[0] || { id: 'estandar', name: 'TravelCab Standard' });
                  }}
                  className="w-full py-3 rounded-full bg-[#0a2a5b] hover:bg-[#071d3f] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Confirmar Viaje en Efectivo
                </button>
              </div>
            ) : !isLoggedIn ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ingresá con tu cuenta TravelApp para abonar con <strong>{paymentMethod}</strong> y sumar o canjear Puntos Rewards.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="usuario@travelapp.ar"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:bg-white focus:border-[#0a2a5b]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:bg-white focus:border-[#0a2a5b]"
                  />
                </div>

                {loginError && <p className="text-xs font-medium text-red-600">{loginError}</p>}

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={async () => {
                    if (!loginEmail.trim() || !loginPassword) {
                      setLoginError('Ingresá tu email y contraseña.');
                      return;
                    }
                    setAuthLoading(true);
                    setLoginError('');
                    try {
                      const cred = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
                      setIsLoggedIn(true);
                      if (!passengerName.trim()) {
                        setPassengerName(cred.user.displayName || loginEmail.split('@')[0]);
                      }
                      if (!passengerPhone.trim()) {
                        setPassengerPhone(cred.user.phoneNumber || '');
                      }
                    } catch (err: any) {
                      setLoginError(
                        err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password'
                          ? 'Email o contraseña incorrectos.'
                          : 'No se pudo iniciar sesión. Verificá tus datos.'
                      );
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {authLoading ? 'Ingresando...' : 'Iniciar sesión y continuar'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-800">Sesión iniciada ✓</p>
                    <p className="text-sm font-semibold text-slate-900">{passengerName || loginEmail}</p>
                    <p className="text-xs text-slate-600">Medio de pago: {paymentMethod}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoggedIn(false);
                      setPassengerName('');
                      setPassengerPhone('');
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-red-600 underline cursor-pointer"
                  >
                    Cambiar cuenta
                  </button>
                </div>

                {!passengerPhone.trim() && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      WhatsApp de contacto *
                    </label>
                    <input
                      type="tel"
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      placeholder="Ej: +54 9 381 555 1234"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:bg-white focus:border-[#0a2a5b]"
                    />
                  </div>
                )}

                {loginError && <p className="text-xs font-medium text-red-600">{loginError}</p>}

                <button
                  type="button"
                  onClick={() => {
                    if (!passengerPhone.trim()) {
                      setLoginError('Ingresá un número de WhatsApp para coordinar el móvil.');
                      return;
                    }
                    setLoginError('');
                    setRequestTripModalOpen(false);
                    handleSelectVehicle(selectedVehicle || categories[0] || { id: 'estandar', name: 'TravelCab Standard' });
                  }}
                  className="w-full py-3 rounded-full bg-[#0a2a5b] hover:bg-[#071d3f] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Confirmar Viaje ({paymentMethod})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Criterios de Selección por Servicio (Editable desde CMS) */}
      {serviceCriteriaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative border border-slate-200 text-[#1d1d1f]">
            <button
              type="button"
              onClick={() => setServiceCriteriaModal(null)}
              aria-label="Cerrar criterios"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">
              {serviceCriteriaModal.tag || 'Criterios de Servicio'}
            </span>
            <h3 className="text-xl font-semibold text-[#1d1d1f] mt-1 mb-4">
              {serviceCriteriaModal.criteriaTitle || `Criterios de Selección · ${serviceCriteriaModal.title}`}
            </h3>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-5">
              {serviceCriteriaModal.criteriaText || 'Consultá las condiciones de cobertura, equipaje y vehículos habilitados para este servicio.'}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setServiceCriteriaModal(null)}
                className="px-4 py-2.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const mod = (serviceCriteriaModal.modality || serviceCriteriaModal.id || 'MU') as 'MU' | 'ARC' | 'TRANSFER';
                  setServiceCriteriaModal(null);
                  setViewMode('passenger');
                  setModality(mod);
                  setShowQuoteMap(false);
                  setTimeout(() => {
                    document.getElementById('web-dispatcher-card')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="px-5 py-2.5 rounded-full bg-[#0a2a5b] hover:bg-[#071d3f] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {serviceCriteriaModal.ctaText || 'Ir al Despachador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Requisitos de Aceptación Conductores y Vehículos (Editable desde CMS) */}
      {driverReqsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 text-[#1d1d1f] max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setDriverReqsModalOpen(false)}
              aria-label="Cerrar requisitos"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">
              {(cmsData as any).driverRequirements?.badge || 'REQUISITOS DE ACEPTACIÓN'}
            </span>
            <h3 className="text-2xl font-semibold text-[#1d1d1f] mt-1">
              {(cmsData as any).driverRequirements?.title || 'Requisitos para Conductores y Vehículos'}
            </h3>
            <p className="text-sm text-slate-600 mt-1 mb-6">
              {(cmsData as any).driverRequirements?.subtitle || 'Conocé los criterios obligatorios para postularte y mantener tu cuenta activa en TravelCab.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0a2a5b]">
                  Requisitos del Conductor
                </h4>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {(cmsData as any).driverRequirements?.driverReqs ||
                    '• Licencia de conducir profesional vigente (Clase D1 o equivalente local).\n• DNI argentino vigente y CUIL/CUIT activo.\n• Certificado de antecedentes penales actualizado.\n• Teléfono smartphone con GPS y datos móviles.\n• Cuenta de Mercado Pago o CBU/CVU para liquidaciones.'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0a2a5b]">
                  Requisitos del Vehículo
                </h4>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {(cmsData as any).driverRequirements?.vehicleReqs ||
                    '• Modelo 2018 o superior en excelente estado estético y mecánico.\n• 4 o 5 puertas, aire acondicionado y calefacción funcionando.\n• Seguro automotor vigente con cobertura para transporte de pasajeros / comercial.\n• VTV / RTO técnica al día y cédula verde/azul habilitante.'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDriverReqsModalOpen(false)}
                className="px-4 py-2.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setDriverReqsModalOpen(false);
                  setDRegStep(0);
                  setDRegSubmitted(false);
                  setRegisterModal({ isOpen: true, role: 'driver' });
                }}
                className="px-6 py-2.5 rounded-full bg-[#0a2a5b] hover:bg-[#071d3f] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Registrarme como Conductor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PushPop Promocional editable desde CMS */}
      <OtaPromoPushPop config={(cmsData as any).promoPushPop} />

      {/* Travis Omnichannel Live Chat */}
      <TravisOmnichannelWidget
        businessUnit="TravelCab"
        primaryColor="#FF5A19"
        brandName="TravelCab"
        whatsappUrl={cmsData.dispatcher?.whatsappConfig?.phone ? `https://wa.me/${cmsData.dispatcher.whatsappConfig.phone}` : "https://wa.me/5493812000712"}
        instagramUrl="https://instagram.com/travelcab.ar"
      />

    </div>
  );
}
