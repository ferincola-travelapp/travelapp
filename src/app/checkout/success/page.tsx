'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CheckCircle2,
  Home,
  Calendar,
  MapPin,
  Users,
  Compass,
  MessageCircle,
  Building2,
  FileText,
  Loader2,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tripId = searchParams.get('tripId');
  const file = searchParams.get('file') || searchParams.get('fileNumber') || searchParams.get('resCode');
  const isExperience = searchParams.get('type') === 'experience' || Boolean(file);
  const amount = searchParams.get('amount') || '0';

  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState<any>(null);
  const [experienceData, setExperienceData] = useState<any>(null);

  useEffect(() => {
    const handleSuccessLookup = async () => {
      try {
        // CASO 1: Cobro de Experiencia / Paquete de Viaje con NAVE (Banco Galicia)
        if (file) {
          try {
            const expQ = query(collection(db, 'experience_reservations'), where('reservationCode', '==', file));
            const snap = await getDocs(expQ);

            if (!snap.empty) {
              const expDoc = snap.docs[0];
              setExperienceData(expDoc.data());
            } else {
              // Fallback: buscar en contracted_trips
              const tripQ = query(collection(db, 'contracted_trips'), where('reservationCode', '==', file));
              const tripSnap = await getDocs(tripQ);
              if (!tripSnap.empty) {
                setExperienceData(tripSnap.docs[0].data());
              }
            }
          } catch (expErr) {
            console.error('Error buscando experiencia en Firestore:', expErr);
          }
        }

        // CASO 2: Cobro de TravelCab (solo lectura; la confirmación la realiza el webhook del servidor)
        if (tripId && tripId !== 'landing') {
          try {
            const docRef = doc(db, 'trips', tripId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              setTripData(snap.data());
            }
          } catch (cabErr) {
            console.error('Error consultando viaje TravelCab:', cabErr);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    handleSuccessLookup();
  }, [file, tripId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  // VISTA PARA EXPERIENCIAS Y PAQUETES DE VIAJE (NAVE BANCO GALICIA)
  if (isExperience) {
    const tourTitle = experienceData?.tourTitle || experienceData?.tripTitle || 'Excursión / Paquete Turístico';
    const passengerName = experienceData?.passengerName || experienceData?.nombrePasajero || 'Titular de Reserva';
    const departureDate = experienceData?.departureDate || 'A coordinar con operador';
    const destination = experienceData?.destination || 'Argentina';
    const displayAmount = Number(amount || experienceData?.financials?.paidAmount || experienceData?.financials?.totalPrice || 0);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-4 sm:p-6 text-slate-800 font-sans">
        <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col gap-6 p-6 sm:p-8 animate-in zoom-in-95">
          
          {/* Badge Nave Galicia */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-xs">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900">nave · Banco Galicia</span>
                <span className="text-[10px] text-slate-400 block font-bold">Cobro Acreditado en Tiempo Real</span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
              Pago Aprobado
            </span>
          </div>

          {/* Ícono de Confirmación */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">¡Reserva y Pago Confirmados!</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Tu lugar está formalmente asegurado en el circuito oficial.
              </p>
            </div>
          </div>

          {/* Tarjeta Voucher */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-500">Expediente Oficial:</span>
              <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {file || 'EXP-CONFIRMADO'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Servicio Contratado</span>
              <p className="font-black text-slate-900 text-sm">{tourTitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Titular:</span>
                <span className="font-bold text-slate-800">{passengerName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Fecha Salida:</span>
                <span className="font-bold text-slate-800">{departureDate}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700">Monto Acreditado:</span>
              <span className="font-black text-emerald-600 text-base">
                ${displayAmount.toLocaleString('es-AR')} ARS
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-2.5">
            <a
              href={`https://wa.me/5493812000712?text=Hola!%20Acabo%20de%20abonar%20mediante%20Nave%20la%20reserva%20${encodeURIComponent(tourTitle)}%20(Expediente:%20${file}).%20Quiero%20coordinar%20detalles.`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs text-center transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Contactar a Coordinación Oficial</span>
            </a>

            <Link
              href="/mobile"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs text-center transition flex items-center justify-center gap-2"
            >
              <Compass className="h-4 w-4" />
              <span>Ver en Mi App de Pasajero (Itinerario)</span>
            </Link>

            <Link
              href="/landing/experience/marketplace"
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs text-center transition block"
            >
              Volver al Catálogo de Experiencias
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // VISTA POR DEFECTO PARA TRAVELCAB
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-800">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-100 flex flex-col items-center gap-6 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 animate-bounce">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-slate-800">¡Pago Confirmado!</h1>
          <p className="text-sm text-slate-500 mt-2">Tu pago de viaje fue procesado correctamente.</p>
        </div>

        <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left text-xs text-slate-500 flex flex-col gap-3">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-700">Monto Acreditado:</span>
            <span className="font-bold text-emerald-600 text-sm">${Number(amount || tripData?.price || 0).toLocaleString('es-AR')} ARS</span>
          </div>
          <div><span className="font-bold text-slate-700">Transacción:</span> Mercado Pago Split 1:1</div>
          <div><span className="font-bold text-slate-700">Viaje ID:</span> {tripId}</div>
          {tripData && (
            <>
              <div><span className="font-bold text-slate-700">Origen:</span> {tripData.origin}</div>
              <div><span className="font-bold text-slate-700">Destino:</span> {tripData.destination}</div>
              <div><span className="font-bold text-slate-700">Pasajero:</span> {tripData.passengerName || tripData.userName}</div>
            </>
          )}
          <div className="flex items-center gap-2 text-emerald-600 font-semibold mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Servicio de asignación activo</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full bg-[#0A2A5B] text-white font-bold py-3.5 rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          <Home className="h-4 w-4" />
          <span>Volver al Inicio</span>
        </button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
