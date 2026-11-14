import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAuth } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { title, body: messageBody, tokens = [], userIds = [], data = {}, sound = 'default' } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Título y cuerpo del mensaje son requeridos' },
        { status: 400 }
      );
    }

    const pushTokensToSend = new Set<string>(tokens);

    // Si se enviaron userIds, consultar los pushTokens en Firestore
    if (userIds && userIds.length > 0) {
      for (const uid of userIds) {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.pushToken && typeof userData.pushToken === 'string') {
              pushTokensToSend.add(userData.pushToken);
            }
            if (userData.expoPushToken && typeof userData.expoPushToken === 'string') {
              pushTokensToSend.add(userData.expoPushToken);
            }
          }
        } catch (err) {
          console.warn(`[Push API] Error fetching token for user ${uid}:`, err);
        }
      }
    }

    const validTokens = Array.from(pushTokensToSend).filter(
      (token) => typeof token === 'string' && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
    );

    if (validTokens.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: 'No se encontraron tokens Expo válidos registrados para los destinatarios.',
      });
    }

    // Construir mensajes para la API de Expo
    const messages = validTokens.map((to) => ({
      to,
      sound,
      title,
      body: messageBody,
      data,
      priority: 'high',
      channelId: 'trip_updates',
      _displayInForeground: true,
    }));

    // Enviar en batches de 100 a la API oficial de Expo
    const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
    const response = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      sentCount: validTokens.length,
      expoResult: result,
    });
  } catch (error: any) {
    console.error('[Push API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al enviar notificación push' },
      { status: 500 }
    );
  }
}
