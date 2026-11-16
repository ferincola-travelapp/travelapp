"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeadCard } from './LeadCard';
import { LeadDetailSlideOver } from './LeadDetailSlideOver';
import { Lead } from '@/types/crm';
import { Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAccessRecord,
  isSuperAdmin,
  getUserScopeLabel,
  normalizeBusinessUnit,
  BUSINESS_UNITS_CONFIG,
  normalizeText,
} from '@/lib/permissions';

export const LeadsKanban = () => {
  const { user } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'leads'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: Lead[] = [];
      snapshot.forEach((doc) => {
        leadsData.push({ id: doc.id, ...doc.data() } as Lead);
      });
      setAllLeads(leadsData);
    }, (error) => {
      console.error("Error fetching leads:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const closeSlideOver = () => {
    setSelectedLead(null);
  };

  // 1. Primero aplicar aislamiento estricto por permisos de usuario (Marca y Sector)
  const authorizedLeads = allLeads.filter(lead =>
    canAccessRecord(user, lead.businessUnit, lead.sector)
  );

  // Unidades visibles para el usuario en los filtros
  const visibleUnits = isSuperAdmin(user)
    ? BUSINESS_UNITS_CONFIG
    : BUSINESS_UNITS_CONFIG.filter(u =>
        (user?.allowedUnits || []).some(au => normalizeBusinessUnit(au) === u.id)
      );

  // Sectores visibles según unidad seleccionada y permisos del usuario
  const visibleSectors = Array.from(
    new Set(
      visibleUnits
        .filter(u => unitFilter === 'all' || u.id === unitFilter)
        .flatMap(u => u.sectors)
    )
  ).filter(sec => {
    if (isSuperAdmin(user)) return true;
    const allowed = user?.allowedSectors || [];
    if (allowed.length === 0) return true;
    return allowed.some(a => normalizeText(a) === normalizeText(sec));
  });

  // 2. Filtros de UI (Canal, Unidad y Sector) sobre los leads autorizados
  const filteredLeads = authorizedLeads.filter(lead => {
    // Channel filter
    if (channelFilter !== 'all') {
      const src = (lead.origin || '').toLowerCase();
      if (channelFilter === 'whatsapp' && !src.includes('whatsapp')) return false;
      if (channelFilter === 'instagram' && !src.includes('ig') && !src.includes('instagram')) return false;
      if (channelFilter === 'messenger' && !src.includes('messenger')) return false;
      if (channelFilter === 'web' && !src.includes('web')) return false;
    }

    // Business unit filter
    if (unitFilter !== 'all') {
      if (normalizeBusinessUnit(lead.businessUnit) !== unitFilter) return false;
    }

    // Sector filter
    if (sectorFilter !== 'all') {
      if (normalizeText(lead.sector) !== normalizeText(sectorFilter)) return false;
    }

    return true;
  });

  const nuevos = filteredLeads.filter(lead => lead.status === 'Nuevos' || lead.status === 'En Espera Operador');
  const agendados = filteredLeads.filter(lead => lead.status === 'Agendados');
  const negociacion = filteredLeads.filter(lead => lead.status === 'En Negociación');
  const cerrados = filteredLeads.filter(lead => lead.status === 'Ganados/Perdidos');

  return (
    <>
      {/* Indicador de Alcance y Seguridad por Marca / Sector */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Shield className={`h-4 w-4 ${isSuperAdmin(user) ? 'text-purple-600' : 'text-tech-blue'}`} />
          <span className="font-semibold text-slate-700">{getUserScopeLabel(user)}</span>
        </div>
        {!isSuperAdmin(user) && (!user?.allowedUnits || user.allowedUnits.length === 0) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Sin unidades asignadas — solicitá permisos a un Super Admin
          </span>
        )}
      </div>

      {/* Filtros Omnicanal, Unidad de Negocio y Sector */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">Canal:</span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'whatsapp', label: '📱 WhatsApp' },
            { id: 'instagram', label: '📷 Instagram' },
            { id: 'messenger', label: '💬 Messenger' },
            { id: 'web', label: '🌐 Chat Web' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setChannelFilter(c.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                channelFilter === c.id
                  ? 'bg-tech-blue text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {visibleUnits.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">Unidad:</span>
              <button
                onClick={() => { setUnitFilter('all'); setSectorFilter('all'); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  unitFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas
              </button>
              {visibleUnits.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setUnitFilter(u.id); setSectorFilter('all'); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    unitFilter === u.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          )}

          {visibleSectors.length > 0 && (
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:border-tech-blue"
            >
              <option value="all">Todos los Sectores</option>
              {visibleSectors.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-17rem)] space-x-4 overflow-x-auto pb-4">
        {/* Columna: Nuevos */}
        <div className="flex w-80 min-w-80 flex-col rounded-xl bg-slate-50/50 border border-slate-200 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="font-semibold text-slate-700">Nuevos (Travis)</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
              {nuevos.length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto custom-scrollbar">
            {nuevos.map((lead) => (
              <LeadCard key={lead.id} {...lead} onClick={() => handleLeadClick(lead)} />
            ))}
          </div>
        </div>

        {/* Columna: Agendados */}
        <div className="flex w-80 min-w-80 flex-col rounded-xl bg-slate-50/50 border border-slate-200 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="font-semibold text-slate-700">Agendados</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
              {agendados.length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto custom-scrollbar">
            {agendados.map((lead) => (
              <LeadCard key={lead.id} {...lead} onClick={() => handleLeadClick(lead)} />
            ))}
          </div>
        </div>

        {/* Columna: En Negociación */}
        <div className="flex w-80 min-w-80 flex-col rounded-xl bg-slate-50/50 border border-slate-200 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="font-semibold text-slate-700">En Negociación</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
              {negociacion.length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto custom-scrollbar">
            {negociacion.map((lead) => (
              <LeadCard key={lead.id} {...lead} onClick={() => handleLeadClick(lead)} />
            ))}
          </div>
        </div>

        {/* Columna: Ganados/Perdidos */}
        <div className="flex w-80 min-w-80 flex-col rounded-xl bg-slate-50/50 border border-slate-200 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="font-semibold text-slate-700">Ganados / Perdidos</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
              {cerrados.length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto custom-scrollbar">
            {cerrados.map((lead) => (
              <LeadCard key={lead.id} {...lead} onClick={() => handleLeadClick(lead)} />
            ))}
          </div>
        </div>
      </div>

      <LeadDetailSlideOver 
        lead={selectedLead} 
        isOpen={selectedLead !== null} 
        onClose={closeSlideOver} 
      />
    </>
  );
};
