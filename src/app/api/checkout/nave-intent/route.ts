import { NextRequest, NextResponse } from 'next/server';
import { createNavePaymentIntent, getNaveEnvironmentInfo, resolveNaveBrandChannel } from '@/lib/nave-client';
import { serverUpdateDoc, serverSetDoc } from '@/lib/firestore-server';

// =============================================================================
// RATE LIMITER & IDEMPOTENCY CACHE (PROTECCIÓN DE COSTOS Y TRÁFICO)
// =============================================================================
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10;     // Máximo 10 intentos por minuto por IP
const ipRequestsMap = new Map<string, { count: number; resetAt: number }>();

const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutos
const idempotencyCache = new Map<string, { payload: any; expiresAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  // Limpieza pasiva si el mapa crece
  if (ipRequestsMap.size > 500) {
    for (const [k, v] of ipRequestsMap.entries()) {
      if (now > v.resetAt) ipRequestsMap.delete(k);
    }
  }
  const entry = ipRequestsMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequestsMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

// GET /api/checkout/nave-intent
// Permite consultar en tiempo real si NAVE está en entorno de Pruebas (Sandbox/Simulado) o Real (Producción)
export async function GET() {
  const envInfo = getNaveEnvironmentInfo();
  return NextResponse.json({
    ok: true,
    naveEnvironment: envInfo
  });
}

// POST /api/checkout/nave-intent
// Genera una intención de pago en NAVE (Banco Galicia / Naranja X) devolviendo el checkout_url y qr_data.
export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : 'anonymous';
    const rl = checkRateLimit(clientIp);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Demasiadas solicitudes seguidas. Por favor aguardá ${rl.retryAfterSec} segundos antes de reintentar.`
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfterSec) }
        }
      );
    }

    const body = await req.json();
    const {
      externalPaymentId,
      amount,
      currency = 'ARS',
      productName,
      productDescription,
      brand,
      buyer,
      reservationId,
      reservationPayload,
      callbackUrl
    } = body;

    if (!externalPaymentId || !amount || !productName) {
      return NextResponse.json(
        { error: 'Campos requeridos: externalPaymentId, amount, productName' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'El monto ingresado es inválido' }, { status: 400 });
    }

    const hostHeader = req.headers.get('host') || '';
    const resolvedChannel = resolveNaveBrandChannel({
      brand,
      externalPaymentId,
      callbackUrl,
      host: hostHeader
    });

    // 0. Verificar Caché de Idempotencia para evitar llamadas duplicadas y costos extra
    const now = Date.now();
    const cacheKey = `${resolvedChannel}_${externalPaymentId}_${numAmount.toFixed(2)}_${currency}`;
    const cached = idempotencyCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return NextResponse.json(cached.payload);
    }

    const requestOrigin = req.nextUrl?.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://experience.travelapp.ar';
    const resolvedCallbackUrl =
      callbackUrl || `${requestOrigin}/checkout/success?file=${externalPaymentId}&amount=${numAmount.toFixed(2)}`;

    // 1. Invocar SDK oficial de Nave Banco Galicia (con ruteo multi-tienda TravelApp+Experience vs Luna Viajera)
    const paymentIntent = await createNavePaymentIntent({
      externalPaymentId,
      amount: numAmount,
      currency: currency as 'ARS' | 'USD',
      productName,
      productDescription: productDescription || `Expediente ${externalPaymentId} - ${productName}`,
      brand: resolvedChannel,
      buyer: buyer ? {
        name: buyer.name,
        email: buyer.email,
        docNumber: buyer.docNumber,
        phone: buyer.phone
      } : undefined,
      callbackUrl: resolvedCallbackUrl
    });

    const envInfo = getNaveEnvironmentInfo();

    // 2. Si el cliente envía reservationPayload (respaldo serverless) o reservationId, sincronizar una sola vez
    if (reservationPayload && externalPaymentId && !reservationId) {
      try {
        await serverSetDoc('experience_reservations', externalPaymentId, {
          ...reservationPayload,
          naveChannel: resolvedChannel,
          navePaymentRequestId: paymentIntent.id,
          naveCheckoutUrl: paymentIntent.checkout_url,
          naveQrData: paymentIntent.qr_data,
          paymentMethodUsed: `NAVE (${envInfo.mode.toUpperCase()})`,
          updatedAt: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('[NAVE Intent API] No se pudo crear reservation de respaldo en Firestore:', dbErr);
      }
    } else if (reservationId) {
      try {
        await serverUpdateDoc('experience_reservations', reservationId, {
          naveChannel: resolvedChannel,
          navePaymentRequestId: paymentIntent.id,
          naveCheckoutUrl: paymentIntent.checkout_url,
          naveQrData: paymentIntent.qr_data,
          paymentMethodUsed: `NAVE (${envInfo.mode.toUpperCase()})`,
          updatedAt: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('[NAVE Intent API] No se pudo actualizar reservation en Firestore:', dbErr);
      }
    }

    const responsePayload = {
      success: true,
      paymentRequestId: paymentIntent.id,
      checkoutUrl: paymentIntent.checkout_url,
      qrData: paymentIntent.qr_data,
      externalPaymentId: paymentIntent.external_payment_id,
      naveMode: envInfo.mode,
      naveChannel: resolvedChannel
    };

    idempotencyCache.set(cacheKey, {
      payload: responsePayload,
      expiresAt: now + IDEMPOTENCY_TTL_MS
    });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('[NAVE Intent API Error]:', error);
    return NextResponse.json(
      { error: 'Error al generar la intención de pago en Nave', details: error.message },
      { status: 500 }
    );
  }
}
