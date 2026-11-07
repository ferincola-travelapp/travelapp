// =============================================================================
// META WHATSAPP WEBHOOK — TravelApp Ecosystem
// Omnichannel Gateway & Travis AI Multimodal Engine
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { serverGetDocs, serverAddDoc, serverUpdateDoc, serverSetDoc } from '@/lib/firestore-server';
import { Conversation, Message, MessageChannel, ConversationStatus } from '@/types/messaging';
import { processTravisMessage, detectDetailedBusinessUnit } from '@/app/api/travis/chat/route';
import {
  getMetaWhatsAppConfig,
  sendWhatsAppTextMessage,
  sendWhatsAppInteractiveButtons,
  markWhatsAppMessageAsRead,
  fetchMetaMediaAsBase64,
} from '@/lib/meta-whatsapp';
import { handleMetaSocialWebhookPayload } from '@/app/api/webhooks/meta-social/route';

export const maxDuration = 60; // Máxima duración permitida en Vercel Serverless

// -----------------------------------------------------------------------------
// GET: Verificación del Webhook de Meta (Handshake inicial)
// -----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const { verifyToken } = getMetaWhatsAppConfig();

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Meta Webhook] Verificado con éxito por Meta.');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.warn(`[Meta Webhook] Token de verificación inválido. Recibido: "${token}", Esperado: "${verifyToken}"`);
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// -----------------------------------------------------------------------------
// POST: Recepción de Eventos y Mensajes de WhatsApp
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Si Meta envía eventos de Instagram o Página de Facebook a este mismo webhook, delegar al motor social
    if (body.object === 'instagram' || body.object === 'page') {
      return await handleMetaSocialWebhookPayload(body);
    }
    
    // 1. Extraer objeto de cambio de Meta
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const val = change?.value;
    
    // Ignorar eventos de estado (sent, delivered, read) si no traen mensajes
    if (val?.statuses && !val?.messages) {
      return NextResponse.json({ status: 'status_ack' });
    }

    const msg = val?.messages?.[0];
    if (!msg) {
      return NextResponse.json({ status: 'ignored' });
    }

    const phone_number_id = val.metadata?.phone_number_id;
    const from = msg.from; // Número de teléfono del usuario (ej: 549381...)
    const senderName = val.contacts?.[0]?.profile?.name || `Usuario (${from})`;
    const channel: MessageChannel = 'whatsapp';
    const messageId = msg.id;

    console.log(`[Meta Webhook] 📩 Mensaje entrante de ${senderName} (${from}) - Tipo: ${msg.type}`);

    // 2. Marcar inmediatamente el mensaje como leído en WhatsApp (doble tilde azul)
    if (messageId) {
      markWhatsAppMessageAsRead(messageId, { phoneNumberId: phone_number_id })
        .then(() => console.log(`[Meta Webhook] ✔ Doble tilde azul enviado para mensaje ${messageId}`))
        .catch(err => console.warn('[Meta Webhook] No se pudo marcar leído:', err));
    }

    // 3. Procesar distintos tipos de mensajes entrantes
    let userMessage = '';
    let audioInput: { base64: string; mimeType: string } | undefined = undefined;

    if (msg.type === 'text') {
      userMessage = msg.text?.body || '';
    } else if (msg.type === 'audio') {
      const audioId = msg.audio?.id;
      if (audioId) {
        try {
          const audioData = await fetchMetaMediaAsBase64(audioId);
          if (audioData) {
            audioInput = audioData;
            userMessage = '[Nota de voz de WhatsApp recibida]';
          } else {
            userMessage = 'Te envié un mensaje de voz pero no se pudo reproducir.';
          }
        } catch (mediaErr) {
          console.warn('[Meta Webhook] Error obteniendo audio de Meta:', mediaErr);
          userMessage = 'Te envié un mensaje de voz.';
        }
      }
    } else if (msg.type === 'location') {
      const lat = msg.location?.latitude;
      const lng = msg.location?.longitude;
      const address = msg.location?.address || '';
      const name = msg.location?.name || '';
      userMessage = `Mi ubicación actual es: ${name ? name + ' - ' : ''}${address} (Coordenadas: ${lat}, ${lng})`;
    } else if (msg.type === 'interactive') {
      if (msg.interactive?.type === 'button_reply') {
        userMessage = msg.interactive.button_reply?.title || '';
      } else if (msg.interactive?.type === 'list_reply') {
        userMessage = msg.interactive.list_reply?.title || '';
      }
    } else if (msg.type === 'image') {
      userMessage = msg.image?.caption || 'Te comparto esta foto.';
    }

    if (!userMessage && !audioInput) {
      return NextResponse.json({ status: 'no_supported_content' });
    }

    // 4. Detectar unidad de negocio sugerida (6 unidades oficiales)
    const businessUnit = detectDetailedBusinessUnit(userMessage);
    const conversationId = `wa_${from}`;

    // 5. Cargar historial previo de forma segura con firestore-server
    let history: { role: 'user' | 'assistant'; content: string }[] = [];
    try {
      const historySnap = await serverGetDocs(`conversations/${conversationId}/messages`, {
        orderBy: [['timestamp', 'asc']],
        limit: 8,
      });

      if (historySnap?.docs && historySnap.docs.length > 0) {
        history = historySnap.docs.map((d: any) => {
          const data = typeof d.data === 'function' ? d.data() : d;
          return {
            role: data.sender?.role === 'customer' ? 'user' : 'assistant',
            content: data.content || '',
          };
        });
      }
    } catch (histErr) {
      console.warn('[Meta Webhook] Historial no disponible (usando contexto vacío):', histErr);
    }

    // 6. PROCESAR RESPUESTA CON TRAVIS IA (GEMINI 2.5 FLASH)
    console.log(`[Meta Webhook] 🧠 Consultando a Travis para ${from} [${businessUnit}]...`);
    const travisResult = await processTravisMessage(
      userMessage,
      history,
      businessUnit,
      conversationId,
      audioInput
    );

    const travisReply = travisResult.response;
    console.log(`[Meta Webhook] 🤖 Travis respondió: "${travisReply?.substring(0, 80)}..."`);

    // 7. ENVIAR RESPUESTA INMEDIATAMENTE AL WHATSAPP DEL USUARIO
    if (travisReply) {
      let sendRes: { success: boolean; data?: any; error?: string };

      if (travisResult.buttons && travisResult.buttons.length > 0) {
        console.log(`[Meta Webhook] 🔘 Enviando ${travisResult.buttons.length} botones interactivos a ${from}`);
        sendRes = await sendWhatsAppInteractiveButtons(
          from,
          travisReply,
          travisResult.buttons,
          { phoneNumberId: phone_number_id }
        );
      } else {
        console.log(`[Meta Webhook] 💬 Enviando texto simple a ${from}`);
        sendRes = await sendWhatsAppTextMessage(
          from,
          travisReply,
          { phoneNumberId: phone_number_id }
        );
      }

      console.log(`[Meta Webhook] 📤 Resultado envío WhatsApp:`, sendRes.success ? 'EXITOSO' : sendRes.error);
    }

    // 8. Persistir en Firestore de manera asíncrona / segura (no bloqueante)
    try {
      const now = Date.now();
      // Guardar mensaje del usuario
      await serverAddDoc(`conversations/${conversationId}/messages`, {
        conversationId,
        sender: { id: from, name: senderName, role: 'customer' },
        content: userMessage,
        timestamp: now,
        type: msg.type === 'audio' ? 'audio' : 'text',
        channel,
        isRead: true,
      });

      // Guardar respuesta de Travis
      if (travisReply) {
        await serverAddDoc(`conversations/${conversationId}/messages`, {
          conversationId,
          sender: { id: 'travis', name: 'Travis IA', role: 'travis' },
          content: travisReply,
          timestamp: now + 1,
          type: 'text',
          channel,
          isRead: false,
        });
      }

      // Sincronizar estado de la conversación
      await serverSetDoc('conversations', conversationId, {
        channel,
        status: 'bot',
        customerName: senderName,
        externalId: from,
        participants: [
          { id: from, name: senderName, role: 'customer', phone: from },
          { id: 'travis', name: 'Travis IA', role: 'travis' },
        ],
        lastMessage: (travisReply || userMessage).substring(0, 120),
        lastMessageAt: now,
        unreadCount: 0,
        metadata: {
          businessUnit: travisResult.businessUnit || businessUnit,
          passengerName: senderName,
        },
        updatedAt: now,
      });

      // Sincronizar Lead en CRM si es necesario
      await serverAddDoc('leads', {
        customerName: senderName,
        phone: from,
        origin: 'WhatsApp',
        status: 'Nuevos',
        customerStatus: 'Prospecto',
        customerLevel: 1,
        businessUnit: travisResult.businessUnit || businessUnit,
        conversationId,
        createdAt: now,
        lastInteraction: now,
      });
    } catch (saveErr) {
      console.warn('[Meta Webhook] Aviso al persistir conversación en Firestore (no crítico):', saveErr);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('[Meta Webhook] Error fatal procesando notificación:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
