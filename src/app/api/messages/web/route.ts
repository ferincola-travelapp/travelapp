import { NextRequest, NextResponse } from 'next/server';
import { serverAddDoc, serverGetDoc, serverSetDoc, serverGetDocs, serverUpdateDoc } from '@/lib/firestore-server';
import { processTravisMessage, detectDetailedBusinessUnit, detectSectorForUnit } from '@/app/api/travis/chat/route';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, userMessage, userName = 'Usuario Web', userEmail = '', userPhone = '' } = body;

    if (!userMessage || !userMessage.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const id = conversationId || `web_chat_${Date.now()}`;
    const timestamp = Date.now();
    const detectedUnit = detectDetailedBusinessUnit(userMessage);
    const detectedSector = detectSectorForUnit(userMessage, detectedUnit);

    // 1. Ensure conversation document exists
    let convDoc = await serverGetDoc('conversations', id);

    if (!convDoc.exists) {
      await serverSetDoc('conversations', id, {
        channel: 'web',
        status: 'bot',
        customerName: userName,
        participants: [
          { id: 'web_user', name: userName, email: userEmail, phone: userPhone, role: 'customer' },
          { id: 'travis', name: 'Travis IA', role: 'travis' }
        ],
        lastMessage: userMessage,
        lastMessageAt: timestamp,
        unreadCount: 1,
        metadata: {
          businessUnit: detectedUnit,
          sector: detectedSector,
          passengerName: userName,
        },
        createdAt: timestamp,
        updatedAt: timestamp
      });

      // Crear lead inicial en CRM
      try {
        await serverAddDoc('leads', {
          customerName: userName,
          phone: userPhone || '',
          email: userEmail || '',
          origin: 'Web',
          status: 'Nuevos',
          customerStatus: 'Prospecto',
          customerLevel: 1,
          businessUnit: detectedUnit,
          sector: detectedSector,
          chatHistory: [{ sender: 'Client', message: userMessage, timestamp }],
          conversationId: id,
          createdAt: timestamp,
          lastInteraction: timestamp,
        });
      } catch (crmErr) {
        console.warn('[Web Chat] Error creating initial lead:', crmErr);
      }
    } else {
      await serverUpdateDoc('conversations', id, {
        lastMessage: userMessage,
        lastMessageAt: timestamp,
        'metadata.businessUnit': detectedUnit,
        updatedAt: timestamp
      });
    }

    // 2. Save user message in subcollection
    const userMsgData = {
      conversationId: id,
      sender: { id: 'web_user', name: userName, role: 'customer' },
      content: userMessage,
      channel: 'web',
      timestamp,
      status: 'delivered'
    };
    await serverAddDoc(`conversations/${id}/messages`, userMsgData);

    // 3. Check if Travis should auto-reply
    convDoc = await serverGetDoc('conversations', id);
    const convData = convDoc.data();
    let travisReplyText = '';
    let buttons = undefined;

    if (convData?.status === 'bot') {
      // Get last 10 messages for context
      const historySnap = await serverGetDocs(`conversations/${id}/messages`, {
        orderBy: [['timestamp', 'asc']],
        limit: 10
      });

      const history = historySnap.docs.map(d => {
        const data = d.data();
        return {
          role: data.sender?.role === 'travis' ? 'assistant' : 'user',
          content: data.content || ''
        };
      });

      // Call Travis AI engine with detected 6-way business unit
      const travisResult = await processTravisMessage(userMessage, history, detectedUnit, id);
      travisReplyText = travisResult.response || 'Hola, ¿en qué te puedo ayudar hoy con los servicios de TravelApp?';
      buttons = travisResult.buttons;

      // Save Travis message in Firestore
      const travisMsgData = {
        conversationId: id,
        sender: { id: 'travis', name: 'Travis IA', role: 'travis' },
        content: travisReplyText,
        channel: 'web',
        timestamp: Date.now(),
        status: 'delivered'
      };
      await serverAddDoc(`conversations/${id}/messages`, travisMsgData);

      // Actualizar último mensaje de la conversación
      await serverUpdateDoc('conversations', id, {
        lastMessage: travisReplyText.substring(0, 120),
        lastMessageAt: Date.now(),
        'metadata.businessUnit': travisResult.businessUnit || detectedUnit,
      });
    }

    return NextResponse.json({
      success: true,
      conversationId: id,
      response: travisReplyText,
      buttons,
      businessUnit: detectedUnit,
    });
  } catch (error) {
    console.error('[Web Chat API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
