// =============================================================================
// OUTBOUND MESSAGE DISPATCHER — TravelApp Omnichannel
// POST /api/messages/send
// Envia mensajes desde el panel de operadores hacia WhatsApp, ManyChat, etc.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppTextMessage } from '@/lib/meta-whatsapp';
import { sendSocialTextMessage } from '@/lib/meta-social';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      conversationId, 
      content, 
      channel, 
      recipientPhone, 
      manyChatSubscriberId 
    } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    let deliveryResult: any = { delivered: true };

    // 1. Si el canal es WhatsApp directo via Meta Cloud API
    if (channel === 'whatsapp' && recipientPhone) {
      const waRes = await sendWhatsAppTextMessage(recipientPhone, content);
      deliveryResult = {
        channel: 'whatsapp',
        delivered: waRes.success,
        detail: waRes.data || waRes.error,
      };
    }

    // 1.5. Si el canal es Instagram DM o Facebook Messenger directo via Meta Graph API
    if ((channel === 'instagram' || channel === 'messenger') && (recipientPhone || conversationId)) {
      const cleanRecipientId = (recipientPhone || conversationId || '')
        .replace(/^(ig_|fb_|comment_instagram_|comment_facebook_)/, '');
      if (cleanRecipientId) {
        const socialRes = await sendSocialTextMessage(channel, cleanRecipientId, content);
        deliveryResult = {
          channel,
          delivered: socialRes.success,
          detail: socialRes.data || socialRes.error,
        };
      }
    }

    // 2. Si tiene suscriptor de ManyChat (Instagram, Messenger o WhatsApp vía ManyChat)
    if (manyChatSubscriberId && process.env.MANYCHAT_API_TOKEN) {
      try {
        const fieldId = process.env.MANYCHAT_TRAVIS_RESPONSE_FIELD_ID;
        if (fieldId) {
          await fetch('https://api.manychat.com/fb/subscriber/setCustomField', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.MANYCHAT_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscriber_id: manyChatSubscriberId,
              field_id: fieldId,
              field_value: content,
            }),
          });
        }
      } catch (mcErr) {
        console.warn('[Outbound Dispatcher] Error syncing to ManyChat:', mcErr);
      }
    }

    return NextResponse.json({
      success: true,
      result: deliveryResult,
    });
  } catch (error: any) {
    console.error('[Outbound Dispatcher] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
