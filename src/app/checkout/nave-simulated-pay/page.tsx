'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NaveDisabledPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-black tracking-tight">Pasarela NAVE Deshabilitada</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Actualmente todos los pagos online del ecosistema TravelApp se procesan exclusivamente a través de{' '}
            <strong className="text-sky-400">Mercado Pago Checkout Pro</strong>.
          </p>
        </div>
        <Link
          href="/"
          className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm transition flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
