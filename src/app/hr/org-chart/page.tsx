'use client';

import React, { useState, useEffect } from 'react';
import { Route, Users, RefreshCw, Compass, ShieldAlert, Sparkles, Building2, HelpCircle } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface StaffMember {
  id: string;
  name: string;
  dni: string;
  cuit: string;
  fechaIngreso: string;
  cargo: string;
  sucursalId: string;
  sucursalName: string;
  photoBase64: string;
  reportsToId: string;
  reportsToName: string;
  status: 'Activo' | 'Licencia' | 'Baja';
}

function OrgNode({ member, members }: { member: StaffMember; members: StaffMember[] }) {
  const children = members.filter(m => m.reportsToId === member.id);
  
  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className="bg-white border-2 border-tech-blue/20 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center w-52 hover:scale-105 hover:shadow-md transition-all relative">
        <img
          src={member.photoBase64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
          alt={member.name}
          className="w-12 h-12 rounded-full border border-slate-200 object-cover mb-2"
        />
        <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{member.name}</h4>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 line-clamp-1">{member.cargo}</p>
        <span className="inline-block mt-2 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[8px] font-bold text-slate-500">
          {member.sucursalName}
        </span>
      </div>

      {/* Children branches */}
      {children.length > 0 && (
        <div className="flex flex-col items-center w-full mt-4">
          {/* Vertical line down from parent */}
          <div className="w-0.5 h-6 bg-slate-300"></div>

          {/* Horizontal Connector Line for siblings */}
          <div className="flex justify-center relative w-full">
            {children.map((child, idx) => {
              return (
                <div key={child.id} className="flex flex-col items-center relative px-4">
                  {/* Sibling connectors */}
                  {children.length > 1 && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-300" style={{
                      left: idx === 0 ? '50%' : '0%',
                      right: idx === children.length - 1 ? '50%' : '0%'
                    }}></div>
                  )}
                  {/* Vertical line down to child */}
                  <div className="w-0.5 h-4 bg-slate-300"></div>
                  
                  <OrgNode member={child} members={members} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HROrgChartPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sincronización en vivo con Firestore
    const unsub = onSnapshot(collection(db, 'hr_staff'), (snapshot) => {
      const list: StaffMember[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          dni: data.dni || '',
          cuit: data.cuit || '',
          fechaIngreso: data.fechaIngreso || '',
          cargo: data.cargo || '',
          sucursalId: data.sucursalId || '1',
          sucursalName: data.sucursalName || (data.sucursalId === '2' ? 'Sucursal Pilar' : data.sucursalId === '3' ? 'Sucursal Tucumán' : 'Sucursal Retiro'),
          photoBase64: data.photoBase64 || '',
          reportsToId: data.reportsToId || '',
          reportsToName: data.reportsToName || '',
          status: data.status || 'Activo'
        };
      });
      setStaff(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading staff:", error);
      setStaff([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Find root members (e.g. they don't report to anyone or their manager isn't in the staff list)
  const rootMembers = staff.filter(m => {
    if (!m.reportsToId) return true;
    return !staff.some(s => s.id === m.reportsToId);
  });

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-tech-blue flex items-center gap-2">
            <Route className="h-7 w-7 text-green-500" />
            Organigrama Empresarial
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Estructura jerárquica corporativa autocompletada dinámicamente desde el alta de personal.</p>
        </div>
      </div>

      {/* Info panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-800 font-medium max-w-xl">
        <HelpCircle className="h-5 w-5 text-blue-600 shrink-0" />
        <p>
          <strong>¿Cómo se arma el árbol?</strong> Al registrar o editar un empleado en *Gestión de Personal*, indica a quién responde en el campo <strong>"Reporta a (Jerarquía)"</strong> para posicionarlo automáticamente en este organigrama.
        </p>
      </div>

      {/* Visual Org Chart Area */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Generando árbol jerárquico...</div>
      ) : staff.length > 0 ? (
        <div className="flex-1 overflow-auto border border-slate-200 bg-white rounded-2xl p-8 flex justify-center items-start shadow-inner min-h-[450px]">
          <div className="flex gap-16 justify-center">
            {rootMembers.map(root => (
              <OrgNode key={root.id} member={root} members={staff} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-inner">
          <Users className="h-10 w-10 text-slate-350 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Sin empleados registrados</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto">
            Ingresa a "Gestión de Personal" y registra al menos un empleado para visualizar la estructura.
          </p>
        </div>
      )}

    </div>
  );
}
