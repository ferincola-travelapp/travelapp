// =============================================================================
// TRAVIS IA — Core Cognitive Engine & Omnichannel Coordinator
// POST /api/travis/chat
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { serverGetDoc, serverGetDocs, serverAddDoc, serverUpdateDoc } from '@/lib/firestore-server';
import { TravisConfig, DEFAULT_TRAVIS_CONFIG, BusinessUnit } from '@/types/messaging';
import { queryExternalServiceProviders, formatExternalProvidersForPrompt } from '@/lib/external-providers';
import { normalizeBusinessUnit } from '@/lib/permissions';

// -----------------------------------------------------------------------------
// HELPER: Detector de Unidades de Negocio (6 Unidades Oficiales)
// -----------------------------------------------------------------------------
export function detectDetailedBusinessUnit(
  message: string, 
  existingUnit?: string
): 'TravelCab (Usuario)' | 'TravelCab (Conductor)' | 'TravelApp Experience' | 'TravelApp Rewards' | 'TravelApp Afiliados' | 'TravelApp' {
  const msg = (message || '').toLowerCase();

  // 1. Chofer / Conductor de TravelCab
  if (
    msg.includes('quiero ser chofer') || 
    msg.includes('trabajar como chofer') || 
    msg.includes('ser conductor') || 
    msg.includes('requisitos para chofer') || 
    msg.includes('requisitos para conductor') ||
    msg.includes('inscribir mi auto') || 
    msg.includes('registrar mi auto') || 
    msg.includes('app de conductor') || 
    msg.includes('app chofer') || 
    msg.includes('comision de chofer') || 
    msg.includes('ganancias chofer') || 
    msg.includes('manejar en travelcab') || 
    msg.includes('dar de alta auto') ||
    msg.includes('licencia profesional')
  ) {
    return 'TravelCab (Conductor)';
  }

  // 2. Afiliados / Referidos / Agencias
  if (
    msg.includes('afiliado') || 
    msg.includes('afiliados') || 
    msg.includes('programa de afiliados') || 
    msg.includes('comisionar') || 
    msg.includes('comision por referir') || 
    msg.includes('referido') || 
    msg.includes('codigo de referido') || 
    msg.includes('link de afiliado') || 
    msg.includes('soy agencia') || 
    msg.includes('agencia asociada') || 
    msg.includes('partner')
  ) {
    return 'TravelApp Afiliados';
  }

  // 3. Rewards / Fidelización / Puntos
  if (
    msg.includes('punto') || 
    msg.includes('puntos') || 
    msg.includes('reward') || 
    msg.includes('rewards') || 
    msg.includes('canjear') || 
    msg.includes('canje') || 
    msg.includes('beneficio') || 
    msg.includes('beneficios') || 
    msg.includes('comercio adherido') || 
    msg.includes('billetera') || 
    msg.includes('cashback')
  ) {
    return 'TravelApp Rewards';
  }

  // 4. Experiencias / Turismo / Tours
  if (
    msg.includes('tour') || 
    msg.includes('tours') || 
    msg.includes('excursion') || 
    msg.includes('excursiones') || 
    msg.includes('experiencia') || 
    msg.includes('paseo') || 
    msg.includes('tafi') || 
    msg.includes('quilmes') || 
    msg.includes('san javier') || 
    msg.includes('cadillal') || 
    msg.includes('paquete turistico') || 
    msg.includes('guia') || 
    msg.includes('turismo')
  ) {
    return 'TravelApp Experience';
  }

  // 5. Usuario / Pasajero de TravelCab (traslado, remis, taxi, viaje)
  if (
    msg.includes('viaje') || 
    msg.includes('viajar') || 
    msg.includes('remis') || 
    msg.includes('taxi') || 
    msg.includes('auto') || 
    msg.includes('cuanto sale') || 
    msg.includes('precio de') || 
    msg.includes('cotizar') || 
    msg.includes('traslado') || 
    msg.includes('pedir un auto') || 
    msg.includes('pedir remis') || 
    msg.includes('aeropuerto') || 
    msg.includes('terminal') || 
    msg.includes('travelcab')
  ) {
    return 'TravelCab (Usuario)';
  }

  // 6. Si ya venía una unidad previa específica
  if (existingUnit) {
    if (existingUnit.includes('Conductor')) return 'TravelCab (Conductor)';
    if (existingUnit.includes('Usuario') || existingUnit === 'TravelCab') return 'TravelCab (Usuario)';
    if (existingUnit.includes('Experience') || existingUnit.includes('Experiencias')) return 'TravelApp Experience';
    if (existingUnit.includes('Rewards')) return 'TravelApp Rewards';
    if (existingUnit.includes('Afiliados')) return 'TravelApp Afiliados';
  }

  return 'TravelApp';
}

/**
 * Detecta automáticamente el Sector / Área operativa dentro de la unidad de negocio
 * según la intención del mensaje recibido.
 */
export function detectSectorForUnit(message: string, unit: string): string {
  const msg = (message || '').toLowerCase();
  const isCab = unit.toLowerCase().includes('travelcab') || unit.toLowerCase().includes('conductor');
  const isDriver = unit.toLowerCase().includes('conductor');
  const isRewards = unit.toLowerCase().includes('reward');
  const isExperience = unit.toLowerCase().includes('experience');

  // Reclamos / Quejas
  if (
    msg.includes('reclamo') ||
    msg.includes('queja') ||
    msg.includes('reembolso') ||
    msg.includes('devolucion') ||
    msg.includes('cobro mal') ||
    msg.includes('cobro de mas') ||
    msg.includes('me cobraron') ||
    msg.includes('estafa') ||
    msg.includes('denuncia')
  ) {
    return 'Reclamos';
  }

  // Guardia / Emergencias / Urgencias
  if (
    msg.includes('emergencia') ||
    msg.includes('accidente') ||
    msg.includes('guardia') ||
    msg.includes('urgente') ||
    msg.includes('varado')
  ) {
    if (isCab) return isDriver ? 'Ayuda Conductores' : 'Ayuda Usuario';
    return 'Guardia';
  }

  // Recursos Humanos / Postulaciones / Empleo
  if (
    msg.includes('curriculum') ||
    msg.includes('cv') ||
    msg.includes('trabajar con ustedes') ||
    msg.includes('entrevista') ||
    msg.includes('rrhh') ||
    msg.includes('postulacion')
  ) {
    return isCab ? 'Atención Conductores' : 'Recursos Humanos';
  }

  // Soporte Técnico / App
  if (
    msg.includes('error') ||
    msg.includes('no anda') ||
    msg.includes('no funciona') ||
    msg.includes('bug') ||
    msg.includes('se cierra') ||
    msg.includes('no puedo entrar') ||
    msg.includes('soporte') ||
    msg.includes('contraseña') ||
    msg.includes('clave')
  ) {
    if (isRewards) return 'Atención al Cliente';
    if (isExperience) return 'Atención al Cliente';
    return 'Soporte';
  }

  // Ayuda
  if (msg.includes('ayuda') || msg.includes('como hago') || msg.includes('no entiendo')) {
    if (isCab) return isDriver ? 'Ayuda Conductores' : 'Ayuda Usuario';
    if (!isRewards && !isExperience) return 'Ayuda';
  }

  // Ventas / Cotizaciones / Reservas
  if (
    msg.includes('comprar') ||
    msg.includes('reservar') ||
    msg.includes('cotizar') ||
    msg.includes('precio') ||
    msg.includes('presupuesto') ||
    msg.includes('pagar')
  ) {
    if (!isCab && !isRewards) return 'Ventas';
  }

  // Partners / Comercios en Rewards
  if (
    isRewards &&
    (msg.includes('comercio') || msg.includes('partner') || msg.includes('adherir') || msg.includes('local'))
  ) {
    return 'Atención a Partners';
  }

  if (isCab) {
    return isDriver ? 'Atención Conductores' : 'Atención Usuarios';
  }

  return 'Atención al Cliente';
}

// -----------------------------------------------------------------------------
// HELPER: Load Configuration and Catalogs from Firestore
// -----------------------------------------------------------------------------
async function getTravisConfig(): Promise<TravisConfig> {
  try {
    const configDoc = await serverGetDoc('travisConfig', 'main');
    if (configDoc.exists) {
      return configDoc.data() as TravisConfig;
    }
  } catch { /* fallback */ }
  return { ...DEFAULT_TRAVIS_CONFIG, updatedAt: Date.now() };
}

async function getEcosystemCatalogs(): Promise<string> {
  let catalogContext = '';
  try {
    // 1. Experiences (Tours)
    const expSnap = await serverGetDocs('experiences');
    if (!expSnap.empty) {
      catalogContext += '\n### CATÁLOGO DE EXPERIENCIAS (TOURS) ACTIVAS:\n';
      expSnap.docs.forEach(d => {
        const t = d.data();
        catalogContext += `- ${t.title} (ID: ${t.id}): Ubicación: ${t.location}, Precio: $${t.price} ${t.currency || 'ARS'}, Salida: ${t.departureDate || 'A convenir'}, Tipo: ${t.tripType}, Disponibilidad: ${t.availability || 'Disponible'}. Servicios: ${t.services?.join(', ') || 'Varios'}. Descripción: ${t.description || ''}\n`;
      });
    }

    // 2. Rewards (Loyalty items)
    const rewardsSnap = await serverGetDocs('reward_items');
    if (!rewardsSnap.empty) {
      catalogContext += '\n### PROGRAMA DE PREMIOS Y BENEFICIOS REWARDS:\n';
      rewardsSnap.docs.forEach(d => {
        const r = d.data();
        catalogContext += `- ${r.title}: Requiere ${r.pointsRequired} puntos. Categoría: ${r.category}, Comercio/Socio: ${r.partner || 'TravelApp'}, Estado: ${r.availability || 'Disponible'}. Descripción: ${r.description || ''}\n`;
      });
    }
  } catch (err) {
    console.warn('[Travis RAG] Error loading catalogs:', err);
  }
  return catalogContext;
}

// -----------------------------------------------------------------------------
// HELPER: Google Maps API Distance & Travel Cab Pricing Calculator
// -----------------------------------------------------------------------------
async function estimateTravelCabFare(
  origin: string,
  destination: string,
  categoryName: string = 'Estandar'
): Promise<{
  cost: number;
  distanceKm: number;
  durationMin: number;
  status: string;
}> {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  // Fallback default
  let distanceKm = 8.5;
  let durationMin = 15;
  let status = 'mock_fallback';

  if (mapsKey && !mapsKey.includes('TU_')) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${mapsKey}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        distanceKm = Number((element.distance.value / 1000).toFixed(1));
        durationMin = Math.round(element.duration.value / 60);
        status = 'google_api';
      }
    } catch (err) {
      console.warn('[Travis Maps API] Routing failed, using fallback:', err);
    }
  }

  // 1. Obtener la categoría de la base de datos para mapear id/nombre (o usar fallback de la app)
  let categoryId = 'cat-1';
  if (categoryName.toLowerCase() === 'premium') {
    categoryId = 'cat-2';
  } else if (categoryName.toLowerCase() === 'taxi') {
    categoryId = 'cat-3';
  }

  try {
    const catSnap = await serverGetDocs('categories');
    if (!catSnap.empty) {
      const matchedCat = catSnap.docs.find(d => {
        const name = (d.data().name || '').toLowerCase();
        return name === categoryName.toLowerCase() || d.id === categoryName.toLowerCase();
      });
      if (matchedCat) {
        categoryId = matchedCat.id;
      }
    }
  } catch (err) {
    console.warn('[Travis Pricing] Error fetching categories:', err);
  }

  // 2. Buscar si hay una tarifa activa de Firestore para esta categoría
  let baseFare = 0;
  let pricePerKm = 0;
  let travelMinutePrice = 0;
  let minimumFare = 0;
  let hasActiveTariff = false;

  try {
    const activeTariffSnap = await serverGetDocs('tariffs', {
      where: [['isActive', '==', true]]
    });
    if (!activeTariffSnap.empty) {
      const matchedTariffDoc = activeTariffSnap.docs.find(d => {
        const cat = (d.data().category || '').toLowerCase();
        return cat === categoryId.toLowerCase() || cat === categoryName.toLowerCase();
      });

      if (matchedTariffDoc) {
        const t = matchedTariffDoc.data();
        baseFare = t.baseFare !== undefined ? t.baseFare : 300;
        pricePerKm = t.pricePerKm !== undefined ? t.pricePerKm : 180;
        travelMinutePrice = t.travelMinutePrice !== undefined ? t.travelMinutePrice : 50;
        minimumFare = t.minimumFare !== undefined ? t.minimumFare : 450;
        hasActiveTariff = true;
        status += `_with_db_tariff_${matchedTariffDoc.id}`;
      }
    }
  } catch (err) {
    console.warn('[Travis Pricing] Error loading active tariffs from DB:', err);
  }

  let cost = 0;
  if (!hasActiveTariff) {
    // Si no hay tarifa activa en la BD, calcular en base al fallback de la app y la distancia estimada
    const normalizedCat = categoryName.toLowerCase();
    pricePerKm = normalizedCat === 'premium' ? 550 : normalizedCat === 'taxi' ? 450 : 350;
    baseFare = normalizedCat === 'premium' ? 600 : normalizedCat === 'taxi' ? 450 : 350;
    cost = Math.round(baseFare + pricePerKm * distanceKm);
  } else {
    // Si hay tarifa activa en la BD, usar sus valores reales
    const calculated = baseFare + (pricePerKm * distanceKm) + (travelMinutePrice * durationMin);
    cost = Math.max(minimumFare, Math.round(calculated));
  }

  return { cost, distanceKm, durationMin, status };
}

// -----------------------------------------------------------------------------
// Reusable Core AI Processor
// -----------------------------------------------------------------------------
export async function processTravisMessage(
  message: string, 
  history: any[], 
  businessUnit: string, 
  conversationId?: string,
  audioInput?: { base64: string; mimeType: string }
) {
  // 1. Detectar Unidad de Negocio Heurística inicial y consultar Proveedores Externos
  const detectedUnit = detectDetailedBusinessUnit(message, businessUnit);
  const externalProvidersData = await queryExternalServiceProviders(message, detectedUnit);
  const externalProvidersPrompt = formatExternalProvidersForPrompt(externalProvidersData);

  // 2. Cargar Configuración base e incorporar Catálogos de Experiencias y Rewards
  const config = await getTravisConfig();
  const catalogs = await getEcosystemCatalogs();
  
  // Calcular disponibilidad de despacho por horarios de Argentina
  const now = new Date();
  const argTime = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Tucuman',
    hour: 'numeric',
    hour12: false
  }).format(now);
  const currentHour = parseInt(argTime, 10);
  
  // Despacho IA permitido de 22:00 a 08:00 o si está forzado manualmente
  const isOutOfHours = currentHour >= 22 || currentHour < 8;
  const isDispatchAllowed = isOutOfHours || !!config.isAiDispatchForcedEnabled;
  
  // Unir system prompt base + contexto de negocio
  let systemPrompt = config.systemPrompt;
  systemPrompt += `\n\nCONTEXTO GENERAL DEL NEGOCIO:\n${config.businessContext}`;
  
  // Instrucciones cognitivas ocultas para habilitar Cotizador, Captura de Leads y Handoff
  systemPrompt += `
\nINSTRUCCIONES CRÍTICAS DE SISTEMA (OCULTAS AL USUARIO):
1. **Identificación y Segmentación en 6 Unidades de Negocio**:
   Al final de cada respuesta que des, debes clasificar internamente la consulta del usuario agregando de forma invisible la siguiente etiqueta: [UNIT: NOMBRE_UNIDAD]. Las únicas opciones válidas son:
   * [UNIT: TravelCab (Usuario)] - Traslados, viajes, remis, taxi, estimaciones de precios, horarios o viajes al aeropuerto/terminal.
   * [UNIT: TravelCab (Conductor)] - Personas interesadas en manejar, ser chofer, registrar su auto, requisitos mecánicos/legales, comisiones y cobros.
   * [UNIT: TravelApp Experience] - Excursiones turísticas, tours en Tucumán y Norte (Tafí del Valle, Quilmes, San Javier, Cadillal, Cafayate), paquetes de turismo.
   * [UNIT: TravelApp Rewards] - Programa de fidelización, cómo sumar puntos (1 punto x $100), canje por viajes o comida, comercios adheridos, niveles VIP.
   * [UNIT: TravelApp Afiliados] - Programa de afiliados para agencias, hoteles, comercios y creadores para ganar comisiones en dinero real refiriendo clientes o choferes.
   * [UNIT: TravelApp] - Consultas institucionales generales de la plataforma y super-app.

2. **Pautas específicas por Unidad de Negocio**:
   * **TravelCab (Usuario)**: Para cotizar, solo necesitas Origen y Destino. Responde normalmente e incluye la etiqueta exacta: [QUOTE: ORIGEN TO DESTINO]. Ejemplo: [QUOTE: Yerba Buena TO Plaza Independencia]. El sistema calculará la tarifa en base a Google Maps y categorías (Estándar, Premium, Taxi). Si el cliente confirma, solicita Nombre, Teléfono y Forma de Pago (Efectivo, Mercado Pago / Billetera Virtual o Puntos Rewards).
   * **TravelCab (Conductor)**: ¡Gran oportunidad laboral con la comisión más baja de Tucumán y el Norte (10-15%)! Requisitos obligatorios: Licencia de conducir profesional al día, auto modelo 2013 en adelante en excelente estado, seguro automotor, cédula verde/azul, VTV/RTO y certificado de antecedentes penales. Cobros semanales directos. Enlace de registro: https://travelapp.ar/conductores. Si te dan sus datos, captura su Nombre, Teléfono y Auto para que el equipo de soporte lo contacte.
   * **TravelApp Experience**: Tours destacados en Tucumán: Tafí del Valle & Ruinas de Quilmes; Circuito de Las Yungas (San Javier, Cristo Bendicente, Villa Nougués y El Cadillal); Cafayate (Ruta del Vino); Termas de Río Hondo. Pagos financiados con Nave (Banco Galicia) y Mercado Pago. Si cotizas un tour, añade [PDF_GENERATE: Experiencia | Detalles].
   * **TravelApp Rewards**: Los usuarios acumulan 1 punto por cada $100 gastados en traslados o comercios de la red. Canjes por traslados gratuitos o consumos en bares y locales asociados. Niveles: Nivel 1 (Pasajero Frecuente) y Nivel 2 (VIP con atención prioritaria).
   * **TravelApp Afiliados**: Programa de socios para agencias de viajes, hoteles, guías y personas independientes. Ganancias en efectivo por cada pasajero que viaje o chofer que se sume con su código o link.

3. **Despacho de Viajes**: Si el cliente confirma de manera explícita que desea pedir el traslado cotizado (ej: "sí, pedilo", "confirmar traslado"), incluye la etiqueta invisible: [DISPATCH: TIPO_SERVICIO | ORIGEN TO DESTINO | PASAJERO | TELEFONO | ASIENTOS | PAGO | CATEGORIA].
   * TIPO_SERVICIO: "MU" (Movilidad Urbana) o "ARC" (Auto Rural Compartido).
   * REGLA DE HORARIO OPERATIVO: Hora actual en Tucumán: ${currentHour}:00 hs. ¿Despacho IA habilitado?: ${isDispatchAllowed ? 'SÍ' : 'NO'}. Si es "NO", explica amablemente que de 08:00 a 22:00 la asignación la realiza el operador humano de guardia y que aguarde confirmación.

4. **Botones Interactivos de WhatsApp**: Si es oportuno brindar opciones de respuesta rápida, añade al final la etiqueta: [BUTTONS: Opcion 1 | Opcion 2 | Opcion 3] (máximo 20 caracteres por botón).
5. **Captura de Leads y Datos**: Si el cliente menciona datos personales o solicita contacto, añade invisiblemente: [DATA: {"name": "...", "phone": "...", "email": "...", "handoff": true/false}].
6. **Escalamiento Humano (Handoff)**: Si solicita hablar con una persona, pagar un tour complejo, resolver un problema o dice "hablar con operador", pon "handoff": true en [DATA: ...] y despide informando que un operador humano se comunicará a la brevedad.
7. **Localización de Lenguaje**: Habla en español rioplatense argentino cálido y profesional (usando "vos", "tenés", "contame").
`;

  // 2. Comprobar si hay handoff triggers de texto plano configurados
  const needsHandoffDirect = config.handoffTriggers.some(trigger =>
    message.toLowerCase().includes(trigger.toLowerCase())
  );

  if (needsHandoffDirect && conversationId) {
    // Registrar handoff en la conversación
    await serverUpdateDoc('conversations', conversationId, {
      status: 'pending',
      lastMessage: 'Handoff escalado por trigger de texto',
      lastMessageAt: Date.now()
    });
    return {
      response: 'Entendido, che. En este momento te conecto con un miembro de nuestro equipo para que te asista de forma personalizada. Por favor, aguardá un instante. 🙏',
      buttons: [{ id: 'btn_talk_human', title: '👤 Esperar Operador' }],
      needsHandoff: true,
      businessUnit,
      source: 'local_handoff'
    };
  }

  // 3. Llamar a la API REST de Gemini directamente
  let geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!geminiKey) {
    console.warn("GEMINI_API_KEY is not defined in environment variables.");
  }
  
  let aiResponse = '';
  let isMock = true;

  const officialUnit = normalizeBusinessUnit(businessUnit);
  const unitGreeting = config.unitGreetings?.[officialUnit];

  const knowledgeBaseSerialized =
    (config.knowledgeBase
      ?.map((k) => {
        const rules: string[] = [];
        rules.push(
          k.allowClosingSale
            ? 'REGLA DE CIERRE: AUTORIZADO A CERRAR VENTA directamente en este servicio.'
            : 'REGLA DE CIERRE: NO CERRAR VENTA — Asesorá al cliente con excelencia, resolvé dudas, calificá su necesidad y derivá/agendá con un operador humano para el cierre.'
        );
        if (k.includeNotes?.trim()) {
          rules.push(`QUÉ INFORMACIÓN SÍ TOMAR / PRIORIZAR: ${k.includeNotes.trim()}`);
        }
        if (k.excludeNotes?.trim()) {
          rules.push(`PROHIBIDO DECIRLE AL CLIENTE (OMITIR SIEMPRE): ${k.excludeNotes.trim()}`);
        }
        return `## [Artículo: ${k.category}${k.sector ? ` | Sector: ${k.sector}` : ''}${k.sourceType ? ` | Fuente: ${k.sourceType.toUpperCase()}` : ''}] ${k.title}\n${rules.join('\n')}\n\n${k.content}`;
      })
      .join('\n\n---\n\n') || '') +
    '\n' +
    catalogs;

  const salesAndGreetingPolicy = `\n\nPOLÍTICA COMERCIAL Y SALUDO OFICIAL:\n- Sos el mejor vendedor y asesor consultivo del ecosistema, pero POR REGLA GENERAL NO CERRÁS LA VENTA NI COBRÁS VOS: tu objetivo es enamorar al cliente, resolver sus dudas, tomar sus datos y derivar o agendar el cierre con un operador humano (salvo en los servicios/artículos donde se indique explícitamente "AUTORIZADO A CERRAR VENTA").\n- Respetá estrictamente las indicaciones de "QUÉ INFORMACIÓN SÍ TOMAR" y "PROHIBIDO DECIRLE AL CLIENTE" de cada documento/URL de la Base de Conocimientos.${
    unitGreeting?.trim()
      ? `\n- SALUDO ESTANDARIZADO PARA ${officialUnit}: Si estás iniciando la conversación o saludando por primera vez, usá este saludo oficial adaptado al cliente:\n"${unitGreeting.trim()}"`
      : ''
  }`;

  if (geminiKey && !geminiKey.includes('TU_')) {
    try {
      const contents = [];
      // Agregar historial
      if (history && Array.isArray(history)) {
        history.forEach((h: any) => {
          const role = h.role === 'assistant' || h.role === 'travis' || h.role === 'model' ? 'model' : 'user';
          contents.push({
            role,
            parts: [{ text: h.content || h.message || '' }]
          });
        });
      }
      
      // Agregar mensaje actual (soporta texto y audio multimodal)
      if (audioInput && audioInput.base64) {
        contents.push({
          role: 'user',
          parts: [
            { text: message && message !== '[Nota de voz de WhatsApp recibida]' ? message : 'Escuchá atentamente este mensaje de audio del cliente de WhatsApp y responde de forma completa y cordial como Travis de TravelApp:' },
            {
              inlineData: {
                mimeType: audioInput.mimeType || 'audio/ogg',
                data: audioInput.base64
              }
            }
          ]
        });
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });
      }

      const fullPrompt = `${systemPrompt}${salesAndGreetingPolicy}\n\nBASE DE CONOCIMIENTOS DE LA EMPRESA (RAG):\n${knowledgeBaseSerialized}${externalProvidersPrompt}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: fullPrompt }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (aiResponse) isMock = false;
      } else {
        const errText = await response.text();
        console.warn('[Travis Gemini REST] API call failed:', errText);
      }
    } catch (err) {
      console.warn('[Travis Gemini REST] Fetch failed, fallback to mock:', err);
    }
  }

  // Fallback Mock local si la API de Gemini no responde o no está configurada la Key
  if (isMock) {
    const queryTerm = message.toLowerCase();
    const matchedArticle = config.knowledgeBase?.find(k => 
      queryTerm.includes(k.title.toLowerCase()) || 
      k.title.toLowerCase().split(/\s+/).some(word => word.length > 3 && queryTerm.includes(word)) ||
      k.content.toLowerCase().includes(queryTerm)
    );

    if (matchedArticle) {
      aiResponse = matchedArticle.content;
    } else if (message.toLowerCase().includes('cotiz') || message.toLowerCase().includes('cuanto sale') || message.toLowerCase().includes('precio de')) {
      aiResponse = `Por supuesto, puedo darte un estimado. [QUOTE: Yerba Buena TO Plaza Independencia tucuman]. Si deseas confirmarlo, facilitame tu Nombre y Teléfono.`;
    } else if (message.toLowerCase().includes('tour') || message.toLowerCase().includes('mendoza')) {
      aiResponse = `¡Excelente elección! Mendoza Wine Tour Premium (USD 350) incluye visitas guiadas a bodegas boutique del Valle de Uco con almuerzo maridado. ¿Querés que agende tus datos para reservar? [PDF_GENERATE: Experiencia | Mendoza Tour Premium]`;
    } else {
      aiResponse = `¡Hola! Soy Travis, tu asistente virtual de TravelApp. Puedo cotizarte viajes en TravelCab, coordinar excursiones en Experiencias o consultar tus puntos de Rewards. ¿En qué te puedo ayudar hoy?`;
    }
  }

  // 4. Interceptar y procesar etiqueta [QUOTE: ORIGIN TO DESTINATION]
  const quoteRegex = /\[QUOTE:\s*([^\]]+?)\s*TO\s*([^\]]+?)\]/i;
  const quoteMatch = aiResponse.match(quoteRegex);
  if (quoteMatch) {
    const origin = quoteMatch[1].trim();
    const destination = quoteMatch[2].trim();
    
    // Obtener las categorías de la base de datos o fallbacks
    let categoriesList: { id: string; name: string }[] = [];
    try {
      const catSnap = await serverGetDocs('categories');
      if (!catSnap.empty) {
        categoriesList = catSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
      }
    } catch (err) {
      console.warn('[Travis Pricing] Error fetching categories:', err);
    }
    if (categoriesList.length === 0) {
      categoriesList = [
        { id: 'cat-1', name: 'Estandar' },
        { id: 'cat-2', name: 'Premium' },
        { id: 'cat-3', name: 'Taxi' }
      ];
    }

    let pricingDetailsText = '';
    let primaryEstimation: any = null;
    for (const cat of categoriesList) {
      const estimation = await estimateTravelCabFare(origin, destination, cat.name);
      if (!primaryEstimation) {
        primaryEstimation = estimation;
      }
      pricingDetailsText += `• **${cat.name}:** $${estimation.cost.toLocaleString('es-AR')} ARS\n`;
    }

    const pricingText = `\n\n📌 **COTIZACIÓN ESTIMADA DE TRASLADO (TravelCab):**\n` +
                        `• **Desde:** ${origin}\n` +
                        `• **Hasta:** ${destination}\n` +
                        `• **Distancia aprox:** ${primaryEstimation.distanceKm} km (${primaryEstimation.durationMin} mins)\n\n` +
                        `🚕 **Opciones de viaje disponibles:**\n` +
                        pricingDetailsText +
                        `*(El costo final puede variar por tráfico o paradas intermedias)*`;
    
    aiResponse = aiResponse.replace(quoteRegex, () => pricingText);

    // Trigger Zapier Webhook para Nueva Cotización en segundo plano con la estimación principal
    if (process.env.ZAPIER_WEBHOOK_NEW_BOOKING && primaryEstimation) {
      fetch(process.env.ZAPIER_WEBHOOK_NEW_BOOKING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          distanceKm: primaryEstimation.distanceKm,
          cost: primaryEstimation.cost,
          conversationId,
          timestamp: Date.now()
        })
      }).catch(() => {});
    }
  }

  // 4.5. Interceptar y procesar etiqueta [DISPATCH: TIPO_SERVICIO | ORIGEN TO DESTINO | PASAJERO | TELEFONO | ASIENTOS | PAGO]
  const dispatchRegex = /\[DISPATCH:\s*([^\]]+?)\]/i;
  const dispatchMatch = aiResponse.match(dispatchRegex);
  if (dispatchMatch) {
    const rawParams = dispatchMatch[1].split('|').map((s: string) => s.trim());
    if (rawParams.length >= 4) {
      const serviceType = rawParams[0].toUpperCase() === 'ARC' ? 'ARC' : 'MU';
      const routeParts = rawParams[1].split(/\s+TO\s+/i);
      const origin = routeParts[0] ? routeParts[0].trim() : 'Origen no especificado';
      const destination = routeParts[1] ? routeParts[1].trim() : 'Destino no especificado';
      const passengerName = rawParams[2] || 'Pasajero Chat';
      const passengerPhone = rawParams[3] || 'No provisto';
      const seats = rawParams[4] ? parseInt(rawParams[4], 10) || 1 : 1;
      const paymentMethod = rawParams[5] || 'Efectivo';
      const categoryName = rawParams[6] || 'Estandar';

      try {
        const estimation = await estimateTravelCabFare(origin, destination, categoryName);
        let finalPrice = estimation.cost;
        if (serviceType === 'ARC') {
          finalPrice = estimation.cost * seats;
        }
        
        const tripRef = await serverAddDoc('trips', {
          passengerName,
          passengerPhone,
          origin,
          destination,
          status: 'Buscando Chofer',
          price: finalPrice,
          distanceKm: estimation.distanceKm,
          durationMinutes: estimation.durationMin,
          serviceType,
          seats,
          paymentMethod,
          paymentStatus: paymentMethod === 'Efectivo' ? 'pending' : 'awaiting_payment',
          category: categoryName.toLowerCase(),
          createdAt: Date.now(),
          source: 'travis_ai_dispatch'
        });

        const serviceLabel = serviceType === 'ARC' ? 'Auto Rural Compartido (ARC)' : 'Movilidad Urbana (MU)';
        const seatLabel = serviceType === 'ARC' ? `\n• **Asientos Reservados:** ${seats}` : '';
        const paymentLabel = paymentMethod === 'Efectivo' 
          ? 'Efectivo (Pago al conductor)' 
          : paymentMethod === 'Puntos Rewards' 
            ? 'Puntos Rewards' 
            : 'Billetera Virtual';

        const confirmationText = `\n\n🚕 **TRASLADO PROGRAMADO Y DESPACHADO:**\n` +
                                 `• **Código de Viaje:** ${tripRef.id}\n` +
                                 `• **Servicio:** ${serviceLabel}${seatLabel}\n` +
                                 `• **Categoría:** ${categoryName}\n` +
                                 `• **Origen:** ${origin}\n` +
                                 `• **Destino:** ${destination}\n` +
                                 `• **Forma de Pago:** ${paymentLabel}\n` +
                                 `• **Tarifa Total Estimada:** $${finalPrice.toLocaleString('es-AR')} ARS\n` +
                                 `Estamos buscando tu conductor. Te notificaremos al instante en que acepte el viaje. 🙌`;

        aiResponse = aiResponse.replace(dispatchRegex, () => confirmationText);
      } catch (dispatchErr) {
        console.error('[Travis Dispatch] Error creating trip from chat:', dispatchErr);
        aiResponse = aiResponse.replace(dispatchRegex, '\n*(Error interno al procesar el despacho del viaje)*');
      }
    }
  }

  // Interceptar redirección de aplicación móvil
  const redirectRegex = /\[REDIRECT:\s*APP_MOVIL\s*\]/i;
  if (redirectRegex.test(aiResponse)) {
    aiResponse = aiResponse.replace(redirectRegex, '') + 
                 `\n\n📲 **Descargá la App:** Para pedir o cotizar un viaje desde tu celular, por favor descargá nuestra aplicación móvil oficial desde aquí: [App Store / Google Play](https://travelapp.com/download)`;
  }

  // Interceptar generación de PDFs de Experience
  const pdfRegex = /\[PDF_GENERATE:\s*([^\]|]+?)\s*\|\s*([^\]]+?)\]/i;
  const pdfMatch = aiResponse.match(pdfRegex);
  if (pdfMatch) {
    const tourName = pdfMatch[1].trim();
    const tourDetails = pdfMatch[2].trim();
    const pdfUrl = `/api/experiences/download-pdf?tour=${encodeURIComponent(tourName)}`;
    const pdfText = `\n\n📄 **PROPUESTA EN PDF GENERADA:**\n` +
                    `• **Tour:** ${tourName}\n` +
                    `• Podés descargar tu itinerario y propuesta en PDF haciendo clic aquí: [Descargar Propuesta PDF](${pdfUrl})`;
    aiResponse = aiResponse.replace(pdfRegex, () => pdfText);
  }

  // 5. Interceptar y procesar etiqueta [DATA: JSON_BLOCK]
  const dataRegex = /\[DATA:\s*(\{.+?\})\s*\]/;
  const dataMatch = aiResponse.match(dataRegex);
  let parsedData: { name?: string; phone?: string; email?: string; handoff?: boolean } = {};

  if (dataMatch) {
    try {
      parsedData = JSON.parse(dataMatch[1]);
      aiResponse = aiResponse.replace(dataRegex, ''); // Quitar etiqueta invisible de la respuesta final
    } catch (err) {
      console.error('[Travis Engine] Error parsing captured JSON data:', err);
    }
  }

  // 5.3. Interceptar y procesar etiqueta cognitiva de Unidad de Negocio [UNIT: ...]
  const unitRegex = /\[UNIT:\s*([^\]]+?)\]/i;
  const unitMatch = aiResponse.match(unitRegex);
  let finalUnit: string = detectedUnit;
  if (unitMatch) {
    const rawUnit = unitMatch[1].trim();
    if (
      rawUnit === 'TravelCab (Usuario)' ||
      rawUnit === 'TravelCab (Conductor)' ||
      rawUnit === 'TravelApp Experience' ||
      rawUnit === 'TravelApp Rewards' ||
      rawUnit === 'TravelApp Afiliados' ||
      rawUnit === 'TravelApp'
    ) {
      finalUnit = rawUnit;
    }
    aiResponse = aiResponse.replace(unitRegex, '').trim();
  }

  // Sincronizar con el CRM Leads de Firestore si hay datos o si forzamos Handoff
  const hasLeadData = parsedData.name || parsedData.phone || parsedData.email;
  const executionHandoff = parsedData.handoff || needsHandoffDirect;

  if (hasLeadData || executionHandoff) {
    try {
      let leadId = null;

      const leadPayload = {
        customerName: parsedData.name || 'Prospecto Omnicanal',
        phone: parsedData.phone || '',
        email: parsedData.email || '',
        origin: 'WhatsApp',
        status: executionHandoff ? 'En Espera Operador' : 'Nuevos',
        customerStatus: 'Prospecto',
        customerLevel: 1,
        businessUnit: finalUnit,
        lastInteraction: Date.now(),
        conversationId: conversationId || ''
      };

      // Buscar duplicados por teléfono
      if (parsedData.phone) {
        const snap = await serverGetDocs('leads', {
          where: [['phone', '==', parsedData.phone]],
          limit: 1
        });
        if (!snap.empty) {
          leadId = snap.docs[0].id;
          await serverUpdateDoc('leads', leadId, { ...leadPayload, updatedAt: Date.now() });
        }
      }

      // Si no existe, crear uno nuevo
      if (!leadId) {
        const newDoc = await serverAddDoc('leads', {
          ...leadPayload,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        leadId = newDoc.id;
      }

      // Trigger Zapier Webhook para Lead capturado en segundo plano
      if (process.env.ZAPIER_WEBHOOK_NEW_LEAD) {
        fetch(process.env.ZAPIER_WEBHOOK_NEW_LEAD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId, ...leadPayload })
        }).catch(() => {});
      }

      // Si es handoff, actualizar estado de la conversación en Firestore
      if (conversationId) {
        await serverUpdateDoc('conversations', conversationId, {
          ...(executionHandoff ? { status: 'pending', lastMessage: 'Handoff activado por IA' } : {}),
          'metadata.businessUnit': finalUnit,
          lastMessageAt: Date.now()
        });
      }
    } catch (crmErr) {
      console.error('[Travis CRM Sync] Error syncing lead:', crmErr);
    }
  }

  // 5.5. Interceptar y procesar etiqueta [BUTTONS: Opcion 1 | Opcion 2 | Opcion 3]
  const buttonsRegex = /\[BUTTONS:\s*([^\]]+?)\]/i;
  const buttonsMatch = aiResponse.match(buttonsRegex);
  let extractedButtons: { id: string; title: string }[] = [];

  if (buttonsMatch) {
    const rawButtons = buttonsMatch[1].split('|').map((s: string) => s.trim()).filter(Boolean);
    extractedButtons = rawButtons.slice(0, 3).map((title: string, idx: number) => ({
      id: `btn_${idx}_${Date.now()}`,
      title: title.slice(0, 20),
    }));
    aiResponse = aiResponse.replace(buttonsRegex, '').trim();
  }

  // Si hubo una cotización de TravelCab y no hay botones, añadimos opciones inmediatas de confirmación
  if (quoteMatch && extractedButtons.length === 0) {
    extractedButtons = [
      { id: 'btn_confirm_trip', title: '🚕 Pedir Traslado' },
      { id: 'btn_talk_operator', title: '👤 Operador Humano' },
    ];
  }

  return {
    response: aiResponse.trim(),
    buttons: extractedButtons.length > 0 ? extractedButtons : undefined,
    businessUnit: finalUnit,
    source: isMock ? 'mock_fallback' : 'gemini_2_5_flash',
    needsHandoff: executionHandoff,
  };
}

// -----------------------------------------------------------------------------
// POST Handler
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      message, 
      conversationId, 
      businessUnit = 'General',
      history = [],
      audioInput
    } = body;

    if (!message?.trim() && !audioInput) {
      return NextResponse.json({ error: 'Message or audioInput is required' }, { status: 400 });
    }

    const result = await processTravisMessage(message || '', history, businessUnit, conversationId, audioInput);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[Travis Chat API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
  }
}
