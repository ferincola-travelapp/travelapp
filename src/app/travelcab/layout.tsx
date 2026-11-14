'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Calendar,
  Route,
  Building2,
  Users,
  Megaphone,
  ShieldAlert,
} from 'lucide-react';
import { MinimalModuleShell, MinimalNavItem } from '@/components/layout/MinimalModuleShell';

const NAV_ITEMS: MinimalNavItem[] = [
  { key: 'principal', label: 'Principal TravelCab', icon: LayoutDashboard },
  { key: 'dispatch', label: 'Central de Despacho', icon: Map },
  { key: 'schedule', label: 'Agenda & Calendario', icon: Calendar },
  { key: 'history', label: 'Trazabilidad & Reportes', icon: Route },
  { key: 'branches', label: 'Gestión de Sucursal', icon: Building2 },
  { key: 'drivers', label: 'Gestión de Conductores', icon: Users },
  { key: 'audio', label: 'Audios y Locuciones', icon: Megaphone },
  { key: 'security', label: 'Seguridad del Sistema', icon: ShieldAlert },
];

const ROUTE_MAP: Record<string, string> = {
  principal: '/travelcab',
  dispatch: '/travelcab/dispatch',
  schedule: '/travelcab/schedule',
  history: '/travelcab/history',
  branches: '/travelcab/branches',
  drivers: '/travelcab/drivers',
  audio: '/travelcab/settings?tab=system',
  security: '/travelcab/security',
};

function getActiveKey(pathname: string): string {
  if (pathname.startsWith('/travelcab/dispatch')) return 'dispatch';
  if (pathname.startsWith('/travelcab/schedule')) return 'schedule';
  if (pathname.startsWith('/travelcab/history')) return 'history';
  if (pathname.startsWith('/travelcab/branches')) return 'branches';
  if (pathname.startsWith('/travelcab/drivers')) return 'drivers';
  if (pathname.startsWith('/travelcab/settings')) return 'audio';
  if (pathname.startsWith('/travelcab/security')) return 'security';
  return 'principal';
}

export default function TravelCabLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeKey = getActiveKey(pathname);

  const handleSelectKey = (key: string) => {
    const target = ROUTE_MAP[key];
    if (target) router.push(target);
  };

  return (
    <MinimalModuleShell
      moduleTitle="TravelCab"
      navItems={NAV_ITEMS}
      activeKey={activeKey}
      onSelectKey={handleSelectKey}
    >
      <div className="travelcab-minimal-scope">
        {children}
      </div>
    </MinimalModuleShell>
  );
}
