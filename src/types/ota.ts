export type OtaPackageType = 'paquete' | 'salida_grupal' | 'crucero' | 'escapada';
export type OtaProviderType = 'propio' | 'mayorista';
export type OtaProviderCategory = 'propio' | 'operador_verificado';
export type OtaModality = 'Salida Grupal Acompañada' | 'Individual';
export type OtaTransportType = 'Aéreo' | 'Avión' | 'Bus' | 'Bus Cama' | 'Bus Semicama' | 'Barco' | 'Crucero' | 'Tren' | 'Terrestre' | 'Sin Transporte';
export type OtaBusType = 'Semicama' | 'Cama' | 'Cama Ejecutivo' | 'Suite';
export type OtaFoodPlan = 'Solo Alojamiento' | 'Desayuno' | 'Media Pensión' | 'Pensión Completa' | 'All Inclusive';
export type OtaActionType = 'ver_detalle' | 'whatsapp' | 'reservar' | 'senar' | 'pagar' | 'consultar';
export type OtaInquiryChannel = 'travis_webchat' | 'whatsapp' | 'both';

export interface OtaMediaItem {
  url: string;
  type: 'image' | 'video';
}

export interface OtaItineraryDay {
  day: number;
  title: string;
  description: string;
}

export type OtaRegion =
  | 'Nacional'
  | 'Internacional'
  | 'Regional'
  | 'Argentina'
  | 'Brasil'
  | 'Sudamérica'
  | 'Caribe'
  | 'Estados Unidos'
  | 'Europa'
  | 'Asia'
  | 'África'
  | 'Oceanía';

export interface OtaPackage {
  id: string;
  title: string;
  destination: string;
  country: string;
  region: OtaRegion;
  tripKind?: string;
  sortOrder?: number;
  customTags?: string[];
  type: OtaPackageType;
  providerType: OtaProviderType; // Retrocompatibilidad
  providerCategory?: OtaProviderCategory; // 'propio' (Salida Propia) | 'operador_verificado' (Operador Verificado)
  operatorName?: string; // Nombre interno, en la tarjeta pública se muestra 'Operador Verificado'

  // Modalidad
  modality?: OtaModality; // 'Salida Grupal Acompañada' | 'Individual'

  durationDays: number;
  durationNights: number;
  departureDates: string[]; // Chips con salidas, ej: ["12 Nov 2026", "03 Dic 2026"]
  departureOrigin: string; // Ej: "Buenos Aires (Ezeiza)", "Tucumán"

  // Transporte detallado
  transportType: OtaTransportType;
  airline?: string; // Ej: "Copa Airlines", "Aerolíneas Argentinas"
  luggageIncluded?: boolean | string; // Ej: true, false, o "Equipaje en bodega incluido (23kg)"
  busType?: OtaBusType; // Semicama / Cama
  cruiseCabin?: string; // Ej: "Cabina Externa con Balcón"
  cruisePorts?: string; // Ej: "Río de Janeiro, Ilhabela, Punta del Este"

  // Hotelería & Régimen
  hotelName?: string;
  hotelStars?: number;
  foodPlan: OtaFoodPlan;

  // Cupos (SOLO para stock de salidas propias)
  stockBadge?: string; // Ej: "Disponible", "Últimos 4 cupos", "Salida Confirmada", "Agotado"

  // Moneda y Precios (Sin conversión automática: se muestra en la moneda publicada)
  currency: 'USD' | 'ARS';
  price: number; // Precio Final
  memberPrice?: number; // Precio para miembros Club / Rewards
  priceArs?: number; // Retrocompatibilidad opcional
  priceUsd?: number; // Retrocompatibilidad opcional

  // Financiación / Información Adicional
  financingText?: string; // Texto libre: ej. "Hasta 6 cuotas fijas en USD / ARS", "Aceptamos transferencia o USD billete"
  installments?: string; // Retrocompatibilidad

  // Puntos Rewards (cargados manualmente)
  rewardsDiscountPercent?: number; // % de descuento aplicado a Miembros Rewards
  rewardsPointsEarned?: number; // Puntos que acumula al comprar (ej. 850)
  rewardsPointsRequired?: number; // Puntos necesarios para canjear el viaje (ej. 15000)

  // Acciones seleccionables al cargar + Seña + Travis
  enabledActions?: OtaActionType[]; // Ej: ['ver_detalle', 'whatsapp', 'reservar', 'senar', 'pagar', 'consultar']
  publishAction?: 'reservar' | 'consultar' | 'senar' | 'comprar';
  depositType?: 'percentage' | 'fixed';
  depositValue?: number;
  inquiryChannel?: OtaInquiryChannel;
  travisPrompt?: string;
  whatsappNumber?: string;

  // Identificación y control interno
  code?: string;
  operatorId?: string;
  status?: 'published' | 'draft';
  active?: boolean;

  badge?: string; // Ej: "🔥 ALL INCLUSIVE 5★", "🌴 DESTACADO"
  imageUrl: string;
  gallery?: string[];
  galleryMedia?: OtaMediaItem[];
  description: string;
  includedServices: string[];
  itinerarySummary?: OtaItineraryDay[];
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
