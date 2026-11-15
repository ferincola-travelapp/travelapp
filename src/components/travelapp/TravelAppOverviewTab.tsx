'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Ticket,
  Plane,
  AlarmClock,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const PIE_COLORS = ['#0a2a5b', '#ff6b00', '#059669', '#7c3aed', '#0284c7', '#d97706'];

export function TravelAppOverviewTab() {
  const { user, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    const onErr = (col: string) => (err: any) =>
      console.warn(`Firestore ${col} listener:`, err?.code || err?.message);

    const u1 = onSnapshot(
      collection(db, 'leads'),
      (s) => setLeads(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      onErr('leads')
    );
    const u2 = onSnapshot(
      collection(db, 'experience_reservations'),
      (s) => setReservations(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      onErr('experience_reservations')
    );
    const u3 = onSnapshot(
      collection(db, 'contracted_trips'),
      (s) => setTrips(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      onErr('contracted_trips')
    );
    const u4 = onSnapshot(
      collection(db, 'scheduled_payments'),
      (s) => setScheduled(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      onErr('scheduled_payments')
    );
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [authLoading, user]);

  const pendingQueries = leads.filter(
    (l) => l.status === 'Nuevos' || l.status === 'Agendados' || !l.status
  ).length;
  const attendedQueries = Math.max(0, leads.length - pendingQueries);

  const activeTripsCount =
    trips.filter((t) => t.status !== 'finalizado' && t.status !== 'cancelado').length +
    reservations.filter((r) => r.estado === 'Confirmada' || r.estado === 'En Curso').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const dueToday = scheduled.filter(
    (s) => s.status !== 'pagado' && String(s.dueDate || '').startsWith(todayStr)
  );

  // Gráfico tipo torta: ventas por tipo de servicio
  const servicePieData = useMemo(() => {
    const buckets: Record<string, number> = {
      'Pasajes Aéreos': 0,
      'Bus / Micro': 0,
      'Paquetes Propios': 0,
      'Paquetes Operadores': 0,
      'Solo Alojamiento': 0,
      'Excursiones / Otros': 0,
    };

    reservations.forEach((r) => {
      const amt = Number(r.totalAmount || r.amount || r.total || 1);
      const st = String(r.serviceType || r.category || r.experienceTitle || '').toLowerCase();
      if (st.includes('aere') || st.includes('vuelo') || st.includes('flight')) {
        buckets['Pasajes Aéreos'] += amt;
      } else if (st.includes('bus') || st.includes('micro')) {
        buckets['Bus / Micro'] += amt;
      } else if (st.includes('propio') || st.includes('grupal')) {
        buckets['Paquetes Propios'] += amt;
      } else if (st.includes('operador') || st.includes('mayorista')) {
        buckets['Paquetes Operadores'] += amt;
      } else if (st.includes('hotel') || st.includes('alojamiento')) {
        buckets['Solo Alojamiento'] += amt;
      } else {
        buckets['Excursiones / Otros'] += amt;
      }
    });

    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [reservations]);

  return (
    <div className="space-y-6">
      {/* KPIs Generales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Consultas (Atendidas vs Pend.)</span>
            <MessageSquare className="w-4 h-4 text-[#0a2a5b]" />
          </div>
          <p className="text-2xl font-bold text-[#0a2a5b] mt-2">
            {attendedQueries}{' '}
            <span className="text-sm font-semibold text-[#ff6b00]">/ {pendingQueries} pend.</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{leads.length} consultas totales</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Reservas Totales</span>
            <Ticket className="w-4 h-4 text-[#0a2a5b]" />
          </div>
          <p className="text-2xl font-bold text-[#0a2a5b] mt-2">{reservations.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {reservations.filter((r) => r.estado === 'Confirmada').length} confirmadas
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Viajes en Curso</span>
            <Plane className="w-4 h-4 text-[#0a2a5b]" />
          </div>
          <p className="text-2xl font-bold text-[#0a2a5b] mt-2">{activeTripsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {trips.length} salidas propias + operadores
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Vencimientos del Día</span>
            <AlarmClock className="w-4 h-4 text-[#ff6b00]" />
          </div>
          <p className="text-2xl font-bold text-[#0a2a5b] mt-2">{dueToday.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pagos a proveedores y cobros</p>
        </div>
      </div>

      {/* Gráfico Torta de Ventas por Servicio + Vencimientos del día */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-5">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon className="w-4 h-4 text-[#0a2a5b]" />
            <h3 className="text-sm font-bold text-[#0a2a5b]">
              Ventas por Tipo de Servicio
            </h3>
          </div>
          {servicePieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Aún no hay reservas registradas para graficar por servicio.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={servicePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label
                  >
                    {servicePieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `$${Number(v || 0).toLocaleString('es-AR')}`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0a2a5b]">
              Vencimientos de Hoy ({todayStr})
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">Pagos / Cobros</span>
          </div>
          {dueToday.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">
              Sin vencimientos programados para hoy.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {dueToday.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">{item.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.branchName || 'General'} · {item.userEmail || ''}
                    </p>
                  </div>
                  <span className="font-bold text-[#0a2a5b]">
                    ${Number(item.amount || 0).toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
