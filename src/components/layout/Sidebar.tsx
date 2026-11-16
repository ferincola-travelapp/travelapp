"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle, Tag, Activity, Cloud, Database, ShieldCheck, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState, useEffect } from 'react';
import { getSidebarConfig } from '@/lib/navigation';

export const Sidebar = () => {
  const pathname = usePathname();
  const config = getSidebarConfig(pathname);
  const { user } = useAuth();
  
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.role) return;
    const unsub = onSnapshot(doc(db, 'role_permissions', user.role), (docSnap) => {
      if (docSnap.exists()) {
        setPermissions(docSnap.data().permissions || {});
      } else {
        // Fallback defaults
        if (user.role === 'admin') {
          setPermissions({});
        } else if (user.role === 'operator') {
          setPermissions({
            'metrics': true, 'branches': false, 'users': false, 'messages': true,
            'leads': true, 'agenda': true, 'history': true, 'customers': true, 'travis': true,
            'dashboard': true, 'dispatch': true, 'drivers': true, 'fleet': true,
            'travelcab-create-service': true, 'travelcab-create-category': true, 'settings': false, 'security': false,
            'catalog': true, 'hotel-reception': true, 'providers': true, 'my-trip-mgmt': true, 'create-customer': true, 'create-reservation': true, 'create-group-trip': true,
            'quoter': true, 'reservations': true,
            'spots': true, 'coordinators': true, 'coordinator-app': true, 'analytics': true,
            'rewards-create-merchant': true, 'rewards-create-rubro': false, 'rewards-create-category': false, 'validator': true,
            'merchants': true, 'partners': true, 'new-partner': true, 'applications': true,
            'staff': false, 'org-chart': true, 'cms': false, 'audit': false
          });
        } else {
          setPermissions({
            'metrics': true, 'branches': true, 'users': false, 'messages': false,
            'leads': true, 'agenda': false, 'history': true, 'customers': true, 'travis': false,
            'dashboard': true, 'dispatch': false, 'drivers': true, 'fleet': false,
            'travelcab-create-service': false, 'travelcab-create-category': false, 'settings': false, 'security': false,
            'catalog': true, 'my-trip-mgmt': true, 'create-customer': false, 'create-reservation': false, 'create-group-trip': false,
            'spots': true, 'coordinators': true, 'coordinator-app': false, 'analytics': true,
            'rewards-create-merchant': false, 'rewards-create-rubro': false, 'rewards-create-category': false, 'validator': false,
            'merchants': true, 'partners': true, 'new-partner': false, 'applications': false,
            'staff': false, 'org-chart': true, 'cms': false, 'audit': true
          });
        }
      }
    }, (err) => {
      console.error("Error listening to permissions:", err);
    });
    return () => unsub();
  }, [user?.role]);

  const isTravelCabModule = pathname.startsWith('/travelcab');

  const filteredItems = config.items.filter(item => {
    if (!user) return false;
    const val = permissions[item.id];
    if (val !== undefined) return val;
    if (user.role === 'admin' || user.role === 'super_admin') return true;
    return false; // secure by default for non-admins
  });

  return (
    <aside className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col hidden lg:flex min-h-[calc(100vh-4rem)] p-4 justify-between">
      <div className="flex-1 flex flex-col">
        {/* LOGO: Concorde 360 styled in Quicksand */}
        <div className="mb-6 flex items-center justify-center py-2 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl border border-slate-700 shadow-md">
          <span className="text-lg font-black tracking-tight text-white font-quicksand">
            Concorde <span className="text-[#FF7A00]">360</span>
          </span>
        </div>

        <nav className="space-y-1">
          {filteredItems.map((item: any, idx: number) => {
            const Icon = item.icon;
            const isReallyActive = pathname === item.href;
            const prevSection = idx > 0 ? (filteredItems[idx - 1] as any).section : null;
            const showSectionHeader = item.section && item.section !== prevSection;

            return (
              <React.Fragment key={item.id}>
                {showSectionHeader && (
                  <p className={`text-[10px] font-black tracking-wider text-slate-400 uppercase px-3 ${idx > 0 ? 'pt-3 pb-1 border-t border-slate-200/70 mt-2' : 'pb-1'}`}>
                    {item.section}
                  </p>
                )}
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors ${
                    isReallyActive
                      ? 'bg-tech-blue/10 text-tech-blue font-bold'
                      : 'text-slate-500 hover:bg-white hover:text-tech-blue'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold truncate">{item.label}</span>
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {isTravelCabModule && (permissions['travelcab-create-service'] || permissions['travelcab-create-category']) && (
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3">
              Operaciones Rápidas
            </p>
            {permissions['travelcab-create-service'] !== false && (
              <Link
                href="/travelcab/settings?tab=tariffs&action=new"
                className="flex items-center space-x-2.5 rounded-xl border border-dashed border-vial-orange/40 bg-vial-orange/5 hover:bg-vial-orange/10 hover:border-vial-orange px-3.5 py-2.5 transition-all text-vial-orange group shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="text-xs font-black tracking-tight">Crear Servicio</span>
              </Link>
            )}
            {permissions['travelcab-create-category'] !== false && (
              <Link
                href="/travelcab/settings?tab=categories&action=new"
                className="flex items-center space-x-2.5 rounded-xl border border-slate-200 bg-white hover:border-tech-blue/40 px-3.5 py-2.5 transition-all text-slate-600 hover:text-tech-blue group shadow-sm"
              >
                <Tag className="h-4 w-4 text-slate-400 group-hover:text-tech-blue transition-colors" />
                <span className="text-xs font-bold tracking-tight">Crear Categoría</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* MONITOR DE ESTABILIDAD DEL SISTEMA (Firebase & Google Cloud) */}
      <div className="mt-auto pt-4 border-t border-slate-200 space-y-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-tech-blue hover:bg-tech-blue hover:text-white transition-colors shadow-xs"
        >
          <Home className="h-4 w-4 shrink-0" />
          <span>Volver al Home</span>
        </Link>

        <div>
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5 px-3">
          <Activity className="h-3 w-3 text-emerald-500 animate-pulse" /> Estabilidad
        </p>
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-tech-blue/60" />
              <span className="text-[10px] font-bold text-slate-500">Firebase DB</span>
            </div>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-3.5 w-3.5 text-tech-blue/60" />
              <span className="text-[10px] font-bold text-slate-500">Google Cloud</span>
            </div>
            <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-200">12ms</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-tech-blue/60" />
              <span className="text-[10px] font-bold text-slate-500">Travis AI</span>
            </div>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
        </div>
        </div>
      </div>
    </aside>
  );
};
