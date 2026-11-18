import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { requireAuth } from '@/lib/api-auth';

// GET /api/mercadopago/balance
// Consulta los datos reales de la cuenta de Mercado Pago y los pagos aprobados acumulados.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken || accessToken.includes('TU_ACCESS_TOKEN')) {
      return NextResponse.json({
        success: true,
        isSimulated: true,
        balance: {
          total_amount: 0,
          available_balance: 0,
          unavailable_balance: 0,
          currency_id: 'ARS'
        },
        user: {
          nickname: 'TRAVELAPP S.A.S.',
          email: 'fernando@travelapp.ar',
          collectorId: '3469091946'
        },
        updatedAt: new Date().toISOString()
      });
    }

    // 1. Consultar perfil real de la empresa en Mercado Pago
    let userData: any = null;
    try {
      const userRes = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (userRes.ok) {
        userData = await userRes.json();
      }
    } catch (err) {
      console.warn('[MP Balance API] Error al obtener /users/me:', err);
    }

    // 2. Consultar sumatoria de pagos aprobados en Mercado Pago API
    let apiApprovedTotal = 0;
    try {
      const paymentsRes = await fetch('https://api.mercadopago.com/v1/payments/search?status=approved&limit=100', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        if (paymentsData.results && Array.isArray(paymentsData.results)) {
          apiApprovedTotal = paymentsData.results.reduce((sum: number, p: any) => sum + Number(p.transaction_amount || 0), 0);
        }
      }
    } catch (err) {
      console.warn('[MP Balance API] Error al buscar pagos:', err);
    }

    // 3. Consultar sumatoria en Firestore ledger 'cash_movements' para Mercado Pago
    let dbLedgerTotal = 0;
    try {
      const q = query(
        collection(db, 'cash_movements'),
        where('source', '==', 'mercadopago_ipn')
      );
      const qSnap = await getDocs(q);
      qSnap.forEach(docSnap => {
        dbLedgerTotal += Number(docSnap.data().amount || 0);
      });
    } catch (err) {
      // Ignorar si falla query local
    }

    const realTotalBalance = apiApprovedTotal > 0 ? apiApprovedTotal : dbLedgerTotal;

    return NextResponse.json({
      success: true,
      isReal: true,
      balance: {
        total_amount: Number(realTotalBalance),
        available_balance: Number(realTotalBalance),
        unavailable_balance: 0,
        currency_id: 'ARS'
      },
      user: {
        nickname: userData?.company?.corporate_name || userData?.nickname || 'TRAVELAPP S. A. S.',
        email: userData?.email || 'fernando@travelapp.ar',
        collectorId: userData?.id ? String(userData.id) : '3469091946',
        cuit: userData?.company?.identification || userData?.identification?.number || '30719220343',
        isTestUser: String(userData?.nickname || '').startsWith('TESTUSER')
      },
      updatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[MP Balance Error]:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al consultar saldo en Mercado Pago',
      detail: error.message
    }, { status: 500 });
  }
}
