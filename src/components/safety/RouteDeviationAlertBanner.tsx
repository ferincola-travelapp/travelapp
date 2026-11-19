'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { SafetyAlertRecord } from '@/types/messaging';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  Volume2,
  X,
} from 'lucide-react';

function playSirenBeep() {
  try {
    const AudioCtx =
      typeof window !== 'undefined'
        ? (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
        : null;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch {
    // Browser autoplay policy may block audio before first user gesture
  }
}

function cleanPhoneForWa(phone?: string): string {
  return String(phone || '').replace(/\D/g, '');
}

export function RouteDeviationAlertBanner() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SafetyAlertRecord[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const lastAlertCountRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'safety_alerts'),
      where('escalatedToDashboard', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const active = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as SafetyAlertRecord))
          .filter(
            (a) =>
              a.status === 'driver_panic_active' ||
              a.status === 'passenger_help_requested' ||
              a.status === 'no_response' ||
              a.status === 'awaiting_passenger'
          );

        const urgentCount = active.filter(
          (a) =>
            a.status === 'driver_panic_active' ||
            a.status === 'passenger_help_requested' ||
            a.status === 'no_response'
        ).length;

        if (urgentCount > lastAlertCountRef.current) {
          playSirenBeep();
        }
        lastAlertCountRef.current = urgentCount;
        setAlerts(active);
      },
      () => {
        // Ignore permission or index fallback errors silently in non-staff views
      }
    );

    return () => unsub();
  }, [user]);

  const urgentAlerts = alerts.filter(
    (a) =>
      a.status === 'driver_panic_active' ||
      a.status === 'passenger_help_requested' ||
      a.status === 'no_response'
  );

  if (urgentAlerts.length === 0) return null;

  const handleCopyAuthorityFicha = async (alert: SafetyAlertRecord) => {
    const locStr = alert.driverLocation
      ? `https://maps.google.com/?q=${alert.driverLocation.latitude},${alert.driverLocation.longitude}`
      : 'Sin coordenadas';
    const isDriverPanic = alert.type === 'driver_panic' || alert.status === 'driver_panic_active';
    const text = [
      isDriverPanic
        ? `🚨 EMERGENCIA CONDUCTOR (BOTÓN DE PÁNICO SOS) TRAVELCAB`
        : `🚨 ALERTA DE DESVÍO TRAVELCAB`,
      `Estado: ${
        isDriverPanic
          ? 'CONDUCTOR ACTIVÓ BOTÓN DE PÁNICO SOS'
          : alert.status === 'passenger_help_requested'
          ? 'PASAJERO SOLICITÓ AYUDA'
          : 'SIN RESPUESTA DEL PASAJERO'
      }`,
      `Conductor: ${alert.driverName || 'N/A'} (${alert.driverPhone || 'Sin tel'})${alert.supervisorCode ? ` · Supervisor: ${alert.supervisorCode}` : ''}`,
      `Vehículo: ${alert.vehicleInfo || 'N/A'} · Patente: ${alert.vehiclePlate || 'S/D'}`,
      `Pasajero: ${alert.passengerName || 'Sin pasajero asignado'} (${alert.passengerPhone || 'Sin tel'})`,
      ...(!isDriverPanic
        ? [`Desvío detectado: ${alert.deviationKm?.toFixed(2)} km (umbral ${alert.thresholdKm} km)`]
        : []),
      `Origen: ${alert.origin || 'N/A'} -> Destino: ${alert.destination || 'N/A'}`,
      `Última ubicación GPS: ${locStr}`,
      `ID Viaje / Ref: ${alert.tripId}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(alert.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleResolve = async (alertId: string) => {
    await updateDoc(doc(db, 'safety_alerts', alertId), {
      status: 'resolved',
      resolutionNote: resolutionNote.trim() || 'Contactado y verificado por operador',
      resolvedBy: user?.email || user?.displayName || 'Operador',
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    });
    setResolvingId(null);
    setResolutionNote('');
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-rose-600 text-white shadow-lg border-b-2 border-rose-800">
      <div className="max-w-7xl mx-auto px-4 py-2.5 space-y-2">
        {urgentAlerts.map((alert) => {
          const isDriverPanic = alert.type === 'driver_panic' || alert.status === 'driver_panic_active';
          const isHelp = alert.status === 'passenger_help_requested';
          const mapsUrl = alert.driverLocation
            ? `https://maps.google.com/?q=${alert.driverLocation.latitude},${alert.driverLocation.longitude}`
            : null;
          const waPhone = cleanPhoneForWa(isDriverPanic ? alert.driverPhone : alert.passengerPhone);

          return (
            <div
              key={alert.id}
              className={`flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 border ${
                isDriverPanic
                  ? 'bg-red-950/85 border-amber-400 shadow-md'
                  : 'bg-rose-700/70 border-rose-400/50'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-lg animate-pulse shrink-0 ${isDriverPanic ? 'bg-amber-400 text-red-950' : 'bg-white/15'}`}>
                  <ShieldAlert className={`h-5 w-5 ${isDriverPanic ? 'text-red-950' : 'text-amber-300'}`} />
                </div>
                <div className="text-xs leading-snug">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isDriverPanic && (
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-red-950 text-[10px] font-black uppercase tracking-wider">
                        CONDUCTOR · SOS
                      </span>
                    )}
                    <span className="font-black tracking-wide uppercase text-amber-200">
                      {isDriverPanic
                        ? '🚨 BOTÓN DE PÁNICO ACTIVADO POR CONDUCTOR'
                        : isHelp
                        ? '🆘 PASAJERO PIDIÓ AYUDA'
                        : '⚠️ DESVÍO DE RUTA — SIN RESPUESTA DEL PASAJERO'}
                    </span>
                    {!isDriverPanic ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-950/60 text-[10px] font-bold">
                        +{Number(alert.deviationKm || 0).toFixed(2)} km (límite {alert.thresholdKm} km)
                      </span>
                    ) : alert.supervisorCode ? (
                      <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold">
                        Supervisor: {alert.supervisorCode}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-white/95 font-medium">
                    Chofer: <strong>{alert.driverName || 'Conductor'}</strong>
                    {alert.driverPhone ? ` (${alert.driverPhone})` : ''} · Vehículo:{' '}
                    <strong>
                      {alert.vehicleInfo || 'Móvil'} ({alert.vehiclePlate || 'S/D'})
                    </strong>
                    {alert.passengerName ? (
                      <>
                        {' '}· Pasajero: <strong>{alert.passengerName}</strong>
                        {alert.passengerPhone ? ` (${alert.passengerPhone})` : ''}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {alert.driverPhone && (
                  <a
                    href={`tel:${alert.driverPhone}`}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold ${
                      isDriverPanic
                        ? 'bg-white text-rose-700 hover:bg-rose-50'
                        : 'bg-rose-900/80 text-white hover:bg-rose-950'
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" /> Llamar Chofer
                  </a>
                )}
                {alert.passengerPhone && (
                  <a
                    href={`tel:${alert.passengerPhone}`}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold ${
                      isDriverPanic
                        ? 'bg-rose-900/80 text-white hover:bg-rose-950'
                        : 'bg-white text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" /> Llamar Pasajero
                  </a>
                )}
                {waPhone && (
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 text-slate-900 text-[11px] font-extrabold hover:bg-amber-300"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Mapa GPS
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleCopyAuthorityFicha(alert)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 text-white text-[11px] font-bold hover:bg-white/25"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedId === alert.id ? '¡Copiado!' : 'Ficha 911'}
                </button>
                <button
                  type="button"
                  onClick={() => playSirenBeep()}
                  title="Probar sonido"
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setResolvingId(resolvingId === alert.id ? null : alert.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolver
                </button>
              </div>
            </div>
          );
        })}

        {resolvingId && (
          <div className="flex items-center gap-2 bg-rose-900/90 rounded-lg p-2">
            <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" />
            <input
              type="text"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Anotá el resultado del contacto (ej. Pasajero confirmó cambio de ruta, falsa alarma, etc.)..."
              className="flex-1 px-2.5 py-1 rounded bg-white text-slate-900 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleResolve(resolvingId)}
              className="px-3 py-1 rounded bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600"
            >
              Confirmar Cierre
            </button>
            <button
              type="button"
              onClick={() => setResolvingId(null)}
              className="p-1 rounded hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
