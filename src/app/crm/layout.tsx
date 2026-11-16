'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  KanbanSquare,
  Calendar,
  Users,
  History,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { MinimalModuleShell, MinimalNavItem } from '@/components/layout/MinimalModuleShell';

const CRM_NAV_ITEMS: MinimalNavItem[] = [
  { key: 'leads', label: 'Tablero de Leads', icon: KanbanSquare },
  { key: 'agenda', label: 'Agenda (Citas / Meet)', icon: Calendar },
  { key: 'customers', label: 'Lista de Clientes', icon: Users },
  { key: 'history', label: 'Historial de Ventas', icon: History },
  { key: 'travis', label: 'Travis IA ✦', icon: Bot },
  { key: 'messages', label: 'Centro de Mensajería', icon: MessageSquare },
];

const KEY_TO_ROUTE: Record<string, string> = {
  leads: '/crm',
  agenda: '/crm/agenda',
  customers: '/crm/customers',
  history: '/crm/history',
  travis: '/crm/travis',
  messages: '/messages',
};

function getActiveKeyFromPath(pathname: string): string {
  if (pathname.startsWith('/crm/agenda')) return 'agenda';
  if (pathname.startsWith('/crm/customers')) return 'customers';
  if (pathname.startsWith('/crm/history')) return 'history';
  if (pathname.startsWith('/crm/travis')) return 'travis';
  return 'leads';
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeKey = getActiveKeyFromPath(pathname);

  const handleSelectKey = (key: string) => {
    const target = KEY_TO_ROUTE[key];
    if (target) {
      router.push(target);
    }
  };

  return (
    <MinimalModuleShell
      moduleTitle="CRM & Ventas"
      navItems={CRM_NAV_ITEMS}
      activeKey={activeKey}
      onSelectKey={handleSelectKey}
    >
      {children}
    </MinimalModuleShell>
  );
}
