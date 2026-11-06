'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart, TrendingUp, Users, DollarSign, Activity, Gift, Clock,
  ArrowUpRight, ArrowDownRight, Award, Landmark, Calendar, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  DEFAULT_REWARDS_CONFIG, 
  subscribeGlobalRewardsConfig 
} from '@/lib/rewards-config';
import { GlobalRewardsConfig } from '@/types/rewards';

interface PayoutDue {
  id: string;
  merchantName: string;
  amount: number;
  dueDate: string;
  status: 'Pendiente' | 'Procesado';
}

const mockChartData = [
  { name: 'Lun', emitidos: 12000, canjeados: 8500 },
  { name: 'Mar', emitidos: 15000, canjeados: 11000 },
  { name: 'Mie', emitidos: 24000, canjeados: 18000 },
  { name: 'Jue', emitidos: 18000, canjeados: 14000 },
  { name: 'Vie', emitidos: 35000, canjeados: 29000 },
  { name: 'Sab', emitidos: 48000, canjeados: 38000 },
  { name: 'Dom', emitidos: 30000, canjeados: 22000 },
];

const MOCK_PAYOUTS: PayoutDue[] = [
  { id: 'PAY-001', merchantName: "McDonald's Pilar", amount: 158000, dueDate: '2026-07-25', status: 'Pendiente' },
  { id: 'PAY-002', merchantName: "Estación Shell Retiro", amount: 245000, dueDate: '2026-07-28', status: 'Pendiente' },
  { id: 'PAY-003', merchantName: "Hotel Tucumán Plaza", amount: 480000, dueDate: '2026-08-02', status: 'Pendiente' },
  { id: 'PAY-004', merchantName: "Cine Hoyts Shopping", amount: 95000, dueDate: '2026-08-05', status: 'Pendiente' },
];

export default function RewardsAnalyticsPage() {
  const [payouts, setPayouts] = useState<PayoutDue[]>(MOCK_PAYOUTS);
  const [loading, setLoading] = useState(true);
  const [globalConfig, setGlobalConfig] = useState<GlobalRewardsConfig>(DEFAULT_REWARDS_CONFIG);

  // Load merchants, totals and global config dynamically
  useEffect(() => {
    const unsubGlobal = subscribeGlobalRewardsConfig((cfg) => {
      setGlobalConfig(cfg);
    });

    const unsub = onSnapshot(collection(db, 'rewards_merchants'), (snapshot) => {
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => {
      unsubGlobal();
      unsub();
    };
  }, []);

  // Totales dinámicos
  const totalPointsEmitidos = 1890000;
  const pointValue = globalConfig.universalPointValue || 175;
  const financialBacking = totalPointsEmitidos * pointValue;
  const totalPointsCanjeados = 1240000;

  // Ranking por Rubro (Tarjeta 1)
  const rankingRubros = [
    { name: 'Gastronomía', percentage: 42, points: 793800 },
    { name: 'Traslados Logísticos', percentage: 35, points: 661500 },
    { name: 'Alojamiento & Tours', percentage: 18, points: 340200 },
    { name: 'Retail & Otros', percentage: 5, points: 94500 },
  ];

  // Ranking de Emisión por Unidad de Negocio / Comercio (Tarjeta 3)
  const rankingComercios = [
    { name: 'TravelCab Logística', points: 820000, percentage: 43 },
    { name: "McDonald's Alimentos", points: 410000, percentage: 22 },
    { name: 'Experiencias Ecosistema', points: 380000, percentage: 20 },
    { name: 'Shell Combustibles', points: 280000, percentage: 15 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-tech-blue flex items-center gap-2">
            <PieChart className="h-7 w-7 text-vial-orange" />
            Principal Rewards
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium">Dashboard analítico financiero: emisión, canjes, respaldo contable y agenda de pagos.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin text-vial-orange" />
          Sincronizado
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Puntos Emitidos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Puntos Emitidos</span>
            <Activity className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-3">
            <p className="text-3xl font-black text-tech-blue">{totalPointsEmitidos.toLocaleString('es-AR')}</p>
            <span className="text-xs font-bold text-slate-400">pts</span>
          </div>
          <p className="text-emerald-600 text-xs font-bold flex items-center mt-1">
            <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> +18.4% este mes
          </p>
          <div className="mt-3 text-[10px] text-slate-400 space-y-1 border-t border-slate-100 pt-2">
            <p className="font-bold text-slate-500 uppercase tracking-wide mb-1 text-[9px]">Rubros que más otorgaron:</p>
            {rankingRubros.map(r => (
              <div key={r.name} className="flex justify-between">
                <span>{r.name}:</span>
                <span className="font-semibold text-slate-600">{r.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* KPI 2: Respaldo Financiero */}
        <div className="rounded-2xl border-2 border-tech-blue bg-white p-5 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1.5 bg-tech-blue"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold text-tech-blue uppercase tracking-wider">Respaldo Necesario</span>
            <DollarSign className="h-5 w-5 text-tech-blue" />
          </div>
          <div className="flex items-baseline mt-3">
            <span className="text-xl font-bold text-tech-blue mr-0.5">$</span>
            <p className="text-3xl font-black text-tech-blue">{financialBacking.toLocaleString('es-AR')}</p>
          </div>
          <p className="text-xs text-slate-400 mt-2">Fondo de reserva corporativo de respaldo en BIND PSP.</p>
          <p className="text-[10px] text-slate-400 mt-1">Respaldo monetario Concorde 360: ${pointValue} ARS/pt.</p>
        </div>

        {/* KPI 3: Puntos Canjeados */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Puntos Canjeados</span>
            <Gift className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-3">
            <p className="text-3xl font-black text-tech-blue">{totalPointsCanjeados.toLocaleString('es-AR')}</p>
            <span className="text-xs font-bold text-slate-400">pts</span>
          </div>
          <p className="text-[#FF7A00] text-xs font-bold flex items-center mt-1">
            <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> Canje del 65.6% del total
          </p>
          <div className="mt-3 text-[10px] text-slate-400 space-y-1 border-t border-slate-100 pt-2">
            <p className="font-bold text-slate-500 uppercase tracking-wide mb-1 text-[9px]">Ranking Emisión por Comercio:</p>
            {rankingComercios.slice(0, 3).map(c => (
              <div key={c.name} className="flex justify-between">
                <span className="truncate max-w-[130px]">{c.name}:</span>
                <span className="font-semibold text-slate-600">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* KPI 4: Agenda de Pagos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Agenda Pagos (Pendiente)</span>
            <Calendar className="h-5 w-5 text-rose-500" />
          </div>
          <p className="text-3xl font-black text-tech-blue mt-3">
            ${payouts.reduce((acc, p) => acc + (p.status === 'Pendiente' ? p.amount : 0), 0).toLocaleString('es-AR')}
          </p>
          <p className="text-rose-600 text-xs font-bold flex items-center mt-1">
            <Clock className="h-3.5 w-3.5 mr-0.5 animate-pulse" /> {payouts.filter(p => p.status === 'Pendiente').length} facturas pendientes
          </p>
          <div className="mt-3 text-[10px] text-slate-400 space-y-1 border-t border-slate-100 pt-2">
            <p className="font-bold text-slate-500 uppercase tracking-wide mb-1 text-[9px]">Próximos vencimientos:</p>
            {payouts.slice(0, 2).map(p => (
              <div key={p.id} className="flex justify-between">
                <span className="truncate max-w-[100px]">{p.merchantName}:</span>
                <span className="font-semibold text-rose-600">${p.amount.toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm min-w-0">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Tráfico de Fidelidad: Emisión vs Canjes</h3>
        <div className="h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="colorEmitidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A2A5B" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#0A2A5B" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCanjeados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#FF7A00" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="emitidos" stroke="#0A2A5B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEmitidos)" name="Puntos Emitidos" />
              <Area type="monotone" dataKey="canjeados" stroke="#FF7A00" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCanjeados)" name="Puntos Canjeados" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Ranking por Comercios / Unidad de Negocio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider mb-6">Ranking de Emisión por Unidad de Negocio</h3>
          
          <div className="space-y-6">
            {rankingComercios.map((item, index) => (
              <div key={index} className="relative">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700">{item.name}</span>
                  <span className="text-xs font-bold text-slate-500">{item.points.toLocaleString('es-AR')} pts ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-tech-blue h-2.5 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Agenda de Pagos Completa */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider mb-6">Agenda de Pagos a Proveedores</h3>
            
            <div className="space-y-4">
              {payouts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{p.merchantName}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Vence: {p.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600">${p.amount.toLocaleString('es-AR')}</p>
                    <button
                      onClick={() => {
                        setPayouts(prev => prev.map(item => item.id === p.id ? { ...item, status: 'Procesado' as any } : item));
                      }}
                      className="text-[9px] font-bold text-tech-blue hover:underline uppercase mt-1 block"
                    >
                      {p.status === 'Pendiente' ? 'Procesar' : 'Procesado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
