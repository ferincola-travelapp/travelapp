// =============================================================================
// ANURA CLOUD PBX WEBHOOK & CLICK2DIAL — TravelApp Ecosystem
// Integración $0 Costo Extra: Central Telefónica Anura → Travis WhatsApp + CRM
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { serverGetDoc, serverAddDoc, serverSetDoc } from '@/lib/firestore-server';
import { TravisConfig, DEFAULT_TRAVIS_CONFIG } from '@/types/messaging';
import { sendWhatsAppInteractiveButtons } from '@/lib/meta-whatsapp';

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
  const extension = String(params.extension || params.agent || params.dnis || '');

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

  const isMissedOrTrigger =
    callStatus.includes('MISS') ||
    callStatus.includes('NO_ANSWER') ||
    callStatus.includes('BUSY') ||
    callStatus.includes('CANCEL') ||
    callStatus.includes('IVR') ||
    callStatus.includes('TRAVIS') ||
    callStatus.includes('INCOMING') ||
    (isOutOfHours && anuraCfg.autoWhatsAppOnOutOfHours);

  let whatsappSent = false;
  const welcomeMessage =
    anuraCfg.missedCallWhatsAppMessage ||
    DEFAULT_TRAVIS_CONFIG.anuraConfig!.missedCallWhatsAppMessage;

  if (anuraCfg.autoWhatsAppOnMissedCall && isMissedOrTrigger) {
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
  }

  // Registrar llamada y conversación en Firestore + CRM
  try {
    const now = Date.now();
    const conversationId = `wa_${cleanPhone}`;
    const callerLabel = `Llamada Anura (${cleanPhone})`;

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
        businessUnit: 'TravelCab (Usuario)',
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
      businessUnit: 'TravelCab (Usuario)',
      conversationId,
      createdAt: now,
      lastInteraction: now,
    });
  } catch (err) {
    console.warn('[Anura Webhook] Error guardando registro en Firestore:', err);
  }

  return NextResponse.json({
    success: true,
    caller: cleanPhone,
    callStatus,
    whatsappAutoReplySent: whatsappSent,
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
