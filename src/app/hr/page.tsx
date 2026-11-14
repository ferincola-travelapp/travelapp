'use client';

import React, { useState } from 'react';
import {
  Users,
  Network,
  Briefcase,
  ShieldCheck,
  Car,
} from 'lucide-react';
import { MinimalModuleShell, MinimalNavItem } from '@/components/layout/MinimalModuleShell';
import { StaffTab } from '@/components/hr/StaffTab';
import { OrgChartTab } from '@/components/hr/OrgChartTab';
import { PostulacionesTab } from '@/components/hr/PostulacionesTab';
import { SupervisorsTab } from '@/components/hr/SupervisorsTab';
import { DriversTab } from '@/components/hr/DriversTab';

type HrTabKey = 'staff' | 'org' | 'postulaciones' | 'supervisores' | 'conductores';

const NAV_ITEMS: MinimalNavItem[] = [
  { key: 'staff', label: 'Gestión de Staff TravelApp', icon: Users },
  { key: 'org', label: 'Organigrama Empresarial', icon: Network },
  { key: 'postulaciones', label: 'Postulaciones', icon: Briefcase },
  { key: 'supervisores', label: 'Gestión de Supervisores', icon: ShieldCheck },
  { key: 'conductores', label: 'Gestión de Conductores', icon: Car },
];

export default function RecursosHumanosPage() {
  const [activeKey, setActiveKey] = useState<HrTabKey>('staff');

  return (
    <MinimalModuleShell
      moduleTitle="Recursos Humanos"
      navItems={NAV_ITEMS}
      activeKey={activeKey}
      onSelectKey={(k) => setActiveKey(k as HrTabKey)}
    >
      {activeKey === 'staff' && <StaffTab />}
      {activeKey === 'org' && <OrgChartTab />}
      {activeKey === 'postulaciones' && <PostulacionesTab />}
      {activeKey === 'supervisores' && <SupervisorsTab />}
      {activeKey === 'conductores' && <DriversTab />}
    </MinimalModuleShell>
  );
}
