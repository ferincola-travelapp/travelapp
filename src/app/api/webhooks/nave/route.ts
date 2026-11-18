import { NextResponse } from 'next/server';

// =============================================================================
// WEBHOOK NAVE TEMPORALMENTE BLOQUEADO
// Todos los cobros y conciliaciones operan exclusivamente por Mercado Pago.
// =============================================================================

export async function POST() {
  return NextResponse.json(
    {
      status: 'disabled',
      error: 'Webhook NAVE deshabilitado temporalmente. Pasarela activa: Mercado Pago.'
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json({
    status: 'disabled',
    provider: 'NAVE (Deshabilitado — Activo únicamente Mercado Pago)',
    endpoint: '/api/webhooks/nave'
  });
}
