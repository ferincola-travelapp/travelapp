import React from 'react';
import { MessageCircle, Video, User, Camera, MessageSquare, Globe } from 'lucide-react';
import { Source, Unit } from '@/types/crm';

interface LeadCardProps {
  customerName: string;
  origin: Source;
  businessUnit: Unit;
  sector?: string;
  onClick?: () => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ customerName, origin, businessUnit, sector, onClick }) => {
  const normOrigin = (origin || 'Web').toLowerCase();
  const normUnit = businessUnit || 'TravelApp';

  // Source Badge Styles (Omnichannel)
  const getSourceBadge = () => {
    if (normOrigin.includes('whatsapp')) {
      return {
        style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        label: 'WhatsApp',
        icon: <MessageCircle className="h-3.5 w-3.5 text-emerald-500 mr-1" />
      };
    }
    if (normOrigin.includes('ig') || normOrigin.includes('instagram')) {
      return {
        style: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
        label: 'Instagram',
        icon: <Camera className="h-3.5 w-3.5 text-pink-500 mr-1" />
      };
    }
    if (normOrigin.includes('messenger')) {
      return {
        style: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        label: 'Messenger',
        icon: <MessageSquare className="h-3.5 w-3.5 text-blue-500 mr-1" />
      };
    }
    return {
      style: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
      label: 'Chat Web',
      icon: <Globe className="h-3.5 w-3.5 text-sky-500 mr-1" />
    };
  };

  // Unit Badge Styles (6 Business Units)
  const getUnitBadge = () => {
    const u = String(normUnit);
    if (u.includes('Conductor')) {
      return {
        style: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
        label: '🚕 Chofer TravelCab'
      };
    }
    if (u.includes('TravelCab') || u.includes('Usuario')) {
      return {
        style: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
        label: '🚕 Pasajero TravelCab'
      };
    }
    if (u.includes('Experience') || u.includes('Experiencias')) {
      return {
        style: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
        label: '🗺️ Experience'
      };
    }
    if (u.includes('Rewards')) {
      return {
        style: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
        label: '🎁 Rewards'
      };
    }
    if (u.includes('Afiliados')) {
      return {
        style: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
        label: '🤝 Afiliados'
      };
    }
    return {
      style: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
      label: '🌐 TravelApp'
    };
  };

  const srcBadge = getSourceBadge();
  const unitBadge = getUnitBadge();

  return (
    <div 
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <User className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-tech-blue">{customerName}</h4>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${srcBadge.style}`}>
                {srcBadge.icon}
                {srcBadge.label}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${unitBadge.style}`}>
                {unitBadge.label}
              </span>
              {sector && (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {sector}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center space-x-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-tech-blue transition-colors">
          <MessageCircle className="h-4 w-4" />
          <span>Ver Chat</span>
        </button>
        <button className="flex items-center justify-center space-x-2 rounded-md bg-tech-blue/10 px-3 py-1.5 text-sm font-medium text-tech-blue hover:bg-tech-blue/20 transition-colors">
          <Video className="h-4 w-4" />
          <span>Unirse a Meet</span>
        </button>
      </div>
    </div>
  );
};

