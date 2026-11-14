import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// POST /api/checkout/process-debit
// Procesa el cobro automático (Split de Pagos 1:1) del viaje en Mercado Pago.
export async function POST(req: NextRequest) {
  try {
    const { tripId, passengerId, driverId, amount } = await req.json();

    if (!tripId || !passengerId || !driverId || !amount) {
      return NextResponse.json({ error: 'Missing required parameters: tripId, passengerId, driverId, amount' }, { status: 400 });
    }

    // 1. Obtener datos del cliente (para verificar token de billetera vinculada)
    const userDoc = await getDoc(doc(db, 'users', passengerId));
    if (!userDoc.exists() || !userDoc.data().mpLinked) {
      return NextResponse.json({ error: 'El pasajero no tiene vinculada su cuenta de Mercado Pago' }, { status: 400 });
    }
    const passengerData = userDoc.data();
    const payerToken = passengerData.mpPayerToken; // 'mp_token_3476218152'

    // 2. Obtener datos del chofer (para obtener su oauth_access_token)
    // Buscamos en la colección 'drivers' o 'users'
    let driverAccessToken = process.env.MP_ACCESS_TOKEN; // Fallback al token general de TravelApp
    try {
      const driverDoc = await getDoc(doc(db, 'users', driverId));
      if (driverDoc.exists() && driverDoc.data().mpDriverAccessToken) {
        driverAccessToken = driverDoc.data().mpDriverAccessToken;
      } else {
        const driverProfileDoc = await getDoc(doc(db, 'drivers', driverId));
        if (driverProfileDoc.exists() && driverProfileDoc.data().mpDriverAccessToken) {
          driverAccessToken = driverProfileDoc.data().mpDriverAccessToken;
        }
      }
    } catch (err) {
      console.warn('[Process Debit] No se pudo obtener access_token del chofer, usando fallback general:', err);
    }

    // 3. Obtener tarifa activa para calcular comisión e impuestos dinámicos según categoría
    let commissionRatePct = 10; // 10% por defecto
    try {
      let tariffData: any = null;

      if (tripId) {
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
      }

      // Fallback a mu_active
      if (!tariffData) {
        const tariffDoc = await getDoc(doc(db, 'tariffs', 'mu_active'));
        if (tariffDoc.exists()) {
          tariffData = tariffDoc.data();
        }
      }

      if (tariffData) {
        if (tariffData.commissionRate !== undefined) {
          commissionRatePct = tariffData.commissionRate;
        } else if (tariffData.commissionRatePct !== undefined) {
          commissionRatePct = tariffData.commissionRatePct;
        } else if (tariffData.electronicPaymentFee !== undefined) {
          commissionRatePct = tariffData.electronicPaymentFee;
        }
      }
    } catch (err) {
      console.warn('[Process Debit] No se pudo obtener comisión del tarifario, usando fallback 10%:', err);
    }

    // Calcular montos
    const applicationFee = Math.round(amount * (commissionRatePct / 100)); // Comisión de TravelApp
    const driverAmount = amount - applicationFee; // Monto que le queda al chofer

    console.log(`[Process Debit] Procesando viaje ${tripId}. Total: $${amount}. Comisión TravelApp: $${applicationFee}. Destino Chofer: $${driverAmount}`);

    // 4. Llamada real a la API de Pagos de Mercado Pago
    // En sandbox usamos las credenciales cargadas.
    const mpUrl = 'https://api.mercadopago.com/v1/payments';
    
    let paymentId = 'mp_pay_' + Date.now();
    let paymentStatus = 'rejected';
    let isRealTransaction = false;

    if (!driverAccessToken || driverAccessToken.includes('TU_ACCESS_TOKEN')) {
      return NextResponse.json(
        { error: 'El conductor no tiene una billetera de Mercado Pago vinculada.' },
        { status: 400 }
      );
    }

    try {
      const mpResponse = await fetch(mpUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverAccessToken}`
        },
        body: JSON.stringify({
          description: `Viaje TravelCab Nro ${tripId}`,
          installments: 1,
          payer: {
            email: passengerData.email || 'test_user_wallet@travelapp.ar'
          },
          payment_method_id: 'account_money',
          transaction_amount: Number(amount),
          application_fee: Number(applicationFee),
          external_reference: tripId,
        })
      });

      if (mpResponse.ok) {
        const mpData = await mpResponse.json();
        paymentId = String(mpData.id);
        paymentStatus = mpData.status; // 'approved', 'in_process', 'rejected'
        isRealTransaction = true;
      } else {
        const errBody = await mpResponse.text();
        console.error('[Mercado Pago API Error]:', errBody);
        return NextResponse.json(
          { error: 'Pago rechazado por Mercado Pago', details: errBody },
          { status: 402 }
        );
      }
    } catch (mpErr) {
      console.error('[Mercado Pago API Connection Error]:', mpErr);
      return NextResponse.json(
        { error: 'Error de conexión con Mercado Pago' },
        { status: 502 }
      );
    }

    // 5. Actualizar el viaje en Firestore
    await updateDoc(doc(db, 'trips', tripId), {
      paymentStatus: paymentStatus === 'approved' ? 'paid' : 'failed',
      paymentId,
      applicationFee,
      commissionRatePct,
      paymentMethod: 'Mercado Pago (Wallet Connect)',
      paidAt: Date.now()
    });

    if (paymentStatus !== 'approved') {
      return NextResponse.json(
        { error: 'El pago no fue aprobado', paymentStatus, paymentId },
        { status: 402 }
      );
    }

    // 6. Registrar transacción en el Ledger de Auditoría de TravelApp Ecosistema
    await addDoc(collection(db, 'transactions'), {
      date: Date.now(),
      concept: `Comisión Viaje Cab ${tripId} (Pasajero: ${passengerData.displayName || 'Pasajero'})`,
      businessUnit: 'TravelCab',
      type: 'ingreso',
      amount: applicationFee,
      currency: 'ARS',
      status: 'completado',
      paymentMethod: 'Mercado Pago Split',
      tripId,
      driverId
    });

    // 7. Sumar puntos en Rewards (1 punto por cada $100 gastados en el viaje)
    const pointsEarned = Math.floor(amount / 100);
    const passengerDocRef = doc(db, 'users', passengerId);
    const passengerSnap = await getDoc(passengerDocRef);
    if (passengerSnap.exists()) {
      const currentPoints = passengerSnap.data().rewardsPoints || 0;
      await updateDoc(passengerDocRef, {
        rewardsPoints: currentPoints + pointsEarned
      });
    }

    return NextResponse.json({
      success: paymentStatus === 'approved',
      paymentId,
      status: paymentStatus,
      amount,
      applicationFee,
      pointsEarned,
      isRealTransaction
    });
  } catch (error: any) {
    console.error('[Process Debit Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
  }
}
