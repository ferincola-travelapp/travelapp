import React from 'react';
import { X, Video, Mail, Phone, CalendarCheck, Bot, RefreshCw } from 'lucide-react';
import { Lead, LeadStatus, Unit } from '@/types/crm';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BUSINESS_UNITS_CONFIG, ALL_SECTORS_BY_UNIT, normalizeBusinessUnit } from '@/lib/permissions';

interface LeadDetailSlideOverProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadDetailSlideOver: React.FC<LeadDetailSlideOverProps> = ({ lead, isOpen, onClose }) => {
  const [isUpdating, setIsUpdating] = React.useState(false);

  if (!isOpen || !lead) return null;

  const handleStatusChange = async (newStatus: LeadStatus) => {
    setIsUpdating(true);
    try {
      const leadRef = doc(db, 'leads', lead.id);
      await updateDoc(leadRef, { status: newStatus });
      // El onSnapshot de Kanban se encargará de actualizar la vista y mover la tarjeta.
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("Hubo un error al actualizar el estado.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnitSectorChange = async (newUnit: string, newSector: string) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'leads', lead.id), {
        businessUnit: newUnit as Unit,
        sector: newSector || null,
      });
    } catch (error) {
      console.error("Error al actualizar unidad/sector:", error);
      alert("Hubo un error al actualizar la unidad o sector.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Source Badge Styles
  const sourceStyles: Record<string, string> = {
    WhatsApp: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    Web: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    IG: 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-700 border-pink-500/20',
    Messenger: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  };

  // Unit Badge Styles
  const unitStyles: Record<string, string> = {
    'TravelCab (Usuario)': 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    'TravelCab (Conductor)': 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    'TravelApp Experience': 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    'TravelApp Rewards': 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    'TravelApp Afiliados': 'bg-teal-500/10 text-teal-700 border-teal-500/20',
    'TravelApp': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    'TravelCab': 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    'Experiencias': 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    'Rewards': 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  };

  const currentUnitStyle = unitStyles[lead.businessUnit] || 'bg-slate-100 text-slate-700 border-slate-200';
  const currentSourceStyle = sourceStyles[lead.origin] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-slate-200 bg-slate-50 shadow-2xl transition-transform transform translate-x-0">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-bold text-tech-blue">{lead.customerName}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${currentSourceStyle}`}>
                {lead.origin}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${currentUnitStyle}`}>
                {lead.businessUnit}
              </span>
              {lead.sector && (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {lead.sector}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-tech-blue transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* Status Selector */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-500">Etapa del Embudo</h3>
                {isUpdating && <RefreshCw className="h-4 w-4 animate-spin text-tech-blue" />}
              </div>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                disabled={isUpdating}
              className="mt-3 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-tech-blue focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="Nuevos">Nuevos (Travis)</option>
              <option value="Agendados">Agendados</option>
              <option value="En Negociación">En Negociación</option>
              <option value="Ganados/Perdidos">Ganados / Perdidos</option>
            </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Unidad de Negocio</label>
                <select
                  value={normalizeBusinessUnit(lead.businessUnit)}
                  onChange={(e) => handleUnitSectorChange(e.target.value, '')}
                  disabled={isUpdating}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-tech-blue"
                >
                  {BUSINESS_UNITS_CONFIG.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sector / Área</label>
                <select
                  value={lead.sector || ''}
                  onChange={(e) => handleUnitSectorChange(normalizeBusinessUnit(lead.businessUnit), e.target.value)}
                  disabled={isUpdating}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-tech-blue"
                >
                  <option value="">Sin sector</option>
                  {(ALL_SECTORS_BY_UNIT[normalizeBusinessUnit(lead.businessUnit)] || []).map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Lead Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Información de Contacto</h3>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-tech-blue">
                <Mail className="mr-3 h-4 w-4 text-slate-500" />
                contacto@ejemplo.com
              </div>
              <div className="flex items-center text-sm text-tech-blue">
                <Phone className="mr-3 h-4 w-4 text-slate-500" />
                +54 9 11 1234-5678
              </div>
            </div>
          </div>

          {/* Inbox / Chat Simulation */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center">
              <Bot className="mr-2 h-4 w-4" /> Chat con Travis (Bot)
            </h3>
            
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              {lead.chatHistory && lead.chatHistory.length > 0 ? (
                lead.chatHistory.map((msg, idx) => {
                  if (msg.sender === 'Travis') {
                    return (
                      <div key={idx} className="flex items-start space-x-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tech-blue/20">
                          <Bot className="h-4 w-4 text-tech-blue" />
                        </div>
                        <div className="rounded-2xl rounded-tl-none bg-tech-blue/10 border border-blue-500/20 p-3 text-sm text-slate-800">
                          {msg.message}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={idx} className="flex items-start space-x-3 justify-end">
                        <div className="rounded-2xl rounded-tr-none bg-slate-100 border border-slate-300 p-3 text-sm text-slate-800">
                          {msg.message}
                        </div>
                      </div>
                    );
                  }
                })
              ) : (
                <div className="text-center text-sm text-slate-500 py-4">No hay mensajes en el historial.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 p-6 bg-slate-50">
          {lead.meetingLink && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-tech-blue/10 border border-blue-500/20 p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tech-blue/20">
                  <Video className="h-5 w-5 text-tech-blue" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-tech-blue">Cita Programada</h4>
                  <p className="text-xs text-blue-400">
                    {lead.meetingDate ? new Date(lead.meetingDate).toLocaleString('es-AR') : 'Fecha pendiente'}
                  </p>
                </div>
              </div>
              <a 
                href={lead.meetingLink} 
                target="_blank" 
                rel="noreferrer"
                className="rounded-md bg-tech-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all"
              >
                Unirse a Meet
              </a>
            </div>
          )}

          {!lead.meetingLink && (
            <button className="flex w-full items-center justify-center space-x-2 rounded-xl bg-tech-blue px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]">
              <Video className="h-5 w-5" />
              <span>Agendar Videollamada (Meet)</span>
            </button>
          )}
          
          <button className="mt-3 flex w-full items-center justify-center space-x-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-tech-blue hover:bg-slate-200 transition-colors">
            <CalendarCheck className="h-5 w-5 text-slate-500" />
            <span>Ver Disponibilidad</span>
          </button>
        </div>

      </div>
    </>
  );
};
