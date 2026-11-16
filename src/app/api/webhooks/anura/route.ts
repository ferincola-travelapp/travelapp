// =============================================================================
// ANURA CLOUD PBX WEBHOOK & CLICK2DIAL — TravelApp Ecosystem
// Integración $0 Costo Extra: Central Telefónica Anura → Travis WhatsApp + CRM
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { serverGetDoc, serverAddDoc, serverSetDoc } from '@/lib/firestore-server';
import { TravisConfig, DEFAULT_TRAVIS_CONFIG, CallAttentionStatus, BusinessUnit } from '@/types/messaging';
import { sendWhatsAppInteractiveButtons } from '@/lib/meta-whatsapp';
import { normalizeBusinessUnit } from '@/lib/permissions';

/**
 * Normaliza un número telefónico argentino recibido desde Anura (ANI) al formato internacional WhatsApp (549...)
 */
function normalizeArgentinaPhoneForWhatsApp(rawPhone: string): string {
  let digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';

  // Quitar prefijo 00 si existe
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Quitar 0 inicial de larga distancia nacional (ej: 0381 -> 381)
  if (digits.startsWith('0')) digits = digits.slice(1);
  // Quitar 15 si vino pegado al principio sin código de área (asumir Tucumán 381 por defecto)
  if (digits.startsWith('15') && digits.length <= 9) {
    digits = '549381' + digits.slice(2);
  }
  // Si empieza con 54 pero sin el 9 de celular (ej: 54381...)
  if (digits.startsWith('54') && !digits.startsWith('549') && digits.length === 12) {
    digits = '549' + digits.slice(2);
  }
  // Si tiene 10 dígitos nacionales (ej: 3814188106), anteponer 549
  if (!digits.startsWith('54') && digits.length === 10) {
    digits = '549' + digits;
  }

  return digits;
}

async function processAnuraCallEvent(params: Record<string, any>) {
  const rawCaller =
    params.ani ||
    params.caller ||
    params.calling ||
    params.from ||
    params.caller_id ||
    params.numero ||
    params.phone ||
    '';

  const callStatus = String(
    params.status || params.state || params.event || params.disposition || 'INCOMING'
  ).toUpperCase();

  const callId = String(params.call_id || params.uniqueid || params.id || `anura_${Date.now()}`);
  const safeCallDocId = callId.replace(/[/\\#?]/g, '_');
  const extension = String(params.extension || params.agent || params.interno || '');
  const dnis = String(params.dnis || params.did || params.called || '');
  const directionRaw = String(params.direction || params.tipo || 'inbound').toLowerCase();
  const direction: 'inbound' | 'outbound' = directionRaw.includes('out') || directionRaw.includes('saliente') ? 'outbound' : 'inbound';

  const recordingUrl = String(
    params.recording_url ||
    params.recordingUrl ||
    params.recording ||
    params.grabacion ||
    params.url_grabacion ||
    params.audio_url ||
    params.media_url ||
    ''
  ).trim();

  const durationRaw = params.duration ?? params.billsec ?? params.duracion;
  const durationSeconds = durationRaw !== undefined && durationRaw !== '' ? Number(durationRaw) || 0 : undefined;

  // Unidad de negocio y sector (configurable por parámetro o inferido por defecto)
  const rawUnit = params.businessUnit || params.unit || params.unidad || 'TravelCab';
  const businessUnit: BusinessUnit = normalizeBusinessUnit(String(rawUnit));
  const defaultSector = businessUnit === 'TravelCab' ? 'Atención Usuarios' : 'Atención al Cliente';
  const sector = String(params.sector || params.area || defaultSector);

  const cleanPhone = normalizeArgentinaPhoneForWhatsApp(String(rawCaller));
  if (!cleanPhone || cleanPhone.length < 10) {
    return NextResponse.json({
      status: 'ignored',
      reason: 'Sin número de origen válido (ANI)',
      received: params,
    });
  }

  // Cargar configuración de Travis + Anura
  let config: TravisConfig = { ...DEFAULT_TRAVIS_CONFIG, updatedAt: Date.now() };
  try {
    const snap = await serverGetDoc('travisConfig', 'main');
    if (snap.exists) {
      config = { ...DEFAULT_TRAVIS_CONFIG, ...(snap.data() as TravisConfig) };
    }
  } catch {
    // fallback default
  }

  const anuraCfg = config.anuraConfig || DEFAULT_TRAVIS_CONFIG.anuraConfig!;
  if (!anuraCfg.enabled) {
    return NextResponse.json({ status: 'anura_disabled' });
  }

  // Verificar si estamos fuera de horario en Tucumán (22:00 a 08:00)
  const argHourStr = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Tucuman',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  const currentHour = parseInt(argHourStr, 10);
  const isOutOfHours = currentHour >= 22 || currentHour < 8;

  // Disparar WhatsApp en cualquier llamada entrante al Preatendedor (o cuando no fue atendida por los internos de operadores 100/101)
  const wasAnsweredByHumanOperator =
    extension === '100' || extension === '101';

  const isMissedOrTrigger =
    !wasAnsweredByHumanOperator ||
    callStatus.includes('MISS') ||
    callStatus.includes('NO_ANSWER') ||
    callStatus.includes('BUSY') ||
    callStatus.includes('CANCEL') ||
    callStatus.includes('IVR') ||
    callStatus.includes('TRAVIS') ||
    callStatus.includes('INCOMING') ||
    callStatus.includes('END') ||
    callStatus.includes('START') ||
    callStatus.includes('ANSWERED') ||
    (isOutOfHours && anuraCfg.autoWhatsAppOnOutOfHours);

  // Verificar si ya existe registro previo para este callId (evitar duplicar WhatsApp en evento de fin de llamada)
  let existingCall: Record<string, any> | null = null;
  try {
    const existingSnap = await serverGetDoc('calls', safeCallDocId);
    if (existingSnap.exists) {
      existingCall = existingSnap.data() || null;
    }
  } catch {
    // ignore
  }

  let whatsappSent = Boolean(existingCall?.whatsappAutoReplySent);
  let whatsappDetail: any = null;
  const welcomeMessage =
    anuraCfg.missedCallWhatsAppMessage ||
    DEFAULT_TRAVIS_CONFIG.anuraConfig!.missedCallWhatsAppMessage;

  if (!whatsappSent && anuraCfg.autoWhatsAppOnMissedCall && isMissedOrTrigger) {
    const waRes = await sendWhatsAppInteractiveButtons(
      cleanPhone,
      welcomeMessage,
      [
        { id: 'anura_btn_cab', title: '🚕 Pedir un Móvil' },
        { id: 'anura_btn_tours', title: '🗺️ Excursiones' },
        { id: 'anura_btn_human', title: '👤 Operador' },
      ],
      {
        headerText: '📞 Central Telefónica TravelApp',
        footerText: 'Travis IA — Atención Inmediata',
      }
    );
    whatsappSent = waRes.success;
    whatsappDetail = waRes.data || waRes.error;
  }

  // Registrar llamada y conversación en Firestore + CRM
  try {
    const now = Date.now();
    const conversationId = `wa_${cleanPhone}`;
    const callerLabel = existingCall?.callerName || `Llamada Anura (${cleanPhone})`;

    // Determinar estado de atención de la llamada/grabación
    let attentionStatus: CallAttentionStatus = existingCall?.attentionStatus || 'pendiente_atencion';
    if (!existingCall?.attentionStatus) {
      if (recordingUrl || !wasAnsweredByHumanOperator || isOutOfHours) {
        attentionStatus = whatsappSent ? 'pendiente_respuesta' : 'pendiente_atencion';
      } else {
        attentionStatus = 'en_curso';
      }
    }

    // Guardar/actualizar documento dedicado en colección 'calls' (con grabación si existe)
    await serverSetDoc('calls', safeCallDocId, {
      callId,
      callerPhone: cleanPhone,
      callerName: callerLabel,
      extension: extension || existingCall?.extension || '',
      dnis: dnis || existingCall?.dnis || '',
      direction,
      callStatus,
      ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      ...(recordingUrl ? { recordingUrl } : existingCall?.recordingUrl ? { recordingUrl: existingCall.recordingUrl } : {}),
      attentionStatus,
      businessUnit: existingCall?.businessUnit || businessUnit,
      sector: existingCall?.sector || sector,
      conversationId,
      whatsappAutoReplySent: whatsappSent,
      isOutOfHours,
      createdAt: existingCall?.createdAt || now,
      updatedAt: now,
    });

    if (!existingCall) {
      await serverAddDoc(`conversations/${conversationId}/messages`, {
        conversationId,
        sender: { id: 'system', name: 'Central Anura', role: 'system' },
        content: `📞 Llamada telefónica recibida en Anura (Estado: ${callStatus}${extension ? ` • Interno: ${extension}` : ''} • ID: ${callId})`,
        timestamp: now,
        type: 'system',
        channel: 'whatsapp',
        isRead: false,
      });

      if (whatsappSent) {
        await serverAddDoc(`conversations/${conversationId}/messages`, {
          conversationId,
          sender: { id: 'travis', name: 'Travis IA', role: 'travis' },
          content: welcomeMessage,
          timestamp: now + 1,
          type: 'text',
          channel: 'whatsapp',
          isRead: false,
        });
      }

      await serverSetDoc('conversations', conversationId, {
        type: 'customer_support',
        channel: 'whatsapp',
        status: 'bot',
        customerName: callerLabel,
        externalId: cleanPhone,
        participants: [
          { id: cleanPhone, name: callerLabel, role: 'customer', phone: cleanPhone },
          { id: 'travis', name: 'Travis IA', role: 'travis' },
        ],
        lastMessage: whatsappSent
          ? `📞→📱 Travis envió WhatsApp tras llamada en Anura`
          : `📞 Llamada en Anura (${callStatus})`,
        lastMessageAt: now,
        unreadCount: 1,
        metadata: {
          businessUnit,
          sector,
          passengerName: callerLabel,
        },
        createdAt: now,
        updatedAt: now,
      });

      await serverAddDoc('leads', {
        customerName: callerLabel,
        phone: cleanPhone,
        origin: 'WhatsApp',
        status: 'Nuevos',
        customerStatus: 'Prospecto',
        customerLevel: 1,
        businessUnit,
        sector,
        conversationId,
        createdAt: now,
        lastInteraction: now,
      });
    }
  } catch (err) {
    console.warn('[Anura Webhook] Error guardando registro en Firestore:', err);
  }

  return NextResponse.json({
    success: true,
    callId: safeCallDocId,
    caller: cleanPhone,
    callStatus,
    recordingSaved: Boolean(recordingUrl),
    whatsappAutoReplySent: whatsappSent,
    whatsappDetail,
  });
}

// Soporta tanto GET (query params de Webhooks simples de Anura) como POST (JSON o form-urlencoded)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    params[k] = v;
  });
  return processAnuraCallEvent(params);
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body: Record<string, any> = {};
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      const sp = new URLSearchParams(text);
      sp.forEach((v, k) => {
        body[k] = v;
      });
    }
    return await processAnuraCallEvent(body);
  } catch (error: any) {
    console.error('[Anura Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
