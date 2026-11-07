// =============================================================================
// TIPOS DE MENSAJERÍA — Centro de Comunicaciones TravelApp
// =============================================================================

export type MessageChannel = 'whatsapp' | 'instagram' | 'messenger' | 'web' | 'internal' | 'push';

export type ConversationType = 'customer_support' | 'driver_passenger' | 'group_trip' | 'broadcast';

export type ConversationStatus = 'bot' | 'pending' | 'active' | 'closed';

export type SenderRole = 'customer' | 'driver' | 'operator' | 'travis' | 'system';

export type AutomatedTrigger =
  | 'driver_assigned'
  | 'trip_started'
  | 'trip_ending_soon'
  | 'seatbelt_reminder'
  | 'arrival_check'
  | 'trip_completed'
  | 'rate_trip'
  | 'welcome'
  | 'custom';

export type BroadcastAudience = 'all' | 'passengers' | 'drivers' | 'specific';

// -----------------------------------------------------------------------------
// Conversación
// -----------------------------------------------------------------------------

export interface ConversationParticipant {
  id: string;
  name: string;
  role: SenderRole;
  phone?: string;
  avatarUrl?: string;
}

export type BusinessUnit = 
  | 'TravelCab (Usuario)' 
  | 'TravelCab (Conductor)' 
  | 'TravelApp Experience' 
  | 'TravelApp Rewards' 
  | 'TravelApp Afiliados' 
  | 'TravelApp'
  | 'TravelCab' 
  | 'Experiences' 
  | 'Rewards' 
  | 'General';

export interface ConversationMetadata {
  leadId?: string;
  tripId?: string;
  groupId?: string;
  driverName?: string;
  passengerName?: string;
  businessUnit?: BusinessUnit;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  channel: MessageChannel;
  participants: ConversationParticipant[];
  status: ConversationStatus;
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
  operatorId?: string; // ID del operador que tomó control
  operatorName?: string;
  manyChatSubscriberId?: string; // ID del suscriptor en ManyChat
  metadata: ConversationMetadata;
  createdAt: number;
}

// -----------------------------------------------------------------------------
// Mensaje
// -----------------------------------------------------------------------------

export interface MessageSender {
  id: string;
  name: string;
  role: SenderRole;
}

export type MessageType = 'text' | 'automated' | 'system' | 'image' | 'template';

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  timestamp: number;
  type: MessageType;
  channel: MessageChannel;
  manyChatMessageId?: string;
  isRead?: boolean;
}

// -----------------------------------------------------------------------------
// Mensajes Automáticos
// -----------------------------------------------------------------------------

export interface AutomatedMessage {
  id: string;
  trigger: AutomatedTrigger;
  title: string;           // Nombre descriptivo para el admin
  content: string;         // Texto del mensaje (puede tener {variables})
  delaySeconds: number;    // Segundos después del trigger para enviar
  isActive: boolean;
  channel: MessageChannel | 'both';
  createdAt: number;
  updatedAt: number;
}

// Triggers predefinidos con sus labels
export const AUTOMATED_TRIGGER_LABELS: Record<AutomatedTrigger, string> = {
  driver_assigned: '🚗 Conductor Asignado',
  trip_started: '🟢 Viaje Iniciado',
  trip_ending_soon: '⏱️ Viaje por Terminar (3 min)',
  seatbelt_reminder: '🔒 Recordatorio Cinturón',
  arrival_check: '📦 ¿No te olvidaste nada?',
  trip_completed: '✅ Viaje Completado',
  rate_trip: '⭐ Calificar el Viaje',
  welcome: '👋 Bienvenida al Servicio',
  custom: '⚡ Personalizado',
};

// Mensajes predeterminados para inicializar
export const DEFAULT_AUTOMATED_MESSAGES: Omit<AutomatedMessage, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    trigger: 'driver_assigned',
    title: 'Conductor en Camino',
    content: '¡Hola {nombre}! 🚗 Tu conductor *{conductor}* ya está en camino. Llegará en aproximadamente *{eta} minutos*. Podés seguir el viaje en tiempo real desde la app.',
    delaySeconds: 0,
    isActive: true,
    channel: 'whatsapp',
  },
  {
    trigger: 'trip_started',
    title: 'Inicio del Viaje',
    content: '¡Tu viaje comenzó! 🟢 Estás en buenas manos con *{conductor}*. Recordá colocarte el cinturón de seguridad. 🔒',
    delaySeconds: 30,
    isActive: true,
    channel: 'both',
  },
  {
    trigger: 'seatbelt_reminder',
    title: 'Recordatorio Cinturón de Seguridad',
    content: '🔒 ¡Recordá siempre colocarte el cinturón! Es por tu seguridad y la de todos. ¡Buen viaje!',
    delaySeconds: 60,
    isActive: true,
    channel: 'whatsapp',
  },
  {
    trigger: 'trip_ending_soon',
    title: 'Llegando al Destino',
    content: '⏱️ ¡Ya casi llegás! En aproximadamente *3 minutos* arribarás a *{destino}*. Podés prepararte para bajar.',
    delaySeconds: 0,
    isActive: true,
    channel: 'whatsapp',
  },
  {
    trigger: 'arrival_check',
    title: '¿No te olvidaste nada?',
    content: '📦 ¡Ya llegaste! Antes de bajar, revisá que no te olvidés ningún objeto personal en el vehículo. ¡Hasta la próxima! 😊',
    delaySeconds: 10,
    isActive: true,
    channel: 'both',
  },
  {
    trigger: 'rate_trip',
    title: 'Solicitud de Calificación',
    content: '⭐ ¿Cómo fue tu viaje? Tu opinión es muy importante para nosotros. Calificá tu experiencia: https://travelapp.ar/calificar/{viaje_id}',
    delaySeconds: 120,
    isActive: true,
    channel: 'whatsapp',
  },
];

// -----------------------------------------------------------------------------
// Configuración de Travis
// -----------------------------------------------------------------------------

export interface TravisKnowledgeEntry {
  id: string;
  title: string;
  content: string;    // Markdown
  category: 'TravelCab' | 'Experiences' | 'Rewards' | 'General' | 'Drivers';
  createdAt: number;
}

export interface TravisChannelStatus {
  whatsapp: boolean;
  instagram: boolean;
  messenger: boolean;
  web: boolean;
}

export interface CommentAutomationRule {
  id: string;
  name: string;
  platform: 'instagram' | 'facebook' | 'both';
  postId: string;           // ID específico de la publicación/Reel o 'ALL' para cualquier post
  postUrl?: string;         // URL opcional de referencia a la publicación
  postCaption?: string;     // Extracto opcional del texto del post
  keywords: string[];       // Palabras clave disparadoras (vacío = cualquier comentario)
  publicReplies: string[];  // Respuestas públicas rotativas en el comentario (soporta {usuario})
  sendPrivateDm: boolean;   // Si envía un DM privado automático (Private Reply de Meta)
  privateDmText: string;    // Mensaje privado inicial (soporta {usuario})
  useTravisAiForDm?: boolean; // Si Travis IA responde al comentario con el contexto de la unidad
  businessUnit: BusinessUnit;
  isActive: boolean;
  stats?: {
    commentsReplied: number;
    dmsSent: number;
  };
  createdAt: number;
}

export interface AnuraIntegrationConfig {
  enabled: boolean;
  click2DialToken?: string;
  autoWhatsAppOnMissedCall: boolean;
  autoWhatsAppOnOutOfHours: boolean;
  missedCallWhatsAppMessage: string;
}

export interface TravisConfig {
  systemPrompt: string;
  businessContext: string;
  knowledgeBase: TravisKnowledgeEntry[];
  activeChannels: TravisChannelStatus;
  autoReplyEnabled: boolean;
  handoffTriggers: string[];  // Palabras que escalan al humano
  workingHours?: { start: string; end: string; timezone: string };
  outOfHoursMessage: string;
  updatedAt: number;
  isAiDispatchForcedEnabled?: boolean;
  commentRules?: CommentAutomationRule[];
  anuraConfig?: AnuraIntegrationConfig;
}

export const DEFAULT_COMMENT_RULES: CommentAutomationRule[] = [
  {
    id: 'rule_ig_travelapp_experiences_post',
    name: '📸 @travelapp.ar — Post Salidas Programadas Experience',
    platform: 'instagram',
    postId: '18003355895959858',
    postUrl: 'https://www.instagram.com/p/Da3Sa6xCcuw/',
    keywords: [], // Responde a cualquier comentario en esta publicación específica
    publicReplies: [
      '¡Hola @{usuario}! ✈️🧳 Ya te enviamos por mensaje privado las salidas programadas y detalles de TravelApp Experience.',
      '¡Gracias por comentar @{usuario}! 🙌 Revisá tu bandeja de mensajes privados que Travis ya te escribió.',
    ],
    sendPrivateDm: true,
    privateDmText: '¡Hola @{usuario}! 👋 Soy Travis, tu conserje digital de TravelApp Experience. Vi tu comentario en nuestra publicación de Salidas Programadas (Mar del Plata, Camboriú, Caribe y Norte Argentino). ¿Qué destino te gustaría cotizar y para cuántas personas?',
    useTravisAiForDm: true,
    businessUnit: 'TravelApp Experience',
    isActive: true,
    stats: { commentsReplied: 0, dmsSent: 0 },
    createdAt: Date.now(),
  },
  {
    id: 'rule_ig_travelcab_flota_fundadora',
    name: '📸 @travelcab.ar — Post Convocatoria Flota Fundadora (Conductores)',
    platform: 'instagram',
    postId: '17904872556454139',
    postUrl: 'https://www.instagram.com/p/DaslfQXlbbS/',
    keywords: [], // Responde a cualquier comentario en este post de reclutamiento
    publicReplies: [
      '¡Hola @{usuario}! 🚘🤝 Ya te enviamos por mensaje privado toda la info y requisitos para sumarte a la Flota Fundadora de TravelCab.',
      '¡Bienvenido @{usuario}! 🙌 Te acabamos de escribir al privado con los beneficios exclusivos para Socios Fundadores.',
    ],
    sendPrivateDm: true,
    privateDmText: '¡Hola @{usuario}! 🚗 Soy Travis de TravelCab. Vi tu comentario para sumarte a nuestra Flota Fundadora con la comisión más baja del mercado (10-15%) y pasajeros validados. Contame: ¿qué auto tenés (marca, modelo y año) y en qué zona manejás?',
    useTravisAiForDm: true,
    businessUnit: 'TravelCab (Conductor)',
    isActive: true,
    stats: { commentsReplied: 0, dmsSent: 0 },
    createdAt: Date.now(),
  },
  {
    id: 'rule_experiences_tafi',
    name: '🌐 Regla General — Excursiones y Tours (Todos los posteos)',
    platform: 'both',
    postId: 'ALL',
    keywords: ['info', 'precio', 'valor', 'tafi', 'tour', 'excursion', 'quiero', 'mas info', 'vacaciones'],
    publicReplies: [
      '¡Hola @{usuario}! 🙌 Ya te enviamos toda la info y tarifas por mensaje privado. ¡Revisá tu bandeja!',
      '¡Gracias por comentar @{usuario}! 🏔️✨ Te acabamos de escribir por DM con las salidas disponibles y precios.',
    ],
    sendPrivateDm: true,
    privateDmText: '¡Hola @{usuario}! 👋 Soy Travis de TravelApp Experience. Vi tu comentario en nuestra publicación y te paso toda la información de nuestras excursiones y viajes. ¿Para cuántas personas y qué destino te gustaría viajar?',
    useTravisAiForDm: true,
    businessUnit: 'TravelApp Experience',
    isActive: true,
    stats: { commentsReplied: 0, dmsSent: 0 },
    createdAt: Date.now(),
  },
  {
    id: 'rule_drivers_recruitment',
    name: '🌐 Regla General — Conductores TravelCab (Todos los posteos)',
    platform: 'both',
    postId: 'ALL',
    keywords: ['chofer', 'conductor', 'manejar', 'auto', 'requisitos', 'trabajar', 'inscribirme', 'flota'],
    publicReplies: [
      '¡Hola @{usuario}! 🚕 Te enviamos los requisitos y el link de alta para conductores por mensaje privado.',
      '¡Bienvenido @{usuario}! 🙌 Revisá tus mensajes privados que ya te mandamos toda la info para sumarte a TravelCab.',
    ],
    sendPrivateDm: true,
    privateDmText: '¡Hola @{usuario}! 🚗 Soy Travis de TravelCab. Te contacto por tu comentario para sumarte como conductor (tenemos la comisión más baja: 10-15%). ¿Qué modelo y año es tu vehículo?',
    useTravisAiForDm: true,
    businessUnit: 'TravelCab (Conductor)',
    isActive: true,
    stats: { commentsReplied: 0, dmsSent: 0 },
    createdAt: Date.now(),
  },
];

export const DEFAULT_TRAVIS_CONFIG: Omit<TravisConfig, 'updatedAt'> = {
  systemPrompt: `Sos Travis, el asistente virtual de TravelApp — una plataforma de movilidad premium de Tucumán, Argentina. 

Tu personalidad es: amigable, profesional, eficiente y directo. Siempre respondés en español rioplatense (usás "vos" en lugar de "tú").

**Tu rol principal:**
- Responder consultas sobre TravelCab (servicio de transporte urbano)
- Informar sobre TravelExperiences (tours y experiencias)  
- Explicar el programa de Rewards (puntos y beneficios)
- Ayudar a conductores con el proceso de registro
- Derivar al equipo humano cuando la consulta lo requiere

**Reglas importantes:**
- Nunca inventés información que no tengas en tu base de conocimiento
- Si no sabés algo, decí "En este momento no tengo esa información, pero te conecto con nuestro equipo" y escalá la conversación
- Siempre saludá con calidez y terminá con una pregunta de cierre para confirmar que resolviste la duda
- Para reservas o situaciones urgentes, siempre ofrecé el contacto directo: +54 9 381 418-8106`,

  businessContext: `TravelApp es un ecosistema de movilidad y experiencias premium con sede en Tucumán, Argentina. 
Operamos con: TravelCab (remises y transporte urbano), TravelExperiences (tours y excursiones) y TravelRewards (programa de fidelización).`,

  knowledgeBase: [],
  
  activeChannels: {
    whatsapp: true,
    instagram: true,
    messenger: true,
    web: true,
  },
  
  autoReplyEnabled: true,
  
  handoffTriggers: [
    'hablar con una persona',
    'hablar con alguien',
    'operador',
    'urgente',
    'reclamo',
    'queja',
    'problema grave',
    'accidente',
    'emergencia',
    'reembolso',
  ],
  
  outOfHoursMessage: '¡Hola! 👋 Gracias por escribirnos. Nuestro equipo atiende de lunes a sábados de 8:00 a 22:00 hs. Dejanos tu mensaje y te respondemos a la brevedad. Si es urgente, llamanos al +54 9 381 418-8106.',
  commentRules: DEFAULT_COMMENT_RULES,
  anuraConfig: {
    enabled: true,
    click2DialToken: '',
    autoWhatsAppOnMissedCall: true,
    autoWhatsAppOnOutOfHours: true,
    missedCallWhatsAppMessage: '¡Hola! 👋 Vimos que recién te comunicaste por teléfono con TravelApp. Soy Travis, tu asistente virtual. ¿Necesitás pedir un móvil de TravelCab, consultar por un tour o hablar con un operador?',
  },
};

// -----------------------------------------------------------------------------
// Broadcast / Campañas
// -----------------------------------------------------------------------------

export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export type NotificationAudioType = 'default' | 'driver_alert' | 'seatbelt_safety' | 'promo' | 'none';
export type NotificationCategory = 'general' | 'travelcab' | 'promo' | 'safety' | 'maintenance';

export interface BroadcastStats {
  targeted: number;
  sent: number;
  delivered: number;
  read: number;
}

export interface BroadcastCampaign {
  id: string;
  title: string;
  message: string;
  audience: BroadcastAudience;
  specificIds?: string[];   // IDs específicos si audience === 'specific'
  channel: MessageChannel | 'both';
  soundAlert?: NotificationAudioType;
  category?: NotificationCategory;
  status: BroadcastStatus;
  scheduledAt?: number;
  sentAt?: number;
  stats: BroadcastStats;
  createdBy: string;
  createdAt: number;
}
