'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Plane,
  Compass,
  Sparkles,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Upload,
  Smartphone,
  DatabaseZap,
  CheckCircle2,
  Building2,
  Ship,
  Bus,
  Calendar,
  MapPin,
  Tag,
  ExternalLink,
  Ticket,
  Search,
  Filter,
  DollarSign,
  Utensils,
  Hotel,
  Award,
  Globe,
  Users,
  Luggage,
  Crown,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  Check
} from 'lucide-react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tour } from '@/types/experiences';
import {
  OtaPackage,
  OtaPackageType,
  OtaProviderType,
  OtaProviderCategory,
  OtaModality,
  OtaTransportType,
  OtaBusType,
  OtaFoodPlan,
  OtaActionType
} from '@/types/ota';
import { DEFAULT_OTA_PACKAGES } from '@/lib/mockOtaPackages';
import { TourCard } from '@/components/experiences/TourCard';

const SEED_RECEPTIVO_TOURS: Tour[] = [
  {
    id: 'EXP-NOA-001',
    title: 'Cafayate & Quebrada de las Conchas',
    location: 'Valles Calchaquíes, Salta / Tucumán',
    price: 98000,
    currency: 'ARS',
    priceRewards: 84000,
    pointsEarned: 150,
    tripType: 'Grupal',
    scope: 'Nacional',
    tourismVertical: 'receptivo',
    productType: 'experiencia_dia',
    transportation: 'Sprinter Ejecutiva VIP (TravelCab)',
    departureDate: 'Salidas Diarias 07:30 hs',
    departureOrigin: 'Pick-up por Hoteles Céntricos (Tucumán / Salta)',
    duration: 'Día Completo (12 hs)',
    difficulty: 'Baja',
    minPassengers: 2,
    services: [
      'Traslado Ida y Vuelta en Unidad Ejecutiva TravelCab',
      'Paradas fotográficas en Garganta del Diablo y El Anfiteatro',
      'Visita guiada y degustación en 2 Bodegas de Altura en Cafayate',
      'Guía profesional habilitado durante todo el recorrido'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1400&q=85',
    images: [
      'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1400&q=85'
    ],
    description: 'Formaciones rojizas milenarias, el Anfiteatro natural y degustación exclusiva en bodegas de altura.',
    detail: 'Recorremos la majestuosa Ruta Nacional 68 atravesando la Reserva Natural Quebrada de las Conchas. Visitamos Los Castillos, Las Ventanas, El Obelisco, La Yesera, El Anfiteatro y La Garganta del Diablo. Al llegar a Cafayate, disfrutamos de degustaciones de vinos Torrontés y Malbec de altura en bodegas boutique e históricas.',
    observations: 'Llevar calzado cómodo, protector solar y abrigo liviano.',
    availability: 'Disponible',
    cardTheme: 'light-ice',
    b2bEnabled: true,
    hotelCommissionPct: 15
  },
  {
    id: 'EXP-NOA-002',
    title: 'Tafí del Valle & Ruinas de Quilmes',
    location: 'Tucumán, Argentina',
    price: 85000,
    currency: 'ARS',
    priceRewards: 72000,
    pointsEarned: 130,
    tripType: 'Grupal',
    scope: 'Nacional',
    tourismVertical: 'receptivo',
    productType: 'experiencia_dia',
    transportation: 'Combi Ejecutiva / SUV TravelCab',
    departureDate: 'Salidas Diarias 08:00 hs',
    departureOrigin: 'San Miguel de Tucumán (Pick-up Hoteles)',
    duration: 'Día Completo (10 hs)',
    difficulty: 'Media',
    minPassengers: 2,
    services: [
      'Ascenso escénico por la Quebrada de los Sosa y El Indio',
      'Visita a Tafí del Valle, Dique La Angostura y El Mollar',
      'Recorrido guiado por la Ciudad Sagrada de Quilmes (Abra del Infiernillo 3.042 msnm)',
      'Asistencia permanente y coordinación TravelApp'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1400&q=85',
    images: [
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85'
    ],
    description: 'Ascenso por la selva de Yungas hasta el Abra del Infiernillo y la mística Ciudad Sagrada de Quilmes.',
    detail: 'Iniciamos el ascenso por la RP 307 internándonos en la Quebrada del Río Los Sosa con paradas en el monumento al Indio y Parque Los Menhires. Visitamos la villa veraniega de Tafí del Valle, cruzamos el Abra del Infiernillo a 3.042 metros sobre el nivel del mar y descendemos hacia los Valles Calchaquíes para recorrer a pie la histórica Ciudad Sagrada de los Quilmes y su Centro de Interpretación.',
    observations: 'No incluye entrada al Centro de Interpretación Quilmes.',
    availability: 'Disponible',
    cardTheme: 'light-sky',
    b2bEnabled: true,
    hotelCommissionPct: 15
  },
  {
    id: 'EXP-NOA-003',
    title: 'Salinas Grandes & Purmamarca 4x4',
    location: 'Jujuy / Salta, Argentina',
    price: 125000,
    currency: 'ARS',
    priceRewards: 108000,
    pointsEarned: 210,
    tripType: 'Grupal',
    scope: 'Nacional',
    tourismVertical: 'receptivo',
    productType: 'experiencia_dia',
    transportation: 'Camioneta 4x4 / Minibús de Altura',
    departureDate: 'Salidas Diarias 07:00 hs',
    departureOrigin: 'Salta Capital / San Salvador de Jujuy',
    duration: 'Día Completo (13 hs)',
    difficulty: 'Media',
    minPassengers: 2,
    services: [
      'Recorrido por Purmamarca y Paseo de los Colorados',
      'Ascenso escénico por Cuesta de Lipán (4.170 msnm)',
      'Tiempo libre y sesión fotográfica en los piletones de Salinas Grandes',
      'Guía especializado en Puna y Quebrada'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=85',
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=85'
    ],
    description: 'El desierto blanco a más de 3.450 msnm y el Cerro de los Siete Colores en una travesía inolvidable.',
    detail: 'Partimos temprano hacia el pueblo de Purmamarca para admirar el Cerro de los Siete Colores con la luz matinal y su feria artesanal. Luego ascendemos por la imponente Cuesta de Lipán (alcanzando los 4.170 msnm en el Abra de Potrerillos) hasta desembocar en la inmensidad blanca de las Salinas Grandes, donde visitamos los ojos de agua turquesa y las esculturas de sal.',
    observations: 'Se recomienda hidratación constante y lentes de sol con filtro UV.',
    availability: 'Cupos Limitados',
    cardTheme: 'dark',
    b2bEnabled: true,
    hotelCommissionPct: 15
  },
  {
    id: 'EXP-NOA-004',
    title: 'Tren a las Nubes & San Antonio de los Cobres',
    location: 'Puna Salteña, Salta',
    price: 145000,
    currency: 'ARS',
    priceRewards: 128000,
    pointsEarned: 250,
    tripType: 'Grupal',
    scope: 'Nacional',
    tourismVertical: 'receptivo',
    productType: 'experiencia_dia',
    transportation: 'Bus Turístico + Formación Ferroviaria',
    departureDate: 'Martes, Jueves y Sábados 06:15 hs',
    departureOrigin: 'Salta Capital (Pick-up Hoteles)',
    duration: 'Día Completo (14 hs)',
    difficulty: 'Alta',
    minPassengers: 1,
    services: [
      'Traslado en unidad climatizada por Quebrada del Toro y Santa Rosa de Tastil',
      'Desayuno campestre en Alfarcito y merienda regional',
      'Ticket oficial del Tren a las Nubes hasta el Viaducto La Polvorilla (4.220 msnm)',
      'Asistencia médica a bordo y oxígeno preventivo'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=85',
    images: [
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1400&q=85'
    ],
    description: 'Ingeniería ferroviaria a 4.220 metros de altura cruzando el mítico Viaducto La Polvorilla.',
    detail: 'Una de las obras de ingeniería ferroviaria más altas del mundo. Recorremos por ruta la Quebrada del Toro, el zigzagueo del Alisal y la Fundación Alfarcito del Padre Chifri. En San Antonio de los Cobres abordamos la mítica formación ferroviaria que nos lleva hasta el Viaducto La Polvorilla a 4.220 msnm, donde presenciamos el emocionante izamiento de la bandera.',
    observations: 'Sujeto a condiciones climáticas de alta montaña.',
    availability: 'Disponible',
    cardTheme: 'dark',
    b2bEnabled: true,
    hotelCommissionPct: 15
  },
  {
    id: 'EXP-NOA-005',
    title: 'City Tour Histórico Tucumán & San Javier',
    location: 'San Miguel de Tucumán & Yerba Buena',
    price: 52000,
    currency: 'ARS',
    priceRewards: 44000,
    pointsEarned: 90,
    tripType: 'Individual',
    scope: 'Nacional',
    tourismVertical: 'receptivo',
    productType: 'experiencia_dia',
    transportation: 'Sedán / SUV Ejecutiva TravelCab',
    departureDate: 'Salidas Diarias 09:00 y 15:00 hs',
    departureOrigin: 'Hoteles de San Miguel de Tucumán y Yerba Buena',
    duration: 'Medio Día (5 hs)',
    difficulty: 'Baja',
    minPassengers: 2,
    services: [
      'Recorrido por Plaza Independencia, Casa de Gobierno y Casa Histórica',
      'Paseo por Parque 9 de Julio y Ciudad Jardín de Yerba Buena',
      'Ascenso por la yungas hasta el Cerro San Javier y Cristo Bendicente',
      'Traslado privado o regular en flota TravelCab'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=85',
    images: [
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1400&q=85'
    ],
    description: 'Cuna de la Independencia, templos históricos y vista panorámica desde la cumbre del Cerro San Javier.',
    detail: 'Descubrimos el corazón histórico del Jardín de la República visitando los alrededores de la Plaza Independencia, la Catedral, la Casa de Gobierno de estilo Art Nouveau, el Museo de la Industria Azucarera en el Parque 9 de Julio y la emblemática Casa Histórica de la Independencia. Continuamos hacia Yerba Buena y ascendemos por el camino de yungas hasta el Cristo Bendicente en el Cerro San Javier.',
    observations: 'Ideal para combinar con el espectáculo de Luz y Sonido por la noche.',
    availability: 'Disponible',
    cardTheme: 'light-ice',
    b2bEnabled: true,
    hotelCommissionPct: 15
  },
  {
    id: 'EXP-NOA-006',
    title: 'Ruta del Vino de Altura & Cachi Místico',
    location: 'Cachi & Parque Nacional Los Cardones, Salta',
    price: 112000,
    currency: 'ARS',
    priceRewards: 95000,
    pointsEarned: 180,
    tripType: 'Grupal',
    scope: 'Nacional',
    tourismVertical: 'receptivo',
    productType: 'experiencia_dia',
    transportation: 'Van Ejecutiva Mercedes-Benz (TravelCab)',
    departureDate: 'Salidas Diarias 07:30 hs',
    departureOrigin: 'Salta Capital (Pick-up Hoteles)',
    duration: 'Día Completo (11 hs)',
    difficulty: 'Baja',
    minPassengers: 2,
    services: [
      'Ascenso por la Cuesta del Obispo y Piedra del Molino (3.348 msnm)',
      'Travesía por la Recta del Tin-Tin y Parque Nacional Los Cardones',
      'Visita al pueblo colonial de Cachi, Iglesia San José y Museo Arqueológico',
      'Degustación en bodega de altura calchaquí'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=85',
    images: [
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1400&q=85'
    ],
    description: 'Cuesta del Obispo, Parque Nacional Los Cardones y el encanto colonial de Cachi entre viñedos.',
    detail: 'Atravesamos la Quebrada de Escoipe y trepamos la zigzagueante Cuesta del Obispo hasta alcanzar la Piedra del Molino a 3.348 msnm. Cruzamos el Parque Nacional Los Cardones por la histórica Recta del Tin-Tin (trazada por los Incas) con vistas al Nevado de Cachi, para almorzar y recorrer las calles adoquinadas y bodegas de altura de Cachi.',
    observations: 'Salidas garantizadas todos los días del año.',
    availability: 'Disponible',
    cardTheme: 'light-sky',
    b2bEnabled: true,
    hotelCommissionPct: 15
  },
  {
    id: 'EXP-REC-001',
    title: 'Mendoza Wine Tour Premium & Bodegas',
    location: 'Mendoza, Argentina',
    price: 350,
    currency: 'USD',
    priceRewards: 280,
    pointsEarned: 150,
    tripType: 'Grupal',
    scope: 'Nacional',
    tourismVertical: 'receptivo',
    productType: 'experiencia_dia',
    transportation: 'SUV Premium 4x4 (TravelCab)',
    departureDate: 'Salidas Diarias 09:00 hs',
    departureOrigin: 'Mendoza Capital (Pick-up hotel)',
    duration: 'Día Completo (9 hs)',
    difficulty: 'Baja',
    minPassengers: 2,
    services: ['Degustación Premium en 3 Bodegas', 'Almuerzo 5 pasos maridado', 'Guía Sommelier Bilingüe', 'Traslados in/out con TravelCab'],
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Recorrido exclusivo por 3 de las mejores bodegas del Valle de Uco, terminando con un almuerzo maridado de primer nivel.',
    detail: 'Experiencia enológica privada o en grupos reducidos por Luján de Cuyo y Valle de Uco. Incluye degustación dirigida de líneas Reserva y Gran Reserva en tres bodegas seleccionadas al pie de la Cordillera de los Andes, finalizando con un almuerzo gourmet de 5 pasos maridado.',
    observations: 'Cupos limitados por protocolo de bodega. Consultar por salidas privadas.',
    availability: 'Disponible',
    cardTheme: 'light-ice',
    b2bEnabled: true,
    hotelCommissionPct: 15,
  }
];

export default function ExperienceCatalogPage() {
  // Selector de Unidad de Negocio / Vertical
  const [activeVertical, setActiveVertical] = useState<'emisivo' | 'receptivo'>('emisivo');

  // Estados de datos
  const [otaPackages, setOtaPackages] = useState<OtaPackage[]>([]);
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'propio' | 'mayorista'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal y Edición: Turismo Emisivo
  const [isEmisivoModalOpen, setIsEmisivoModalOpen] = useState(false);
  const [editingOtaPkg, setEditingOtaPkg] = useState<Partial<OtaPackage> | null>(null);
  const [datesInput, setDatesInput] = useState('');
  const [servicesInput, setServicesInput] = useState('');

  // Modal y Edición: Turismo Receptivo
  const [isReceptivoModalOpen, setIsReceptivoModalOpen] = useState(false);
  const [editingReceptivoTour, setEditingReceptivoTour] = useState<Partial<Tour> | null>(null);
  const [recServicesInput, setRecServicesInput] = useState('');
  const [recImagesInput, setRecImagesInput] = useState('');

  // 1. Escuchar paquetes emisivos desde Firestore (colección ota_packages)
  useEffect(() => {
    const unsubOta = onSnapshot(collection(db, 'ota_packages'), (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OtaPackage));
        setOtaPackages(list);
      } else {
        setOtaPackages(DEFAULT_OTA_PACKAGES);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Firestore ota_packages fallback:", err);
      setOtaPackages(DEFAULT_OTA_PACKAGES);
      setLoading(false);
    });

    return () => unsubOta();
  }, []);

  // 2. Escuchar tours y experiencias desde Firestore (colección experiences)
  useEffect(() => {
    const unsubExperiences = onSnapshot(collection(db, 'experiences'), (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tour));
        setAllTours(list);
      } else {
        setAllTours(SEED_RECEPTIVO_TOURS);
      }
    }, (err) => {
      console.warn("Firestore experiences fallback:", err);
      setAllTours(SEED_RECEPTIVO_TOURS);
    });

    return () => unsubExperiences();
  }, []);

  // Filtrado de paquetes emisivos
  const filteredEmisivoPackages = useMemo(() => {
    return otaPackages.filter(pkg => {
      const matchesSearch = searchQuery === '' ||
        pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pkg.operatorName || '').toLowerCase().includes(searchQuery.toLowerCase());

      const isPropio = pkg.providerCategory === 'propio' || pkg.providerType === 'propio';
      const matchesProvider = filterProvider === 'all' || (filterProvider === 'propio' ? isPropio : !isPropio);
      const matchesType = filterType === 'all' || pkg.type === filterType;

      return matchesSearch && matchesProvider && matchesType;
    });
  }, [otaPackages, searchQuery, filterProvider, filterType]);

  // Filtrado de excursiones receptivas
  const filteredReceptivoTours = useMemo(() => {
    const receptivoList = allTours.filter(t => t.tourismVertical === 'receptivo' || (!t.tourismVertical && !t.scope?.includes('Internacional')));
    const displayList = receptivoList.length > 0 ? receptivoList : SEED_RECEPTIVO_TOURS;

    return displayList.filter(t => {
      const matchesSearch = searchQuery === '' ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [allTours, searchQuery]);

  // Inyectar paquetes oficiales de Turismo Emisivo a Firestore (Colección exclusiva: ota_packages)
  const handleSeedEmisivo = async () => {
    setIsSeeding(true);
    try {
      for (const pkg of DEFAULT_OTA_PACKAGES) {
        await setDoc(doc(db, 'ota_packages', pkg.id), {
          ...pkg,
          updatedAt: new Date().toISOString()
        });
        // Limpiar cualquier copia histórica de paquetes emisivos dentro de 'experiences' para que no se mezclen las bases de datos
        try {
          await deleteDoc(doc(db, 'experiences', pkg.id));
        } catch {
          // Ignorar si no existía en experiences
        }
      }
      alert('¡Paquetes Emisivos inyectados exclusivamente en la base de datos de Emisivo (ota_packages) sin mezclarse con Receptivo!');
    } catch (err: any) {
      console.error("Error al inyectar paquetes emisivos:", err);
      alert(`Error al inyectar paquetes emisivos: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Inyectar excursiones de Turismo Receptivo a Firestore (Colección exclusiva: experiences)
  const handleSeedReceptivo = async () => {
    setIsSeeding(true);
    try {
      // Limpiar de 'experiences' cualquier paquete emisivo/internacional residual
      for (const t of allTours) {
        if (
          t.id.startsWith('OTA-PKG-') ||
          t.tourismVertical === 'emisivo' ||
          t.scope === 'Internacional'
        ) {
          try {
            await deleteDoc(doc(db, 'experiences', t.id));
          } catch {
            // Ignorar
          }
        }
      }
      for (const tour of SEED_RECEPTIVO_TOURS) {
        await setDoc(doc(db, 'experiences', tour.id), {
          ...tour,
          tourismVertical: 'receptivo',
          scope: 'Nacional'
        });
      }
      alert('¡Excursiones receptivas oficiales sincronizadas en la base exclusiva de Receptivo (experiences) para Luna Viajera y TravelApp Experience!');
    } catch (err: any) {
      console.error("Error al inyectar excursiones receptivas:", err);
      alert(`Error al inyectar receptivo: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Abrir editor Emisivo
  const handleOpenEmisivoEditor = (pkg?: OtaPackage) => {
    if (pkg) {
      setEditingOtaPkg({ ...pkg });
      setDatesInput((pkg.departureDates || []).join(', '));
      setServicesInput((pkg.includedServices || []).join('\n'));
    } else {
      const newId = `OTA-PKG-${Math.floor(100 + Math.random() * 900)}`;
      setEditingOtaPkg({
        id: newId,
        title: '',
        destination: '',
        country: 'Argentina',
        region: 'Internacional',
        type: 'paquete',
        modality: 'Salida Grupal Acompañada',
        providerCategory: 'operador_verificado',
        providerType: 'mayorista',
        operatorName: 'Juliá Tours',
        stockBadge: '',
        durationDays: 7,
        durationNights: 6,
        departureDates: ['15 Nov 2026'],
        departureOrigin: 'Buenos Aires (Ezeiza)',
        transportType: 'Aéreo',
        airline: 'Aerolíneas Argentinas',
        luggageIncluded: 'Equipaje en bodega incluido',
        busType: 'Cama',
        cruiseCabin: '',
        cruisePorts: '',
        hotelName: '',
        hotelStars: 4,
        foodPlan: 'Media Pensión',
        currency: 'USD',
        price: 1500,
        memberPrice: 1350,
        financingText: 'Hasta 6 cuotas fijas',
        rewardsPointsEarned: 500,
        rewardsPointsRequired: 12000,
        enabledActions: ['ver_detalle', 'whatsapp', 'reservar'],
        badge: '🔥 PAQUETE DESTACADO',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85',
        description: '',
        includedServices: ['Vuelos ida y vuelta con equipaje', 'Traslados in/out', 'Alojamiento con régimen indicado', 'Asistencia al viajero'],
      });
      setDatesInput('15 Nov 2026, 05 Dic 2026');
      setServicesInput('Vuelos ida y vuelta con equipaje\nTraslados in/out\nAlojamiento con régimen indicado\nAsistencia al viajero');
    }
    setIsEmisivoModalOpen(true);
  };

  // Toggle de acción seleccionable
  const toggleAction = (act: OtaActionType) => {
    setEditingOtaPkg(prev => {
      if (!prev) return null;
      const current = prev.enabledActions || ['ver_detalle', 'whatsapp', 'reservar'];
      const updated = current.includes(act)
        ? current.filter(a => a !== act)
        : [...current, act];
      return { ...prev, enabledActions: updated };
    });
  };

  // Guardar paquete Emisivo
  const handleSaveEmisivoPackage = async () => {
    if (!editingOtaPkg?.id || !editingOtaPkg.title || !editingOtaPkg.destination) {
      alert('Por favor completá los campos obligatorios (ID, Título, Destino).');
      return;
    }

    try {
      const departureDates = datesInput
        .split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0);

      const includedServices = servicesInput
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const completePkg: OtaPackage = {
        ...(editingOtaPkg as OtaPackage),
        departureDates: departureDates.length > 0 ? departureDates : ['Salidas regulares'],
        includedServices: includedServices.length > 0 ? includedServices : ['Alojamiento y traslados'],
        enabledActions: editingOtaPkg?.enabledActions || ['ver_detalle', 'whatsapp', 'reservar'],
        currency: editingOtaPkg.currency || 'USD',
        price: Number(editingOtaPkg.price) || 0,
        memberPrice: editingOtaPkg.memberPrice ? Number(editingOtaPkg.memberPrice) : undefined,
        priceUsd: editingOtaPkg.currency === 'USD' ? Number(editingOtaPkg.price) : Math.round((Number(editingOtaPkg.price) || 0) / 1300),
        priceArs: editingOtaPkg.currency === 'ARS' ? Number(editingOtaPkg.price) : Math.round((Number(editingOtaPkg.price) || 0) * 1300),
      };

      // Guardar exclusivamente en ota_packages (Base de datos de Turismo Emisivo)
      await setDoc(doc(db, 'ota_packages', completePkg.id), {
        ...completePkg,
        createdAt: (editingOtaPkg as any)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Asegurar que no exista copia en 'experiences' (Receptivo) para evitar mezcla de catálogos
      try {
        await deleteDoc(doc(db, 'experiences', completePkg.id));
      } catch {
        // Ignorar si no existía
      }

      setIsEmisivoModalOpen(false);
      alert('¡Paquete Emisivo guardado en la base exclusiva de Turismo Emisivo (ota_packages)!');
    } catch (err: any) {
      console.error("Error al guardar paquete:", err);
      alert(`Error al guardar: ${err.message}`);
    }
  };

  // Eliminar paquete Emisivo
  const handleDeleteEmisivoPackage = async (id: string) => {
    if (!confirm('¿Seguro que deseás eliminar este paquete emisivo de TravelMarket?')) return;
    try {
      await deleteDoc(doc(db, 'ota_packages', id));
      await deleteDoc(doc(db, 'experiences', id));
      alert('Paquete eliminado.');
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  // Abrir editor Receptivo
  const handleOpenReceptivoEditor = (tour?: Tour) => {
    if (tour) {
      setEditingReceptivoTour({ ...tour });
      setRecServicesInput((tour.services || []).join('\n'));
      setRecImagesInput((tour.images || (tour.imageUrl ? [tour.imageUrl] : [])).join('\n'));
    } else {
      const newId = `EXP-REC-${Math.floor(100 + Math.random() * 900)}`;
      const defaultImage = 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&q=80&w=1400';
      setEditingReceptivoTour({
        id: newId,
        title: '',
        location: 'Salta, Argentina',
        price: 90000,
        currency: 'ARS',
        priceRewards: 72000,
        pointsEarned: 120,
        tripType: 'Grupal',
        scope: 'Nacional',
        tourismVertical: 'receptivo',
        productType: 'experiencia_dia',
        transportation: 'SUV 4x4 (TravelCab)',
        departureDate: 'Salidas Diarias 08:00 hs',
        departureOrigin: 'Pick-up por Hoteles Céntricos',
        duration: 'Día Completo (10 hs)',
        difficulty: 'Baja',
        minPassengers: 2,
        services: ['Guía Bilingüe', 'Traslados ida y vuelta con TravelCab', 'Entradas incluidas'],
        imageUrl: defaultImage,
        images: [defaultImage],
        description: '',
        detail: '',
        availability: 'Disponible',
        cardTheme: 'light-ice',
        b2bEnabled: true,
        hotelCommissionPct: 15
      });
      setRecServicesInput('Guía Bilingüe\nTraslados ida y vuelta con TravelCab\nEntradas incluidas');
      setRecImagesInput(defaultImage);
    }
    setIsReceptivoModalOpen(true);
  };

  // Guardar excursión Receptivo
  const handleSaveReceptivoTour = async () => {
    if (!editingReceptivoTour?.id || !editingReceptivoTour.title) {
      alert('Por favor completá los campos obligatorios (ID, Título).');
      return;
    }

    try {
      const services = recServicesInput
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const images = recImagesInput
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const primaryImage = editingReceptivoTour.imageUrl || images[0] || 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&q=80&w=1400';

      const completeTour: Tour = {
        ...(editingReceptivoTour as Tour),
        tourismVertical: 'receptivo',
        imageUrl: primaryImage,
        images: images.length > 0 ? images : [primaryImage],
        duration: editingReceptivoTour.duration || 'Día Completo (10 hs)',
        difficulty: editingReceptivoTour.difficulty || 'Baja',
        minPassengers: Number(editingReceptivoTour.minPassengers) || 2,
        services: services.length > 0 ? services : ['Guía y traslados']
      };

      await setDoc(doc(db, 'experiences', completeTour.id), completeTour);
      setIsReceptivoModalOpen(false);
      alert('¡Excursión Receptiva guardada y sincronizada con éxito en Web y Marketplace!');
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    }
  };

  // Eliminar excursión Receptivo
  const handleDeleteReceptivoTour = async (id: string) => {
    if (!confirm('¿Seguro que deseás eliminar esta excursión receptiva?')) return;
    try {
      await deleteDoc(doc(db, 'experiences', id));
      alert('Excursión eliminada.');
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header con Selector de Unidad de Negocios */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tech-blue/10 border border-tech-blue/20 text-tech-blue text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Concorde 360 · Catálogos por Unidad de Negocio</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Catálogos de las 3 Unidades de Negocio
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <strong>TravelApp</strong> comercializa Turismo Emisivo (`/marketplace`), mientras que <strong>Luna Viajera (B2C)</strong> y <strong>TravelApp Experience (B2B Hoteles)</strong> comparten el mismo inventario de Excursiones NOA.
          </p>
        </div>

        {/* Pestañas de Negocio: Emisivo vs Receptivo Compartido */}
        <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200/80 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveVertical('emisivo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeVertical === 'emisivo'
                ? 'bg-tech-blue text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plane className="h-4 w-4" />
            <span>1. TravelApp (Emisivo & Marketplace)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveVertical('receptivo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeVertical === 'receptivo'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>2 & 3. Luna Viajera (B2C) + Experience (B2B)</span>
          </button>
        </div>
      </div>

      {/* 2. Banner Contextual con Botones de Acción */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        activeVertical === 'emisivo'
          ? 'bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border-blue-200/60'
          : 'bg-gradient-to-r from-emerald-50/70 to-teal-50/50 border-emerald-200/60'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl text-white ${activeVertical === 'emisivo' ? 'bg-tech-blue' : 'bg-emerald-600'}`}>
            {activeVertical === 'emisivo' ? <Plane className="h-5 w-5" /> : <Compass className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">
              {activeVertical === 'emisivo'
                ? 'Unidad 1: TravelApp · Turismo Emisivo, Mayoristas & Salidas Propias'
                : 'Unidades 2 & 3: Catálogo Compartido Luna Viajera (B2C) + TravelApp Experience (B2B Hoteles)'}
            </h3>
            <p className="text-xs text-slate-500">
              {activeVertical === 'emisivo'
                ? 'Se publica en vivo en travelapp.ar y /marketplace. Soporta operadores mayoristas y salidas grupales acompañadas.'
                : 'Mismo producto y stock de lugares en Tucumán y el NOA: se vende al pasajero individual en Luna Viajera y por mostrador B2B en Recepciones de Hoteles.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeVertical === 'emisivo' ? (
            <>
              <button
                type="button"
                onClick={handleSeedEmisivo}
                disabled={isSeeding}
                className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 px-3 py-2 text-xs font-bold text-tech-blue transition-colors disabled:opacity-50"
                title="Carga en Firestore los 6 paquetes emisivos oficiales"
              >
                <DatabaseZap className="h-3.5 w-3.5 text-tech-blue" />
                {isSeeding ? 'Inyectando...' : 'Inyectar Paquetes Emisivos'}
              </button>

              <button
                type="button"
                onClick={() => handleOpenEmisivoEditor()}
                className="flex items-center gap-1.5 rounded-xl bg-tech-blue px-3.5 py-2 text-xs font-extrabold text-white hover:bg-blue-700 shadow-xs transition-all"
              >
                <Plus className="h-4 w-4" />
                + Cargar Paquete Emisivo
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSeedReceptivo}
                disabled={isSeeding}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors disabled:opacity-50"
                title="Carga en Firestore las excursiones receptivas base"
              >
                <DatabaseZap className="h-3.5 w-3.5 text-emerald-700" />
                {isSeeding ? 'Inyectando...' : 'Inyectar Excursiones Receptivo'}
              </button>

              <button
                type="button"
                onClick={() => handleOpenReceptivoEditor()}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-500 shadow-xs transition-all"
              >
                <Plus className="h-4 w-4" />
                + Nueva Excursión Receptiva
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeVertical === 'emisivo'
                ? "Buscar paquete emisivo por título, destino u operador..."
                : "Buscar excursión receptiva por nombre o provincia..."
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-tech-blue shadow-xs"
          />
        </div>

        {activeVertical === 'emisivo' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:border-tech-blue shadow-xs"
            >
              <option value="all">🏢 Todos los Proveedores</option>
              <option value="propio">⭐ Salidas Propias TravelApp</option>
              <option value="mayorista">🏢 Operadores Verificados</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:border-tech-blue shadow-xs"
            >
              <option value="all">🏷️ Todos los Formatos</option>
              <option value="salida_grupal">👥 Salidas Grupales</option>
              <option value="paquete">✈️ Paquetes Individuales</option>
              <option value="crucero">🚢 Cruceros</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. GRID DE PAQUETES: VISTA EMISIVO */}
      {activeVertical === 'emisivo' && (
        <>
          {loading ? (
            <div className="text-center py-20 text-slate-400 font-bold">Cargando paquetes de Turismo Emisivo...</div>
          ) : filteredEmisivoPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmisivoPackages.map((pkg) => {
                const isPropio = pkg.providerCategory === 'propio' || pkg.providerType === 'propio';
                const isGrupal = pkg.modality === 'Salida Grupal Acompañada' || pkg.type === 'salida_grupal';
                const currencySymbol = pkg.currency === 'USD' ? 'USD ' : '$ ';
                const mainPrice = pkg.price || (pkg.currency === 'USD' ? pkg.priceUsd : pkg.priceArs) || 0;
                const actions = pkg.enabledActions || ['ver_detalle', 'whatsapp', 'reservar'];

                return (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative"
                  >
                    {/* Imagen de Cabecera con Badges Oficiales */}
                    <div className="relative h-52 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={pkg.imageUrl}
                        alt={pkg.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

                      {/* Badges Superiores */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                        {/* Modalidad */}
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-white shadow-xs ${
                          isGrupal ? 'bg-purple-600/90' : 'bg-slate-800/90'
                        }`}>
                          {isGrupal ? '👥 Salida Grupal Acompañada' : '👤 Individual'}
                        </span>

                        {/* Proveedor / Operador */}
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                          isPropio
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {isPropio ? '⭐ Salida Propia TravelApp' : `🛡️ Operador: ${pkg.operatorName || 'Verificado'}`}
                        </span>

                        {/* Cupos (Solo stock propio) */}
                        {isPropio && pkg.stockBadge && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500 text-slate-950 shadow-xs">
                            🔥 {pkg.stockBadge}
                          </span>
                        )}
                      </div>

                      {/* ID y Duración */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                        <span className="text-xs font-black tracking-wide bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          {pkg.id}
                        </span>
                        <span className="text-xs font-bold bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          {pkg.durationDays}D / {pkg.durationNights}N
                        </span>
                      </div>
                    </div>

                    {/* Contenido Principal */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                          <MapPin className="h-3.5 w-3.5 text-tech-blue" />
                          <span>{pkg.destination}, {pkg.country}</span>
                        </div>

                        <h3 className="text-base font-black text-slate-900 group-hover:text-tech-blue transition-colors line-clamp-2">
                          {pkg.title}
                        </h3>

                        <p className="text-xs text-slate-500 font-medium mt-1.5 line-clamp-2 leading-relaxed">
                          {pkg.description}
                        </p>

                        {/* Logística, Transporte & Hotelería */}
                        <div className="mt-3 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-700">
                          {/* Transporte y Equipaje */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 truncate text-tech-blue">
                              {pkg.transportType === 'Aéreo' ? <Plane className="h-3.5 w-3.5 shrink-0" /> : pkg.transportType === 'Crucero' ? <Ship className="h-3.5 w-3.5 shrink-0" /> : <Bus className="h-3.5 w-3.5 shrink-0" />}
                              <span className="truncate">
                                {pkg.transportType === 'Crucero' ? (pkg.cruiseCabin || 'Crucero') : `${pkg.transportType} ${pkg.airline || pkg.busType || ''}`}
                              </span>
                            </span>
                            <span className="text-slate-500 text-[10px] truncate">
                              {typeof pkg.luggageIncluded === 'string' ? pkg.luggageIncluded : 'Equipaje incluido'}
                            </span>
                          </div>

                          {/* Hotel y Régimen */}
                          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-1.5">
                            <span className="flex items-center gap-1 truncate text-indigo-700">
                              <Hotel className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{pkg.hotelStars ? `${pkg.hotelStars}★ ` : ''}{pkg.hotelName || 'Hotel Estándar'}</span>
                            </span>
                            <span className="flex items-center gap-1 text-emerald-700 text-[10px]">
                              <Utensils className="h-3 w-3 shrink-0" />
                              <span>{pkg.foodPlan}</span>
                            </span>
                          </div>
                        </div>

                        {/* Chips de Salidas */}
                        {pkg.departureDates && pkg.departureDates.length > 0 && (
                          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Salidas:</span>
                            {pkg.departureDates.slice(0, 3).map((d, i) => (
                              <span key={i} className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-tech-blue border border-blue-100">
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Precios, Financiación y Acciones */}
                      <div className="pt-3 border-t border-slate-100 space-y-2.5">
                        {/* Precios: Moneda única */}
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase block">
                              Tarifa Final ({pkg.currency})
                            </span>
                            <div className="text-xl font-black text-slate-900 tracking-tight">
                              {currencySymbol}{mainPrice.toLocaleString('es-AR')}
                            </div>
                          </div>

                          {pkg.rewardsPointsEarned && (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Award className="w-3 h-3 text-amber-500" />
                                +{pkg.rewardsPointsEarned} pts
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Precio Miembro Club */}
                        {pkg.memberPrice && (
                          <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-xs font-bold">
                            <span className="flex items-center gap-1 text-[11px]">
                              <Crown className="h-3.5 w-3.5 text-amber-500" /> Socio Club:
                            </span>
                            <span className="font-black text-emerald-900">
                              {currencySymbol}{pkg.memberPrice.toLocaleString('es-AR')}
                            </span>
                          </div>
                        )}

                        {/* Financiación (texto libre) */}
                        {(pkg.financingText || pkg.installments) && (
                          <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-tech-blue shrink-0" />
                            <span className="truncate">{pkg.financingText || pkg.installments}</span>
                          </div>
                        )}

                        {/* Badges de Acciones Habilitadas */}
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          <span className="text-[9px] font-bold text-slate-400 mr-1 uppercase">CTAs Activos:</span>
                          {actions.map((act) => (
                            <span key={act} className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {act === 'ver_detalle' ? 'Detalle' : act === 'whatsapp' ? 'WhatsApp' : act === 'reservar' ? 'Reservar' : act === 'senar' ? 'Señar' : 'Pagar'}
                            </span>
                          ))}
                        </div>

                        {/* Acciones de la Tarjeta para el Asesor/Admin */}
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          <Link
                            href={`/experiences/reservations/new?tourId=${pkg.id}&title=${encodeURIComponent(pkg.title)}`}
                            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-tech-blue px-3 py-2 text-xs font-black text-white hover:bg-blue-700 shadow-xs transition-colors"
                          >
                            <Ticket className="h-3.5 w-3.5" />
                            Crear File
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenEmisivoEditor(pkg)}
                            className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:text-tech-blue hover:bg-slate-50 transition-colors"
                            title="Editar paquete"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteEmisivoPackage(pkg.id)}
                            className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Eliminar paquete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
              <Plane className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-800">No se encontraron paquetes emisivos</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Podés inyectar los 6 paquetes emisivos oficiales o crear uno nuevo con el botón superior.
              </p>
              <button
                type="button"
                onClick={handleSeedEmisivo}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-tech-blue px-4 py-2 text-xs font-black text-white hover:bg-blue-700"
              >
                <DatabaseZap className="h-4 w-4" />
                Inyectar Paquetes Emisivos Ahora
              </button>
            </div>
          )}
        </>
      )}

      {/* 5. GRID DE EXCURSIONES: VISTA RECEPTIVO */}
      {activeVertical === 'receptivo' && (
        <>
          {filteredReceptivoTours.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReceptivoTours.map((tour) => (
                <div key={tour.id} className="relative group">
                  <TourCard
                    tour={tour}
                    onSelect={() => handleOpenReceptivoEditor(tour)}
                  />
                  {/* Botones de acción flotantes de administración */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={() => handleOpenReceptivoEditor(tour)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-md backdrop-blur-xs transition-colors"
                      title="Editar excursión"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReceptivoTour(tour.id)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-red-600 shadow-md backdrop-blur-xs transition-colors"
                      title="Eliminar excursión"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
              <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-800">No se encontraron excursiones receptivas</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Podés sembrar las excursiones oficiales de Mendoza, Humahuaca y Cafayate con el botón superior.
              </p>
              <button
                type="button"
                onClick={handleSeedReceptivo}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700"
              >
                <DatabaseZap className="h-4 w-4" />
                Inyectar Excursiones Receptivo
              </button>
            </div>
          )}
        </>
      )}

      {/* 6. MODAL DE EDICIÓN / ALTA DE PAQUETE EMISIVO COMPLETO */}
      {isEmisivoModalOpen && editingOtaPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
            {/* Header Modal */}
            <div className="bg-[#0A2A5B] text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">
                  Turismo Emisivo · Configuración de Tarjeta Manual
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">
                  {editingOtaPkg.title ? `Editar Paquete: ${editingOtaPkg.title}` : 'Cargar Nuevo Paquete Emisivo'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEmisivoModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-full p-1.5 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs">
              {/* Bloque 1: Modalidad y Proveedor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Modalidad de Viaje</label>
                  <select
                    value={editingOtaPkg.modality || 'Salida Grupal Acompañada'}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, modality: e.target.value as OtaModality }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                  >
                    <option value="Salida Grupal Acompañada">👥 Salida Grupal Acompañada</option>
                    <option value="Individual">👤 Individual</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Tipo de Origen</label>
                  <select
                    value={editingOtaPkg.providerCategory || 'operador_verificado'}
                    onChange={(e) => {
                      const val = e.target.value as OtaProviderCategory;
                      setEditingOtaPkg(prev => ({
                        ...prev,
                        providerCategory: val,
                        providerType: val === 'propio' ? 'propio' : 'mayorista'
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                  >
                    <option value="propio">⭐ Salida Propia TravelApp</option>
                    <option value="operador_verificado">🛡️ Operador Verificado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Nombre Operador (Interno)</label>
                  <input
                    type="text"
                    value={editingOtaPkg.operatorName || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, operatorName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                    placeholder="Ej: Juliá Tours, Europamundo, Ola"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">* Al cliente se muestra como 'Operador Verificado'</span>
                </div>
              </div>

              {/* Badge de Cupos (Solo salidas propias) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Badge de Cupos / Stock</label>
                  <input
                    type="text"
                    value={editingOtaPkg.stockBadge || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, stockBadge: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                    placeholder="Ej: Disponible, Últimos 4 cupos, Salida Confirmada"
                  />
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    * Solo se muestra en la tarjeta pública si es Salida Propia TravelApp.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">ID del Paquete</label>
                  <input
                    type="text"
                    value={editingOtaPkg.id || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                    placeholder="OTA-PKG-001"
                  />
                </div>
              </div>

              {/* Bloque 2: Título, Destino y Alcance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-600 mb-1">Título Comercial</label>
                  <input
                    type="text"
                    value={editingOtaPkg.title || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue"
                    placeholder="Ej: Cancún & Riviera Maya All Inclusive 5★"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Formato</label>
                  <select
                    value={editingOtaPkg.type || 'paquete'}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, type: e.target.value as OtaPackageType }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                  >
                    <option value="paquete">✈️ Paquete</option>
                    <option value="salida_grupal">👥 Salida Grupal</option>
                    <option value="crucero">🚢 Crucero</option>
                    <option value="escapada">🎒 Escapada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Destino</label>
                  <input
                    type="text"
                    value={editingOtaPkg.destination || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, destination: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue"
                    placeholder="Ej: Cancún"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">País</label>
                  <input
                    type="text"
                    value={editingOtaPkg.country || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue"
                    placeholder="Ej: México"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Región</label>
                  <select
                    value={editingOtaPkg.region || 'Internacional'}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, region: e.target.value as any }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                  >
                    <option value="Internacional">Internacional</option>
                    <option value="Nacional">Nacional (Argentina)</option>
                    <option value="Regional">Regional (Sudamérica)</option>
                  </select>
                </div>
              </div>

              {/* Bloque 3: Transporte Detallado */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-black text-slate-700 block uppercase tracking-wider text-[11px]">
                  Transporte & Logística
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Tipo de Transporte</label>
                    <select
                      value={editingOtaPkg.transportType || 'Aéreo'}
                      onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, transportType: e.target.value as OtaTransportType }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                    >
                      <option value="Aéreo">Aéreo</option>
                      <option value="Bus Cama">Bus Cama</option>
                      <option value="Bus Semicama">Bus Semicama</option>
                      <option value="Crucero">Crucero</option>
                      <option value="Terrestre">Terrestre</option>
                    </select>
                  </div>

                  {editingOtaPkg.transportType === 'Aéreo' && (
                    <>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Aerolínea</label>
                        <input
                          type="text"
                          value={editingOtaPkg.airline || ''}
                          onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, airline: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                          placeholder="Ej: Copa Airlines / LATAM"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Equipaje</label>
                        <input
                          type="text"
                          value={typeof editingOtaPkg.luggageIncluded === 'string' ? editingOtaPkg.luggageIncluded : 'Equipaje en bodega (23kg) incluido'}
                          onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, luggageIncluded: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                          placeholder="Ej: Equipaje en bodega 23kg incluido"
                        />
                      </div>
                    </>
                  )}

                  {(editingOtaPkg.transportType === 'Bus' || editingOtaPkg.transportType === 'Bus Cama' || editingOtaPkg.transportType === 'Bus Semicama') && (
                    <>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Tipo de Asiento</label>
                        <select
                          value={editingOtaPkg.busType || 'Cama'}
                          onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, busType: e.target.value as OtaBusType }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                        >
                          <option value="Cama">Cama</option>
                          <option value="Semicama">Semicama</option>
                          <option value="Cama Ejecutivo">Cama Ejecutivo</option>
                          <option value="Suite">Suite</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Equipaje en Bus</label>
                        <input
                          type="text"
                          value={typeof editingOtaPkg.luggageIncluded === 'string' ? editingOtaPkg.luggageIncluded : 'Bodega de bus incluida'}
                          onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, luggageIncluded: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                          placeholder="Ej: Bodega de bus hasta 2 valijas"
                        />
                      </div>
                    </>
                  )}

                  {editingOtaPkg.transportType === 'Crucero' && (
                    <>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Tipo de Cabina</label>
                        <input
                          type="text"
                          value={editingOtaPkg.cruiseCabin || ''}
                          onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, cruiseCabin: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                          placeholder="Ej: Cabina Externa con Balcón al Mar"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Escalas del Crucero</label>
                        <input
                          type="text"
                          value={editingOtaPkg.cruisePorts || ''}
                          onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, cruisePorts: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                          placeholder="Ej: Buenos Aires, Río, Ilhabela, Punta del Este"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bloque 4: Hotelería & Régimen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Hotel</label>
                  <input
                    type="text"
                    value={editingOtaPkg.hotelName || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, hotelName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue"
                    placeholder="Ej: Riu Tequila 5★ Resort"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Estrellas Hotel</label>
                  <select
                    value={editingOtaPkg.hotelStars || 4}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, hotelStars: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                  >
                    <option value={5}>5 Estrellas (5★)</option>
                    <option value={4}>4 Estrellas (4★)</option>
                    <option value={3}>3 Estrellas (3★)</option>
                    <option value={2}>2 Estrellas (2★)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Régimen de Comidas</label>
                  <select
                    value={editingOtaPkg.foodPlan || 'Media Pensión'}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, foodPlan: e.target.value as OtaFoodPlan }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                  >
                    <option value="All Inclusive">All Inclusive</option>
                    <option value="Pensión Completa">Pensión Completa</option>
                    <option value="Media Pensión">Media Pensión</option>
                    <option value="Desayuno">Con Desayuno</option>
                    <option value="Solo Alojamiento">Solo Alojamiento</option>
                  </select>
                </div>
              </div>

              {/* Bloque 5: Precios (Moneda Única) y Financiación */}
              <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/70 space-y-3">
                <span className="font-black text-amber-900 block uppercase tracking-wider text-[11px]">
                  Moneda, Precios & Financiación (Carga Manual sin Conversión)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Moneda Publicada</label>
                    <select
                      value={editingOtaPkg.currency || 'USD'}
                      onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, currency: e.target.value as 'USD' | 'ARS' }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 font-black text-slate-800 outline-none focus:border-tech-blue bg-white"
                    >
                      <option value="USD">💵 Dólares Estadounidenses (USD)</option>
                      <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Precio Final Público</label>
                    <input
                      type="number"
                      value={editingOtaPkg.price || 0}
                      onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 font-black text-slate-800 outline-none focus:border-tech-blue bg-white"
                      placeholder="Ej: 2150"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Precio Miembro Club Rewards</label>
                    <input
                      type="number"
                      value={editingOtaPkg.memberPrice || ''}
                      onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, memberPrice: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 font-black text-emerald-800 outline-none focus:border-emerald-600 bg-white"
                      placeholder="Ej: 1990"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Texto Libre para Financiación / Información</label>
                  <input
                    type="text"
                    value={editingOtaPkg.financingText || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, financingText: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue bg-white"
                    placeholder="Ej: Hasta 6 cuotas fijas en USD con tarjeta / 12 cuotas fijas en pesos / Seña 30%"
                  />
                </div>
              </div>

              {/* Bloque 6: TravelApp Rewards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                <div>
                  <label className="block font-bold text-purple-900 mb-1">Puntos Acumulables al Viajar</label>
                  <input
                    type="number"
                    value={editingOtaPkg.rewardsPointsEarned || 500}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, rewardsPointsEarned: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-black text-slate-800 outline-none focus:border-tech-blue bg-white"
                    placeholder="Ej: 850"
                  />
                </div>

                <div>
                  <label className="block font-bold text-purple-900 mb-1">Puntos Necesarios para Canjear el Viaje</label>
                  <input
                    type="number"
                    value={editingOtaPkg.rewardsPointsRequired || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, rewardsPointsRequired: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-black text-purple-800 outline-none focus:border-purple-600 bg-white"
                    placeholder="Ej: 18000"
                  />
                </div>
              </div>

              {/* Bloque 7: Acciones Seleccionables al Cargar */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-black text-slate-700 block uppercase tracking-wider text-[11px]">
                  Botones de Acción Visibles en la Tarjeta Pública:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'ver_detalle', label: 'Ver Detalle' },
                    { id: 'whatsapp', label: 'Consultar (WhatsApp)' },
                    { id: 'reservar', label: 'Reservar' },
                    { id: 'senar', label: 'Señar Cupo' },
                    { id: 'pagar', label: 'Pagar Viaje' },
                  ].map((act) => {
                    const isChecked = (editingOtaPkg.enabledActions || ['ver_detalle', 'whatsapp', 'reservar']).includes(act.id as any);
                    return (
                      <button
                        type="button"
                        key={act.id}
                        onClick={() => toggleAction(act.id as OtaActionType)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-tech-blue text-white border-tech-blue shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Check className={`h-3 w-3 ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
                        {act.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bloque 8: Fechas y Servicios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Fechas de Salida (separadas por coma)</label>
                  <input
                    type="text"
                    value={datesInput}
                    onChange={(e) => setDatesInput(e.target.value)}
                    placeholder="12 Nov 2026, 03 Dic 2026, 15 Ene 2027"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">URL de Imagen</label>
                  <input
                    type="text"
                    value={editingOtaPkg.imageUrl || ''}
                    onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-tech-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Servicios Incluidos (un servicio por línea)</label>
                <textarea
                  value={servicesInput}
                  onChange={(e) => setServicesInput(e.target.value)}
                  rows={3}
                  placeholder="Vuelos ida y vuelta con equipaje&#10;Traslados in/out en van ejecutiva&#10;7 noches All Inclusive 24hs"
                  className="w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 outline-none focus:border-tech-blue resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Descripción del Paquete</label>
                <textarea
                  value={editingOtaPkg.description || ''}
                  onChange={(e) => setEditingOtaPkg(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Viví unas vacaciones soñadas en el Caribe mexicano..."
                  className="w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 outline-none focus:border-tech-blue resize-none"
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEmisivoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEmisivoPackage}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-tech-blue hover:bg-blue-700 shadow-sm transition-all"
              >
                Guardar Paquete Emisivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DE EDICIÓN / ALTA DE EXCURSIÓN RECEPTIVA */}
      {isReceptivoModalOpen && editingReceptivoTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
            <div className="bg-emerald-950 text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Turismo Receptivo · Excursiones Locales
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">
                  {editingReceptivoTour.title ? `Editar Excursión: ${editingReceptivoTour.title}` : 'Nueva Excursión Receptiva'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsReceptivoModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-full p-1.5 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">ID Excursión</label>
                  <input
                    type="text"
                    value={editingReceptivoTour.id || ''}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                    placeholder="EXP-REC-101"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Ubicación / Provincia</label>
                  <input
                    type="text"
                    value={editingReceptivoTour.location || ''}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                    placeholder="Mendoza / Salta / Jujuy"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Título de la Excursión</label>
                <input
                  type="text"
                  value={editingReceptivoTour.title || ''}
                  onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                  placeholder="Ej: Mendoza Wine Tour Premium & Bodegas"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Precio Desde (Público)</label>
                  <input
                    type="number"
                    value={editingReceptivoTour.price || 0}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Precio Socio Club</label>
                  <input
                    type="number"
                    value={editingReceptivoTour.priceRewards || 0}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, priceRewards: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Moneda</label>
                  <select
                    value={editingReceptivoTour.currency || 'ARS'}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, currency: e.target.value as any }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (US$)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Puntos Rewards</label>
                  <input
                    type="number"
                    value={editingReceptivoTour.pointsEarned || 100}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, pointsEarned: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Duración, Dificultad y Cantidad Mínima de Pasajeros */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Duración</label>
                  <input
                    type="text"
                    value={editingReceptivoTour.duration || ''}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                    placeholder="Ej: Día Completo (12 hs)"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Dificultad</label>
                  <select
                    value={editingReceptivoTour.difficulty || 'Baja'}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Cant. Mínima de Pasajeros</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editingReceptivoTour.minPassengers ?? 2}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, minPassengers: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Transporte / Móvil (TravelCab)</label>
                  <input
                    type="text"
                    value={editingReceptivoTour.transportation || ''}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, transportation: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                    placeholder="SUV Premium 4x4 (TravelCab)"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Origen / Pick-up</label>
                  <input
                    type="text"
                    value={editingReceptivoTour.departureOrigin || ''}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, departureOrigin: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                    placeholder="Hotel céntrico / Terminal"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Disponibilidad</label>
                  <select
                    value={editingReceptivoTour.availability || 'Disponible'}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, availability: e.target.value as any }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Cupos Limitados">Cupos Limitados</option>
                    <option value="Agotado">Agotado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Descripción Corta (Subtítulo de Tarjeta)</label>
                <textarea
                  value={editingReceptivoTour.description || ''}
                  onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 outline-none focus:border-emerald-600 resize-none"
                  placeholder="Resumen atractivo de la experiencia..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Detalle Completo del Recorrido / Itinerario</label>
                <textarea
                  value={editingReceptivoTour.detail || ''}
                  onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, detail: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 outline-none focus:border-emerald-600 resize-none"
                  placeholder="Descripción detallada paso a paso de los puntos visitados, paradas y experiencia..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">URL de Imagen Principal</label>
                  <input
                    type="text"
                    value={editingReceptivoTour.imageUrl || ''}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Tema Visual de Tarjeta (Estilo Apple)</label>
                  <select
                    value={editingReceptivoTour.cardTheme || 'light-ice'}
                    onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, cardTheme: e.target.value as any }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800 outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="light-ice">Blanco Hielo (#F5F5F7)</option>
                    <option value="light-sky">Celeste Suave Apple (#EAF3FA)</option>
                    <option value="dark">Negro Profundo (#000000)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Galería de Imágenes (una URL por línea)</label>
                <textarea
                  value={recImagesInput}
                  onChange={(e) => setRecImagesInput(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 outline-none focus:border-emerald-600 resize-none"
                  placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Servicios Incluidos (un servicio por línea)</label>
                <textarea
                  value={recServicesInput}
                  onChange={(e) => setRecServicesInput(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 outline-none focus:border-emerald-600 resize-none"
                  placeholder="Degustación en 3 bodegas&#10;Almuerzo maridado&#10;Guía Sommelier"
                />
              </div>

              {/* Configuración de Distribución en Portal B2B (Experience) */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingReceptivoTour.b2bEnabled !== false}
                      onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, b2bEnabled: e.target.checked }))}
                      className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="block font-black text-amber-950 text-xs">
                        Habilitar Excursión en Portal B2B (TravelApp Experience)
                      </span>
                      <span className="block text-[11px] text-amber-800 font-medium">
                        Si está activo, las Agencias, Hoteles y Comercios con el módulo Experience habilitado podrán reservar esta excursión.
                      </span>
                    </div>
                  </label>
                  <div className="w-36 shrink-0">
                    <label className="block font-bold text-amber-900 text-[10px] uppercase mb-1">
                      % Comisión Aliado B2B
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={editingReceptivoTour.hotelCommissionPct ?? 15}
                        onChange={(e) => setEditingReceptivoTour(prev => ({ ...prev, hotelCommissionPct: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 font-black text-amber-950 outline-none focus:border-amber-600"
                      />
                      <span className="absolute right-3 top-1.5 font-black text-amber-600">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReceptivoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveReceptivoTour}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
              >
                Guardar Excursión Receptiva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
