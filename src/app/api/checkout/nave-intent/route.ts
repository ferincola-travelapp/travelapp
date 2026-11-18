import { NextResponse } from 'next/server';

// =============================================================================
// PASARELA NAVE TEMPORALMENTE BLOQUEADA POR DECISIÓN OPERATIVA
// Todos los cobros online operan exclusivamente mediante Mercado Pago.
// =============================================================================

export async function GET() {
  return NextResponse.json({
    ok: true,
    disabled: true,
    activeGateway: 'mercadopago',
    message: 'La pasarela NAVE se encuentra deshabilitada temporalmente. Todos los cobros operan por Mercado Pago.'
  });
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      disabled: true,
      error: 'La pasarela NAVE se encuentra deshabilitada temporalmente. Por favor utilizá Mercado Pago.'
    },
    { status: 403 }
  );
}
