import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { serverSetDoc, serverUpdateDoc } from '@/lib/firestore-server';

// POST /api/checkout/preference
// Pasarela Oficial Unificada — Mercado Pago Checkout Pro
// Soporta viajes TravelCab (con split OAuth si el chofer vinculó cuenta MP, o cobro directo a TravelApp)
// y reservas directas de TravelApp Experience / Luna Viajera / OTA / ERP.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amount,
      description,
      productName,
      productDescription,
      passengerEmail,
      buyer,
      driverId,
      tripId,
      externalPaymentId,
      reservationId,
      reservationPayload,
      callbackUrl,
      currency = 'ARS',
    } = body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Monto válido es requerido' }, { status: 400 });
    }

    const platformAccessToken = process.env.MP_ACCESS_TOKEN;
    const isProduction = process.env.NODE_ENV === 'production';

    const resolvedExternalRef = String(externalPaymentId || tripId || reservationId || `TAPP-${Date.now()}`);
    const resolvedTitle = String(productName || description || 'Servicio Ecosistema TravelApp');
    const resolvedDescription = productDescription ? String(productDescription) : resolvedTitle;
    const resolvedEmail = String(buyer?.email || passengerEmail || 'pagos@travelapp.ar');

    // Si es un viaje TravelCab con chofer que vinculó su propio MP OAuth token, aplicar Split 1:1.
    // Si cobra directamente la cuenta recaudadora de TravelApp, NO enviar marketplace_fee (MP rechaza marketplace_fee sobre el propio collector).
    let activeAccessToken = platformAccessToken;
    let sellerOAuthConnected = false;
    let commissionPct = 10;

    if (driverId) {
      try {
        const driverSnap = await getDoc(doc(db, 'drivers', driverId));
        if (driverSnap.exists()) {
          const driverData = driverSnap.data();
          const driverMpToken = driverData?.mpCredentials?.accessToken || driverData?.mpAccessToken;
          if (driverMpToken && driverMpToken !== platformAccessToken) {
            activeAccessToken = driverMpToken;
            sellerOAuthConnected = true;
          }
        }
      } catch (err) {
        console.warn('[MP Preference] No se pudo consultar token MP del conductor:', err);
      }
    }

    if (tripId && sellerOAuthConnected) {
      try {
        let tariffData: any = null;
        const tripDoc = await getDoc(doc(db, 'trips', tripId));
        if (tripDoc.exists()) {
          const tripVal = tripDoc.data();
          const category = tripVal.category || 'estandar';
          const rawType = (tripVal.serviceType || '').toLowerCase();
          let normalizedType = 'mu';
          if (rawType.includes('arc') || rawType.includes('interurban') || rawType.includes('compartido')) {
            normalizedType = 'arc';
          } else if (rawType.includes('transfer') || rawType.includes('traslado') || rawType.includes('punto')) {
            normalizedType = 'transfers';
          }
          const q = query(
            collection(db, 'tariffs'),
            where('type', '==', normalizedType),
            where('category', '==', category),
            where('isActive', '==', true)
          );
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            tariffData = qSnap.docs[0].data();
          }
        }
        if (!tariffData) {
          const tariffDoc = await getDoc(doc(db, 'tariffs', 'mu_active'));
          if (tariffDoc.exists()) tariffData = tariffDoc.data();
        }
        if (tariffData) {
          commissionPct =
            tariffData.commissionRate ??
            tariffData.commissionRatePct ??
            tariffData.electronicPaymentFee ??
            10;
        }
      } catch (err) {
        console.warn('[MP Preference] Fallback comisión 10%:', err);
      }
    }

    const marketplaceFee = sellerOAuthConnected ? Math.round(numAmount * (commissionPct / 100)) : 0;
    const baseOrigin = req.nextUrl?.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://travelapp.ar';
    const successUrl =
      callbackUrl ||
      `${baseOrigin}/checkout/success?tripId=${encodeURIComponent(resolvedExternalRef)}&file=${encodeURIComponent(resolvedExternalRef)}&amount=${numAmount}`;
    const pendingUrl = `${baseOrigin}/checkout/pending?file=${encodeURIComponent(resolvedExternalRef)}`;
    const failureUrl = `${baseOrigin}/checkout/failure?file=${encodeURIComponent(resolvedExternalRef)}`;
    const notificationOrigin = process.env.NEXT_PUBLIC_APP_URL || baseOrigin;

    if (activeAccessToken && !activeAccessToken.includes('TU_ACCESS_TOKEN')) {
      const preferencePayload: Record<string, any> = {
        items: [
          {
            id: resolvedExternalRef,
            title: resolvedTitle,
            description: resolvedDescription.slice(0, 250),
            unit_price: numAmount,
            quantity: 1,
            currency_id: currency === 'USD' ? 'USD' : 'ARS',
          },
        ],
        payer: {
          name: buyer?.name || undefined,
          email: resolvedEmail,
        },
        back_urls: {
          success: successUrl,
          pending: pendingUrl,
          failure: failureUrl,
        },
        auto_return: 'approved',
        external_reference: resolvedExternalRef,
        statement_descriptor: 'TRAVELAPP',
      };

      if (!notificationOrigin.includes('localhost') && !notificationOrigin.includes('127.0.0.1')) {
        preferencePayload.notification_url = `${notificationOrigin.replace(/\/$/, '')}/api/webhooks/mercadopago`;
      }

      if (sellerOAuthConnected && marketplaceFee > 0) {
        preferencePayload.marketplace_fee = marketplaceFee;
      }

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeAccessToken}`,
        },
        body: JSON.stringify(preferencePayload),
      });

      if (response.ok) {
        const mpData = await response.json();

        // Sincronizar reserva de experiencia si fue enviada desde el catálogo o ERP
        if (reservationPayload && resolvedExternalRef && !reservationId) {
          try {
            await serverSetDoc('experience_reservations', resolvedExternalRef, {
              ...reservationPayload,
              paymentGateway: 'MERCADOPAGO',
              mpPreferenceId: mpData.id,
              mpCheckoutUrl: mpData.init_point,
              paymentMethodUsed: 'Mercado Pago Checkout Pro',
              updatedAt: new Date().toISOString(),
            });
          } catch (dbErr) {
            console.warn('[MP Preference] No se pudo guardar respaldo de reserva en Firestore:', dbErr);
          }
        } else if (reservationId) {
          try {
            await serverUpdateDoc('experience_reservations', reservationId, {
              paymentGateway: 'MERCADOPAGO',
              mpPreferenceId: mpData.id,
              mpCheckoutUrl: mpData.init_point,
              paymentMethodUsed: 'Mercado Pago Checkout Pro',
              updatedAt: new Date().toISOString(),
            });
          } catch (dbErr) {
            console.warn('[MP Preference] No se pudo actualizar reserva en Firestore:', dbErr);
          }
        }

        return NextResponse.json({
          success: true,
          preferenceId: mpData.id,
          initPoint: mpData.init_point,
          checkoutUrl: mpData.init_point,
          qrData: mpData.init_point,
          sandboxInitPoint: mpData.sandbox_init_point,
          externalPaymentId: resolvedExternalRef,
        });
      } else {
        const errBody = await response.text();
        console.error('[Mercado Pago API Error]:', response.status, errBody);
        if (isProduction) {
          return NextResponse.json(
            {
              success: false,
              error: 'Mercado Pago rechazó la generación del link de pago. Verificá las credenciales productivas en Vercel.',
              mpStatus: response.status,
            },
            { status: 502 }
          );
        }
      }
    } else if (isProduction) {
      return NextResponse.json(
        {
          success: false,
          error: 'MP_ACCESS_TOKEN no está configurado en el servidor productivo.',
        },
        { status: 500 }
      );
    }

    // Fallback simulado ÚNICAMENTE permitido en desarrollo local (bloqueado en producción)
    const simulatedInitPoint = `${baseOrigin}/checkout/mp-simulated-pay?amount=${numAmount}&tripId=${encodeURIComponent(resolvedExternalRef)}`;
    return NextResponse.json({
      success: true,
      preferenceId: 'pref_sim_' + Date.now(),
      initPoint: simulatedInitPoint,
      checkoutUrl: simulatedInitPoint,
      qrData: simulatedInitPoint,
      sandboxInitPoint: simulatedInitPoint,
      isSimulated: true,
    });
  } catch (error: any) {
    console.error('[Create Preference Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
  }
}
