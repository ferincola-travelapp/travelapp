'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Network, Users } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function OrgChartTab() {
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'staff_users'), (snap) => {
      const list: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStaff(list.filter((s) => s.active !== false));
    });
    return () => unsub();
  }, []);

  const byDepartment = useMemo(() => {
    const groups: Record<string, any[]> = {};
    staff.forEach((s) => {
      const dept = s.department || 'Operaciones';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(s);
    });
    return Object.entries(groups);
  }, [staff]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-[#0a2a5b]" />
          <div>
            <h2 className="text-lg font-bold text-[#0a2a5b]">Organigrama Empresarial</h2>
            <p className="text-xs text-slate-500">Estructura organizacional generada en vivo desde el Staff activo.</p>
          </div>
        </div>
      </div>

      {/* Nodo Raíz */}
      <div className="flex justify-center">
        <div className="rounded-xl border-2 border-[#0a2a5b] bg-white px-6 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0a2a5b]">TravelApp s.a.s.</p>
          <p className="text-[11px] text-slate-500">Dirección General · Concorde 360</p>
        </div>
      </div>

      {byDepartment.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
          Carga integrantes en Gestión de Staff para visualizar el organigrama.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {byDepartment.map(([dept, members]) => (
            <div key={dept} className="rounded-xl border border-slate-200/90 bg-white/80 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-[#0a2a5b]">{dept}</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                  <Users className="w-3.5 h-3.5" /> {members.length}
                </span>
              </div>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="rounded-lg bg-slate-50/80 border border-slate-200/60 px-3 py-2">
                    <p className="text-xs font-bold text-slate-800">{m.name}</p>
                    <p className="text-[11px] text-slate-500">{m.position || m.role || 'Integrante'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
