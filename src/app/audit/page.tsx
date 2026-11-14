'use client';

import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Wallet,
  BookOpen,
  AlarmClock,
  Building2,
  KeyRound,
  BarChart2,
  CalendarDays,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MinimalModuleShell, MinimalNavItem } from '@/components/layout/MinimalModuleShell';
import { ForexRevenueChart } from '@/components/audit/ForexRevenueChart';
import { CashBoxTab } from '@/components/audit/CashBoxTab';
import { PaymentOrdersTab } from '@/components/audit/PaymentOrdersTab';
import {
  RealFlowAndBanksTab,
  RealLedgerTab,
  RealScheduleTab,
  RealDirectoryTab,
  RealProfitabilityTab,
} from '@/components/audit/RealAuditTabs';

type AuditTabKey =
  | 'flow'
  | 'cashbox'
  | 'ledger'
  | 'schedule'
  | 'directory'
  | 'orders'
  | 'profit'
  | 'agenda';

const NAV_ITEMS: MinimalNavItem[] = [
  { key: 'flow', label: 'Flujo y Bancos', icon: Landmark },
  { key: 'cashbox', label: 'Caja Diaria', icon: Wallet },
  { key: 'ledger', label: 'Libro Mayor', icon: BookOpen },
  { key: 'schedule', label: 'Vencimientos', icon: AlarmClock },
  { key: 'directory', label: 'Directorio', icon: Building2 },
  { key: 'orders', label: 'Órdenes de Pago', icon: KeyRound },
  { key: 'profit', label: 'Rentabilidad', icon: BarChart2 },
  { key: 'agenda', label: 'Agenda de Vencimientos', icon: CalendarDays },
];

export default function AdministracionPage() {
  const [activeKey, setActiveKey] = useState<AuditTabKey>('flow');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const unsubBranches = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, name: d.data().name || 'Sucursal' })));
    });
    const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
      setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubRes = onSnapshot(collection(db, 'experience_reservations'), (snap) => {
      setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubTx = onSnapshot(
      query(collection(db, 'transactions'), orderBy('date', 'desc')),
      (snap) => {
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubBranches();
      unsubTrips();
      unsubRes();
      unsubTx();
    };
  }, []);

  return (
    <MinimalModuleShell
      moduleTitle="Administración"
      navItems={NAV_ITEMS}
      activeKey={activeKey}
      onSelectKey={(k) => setActiveKey(k as AuditTabKey)}
    >
      {activeKey === 'flow' && (
        <div className="space-y-6">
          <ForexRevenueChart
            trips={trips}
            reservations={reservations}
            transactions={transactions}
          />
          <RealFlowAndBanksTab />
        </div>
      )}

      {activeKey === 'cashbox' && <CashBoxTab branches={branches} />}
      {activeKey === 'ledger' && <RealLedgerTab transactions={transactions} branches={branches} />}
      {activeKey === 'schedule' && <RealScheduleTab branches={branches} />}
      {activeKey === 'directory' && <RealDirectoryTab />}
      {activeKey === 'orders' && <PaymentOrdersTab branches={branches} />}
      {activeKey === 'profit' && <RealProfitabilityTab transactions={transactions} />}
      {activeKey === 'agenda' && <RealScheduleTab branches={branches} isAgendaView />}
    </MinimalModuleShell>
  );
}
