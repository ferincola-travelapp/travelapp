'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, CreditCard, Loader2 } from 'lucide-react';

function MPSimulatedPayInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const amount = searchParams.get('amount') || '0';
  const tripId = searchParams.get('tripId') || 'landing';
  const isProdHost =
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1');

  const [loading, setLoading] = useState(false);

  if (process.env.NODE_ENV === 'production' || isProdHost) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-3xl bg-slate-900 p-8 shadow-2xl border border-slate-800 text-center space-y-5">
          <ShieldAlert className="h-12 w-12 text-amber-400 mx-auto" />
          <h1 className="text-xl font-black">Pagos Simulados Bloqueados en Producción</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Por seguridad, el simulador de pagos está deshabilitado en el entorno productivo. Por favor iniciá tu compra nuevamente para dirigirte a Mercado Pago oficial.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-[#009EE3] text-white font-bold py-3.5 rounded-2xl hover:bg-[#0087c4] transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push(`/checkout/success?tripId=${tripId}&amount=${amount}`);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-800">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-sky-50 flex items-center justify-center text-[#009EE3]">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-md font-extrabold tracking-tight text-[#009EE3]">mercado pago</h2>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Checkout Local Dev</span>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">Local Dev</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold text-slate-800">${Number(amount).toLocaleString('es-AR')} ARS</h1>
          <p className="text-sm text-slate-500">Referencia: {tripId}</p>
        </div>

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-[#009EE3] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#0087c4] transition-all flex items-center justify-center gap-2 disabled:opacity-75"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Procesando pago...</span>
            </>
          ) : (
            <span>Pagar en Entorno Local</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function MPSimulatedPayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <MPSimulatedPayInner />
    </Suspense>
  );
}
