import { NextRequest, NextResponse } from 'next/server';

// POST /api/checkout/wallet-connect
// Genera la URL de autorización OAuth de Mercado Pago para vincular la billetera del usuario/pasajero.
export async function POST(req: NextRequest) {
  try {
    const { userId, email, role = 'passenger' } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || '';
    const extractedClientId = accessToken.startsWith('APP_USR-') ? accessToken.split('-')[1] : undefined;
    const clientId = process.env.MP_CLIENT_ID || extractedClientId;
    const redirectUri = process.env.MP_OAUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'https://travelapp.ar'}/api/mp/oauth/callback`;
    const state = `${role}_${userId}`;

    if (clientId && !clientId.includes('TU_CLIENT_ID')) {
      // URL real de autorización OAuth de Mercado Pago Argentina
      const realAuthUrl = `https://auth.mercadopago.com.ar/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      return NextResponse.json({
        url: realAuthUrl,
        isReal: true,
        status: 'pending'
      });
    }

    // Fallback simulado para entorno de desarrollo local sin credenciales
    const simulatedAuthUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/mp-connect?userId=${userId}&email=${encodeURIComponent(email || '')}`;

    return NextResponse.json({
      url: simulatedAuthUrl,
      isReal: false,
      status: 'pending'
    });
  } catch (error: any) {
    console.error('[Wallet Connect Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
  }
}
