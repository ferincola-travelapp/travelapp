'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ForexRevenueChartProps {
  trips: any[];
  reservations: any[];
  transactions: any[];
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function ForexRevenueChart({ trips, reservations, transactions }: ForexRevenueChartProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const chartData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const rows = Array.from({ length: daysInMonth }, (_, i) => ({
      day: String(i + 1).padStart(2, '0'),
      TravelCab: 0,
      TravelApp: 0,
      Experience: 0,
      Rewards: 0,
    }));

    const addAmount = (ts: number, unit: 'TravelCab' | 'TravelApp' | 'Experience' | 'Rewards', amount: number) => {
      if (!ts || !amount) return;
      const d = new Date(ts);
      if (d.getFullYear() !== selectedYear || d.getMonth() !== selectedMonth) return;
      const idx = d.getDate() - 1;
      if (rows[idx]) rows[idx][unit] += Number(amount);
    };

    trips.forEach((t) => {
      if (t.paymentStatus === 'paid' || t.status === 'completed') {
        addAmount(toMs(t.paidAt || t.createdAt), 'TravelCab', Number(t.fare || t.amount || t.total || 0));
      }
    });

    reservations.forEach((r) => {
      if (r.estado === 'Confirmada' || r.paymentStatus === 'paid') {
        addAmount(toMs(r.paidAt || r.createdAt), 'Experience', Number(r.totalAmount || r.amount || r.total || 0));
      }
    });

    transactions.forEach((tx) => {
      if (tx.type !== 'ingreso') return;
      const bu = String(tx.businessUnit || '').toLowerCase();
      const ts = toMs(tx.date || tx.createdAt);
      const amt = Number(tx.amount || 0);
      if (bu.includes('cab')) addAmount(ts, 'TravelCab', amt);
      else if (bu.includes('exp')) addAmount(ts, 'Experience', amt);
      else if (bu.includes('rew')) addAmount(ts, 'Rewards', amt);
      else addAmount(ts, 'TravelApp', amt);
    });

    return rows;
  }, [trips, reservations, transactions, selectedMonth, selectedYear]);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/80 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#0a2a5b]" />
          <div>
            <h3 className="text-sm font-bold text-[#0a2a5b]">
              Flujo de Ingresos por Unidad de Negocio
            </h3>
            <p className="text-[11px] text-slate-500">
              Evolución diaria comparativa (TravelCab · TravelApp · Experience · Rewards)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0a2a5b] outline-none"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0a2a5b] outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(value: any) => `$${Number(value || 0).toLocaleString('es-AR')}`}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="TravelCab" stroke="#0a2a5b" strokeWidth={2.2} dot={false} name="TravelCab" />
            <Line type="monotone" dataKey="TravelApp" stroke="#ff6b00" strokeWidth={2.2} dot={false} name="TravelApp" />
            <Line type="monotone" dataKey="Experience" stroke="#059669" strokeWidth={2.2} dot={false} name="TravelApp Experience" />
            <Line type="monotone" dataKey="Rewards" stroke="#7c3aed" strokeWidth={2.2} dot={false} name="TravelApp Rewards" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
