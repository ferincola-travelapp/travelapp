'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Calendar,
  Route,
  Building2,
  Users,
  ShieldAlert,
  Car,
  Landmark,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MinimalModuleShell, MinimalNavItem } from '@/components/layout/MinimalModuleShell';

const NAV_ITEMS: MinimalNavItem[] = [
  { key: 'principal', label: 'Principal TravelCab', icon: LayoutDashboard },
  { key: 'dispatch', label: 'Central de Despacho', icon: Map },
  { key: 'schedule', label: 'Agenda & Calendario', icon: Calendar },
  { key: 'history', label: 'Trazabilidad & Reportes', icon: Route },
  { key: 'branches', label: 'Gestión de Sucursal', icon: Building2 },
  { key: 'drivers', label: 'Gestión de Conductores', icon: Users },
  { key: 'security', label: 'Seguridad del Ecosistema', icon: ShieldAlert },
];

const ROUTE_MAP: Record<string, string> = {
  dispatch: '/travelcab/dispatch',
  schedule: '/travelcab/schedule',
  history: '/travelcab/history',
  branches: '/travelcab/branches',
  drivers: '/travelcab/drivers',
  security: '/travelcab/security',
};

function toMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function TravelCabDashboardPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
      setTrips(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          price: Number(d.data().finalPrice ?? d.data().price ?? d.data().estimatedPrice ?? 0),
        }))
      );
    });
    return () => {
      unsubDrivers();
      unsubTrips();
    };
  }, []);

  const handleNav = (key: string) => {
    if (ROUTE_MAP[key]) {
      router.push(ROUTE_MAP[key]);
    }
  };

  const activeDrivers = drivers.filter((d) => d.status === 'Activo' || d.isOnline).length;
  const pendingDrivers = drivers.filter(
    (d) => d.status === 'Pendiente Documentación' || d.status === 'En Revisión'
  );

  const completedOrActiveTrips = trips.filter(
    (t) => t.status === 'completed' || t.status === 'active' || t.paymentStatus === 'paid'
  );

  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const todayTrips = completedOrActiveTrips.filter((t) => toMs(t.createdAt) >= startOfToday);
  const dailyIncome = todayTrips.reduce((acc, t) => acc + t.price, 0);

  const chartData = useMemo(() => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayMs = 86400000;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * dayMs);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const end = start + dayMs;
      const dayTrips = completedOrActiveTrips.filter((t) => {
        const ts = toMs(t.createdAt);
        return ts >= start && ts < end;
      });
      return {
        name: dayNames[d.getDay()],
        viajes: dayTrips.length,
        ingresos: dayTrips.reduce((acc, t) => acc + t.price, 0),
      };
    });
  }, [completedOrActiveTrips, now]);

  return (
    <div className="space-y-6">
      {/* KPIs Reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Ingresos de Hoy</span>
            <Landmark className="w-4 h-4 text-[#0a2a5b]" />
          </div>
          <p className="text-2xl font-bold text-[#0a2a5b] mt-2">
            ${dailyIncome.toLocaleString('es-AR')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{todayTrips.length} viajes hoy</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Conductores Activos</span>
            <Car className="w-4 h-4 text-[#0a2a5b]" />
          </div>
          <p className="text-2xl font-bold text-[#0a2a5b] mt-2">{activeDrivers}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{drivers.length} totales en flota</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Viajes Totales</span>
            <TrendingUp className="w-4 h-4 text-[#0a2a5b]" />
          </div>
          <p className="text-2xl font-bold text-[#0a2a5b] mt-2">{trips.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Historial en Firestore</p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Pendientes de Revisión</span>
            <Clock className="w-4 h-4 text-[#ff6b00]" />
          </div>
          <p className="text-2xl font-bold text-[#0a2a5b] mt-2">{pendingDrivers.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Conductores por aprobar</p>
        </div>
      </div>

      {/* Gráfico Real 7 días */}
      <div className="rounded-xl border border-slate-200/90 bg-white/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#0a2a5b]">Actividad de Viajes (Últimos 7 días)</h3>
            <p className="text-[11px] text-slate-500">Datos en tiempo real desde `trips`</p>
          </div>
          <Link
            href="/travelcab/dispatch"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45]"
          >
            Ir a Despacho <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="viajes"
                stroke="#0a2a5b"
                fill="#0a2a5b"
                fillOpacity={0.12}
                name="Viajes"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/travelcab/dispatch"
          className="rounded-xl border border-slate-200/90 bg-white/80 hover:border-[#0a2a5b]/40 p-4 transition"
        >
          <p className="text-sm font-bold text-[#0a2a5b]">Central de Despacho</p>
          <p className="text-xs text-slate-500 mt-1">Mapa en vivo y asignación de móviles.</p>
        </Link>
        <Link
          href="/travelcab/drivers"
          className="rounded-xl border border-slate-200/90 bg-white/80 hover:border-[#0a2a5b]/40 p-4 transition"
        >
          <p className="text-sm font-bold text-[#0a2a5b]">Gestión de Conductores</p>
          <p className="text-xs text-slate-500 mt-1">Estado, documentación y saldos de choferes.</p>
        </Link>
        <Link
          href="/travelcab/history"
          className="rounded-xl border border-slate-200/90 bg-white/80 hover:border-[#0a2a5b]/40 p-4 transition"
        >
          <p className="text-sm font-bold text-[#0a2a5b]">Trazabilidad & Reportes</p>
          <p className="text-xs text-slate-500 mt-1">Historial completo de viajes realizados.</p>
        </Link>
      </div>
    </div>
  );
}
