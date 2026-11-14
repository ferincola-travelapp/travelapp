'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Globe,
  UserCircle2,
  LogOut,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface MinimalNavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MinimalModuleShellProps {
  moduleTitle: string;
  navItems: MinimalNavItem[];
  activeKey: string;
  onSelectKey: (key: string) => void;
  children: React.ReactNode;
}

export function MinimalModuleShell({
  moduleTitle,
  navItems,
  activeKey,
  onSelectKey,
  children,
}: MinimalModuleShellProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<'ES' | 'EN' | 'PT'>('ES');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; senderName: string; text: string }[]>([]);

  const emailLower = (user?.email || '').trim().toLowerCase();
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Operador';

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'operator_messages'), orderBy('createdAt', 'desc'), limit(8));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          senderName: d.data().senderName || 'Operador',
          recipientEmail: (d.data().recipientEmail || 'all').toLowerCase(),
          text: d.data().text || '',
        }))
        .filter((m) => m.recipientEmail === 'all' || m.recipientEmail === emailLower);
      setAlerts(list);
    });
    return () => unsub();
  }, [user, emailLower]);

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  return (
    <div
      className="flex min-h-screen bg-gradient-to-b from-white via-[#F5F7FA] to-[#ECEFF4] text-slate-800"
      style={{ fontFamily: "'Quicksand', sans-serif" }}
    >
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#0a2a5b] z-40" />

      {/* Sidebar Lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white/95 border-r border-slate-200/90 flex flex-col justify-between pt-6 pb-5 px-4 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <img
              src="/assets/travelapp_original.svg"
              alt="TravelApp"
              className="h-9 w-auto object-contain"
            />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-500 hover:text-[#0a2a5b]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {moduleTitle}
            </p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelectKey(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    active
                      ? 'bg-[#0a2a5b] text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-left">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200/80">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-[#0a2a5b] hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Concorde 360</span>
          </Link>
        </div>
      </aside>

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Minimalista: Campana, Idioma, Perfil y Salir */}
        <header className="sticky top-1 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-[#0a2a5b]">
              {navItems.find((n) => n.key === activeKey)?.label || moduleTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Campana de alertas */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAlertsOpen((v) => !v)}
                aria-label="Alertas"
                className="relative p-2 rounded-lg text-slate-600 hover:text-[#0a2a5b] hover:bg-slate-100 transition cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#ff6b00]" />
                )}
              </button>

              {alertsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-50">
                  <p className="text-xs font-bold text-[#0a2a5b] mb-2">Alertas y Mensajes</p>
                  {alerts.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-3 text-center">Sin alertas nuevas.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {alerts.map((a) => (
                        <div key={a.id} className="rounded-lg bg-slate-50 p-2 text-[11px]">
                          <p className="font-bold text-[#0a2a5b]">{a.senderName}</p>
                          <p className="text-slate-600">{a.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selector de idioma */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-white">
              <Globe className="w-3.5 h-3.5 text-[#0a2a5b]" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as 'ES' | 'EN' | 'PT')}
                aria-label="Idioma"
                className="text-xs font-bold text-[#0a2a5b] bg-transparent outline-none cursor-pointer"
              >
                <option value="ES">ES</option>
                <option value="EN">EN</option>
                <option value="PT">PT</option>
              </select>
            </div>

            {/* Perfil */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <UserCircle2 className="w-5 h-5 text-[#0a2a5b]" />
              <div className="leading-tight">
                <p className="text-xs font-bold text-[#0a2a5b] capitalize">{displayName}</p>
                <p className="text-[10px] text-slate-400">{user?.email || ''}</p>
              </div>
            </div>

            {/* Cerrar sesión */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
