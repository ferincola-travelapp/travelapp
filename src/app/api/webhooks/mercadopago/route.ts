import { NextRequest, NextResponse } from 'next/server';
import { serverAddDoc, serverGetDocs, serverUpdateDoc } from '@/lib/firestore-server';
import crypto from 'crypto';

// Función para verificar la firma de seguridad (x-signature) enviada por Mercado Pago
function verifyMercadoPagoSignature(req: NextRequest, dataId: string): boolean {
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return true;
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');

  if (!xSignature || !xRequestId) {
    return false;
  }

  const parts = xSignature.split(',');
  let ts = '';
  let v1 = '';

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key?.trim() === 'ts') ts = (value || '').trim();
    if (key?.trim() === 'v1') v1 = (value || '').trim();
  }

  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');

  return hmac === v1;
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const body = await req.json().catch(() => ({}));

    const paymentId = body.data?.id || body.id || searchParams.get('data.id') || searchParams.get('id') || '';

    if (paymentId) {
      const isValidSignature = verifyMercadoPagoSignature(req, String(paymentId));
      if (!isValidSignature) {
        console.warn('[MP Webhook] Firma de seguridad inválida (x-signature check failed)');
        return NextResponse.json({ error: 'Firma de seguridad no válida' }, { status: 401 });
      }
    }

    const timestamp = Date.now();
    await serverAddDoc('payment_webhooks_log', {
      provider: 'mercadopago',
      receivedAt: timestamp,
      queryParams: Object.fromEntries(searchParams.entries()),
      payload: body,
    }).catch(() => {});

    let externalRef = body.external_reference || body.data?.external_reference || searchParams.get('external_reference') || '';
    let status = String(body.status || body.data?.status || '').toLowerCase();
    let amount = Number(body.transaction_amount || body.data?.transaction_amount || 0);

    // Consultar estado real del pago en la API oficial de Mercado Pago usando paymentId
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (paymentId && accessToken && !accessToken.includes('TU_ACCESS_TOKEN')) {
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (mpRes.ok) {
          const mpPayment = await mpRes.json();
          status = String(mpPayment.status || status).toLowerCase();
          externalRef = mpPayment.external_reference || externalRef;
          amount = Number(mpPayment.transaction_amount || amount);
        }
      } catch (mpFetchErr) {
        console.warn('[MP Webhook] No se pudo consultar /v1/payments:', mpFetchErr);
      }
    }

    console.log(`[MP Webhook Real-time] PaymentID: ${paymentId}, Ref: ${externalRef}, Status: ${status}, Amount: $${amount}`);

    if (status === 'approved' && externalRef) {
      // 1. Conciliar en viajes TravelCab (trips)
      let tripDocs = await serverGetDocs('trips', {
        where: [['externalReference', '==', externalRef]],
      });
      if (!tripDocs.empty) {
        const tripDoc = tripDocs.docs[0];
        await serverUpdateDoc('trips', tripDoc.id, {
          paymentStatus: 'paid',
          mpPaymentId: String(paymentId),
          paidAt: timestamp,
        });
      } else {
        // Intentar actualizar por ID directo si externalRef es el tripId
        await serverUpdateDoc('trips', externalRef, {
          paymentStatus: 'paid',
          mpPaymentId: String(paymentId),
          paidAt: timestamp,
        }).catch(() => {});
      }

      // 2. Conciliar en reservas de experiencias / Luna Viajera / OTA (experience_reservations)
      let reservationsSnap = await serverGetDocs('experience_reservations', {
        where: [['fileNumber', '==', externalRef]],
      });
      if (reservationsSnap.empty) {
        reservationsSnap = await serverGetDocs('experience_reservations', {
          where: [['reservationCode', '==', externalRef]],
        });
      }
      if (reservationsSnap.empty) {
        reservationsSnap = await serverGetDocs('experience_reservations', {
          where: [['externalPaymentId', '==', externalRef]],
        });
      }

      if (!reservationsSnap.empty) {
        const resDoc = reservationsSnap.docs[0];
        const resData = resDoc.data();

        await serverUpdateDoc('experience_reservations', resDoc.id, {
          estado: 'Confirmada',
          status: 'CONFIRMED',
          paymentStatus: 'Aprobado (Mercado Pago)',
          mpPaymentId: String(paymentId || ''),
          paidAt: timestamp,
        });

        await serverAddDoc('cash_movements', {
          branchId: resData.branchId || '1',
          branchName: resData.branchName || 'Sucursal Central',
          type: 'Ingreso',
          category: 'Venta de Experiencias (Mercado Pago)',
          description: `Cobro MP Aprobado - Expediente ${externalRef} (${resData.tourTitle || resData.experienceTitle || 'Tour'})`,
          amount: amount || resData.amount || resData.totalAmount || 0,
          currency: resData.currency || 'ARS',
          source: 'mercadopago_ipn',
          paymentId: String(paymentId || ''),
          fileNumber: externalRef,
          registeredAt: new Date().toISOString(),
          timestamp,
        }).catch(() => {});

        // 3. Sincronizar contracted_trips para la App del Pasajero ("Mi Viaje")
        const ctSnap = await serverGetDocs('contracted_trips', {
          where: [['reservationCode', '==', externalRef]],
        }).catch(() => null);
        if (ctSnap && !ctSnap.empty) {
          await serverUpdateDoc('contracted_trips', ctSnap.docs[0].id, {
            status: 'Confirmada',
            paymentStatus: 'paid',
            paidAt: timestamp,
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ status: 'ok', received: true, timestamp });
  } catch (error) {
    console.error('[MP Webhook Error]:', error);
    return NextResponse.json({ error: 'Webhook Handler Failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    provider: 'Mercado Pago Webhook Receptor Seguro',
    endpoint: '/api/webhooks/mercadopago',
  });
}
