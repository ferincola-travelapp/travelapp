import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPartnerTier, DEFAULT_EXPERIENCE_TIERS } from '@/lib/commissions';

// POST /api/checkout/experience-preference
// Genera una preferencia de Checkout Pro en Mercado Pago para reservas referidas por Embajadores/Partners.
export async function POST(req: NextRequest) {
  try {
    const { amount, experienceTitle, partnerId, customerEmail, bookingId } = await req.json();

    if (!amount || !partnerId) {
      return NextResponse.json({ error: 'Monto y Partner ID son requeridos' }, { status: 400 });
    }

    const platformAccessToken = process.env.MP_ACCESS_TOKEN;
    const isProduction = process.env.NODE_ENV === 'production';

    let ambassadorCommissionPct = 5;
    let partnerMpToken: string | null = null;

    try {
      const partnerDoc = await getDoc(doc(db, 'partners', partnerId));
      if (partnerDoc.exists()) {
        const partnerData = partnerDoc.data();
        const totalBookings = partnerData.totalBookingsConcreted || 0;
        const currentTier = getPartnerTier(totalBookings, DEFAULT_EXPERIENCE_TIERS);
        ambassadorCommissionPct = currentTier.commissionPct;
        if (partnerData.mpCredentials?.accessToken && partnerData.mpCredentials.accessToken !== platformAccessToken) {
          partnerMpToken = partnerData.mpCredentials.accessToken;
        }
      }
    } catch (err) {
      console.warn('[Experience Preference] Fallback comisión 5%:', err);
    }

    const numAmount = Number(amount);
    const ambassadorCommissionAmount = Math.round(numAmount * (ambassadorCommissionPct / 100));
    const companyNetFee = numAmount - ambassadorCommissionAmount;

    const activeToken = partnerMpToken || platformAccessToken;
    const baseOrigin = req.nextUrl?.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://experience.travelapp.ar';
    const notificationOrigin = process.env.NEXT_PUBLIC_APP_URL || baseOrigin;

    if (activeToken && !activeToken.includes('TU_ACCESS_TOKEN')) {
      const payload: Record<string, any> = {
        items: [
          {
            id: bookingId || 'exp-booking',
            title: experienceTitle || 'Reserva TravelApp Experience',
            unit_price: numAmount,
            quantity: 1,
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: customerEmail || 'cliente@travelapp.ar',
        },
        back_urls: {
          success: `${baseOrigin}/checkout/success?file=${encodeURIComponent(bookingId || 'exp')}&type=experience&amount=${numAmount}`,
          pending: `${baseOrigin}/checkout/pending?file=${encodeURIComponent(bookingId || 'exp')}`,
          failure: `${baseOrigin}/checkout/failure?file=${encodeURIComponent(bookingId || 'exp')}`,
        },
        auto_return: 'approved',
        external_reference: bookingId || 'exp-booking',
        statement_descriptor: 'TRAVELAPP',
      };

      if (partnerMpToken && companyNetFee > 0) {
        payload.marketplace_fee = companyNetFee;
      }

      if (!notificationOrigin.includes('localhost') && !notificationOrigin.includes('127.0.0.1')) {
        payload.notification_url = `${notificationOrigin.replace(/\/$/, '')}/api/webhooks/mercadopago`;
      }

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const mpData = await response.json();
        return NextResponse.json({
          success: true,
          preferenceId: mpData.id,
          initPoint: mpData.init_point,
          checkoutUrl: mpData.init_point,
          sandboxInitPoint: mpData.sandbox_init_point,
          ambassadorCommissionAmount,
          companyNetFee,
        });
      } else {
        const errText = await response.text();
        console.error('[Experience MP Preference Error]:', response.status, errText);
        if (isProduction) {
          return NextResponse.json(
            { error: 'Mercado Pago rechazó la creación de la preferencia.', mpStatus: response.status },
            { status: 502 }
          );
        }
      }
    } else if (isProduction) {
      return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado en producción.' }, { status: 500 });
    }

    const simulatedInitPoint = `${baseOrigin}/checkout/mp-simulated-pay?amount=${numAmount}&tripId=${encodeURIComponent(bookingId || 'exp')}`;
    return NextResponse.json({
      success: true,
      preferenceId: 'pref_exp_sim_' + Date.now(),
      initPoint: simulatedInitPoint,
      checkoutUrl: simulatedInitPoint,
      sandboxInitPoint: simulatedInitPoint,
      ambassadorCommissionAmount,
      companyNetFee,
      isSimulated: true,
    });
  } catch (error: any) {
    console.error('[Experience Preference Exception]:', error);
    return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
  }
}
