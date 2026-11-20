'use client';

import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, Save, Image, Link as LinkIcon, Shield, Sparkles, 
  Trash2, Plus, ArrowRight, Eye, CheckCircle2, AlertCircle, RefreshCw,
  Upload, X, HelpCircle, Users, Compass, Bot, Mountain, Phone, Bus,
  ArrowLeft, Bell, Globe, LogOut, Menu, ExternalLink, ArrowUp, ArrowDown,
  Briefcase
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_OTA_FLOATING_PROMOS } from '@/components/ota/OtaFloatingPromos';

// Helper function to compress images using Canvas as fallback if Storage fails
const compressImage = (file: File, maxWidth = 1200, maxHeight = 900, quality = 0.78): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Upload media to Firebase Storage first (evita saturar el límite de 1MB de Firestore); fallback a Base64 comprimido solo para imágenes si Storage falla
const uploadMediaFile = async (file: File, folder = 'cms_media'): Promise<string> => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (file.type.startsWith('image/')) {
    try {
      const fileRef = storageRef(storage, `${folder}/${Date.now()}_${safeName}`);
      await uploadBytes(fileRef, file);
      return await getDownloadURL(fileRef);
    } catch (err) {
      console.warn("Firebase Storage no disponible para imagen, usando compresión fallback:", err);
      return await compressImage(file, 1400, 900, 0.76);
    }
  }
  const fileRef = storageRef(storage, `${folder}/${Date.now()}_${safeName}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};

// Deep merge seguro para combinar defaults del CMS con documentos ya guardados en Firestore
const isPlainObject = (val: unknown): val is Record<string, any> =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

const deepMergeCms = (defaults: any, loaded: any): any => {
  if (!isPlainObject(defaults)) return loaded !== undefined ? loaded : defaults;
  if (!isPlainObject(loaded)) return loaded !== undefined ? loaded : defaults;
  const result: Record<string, any> = { ...defaults };
  for (const key of Object.keys(loaded)) {
    const loadedVal = loaded[key];
    const defaultVal = defaults[key];
    if (loadedVal === undefined) continue;
    if (isPlainObject(defaultVal) && isPlainObject(loadedVal)) {
      result[key] = deepMergeCms(defaultVal, loadedVal);
    } else {
      result[key] = loadedVal;
    }
  }
  return result;
};

interface CMSActionsContextValue {
  updateField: (section: string, field: string, value: any) => void;
  updateService: (idx: number, field: string, value: any) => void;
  updateFaq: (idx: number, field: string, value: any) => void;
  updateHeroSlide: (idx: number, field: string, value: any) => void;
  updateCarouselOffer: (idx: number, field: string, value: any) => void;
  updateAppCard: (blockKey: 'block1' | 'block2', idx: number, field: string, value: any) => void;
}

const CMSActionsContext = createContext<CMSActionsContextValue | null>(null);

// Text input con sincronización inmediata (evita pérdida de cambios al guardar y mantiene cursor estable)
const CMSInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) => {
  const [localVal, setLocalVal] = useState(value ?? '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(value ?? '');
    }
  }, [value, isFocused]);

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>}
      <input
        type={type}
        value={localVal}
        onChange={(e) => {
          const next = e.target.value;
          setLocalVal(next);
          onChange(next);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onChange(localVal);
        }}
        placeholder={placeholder}
        className={className || "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#0a2a5b]"}
      />
    </div>
  );
};

// Textarea con sincronización inmediata
const CMSTextarea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) => {
  const [localVal, setLocalVal] = useState(value ?? '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(value ?? '');
    }
  }, [value, isFocused]);

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>}
      <textarea
        rows={rows}
        value={localVal}
        onChange={(e) => {
          const next = e.target.value;
          setLocalVal(next);
          onChange(next);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onChange(localVal);
        }}
        placeholder={placeholder}
        className={className || "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#0a2a5b]"}
      />
    </div>
  );
};

// Uploader genérico a nivel de módulo (soporta imagen y video opcional, sube a Firebase Storage primero)
const MediaFieldUploader = ({
  label,
  value,
  onChange,
  accept = "image/*",
  folder = "cms_media",
  placeholder = "Pegá la URL o subí un archivo...",
  allowVideo = false,
  compact = false,
}: {
  label?: string;
  value: string;
  onChange: (url: string, detectedType?: 'image' | 'video') => void;
  accept?: string;
  folder?: string;
  placeholder?: string;
  allowVideo?: boolean;
  compact?: boolean;
}) => {
  const [uploading, setUploading] = useState(false);
  const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(value || '');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMediaFile(file, folder);
      const detectedType = file.type.startsWith('video/') ? 'video' : 'image';
      onChange(url, detectedType);
    } catch (err) {
      console.error("Error subiendo archivo:", err);
      alert("No se pudo subir el archivo. Intentá nuevamente o pegá una URL pública.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200/70"}>
      {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            const val = e.target.value;
            const detected = /\.(mp4|webm|mov)(\?.*)?$/i.test(val) ? 'video' : 'image';
            onChange(val, detected);
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#0a2a5b]"
        />
        <label className={`flex cursor-pointer items-center justify-center gap-1.5 text-[11px] font-bold text-[#0a2a5b] border border-[#0a2a5b]/30 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-lg transition-all shadow-sm shrink-0 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span>{uploading ? 'Subiendo...' : allowVideo ? 'Subir Foto / Video' : 'Subir Imagen'}</span>
          <input
            type="file"
            accept={allowVideo ? "image/*,video/mp4,video/webm" : accept}
            className="hidden"
            onChange={handleFile}
          />
        </label>
      </div>
      {value && !compact && (
        <div className="relative w-32 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 group">
          {isVideo ? (
            <video src={value} className="w-full h-full object-cover" muted />
          ) : (
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange('', 'image')}
            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Quitar archivo"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
};

// Componentes auxiliares elevados a nivel de módulo (evita pérdida de foco al escribir en cualquier sitio del CMS)
const SlideImageUploader = ({ idx, value }: { idx: number; value: string }) => {
  const actions = useContext(CMSActionsContext);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => actions?.updateHeroSlide(idx, 'bgImage', e.target.value)}
        placeholder="Ingresa la URL de la foto..."
        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
      />
      <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-tech-blue border border-tech-blue bg-white hover:bg-tech-blue/5 px-3 py-1 rounded-lg transition-all shadow-sm shrink-0">
        {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? 'Subiendo...' : 'Subir'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const url = await uploadMediaFile(file, 'cms_sliders');
              actions?.updateHeroSlide(idx, 'bgImage', url);
            } catch (err) {
              console.error(err);
            } finally {
              setUploading(false);
              e.target.value = '';
            }
          }}
        />
      </label>
    </div>
  );
};

const OfferImageUploader = ({ idx, value }: { idx: number; value: string }) => {
  const actions = useContext(CMSActionsContext);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => actions?.updateCarouselOffer(idx, 'imageUrl', e.target.value)}
        placeholder="Ingresa la URL de la foto..."
        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
      />
      <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-tech-blue border border-tech-blue bg-white hover:bg-tech-blue/5 px-3 py-1 rounded-lg transition-all shadow-sm shrink-0">
        {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? 'Subiendo...' : 'Subir'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const url = await uploadMediaFile(file, 'cms_offers');
              actions?.updateCarouselOffer(idx, 'imageUrl', url);
            } catch (err) {
              console.error(err);
            } finally {
              setUploading(false);
              e.target.value = '';
            }
          }}
        />
      </label>
    </div>
  );
};

const AppCardImageUploader = ({ blockKey, idx, value }: { blockKey: 'block1' | 'block2'; idx: number; value: string }) => {
  const actions = useContext(CMSActionsContext);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => actions?.updateAppCard(blockKey, idx, 'imageUrl', e.target.value)}
        placeholder="Ingresa la URL de la foto..."
        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
      />
      <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-tech-blue border border-tech-blue bg-white hover:bg-tech-blue/5 px-3 py-1 rounded-lg transition-all shadow-sm shrink-0">
        {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? 'Subiendo...' : 'Subir'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const url = await uploadMediaFile(file, 'cms_app_cards');
              actions?.updateAppCard(blockKey, idx, 'imageUrl', url);
            } catch (err) {
              console.error(err);
            } finally {
              setUploading(false);
              e.target.value = '';
            }
          }}
        />
      </label>
    </div>
  );
};

const ImageUploaderInput = ({ label, section, field, value }: { label: string; section: string; field: string; value: string }) => {
  const actions = useContext(CMSActionsContext);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-200/50">
      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">{label}</label>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => actions?.updateField(section, field, e.target.value)}
            placeholder="Ingresa la URL de la foto..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none"
          />
          <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-tech-blue border border-tech-blue bg-white hover:bg-tech-blue/5 px-3 py-2 rounded-lg transition-all shadow-sm shrink-0">
            {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Subiendo...' : 'Subir Archivo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const url = await uploadMediaFile(file, `cms_${section}`);
                  actions?.updateField(section, field, url);
                } catch (err) {
                  console.error("Error subiendo imagen:", err);
                } finally {
                  setUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
        {value && (
          <div className="relative w-24 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 group">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => actions?.updateField(section, field, '')}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ServiceImageUploader = ({ idx, value }: { idx: number; value: string }) => {
  const actions = useContext(CMSActionsContext);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-slate-500">Imagen de la Categoría</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => actions?.updateService(idx, 'imageUrl', e.target.value)}
          placeholder="Pegar URL de la imagen..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] bg-white focus:outline-none"
        />
        <label className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors shrink-0">
          {uploading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? 'Subiendo...' : 'Subir'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const url = await uploadMediaFile(file, 'cms_services');
                actions?.updateService(idx, 'imageUrl', url);
              } catch (err) {
                console.error("Error subiendo imagen de servicio:", err);
              } finally {
                setUploading(false);
                e.target.value = '';
              }
            }}
          />
        </label>
      </div>
    </div>
  );
};

const ServiceInput = ({ label, value, idx, field, placeholder, className }: { label: string; value: string; idx: number; field: string; placeholder?: string; className?: string }) => {
  const actions = useContext(CMSActionsContext);
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => actions?.updateService(idx, field, e.target.value)}
        className={className || "w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"}
      />
    </div>
  );
};

const FaqInput = ({ label, value, idx, field }: { label: string; value: string; idx: number; field: string }) => {
  const actions = useContext(CMSActionsContext);
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => actions?.updateFaq(idx, field, e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
      />
    </div>
  );
};

const FaqTextarea = ({ label, value, idx, field }: { label: string; value: string; idx: number; field: string }) => {
  const actions = useContext(CMSActionsContext);
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label>
      <textarea
        rows={3}
        value={value || ''}
        onChange={(e) => actions?.updateFaq(idx, field, e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
      />
    </div>
  );
};

const DEFAULT_CMS_DATA = {
  pasajeroHero: {
    badge: "✓ EL ESTÁNDAR MÁS ALTO EN MOVILIDAD URBANA",
    title: "La Ciudad a tu Ritmo",
    subtitle: "Viajes urbanos premium con el soporte local más confiable. Disfruta de seguridad monitoreada 24/7, choferes profesionales certificados y la tarifa más justa del mercado.",
    backgroundImage: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1920&q=80",
    opacity: 55
  },
  conductorHero: {
    badge: "✓ ÚNETE A LA RED DE MOVILIDAD MÁS GRANDE DE TUCUMÁN",
    title: "Conduce y Gana Bajo tus Propios Términos",
    subtitle: "Sé tu propio jefe y maximiza tus ingresos reales con el modelo híbrido único. Retén el 100% de tus viajes con una membresía fija o paga una baja comisión por viaje.",
    backgroundImage: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80",
    ctaText: "Registrarme como Conductor",
    opacity: 55
  },
  servicios: [
    {
      id: "standard",
      name: "TravelCab Standard",
      description: "Sedán moderno, climatizado, ideal para tus traslados diarios de forma rápida.",
      subTag: "Servicio Urbano",
      ctaText: "Cotizar Standard",
      eta: "3 - 5 min",
      imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "premium",
      name: "TravelCab Premium",
      description: "Auto de gama alta, máximo confort, chofer corporativo bilingüe y espacio extra.",
      subTag: "Servicio Corporativo",
      ctaText: "Cotizar Premium",
      eta: "2 - 4 min",
      imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80"
    }
  ],
  tiposTrabajo: {
    title: "Elige tu Esquema de Trabajo",
    subtitle: "Un modelo adaptado a cada ritmo de vida, garantizando transparencia total.",
    comisionTitulo: "Esquema por Comisión",
    comisionTexto: "Paga únicamente un 15% de comisión por viaje realizado. Ideal para conductores eventuales que buscan ingresos complementarios.",
    membresiaTitulo: "Membresía Fija",
    membresiaTexto: "Retén el 100% del valor de tus viajes pagando una suscripción mensual plana. Excelente para choferes de dedicación completa."
  },
  resumenRewards: {
    title: "Tus Viajes Tienen Premio",
    subtitle: "Acumula puntos automáticamente en cada trayecto que realizas. Canjéalos por viajes gratis, prioridades y beneficios en todo el ecosistema de TravelApp.",
    pointsText: "Sumá Puntos en Cada Viaje",
    badgeText: "PROGRAMA REWARDS",
    imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80"
  },
  serviceModalities: [
    {
      id: "MU",
      modality: "MU",
      tag: "Ciudad 24/7",
      title: "Movilidad Urbana",
      subtitle: "Viajes inmediatos puerta a puerta en la ciudad con tarifa estimada antes de subir y monitoreo satelital.",
      ctaText: "Cotizar Urbano",
      imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=80",
      criteriaTitle: "Criterios de Selección · Movilidad Urbana",
      criteriaText: "• Cobertura: Radio urbano y área metropolitana habilitada.\n• Pasajeros: Hasta 4 pasajeros con equipaje de mano estándar.\n• Vehículos habilitados: Sedán o Hatchback 4/5 puertas 2018+, A/C y seguro comercial.\n• Tarifación: Cálculo automático por distancia y tiempo estimado."
    },
    {
      id: "ARC",
      modality: "ARC",
      tag: "Ahorrá en Ruta",
      title: "Compartido",
      subtitle: "Reservá por asiento en rutas frecuentes y dividí costos viajando con pasajeros verificados.",
      ctaText: "Ver Compartido",
      imageUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
      criteriaTitle: "Criterios de Selección · Viaje Compartido",
      criteriaText: "• Modalidad: Reserva por asiento (1 a 4 lugares disponibles).\n• Equipaje: 1 bolso o mochila de cabina por pasajero.\n• Puntualidad: Tolerancia máxima de espera de 3 minutos en punto de encuentro.\n• Verificación: Pasajeros y conductores validados en el ecosistema TravelApp."
    },
    {
      id: "TRANSFER",
      modality: "TRANSFER",
      tag: "Aeropuerto & Mundo",
      title: "Traslados",
      subtitle: "Transfers privados a aeropuertos, terminales y destinos turísticos con tarifa fija programada.",
      ctaText: "Programar Traslado",
      imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80",
      criteriaTitle: "Criterios de Selección · Traslados & Transfers",
      criteriaText: "• Alcance: Aeropuertos, terminales, hoteles y traslados turísticos (próximamente red global Civitatis).\n• Equipaje: Capacidad para valijas grandes según categoría seleccionada.\n• Reserva: Programación anticipada con tarifa cerrada y seguimiento de vuelo.\n• Conductores: Unidades ejecutivas / Plus / Premium con habilitación turística o comercial."
    }
  ],
  driverSplitPayments: {
    badge: "COBRANZAS Y LIQUIDACIONES",
    title: "Cómo funciona el Split de Pagos",
    subtitle: "Elegí cobrar tus viajes digitales de forma automática vinculando tu cuenta de Mercado Pago o mediante transferencia a tu CBU / CVU.",
    mpTitle: "Split Automático con Mercado Pago",
    mpDescription: "Al enlazar tu cuenta de Mercado Pago desde tu perfil de conductor, cada viaje abonado con tarjeta o dinero en cuenta se divide automáticamente en el momento: recibís tu parte al instante y se descuenta solo la comisión correspondiente (o 0% si estás en Membresía Fija).",
    cbuTitle: "Cobros por Otro CBU / CVU",
    cbuDescription: "Si preferís operar con otro banco o billetera virtual, podés cargar tu CBU o CVU alternativo para recibir las liquidaciones acumuladas de tus viajes digitales según el cronograma semanal.",
    bindxNote: "Actualización programada: Una vez finalizados los trámites e integración con bindX, todo el esquema de split y acreditaciones se unificará automáticamente bajo la nueva infraestructura bancaria."
  },
  driverRequirements: {
    badge: "REQUISITOS DE ACEPTACIÓN",
    title: "Requisitos para Conductores y Vehículos",
    subtitle: "Conocé los criterios obligatorios para postularte y mantener tu cuenta activa en TravelCab.",
    driverReqs: "• Licencia de conducir profesional vigente (Clase D1 o equivalente local).\n• DNI argentino vigente y CUIL/CUIT activo.\n• Certificado de antecedentes penales actualizado.\n• Teléfono smartphone con GPS y datos móviles.\n• Cuenta de Mercado Pago o CBU/CVU para liquidaciones.",
    vehicleReqs: "• Modelo 2018 o superior en excelente estado estético y mecánico.\n• 4 o 5 puertas, aire acondicionado y calefacción funcionando.\n• Seguro automotor vigente con cobertura para transporte de pasajeros / comercial.\n• VTV / RTO técnica al día y cédula verde/azul habilitante."
  },
  promoPushPop: {
    enabled: false,
    badge: "NOVEDAD TRAVELCAB",
    title: "Traslados Programados y Aeropuerto con Tarifa Fija",
    subtitle: "Cotizá en segundos tu traslado en la ciudad o al aeropuerto y sumá puntos TravelApp Rewards.",
    showDiscountCode: false,
    discountCode: "",
    discountBadge: "",
    imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=80",
    ctaText: "Cotizar Ahora",
    ctaUrl: "#web-dispatcher-card",
    delaySeconds: 4
  },
  contact: {
    phone: "0810-220-0018",
    whatsapp: "https://wa.me/5493812000712"
  },
  footer: {
    copyright: "© 2026 TravelCab. Todos los derechos reservados. Una marca de TravelApp s.a.s."
  },
  redesSociales: {
    facebook: "https://facebook.com/travelcab",
    instagram: "https://instagram.com/travelcab.ar",
    messenger: "https://m.me/travelcab",
    whatsapp: "https://wa.me/5493812000712",
    youtube: "",
    tiktok: ""
  },
  sellosLegales: {
    arcaQr: "",
    baseDatosSello: "",
    arcaQrUrl: "https://www.afip.gob.ar/images/f960/DATAWEB.jpg",
    baseDatosSelloUrl: "https://www.argentina.gob.ar/sites/default/files/aaip-logo-sello.png"
  },
  faq: {
    title: "Preguntas Frecuentes",
    subtitle: "Todo lo que necesitas saber sobre el servicio de movilidad premium",
    items: [
      {
        question: "¿Cómo funciona el Despachador Web Inteligente?",
        answer: "El despachador te permite ingresar origen y destino, calcular una tarifa estimada instantáneamente y elegir tu categoría. Al confirmar, te redirigirá a WhatsApp con un mensaje pre-configurado para que nuestra central asigne el chofer más cercano en segundos."
      },
      {
        question: "¿Qué es el 'Modelo Híbrido' para conductores (Membresía vs. Comisión)?",
        answer: "Es un esquema flexible único. Como conductor, puedes optar por pagar una membresía mensual fija (retienes el 100% del valor de tus viajes) o bien operar bajo el esquema tradicional de comisión baja (15%) por cada traslado realizado."
      },
      {
        question: "¿Qué métodos de pago puedo utilizar?",
        answer: "Ofrecemos flexibilidad total. Puedes abonar en efectivo directo al chofer, realizar transferencias instantáneas mediante Mercado Pago o billeteras virtuales, o registrar de forma segura tarjetas de débito/crédito corporativas."
      },
      {
        question: "¿Cómo se garantiza la seguridad de mi viaje?",
        answer: "Todos nuestros traslados son monitoreados satelitalmente las 24 horas. Además, nuestros choferes pasan por rigurosas pruebas de antecedentes penales, análisis psicofísicos y validación de vehículos de forma presencial."
      },
      {
        question: "¿Qué requisitos debe cumplir un vehículo para ser aceptado?",
        answer: "El vehículo debe ser modelo 2018 o posterior, contar con 4 puertas, aire acondicionado en óptimas condiciones, seguro comercial al día y pasar una revisión técnica e higiénica presencial en nuestras oficinas locales."
      },
      {
        question: "¿Ofrecen soluciones de movilidad corporativa para empresas?",
        answer: "Sí, contamos con un área dedicada para cuentas corporativas. Ofrecemos facturación mensual unificada, paneles de control para administrar traslados del personal y tarifas corporativas especiales."
      },
      {
        question: "¿Cómo funciona el sistema de Puntos Rewards?",
        answer: "Cada kilómetro recorrido en TravelCab acumula puntos automáticamente en tu perfil del ecosistema. Estos puntos pueden ser canjeados por descuentos en tus próximos viajes o beneficios exclusivos con partners."
      },
      {
        question: "¿Qué es el servicio de Auto Rural Compartido (ARC)?",
        answer: "ARC es una alternativa económica diseñada para viajes interurbanos o rurales. Permite a varios pasajeros compartir un mismo trayecto planificado, reduciendo el costo del viaje hasta en un 35% por persona."
      },
      {
        question: "¿Quién es la IA 'Travis' y cómo me ayuda?",
        answer: "Travis es nuestro asistente virtual inteligente disponible las 24 horas en WhatsApp. Está capacitado para cotizar tarifas, responder dudas sobre los servicios y guiar de forma rápida a los conductores en su proceso de registro."
      },
      {
        question: "¿Los conductores reciben capacitación antes de empezar?",
        answer: "Absolutamente. Todos los choferes de la red completan de manera obligatoria una inducción integral en servicio de atención premium al cliente, normas de seguridad vial, conducción defensiva y uso del despachador digital."
      }
    ]
  },
  legales: {
    quienesSomos: "### Quiénes Somos en TravelCab\n\nSomos una empresa de movilidad y transporte premium nacida con la misión de conectar a personas con choferes altamente calificados de forma segura, puntual y transparente.\n\nContamos con un soporte local dedicado las 24 horas y soporte inteligente de IA a través de Travis en WhatsApp. Creemos en esquemas justos para nuestros conductores asociados a través de nuestro modelo híbrido de comisión o membresía fija y en premiar la fidelidad de nuestros usuarios con el sistema Rewards.",
    terminosCondiciones: "### Términos y Condiciones Generales de Uso de TravelCab\n\nBienvenido a TravelCab. Al acceder y utilizar nuestros servicios de transporte y movilidad, usted acepta de manera incondicional estar sujeto a los siguientes términos y condiciones de uso:\n\n1. **Naturaleza del Servicio:** TravelCab es una plataforma de tecnología de movilidad premium que conecta a pasajeros con choferes profesionales locales.\n2. **Uso de la Plataforma:** El usuario se compromete a hacer uso de los traslados y el despachador web únicamente con fines lícitos. Queda terminantemente prohibido cualquier tipo de conducta que atente contra la seguridad del chofer o la flota.\n3. **Tarifas y Estimaciones:** Las tarifas visualizadas en el Despachador Inteligente son estimaciones y pueden ser modificadas por tráfico congestionado, horarios especiales o condiciones climáticas adversas.\n4. **Monitoreo Satelital:** Con fines de seguridad, todos los trayectos son grabados y geolocalizados en tiempo real por nuestra central operativa de seguridad 24/7.",
    politicasPrivacidad: "### Políticas de Privacidad y Protección de Datos Personales\n\nEn TravelCab estamos plenamente comprometidos con el resguardo, confidencialidad y protección de los datos de nuestros pasajeros y conductores. Al registrarse en la plataforma, usted acepta el tratamiento de su información conforme a lo siguiente:\n\n1. **Recolección de Información:** Al registrarse como pasajero o conductor, almacenamos sus datos personales identificativos (Nombre, Apellido, Email, Teléfono, Ubicación y en el caso de conductores, licencias y habilitaciones oficiales).\n2. **Uso del Perfil y Gamificación:** Los datos provistos por los pasajeros se utilizan para habilitar su cuenta y el programa de fidelización Rewards, otorgando el incentivo inicial de 300 puntos más 150 puntos extra al completar su fotografía de perfil.\n3. **Uso de las Imágenes:** La foto de perfil cargada se almacena únicamente con fines de verificación de identidad del pasajero para asegurar traslados tranquilos para toda la flota.\n4. **No divulgación:** TravelCab garantiza que en ningún caso comercializará o transferirá sus datos de carácter personal a terceras empresas sin su expreso consentimiento escrito previo."
  }
};

const DEFAULT_EXPERIENCE_CMS_DATA = {
  header: {
    logo: "/assets/experience_blanco.svg",
    brand: "TravelApp",
    product: "Experience",
    phone: "0810-220-0018",
    phoneFormatted: "0810-220-0018",
    phoneCallUrl: "tel:08102200018",
  },
  promoPushPop: {
    enabled: false,
    badge: "TEMPORADA NORTE 2026",
    title: "Viví el Norte Argentino con TravelApp Experience",
    subtitle: "Reservá tus excursiones y traslados receptivos con pick-up en tu hotel y financiación en cuotas.",
    showDiscountCode: false,
    discountCode: "",
    imageUrl: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
    ctaText: "Ver Excursiones",
    ctaUrl: "/landing/experience/marketplace",
  },
  marketplaceHero: {
    tag: "TravelApp Experience · Catálogo Oficial Receptivo",
    title: "Marketplace de Experiencias.",
    subtitle: "Explorá todas nuestras excursiones verificadas con fichas técnicas completas, pick-up en tu hotel, reserva inmediata con Time-to-Pay y pago seguro con Mercado Pago.",
  },
  searchConfig: {
    showExcursiones: true,
    showTraslados: true,
    showBuses: true,
    excursionesTitle: "Encontrá tu próxima experiencia.",
    trasladosTitle: "Solicitá tu traslado punto a punto.",
    origenes: [
      "San Miguel de Tucumán",
      "Salta Capital",
      "San Salvador de Jujuy",
      "Purmamarca / Tilcara",
      "Cafayate",
      "San Fernando del Valle de Catamarca",
    ],
  },
  travisSection: {
    enabled: true,
    title: "Travis. Tu asistente personal de viaje.",
    subtitle: "Planificá excursiones, coordiná traslados punto a punto y recibí asistencia en ruta las 24 horas.",
    highlights: [
      "Cotización inmediata",
      "Coordinación de pick-up en hotel",
      "Estado de rutas y clima en tiempo real",
    ],
    ctaText: "Hablar con Travis",
  },
  quienesSomos: {
    vision: "Ser la plataforma líder de turismo receptivo inteligente en Argentina y Sudamérica, transformando la manera en que los viajeros descubren experiencias auténticas y conectando prestadores locales con tecnología de vanguardia.",
    mision: "Diseñar, coordinar y brindar experiencias turísticas genuinas en territorio, integrando la calidez del anfitrión local con la eficiencia de nuestra infraestructura tecnológica y asistencia permanente.",
    valores: "Autenticidad y Respeto Cultural: Valoramos las raíces y las comunidades que nos reciben.\nSeguridad Operativa: Estándares estrictos de guías matriculados, seguros y unidades habilitadas.\nInnovación Centrada en las Personas: Tecnología simple y transparente al servicio del viajero.",
  },
  heroSlides: [
    {
      id: "salinas-4k",
      title: "Salinas Grandes",
      subtitle: "Inmensidad blanca a 3.450 metros de altura.",
      text: "Inmensidad blanca a 3.450 metros de altura.",
      bgImage: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=2560&q=95",
      imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=2560&q=95",
      videoUrl: "",
      mediaType: "image",
      ctaText: "Más información",
      ctaUrl: "#catalogo-excursiones",
      ctaHref: "#catalogo-excursiones",
      secondaryCtaText: "Reservar",
      secondaryCtaUrl: "#catalogo-excursiones",
      overlayOpacity: 45,
    },
    {
      id: "tafi-valles",
      title: "Valles Calchaquíes",
      subtitle: "Ruta del vino de altura, historia y paisajes milenarios.",
      text: "Ruta del vino de altura, historia y paisajes milenarios.",
      bgImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2560&q=95",
      imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2560&q=95",
      videoUrl: "",
      mediaType: "image",
      ctaText: "Más información",
      ctaUrl: "#catalogo-excursiones",
      ctaHref: "#catalogo-excursiones",
      secondaryCtaText: "Reservar",
      secondaryCtaUrl: "#catalogo-excursiones",
      overlayOpacity: 45,
    },
    {
      id: "cafayate-vineyards",
      title: "Bodegas de Cafayate",
      subtitle: "Degustaciones privadas en el corazón de los Valles.",
      text: "Degustaciones privadas en el corazón de los Valles.",
      bgImage: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=2560&q=95",
      imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=2560&q=95",
      videoUrl: "",
      mediaType: "image",
      ctaText: "Más información",
      ctaUrl: "#catalogo-excursiones",
      ctaHref: "#catalogo-excursiones",
      secondaryCtaText: "Reservar",
      secondaryCtaUrl: "#catalogo-excursiones",
      overlayOpacity: 45,
    },
  ],
  contacto: {
    telefono: "0810-220-0018",
    email: "hola@travelapp.ar",
    whatsapp: "https://wa.me/5493812000712",
    whatsappDisplay: "+54 9 381 200-0712",
  },
  redesSociales: {
    facebook: "https://facebook.com/travelapp.ar",
    instagram: "https://instagram.com/travelapp.ar",
    instagramDm: "https://ig.me/m/travelapp.ar",
    instagramHandle: "@travelapp.ar",
    messenger: "https://m.me/travelapp.ar",
    whatsapp: "https://wa.me/5493812000712",
    youtube: "",
    tiktok: "",
    linkedin: "",
  },
  legales: {
    privacidad: "En TravelApp Ecosistema protegemos los datos personales de nuestros usuarios conforme a la Ley N° 25.326 de Protección de Datos Personales.\n\nLa información recabada en las reservas de excursiones y traslados se utiliza exclusivamente para la coordinación operativa, emisión de seguros y facturación ante ARCA.",
    terminos: "1. Tiempo de Reserva: Toda reserva respeta el plazo de confirmación y pago configurado según la anticipación del servicio.\n\n2. Operatoria Oficial: Todos los servicios son operados con vehículos habilitados y guías matriculados.",
  },
  sellosLegales: {
    arcaQr: "",
    atavyt: "ATAVyT",
    baseDatosSello: "RNBD",
  },
  footer: {
    brandText: "TravelApp Experience",
    description: "Ecosistema integral de turismo receptivo, movilidad y experiencias en destino.",
    copyrightText: "Copyright © 2026 TravelApp Ecosistema. Todos los derechos reservados.",
  },
};

const DEFAULT_ECOSISTEMA_CMS_DATA = {
  heroSlider: [
    {
      id: "eco-slide-1",
      mediaType: "image",
      mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=95",
      overlayOpacity: 20,
      badge: "✦ SALIDAS GRUPALES & PAQUETES DE OPERADORES",
      title: "Tu Próximo Destino Empieza Acá",
      subtitle: "Paquetes emisivos a todo el mundo, turismo receptivo regional, vuelos y movilidad urbana con la confianza de TravelApp.",
      ctaText: "Explorar Paquetes",
      ctaUrl: "/marketplace",
      whatsappUrl: "https://wa.me/5493812000712",
      whatsappText: "Hablá con Nosotros",
    },
    {
      id: "eco-slide-2",
      mediaType: "image",
      mediaUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=2560&q=95",
      overlayOpacity: 20,
      badge: "✦ EXPERIENCIAS Y CIRCUITOS EN ARGENTINA",
      title: "Turismo Receptivo con Guías Oficiales",
      subtitle: "Descubrí los paisajes más increíbles del Norte Argentino, bodegas de altura y escapadas organizadas.",
      ctaText: "Ver Receptivo",
      ctaUrl: "/landing/experience",
      whatsappUrl: "https://wa.me/5493812000712",
      whatsappText: "Hablá con Nosotros",
    },
    {
      id: "eco-slide-3",
      mediaType: "image",
      mediaUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=2560&q=95",
      overlayOpacity: 20,
      badge: "✦ MOVILIDAD URBANA Y TRASLADOS SEGUROS",
      title: "Viajá en TravelCab y Sumá Puntos Rewards",
      subtitle: "Traslados corporativos y a aeropuertos con tarifa fija y acreditación instantánea en tu billetera de viajero.",
      ctaText: "Pedir TravelCab",
      ctaUrl: "/landing/travelcab",
      whatsappUrl: "https://wa.me/5493812000712",
      whatsappText: "Hablá con Nosotros",
    },
  ],
  hero: {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=95",
    overlayOpacity: 20,
    badge: "✦ SALIDAS GRUPALES & PAQUETES DE OPERADORES",
    title: "Tu Próximo Destino Empieza Acá",
    subtitle: "Paquetes emisivos a todo el mundo, turismo receptivo regional, vuelos y movilidad urbana con la confianza de TravelApp.",
    ctaText: "Explorar Paquetes",
    ctaUrl: "/marketplace",
    whatsappUrl: "https://wa.me/5493812000712",
    whatsappText: "Hablá con Nosotros",
    playStoreUrl: "",
    appStoreUrl: "",
  },
  enabledSearchTabs: {
    paquetes: true,
    vuelos: true,
    hoteles: true,
    buses: true,
    actividades: true,
    traslados: true,
    autos: true,
    asistencia: true,
    parques: true,
  },
  showFloatingPromos: true,
  floatingPromosTitle: "Beneficios & Financiación",
  floatingPromos: DEFAULT_OTA_FLOATING_PROMOS,
  quickFilters: [
    { id: "qf-1", label: "Verano 2027", keyword: "Verano 2027" },
    { id: "qf-2", label: "Salidas Grupales", keyword: "grupal" },
    { id: "qf-3", label: "Brasil & Caribe", keyword: "Brasil" },
    { id: "qf-4", label: "Cupos Propios", keyword: "propio" },
  ],
  unidades: [
    {
      id: "emisivo",
      nombre: "TravelMarket Turismo Emisivo",
      tag: "Turismo Emisivo",
      descripcionBreve: "Salidas grupales propias con coordinador, paquetes internacionales con operadores mayoristas y cruceros.",
      cta: "Ver Paquetes & Salidas",
      url: "/marketplace",
      imagenUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "receptivo",
      nombre: "Turismo Receptivo NOA",
      tag: "Turismo Receptivo",
      descripcionBreve: "Excursiones de día guiadas, bodegas, aventura en 4x4 y turismo receptivo en el Norte Argentino con guías certificados.",
      cta: "Ver Receptivo",
      url: "/landing/experience",
      imagenUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80",
      imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "travelcab",
      nombre: "TravelCab Movilidad",
      tag: "Movilidad Urbana",
      descripcionBreve: "Traslados urbanos y conexiones seguras a aeropuertos con tarifas fijas, conductores verificados y reserva previa.",
      cta: "Pedir o Cotizar Móvil",
      url: "/landing/travelcab",
      imagenUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
      imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "rewards",
      nombre: "TravelApp Rewards & Afiliados",
      tag: "Club & Embajadores",
      descripcionBreve: "Programa integral donde cada viaje suma puntos canjeables por beneficios, y red de afiliados con comisiones semanales.",
      cta: "Catálogo & Beneficios",
      url: "/landing/rewards",
      imagenUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
      imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
    },
  ],
  quienesSomos: {
    badge: "Nuestra Historia",
    titulo: "Construyendo el Futuro del Turismo Argentino",
    mision: "Empoderar a cada viajero conectándolo con las mejores opciones de transporte, alojamiento y experiencias guiadas con tarifas transparentes, atención 24/7 impulsada por IA y un ecosistema que premia cada kilómetro recorrido.",
    vision: "Ser la plataforma líder de turismo y movilidad integrada de Argentina y Latinoamérica, unificando paquetes emisivos de clase mundial, turismo receptivo regional y traslados seguros bajo un modelo de innovación continua, transparencia y fidelización real.",
    valores: "Transparencia, excelencia en el servicio, innovación constante e impacto positivo en las comunidades donde operamos.",
    imagenUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
  },
  stats: [
    { valor: "+15.000", label: "Pasajeros Transportados", icono: "Users" },
    { valor: "98.5%", label: "Satisfacción & Reseñas 5★", icono: "Star" },
    { valor: "24 / 7", label: "Coordinación & Soporte", icono: "Shield" },
    { valor: "100%", label: "Salidas Garantizadas con Time-to-Pay", icono: "Clock" },
  ],
  apps: {
    enabled: true,
    badge: "Billetera de Viajero Móvil",
    titulo: "Llevá el Ecosistema TravelApp en tu Bolsillo",
    subtitulo: "Gestioná tus reservas, consultá tus vuelos y hoteles, pedí un TravelCab al aeropuerto y canjeá tus puntos Rewards en segundos.",
    welcomeNote: "",
    appPreviewImageUrl: "",
    showPlayStore: true,
    showAppStore: true,
    playStoreUrl: "",
    appStoreUrl: "",
  },
  rewardsSection: {
    enabled: true,
    badge: "TravelApp Rewards",
    title: "Tus viajes valen más.",
    highlight: "Mucho más.",
    subtitle: "Cada traslado en TravelCab, cada reserva de hotel o paquete en TravelApp suma puntos automáticamente que nunca vencen y se canjean como dinero.",
    steps: [
      { num: "01", title: "Registrate gratis", desc: "Creá tu cuenta en segundos y activá tu billetera de viajero TravelApp." },
      { num: "02", title: "Sumá en todo el ecosistema", desc: "Acumulá por cada viaje, paquete emisivo, excursión o pasaje en micro." },
      { num: "03", title: "Canjeá como efectivo", desc: "Usá tus puntos para pagar descuentos, upgrades o vouchers de comercios adheridos." },
    ],
    primaryCtaText: "Descubrir el Programa",
    primaryCtaUrl: "/landing/rewards",
    secondaryCtaText: "Activar mi Billetera",
    secondaryCtaUrl: "/login",
  },
  travisSection: {
    enabled: true,
    badge: "Asistente de Viajes IA",
    title: "Conocé a Travis, tu asesor 24/7.",
    subtitle: "Planificá itinerarios complejos, compará financiación en cuotas o consultá requisitos migratorios al instante, sin esperas ni formularios tediosos.",
    primaryCtaText: "Chatear con Travis",
    secondaryCtaText: "Hablar con un Asesor",
    features: [
      { title: "Itinerarios a medida", desc: "Armado día por día según tu presupuesto, gustos y fechas." },
      { title: "Cotización en tiempo real", desc: "Comparamos paquetes, aéreos y seguros con moneda oficial." },
      { title: "Soporte en viaje 24/7", desc: "Resolución rápida de imprevistos, vuelos y traslados." },
      { title: "Atención omnicanal", desc: "Disponible por WhatsApp y web con derivación a asesores humanos." },
    ],
  },
  contacto: {
    telefono: "0810-220-0018",
    whatsapp: "https://wa.me/5493812000712",
    whatsappDisplay: "+54 9 381 200-0712",
    email: "hola@travelapp.ar",
    horarios: "Atención Lunes a Sábado de 09:00 a 20:00 hs",
  },
  footer: {
    description: "Plataforma integral de turismo, paquetes de operadores mayoristas y movilidad urbana de Argentina.",
    copyrightText: "Todos los derechos reservados por TravelApp S.A.S. - 2026",
  },
  legales: {
    razonSocial: "TravelApp S.A.S.",
    cuit: "30-71829304-8",
    domicilio: "San Miguel de Tucumán, Argentina",
    terminos: "Al utilizar nuestros servicios, el usuario acepta los términos y condiciones vigentes de TravelApp S.A.S.",
    privacidad: "TravelApp S.A.S. garantiza la protección de datos personales de conformidad con la Ley 25.326."
  },
  redesSociales: {
    facebook: "",
    instagram: "",
    whatsapp: "https://wa.me/5493812000712",
    linkedin: "",
    youtube: "",
    tiktok: ""
  },
  sellosLegales: {
    arcaQr: "",
    baseDatosSello: "",
    atavyt: "",
    faevyt: "",
    iata: "",
  },
  showStats: false,
  promoPushPop: {
    enabled: true,
    badge: "TRAVEL SALE 2026",
    title: "Hasta 40% OFF en Paquetes y Puntos Dobles",
    subtitle: "Aprovechá las mejores salidas de turismo emisivo y sumá doble puntaje TravelApp Rewards en todas tus reservas.",
    showDiscountCode: false,
    discountCode: "",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    ctaText: "Ver Ofertas Especiales",
    ctaUrl: "/marketplace"
  },
  marketplaceHeroSlider: [
    {
      id: "mkt-slide-1",
      mediaType: "image",
      mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=95",
      badge: "✦ TRAVELMARKET TURISMO EMISIVO",
      title: "Paquetes Turísticos & Salidas Acompañadas",
      subtitle: "Explorá salidas grupales con coordinador TravelApp y paquetes verificados en su moneda oficial.",
      ctaText: "Ver Destinos",
      ctaUrl: "#catalogo-marketplace",
    },
  ],
  marketplaceQuickButtons: [
    { id: "verano-2027", label: "Verano 2027", keyword: "Verano 2027" },
    { id: "cupos-propios", label: "Cupos Propios", keyword: "propio" },
  ],
};

const DEFAULT_REWARDS_CMS_DATA_FOR_CMS = {
  ribbonText: "Sumá 10 Puntos Travel por cada kilómetro recorrido o reserva confirmada.",
  promoPushPop: {
    enabled: false,
    badge: "NOVEDAD REWARDS",
    title: "Sumá y Canjeá en todo el Ecosistema TravelApp",
    subtitle: "Activá tu Travel Wallet sin costo y empezá a acumular puntos en cada viaje, excursión o traslado.",
    showDiscountCode: false,
    discountCode: "",
    imageUrl: "",
    ctaText: "Ver Catálogo de Canjes",
    ctaUrl: "/canjes",
  },
  heroSlides: [
    {
      title: "Tus viajes tienen recompensa.",
      subtitle: "Acumulá puntos automáticamente en cada traslado o excursión y canjealos por beneficios reales en todo el ecosistema TravelApp.",
      text: "Membresía digital sin cargo. Acreditación inmediata en tu Travel Wallet.",
      bgImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85",
      ctaText: "Explorar Catálogo de Canjes",
      ctaUrl: "/canjes",
      overlayOpacity: 60,
    }
  ],
  heroMetrics: [
    { value: "1 Km = 10 Pts", label: "Conversión directa en viajes" },
    { value: "+50 Marcas", label: "Gastronomía, turismo y retail" },
    { value: "100% Digital", label: "Acreditación automática" },
    { value: "$0 Costo", label: "Membresía libre de mantenimiento", highlight: true },
  ],
  howItWorks: [
    { step: "01", title: "Viajá o Reservá", description: "Solicitá un traslado en TravelCab o contratá una excursión en TravelApp Experience con tu cuenta registrada." },
    { step: "02", title: "Sumá Puntos en el Acto", description: "Tus Puntos Travel se acreditan automáticamente en tu billetera digital al finalizar cada servicio." },
    { step: "03", title: "Canjeá sin Fricción", description: "Accedé al catálogo online, seleccioná tu beneficio y utilizá tu voucher digital al instante." },
  ],
  benefits: [
    { icon: "Plane", title: "Traslados y Excursiones", description: "Utilizá tus puntos acumulados para bonificar total o parcialmente tus próximos viajes y experiencias.", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=85" },
    { icon: "Star", title: "Categorías & Status VIP", description: "Ascendé de nivel con cada kilómetro recorrido para acceder a atención prioritaria y preventas exclusivas.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85" },
    { icon: "Coffee", title: "Gastronomía de Autor", description: "Beneficios directos en cafeterías de especialidad, restaurantes y bodegas adheridas al programa.", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85" },
    { icon: "ShoppingBag", title: "Retail & Lifestyle", description: "Vouchers de descuento y beneficios en marcas seleccionadas de indumentaria, equipamiento y tecnología.", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85" },
  ],
  ctaBlock: {
    title: "Activá tu Travel Wallet hoy mismo.",
    subtitle: "Iniciá sesión o creá tu cuenta sin costo para empezar a acumular puntos en cada experiencia y traslado.",
    buttonText: "Activar mi Billetera Rewards",
    buttonUrl: "/mi-perfil",
  },
  businessSection: {
    title: "Integrá tu marca al ecosistema TravelApp Rewards.",
    subtitle: "Posicioná tu comercio frente a miles de viajeros y usuarios recurrentes. Fidelizá clientes con acreditación y canje digital inmediato.",
    buttonText: "Solicitar Alianza Comercial",
    buttonUrl: "mailto:partners@travelapp.ar",
    email: "partners@travelapp.ar",
    features: [
      "Presencia destacada en el Catálogo Oficial de Canjes",
      "Validación digital de vouchers y puntos en tiempo real",
      "Reportes ejecutivos de conversión y recurrencia en Concorde 360",
      "Ejecutivo de cuentas dedicado y campañas co-branded",
    ],
  },
  contacto: {
    telefono: "0810-220-0018",
    email: "hola@travelapp.ar",
    whatsapp: "https://wa.me/5493812000712",
    whatsappDisplay: "+54 9 381 200-0712",
  },
  redesSociales: {
    facebook: "https://facebook.com/travelapp.ar",
    instagram: "https://instagram.com/travelapp.ar",
    instagramDm: "https://ig.me/m/travelapp.ar",
    instagramHandle: "@travelapp.ar",
    messenger: "https://m.me/travelapp.ar",
    whatsapp: "https://wa.me/5493812000712",
    youtube: "",
    tiktok: "",
    linkedin: "",
  },
  legales: {
    privacidad: "TravelApp S.A.S. protege los datos personales y el historial transaccional de los miembros del programa TravelApp Rewards en cumplimiento de la Ley N° 25.326 de Protección de Datos Personales.",
    terminos: "Los Puntos Travel se acreditan automáticamente por servicios efectivamente completados y abonados dentro del ecosistema TravelApp. Los vouchers emitidos en el catálogo de canjes están sujetos a disponibilidad y vigencia informada en cada comercio adherido.",
  },
  sellosLegales: { arcaQr: "", baseDatosSello: "" },
  footer: {
    description: "Programa oficial de fidelización y beneficios del ecosistema TravelApp S.A.S. Acumulá y canjeá en todo el país.",
    copyrightText: "Copyright © 2026 TravelApp S.A.S. Todos los derechos reservados.",
  },
};

import { OverlappingCardCarousel } from '@/components/ui/OverlappingCardCarousel';

const DEFAULT_APP_INICIO_CMS_DATA = {
  id: "block-1",
  blockTitle: "Novedades del Ecosistema",
  cards: [
    {
      title: "150 Puntos Extra",
      badge: "🎁 REWARDS",
      subtitle: "Completá tu foto de perfil y sumá puntos gratis.",
      description: "Completá tu foto de perfil y ganá 150 puntos extra al instante para tu próximo canje.",
      ctaText: "Sumar Puntos",
      imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/rewards"
    },
    {
      title: "Yungas & Aventura",
      badge: "🌿 EXPERIENCES",
      subtitle: "Paseos de aventura y traslados rurales.",
      description: "Agendá paseos de aventura y traslados rurales en las yungas tucumanas.",
      ctaText: "Explorar",
      imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/experiences"
    },
    {
      title: "Travis Asistente IA",
      badge: "🤖 CHATBOT 24/7",
      subtitle: "Cotizá y programá tus viajes con inteligencia artificial.",
      description: "Hablá con nuestro asistente inteligente de viajes para cotizar al instante.",
      ctaText: "Chatear",
      imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/chatbot"
    },
    {
      title: "Viajá Compartido 40% OFF",
      badge: "👥 AHORRO",
      subtitle: "Compartí tu ruta con otros pasajeros y pagá menos.",
      description: "Viajá con otros pasajeros en la misma dirección y ahorrá hasta un 40%.",
      ctaText: "Aprovechar",
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/share"
    },
    {
      title: "Generá Ingresos con tu Auto",
      badge: "🚗 CONDUCTORES",
      subtitle: "Registrate en TravelCab con soporte local 24hs.",
      description: "Registrá tu auto o taxi y empezá a generar ingresos con soporte local certificado.",
      ctaText: "Sumarme",
      imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/conductor"
    }
  ]
};

const DEFAULT_APP_BENEFICIOS_CMS_DATA = {
  id: "block-2",
  blockTitle: "Beneficios Rewards",
  cards: [
    {
      title: "20% OFF Gastronomía",
      badge: "🍔 BENEFICIO",
      subtitle: "Presentá tu QR en restaurantes adheridos.",
      description: "Obtené un 20% de descuento en restaurantes adheridos presentando tu código QR.",
      ctaText: "Ver Locales",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/rewards/food"
    },
    {
      title: "15% OFF Hotelería",
      badge: "🏨 HOTELES",
      subtitle: "Ahorrá en estadías seleccionadas del Norte.",
      description: "Ahorrá hasta un 15% en estadías seleccionadas de TravelApp Experiences.",
      ctaText: "Reservar",
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/rewards/hotel"
    }
  ]
};

const DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS = {
  header: {
    brand: 'TravelApp',
    product: 'Experience Partners',
    ctaText: 'Ser Embajador',
    loginUrl: '/afiliados/login',
    registerUrl: '/afiliados/register',
  },
  hero: {
    badge: 'PROGRAMA OFICIAL DE AFILIADOS & PARTNERS',
    title: 'Monetizá tu audiencia recomendando experiencias reales.',
    subtitle: 'Obtené hasta un 10% de comisión por cada reserva confirmada, otorgá códigos de descuento exclusivos a tu comunidad y recibí tu liquidación en el acto vía Mercado Pago o semanalmente por CBU.',
    primaryCtaText: 'Registrarme Gratis',
    secondaryCtaText: 'Explorar Niveles',
    heroImage: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1800&q=85',
    ribbonText: 'Comisiones de hasta el 10% con acreditación inmediata vía Split Mercado Pago o CBU semanal.',
    demoCode: 'TUCUMAN10OFF',
  },
  promoPopup: {
    enabled: false,
    badge: 'PROGRAMA PARTNERS',
    title: 'Sumate como Embajador TravelApp',
    subtitle: 'Registrate sin costo y empezá a generar comisiones instantáneas recomendando experiencias en todo el país.',
    showDiscountCode: false,
    discountCode: '',
    discountBadge: '',
    ctaText: 'Registrarme Gratis',
    ctaUrl: '/afiliados/register',
    imageUrl: '',
    delaySeconds: 4,
  },
  stats: [
    { label: 'Comisión Máxima', value: '10%', detail: 'por reserva confirmada' },
    { label: 'Cupones Seguidores', value: 'Hasta 20% OFF', detail: 'código personalizado' },
    { label: 'Liquidación', value: 'Instantánea', detail: 'Split MP o CBU semanal' },
    { label: 'Puntos Rewards', value: 'Bonificación VIP', detail: 'por rendimiento mensual' },
  ],
  payoutMethods: {
    title: 'Liquidación transparente y automatizada.',
    subtitle: 'Trazabilidad completa en cada venta realizada con tu código promocional o enlace de atribución directa.',
    optionMpTitle: 'Split Mercado Pago Instantáneo',
    optionMpDesc: 'Vinculá tu cuenta de Mercado Pago mediante OAuth oficial. Con cada reserva abonada a través de tu enlace, tu porcentaje de comisión se separa y acredita en el acto en tu cuenta.',
    optionCbuTitle: 'Liquidación Semanal por CBU / CVU',
    optionCbuDesc: 'Preferí la acreditación bancaria directa: el sistema consolida todas las reservas de la semana y ejecuta la transferencia automática todos los días lunes a tu CBU o alias.',
    panel3Title: 'Códigos Nominales y Enlaces QR.',
    panel3Desc: 'Otorgá hasta un 20% de descuento real en excursiones y traslados. Cada uso de tu cupón se registra en vivo en tu consola de afiliado.',
    panel3Image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1400&q=85',
    panel4Title: 'Creadores, Conserjerías y Hoteles.',
    panel4Desc: 'Tanto si tenés una comunidad digital como si recibís turistas en recepción hotelera, recomendá circuitos habilitados con respaldo operativo 24/7.',
    panel4Image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85',
    nivelesTitle: 'A mayor volumen de reservas, mayor porcentaje de comisión.',
    nivelesSubtitle: 'Tu cuenta asciende de categoría automáticamente a medida que tus referidos completan sus excursiones y traslados.',
  },
  faqs: [
    {
      q: '¿Tiene algún costo unirme al Programa de Embajadores?',
      a: 'No. El registro y mantenimiento de tu cuenta de Partner es 100% gratuito. Solo necesitás completar tu alta para recibir tu código promocional y enlace de atribución.'
    },
    {
      q: '¿Cómo funcionan las escalas de comisión?',
      a: 'Iniciás en la categoría Starter con un 3% de comisión directa. A medida que sumás reservas confirmadas, el sistema actualiza automáticamente tu rango a Pro Creator (5%), Master Partner (7%) y VIP Ambassador (10%).'
    },
    {
      q: '¿Cómo aplica el descuento mi audiencia o mis huéspedes?',
      a: 'Se te asigna un código nominal (por ejemplo, TUCUMAN10OFF) que el pasajero ingresa al momento de reservar su excursión o traslado en TravelApp Experience, aplicando el descuento en el acto.'
    },
    {
      q: '¿Cuándo y cómo se liquidan mis comisiones?',
      a: 'Podés optar por liquidación inmediata en cada transacción mediante Split de Mercado Pago o liquidación consolidada semanal todos los lunes vía transferencia bancaria CBU/CVU.'
    }
  ],
  contacto: {
    telefono: '0810-220-0018',
    email: 'hola@travelapp.ar',
    whatsapp: '5493812000712',
    whatsappDisplay: '+54 9 381 200-0712',
  },
  legales: {
    razonSocial: 'TravelApp S.A.S.',
    cuit: '30-71829340-9',
    domicilio: 'San Miguel de Tucumán, Argentina',
    terminos: 'Al participar del Programa de Afiliados y Partners, el usuario acepta los términos comerciales y de atribución vigentes de TravelApp S.A.S.',
    privacidad: 'TravelApp S.A.S. garantiza la confidencialidad y protección de los datos personales y bancarios de conformidad con la Ley N° 25.326.',
  },
  redesSociales: {
    facebook: 'https://facebook.com/travelapp.ar',
    instagram: 'https://instagram.com/travelapp.ar',
    whatsapp: 'https://wa.me/5493812000712',
    linkedin: 'https://linkedin.com/company/travelapp-sas',
    youtube: 'https://youtube.com/@travelapp_ar',
    tiktok: 'https://tiktok.com/@travelapp.ar',
    messenger: 'https://m.me/travelapp',
  },
  sellosLegales: {
    arcaQr: '',
    baseDatosSello: '',
  },
  footer: {
    brandText: 'TravelApp Experience Partners',
    description: 'El Ecosistema de Viajes más completo de Argentina. Turismo receptivo, movilidad segura y programa de partners.',
    copyrightText: 'Copyright © 2026 TravelApp S.A.S. Todos los derechos reservados.'
  }
};

const DEFAULT_LUNAVIAJERA_CMS_DATA = {
  hero: {
    badge: "✦ EXCURSIONES REGIONALES & SALIDAS DE 1 DÍA",
    title: "Descubrí la magia de los Valles y las Yungas",
    subtitle: "Excursiones de día completo con transporte ida y vuelta desde Yerba Buena, guías locales habilitados y grupos reducidos.",
    slides: [
      {
        id: "slide-1",
        mediaUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=90",
        badge: "✦ VALLES CALCHAQUÍES",
        title: "Tafí del Valle & Quebrada Los Sosa",
        subtitle: "Recorré 30 km de selva subtropical por la mítica Ruta 307 hasta llegar a los monolitos de más de 2000 años y el lago La Angostura."
      },
      {
        id: "slide-2",
        mediaUrl: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=2560&q=90",
        badge: "✦ SELVA NUBICELVA",
        title: "Selva de Yungas & El Cadillal",
        subtitle: "Caminatas bajo helechos gigantes, ríos de montaña de aguas transparentes y el imponente embalse encajonado entre cerros verdes."
      },
      {
        id: "slide-3",
        mediaUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=2560&q=90",
        badge: "✦ CIELOS LIMPIOS",
        title: "Astroturismo & Fogón Bajo las Estrellas",
        subtitle: "Observación telescópica guiada por astrónomos locales, cata de vinos de altura y relatos ancestrales junto al fuego."
      }
    ]
  },
  floatingCards: [
    {
      id: "card-1",
      tag: "Logística",
      title: "Transporte Puerta a Puerta",
      desc: "Salidas puntuales desde Yerba Buena y San Miguel de Tucumán en combis ejecutivas con seguro.",
      iconName: "bus"
    },
    {
      id: "card-2",
      tag: "Coordinación",
      title: "Guías Nativos Habilitados",
      desc: "Acompañamiento de especialistas locales con profundo amor por la historia, flora y leyendas.",
      iconName: "users"
    },
    {
      id: "card-3",
      tag: "Para Todos",
      title: "Dificultad Accesible",
      desc: "Itinerarios relajados aptos para toda la familia, niños y adultos mayores con paradas fotográficas.",
      iconName: "mountain"
    },
    {
      id: "card-4",
      tag: "Valores",
      title: "Turismo Responsable",
      desc: "Compromiso de huella cero: cuidamos nuestros senderos, ríos y apoyamos a las comunidades del valle.",
      iconName: "heart"
    },
    {
      id: "card-5",
      tag: "Flexibilidad",
      title: "Seña Online (30%)",
      desc: "Congelá tu butaca con seña mínima o pagá el total con tarjeta de crédito, débito o billeteras virtuales.",
      iconName: "card"
    }
  ],
  quienesSomos: {
    badge: "Filosofía Luna Viajera",
    title: "Creando Recuerdos en las Tierras Tucumanas",
    description: "Luna Viajera nació con la convicción de que las mejores aventuras están muy cerca de casa. Diseñamos experiencias de cercanía para desconectar del ritmo diario y reconectar con la naturaleza de nuestras sierras, la calidez de su gente y la inmensidad de los Valles Calchaquíes.",
    tagline: "Turismo Responsable y Espiritual",
    originCity: "Yerba Buena — Tucumán, Argentina"
  },
  galeria: {
    badge: "Recuerdos & Postales",
    title: "Galería de Experiencias",
    subtitle: "Momentos reales compartidos por nuestros viajeros en los rincones más mágicos del norte argentino.",
    images: [
      {
        id: "gal-1",
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
        caption: "Amanecer en Tafí del Valle",
        location: "Valles Calchaquíes"
      },
      {
        id: "gal-2",
        url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80",
        caption: "Sendero en la Selva de Yungas",
        location: "Yungas Tucumanas"
      },
      {
        id: "gal-3",
        url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
        caption: "Noche de Estrellas y Telescopio",
        location: "Cielos del Valle"
      },
      {
        id: "gal-4",
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        caption: "Cascadas y Ríos de Montaña",
        location: "Quebrada Los Sosa"
      },
      {
        id: "gal-5",
        url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
        caption: "Dique La Angostura",
        location: "El Mollar"
      },
      {
        id: "gal-6",
        url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80",
        caption: "Bosques Nublados y Helechos",
        location: "San Javier"
      }
    ]
  },
  travis: {
    title: "Consulta algunas dudas a Travis nuestro asistente con IA",
    subtitle: "Travis te responde al instante sobre ropa recomendada, horarios de partida desde Yerba Buena, nivel de senderismo y cupos disponibles.",
    whatsappUrl: "https://wa.me/5493812000712?text=Hola%20Travis!%20Tengo%20una%20consulta%20sobre%20las%20excursiones%20de%20Luna%20Viajera",
    defaultQuestions: [
      "¿Qué ropa y calzado me recomiendan llevar a Tafí?",
      "¿A qué hora salimos y desde dónde nos buscan?",
      "¿Las excursiones son aptas para niños?",
      "¿Cómo abono la seña del 30% para asegurar lugar?"
    ]
  },
  contacto: {
    whatsapp: "381 398-1479",
    telefono: "0810-220-0018",
    email: "lunaviajera@travelapp.ar",
    instagram: "@lunaviajera.turismo",
    ubicacion: "Yerba Buena — Tucumán"
  },
  excursiones: [
    {
      id: "tafi-del-valle",
      category: "valles",
      categoryLabel: "⛰️ Valles Calchaquíes",
      title: "TAFÍ DEL VALLE Day Trip",
      tagline: "Descubre la belleza de los Valles Calchaquíes",
      detail: "Excursión panorámica de día completo recorriendo la Quebrada de Los Sosa, el Dique La Angostura y los míticos menhires milenarios. Tiempo libre para almorzar empanadas vallistas y pasear por la villa veraniega.",
      badge: "Salida Tradicional",
      duration: "8 - 9 hs",
      departureTime: "08:00 hs — Regreso aprox. 17:00 hs",
      departurePoint: "Yerba Buena — Tucumán",
      difficulty: "Baja · Para todas las edades",
      price: 45000,
      imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
      stops: [
        "Quebrada Los Sosa (30 km de selva montañosa por Ruta 307)",
        "Reserva Arqueológica Los Menhires (+50 monolitos)",
        "Dique La Angostura (vistas panorámicas del valle)"
      ],
      includes: [
        "Transporte ida y vuelta desde Yerba Buena",
        "Guía local especializado durante todo el trayecto",
        "Paradas en miradores panorámicos",
        "Tiempo libre en Tafí del Valle"
      ]
    },
    {
      id: "selva-de-yungas",
      category: "yungas",
      categoryLabel: "🌿 Selva de Yungas",
      title: "SELVA DE YUNGAS",
      tagline: "Yungas Tucumán · Naturaleza, Río y Embalse",
      detail: "Aventura inmersiva por los senderos nublados de las yungas tucumanas con avistaje de flora autóctona, paradas en arroyos de montaña de aguas cristalinas y vistas únicas del embalse El Cadillal.",
      badge: "100% Selva Nublada",
      duration: "8 hs",
      departureTime: "08:30 hs — Regreso 16:30 hs",
      departurePoint: "Yerba Buena / San Miguel de Tucumán",
      difficulty: "Baja - Media · Senderismo ameno",
      price: 39000,
      imageUrl: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80",
      stops: [
        "Bosque Nublado con helechos gigantes y musgos",
        "Río de montaña con pozones de aguas cristalinas",
        "Embalse El Cadillal encajonado entre cerros"
      ],
      includes: [
        "Traslado ida y vuelta desde punto de encuentro",
        "Guía local especializado en flora y fauna",
        "Caminata por senderos selváticos seguros",
        "Paradas fotográficas y tiempo de contemplación"
      ]
    },
    {
      id: "astroturismo-valles",
      category: "astroturismo",
      categoryLabel: "🌌 Astroturismo",
      title: "ASTROTURISMO & FOGÓN",
      tagline: "Cielos Limpios en las Alturas del Valle",
      detail: "Vivencia nocturna bajo el cielo diáfano de altura con guiada astronómica, reconocimiento de constelaciones con puntero láser, observación con telescopio computarizado y fogón con relatos ancestrales.",
      badge: "Experiencia Mágica",
      duration: "6 hs",
      departureTime: "17:00 hs — Regreso 23:30 hs",
      departurePoint: "Yerba Buena — Tucumán",
      difficulty: "Baja · Para toda la familia",
      price: 42000,
      imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80",
      stops: [
        "Atardecer dorado sobre los cerros",
        "Observación con telescopio computarizado",
        "Fogón con relatos ancestrales y cata de vino"
      ],
      includes: [
        "Transporte ida y vuelta coordinado",
        "Telescopio profesional y guía astronómico",
        "Copa de vino regional o té serrano caliente",
        "Seguro de actividad y asistencia"
      ]
    }
  ]
};

type ActiveTab = 'hero' | 'tc_pushpop' | 'servicios' | 'conductores' | 'rewards' | 'faq' | 'legales' | 'slider' | 'ofertas' | 'social' | 'eco_hero' | 'eco_promo' | 'eco_buscador' | 'eco_unidades' | 'eco_quienes' | 'eco_stats' | 'eco_apps' | 'eco_legales' | 'eco_marketplace' | 'rew_slider' | 'rew_pushpop' | 'rew_beneficios' | 'rew_social' | 'rew_negocio' | 'rew_legales' | 'app_cards' | 'app_rewards' | 'afi_hero' | 'afi_pushpop' | 'afi_cobro' | 'afi_faq' | 'afi_footer' | 'exp_pushpop' | 'exp_floating' | 'exp_quienes' | 'exp_marketplace' | 'exp_buscador' | 'exp_metrics' | 'exp_testimonials' | 'lv_hero' | 'lv_cards' | 'lv_galeria' | 'lv_catalogo' | 'lv_travis' | 'lv_quienes' | 'lv_contacto' | 'bus_cms';

export default function CMSPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [selectedLanding, setSelectedLanding] = useState<'travelcab' | 'experience' | 'ecosistema' | 'rewards' | 'app-inicio' | 'afiliados' | 'lunaviajera'>('ecosistema');
  const [activeTab, setActiveTab] = useState<ActiveTab>('eco_hero');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<'ES' | 'EN' | 'PT'>('ES');

  // Detectar parámetro ?landing= en la URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const landingParam = urlParams.get('landing') as any;
      if (landingParam && ['travelcab', 'experience', 'ecosistema', 'rewards', 'app-inicio', 'afiliados', 'lunaviajera'].includes(landingParam)) {
        setSelectedLanding(landingParam);
      }
    }
  }, []);

  // Cargar datos actuales de Firestore
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (selectedLanding === 'app-inicio') {
          const docRef1 = doc(db, 'cms_blocks', 'block-1');
          const docSnap1 = await getDoc(docRef1);
          
          const docRef2 = doc(db, 'cms_blocks', 'block-2');
          const docSnap2 = await getDoc(docRef2);
          
          const block1Data = docSnap1.exists() ? docSnap1.data() : DEFAULT_APP_INICIO_CMS_DATA;
          const block2Data = docSnap2.exists() ? docSnap2.data() : DEFAULT_APP_BENEFICIOS_CMS_DATA;

          setData({
            block1: deepMergeCms(DEFAULT_APP_INICIO_CMS_DATA, block1Data),
            block2: deepMergeCms(DEFAULT_APP_BENEFICIOS_CMS_DATA, block2Data),
          });
        } else if (selectedLanding === 'afiliados') {
          const docRef = doc(db, 'cms_blocks', 'landing_afiliados');
          const docSnap = await getDoc(docRef);
          setData(docSnap.exists() ? deepMergeCms(DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS, docSnap.data()) : DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS);
        } else {
          const docId = selectedLanding === 'travelcab' ? 'landing_travelcab' : selectedLanding === 'experience' ? 'landing_experience' : selectedLanding === 'rewards' ? 'landing_rewards' : selectedLanding === 'lunaviajera' ? 'landing_lunaviajera' : 'landing_ecosistema';
          const docRef = doc(db, 'cms', docId);
          const docSnap = await getDoc(docRef);
          const defaultData = selectedLanding === 'travelcab' ? DEFAULT_CMS_DATA : selectedLanding === 'experience' ? DEFAULT_EXPERIENCE_CMS_DATA : selectedLanding === 'rewards' ? DEFAULT_REWARDS_CMS_DATA_FOR_CMS : selectedLanding === 'lunaviajera' ? DEFAULT_LUNAVIAJERA_CMS_DATA : DEFAULT_ECOSISTEMA_CMS_DATA;
          if (docSnap.exists()) {
            const loadedData: any = docSnap.data();
            // Normalizar unidades para asegurar compatibilidad de campos imagenUrl / imageUrl / url / tag / cta
            if (Array.isArray(loadedData.unidades)) {
              const defUnidades = DEFAULT_ECOSISTEMA_CMS_DATA.unidades;
              loadedData.unidades = loadedData.unidades.map((u: any, idx: number) => {
                const matchDef = defUnidades.find((d) => d.id === u.id) || defUnidades[idx] || {};
                const img = u.imagenUrl || u.imageUrl || (matchDef as any).imagenUrl || '';
                return {
                  ...matchDef,
                  ...u,
                  imagenUrl: img,
                  imageUrl: img,
                };
              });
            }
            // Migración transparente para Ecosistema: si aún no tiene heroSlider, usar hero existente como Slide #1
            if (selectedLanding === 'ecosistema') {
              if (!Array.isArray(loadedData.heroSlider) || loadedData.heroSlider.length === 0) {
                if (loadedData.hero && (loadedData.hero.mediaUrl || loadedData.hero.title)) {
                  const firstSlide = {
                    ...DEFAULT_ECOSISTEMA_CMS_DATA.heroSlider[0],
                    ...loadedData.hero,
                    id: 'eco-slide-1',
                    ctaUrl: loadedData.hero.ctaUrl || '/marketplace',
                    overlayOpacity: typeof loadedData.hero.overlayOpacity === 'number' ? loadedData.hero.overlayOpacity : 20,
                  };
                  loadedData.heroSlider = [firstSlide, ...DEFAULT_ECOSISTEMA_CMS_DATA.heroSlider.slice(1)];
                } else {
                  loadedData.heroSlider = DEFAULT_ECOSISTEMA_CMS_DATA.heroSlider;
                }
              }
            }
            if (selectedLanding === 'experience') {
              const rawSlides = Array.isArray(loadedData.heroSlides) && loadedData.heroSlides.length > 0
                ? loadedData.heroSlides
                : (defaultData as any).heroSlides || [];
              loadedData.heroSlides = rawSlides.map((s: any, idx: number) => {
                const defSlide = ((defaultData as any).heroSlides || [])[idx] || ((defaultData as any).heroSlides || [])[0] || {};
                const resolvedImg = s.bgImage || s.imageUrl || defSlide.bgImage || defSlide.imageUrl || '';
                const resolvedCta = s.ctaUrl || s.ctaHref || defSlide.ctaUrl || '#catalogo-excursiones';
                return {
                  ...defSlide,
                  ...s,
                  bgImage: resolvedImg,
                  imageUrl: resolvedImg,
                  videoUrl: s.videoUrl || '',
                  mediaType: s.videoUrl ? 'video' : (s.mediaType || 'image'),
                  ctaUrl: resolvedCta,
                  ctaHref: resolvedCta,
                  overlayOpacity: typeof s.overlayOpacity === 'number' ? s.overlayOpacity : 45
                };
              });
            }
            if (selectedLanding === 'lunaviajera' && (!loadedData.excursiones || !Array.isArray(loadedData.excursiones) || loadedData.excursiones.length === 0)) {
              loadedData.excursiones = (defaultData as any).excursiones;
            }
            setData(deepMergeCms(defaultData, loadedData));
          } else {
            setData(defaultData);
          }
        }
      } catch (err) {
        console.error("Error al leer CMS de Firestore:", err);
        const defaultData = selectedLanding === 'app-inicio' ? { block1: DEFAULT_APP_INICIO_CMS_DATA, block2: DEFAULT_APP_BENEFICIOS_CMS_DATA } : selectedLanding === 'afiliados' ? DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS : selectedLanding === 'travelcab' ? DEFAULT_CMS_DATA : selectedLanding === 'experience' ? DEFAULT_EXPERIENCE_CMS_DATA : selectedLanding === 'rewards' ? DEFAULT_REWARDS_CMS_DATA_FOR_CMS : selectedLanding === 'lunaviajera' ? DEFAULT_LUNAVIAJERA_CMS_DATA : DEFAULT_ECOSISTEMA_CMS_DATA;
        setData(defaultData);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // Reset active tab depending on the landing to prevent visual inconsistencies
    if (selectedLanding === 'experience') {
      setActiveTab('slider');
    } else if (selectedLanding === 'ecosistema') {
      setActiveTab('eco_hero');
    } else if (selectedLanding === 'rewards') {
      setActiveTab('rew_slider');
    } else if (selectedLanding === 'app-inicio') {
      setActiveTab('app_cards');
    } else if (selectedLanding === 'afiliados') {
      setActiveTab('afi_hero');
    } else if (selectedLanding === 'lunaviajera') {
      setActiveTab('lv_hero');
    } else {
      setActiveTab('hero');
    }
  }, [selectedLanding]);

  const handleSave = async () => {
    // Asegurar flush de cualquier campo con foco activo antes de serializar
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSaving(true);
    setStatusMsg(null);
    try {
      const payloadToSave = { ...data };
      // En Ecosistema, mantener `hero` sincronizado con el primer slide de `heroSlider` por compatibilidad
      if (selectedLanding === 'ecosistema' && Array.isArray(payloadToSave.heroSlider) && payloadToSave.heroSlider.length > 0) {
        payloadToSave.hero = {
          ...(payloadToSave.hero || {}),
          ...payloadToSave.heroSlider[0],
        };
      }
      // En Experience, limpiar campos legacy con Base64 obsoletos (carouselOffers / servicios) que ya no se renderizan
      if (selectedLanding === 'experience') {
        delete payloadToSave.carouselOffers;
        delete payloadToSave.servicios;
      }
      // Sanitizar el objeto para eliminar cualquier valor undefined, prototipo custom o propiedad no serializable
      const serialized = JSON.stringify(payloadToSave, (key, value) => {
        return value === undefined ? null : value;
      });
      if (serialized.length > 960_000) {
        throw new Error(
          `El documento pesa ${Math.round(serialized.length / 1024)} KB y supera el límite seguro de Firestore (1 MB). Reemplazá imágenes Base64 viejas volviendo a subirlas para guardarlas en Firebase Storage.`
        );
      }
      const sanitizedData = JSON.parse(serialized);
      if (selectedLanding === 'app-inicio') {
        const docRef1 = doc(db, 'cms_blocks', 'block-1');
        await setDoc(docRef1, sanitizedData.block1);
        const docRef2 = doc(db, 'cms_blocks', 'block-2');
        await setDoc(docRef2, sanitizedData.block2);
      } else if (selectedLanding === 'afiliados') {
        const docRef = doc(db, 'cms_blocks', 'landing_afiliados');
        await setDoc(docRef, sanitizedData);
      } else {
        const docId = selectedLanding === 'travelcab' ? 'landing_travelcab' : selectedLanding === 'experience' ? 'landing_experience' : selectedLanding === 'rewards' ? 'landing_rewards' : selectedLanding === 'lunaviajera' ? 'landing_lunaviajera' : 'landing_ecosistema';
        const docRef = doc(db, 'cms', docId);
        await setDoc(docRef, sanitizedData);
      }
      setStatusMsg({ type: 'success', text: '¡Cambios guardados y publicados en tiempo real!' });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      console.error("Error al guardar CMS en Firestore:", err);
      setStatusMsg({ type: 'error', text: `Error al guardar: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section: string, field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      [section]: {
        ...(prev?.[section] || {}),
        [field]: value
      }
    }));
  };

  const updateService = (idx: number, field: string, value: any) => {
    if (selectedLanding === 'ecosistema') {
      setData((prev: any) => {
        const updated = [...(prev?.unidades || [])];
        if (field === 'imageUrl' || field === 'imagenUrl') {
          updated[idx] = { ...updated[idx], imagenUrl: value, imageUrl: value };
        } else {
          updated[idx] = { ...updated[idx], [field]: value };
        }
        return { ...prev, unidades: updated };
      });
    } else {
      setData((prev: any) => {
        const updated = [...(prev?.servicios || [])];
        updated[idx] = { ...updated[idx], [field]: value };
        return { ...prev, servicios: updated };
      });
    }
  };

  const deleteService = (idx: number) => {
    setData((prev: any) => ({
      ...prev,
      servicios: (prev?.servicios || []).filter((_: any, i: number) => i !== idx)
    }));
  };

  const addService = () => {
    if (selectedLanding === 'travelcab') {
      const newSvc = {
        id: `service_${Date.now()}`,
        name: "Nueva Categoría",
        description: "Descripción de la categoría de transporte y comodidades del sedán.",
        subTag: "Servicio Premium",
        ctaText: "Cotizar Ahora",
        eta: "4 - 7 min",
        imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80"
      };
      setData((prev: any) => ({
        ...prev,
        servicios: [...prev.servicios, newSvc]
      }));
    } else {
      const newSvc = {
        id: `service_${Date.now()}`,
        title: "Nuevo Servicio",
        summary: "Resumen corto del servicio.",
        imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
        modalDetail: "Detalles completos de la experiencia para mostrar en el popup modal."
      };
      setData((prev: any) => ({
        ...prev,
        servicios: [...prev.servicios, newSvc]
      }));
    }
  };

  // Funciones específicas para FAQ
  const updateFaq = (idx: number, field: string, value: any) => {
    setData((prev: any) => {
      if (selectedLanding === 'afiliados') {
        const faqs = [...(prev?.faqs || [])];
        faqs[idx] = { ...(faqs[idx] || {}), [field]: value };
        return { ...prev, faqs };
      }
      const items = [...(prev?.faq?.items || [])];
      items[idx] = { ...(items[idx] || {}), [field]: value };
      return {
        ...prev,
        faq: {
          ...(prev?.faq || {}),
          items
        }
      };
    });
  };

  const deleteFaq = (idx: number) => {
    setData((prev: any) => {
      if (selectedLanding === 'afiliados') {
        return { ...prev, faqs: (prev?.faqs || []).filter((_: any, i: number) => i !== idx) };
      }
      const items = (prev?.faq?.items || []).filter((_: any, i: number) => i !== idx);
      return {
        ...prev,
        faq: {
          ...(prev?.faq || {}),
          items
        }
      };
    });
  };

  const addFaq = () => {
    setData((prev: any) => {
      if (selectedLanding === 'afiliados') {
        return {
          ...prev,
          faqs: [...(prev?.faqs || []), { q: '¿Nueva Pregunta Frecuente?', a: 'Respuesta editable.' }]
        };
      }
      const newFaq = {
        question: "¿Nueva Pregunta Frecuente?",
        answer: "Detalle o respuesta de la pregunta frecuente editable."
      };
      return {
        ...prev,
        faq: {
          ...(prev?.faq || {}),
          items: [...(prev?.faq?.items || []), newFaq]
        }
      };
    });
  };

  // Helper functions for Experience heroSlides
  const updateHeroSlide = (idx: number, field: string, value: any) => {
    setData((prev: any) => {
      const updated = [...(prev.heroSlides || [])];
      const current = { ...(updated[idx] || {}) };
      if (field === 'bgImage' || field === 'imageUrl') {
        current.bgImage = value;
        current.imageUrl = value;
      } else if (field === 'ctaUrl' || field === 'ctaHref') {
        current.ctaUrl = value;
        current.ctaHref = value;
      } else if (field === 'videoUrl') {
        current.videoUrl = value;
        current.mediaType = value ? 'video' : 'image';
      } else {
        current[field] = value;
      }
      updated[idx] = current;
      return { ...prev, heroSlides: updated };
    });
  };

  const deleteHeroSlide = (idx: number) => {
    setData((prev: any) => ({ ...prev, heroSlides: (prev?.heroSlides || []).filter((_: any, i: number) => i !== idx) }));
  };

  const addHeroSlide = () => {
    if ((data.heroSlides || []).length >= 10) {
      alert('Límite de 10 diapositivas alcanzado');
      return;
    }
    const defaultImg = "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=80";
    const newSlide = {
      title: "Nueva Diapositiva",
      subtitle: "Subtítulo de la diapositiva",
      text: "Texto descriptivo de la excursión receptiva.",
      bgImage: defaultImg,
      imageUrl: defaultImg,
      videoUrl: "",
      mediaType: "image",
      ctaText: "Explorar Excursiones",
      ctaUrl: "#catalogo-excursiones",
      ctaHref: "#catalogo-excursiones",
      overlayOpacity: 45
    };
    setData((prev: any) => ({
      ...prev,
      heroSlides: [...(prev.heroSlides || []), newSlide]
    }));
  };

  // Helper functions for Experience carouselOffers
  const updateCarouselOffer = (idx: number, field: string, value: any) => {
    setData((prev: any) => {
      const updated = [...(prev?.carouselOffers || [])];
      updated[idx] = { ...(updated[idx] || {}), [field]: value };
      return { ...prev, carouselOffers: updated };
    });
  };

  const deleteCarouselOffer = (idx: number) => {
    setData((prev: any) => ({
      ...prev,
      carouselOffers: (prev?.carouselOffers || []).filter((_: any, i: number) => i !== idx)
    }));
  };

  const addCarouselOffer = () => {
    if ((data.carouselOffers || []).length >= 6) {
      alert('Límite de 6 ofertas alcanzado');
      return;
    }
    const newOffer = {
      imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80",
      title: "Nueva Oferta de Viaje",
      link: "#catalog"
    };
    setData((prev: any) => ({
      ...prev,
      carouselOffers: [...(prev.carouselOffers || []), newOffer]
    }));
  };

  // Helper functions for App Inicio cards
  const updateAppCard = (blockKey: 'block1' | 'block2', idx: number, field: string, value: any) => {
    setData((prev: any) => {
      const updated = [...(prev?.[blockKey]?.cards || [])];
      updated[idx] = { ...(updated[idx] || {}), [field]: value };
      return {
        ...prev,
        [blockKey]: {
          ...(prev?.[blockKey] || {}),
          cards: updated
        }
      };
    });
  };

  const deleteAppCard = (blockKey: 'block1' | 'block2', idx: number) => {
    setData((prev: any) => ({
      ...prev,
      [blockKey]: {
        ...(prev?.[blockKey] || {}),
        cards: (prev?.[blockKey]?.cards || []).filter((_: any, i: number) => i !== idx)
      }
    }));
  };

  const addAppCard = (blockKey: 'block1' | 'block2') => {
    const newCard = {
      title: blockKey === 'block1' ? "Nueva Promoción/Socio" : "Nuevo Beneficio/Canje",
      description: "Descripción detallada.",
      imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80",
      url: "https://travelapp.ar/rewards"
    };
    setData((prev: any) => ({
      ...prev,
      [blockKey]: {
        ...prev[blockKey],
        cards: [...(prev[blockKey]?.cards || []), newCard]
      }
    }));
  };

  const updateBlockTitle = (blockKey: 'block1' | 'block2', title: string) => {
    setData((prev: any) => ({
      ...prev,
      [blockKey]: {
        ...prev[blockKey],
        blockTitle: title
      }
    }));
  };

  // Referencia estable para el contexto de acciones (los inputs a nivel de módulo nunca pierden el foco)
  const actionsRef = useRef<CMSActionsContextValue>({
    updateField,
    updateService,
    updateFaq,
    updateHeroSlide,
    updateCarouselOffer,
    updateAppCard,
  });
  actionsRef.current = {
    updateField,
    updateService,
    updateFaq,
    updateHeroSlide,
    updateCarouselOffer,
    updateAppCard,
  };
  const [cmsActions] = useState<CMSActionsContextValue>(() => ({
    updateField: (...args) => actionsRef.current.updateField(...args),
    updateService: (...args) => actionsRef.current.updateService(...args),
    updateFaq: (...args) => actionsRef.current.updateFaq(...args),
    updateHeroSlide: (...args) => actionsRef.current.updateHeroSlide(...args),
    updateCarouselOffer: (...args) => actionsRef.current.updateCarouselOffer(...args),
    updateAppCard: (...args) => actionsRef.current.updateAppCard(...args),
  }));

  if (loading) {
    return (
      <div
        className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-white via-[#F5F7FA] to-[#ECEFF4] p-12 text-slate-500"
        style={{ fontFamily: "'Quicksand', sans-serif" }}
      >
        <RefreshCw className="h-8 w-8 animate-spin text-[#0a2a5b] mb-3" />
        <p className="text-sm font-semibold tracking-wide">Cargando base de datos del CMS...</p>
      </div>
    );
  }

  const CMS_SITES: {
    id: 'ecosistema' | 'travelcab' | 'experience' | 'lunaviajera' | 'rewards' | 'afiliados' | 'app-inicio';
    label: string;
    subtitle: string;
    previewUrl?: string;
    productionUrl?: string;
  }[] = [
    { id: 'ecosistema', label: 'Web Principal (travelapp.ar)', subtitle: 'Web + Marketplace + Buses', previewUrl: '/landing/ecosistema', productionUrl: 'https://travelapp.ar' },
    { id: 'travelcab', label: 'TravelCab', subtitle: 'Movilidad & Conductores', previewUrl: '/landing/travelcab', productionUrl: 'https://travelcab.ar' },
    { id: 'experience', label: 'TravelApp Experience', subtitle: 'Turismo & Excursiones', previewUrl: '/landing/experience', productionUrl: 'https://experience.travelapp.ar' },
    { id: 'lunaviajera', label: 'Luna Viajera', subtitle: 'Valles & Yungas', previewUrl: '/landing/lunaviajera' },
    { id: 'rewards', label: 'TravelApp Rewards', subtitle: 'Puntos & Canjes', previewUrl: '/landing/rewards', productionUrl: 'https://rewards.travelapp.ar' },
    { id: 'afiliados', label: 'Embajadores & Afiliados', subtitle: 'Programa de Referidos', previewUrl: '/landing/afiliados', productionUrl: 'https://afiliados.travelapp.ar' },
    { id: 'app-inicio', label: 'App Móvil (Tarjetas)', subtitle: 'Novedades & Beneficios App' },
  ];

  const activeSite = CMS_SITES.find((s) => s.id === selectedLanding) || CMS_SITES[0];
  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Operador');

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  return (
    <CMSActionsContext.Provider value={cmsActions}>
    <div
      className="min-h-screen flex bg-gradient-to-br from-white via-[#F5F7FA] to-[#ECEFF4] text-slate-800"
      style={{ fontFamily: "'Quicksand', sans-serif" }}
    >
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Minimalista CMS */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 bg-white/95 backdrop-blur-md border-r border-slate-200/80 flex flex-col justify-between p-4 transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5 overflow-y-auto pr-1">
          <div className="flex items-center justify-between px-2 pt-1">
            <img src="/assets/travelapp_original.svg" alt="TravelApp" className="h-7 w-auto" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              CMS Web · Sitios & Landings
            </p>
          </div>

          <nav className="space-y-1">
            {CMS_SITES.map((site) => {
              const active = selectedLanding === site.id;
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    setSelectedLanding(site.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition cursor-pointer ${
                    active
                      ? 'bg-[#0a2a5b] text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#0a2a5b]'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{site.label}</div>
                  <div className={`text-[10px] mt-0.5 ${active ? 'text-white/75' : 'text-slate-400'}`}>
                    {site.subtitle}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200/80 space-y-1">
          <Link
            href="/hr"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#0a2a5b] hover:bg-slate-100 transition"
          >
            <Briefcase className="w-4 h-4" />
            <span>RRHH · Puestos Web</span>
          </Link>
          <Link
            href="/travelapp"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#0a2a5b] hover:bg-slate-100 transition"
          >
            <Compass className="w-4 h-4" />
            <span>Módulo TravelApp</span>
          </Link>
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
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="truncate">
              <span className="text-sm font-bold text-[#0a2a5b] truncate">
                CMS Web · {activeSite.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeSite.previewUrl && (
              <a
                href={activeSite.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0a2a5b] hover:bg-slate-50 transition"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Vista Previa</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {activeSite.productionUrl && (
              <a
                href={activeSite.productionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                title={`Abrir dominio oficial ${activeSite.productionUrl}`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Producción</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Link
              href="/marketplace"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0a2a5b] hover:bg-slate-50 transition"
            >
              Marketplace ↗
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a2a5b] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#071f45] transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" /> Guardar Cambios
                </>
              )}
            </button>

            <button
              type="button"
              aria-label="Alertas"
              className="hidden sm:inline-flex p-2 rounded-lg text-slate-600 hover:text-[#0a2a5b] hover:bg-slate-100 transition cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-white">
              <Globe className="w-3.5 h-3.5 text-[#0a2a5b]" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as 'ES' | 'EN' | 'PT')}
                className="text-xs font-bold text-[#0a2a5b] bg-transparent outline-none cursor-pointer"
              >
                <option value="ES">ES</option>
                <option value="EN">EN</option>
                <option value="PT">PT</option>
              </select>
            </div>

            <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="text-right leading-tight">
                <p className="text-xs font-bold text-[#0a2a5b]">{displayName}</p>
                <p className="text-[10px] text-slate-400">CMS Admin</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-5">
      {/* MENSAJES DE ESTADO */}
      {statusMsg && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 shadow-sm animate-fadeIn ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="font-bold text-sm">{statusMsg.type === 'success' ? 'Éxito' : 'Error'}</p>
            <p className="text-xs mt-0.5">{statusMsg.text}</p>
          </div>
        </div>
      )}

      {/* PESTAÑAS DE EDICIÓN */}
      <div>
      <div className="flex border border-slate-200 border-b-0 overflow-x-auto gap-1.5 bg-white/90 px-4 pt-3 rounded-t-2xl">
        {(selectedLanding === 'travelcab' 
          ? ['hero', 'tc_pushpop', 'servicios', 'conductores', 'rewards', 'faq', 'legales'] 
          : selectedLanding === 'experience'
          ? ['slider', 'exp_pushpop', 'exp_buscador', 'exp_quienes', 'exp_marketplace', 'social', 'bus_cms']
          : selectedLanding === 'lunaviajera'
          ? ['lv_hero', 'lv_cards', 'lv_galeria', 'lv_catalogo', 'bus_cms', 'lv_travis', 'lv_quienes', 'lv_contacto']
          : selectedLanding === 'rewards'
          ? ['rew_slider', 'rew_pushpop', 'rew_beneficios', 'rew_negocio', 'rew_social', 'rew_legales']
          : selectedLanding === 'app-inicio'
          ? ['app_cards', 'app_rewards']
          : selectedLanding === 'afiliados'
          ? ['afi_hero', 'afi_pushpop', 'afi_cobro', 'afi_faq', 'afi_footer']
          : ['eco_hero', 'eco_promo', 'eco_buscador', 'eco_unidades', 'eco_apps', 'eco_quienes', 'eco_stats', 'eco_legales', 'eco_marketplace', 'bus_cms']
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as ActiveTab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab 
                ? 'border-tech-blue text-tech-blue bg-slate-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
            }`}
          >
            {tab === 'hero' && '1. Heros y Portada'}
            {tab === 'tc_pushpop' && '🔔 PushPop Promocional'}
            {tab === 'slider' && '🎬 1. Hero Slider HD / Video'}
            {tab === 'exp_pushpop' && '🔔 2. Push Pop Minimalista'}
            {tab === 'exp_buscador' && '🔍 3. Buscador & Travis IA'}
            {tab === 'exp_quienes' && '🏔️ 4. Nosotros (Visión, Misión & Valores)'}
            {tab === 'exp_marketplace' && '🛍️ 5. Cabecera Travel Market'}
            {tab === 'ofertas' && '2. Ofertas Carrusel (Max 6)'}
            {tab === 'servicios' && (selectedLanding === 'travelcab' ? '2. Servicios & Categorías' : '3. Tarjetas Servicios')}
            {tab === 'conductores' && '3. Híbrido Conductor'}
            {tab === 'rewards' && '4. Resumen Rewards'}
            {tab === 'faq' && '5. FAQ (Preguntas Frecuentes)'}
            {tab === 'legales' && '6. Legales & Redes'}
            {tab === 'social' && (selectedLanding === 'experience' ? '📞 6. Contacto, Footer, Redes & Legal' : '5. Redes & Footer')}
            {tab === 'lv_hero' && '🌙 1. Hero Slider (Valles & Yungas)'}
            {tab === 'lv_cards' && '🎴 2. 5 Tarjetas Flotantes'}
            {tab === 'lv_galeria' && '📸 3. Galería de Fotos'}
            {tab === 'lv_catalogo' && '🏔️ 4. Catálogo de Excursiones (Crear & Filtros)'}
            {tab === 'lv_travis' && '🤖 5. Asistente Travis & WhatsApp'}
            {tab === 'lv_quienes' && '🏔️ 6. Quiénes Somos'}
            {tab === 'lv_contacto' && '📞 7. Contacto & Redes'}
            {tab === 'eco_hero' && '1. Hero Slider (Hasta 10)'}
            {tab === 'eco_promo' && '🔔 2. Push Pop Promocional'}
            {tab === 'eco_buscador' && '🔍 3. Buscador, Promos & Filtros'}
            {tab === 'eco_unidades' && '4. Unidades de Negocio'}
            {tab === 'eco_apps' && '5. App, Rewards & Travis IA'}
            {tab === 'eco_quienes' && '6. Quiénes Somos'}
            {tab === 'eco_stats' && '7. Métricas'}
            {tab === 'eco_legales' && '8. Contacto, Footer, Redes & Legal'}
            {tab === 'eco_marketplace' && '9. Marketplace (Slider & Botones)'}
            {tab === 'rew_slider' && '🎁 1. Hero Slider & Cinta'}
            {tab === 'rew_pushpop' && '🔔 2. Push Pop Minimalista'}
            {tab === 'rew_beneficios' && '⭐ 3. Beneficios, Pasos & Wallet'}
            {tab === 'rew_negocio' && '🏢 4. Comercios Partners'}
            {tab === 'rew_social' && '📞 5. Contacto & Redes'}
            {tab === 'rew_legales' && '⚖️ 6. Legales, ARCA & Footer'}
            {tab === 'app_cards' && '📱 Tarjetas Novedades App'}
            {tab === 'app_rewards' && '🎁 Beneficios Rewards App'}
            {tab === 'afi_hero' && '⭐ 1. Hero, Cinta & Métricas'}
            {tab === 'afi_pushpop' && '🔔 2. Push Pop Minimalista'}
            {tab === 'afi_cobro' && '⚡ 3. Cobros, Paneles & Niveles'}
            {tab === 'afi_faq' && '❓ 4. Preguntas Frecuentes (FAQ)'}
            {tab === 'afi_footer' && '📞 5. Contacto, Redes, Legal & Footer'}
            {tab === 'bus_cms' && '🚌 Boletería Buses (Slider & Textos)'}
          </button>
        ))}
      </div>

      {/* CUERPO DEL EDITOR */}
      <div className="bg-white border border-slate-200 border-t-0 p-6 rounded-b-xl shadow-sm space-y-6">
        
        {/* ======================================================== */}
        {/* EDITORES TRAVELCAB */}
        {/* ======================================================== */}
        
        {selectedLanding === 'travelcab' && activeTab === 'hero' && (
          <div className="space-y-8">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-vial-orange" />
                Hero de Portada: Vista Pasajeros (Usuarios)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Este bloque se muestra al cargar la landing con el enfoque en usuarios de pasajeros.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Badge Superior"
                  value={data.pasajeroHero?.badge || ''}
                  onChange={(val) => updateField('pasajeroHero', 'badge', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Título Principal"
                  value={data.pasajeroHero?.title || ''}
                  onChange={(val) => updateField('pasajeroHero', 'title', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Subtítulo / Bajada descriptiva"
                  rows={2}
                  value={data.pasajeroHero?.subtitle || ''}
                  onChange={(val) => updateField('pasajeroHero', 'subtitle', val)}
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploaderInput 
                  label="Fondo de Imagen Principal" 
                  section="pasajeroHero" 
                  field="backgroundImage" 
                  value={data.pasajeroHero?.backgroundImage || ''} 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex justify-between">
                  <span>Opacidad de la Capa Oscura (Transparencia)</span>
                  <span className="text-tech-blue font-black">{data.pasajeroHero?.opacity !== undefined ? data.pasajeroHero.opacity : 55}%</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={data.pasajeroHero?.opacity !== undefined ? data.pasajeroHero.opacity : 55}
                    onChange={(e) => updateField('pasajeroHero', 'opacity', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-tech-blue"
                  />
                  <span className="text-xs text-slate-400 font-bold min-w-[70px]">
                    {Number(data.pasajeroHero?.opacity || 55) <= 35 ? 'Muy Claro' : Number(data.pasajeroHero?.opacity || 55) >= 70 ? 'Muy Oscuro' : 'Equilibrado'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Un porcentaje menor hace que la imagen de fondo sea más visible, pero ten cuidado de que los textos en blanco sigan siendo legibles.</p>
              </div>
            </div>

            <div className="border-b border-slate-100 pb-4 pt-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                <Users className="h-5 w-5 text-tech-blue" />
                Hero de Portada: Vista Conductores (Socios)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Bloque que aparece cuando el usuario cambia a modo "Quiero Conducir".</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Badge Superior Conductor"
                  value={data.conductorHero?.badge || ''}
                  onChange={(val) => updateField('conductorHero', 'badge', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Título Conductor"
                  value={data.conductorHero?.title || ''}
                  onChange={(val) => updateField('conductorHero', 'title', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Subtítulo Conductor"
                  rows={2}
                  value={data.conductorHero?.subtitle || ''}
                  onChange={(val) => updateField('conductorHero', 'subtitle', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Texto del Botón de Registro"
                  value={data.conductorHero?.ctaText || ''}
                  onChange={(val) => updateField('conductorHero', 'ctaText', val)}
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploaderInput 
                  label="Fondo de Imagen Conductor" 
                  section="conductorHero" 
                  field="backgroundImage" 
                  value={data.conductorHero?.backgroundImage || ''} 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex justify-between">
                  <span>Opacidad de la Capa Oscura (Transparencia)</span>
                  <span className="text-tech-blue font-black">{data.conductorHero?.opacity !== undefined ? data.conductorHero.opacity : 55}%</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={data.conductorHero?.opacity !== undefined ? data.conductorHero.opacity : 55}
                    onChange={(e) => updateField('conductorHero', 'opacity', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-tech-blue"
                  />
                  <span className="text-xs text-slate-400 font-bold min-w-[70px]">
                    {Number(data.conductorHero?.opacity || 55) <= 35 ? 'Muy Claro' : Number(data.conductorHero?.opacity || 55) >= 70 ? 'Muy Oscuro' : 'Equilibrado'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Un porcentaje menor hace que la imagen de fondo sea más visible, pero ten cuidado de que los textos en blanco sigan siendo legibles.</p>
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'tc_pushpop' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>🔔 PushPop Minimalista &amp; Novedades (TravelCab)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ventana emergente sobria y profesional para avisos informativos o promociones con cupón opcional al ingresar a travelcab.ar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Activar PushPop en TravelCab</h4>
                  <p className="text-[11px] text-slate-500">Si está desactivado, los visitantes no verán la ventana emergente.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(data.promoPushPop?.enabled)}
                    onChange={(e) => updateField('promoPushPop', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0a2a5b]" />
                </label>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Mostrar Cupón de Descuento</h4>
                  <p className="text-[11px] text-slate-500">Desactivalo para usar el Push Pop solo como aviso informativo.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(data.promoPushPop?.showDiscountCode)}
                    onChange={(e) => updateField('promoPushPop', 'showDiscountCode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0a2a5b]" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Badge / Etiqueta"
                value={data.promoPushPop?.badge || ''}
                onChange={(val) => updateField('promoPushPop', 'badge', val)}
                placeholder="Ej. NUEVO · TRASLADOS GLOBALES"
              />
              <CMSInput
                label="Demora de aparición (segundos)"
                type="number"
                value={String(data.promoPushPop?.delaySeconds ?? 4)}
                onChange={(val) => updateField('promoPushPop', 'delaySeconds', Math.max(0, Number(val) || 0))}
              />
            </div>

            {data.promoPushPop?.showDiscountCode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                <CMSInput
                  label="Código Promocional"
                  value={data.promoPushPop?.discountCode || ''}
                  onChange={(val) => updateField('promoPushPop', 'discountCode', val)}
                  placeholder="Ej. TRAVELCAB10"
                />
                <CMSInput
                  label="Etiqueta de Beneficio"
                  value={data.promoPushPop?.discountBadge || ''}
                  onChange={(val) => updateField('promoPushPop', 'discountBadge', val)}
                  placeholder="Ej. 10% OFF en tu primer viaje"
                />
              </div>
            )}

            <CMSInput
              label="Título Principal del PushPop"
              value={data.promoPushPop?.title || ''}
              onChange={(val) => updateField('promoPushPop', 'title', val)}
              placeholder="Ej. Traslados al Aeropuerto y en Todo el Mundo"
            />

            <CMSTextarea
              label="Descripción / Mensaje"
              value={data.promoPushPop?.subtitle || ''}
              onChange={(val) => updateField('promoPushPop', 'subtitle', val)}
              rows={3}
              placeholder="Detalles de la promoción o aviso informativo..."
            />

            <ImageUploaderInput
              label="Fotografía del PushPop (opcional)"
              section="promoPushPop"
              field="imageUrl"
              value={data.promoPushPop?.imageUrl || ''}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Texto del Botón CTA"
                value={data.promoPushPop?.ctaText || ''}
                onChange={(val) => updateField('promoPushPop', 'ctaText', val)}
                placeholder="Ej. Cotizar Traslado"
              />
              <CMSInput
                label="Enlace del Botón CTA"
                value={data.promoPushPop?.ctaUrl || ''}
                onChange={(val) => updateField('promoPushPop', 'ctaUrl', val)}
                placeholder="Ej. #web-dispatcher-card"
              />
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'servicios' && (
          <div className="space-y-8">
            {/* Bloque 2: 3 Tarjetas de Modalidades (Movilidad Urbana - Compartido - Traslados) */}
            <div className="space-y-4 border-b border-slate-200 pb-8">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Bloque 2: 3 Tarjetas de Servicios (Movilidad Urbana · Compartido · Traslados)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Edita las 3 tarjetas principales que aparecen debajo del Hero (ideal para destacar Movilidad Urbana, Compartido y futuros Traslados globales Civitatis).
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {(data.serviceModalities || DEFAULT_CMS_DATA.serviceModalities).map((card: any, idx: number) => {
                  const updateModalityCard = (field: string, value: string) => {
                    const current = Array.isArray(data.serviceModalities) && data.serviceModalities.length > 0
                      ? [...data.serviceModalities]
                      : [...DEFAULT_CMS_DATA.serviceModalities];
                    current[idx] = { ...current[idx], [field]: value };
                    setData((prev: any) => ({ ...prev, serviceModalities: current }));
                  };
                  return (
                    <div key={card.id || idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#0a2a5b]">
                          Tarjeta #{idx + 1} · Modalidad {card.modality || card.id}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <CMSInput
                          label="Título"
                          value={card.title || ''}
                          onChange={(val) => updateModalityCard('title', val)}
                        />
                        <CMSInput
                          label="Etiqueta / Tag"
                          value={card.tag || ''}
                          onChange={(val) => updateModalityCard('tag', val)}
                        />
                        <CMSInput
                          label="Texto Botón"
                          value={card.ctaText || ''}
                          onChange={(val) => updateModalityCard('ctaText', val)}
                        />
                        <div className="md:col-span-2">
                          <CMSInput
                            label="Descripción"
                            value={card.subtitle || ''}
                            onChange={(val) => updateModalityCard('subtitle', val)}
                          />
                        </div>
                        <div className="md:col-span-3">
                          <MediaFieldUploader
                            label="Imagen de la Tarjeta (Storage HD o URL)"
                            value={card.imageUrl || ''}
                            onChange={(val) => updateModalityCard('imageUrl', val)}
                            folder={`cms/travelcab/modality_${card.id || idx}`}
                          />
                        </div>
                        <div className="md:col-span-3 pt-2 border-t border-slate-200/70 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <CMSInput
                            label="Título Modal Criterios"
                            value={card.criteriaTitle || ''}
                            onChange={(val) => updateModalityCard('criteriaTitle', val)}
                            placeholder="Criterios de Selección..."
                          />
                          <div className="md:col-span-2">
                            <CMSTextarea
                              label="Criterios de Selección (uno por línea para el Modal)"
                              value={card.criteriaText || ''}
                              onChange={(val) => updateModalityCard('criteriaText', val)}
                              rows={3}
                              placeholder="• Criterio 1&#10;• Criterio 2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Categorías de Transporte (Servicios)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las categorías de vehículos, descripciones y ETAs de viaje.</p>
              </div>
              <button
                onClick={addService}
                className="inline-flex items-center gap-1.5 rounded-lg border border-tech-blue bg-tech-blue/5 px-3.5 py-2 text-xs font-bold text-tech-blue hover:bg-tech-blue hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Categoría
              </button>
            </div>

            <div className="space-y-4">
              {data.servicios?.map((item: any, idx: number) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteService(idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Categoría"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ServiceInput
                      label="Nombre Categoría"
                      value={item.name}
                      idx={idx}
                      field="name"
                    />
                    <ServiceInput
                      label="Subtítulo / Tag"
                      value={item.subTag}
                      idx={idx}
                      field="subTag"
                    />
                    <ServiceInput
                      label="ETA Estimado"
                      value={item.eta}
                      idx={idx}
                      field="eta"
                    />
                    <div className="md:col-span-2">
                      <ServiceInput
                        label="Descripción Corta"
                        value={item.description}
                        idx={idx}
                        field="description"
                      />
                    </div>
                    <ServiceInput
                      label="Texto Botón Llamado Acción"
                      value={item.ctaText}
                      idx={idx}
                      field="ctaText"
                    />
                    <div className="md:col-span-3">
                      <ServiceImageUploader
                        idx={idx}
                        value={item.imageUrl}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'conductores' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Sección Esquemas de Trabajo de Socios</h3>
              <p className="text-xs text-slate-400 mt-1">Configura los detalles sobre Comisión y Membresía del portal de conductores.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Título Sección"
                  value={data.tiposTrabajo?.title || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'title', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Subtítulo Sección"
                  value={data.tiposTrabajo?.subtitle || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'subtitle', val)}
                />
              </div>
              <div className="border-t border-slate-100 pt-4 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Esquema Comisión</h4>
              </div>
              <div>
                <CMSInput
                  label="Título Comisión"
                  value={data.tiposTrabajo?.comisionTitulo || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'comisionTitulo', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Detalles de Comisión"
                  value={data.tiposTrabajo?.comisionTexto || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'comisionTexto', val)}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Esquema Membresía Fija</h4>
              </div>
              <div>
                <CMSInput
                  label="Título Membresía"
                  value={data.tiposTrabajo?.membresiaTitulo || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'membresiaTitulo', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Detalles de Membresía"
                  value={data.tiposTrabajo?.membresiaTexto || ''}
                  onChange={(val) => updateField('tiposTrabajo', 'membresiaTexto', val)}
                />
              </div>
            </div>

            {/* Bloque Split de Pagos (Mercado Pago, CBU/CVU y bindX) */}
            <div className="border-t border-slate-200 pt-6 space-y-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Split de Pagos (Mercado Pago / CBU-CVU / bindX)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Explica cómo cobran los conductores al enlazar Mercado Pago o usando otro CBU/CVU, y la nota de migración a bindX.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="Badge"
                  value={data.driverSplitPayments?.badge ?? DEFAULT_CMS_DATA.driverSplitPayments.badge}
                  onChange={(val) => updateField('driverSplitPayments', 'badge', val)}
                />
                <CMSInput
                  label="Título del Bloque"
                  value={data.driverSplitPayments?.title ?? DEFAULT_CMS_DATA.driverSplitPayments.title}
                  onChange={(val) => updateField('driverSplitPayments', 'title', val)}
                />
                <div className="md:col-span-2">
                  <CMSTextarea
                    label="Subtítulo del Bloque"
                    value={data.driverSplitPayments?.subtitle ?? DEFAULT_CMS_DATA.driverSplitPayments.subtitle}
                    onChange={(val) => updateField('driverSplitPayments', 'subtitle', val)}
                    rows={2}
                  />
                </div>
                <CMSInput
                  label="Título Opción 1 (Mercado Pago)"
                  value={data.driverSplitPayments?.mpTitle ?? DEFAULT_CMS_DATA.driverSplitPayments.mpTitle}
                  onChange={(val) => updateField('driverSplitPayments', 'mpTitle', val)}
                />
                <CMSInput
                  label="Título Opción 2 (CBU / CVU)"
                  value={data.driverSplitPayments?.cbuTitle ?? DEFAULT_CMS_DATA.driverSplitPayments.cbuTitle}
                  onChange={(val) => updateField('driverSplitPayments', 'cbuTitle', val)}
                />
                <CMSTextarea
                  label="Explicación Split Mercado Pago"
                  value={data.driverSplitPayments?.mpDescription ?? DEFAULT_CMS_DATA.driverSplitPayments.mpDescription}
                  onChange={(val) => updateField('driverSplitPayments', 'mpDescription', val)}
                  rows={3}
                />
                <CMSTextarea
                  label="Explicación Cobros con Otro CBU / CVU"
                  value={data.driverSplitPayments?.cbuDescription ?? DEFAULT_CMS_DATA.driverSplitPayments.cbuDescription}
                  onChange={(val) => updateField('driverSplitPayments', 'cbuDescription', val)}
                  rows={3}
                />
                <div className="md:col-span-2">
                  <CMSTextarea
                    label="Nota de Transición a bindX"
                    value={data.driverSplitPayments?.bindxNote ?? DEFAULT_CMS_DATA.driverSplitPayments.bindxNote}
                    onChange={(val) => updateField('driverSplitPayments', 'bindxNote', val)}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Requisitos de Aceptación Conductores y Vehículos */}
            <div className="border-t border-slate-200 pt-6 space-y-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Requisitos de Aceptación (Conductores y Vehículos)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Se muestra como tarjeta y modal detallado dentro del portal de conductores.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="Badge"
                  value={data.driverRequirements?.badge ?? DEFAULT_CMS_DATA.driverRequirements.badge}
                  onChange={(val) => updateField('driverRequirements', 'badge', val)}
                />
                <CMSInput
                  label="Título"
                  value={data.driverRequirements?.title ?? DEFAULT_CMS_DATA.driverRequirements.title}
                  onChange={(val) => updateField('driverRequirements', 'title', val)}
                />
                <div className="md:col-span-2">
                  <CMSInput
                    label="Subtítulo"
                    value={data.driverRequirements?.subtitle ?? DEFAULT_CMS_DATA.driverRequirements.subtitle}
                    onChange={(val) => updateField('driverRequirements', 'subtitle', val)}
                  />
                </div>
                <CMSTextarea
                  label="Requisitos del Conductor (uno por línea)"
                  value={data.driverRequirements?.driverReqs ?? DEFAULT_CMS_DATA.driverRequirements.driverReqs}
                  onChange={(val) => updateField('driverRequirements', 'driverReqs', val)}
                  rows={5}
                />
                <CMSTextarea
                  label="Requisitos del Vehículo (uno por línea)"
                  value={data.driverRequirements?.vehicleReqs ?? DEFAULT_CMS_DATA.driverRequirements.vehicleReqs}
                  onChange={(val) => updateField('driverRequirements', 'vehicleReqs', val)}
                  rows={5}
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'rewards' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Bloque Informativo Rewards</h3>
              <p className="text-xs text-slate-400 mt-1">Configura la sección que promociona el sistema de acumulación de puntos de fidelidad.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Título Informativo"
                  value={data.resumenRewards?.title || ''}
                  onChange={(val) => updateField('resumenRewards', 'title', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Badge del Programa"
                  value={data.resumenRewards?.badgeText || ''}
                  onChange={(val) => updateField('resumenRewards', 'badgeText', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Etiqueta Destacada (opcional · dejalo vacío para ocultar)"
                  value={data.resumenRewards?.pointsText || ''}
                  onChange={(val) => updateField('resumenRewards', 'pointsText', val)}
                  placeholder="Sumá Puntos en Cada Viaje"
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Subtítulo Explicativo"
                  value={data.resumenRewards?.subtitle || ''}
                  onChange={(val) => updateField('resumenRewards', 'subtitle', val)}
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploaderInput 
                  label="Imagen Ilustrativa Rewards" 
                  section="resumenRewards" 
                  field="imageUrl" 
                  value={data.resumenRewards?.imageUrl || ''} 
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Preguntas Frecuentes (FAQ)</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <HelpCircle className="h-4 w-4 text-tech-blue" />
                  Administra las preguntas que se mostrarán en la sección de FAQ de la Landing Page.
                </p>
              </div>
              <button
                onClick={addFaq}
                className="inline-flex items-center gap-1.5 rounded-lg border border-tech-blue bg-tech-blue/5 px-3.5 py-2 text-xs font-bold text-tech-blue hover:bg-tech-blue hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Pregunta
              </button>
            </div>

            <div className="space-y-4">
              {data.faq?.items?.map((item: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteFaq(idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Pregunta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  <div className="grid grid-cols-1 gap-3 max-w-[90%]">
                    <FaqInput
                      label={`Pregunta Frecuente N° ${idx + 1}`}
                      value={item.question}
                      idx={idx}
                      field="question"
                    />
                    <FaqTextarea
                      label="Respuesta / Explicación"
                      value={item.answer}
                      idx={idx}
                      field="answer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'travelcab' && activeTab === 'legales' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Contacto, Footer & Redes Sociales</h3>
              <p className="text-xs text-slate-400 mt-1">Modificá el teléfono de atención, copyright del pie de página, perfiles sociales y el WhatsApp oficial (5493812000712).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <CMSInput
                label="Teléfono de Atención (Header y Footer)"
                value={data.contact?.phone || ''}
                onChange={(val) => updateField('contact', 'phone', val)}
                placeholder="0810-220-0018"
              />
              <CMSInput
                label="Texto Copyright Footer"
                value={data.footer?.copyright || ''}
                onChange={(val) => updateField('footer', 'copyright', val)}
                placeholder="© 2026 TravelCab. Todos los derechos reservados."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CMSInput
                  label="Página de Facebook"
                  value={data.redesSociales?.facebook || ''}
                  onChange={(val) => updateField('redesSociales', 'facebook', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Página de Instagram"
                  value={data.redesSociales?.instagram || ''}
                  onChange={(val) => updateField('redesSociales', 'instagram', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Canal de Facebook Messenger"
                  value={data.redesSociales?.messenger || ''}
                  onChange={(val) => updateField('redesSociales', 'messenger', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Enlace / API WhatsApp (Mensaje por defecto)"
                  value={data.redesSociales?.whatsapp || ''}
                  onChange={(val) => updateField('redesSociales', 'whatsapp', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Canal de YouTube"
                  value={data.redesSociales?.youtube || ''}
                  onChange={(val) => updateField('redesSociales', 'youtube', val)}
                />
              </div>
              <div>
                <CMSInput
                  label="Perfil de TikTok"
                  value={data.redesSociales?.tiktok || ''}
                  onChange={(val) => updateField('redesSociales', 'tiktok', val)}
                />
              </div>
            </div>

            <div className="border-b border-slate-100 pb-4 pt-4">
              <h3 className="text-base font-extrabold text-slate-800">Sellos Gubernamentales y de Registro</h3>
              <p className="text-xs text-slate-400 mt-1">Configura el código QR de ARCA y el sello de Registro Nacional de Base de Datos (soporta código HTML/script o URL de imagen).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSTextarea
                label="Código o URL del Sello QR ARCA"
                value={data.sellosLegales?.arcaQr || ''}
                onChange={(val) => updateField('sellosLegales', 'arcaQr', val)}
                rows={3}
              />
              <CMSTextarea
                label="Código o URL del Sello Registro Nacional de Base de Datos"
                value={data.sellosLegales?.baseDatosSello || ''}
                onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)}
                rows={3}
              />
            </div>

            <div className="border-b border-slate-100 pb-4 pt-4">
              <h3 className="text-base font-extrabold text-slate-800">Contenido Legal Integrado (Popups / Modales)</h3>
              <p className="text-xs text-slate-400 mt-1">Escribe las bases legales y Quiénes Somos.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <CMSTextarea
                  label="Quiénes Somos (Presentación de la Empresa)"
                  rows={4}
                  value={data.legales?.quienesSomos || ''}
                  onChange={(val) => updateField('legales', 'quienesSomos', val)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <CMSTextarea
                  label="Términos y Condiciones Generales"
                  rows={5}
                  value={data.legales?.terminosCondiciones || ''}
                  onChange={(val) => updateField('legales', 'terminosCondiciones', val)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <CMSTextarea
                  label="Políticas de Privacidad"
                  rows={5}
                  value={data.legales?.politicasPrivacidad || ''}
                  onChange={(val) => updateField('legales', 'politicasPrivacidad', val)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* EDITORES TRAVELAPP EXPERIENCE */}
        {/* ======================================================== */}

        {/* EXPERIENCE: PUSH POP MINIMALISTA (CON CUPÓN OPCIONAL) */}
        {selectedLanding === 'experience' && activeTab === 'exp_pushpop' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>🔔 Push Pop Minimalista (Avisos o Promociones)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ventana emergente sobria y profesional para comunicar novedades o beneficios en experience.travelapp.ar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Activar Push Pop</h4>
                  <p className="text-[11px] text-slate-500">Habilita la ventana emergente al abrir la web.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={data.promoPushPop?.enabled === true}
                    onChange={(e) => updateField('promoPushPop', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff5a19]" />
                </label>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Mostrar Cupón de Descuento</h4>
                  <p className="text-[11px] text-slate-500">Desactivalo si es un aviso informativo sin código promocional.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={data.promoPushPop?.showDiscountCode === true}
                    onChange={(e) => updateField('promoPushPop', 'showDiscountCode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0a2a5b]" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Badge / Etiqueta Superior"
                value={data.promoPushPop?.badge || ''}
                onChange={(val) => updateField('promoPushPop', 'badge', val)}
                placeholder="Ej. TEMPORADA NORTE 2026"
              />
              {data.promoPushPop?.showDiscountCode === true ? (
                <CMSInput
                  label="Código de Cupón de Descuento"
                  value={data.promoPushPop?.discountCode || ''}
                  onChange={(val) => updateField('promoPushPop', 'discountCode', val)}
                  placeholder="Ej. NORTE2026"
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 flex items-center text-[11px] text-slate-400">
                  Bloque de cupón deshabilitado (modo aviso informativo).
                </div>
              )}
            </div>

            <CMSInput
              label="Título del Aviso / Promoción"
              value={data.promoPushPop?.title || ''}
              onChange={(val) => updateField('promoPushPop', 'title', val)}
              placeholder="Ej. Viví el Norte Argentino con TravelApp Experience"
            />

            <CMSTextarea
              label="Descripción"
              value={data.promoPushPop?.subtitle || ''}
              onChange={(val) => updateField('promoPushPop', 'subtitle', val)}
              rows={3}
              placeholder="Detalles de la novedad o beneficio..."
            />

            <ImageUploaderInput
              label="Imagen Editorial (opcional — dejar vacío para formato compacto)"
              section="promoPushPop"
              field="imageUrl"
              value={data.promoPushPop?.imageUrl || ''}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Texto del Botón CTA"
                value={data.promoPushPop?.ctaText || ''}
                onChange={(val) => updateField('promoPushPop', 'ctaText', val)}
                placeholder="Ej. Ver Excursiones"
              />
              <CMSInput
                label="Enlace del Botón CTA"
                value={data.promoPushPop?.ctaUrl || ''}
                onChange={(val) => updateField('promoPushPop', 'ctaUrl', val)}
                placeholder="Ej. /landing/experience/marketplace"
              />
            </div>
          </div>
        )}

        {/* EXPERIENCE: SLIDER HERO & VIDEO LOOP (HASTA 10 DIAPOSITIVAS) */}
        {selectedLanding === 'experience' && activeTab === 'slider' && (() => {
          const expSlides: any[] = Array.isArray(data.heroSlides) ? data.heroSlides : [];
          const moveExpSlide = (idx: number, dir: -1 | 1) => {
            const target = idx + dir;
            if (target < 0 || target >= expSlides.length) return;
            const next = [...expSlides];
            const [item] = next.splice(idx, 1);
            next.splice(target, 0, item);
            setData((prev: any) => ({ ...prev, heroSlides: next }));
          };

          return (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Hero Slider HD / Video — experience.travelapp.ar ({expSlides.length} / 10 diapositivas)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Configurá hasta 10 diapositivas con fotografía 4K o video `.mp4` en loop, botones CTA y oscurecimiento.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={expSlides.length >= 10}
                  onClick={addHeroSlide}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] px-3.5 py-2 text-xs font-bold text-white transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar Diapositiva ({expSlides.length}/10)
                </button>
              </div>

              <div className="space-y-4">
                {expSlides.map((slide: any, idx: number) => (
                  <div key={slide.id || idx} className="rounded-2xl border border-slate-200 p-5 bg-slate-50/70 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-md bg-[#0a2a5b] text-white text-[11px] font-black">
                          Slide #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-600 truncate max-w-xs sm:max-w-md">
                          {slide.title || 'Sin título'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveExpSlide(idx, -1)}
                          title="Subir orden"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === expSlides.length - 1}
                          onClick={() => moveExpSlide(idx, 1)}
                          title="Bajar orden"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        {expSlides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteHeroSlide(idx)}
                            title="Eliminar diapositiva"
                            className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CMSInput
                        label="Título Editorial Principal"
                        value={slide.title || ''}
                        onChange={(val) => updateHeroSlide(idx, 'title', val)}
                        placeholder="Ej. Salinas Grandes"
                      />
                      <CMSInput
                        label="Subtítulo"
                        value={slide.subtitle || slide.text || ''}
                        onChange={(val) => {
                          updateHeroSlide(idx, 'subtitle', val);
                          updateHeroSlide(idx, 'text', val);
                        }}
                        placeholder="Ej. Inmensidad blanca a 3.450 metros de altura."
                      />
                      <CMSInput
                        label="Botón Primario (Texto)"
                        value={slide.ctaText || ''}
                        onChange={(val) => updateHeroSlide(idx, 'ctaText', val)}
                        placeholder="Más información"
                      />
                      <CMSInput
                        label="Botón Primario (URL)"
                        value={slide.ctaUrl || slide.ctaHref || ''}
                        onChange={(val) => updateHeroSlide(idx, 'ctaUrl', val)}
                        placeholder="#catalogo-excursiones"
                      />
                      <CMSInput
                        label="Botón Secundario (Texto)"
                        value={slide.secondaryCtaText || ''}
                        onChange={(val) => updateHeroSlide(idx, 'secondaryCtaText', val)}
                        placeholder="Reservar"
                      />
                      <CMSInput
                        label="Botón Secundario (URL)"
                        value={slide.secondaryCtaUrl || ''}
                        onChange={(val) => updateHeroSlide(idx, 'secondaryCtaUrl', val)}
                        placeholder="#catalogo-excursiones"
                      />
                    </div>

                    <MediaFieldUploader
                      label="Imagen de Fondo HD (o Poster del Video)"
                      value={slide.bgImage || slide.imageUrl || ''}
                      folder="cms_experience_slides"
                      onChange={(url) => updateHeroSlide(idx, 'bgImage', url)}
                    />

                    <MediaFieldUploader
                      label="Video HD en Loop .mp4 / .webm (opcional)"
                      value={slide.videoUrl || ''}
                      allowVideo={true}
                      folder="cms_experience_videos"
                      placeholder="https://.../video.mp4 (dejar vacío si solo usa imagen)"
                      onChange={(url) => updateHeroSlide(idx, 'videoUrl', url)}
                    />

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Opacidad de capa oscura del Hero: <strong>{slide.overlayOpacity ?? 45}%</strong>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="85"
                        value={slide.overlayOpacity ?? 45}
                        onChange={(e) => updateHeroSlide(idx, 'overlayOpacity', Number(e.target.value))}
                        className="w-full accent-[#0a2a5b]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* EXPERIENCE: NOSOTROS (MODAL VISIÓN, MISIÓN & VALORES) */}
        {selectedLanding === 'experience' && activeTab === 'exp_quienes' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">🏔️ Nosotros — Visión, Misión y Valores</h3>
              <p className="text-xs text-slate-400 mt-1">
                Estos textos se muestran al abrir el modal &ldquo;Nosotros&rdquo; desde la barra superior y el Footer de experience.travelapp.ar.
              </p>
            </div>

            <CMSTextarea
              label="Nuestra Visión"
              value={data.quienesSomos?.vision || ''}
              onChange={(val) => updateField('quienesSomos', 'vision', val)}
              rows={4}
            />
            <CMSTextarea
              label="Nuestra Misión"
              value={data.quienesSomos?.mision || ''}
              onChange={(val) => updateField('quienesSomos', 'mision', val)}
              rows={4}
            />
            <CMSTextarea
              label="Nuestros Valores (podés usar saltos de línea para cada valor)"
              value={data.quienesSomos?.valores || ''}
              onChange={(val) => updateField('quienesSomos', 'valores', val)}
              rows={5}
            />
          </div>
        )}

        {/* EXPERIENCE: CABECERA DEL MARKETPLACE */}
        {selectedLanding === 'experience' && activeTab === 'exp_marketplace' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">🛍️ Cabecera Travel Market (experience.travelapp.ar/marketplace)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Editá la etiqueta superior, título editorial y bajada del catálogo receptivo. Las excursiones se gestionan desde el módulo Experiencias.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/landing/experience/marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#0a2a5b] hover:bg-slate-50"
                >
                  Ver Travel Market ↗
                </a>
                <Link
                  href="/experiences/catalog"
                  className="px-3 py-1.5 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45]"
                >
                  Ir a Catálogo Excursiones ↗
                </Link>
              </div>
            </div>

            <CMSInput
              label="Etiqueta Superior (Badge)"
              value={data.marketplaceHero?.tag || ''}
              onChange={(val) => updateField('marketplaceHero', 'tag', val)}
              placeholder="TravelApp Experience · Catálogo Oficial Receptivo"
            />
            <CMSInput
              label="Título Principal"
              value={data.marketplaceHero?.title || ''}
              onChange={(val) => updateField('marketplaceHero', 'title', val)}
              placeholder="Marketplace de Experiencias."
            />
            <CMSTextarea
              label="Subtítulo / Descripción Editorial"
              value={data.marketplaceHero?.subtitle || ''}
              onChange={(val) => updateField('marketplaceHero', 'subtitle', val)}
              rows={3}
              placeholder="Explorá todas nuestras excursiones verificadas..."
            />
          </div>
        )}

        {/* EXPERIENCE: BUSCADOR & TRAVIS CONCIERGE */}
        {selectedLanding === 'experience' && activeTab === 'exp_buscador' && data && (() => {
          const origenes: string[] = Array.isArray(data.searchConfig?.origenes)
            ? data.searchConfig.origenes
            : DEFAULT_EXPERIENCE_CMS_DATA.searchConfig.origenes;
          const highlights: string[] = Array.isArray(data.travisSection?.highlights)
            ? data.travisSection.highlights
            : DEFAULT_EXPERIENCE_CMS_DATA.travisSection.highlights;

          return (
            <div className="space-y-8">
              {/* 1. BUSCADOR */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-800">1. Barra Buscadora de Excursiones &amp; Traslados</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Habilitá las pestañas del buscador y personalizá los títulos y ciudades de origen disponibles.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'showExcursiones', label: 'Mostrar Excursiones' },
                    { key: 'showTraslados', label: 'Mostrar Traslados' },
                    { key: 'showBuses', label: 'Mostrar Pasajes en Bus' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-700">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={data.searchConfig?.[item.key] !== false}
                        onChange={(e) => updateField('searchConfig', item.key, e.target.checked)}
                        className="h-4 w-4 accent-[#0a2a5b]"
                      />
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput
                    label="Título Modo Excursiones"
                    value={data.searchConfig?.excursionesTitle || ''}
                    onChange={(val) => updateField('searchConfig', 'excursionesTitle', val)}
                    placeholder="Encontrá tu próxima experiencia."
                  />
                  <CMSInput
                    label="Título Modo Traslados"
                    value={data.searchConfig?.trasladosTitle || ''}
                    onChange={(val) => updateField('searchConfig', 'trasladosTitle', val)}
                    placeholder="Solicitá tu traslado punto a punto."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600">Ciudades de Origen en el Desplegable</label>
                    <button
                      type="button"
                      onClick={() => updateField('searchConfig', 'origenes', [...origenes, 'Nueva Ciudad'])}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0a2a5b] border border-[#0a2a5b]/30 px-2.5 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar Origen
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {origenes.map((orig, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={orig}
                          onChange={(e) => {
                            const next = [...origenes];
                            next[idx] = e.target.value;
                            updateField('searchConfig', 'origenes', next);
                          }}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-[#0a2a5b]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateField('searchConfig', 'origenes', origenes.filter((_, i) => i !== idx))
                          }
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. TRAVIS CONCIERGE */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">2. Sección Travis Concierge IA</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bloque editorial de atención 24/7 con despliegue de canales oficiales (WhatsApp, Messenger, Instagram y Teléfono).
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.travisSection?.enabled !== false}
                      onChange={(e) => updateField('travisSection', 'enabled', e.target.checked)}
                      className="h-4 w-4 accent-[#0a2a5b]"
                    />
                    Mostrar sección Travis
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput
                    label="Título Travis"
                    value={data.travisSection?.title || ''}
                    onChange={(val) => updateField('travisSection', 'title', val)}
                    placeholder="Travis. Tu asistente personal de viaje."
                  />
                  <CMSInput
                    label="Texto del Botón CTA"
                    value={data.travisSection?.ctaText || ''}
                    onChange={(val) => updateField('travisSection', 'ctaText', val)}
                    placeholder="Hablar con Travis"
                  />
                </div>
                <CMSTextarea
                  label="Subtítulo Travis"
                  value={data.travisSection?.subtitle || ''}
                  onChange={(val) => updateField('travisSection', 'subtitle', val)}
                  rows={2}
                />

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600">Destacados (franja horizontal de 3 ítems)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[0, 1, 2].map((idx) => (
                      <CMSInput
                        key={idx}
                        value={highlights[idx] || ''}
                        onChange={(val) => {
                          const next = [...highlights];
                          next[idx] = val;
                          updateField('travisSection', 'highlights', next);
                        }}
                        placeholder={`Destacado #${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ======================================================== */}
        {/* EDITORES TRAVELAPP REWARDS */}
        {/* ======================================================== */}

        {/* REWARDS: SLIDER, CINTA SUPERIOR & MÉTRICAS */}
        {selectedLanding === 'rewards' && activeTab === 'rew_slider' && data && (() => {
          const rewSlides: any[] = Array.isArray(data.heroSlides) ? data.heroSlides : [];
          const heroMetrics: any[] =
            Array.isArray(data.heroMetrics) && data.heroMetrics.length > 0
              ? data.heroMetrics
              : DEFAULT_REWARDS_CMS_DATA_FOR_CMS.heroMetrics;

          const moveRewSlide = (idx: number, dir: -1 | 1) => {
            const target = idx + dir;
            if (target < 0 || target >= rewSlides.length) return;
            const next = [...rewSlides];
            const [item] = next.splice(idx, 1);
            next.splice(target, 0, item);
            setData((prev: any) => ({ ...prev, heroSlides: next }));
          };

          return (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-violet-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#0a2a5b]">
                    🎁 Hero Slider Rewards ({rewSlides.length} / 10 diapositivas)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Editá la cinta superior, los slides principales (sube a Storage) y las 4 métricas de la portada de rewards.travelapp.ar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/rewards"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#0a2a5b] hover:bg-slate-50"
                  >
                    Ir a Módulo Rewards ↗
                  </Link>
                  <button
                    type="button"
                    disabled={rewSlides.length >= 10}
                    onClick={() => {
                      if (rewSlides.length >= 10) return;
                      setData((prev: any) => ({
                        ...prev,
                        heroSlides: [
                          ...rewSlides,
                          {
                            title: "Nueva Diapositiva",
                            subtitle: "Subtítulo descriptivo del programa Rewards.",
                            text: "Membresía digital sin cargo.",
                            bgImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85",
                            ctaText: "Ver Catálogo de Canjes",
                            ctaUrl: "/canjes",
                            overlayOpacity: 60,
                          },
                        ],
                      }));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] px-3.5 py-2 text-xs font-bold text-white transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar Slide ({rewSlides.length}/10)
                  </button>
                </div>
              </div>

              <CMSInput
                label="Texto de Cinta Superior (Ribbon)"
                value={data.ribbonText || ''}
                onChange={(val) => setData((prev: any) => ({ ...prev, ribbonText: val }))}
                placeholder="Sumá 10 Puntos Travel por cada kilómetro recorrido o reserva confirmada."
              />

              <div className="space-y-4">
                {rewSlides.map((slide: any, idx: number) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 p-5 bg-slate-50/70 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                      <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-md bg-[#0a2a5b] text-white text-[11px] font-black">
                        Slide #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveRewSlide(idx, -1)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === rewSlides.length - 1}
                          onClick={() => moveRewSlide(idx, 1)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        {rewSlides.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setData((prev: any) => ({
                                ...prev,
                                heroSlides: rewSlides.filter((_: any, i: number) => i !== idx),
                              }))
                            }
                            className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <MediaFieldUploader
                      label="Imagen de Fondo HD (sube a Firebase Storage)"
                      value={slide.bgImage || ''}
                      folder="cms_rewards_hero"
                      onChange={(url) => {
                        const u = [...rewSlides];
                        u[idx] = { ...u[idx], bgImage: url };
                        setData((p: any) => ({ ...p, heroSlides: u }));
                      }}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CMSInput
                        label="Título Principal"
                        value={slide.title || ''}
                        onChange={(val) => {
                          const u = [...rewSlides];
                          u[idx] = { ...u[idx], title: val };
                          setData((p: any) => ({ ...p, heroSlides: u }));
                        }}
                      />
                      <CMSInput
                        label="Subtítulo"
                        value={slide.subtitle || ''}
                        onChange={(val) => {
                          const u = [...rewSlides];
                          u[idx] = { ...u[idx], subtitle: val };
                          setData((p: any) => ({ ...p, heroSlides: u }));
                        }}
                      />
                      <div className="md:col-span-2">
                        <CMSTextarea
                          label="Línea adicional (opcional)"
                          rows={2}
                          value={slide.text || ''}
                          onChange={(val) => {
                            const u = [...rewSlides];
                            u[idx] = { ...u[idx], text: val };
                            setData((p: any) => ({ ...p, heroSlides: u }));
                          }}
                        />
                      </div>
                      <CMSInput
                        label="Texto Botón CTA"
                        value={slide.ctaText || ''}
                        onChange={(val) => {
                          const u = [...rewSlides];
                          u[idx] = { ...u[idx], ctaText: val };
                          setData((p: any) => ({ ...p, heroSlides: u }));
                        }}
                      />
                      <CMSInput
                        label="Enlace Botón CTA"
                        value={slide.ctaUrl || ''}
                        onChange={(val) => {
                          const u = [...rewSlides];
                          u[idx] = { ...u[idx], ctaUrl: val };
                          setData((p: any) => ({ ...p, heroSlides: u }));
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Opacidad de la capa oscura: <strong>{slide.overlayOpacity ?? 60}%</strong>
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={slide.overlayOpacity ?? 60}
                        onChange={(e) => {
                          const u = [...rewSlides];
                          u[idx] = { ...u[idx], overlayOpacity: Number(e.target.value) };
                          setData((p: any) => ({ ...p, heroSlides: u }));
                        }}
                        className="w-full accent-[#0a2a5b]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 4 Métricas al pie del Hero */}
              <div className="border-t border-slate-200 pt-5 space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  4 Métricas al pie del Hero
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {heroMetrics.slice(0, 4).map((m: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <CMSInput
                        label={`Dato #${idx + 1}`}
                        value={m.value || ''}
                        onChange={(val) => {
                          const next = [...heroMetrics];
                          next[idx] = { ...next[idx], value: val };
                          setData((p: any) => ({ ...p, heroMetrics: next }));
                        }}
                      />
                      <CMSInput
                        label="Descripción"
                        value={m.label || ''}
                        onChange={(val) => {
                          const next = [...heroMetrics];
                          next[idx] = { ...next[idx], label: val };
                          setData((p: any) => ({ ...p, heroMetrics: next }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* REWARDS: PUSH POP MINIMALISTA */}
        {selectedLanding === 'rewards' && activeTab === 'rew_pushpop' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">🔔 Push Pop Minimalista — rewards.travelapp.ar</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ventana emergente minimalista para comunicados, promociones de puntos o cupones (cupón opcional).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Activar Push Pop</h4>
                  <p className="text-[11px] text-slate-500">Habilita la ventana emergente al abrir la web.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={data.promoPushPop?.enabled === true}
                    onChange={(e) => updateField('promoPushPop', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff5a19]" />
                </label>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Mostrar Cupón de Descuento</h4>
                  <p className="text-[11px] text-slate-500">Desactivalo para usar el Push Pop solo como aviso informativo.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={data.promoPushPop?.showDiscountCode === true}
                    onChange={(e) => updateField('promoPushPop', 'showDiscountCode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0a2a5b]" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput label="Badge / Etiqueta Superior" value={data.promoPushPop?.badge || ''} onChange={(val) => updateField('promoPushPop', 'badge', val)} />
              {data.promoPushPop?.showDiscountCode === true ? (
                <CMSInput label="Código de Cupón" value={data.promoPushPop?.discountCode || ''} onChange={(val) => updateField('promoPushPop', 'discountCode', val)} />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 flex items-center text-[11px] text-slate-400">
                  Bloque de cupón deshabilitado (modo aviso informativo).
                </div>
              )}
            </div>

            <CMSInput label="Título" value={data.promoPushPop?.title || ''} onChange={(val) => updateField('promoPushPop', 'title', val)} />
            <CMSTextarea label="Descripción" value={data.promoPushPop?.subtitle || ''} onChange={(val) => updateField('promoPushPop', 'subtitle', val)} rows={2} />
            <ImageUploaderInput label="Imagen Editorial (opcional)" section="promoPushPop" field="imageUrl" value={data.promoPushPop?.imageUrl || ''} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput label="Texto Botón CTA" value={data.promoPushPop?.ctaText || ''} onChange={(val) => updateField('promoPushPop', 'ctaText', val)} />
              <CMSInput label="Enlace Botón CTA" value={data.promoPushPop?.ctaUrl || ''} onChange={(val) => updateField('promoPushPop', 'ctaUrl', val)} />
            </div>
          </div>
        )}

        {/* REWARDS: BENEFICIOS */}
        {selectedLanding === 'rewards' && activeTab === 'rew_beneficios' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-[#0a2a5b]">⭐ Mosaico de Beneficios, Cómo Sumar &amp; Travel Wallet</h3>
              <p className="text-xs text-slate-400 mt-1">Editá las 4 tarjetas del mosaico editorial (con foto en Storage), los 3 pasos de acreditación y el bloque Travel Wallet.</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-600 uppercase">4 Tarjetas del Mosaico de Beneficios</h4>
              {(data.benefits || []).map((b: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-3">
                  <div className="text-xs font-black text-[#0a2a5b]">Beneficio #0{idx + 1}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CMSInput
                      label="Título"
                      value={b.title || ''}
                      onChange={(val) => {
                        const u = [...data.benefits];
                        u[idx] = { ...u[idx], title: val };
                        setData((p: any) => ({ ...p, benefits: u }));
                      }}
                    />
                    <CMSInput
                      label="Descripción"
                      value={b.description || ''}
                      onChange={(val) => {
                        const u = [...data.benefits];
                        u[idx] = { ...u[idx], description: val };
                        setData((p: any) => ({ ...p, benefits: u }));
                      }}
                    />
                  </div>
                  <MediaFieldUploader
                    label="Fotografía Editorial del Panel (sube a Storage)"
                    value={b.image || ''}
                    folder="cms_rewards_benefits"
                    onChange={(url) => {
                      const u = [...data.benefits];
                      u[idx] = { ...u[idx], image: url };
                      setData((p: any) => ({ ...p, benefits: u }));
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-5">
              <h4 className="text-xs font-black text-slate-600 uppercase">3 Pasos: ¿Cómo sumar puntos?</h4>
              {(data.howItWorks || []).map((step: any, idx: number) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <CMSInput
                    label="Paso (ej. 01)"
                    value={step.step || ''}
                    onChange={(val) => {
                      const u = [...data.howItWorks];
                      u[idx] = { ...u[idx], step: val };
                      setData((p: any) => ({ ...p, howItWorks: u }));
                    }}
                  />
                  <CMSInput
                    label="Título"
                    value={step.title || ''}
                    onChange={(val) => {
                      const u = [...data.howItWorks];
                      u[idx] = { ...u[idx], title: val };
                      setData((p: any) => ({ ...p, howItWorks: u }));
                    }}
                  />
                  <div className="md:col-span-2">
                    <CMSInput
                      label="Descripción"
                      value={step.description || ''}
                      onChange={(val) => {
                        const u = [...data.howItWorks];
                        u[idx] = { ...u[idx], description: val };
                        setData((p: any) => ({ ...p, howItWorks: u }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-5 rounded-xl border p-4 bg-slate-50/50">
              <h4 className="text-xs font-black text-slate-600 uppercase">Sección Travel Wallet (CTA)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CMSInput label="Título" value={data.ctaBlock?.title || ''} onChange={(val) => updateField('ctaBlock', 'title', val)} />
                <CMSInput label="Texto del botón" value={data.ctaBlock?.buttonText || ''} onChange={(val) => updateField('ctaBlock', 'buttonText', val)} />
                <CMSTextarea label="Subtítulo" value={data.ctaBlock?.subtitle || ''} onChange={(val) => updateField('ctaBlock', 'subtitle', val)} rows={2} />
                <CMSInput label="URL del botón" value={data.ctaBlock?.buttonUrl || ''} onChange={(val) => updateField('ctaBlock', 'buttonUrl', val)} />
              </div>
            </div>
          </div>
        )}

        {/* REWARDS: SUMÁ TU NEGOCIO */}
        {selectedLanding === 'rewards' && activeTab === 'rew_negocio' && data && (() => {
          const features: string[] = Array.isArray(data.businessSection?.features)
            ? data.businessSection.features
            : DEFAULT_REWARDS_CMS_DATA_FOR_CMS.businessSection.features;

          return (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-extrabold text-[#0a2a5b]">🏢 Sección &ldquo;Comercios Partners&rdquo; (B2B)</h3>
                <p className="text-xs text-slate-400 mt-1">Editá la propuesta para comercios adheridos, email de contacto y beneficios clave.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput label="Título" value={data.businessSection?.title || ''} onChange={(val) => updateField('businessSection', 'title', val)} />
                <CMSInput label="Texto del botón" value={data.businessSection?.buttonText || ''} onChange={(val) => updateField('businessSection', 'buttonText', val)} />
                <CMSInput label="URL del botón" value={data.businessSection?.buttonUrl || ''} onChange={(val) => updateField('businessSection', 'buttonUrl', val)} />
                <CMSInput label="Email Comercial Partners" value={data.businessSection?.email || 'partners@travelapp.ar'} onChange={(val) => updateField('businessSection', 'email', val)} />
              </div>
              <CMSTextarea label="Subtítulo" value={data.businessSection?.subtitle || ''} onChange={(val) => updateField('businessSection', 'subtitle', val)} rows={3} />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">Beneficios destacados para Partners</label>
                  <button
                    type="button"
                    onClick={() => updateField('businessSection', 'features', [...features, 'Nuevo beneficio para comercios'])}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0a2a5b] border border-[#0a2a5b]/30 px-2.5 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => {
                          const next = [...features];
                          next[idx] = e.target.value;
                          updateField('businessSection', 'features', next);
                        }}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-[#0a2a5b]"
                      />
                      <button
                        type="button"
                        onClick={() => updateField('businessSection', 'features', features.filter((_, i) => i !== idx))}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* REWARDS: CONTACTO & REDES SOCIALES */}
        {selectedLanding === 'rewards' && activeTab === 'rew_social' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-[#0a2a5b]">📞 Canales de Contacto &amp; Redes Sociales</h3>
              <p className="text-xs text-slate-400 mt-1">Sincronizado con el Header, sección Travis Rewards, Modal de Contacto y Footer.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput label="Teléfono Oficial" value={data.contacto?.telefono || ''} onChange={(val) => updateField('contacto', 'telefono', val)} placeholder="0810-220-0018" />
              <CMSInput label="Correo Electrónico" value={data.contacto?.email || ''} onChange={(val) => updateField('contacto', 'email', val)} placeholder="hola@travelapp.ar" />
              <CMSInput
                label="WhatsApp URL (wa.me)"
                value={data.contacto?.whatsapp || data.redesSociales?.whatsapp || ''}
                onChange={(val) => {
                  updateField('contacto', 'whatsapp', val);
                  updateField('redesSociales', 'whatsapp', val);
                }}
                placeholder="https://wa.me/5493812000712"
              />
              <CMSInput label="WhatsApp Visible" value={data.contacto?.whatsappDisplay || ''} onChange={(val) => updateField('contacto', 'whatsappDisplay', val)} placeholder="+54 9 381 200-0712" />
              <CMSInput label="Messenger URL (m.me)" value={data.redesSociales?.messenger || ''} onChange={(val) => updateField('redesSociales', 'messenger', val)} placeholder="https://m.me/travelapp.ar" />
              <CMSInput label="Instagram DM URL (ig.me)" value={data.redesSociales?.instagramDm || ''} onChange={(val) => updateField('redesSociales', 'instagramDm', val)} placeholder="https://ig.me/m/travelapp.ar" />
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-3">
              <p className="text-xs font-bold text-slate-600">Redes Sociales del Footer (dejar vacío para ocultar)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput label="Facebook URL" value={data.redesSociales?.facebook || ''} onChange={(val) => updateField('redesSociales', 'facebook', val)} />
                <CMSInput label="Instagram URL" value={data.redesSociales?.instagram || ''} onChange={(val) => updateField('redesSociales', 'instagram', val)} />
                <CMSInput label="Usuario Instagram (@...)" value={data.redesSociales?.instagramHandle || ''} onChange={(val) => updateField('redesSociales', 'instagramHandle', val)} />
                <CMSInput label="TikTok URL" value={data.redesSociales?.tiktok || ''} onChange={(val) => updateField('redesSociales', 'tiktok', val)} />
                <CMSInput label="YouTube URL" value={data.redesSociales?.youtube || ''} onChange={(val) => updateField('redesSociales', 'youtube', val)} />
                <CMSInput label="LinkedIn URL" value={data.redesSociales?.linkedin || ''} onChange={(val) => updateField('redesSociales', 'linkedin', val)} />
              </div>
            </div>
          </div>
        )}

        {/* REWARDS: SELLOS LEGALES & FOOTER */}
        {selectedLanding === 'rewards' && activeTab === 'rew_legales' && data && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-[#0a2a5b]">⚖️ Legales, Sellos ARCA &amp; Footer de Rewards</h3>
            </div>
            <CMSTextarea label="Política de Privacidad (Modal Footer)" value={data.legales?.privacidad || ''} onChange={(val) => updateField('legales', 'privacidad', val)} rows={4} />
            <CMSTextarea label="Términos y Condiciones (Modal Footer)" value={data.legales?.terminos || ''} onChange={(val) => updateField('legales', 'terminos', val)} rows={4} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <CMSTextarea label="Sello ARCA / AFIP (HTML oficial o URL de imagen)" value={data.sellosLegales?.arcaQr || ''} onChange={(val) => updateField('sellosLegales', 'arcaQr', val)} rows={3} />
              <CMSTextarea label="Sello Base de Datos (HTML o URL de imagen)" value={data.sellosLegales?.baseDatosSello || ''} onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)} rows={3} />
            </div>
            <CMSTextarea label="Descripción institucional en Footer" value={data.footer?.description || ''} onChange={(val) => updateField('footer', 'description', val)} rows={2} />
            <CMSInput label="Texto de Copyright" value={data.footer?.copyrightText || ''} onChange={(val) => updateField('footer', 'copyrightText', val)} />
          </div>
        )}

        {/* EXPERIENCE: CONTACTO, FOOTER, REDES & LEGAL */}
        {selectedLanding === 'experience' && activeTab === 'social' && data && (
          <div className="space-y-7">
            {/* 1. CABECERA & CONTACTO OFICIAL */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-800">1. Logo y Canales de Contacto Oficiales</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Se sincronizan en el Header, Travis Concierge, Modal de Contacto, Travel Market y Footer de experience.travelapp.ar.
                </p>
              </div>

              <ImageUploaderInput
                label="Logo de Cabecera (SVG / PNG — sube a Storage)"
                section="header"
                field="logo"
                value={data.header?.logo || '/assets/experience_blanco.svg'}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="Teléfono de Atención (Header, Travis & Footer)"
                  value={data.contacto?.telefono || data.header?.phoneFormatted || ''}
                  onChange={(val) => {
                    updateField('contacto', 'telefono', val);
                    updateField('header', 'phoneFormatted', val);
                    updateField('header', 'phone', val);
                  }}
                  placeholder="0810-220-0018"
                />
                <CMSInput
                  label="Correo Electrónico Oficial"
                  value={data.contacto?.email || ''}
                  onChange={(val) => updateField('contacto', 'email', val)}
                  placeholder="hola@travelapp.ar"
                />
                <CMSInput
                  label="Enlace WhatsApp Oficial (wa.me)"
                  value={data.contacto?.whatsapp || data.redesSociales?.whatsapp || ''}
                  onChange={(val) => {
                    updateField('contacto', 'whatsapp', val);
                    updateField('redesSociales', 'whatsapp', val);
                  }}
                  placeholder="https://wa.me/5493812000712"
                />
                <CMSInput
                  label="Número WhatsApp Visible"
                  value={data.contacto?.whatsappDisplay || ''}
                  onChange={(val) => updateField('contacto', 'whatsappDisplay', val)}
                  placeholder="+54 9 381 200-0712"
                />
                <CMSInput
                  label="Enlace Messenger (m.me)"
                  value={data.redesSociales?.messenger || ''}
                  onChange={(val) => updateField('redesSociales', 'messenger', val)}
                  placeholder="https://m.me/travelapp.ar"
                />
                <CMSInput
                  label="Enlace Instagram DM (ig.me)"
                  value={data.redesSociales?.instagramDm || ''}
                  onChange={(val) => updateField('redesSociales', 'instagramDm', val)}
                  placeholder="https://ig.me/m/travelapp.ar"
                />
              </div>
            </div>

            {/* 2. REDES SOCIALES */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-700">2. Redes Sociales del Footer</h3>
                <p className="text-xs text-slate-400">Dejá vacío cualquier campo para ocultar ese ícono automáticamente.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput label="Facebook URL" value={data.redesSociales?.facebook || ''} onChange={(val) => updateField('redesSociales', 'facebook', val)} />
                <CMSInput label="Instagram URL" value={data.redesSociales?.instagram || ''} onChange={(val) => updateField('redesSociales', 'instagram', val)} />
                <CMSInput label="Usuario Instagram Visible (@...)" value={data.redesSociales?.instagramHandle || ''} onChange={(val) => updateField('redesSociales', 'instagramHandle', val)} placeholder="@travelapp.ar" />
                <CMSInput label="TikTok URL" value={data.redesSociales?.tiktok || ''} onChange={(val) => updateField('redesSociales', 'tiktok', val)} />
                <CMSInput label="YouTube URL" value={data.redesSociales?.youtube || ''} onChange={(val) => updateField('redesSociales', 'youtube', val)} />
                <CMSInput label="LinkedIn URL" value={data.redesSociales?.linkedin || ''} onChange={(val) => updateField('redesSociales', 'linkedin', val)} />
              </div>
            </div>

            {/* 3. TEXTOS LEGALES */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-700">3. Textos Legales (Modales del Footer)</h3>
              <CMSTextarea
                label="Política de Privacidad"
                value={data.legales?.privacidad || ''}
                onChange={(val) => updateField('legales', 'privacidad', val)}
                rows={4}
              />
              <CMSTextarea
                label="Términos y Condiciones de Uso"
                value={data.legales?.terminos || ''}
                onChange={(val) => updateField('legales', 'terminos', val)}
                rows={4}
              />
            </div>

            {/* 4. SELLOS GUBERNAMENTALES */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-700">4. Sellos Institucionales (ARCA QR, ATAVyT &amp; Base de Datos)</h3>
                <p className="text-xs text-slate-400">Soporta código HTML oficial de ARCA/AFIP o URL directa de imagen.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CMSTextarea
                  label="Código HTML o URL Sello QR ARCA"
                  value={data.sellosLegales?.arcaQr || ''}
                  onChange={(val) => updateField('sellosLegales', 'arcaQr', val)}
                  rows={3}
                />
                <CMSTextarea
                  label="ATAVyT (Texto o URL Logo)"
                  value={data.sellosLegales?.atavyt ?? 'ATAVyT'}
                  onChange={(val) => updateField('sellosLegales', 'atavyt', val)}
                  rows={3}
                />
                <CMSTextarea
                  label="Base de Datos RNBD (Texto o URL Logo)"
                  value={data.sellosLegales?.baseDatosSello ?? 'RNBD'}
                  onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)}
                  rows={3}
                />
              </div>
            </div>

            {/* 5. FOOTER & COPYRIGHT */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-700">5. Descripción y Copyright del Footer</h3>
              <CMSTextarea
                label="Descripción institucional bajo el logo"
                value={data.footer?.description || ''}
                onChange={(val) => updateField('footer', 'description', val)}
                rows={2}
              />
              <CMSInput
                label="Derechos de Autor (Copyright)"
                value={data.footer?.copyrightText || ''}
                onChange={(val) => updateField('footer', 'copyrightText', val)}
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* EDITORES ECOSISTEMA (travelapp.ar) */}
        {/* ======================================================== */}

        {/* ECO: HERO SLIDER (HASTA 10 DIAPOSITIVAS) */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_hero' && data && (() => {
          const heroSlides: any[] = Array.isArray(data.heroSlider) && data.heroSlider.length > 0
            ? data.heroSlider
            : DEFAULT_ECOSISTEMA_CMS_DATA.heroSlider;

          const updateEcoHeroSlides = (nextSlides: any[]) => {
            setData((prev: any) => ({
              ...prev,
              heroSlider: nextSlides,
              hero: nextSlides[0] ? { ...(prev?.hero || {}), ...nextSlides[0] } : prev?.hero,
            }));
          };

          const updateEcoSlide = (idx: number, patch: Record<string, any>) => {
            const next = [...heroSlides];
            next[idx] = { ...(next[idx] || {}), ...patch };
            updateEcoHeroSlides(next);
          };

          const moveEcoSlide = (idx: number, dir: -1 | 1) => {
            const target = idx + dir;
            if (target < 0 || target >= heroSlides.length) return;
            const next = [...heroSlides];
            const [item] = next.splice(idx, 1);
            next.splice(target, 0, item);
            updateEcoHeroSlides(next);
          };

          return (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Hero Slider Principal — travelapp.ar ({heroSlides.length} / 10 diapositivas)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Administrá hasta 10 diapositivas en el encabezado principal (imagen HD o video .mp4 en loop) con botón CTA y enlace propios.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={heroSlides.length >= 10}
                  onClick={() => {
                    if (heroSlides.length >= 10) return;
                    updateEcoHeroSlides([
                      ...heroSlides,
                      {
                        id: `eco-slide-${Date.now()}`,
                        mediaType: 'image',
                        mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=90',
                        overlayOpacity: 20,
                        badge: '✦ NUEVA CAMPAÑA TRAVELAPP',
                        title: 'Título de la Diapositiva',
                        subtitle: 'Descripción breve de la temporada, promoción o destino destacado.',
                        ctaText: 'Ver Paquetes',
                        ctaUrl: '/marketplace',
                        whatsappUrl: data.contacto?.whatsapp || 'https://wa.me/5493812000712',
                        whatsappText: 'Hablá con Nosotros',
                      },
                    ]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar Diapositiva ({heroSlides.length}/10)
                </button>
              </div>

              <div className="space-y-5">
                {heroSlides.map((slide: any, idx: number) => (
                  <div key={slide.id || idx} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-md bg-[#0a2a5b] text-white text-[11px] font-black">
                          Slide #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-600 truncate max-w-xs sm:max-w-md">
                          {slide.title || 'Sin título'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveEcoSlide(idx, -1)}
                          title="Subir orden"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === heroSlides.length - 1}
                          onClick={() => moveEcoSlide(idx, 1)}
                          title="Bajar orden"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        {heroSlides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => updateEcoHeroSlides(heroSlides.filter((_: any, i: number) => i !== idx))}
                            title="Eliminar diapositiva"
                            className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipo de Fondo</label>
                        <select
                          value={slide.mediaType || 'image'}
                          onChange={(e) => updateEcoSlide(idx, { mediaType: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold bg-white focus:outline-none"
                        >
                          <option value="image">🖼️ Imagen HD</option>
                          <option value="video">🎬 Video en Loop (.mp4)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Oscurecimiento Extra ({slide.overlayOpacity ?? 0}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          value={slide.overlayOpacity ?? 0}
                          onChange={(e) => updateEcoSlide(idx, { overlayOpacity: Number(e.target.value) })}
                          className="w-full accent-[#0a2a5b] mt-2"
                        />
                      </div>
                      <CMSInput
                        label="Badge / Etiqueta Superior"
                        value={slide.badge || ''}
                        onChange={(val) => updateEcoSlide(idx, { badge: val })}
                        placeholder="Ej. ✦ SALIDAS GRUPALES"
                      />
                    </div>

                    <MediaFieldUploader
                      label="Imagen o Video de Fondo (sube a Firebase Storage)"
                      value={slide.mediaUrl || ''}
                      allowVideo={true}
                      folder="cms_ecosistema_hero"
                      onChange={(url, detectedType) =>
                        updateEcoSlide(idx, {
                          mediaUrl: url,
                          ...(detectedType ? { mediaType: detectedType } : {}),
                        })
                      }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CMSTextarea
                        label="Título Principal"
                        value={slide.title || ''}
                        onChange={(val) => updateEcoSlide(idx, { title: val })}
                        rows={2}
                      />
                      <CMSTextarea
                        label="Subtítulo / Bajada"
                        value={slide.subtitle || ''}
                        onChange={(val) => updateEcoSlide(idx, { subtitle: val })}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <CMSInput
                        label="Texto Botón Principal"
                        value={slide.ctaText || ''}
                        onChange={(val) => updateEcoSlide(idx, { ctaText: val })}
                        placeholder="Explorar Paquetes"
                      />
                      <CMSInput
                        label="Destino URL Botón Principal"
                        value={slide.ctaUrl || ''}
                        onChange={(val) => updateEcoSlide(idx, { ctaUrl: val })}
                        placeholder="/marketplace"
                      />
                      <CMSInput
                        label="Texto Botón WhatsApp"
                        value={slide.whatsappText || ''}
                        onChange={(val) => updateEcoSlide(idx, { whatsappText: val })}
                        placeholder="Hablá con Nosotros"
                      />
                      <CMSInput
                        label="Enlace WhatsApp"
                        value={slide.whatsappUrl || ''}
                        onChange={(val) => updateEcoSlide(idx, { whatsappUrl: val })}
                        placeholder="https://wa.me/5493812000712"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ECO: PROMO PUSH POP */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_promo' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>🔔 Push Pop Promocional Minimalista</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ventana emergente minimalista y profesional que se muestra una vez por sesión al ingresar a travelapp.ar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Activar Push Pop</h4>
                  <p className="text-[11px] text-slate-500">Habilita la ventana emergente para avisos informativos o promociones.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={data.promoPushPop?.enabled || false}
                    onChange={(e) => updateField('promoPushPop', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff5a19]" />
                </label>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Mostrar Cupón de Descuento</h4>
                  <p className="text-[11px] text-slate-500">Desactivalo si usás el Push Pop como comunicado o novedad informativa.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={data.promoPushPop?.showDiscountCode === true}
                    onChange={(e) => updateField('promoPushPop', 'showDiscountCode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0a2a5b]" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Badge / Etiqueta Superior"
                value={data.promoPushPop?.badge || ''}
                onChange={(val) => updateField('promoPushPop', 'badge', val)}
                placeholder="Ej. AVISO IMPORTANTE o TRAVEL SALE"
              />
              {data.promoPushPop?.showDiscountCode === true ? (
                <CMSInput
                  label="Código de Cupón de Descuento"
                  value={data.promoPushPop?.discountCode || ''}
                  onChange={(val) => updateField('promoPushPop', 'discountCode', val)}
                  placeholder="Ej. TRAVELSALE"
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 flex items-center text-[11px] text-slate-400">
                  Bloque de cupón deshabilitado (modo aviso informativo).
                </div>
              )}
            </div>

            <CMSInput
              label="Título de la Promoción"
              value={data.promoPushPop?.title || ''}
              onChange={(val) => updateField('promoPushPop', 'title', val)}
              placeholder="Ej. Hasta 40% OFF en Paquetes y Puntos Dobles"
            />

            <CMSTextarea
              label="Texto / Descripción de la Promoción"
              value={data.promoPushPop?.subtitle || ''}
              onChange={(val) => updateField('promoPushPop', 'subtitle', val)}
              rows={2}
              placeholder="Detalles del beneficio, cuotas o vigencia..."
            />

            <ImageUploaderInput
              label="Imagen Editorial de la Promoción (opcional — si se deja vacía se ve formato compacto)"
              section="promoPushPop"
              field="imageUrl"
              value={data.promoPushPop?.imageUrl || ''}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Texto del Botón CTA"
                value={data.promoPushPop?.ctaText || ''}
                onChange={(val) => updateField('promoPushPop', 'ctaText', val)}
                placeholder="Ej. Ver Ofertas Especiales"
              />
              <CMSInput
                label="Enlace del Botón CTA"
                value={data.promoPushPop?.ctaUrl || ''}
                onChange={(val) => updateField('promoPushPop', 'ctaUrl', val)}
                placeholder="Ej. /marketplace"
              />
            </div>
          </div>
        )}

        {/* ECO: BUSCADOR MULTIPRODUCTO, PROMOS FLOTANTES & FILTROS RÁPIDOS */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_buscador' && data && (() => {
          const searchTabDefs = [
            { id: 'paquetes', label: 'Paquetes' },
            { id: 'vuelos', label: 'Vuelos' },
            { id: 'hoteles', label: 'Alojamientos / Hoteles' },
            { id: 'buses', label: 'Buses / Micros' },
            { id: 'actividades', label: 'Excursiones / Receptivo' },
            { id: 'traslados', label: 'Traslados / TravelCab' },
            { id: 'autos', label: 'Autos' },
            { id: 'asistencia', label: 'Asistencia al Viajero' },
            { id: 'parques', label: 'Parques & Disney' },
          ];
          const enabledTabs = data.enabledSearchTabs || {};
          const floatingPromos: any[] = Array.isArray(data.floatingPromos)
            ? data.floatingPromos
            : DEFAULT_ECOSISTEMA_CMS_DATA.floatingPromos;
          const quickFilters: any[] = Array.isArray(data.quickFilters)
            ? data.quickFilters
            : DEFAULT_ECOSISTEMA_CMS_DATA.quickFilters;

          return (
            <div className="space-y-8">
              {/* 1. Pestañas del Buscador */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-800">1. Pestañas Activas del Buscador OTA</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Activá o desactivá en tiempo real los servicios visibles en el buscador central de travelapp.ar.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchTabDefs.map((tabDef) => {
                    const checked = enabledTabs[tabDef.id] !== false;
                    return (
                      <label
                        key={tabDef.id}
                        className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                          checked ? 'border-[#0a2a5b]/30 bg-blue-50/40' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-700">{tabDef.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => updateField('enabledSearchTabs', tabDef.id, e.target.checked)}
                          className="h-4 w-4 accent-[#0a2a5b]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. Tarjetas Flotantes de Beneficios & Financiación */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">2. Tarjetas de Beneficios & Financiación</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Franja de tarjetas interactivas debajo del Hero (cuotas, Time-to-Pay, Club Rewards, etc.).
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.showFloatingPromos !== false}
                        onChange={(e) => setData((prev: any) => ({ ...prev, showFloatingPromos: e.target.checked }))}
                        className="h-4 w-4 accent-[#0a2a5b]"
                      />
                      Mostrar sección
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setData((prev: any) => ({
                          ...prev,
                          floatingPromos: [
                            ...floatingPromos,
                            {
                              id: `promo-${Date.now()}`,
                              badge: 'BENEFICIO',
                              title: 'Nueva Promoción',
                              desc: 'Descripción breve del beneficio comercial.',
                              cta: 'Ver más',
                              href: '/marketplace',
                              icon: 'sparkles',
                              colorTheme: 'blue',
                            },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45] cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar Tarjeta
                    </button>
                  </div>
                </div>

                <CMSInput
                  label="Etiqueta de la Sección (opcional)"
                  value={data.floatingPromosTitle || ''}
                  onChange={(val) => setData((prev: any) => ({ ...prev, floatingPromosTitle: val }))}
                  placeholder="Beneficios & Financiación"
                />

                <div className="space-y-3">
                  {floatingPromos.map((promo: any, idx: number) => (
                    <div key={promo.id || idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#0a2a5b]">Tarjeta #{idx + 1}: {promo.title || 'Sin título'}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setData((prev: any) => ({
                              ...prev,
                              floatingPromos: floatingPromos.filter((_: any, i: number) => i !== idx),
                            }))
                          }
                          className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <CMSInput
                          label="Badge"
                          value={promo.badge || ''}
                          onChange={(val) => {
                            const next = [...floatingPromos];
                            next[idx] = { ...next[idx], badge: val };
                            setData((prev: any) => ({ ...prev, floatingPromos: next }));
                          }}
                        />
                        <CMSInput
                          label="Título"
                          value={promo.title || ''}
                          onChange={(val) => {
                            const next = [...floatingPromos];
                            next[idx] = { ...next[idx], title: val };
                            setData((prev: any) => ({ ...prev, floatingPromos: next }));
                          }}
                        />
                        <CMSInput
                          label="Texto CTA"
                          value={promo.cta || ''}
                          onChange={(val) => {
                            const next = [...floatingPromos];
                            next[idx] = { ...next[idx], cta: val };
                            setData((prev: any) => ({ ...prev, floatingPromos: next }));
                          }}
                        />
                        <CMSInput
                          label="Enlace / URL"
                          value={promo.href || ''}
                          onChange={(val) => {
                            const next = [...floatingPromos];
                            next[idx] = { ...next[idx], href: val };
                            setData((prev: any) => ({ ...prev, floatingPromos: next }));
                          }}
                          placeholder="/marketplace o https://wa.me/..."
                        />
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Ícono</label>
                          <select
                            value={promo.icon || 'sparkles'}
                            onChange={(e) => {
                              const next = [...floatingPromos];
                              next[idx] = { ...next[idx], icon: e.target.value };
                              setData((prev: any) => ({ ...prev, floatingPromos: next }));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold bg-white"
                          >
                            <option value="credit-card">Tarjeta / Financiación</option>
                            <option value="clock">Reloj / Time-to-Pay</option>
                            <option value="percent">Porcentaje / Descuento</option>
                            <option value="crown">Corona / Club Rewards</option>
                            <option value="map-pin">Pin / Destinos</option>
                            <option value="sparkles">Destellos / Destacado</option>
                            <option value="shield">Escudo / Garantía</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Color Visual</label>
                          <select
                            value={promo.colorTheme || 'blue'}
                            onChange={(e) => {
                              const next = [...floatingPromos];
                              next[idx] = { ...next[idx], colorTheme: e.target.value };
                              setData((prev: any) => ({ ...prev, floatingPromos: next }));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold bg-white"
                          >
                            <option value="blue">Azul Corporativo</option>
                            <option value="amber">Ámbar / Dorado</option>
                            <option value="emerald">Verde Esmeralda</option>
                            <option value="purple">Púrpura Rewards</option>
                            <option value="rose">Coral / Rojo</option>
                            <option value="navy">Azul Marino Oscuro</option>
                          </select>
                        </div>
                      </div>
                      <CMSTextarea
                        label="Descripción Breve"
                        value={promo.desc || ''}
                        onChange={(val) => {
                          const next = [...floatingPromos];
                          next[idx] = { ...next[idx], desc: val };
                          setData((prev: any) => ({ ...prev, floatingPromos: next }));
                        }}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Filtros Rápidos del Catálogo en Home */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">3. Filtros Rápidos en la Home (hasta 6)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Botones rápidos sobre la grilla de paquetes destacados en travelapp.ar (ej. Verano 2027, Cupos Propios, Brasil).
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={quickFilters.length >= 6}
                    onClick={() =>
                      setData((prev: any) => ({
                        ...prev,
                        quickFilters: [
                          ...quickFilters,
                          { id: `qf-${Date.now()}`, label: 'Nueva Temporada', keyword: 'Verano' },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#0a2a5b]/30 bg-blue-50/50 text-[#0a2a5b] text-xs font-bold hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar Filtro ({quickFilters.length}/6)
                  </button>
                </div>

                <div className="space-y-2">
                  {quickFilters.map((qf: any, idx: number) => (
                    <div key={qf.id || idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="sm:col-span-2">
                        <CMSInput
                          label="Texto del Botón"
                          value={qf.label || ''}
                          onChange={(val) => {
                            const next = [...quickFilters];
                            next[idx] = { ...next[idx], label: val };
                            setData((prev: any) => ({ ...prev, quickFilters: next }));
                          }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <CMSInput
                          label="Palabra Clave de Filtro"
                          value={qf.keyword || ''}
                          onChange={(val) => {
                            const next = [...quickFilters];
                            next[idx] = { ...next[idx], keyword: val };
                            setData((prev: any) => ({ ...prev, quickFilters: next }));
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setData((prev: any) => ({
                            ...prev,
                            quickFilters: quickFilters.filter((_: any, i: number) => i !== idx),
                          }))
                        }
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg justify-self-end cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ECO: UNIDADES DE NEGOCIO */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_unidades' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Tarjetas de Unidades de Negocio (Ecosistema)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Editá la imagen, etiqueta, título, descripción breve, texto del botón y enlace de cada unidad que aparece en travelapp.ar.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setData((prev: any) => ({
                    ...prev,
                    unidades: [
                      ...(prev?.unidades || []),
                      {
                        id: `unidad-${Date.now()}`,
                        nombre: 'Nueva Unidad',
                        tag: 'Ecosistema',
                        descripcionBreve: 'Descripción breve de la unidad de negocio.',
                        cta: 'Explorar',
                        url: '/marketplace',
                        imagenUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
                        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Unidad
              </button>
            </div>
            {(data.unidades || []).map((unit: any, idx: number) => (
              <div key={unit.id || idx} className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#0a2a5b]/10 flex items-center justify-center">
                      <span className="text-sm font-black text-[#0a2a5b]">0{idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700">{unit.nombre || 'Unidad'}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{unit.tag || unit.id}</p>
                    </div>
                  </div>
                  {(data.unidades || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setData((prev: any) => ({
                          ...prev,
                          unidades: (prev?.unidades || []).filter((_: any, i: number) => i !== idx),
                        }))
                      }
                      className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  )}
                </div>

                <MediaFieldUploader
                  label="Imagen Representativa (sube a Firebase Storage)"
                  value={unit.imagenUrl || unit.imageUrl || ''}
                  folder="cms_ecosistema_unidades"
                  onChange={(url) => updateService(idx, 'imagenUrl', url)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput
                    label="Nombre de la Unidad"
                    value={unit.nombre || ''}
                    onChange={(val) => updateService(idx, 'nombre', val)}
                  />
                  <CMSInput
                    label="Etiqueta Superior (Tag)"
                    value={unit.tag || ''}
                    onChange={(val) => updateService(idx, 'tag', val)}
                    placeholder="Ej. Turismo Emisivo"
                  />
                  <CMSInput
                    label="Texto del Botón CTA"
                    value={unit.cta || ''}
                    onChange={(val) => updateService(idx, 'cta', val)}
                    placeholder="Ej. Ver Paquetes & Salidas"
                  />
                  <CMSInput
                    label="Enlace / URL de Destino"
                    value={unit.url || ''}
                    onChange={(val) => updateService(idx, 'url', val)}
                    placeholder="Ej. /marketplace o /landing/travelcab"
                  />
                </div>

                <CMSTextarea
                  label="Descripción Breve (tarjeta)"
                  rows={2}
                  value={unit.descripcionBreve || ''}
                  onChange={(val) => updateService(idx, 'descripcionBreve', val)}
                />
              </div>
            ))}
          </div>
        )}

        {/* ECO: QUIÉNES SOMOS */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_quienes' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-800">Quiénes Somos (Modal Institucional)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Estos textos se muestran al abrir Visión, Misión o Valores desde el menú superior y el Footer de travelapp.ar.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput label="Badge / Etiqueta Institucional" value={data.quienesSomos?.badge || ''} onChange={(val) => updateField('quienesSomos', 'badge', val)} />
              <CMSInput label="Título Institucional" value={data.quienesSomos?.titulo || ''} onChange={(val) => updateField('quienesSomos', 'titulo', val)} />
            </div>
            <CMSTextarea label="Misión" value={data.quienesSomos?.mision || ''} onChange={(val) => updateField('quienesSomos', 'mision', val)} rows={3} />
            <CMSTextarea label="Visión" value={data.quienesSomos?.vision || ''} onChange={(val) => updateField('quienesSomos', 'vision', val)} rows={3} />
            <CMSTextarea label="Valores" value={data.quienesSomos?.valores || ''} onChange={(val) => updateField('quienesSomos', 'valores', val)} rows={3} />
          </div>
        )}

        {/* ECO: STATS */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_stats' && data && (
          <div className="space-y-6">
            {/* Toggle showStats */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-xs font-black text-slate-700">Mostrar Sección de Métricas</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Habilita o deshabilita la sección "Números que Hablan" en la landing page.</p>
              </div>
              <button
                type="button"
                onClick={() => setData((prev: any) => ({ ...prev, showStats: !prev.showStats }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  data.showStats ? 'bg-orange-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    data.showStats ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Métricas de Impacto</h3>
                <p className="text-xs text-slate-400 mt-1">Los contadores se animan al hacer scroll. Íconos válidos: Car, Compass, Users, MapPin, Globe, Star, Award, Sparkles</p>
              </div>
              <button
                onClick={() => setData((prev: any) => ({ ...prev, stats: [...(prev.stats || []), { valor: '1.000+', label: 'Nueva Métrica', icono: 'Star' }] }))}
                className="flex items-center gap-1 text-xs font-bold text-tech-blue border border-tech-blue/30 bg-tech-blue/5 px-3 py-1.5 rounded-lg hover:bg-tech-blue/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
            {(data.stats || []).map((stat: any, idx: number) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Valor</label>
                      <input value={stat.valor || ''} onChange={(e) => { const s = [...data.stats]; s[idx] = {...s[idx], valor: e.target.value}; setData((p: any) => ({...p, stats: s})); }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Etiqueta</label>
                      <input value={stat.label || ''} onChange={(e) => { const s = [...data.stats]; s[idx] = {...s[idx], label: e.target.value}; setData((p: any) => ({...p, stats: s})); }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Ícono</label>
                      <input value={stat.icono || ''} onChange={(e) => { const s = [...data.stats]; s[idx] = {...s[idx], icono: e.target.value}; setData((p: any) => ({...p, stats: s})); }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none" />
                    </div>
                  </div>
                </div>
                <button onClick={() => { const s = data.stats.filter((_: any, i: number) => i !== idx); setData((p: any) => ({...p, stats: s})); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ECO: APPS, REWARDS & TRAVIS IA */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_apps' && data && (() => {
          const rewardsSteps: any[] = Array.isArray(data.rewardsSection?.steps) && data.rewardsSection.steps.length > 0
            ? data.rewardsSection.steps
            : DEFAULT_ECOSISTEMA_CMS_DATA.rewardsSection.steps;
          const travisFeatures: any[] = Array.isArray(data.travisSection?.features) && data.travisSection.features.length > 0
            ? data.travisSection.features
            : DEFAULT_ECOSISTEMA_CMS_DATA.travisSection.features;

          return (
            <div className="space-y-8">
              {/* 1. SECCIÓN APP MÓVIL */}
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-800">1. Sección Descarga de la App Móvil</h3>
                  <p className="text-xs text-slate-400 mt-1">Podés ocultar toda la sección o mostrar los botones de Google Play y App Store cuando cargues sus URLs.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">Mostrar sección App en Web</span>
                    <input
                      type="checkbox"
                      checked={data.apps?.enabled !== false}
                      onChange={(e) => updateField('apps', 'enabled', e.target.checked)}
                      className="h-4 w-4 accent-[#0a2a5b]"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">Mostrar botón Google Play</span>
                    <input
                      type="checkbox"
                      checked={data.apps?.showPlayStore !== false}
                      onChange={(e) => updateField('apps', 'showPlayStore', e.target.checked)}
                      className="h-4 w-4 accent-[#0a2a5b]"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">Mostrar botón App Store</span>
                    <input
                      type="checkbox"
                      checked={data.apps?.showAppStore !== false}
                      onChange={(e) => updateField('apps', 'showAppStore', e.target.checked)}
                      className="h-4 w-4 accent-[#0a2a5b]"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput label="Etiqueta Superior (Badge)" value={data.apps?.badge || ''} onChange={(val) => updateField('apps', 'badge', val)} placeholder="Billetera de Viajero Móvil" />
                  <CMSInput label="Nota Inferior (opcional)" value={data.apps?.welcomeNote || ''} onChange={(val) => updateField('apps', 'welcomeNote', val)} placeholder="Dejar vacío para ocultar este texto" />
                </div>
                <CMSInput label="Título de la Sección App" value={data.apps?.titulo || ''} onChange={(val) => updateField('apps', 'titulo', val)} />
                <CMSTextarea label="Subtítulo / Descripción" value={data.apps?.subtitulo || ''} onChange={(val) => updateField('apps', 'subtitulo', val)} rows={2} />

                <MediaFieldUploader
                  label="Captura de Pantalla del Celular (Screenshot App Real)"
                  value={data.apps?.appPreviewImageUrl || ''}
                  folder="cms_ecosistema_app"
                  onChange={(url) => updateField('apps', 'appPreviewImageUrl', url)}
                  placeholder="https://... o subí una captura de tu App"
                />

                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">URLs de Tiendas (si quedan vacías, el botón permanece oculto)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CMSInput label="Google Play Store URL" value={data.apps?.playStoreUrl || ''} onChange={(val) => updateField('apps', 'playStoreUrl', val)} placeholder="https://play.google.com/store/apps/details?id=ar.travelapp" />
                    <CMSInput label="Apple App Store URL" value={data.apps?.appStoreUrl || ''} onChange={(val) => updateField('apps', 'appStoreUrl', val)} placeholder="https://apps.apple.com/ar/app/travelapp/id..." />
                  </div>
                </div>
              </div>

              {/* 2. BLOQUE REWARDS EN HOME */}
              <div className="border-t border-slate-200 pt-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">2. Bloque TravelApp Rewards (en Home)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Editá los textos, pasos y enlaces del bloque de fidelización en travelapp.ar.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.rewardsSection?.enabled !== false}
                      onChange={(e) => updateField('rewardsSection', 'enabled', e.target.checked)}
                      className="h-4 w-4 accent-[#0a2a5b]"
                    />
                    Mostrar sección Rewards
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CMSInput label="Badge Superior" value={data.rewardsSection?.badge || ''} onChange={(val) => updateField('rewardsSection', 'badge', val)} />
                  <CMSInput label="Título Principal" value={data.rewardsSection?.title || ''} onChange={(val) => updateField('rewardsSection', 'title', val)} />
                  <CMSInput label="Texto Destacado (Azul)" value={data.rewardsSection?.highlight || ''} onChange={(val) => updateField('rewardsSection', 'highlight', val)} />
                </div>
                <CMSTextarea label="Subtítulo Rewards" value={data.rewardsSection?.subtitle || ''} onChange={(val) => updateField('rewardsSection', 'subtitle', val)} rows={2} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput label="Botón Primario (Texto)" value={data.rewardsSection?.primaryCtaText || ''} onChange={(val) => updateField('rewardsSection', 'primaryCtaText', val)} />
                  <CMSInput label="Botón Primario (URL)" value={data.rewardsSection?.primaryCtaUrl || ''} onChange={(val) => updateField('rewardsSection', 'primaryCtaUrl', val)} />
                  <CMSInput label="Botón Secundario (Texto)" value={data.rewardsSection?.secondaryCtaText || ''} onChange={(val) => updateField('rewardsSection', 'secondaryCtaText', val)} />
                  <CMSInput label="Botón Secundario (URL)" value={data.rewardsSection?.secondaryCtaUrl || ''} onChange={(val) => updateField('rewardsSection', 'secondaryCtaUrl', val)} />
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-slate-600">Pasos del Programa (3 bloques)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {rewardsSteps.map((step: any, idx: number) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                        <span className="text-[11px] font-black text-[#0a2a5b]">Paso {step.num || `0${idx + 1}`}</span>
                        <CMSInput
                          label="Título"
                          value={step.title || ''}
                          onChange={(val) => {
                            const next = [...rewardsSteps];
                            next[idx] = { ...next[idx], title: val };
                            updateField('rewardsSection', 'steps', next);
                          }}
                        />
                        <CMSTextarea
                          label="Descripción"
                          rows={2}
                          value={step.desc || ''}
                          onChange={(val) => {
                            const next = [...rewardsSteps];
                            next[idx] = { ...next[idx], desc: val };
                            updateField('rewardsSection', 'steps', next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. BLOQUE TRAVIS IA EN HOME */}
              <div className="border-t border-slate-200 pt-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">3. Bloque Travis IA (Asistente 24/7)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Editá la propuesta de valor y características de Travis IA en travelapp.ar.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.travisSection?.enabled !== false}
                      onChange={(e) => updateField('travisSection', 'enabled', e.target.checked)}
                      className="h-4 w-4 accent-[#0a2a5b]"
                    />
                    Mostrar sección Travis IA
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput label="Badge Superior" value={data.travisSection?.badge || ''} onChange={(val) => updateField('travisSection', 'badge', val)} />
                  <CMSInput label="Título Principal" value={data.travisSection?.title || ''} onChange={(val) => updateField('travisSection', 'title', val)} />
                </div>
                <CMSTextarea label="Subtítulo Travis" value={data.travisSection?.subtitle || ''} onChange={(val) => updateField('travisSection', 'subtitle', val)} rows={2} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput label="Botón WhatsApp Travis (Texto)" value={data.travisSection?.primaryCtaText || ''} onChange={(val) => updateField('travisSection', 'primaryCtaText', val)} />
                  <CMSInput label="Botón Asesor Humano (Texto)" value={data.travisSection?.secondaryCtaText || ''} onChange={(val) => updateField('travisSection', 'secondaryCtaText', val)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {travisFeatures.map((feat: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                      <CMSInput
                        label={`Característica #${idx + 1} · Título`}
                        value={feat.title || ''}
                        onChange={(val) => {
                          const next = [...travisFeatures];
                          next[idx] = { ...next[idx], title: val };
                          updateField('travisSection', 'features', next);
                        }}
                      />
                      <CMSInput
                        label="Descripción breve"
                        value={feat.desc || ''}
                        onChange={(val) => {
                          const next = [...travisFeatures];
                          next[idx] = { ...next[idx], desc: val };
                          updateField('travisSection', 'features', next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ECO: CONTACTO, FOOTER, LEGAL & REDES */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_legales' && data && (
          <div className="space-y-7">
            {/* Aviso RRHH */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-[#0a2a5b]">
                  Bloque &ldquo;Trabajá con Nosotros&rdquo; sincronizado automáticamente con RRHH
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Las búsquedas laborales publicadas en la web se administran directamente desde el módulo de RRHH en Concorde 360 (no desde el CMS).
                </p>
              </div>
              <Link
                href="/hr"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45] shrink-0"
              >
                <Briefcase className="h-3.5 w-3.5" /> Ir al Módulo RRHH ↗
              </Link>
            </div>

            {/* 1. CONTACTO OFICIAL */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-800">1. Canales de Contacto Oficiales</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Se sincronizan en tiempo real en el Header, Buscador, Botones WhatsApp, Travis IA, Modal de Contacto y Footer de travelapp.ar y /marketplace.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="Teléfono de Ventas / 0810 (Header & Footer)"
                  value={data.contacto?.telefono || ''}
                  onChange={(val) => updateField('contacto', 'telefono', val)}
                  placeholder="0810-220-0018"
                />
                <CMSInput
                  label="Correo Electrónico Oficial"
                  value={data.contacto?.email || ''}
                  onChange={(val) => updateField('contacto', 'email', val)}
                  placeholder="hola@travelapp.ar"
                />
                <CMSInput
                  label="Enlace WhatsApp Oficial (wa.me)"
                  value={data.contacto?.whatsapp || ''}
                  onChange={(val) => {
                    updateField('contacto', 'whatsapp', val);
                    updateField('redesSociales', 'whatsapp', val);
                  }}
                  placeholder="https://wa.me/5493812000712"
                />
                <CMSInput
                  label="Número WhatsApp Visible (ej. +54 9 381 200-0712)"
                  value={data.contacto?.whatsappDisplay || ''}
                  onChange={(val) => updateField('contacto', 'whatsappDisplay', val)}
                  placeholder="+54 9 381 200-0712"
                />
              </div>
              <CMSInput
                label="Horarios de Atención (Modal Contacto)"
                value={data.contacto?.horarios || ''}
                onChange={(val) => updateField('contacto', 'horarios', val)}
                placeholder="Atención Lunes a Sábado de 09:00 a 20:00 hs"
              />
            </div>

            {/* 2. TEXTOS DEL FOOTER */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-700">2. Textos del Pie de Página (Footer)</h3>
              <CMSTextarea
                label="Descripción institucional bajo el logo en Footer"
                value={data.footer?.description || ''}
                onChange={(val) => updateField('footer', 'description', val)}
                rows={2}
              />
              <CMSInput
                label="Texto de Copyright"
                value={data.footer?.copyrightText || ''}
                onChange={(val) => updateField('footer', 'copyrightText', val)}
                placeholder="Todos los derechos reservados por TravelApp S.A.S. - 2026"
              />
            </div>

            {/* 3. INFORMACIÓN LEGAL */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-700">3. Datos Legales, Términos y Privacidad</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CMSInput label="Razón Social" value={data.legales?.razonSocial || ''} onChange={(val) => updateField('legales', 'razonSocial', val)} />
                <CMSInput label="CUIT" value={data.legales?.cuit || ''} onChange={(val) => updateField('legales', 'cuit', val)} />
                <CMSInput label="Domicilio Legal" value={data.legales?.domicilio || ''} onChange={(val) => updateField('legales', 'domicilio', val)} />
              </div>
              <CMSTextarea label="Términos y Condiciones (Modal del Footer)" value={data.legales?.terminos || ''} onChange={(val) => updateField('legales', 'terminos', val)} rows={4} />
              <CMSTextarea label="Política de Privacidad (Modal del Footer)" value={data.legales?.privacidad || ''} onChange={(val) => updateField('legales', 'privacidad', val)} rows={4} />
            </div>

            {/* 4. REDES SOCIALES */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-sm font-extrabold text-slate-700 mb-1">4. Redes Sociales</h3>
              <p className="text-xs text-slate-400 mb-4">Las redes con campo vacío permanecen ocultas automáticamente en el Footer.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput label="Facebook URL" value={data.redesSociales?.facebook || ''} onChange={(val) => updateField('redesSociales', 'facebook', val)} />
                <CMSInput label="Instagram URL" value={data.redesSociales?.instagram || ''} onChange={(val) => updateField('redesSociales', 'instagram', val)} />
                <CMSInput label="WhatsApp URL" value={data.redesSociales?.whatsapp || ''} onChange={(val) => updateField('redesSociales', 'whatsapp', val)} />
                <CMSInput label="LinkedIn URL" value={data.redesSociales?.linkedin || ''} onChange={(val) => updateField('redesSociales', 'linkedin', val)} />
                <CMSInput label="YouTube URL" value={data.redesSociales?.youtube || ''} onChange={(val) => updateField('redesSociales', 'youtube', val)} />
                <CMSInput label="TikTok URL" value={data.redesSociales?.tiktok || ''} onChange={(val) => updateField('redesSociales', 'tiktok', val)} />
              </div>
            </div>

            {/* 5. SELLOS GUBERNAMENTALES */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-sm font-extrabold text-slate-700 mb-1">5. Sellos Gubernamentales y de Registro</h3>
              <p className="text-xs text-slate-400 mb-4">Podés pegar código HTML oficial (ej. Data Fiscal AFIP / ARCA) o la URL directa de una imagen. Si queda vacío, se oculta.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSTextarea
                  label="Código HTML o URL del Sello QR ARCA / AFIP"
                  value={data.sellosLegales?.arcaQr || ''}
                  onChange={(val) => updateField('sellosLegales', 'arcaQr', val)}
                  rows={3}
                />
                <CMSTextarea
                  label="Código o URL Sello Bases de Datos (Ley 25.326)"
                  value={data.sellosLegales?.baseDatosSello || ''}
                  onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)}
                  rows={3}
                />
                <CMSInput
                  label="ATAVyT (Código o URL Logo)"
                  value={data.sellosLegales?.atavyt || ''}
                  onChange={(val) => updateField('sellosLegales', 'atavyt', val)}
                />
                <CMSInput
                  label="FAEVYT (Código o URL Logo)"
                  value={data.sellosLegales?.faevyt || ''}
                  onChange={(val) => updateField('sellosLegales', 'faevyt', val)}
                />
                <CMSInput
                  label="IATA Member (Código o URL Logo)"
                  value={data.sellosLegales?.iata || ''}
                  onChange={(val) => updateField('sellosLegales', 'iata', val)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ECO: MARKETPLACE SLIDER & BOTONES RÁPIDOS */}
        {selectedLanding === 'ecosistema' && activeTab === 'eco_marketplace' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Slider de Cabecera & Botones de Marketplace</h3>
                <p className="text-xs text-slate-400 mt-1">Configurá el slider principal de `/marketplace` y los botones destacados (ej: Verano 2027, Cupos Propios).</p>
              </div>
              <div className="flex items-center gap-2">
                <a href="/marketplace" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#0a2a5b] hover:bg-slate-50">
                  Ver Marketplace ↗
                </a>
                <a href="/travelapp" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45]">
                  Ir a Módulo TravelApp ↗
                </a>
              </div>
            </div>

            {/* Slider de cabecera */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700">Slides de Cabecera de Marketplace</h4>
                <button
                  type="button"
                  onClick={() =>
                    setData((prev: any) => ({
                      ...prev,
                      marketplaceHeroSlider: [
                        ...(prev.marketplaceHeroSlider || []),
                        {
                          id: `mkt-${Date.now()}`,
                          mediaType: 'image',
                          mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85',
                          badge: '✦ DESTACADO',
                          title: 'Nuevo Slide Marketplace',
                          subtitle: 'Descripción comercial de la campaña o temporada.',
                          ctaText: 'Ver Paquetes',
                          ctaUrl: '#catalogo-marketplace',
                        },
                      ],
                    }))
                  }
                  className="flex items-center gap-1 text-xs font-bold text-tech-blue border border-tech-blue/30 bg-tech-blue/5 px-3 py-1.5 rounded-lg hover:bg-tech-blue/10 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar Slide
                </button>
              </div>

              {(data.marketplaceHeroSlider || []).map((slide: any, idx: number) => (
                <div key={slide.id || idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0a2a5b]">Slide #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setData((prev: any) => ({
                          ...prev,
                          marketplaceHeroSlider: (prev.marketplaceHeroSlider || []).filter((_: any, i: number) => i !== idx),
                        }))
                      }
                      className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </div>
                  <MediaFieldUploader
                    label="Imagen o Video de Fondo (sube a Firebase Storage)"
                    value={slide.mediaUrl || ''}
                    allowVideo={true}
                    folder="cms_marketplace_hero"
                    onChange={(val, detectedType) => {
                      const updated = [...(data.marketplaceHeroSlider || [])];
                      updated[idx] = {
                        ...updated[idx],
                        mediaUrl: val,
                        mediaType: detectedType || (/\.(mp4|webm|mov)(\?.*)?$/i.test(val) ? 'video' : 'image'),
                      };
                      setData((prev: any) => ({ ...prev, marketplaceHeroSlider: updated }));
                    }}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CMSInput
                      label="Título"
                      value={slide.title || ''}
                      onChange={(val) => {
                        const updated = [...(data.marketplaceHeroSlider || [])];
                        updated[idx] = { ...updated[idx], title: val };
                        setData((prev: any) => ({ ...prev, marketplaceHeroSlider: updated }));
                      }}
                    />
                    <CMSInput
                      label="Badge Superior"
                      value={slide.badge || ''}
                      onChange={(val) => {
                        const updated = [...(data.marketplaceHeroSlider || [])];
                        updated[idx] = { ...updated[idx], badge: val };
                        setData((prev: any) => ({ ...prev, marketplaceHeroSlider: updated }));
                      }}
                    />
                    <CMSInput
                      label="Texto Botón CTA"
                      value={slide.ctaText || ''}
                      onChange={(val) => {
                        const updated = [...(data.marketplaceHeroSlider || [])];
                        updated[idx] = { ...updated[idx], ctaText: val };
                        setData((prev: any) => ({ ...prev, marketplaceHeroSlider: updated }));
                      }}
                    />
                    <CMSInput
                      label="Enlace del Botón CTA"
                      value={slide.ctaUrl || ''}
                      onChange={(val) => {
                        const updated = [...(data.marketplaceHeroSlider || [])];
                        updated[idx] = { ...updated[idx], ctaUrl: val };
                        setData((prev: any) => ({ ...prev, marketplaceHeroSlider: updated }));
                      }}
                      placeholder="#catalogo-marketplace"
                    />
                  </div>
                  <CMSTextarea
                    label="Subtítulo"
                    value={slide.subtitle || ''}
                    onChange={(val) => {
                      const updated = [...(data.marketplaceHeroSlider || [])];
                      updated[idx] = { ...updated[idx], subtitle: val };
                      setData((prev: any) => ({ ...prev, marketplaceHeroSlider: updated }));
                    }}
                    rows={2}
                  />
                </div>
              ))}
            </div>

            {/* Botones rápidos / campañas */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-700">Botones Rápidos de Campaña en Marketplace</h4>
                  <p className="text-xs text-slate-400">Ej: Verano 2027, Cupos Propios, Escapadas. Filtran fichas que tengan esa etiqueta o palabra clave.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setData((prev: any) => ({
                      ...prev,
                      marketplaceQuickButtons: [
                        ...(prev.marketplaceQuickButtons || []),
                        { id: `btn-${Date.now()}`, label: 'Verano 2027', keyword: 'Verano 2027' },
                      ],
                    }))
                  }
                  className="flex items-center gap-1 text-xs font-bold text-tech-blue border border-tech-blue/30 bg-tech-blue/5 px-3 py-1.5 rounded-lg hover:bg-tech-blue/10 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar Botón
                </button>
              </div>

              <div className="space-y-2">
                {(data.marketplaceQuickButtons || []).map((btn: any, idx: number) => (
                  <div key={btn.id || idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="sm:col-span-2">
                      <CMSInput
                        label="Texto del Botón"
                        value={btn.label || ''}
                        onChange={(val) => {
                          const updated = [...(data.marketplaceQuickButtons || [])];
                          updated[idx] = { ...updated[idx], label: val };
                          setData((prev: any) => ({ ...prev, marketplaceQuickButtons: updated }));
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <CMSInput
                        label="Palabra clave / Etiqueta de filtro"
                        value={btn.keyword || ''}
                        onChange={(val) => {
                          const updated = [...(data.marketplaceQuickButtons || [])];
                          updated[idx] = { ...updated[idx], keyword: val };
                          setData((prev: any) => ({ ...prev, marketplaceQuickButtons: updated }));
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setData((prev: any) => ({
                          ...prev,
                          marketplaceQuickButtons: (prev.marketplaceQuickButtons || []).filter((_: any, i: number) => i !== idx),
                        }))
                      }
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg justify-self-end cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* APP INICIO - NOVEDADES CARDS */}
        {selectedLanding === 'app-inicio' && activeTab === 'app_cards' && data?.block1 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Tarjetas Flotantes de la App (Carrusel Superpuesto)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las tarjetas de novedades, promociones y beneficios con efecto de superposición dinámica (Swipe estilo Mercado Pago).</p>
              </div>
              <button
                onClick={() => addAppCard('block1')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600 bg-amber-600/5 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Tarjeta
              </button>
            </div>

            {/* PREVISUALIZADOR EN VIVO ESTILO MERCADO PAGO */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200/60 p-4 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-amber-600" /> Vista Previa Interactiva (Simulador de Móvil)
                </span>
                <span className="text-[9px] font-bold text-slate-400">Deslizá con el mouse o dedo</span>
              </div>
              <div className="bg-white rounded-2xl p-2 shadow-md max-w-md mx-auto">
                <OverlappingCardCarousel
                  cards={data.block1.cards || []}
                  title={data.block1.blockTitle || "Novedades del Ecosistema"}
                  subtitle="Deslizá para descubrir promociones exclusivas"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-extrabold text-slate-700 mb-1">Título de la Sección en la App</label>
              <input
                type="text"
                value={data.block1.blockTitle || ''}
                onChange={(e) => updateBlockTitle('block1', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Ej: Novedades del Ecosistema"
              />
            </div>

            <div className="space-y-4">
              {(data.block1.cards || []).map((card: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteAppCard('block1', idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Tarjeta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="text-xs font-black text-amber-600 uppercase">Tarjeta N° {idx + 1}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Título Principal (Corto y directo)</label>
                      <input
                        type="text"
                        value={card.title || ''}
                        onChange={(e) => updateAppCard('block1', idx, 'title', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: 150 Puntos Extra"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Badge Superior (Etiqueta Flotante)</label>
                      <input
                        type="text"
                        value={card.badge || ''}
                        onChange={(e) => updateAppCard('block1', idx, 'badge', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: 🎁 REWARDS / 20% OFF"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Subtítulo Corto (1 línea)</label>
                      <input
                        type="text"
                        value={card.subtitle || card.description || ''}
                        onChange={(e) => {
                          updateAppCard('block1', idx, 'subtitle', e.target.value);
                          updateAppCard('block1', idx, 'description', e.target.value);
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: Completá tu foto de perfil y sumá puntos gratis."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Texto del Botón CTA</label>
                      <input
                        type="text"
                        value={card.ctaText || 'Ver Beneficio'}
                        onChange={(e) => updateAppCard('block1', idx, 'ctaText', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: Sumar Puntos / Explorar"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Enlace / URL de redirección</label>
                      <input
                        type="text"
                        value={card.url || ''}
                        onChange={(e) => updateAppCard('block1', idx, 'url', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Imagen de Fondo de la Tarjeta</label>
                      <AppCardImageUploader blockKey="block1" idx={idx} value={card.imageUrl || ''} />
                      {card.imageUrl ? (
                        <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-slate-200">
                          <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {(data.block1.cards || []).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay tarjetas agregadas. Haz clic en "Agregar Tarjeta" para crear una.
                </div>
              )}
            </div>
          </div>
        )}

        {/* APP INICIO - BENEFICIOS REWARDS CARDS */}
        {selectedLanding === 'app-inicio' && activeTab === 'app_rewards' && data?.block2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Tarjetas de Beneficios Rewards (Carrusel Superpuesto)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las tarjetas del carrusel de beneficios directos de Rewards con efecto de superposición dinámica (Swipe estilo Mercado Pago).</p>
              </div>
              <button
                onClick={() => addAppCard('block2')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600 bg-amber-600/5 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Tarjeta
              </button>
            </div>

            {/* PREVISUALIZADOR EN VIVO ESTILO MERCADO PAGO */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200/60 p-4 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-amber-600" /> Vista Previa Interactiva (Simulador de Móvil)
                </span>
                <span className="text-[9px] font-bold text-slate-400">Deslizá con el mouse o dedo</span>
              </div>
              <div className="bg-white rounded-2xl p-2 shadow-md max-w-md mx-auto">
                <OverlappingCardCarousel
                  cards={data.block2.cards || []}
                  title={data.block2.blockTitle || "Beneficios Rewards"}
                  subtitle="Canjes y promociones exclusivas para miembros"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-extrabold text-slate-700 mb-1">Título de la Sección en la App</label>
              <input
                type="text"
                value={data.block2.blockTitle || ''}
                onChange={(e) => updateBlockTitle('block2', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Ej: Beneficios Rewards"
              />
            </div>

            <div className="space-y-4">
              {(data.block2.cards || []).map((card: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative group space-y-3">
                  <button
                    onClick={() => deleteAppCard('block2', idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                    title="Eliminar Tarjeta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="text-xs font-black text-amber-600 uppercase">Tarjeta N° {idx + 1}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Título Principal</label>
                      <input
                        type="text"
                        value={card.title || ''}
                        onChange={(e) => updateAppCard('block2', idx, 'title', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: 20% OFF Gastronomía"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Badge Superior</label>
                      <input
                        type="text"
                        value={card.badge || ''}
                        onChange={(e) => updateAppCard('block2', idx, 'badge', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: 🍔 BENEFICIO / 🏨 HOTELES"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Subtítulo Corto (1 línea)</label>
                      <input
                        type="text"
                        value={card.subtitle || card.description || ''}
                        onChange={(e) => {
                          updateAppCard('block2', idx, 'subtitle', e.target.value);
                          updateAppCard('block2', idx, 'description', e.target.value);
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: Presentá tu QR en restaurantes adheridos."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Texto del Botón CTA</label>
                      <input
                        type="text"
                        value={card.ctaText || 'Ver Beneficio'}
                        onChange={(e) => updateAppCard('block2', idx, 'ctaText', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="Ej: Ver Locales / Reservar"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Enlace / URL de redirección</label>
                      <input
                        type="text"
                        value={card.url || ''}
                        onChange={(e) => updateAppCard('block2', idx, 'url', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Imagen de Fondo de la Tarjeta</label>
                      <AppCardImageUploader blockKey="block2" idx={idx} value={card.imageUrl || ''} />
                      {card.imageUrl ? (
                        <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-slate-200">
                          <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {(data.block2.cards || []).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay tarjetas agregadas. Haz clic en "Agregar Tarjeta" para crear una.
                </div>
              )}
            </div>
          </div>
        )}

        {/* LANDING AFILIADOS EDITORS */}
        {selectedLanding === 'afiliados' && activeTab === 'afi_hero' && data?.hero && (() => {
          const statsList = Array.isArray(data.stats) && data.stats.length > 0
            ? data.stats
            : DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS.stats;
          const updateStat = (idx: number, field: string, value: string) => {
            setData((prev: any) => {
              const list = Array.isArray(prev?.stats) && prev.stats.length > 0
                ? [...prev.stats]
                : [...DEFAULT_AFILIADOS_CMS_DATA_FOR_CMS.stats];
              list[idx] = { ...(list[idx] || {}), [field]: value };
              return { ...prev, stats: list };
            });
          };
          return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-purple-700">1. Hero Principal, Cinta Superior & Métricas (afiliados.travelapp.ar)</h3>
              <p className="text-xs text-slate-500 mt-1">Todo lo que edités acá se sincroniza en tiempo real con la portada de Embajadores & Partners.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <CMSInput
                label="Texto Botón CTA Header"
                value={data.header?.ctaText || ''}
                onChange={(val) => updateField('header', 'ctaText', val)}
                placeholder="Ser Embajador"
              />
              <CMSInput
                label="Ruta Iniciar Sesión"
                value={data.header?.loginUrl || ''}
                onChange={(val) => updateField('header', 'loginUrl', val)}
                placeholder="/afiliados/login"
              />
              <CMSInput
                label="Ruta Registro Partner"
                value={data.header?.registerUrl || ''}
                onChange={(val) => updateField('header', 'registerUrl', val)}
                placeholder="/afiliados/register"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <CMSInput
                  label="Cinta Informativa Superior (Ribbon)"
                  value={data.hero.ribbonText || ''}
                  onChange={(val) => updateField('hero', 'ribbonText', val)}
                  placeholder="Comisiones de hasta el 10% con acreditación inmediata..."
                />
              </div>
              <CMSInput
                label="Badge Superior (Etiqueta)"
                value={data.hero.badge || ''}
                onChange={(val) => updateField('hero', 'badge', val)}
                placeholder="PROGRAMA OFICIAL DE AFILIADOS & PARTNERS"
              />
              <CMSInput
                label="Código Demo en Hero"
                value={data.hero.demoCode || ''}
                onChange={(val) => updateField('hero', 'demoCode', val)}
                placeholder="TUCUMAN10OFF"
              />
              <div className="md:col-span-2">
                <CMSInput
                  label="Título Principal"
                  value={data.hero.title || ''}
                  onChange={(val) => updateField('hero', 'title', val)}
                  placeholder="Monetizá tu audiencia recomendando experiencias reales."
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Subtítulo / Descripción"
                  value={data.hero.subtitle || ''}
                  onChange={(val) => updateField('hero', 'subtitle', val)}
                  rows={3}
                />
              </div>
              <CMSInput
                label="Texto Botón Primario"
                value={data.hero.primaryCtaText || ''}
                onChange={(val) => updateField('hero', 'primaryCtaText', val)}
              />
              <CMSInput
                label="Texto Botón Secundario"
                value={data.hero.secondaryCtaText || ''}
                onChange={(val) => updateField('hero', 'secondaryCtaText', val)}
              />
              <div className="md:col-span-2">
                <ImageUploaderInput
                  label="Imagen de Fondo Hero (Storage HD)"
                  section="hero"
                  field="heroImage"
                  value={data.hero.heroImage || ''}
                />
              </div>
            </div>

            {/* 4 Métricas Inferiores del Hero */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-[#0A2A5B] uppercase tracking-wider">4 Métricas de la Barra Inferior del Hero</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {statsList.map((st: any, sIdx: number) => (
                  <div key={sIdx} className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <CMSInput
                      label={`Etiqueta ${sIdx + 1}`}
                      value={st.label || ''}
                      onChange={(val) => updateStat(sIdx, 'label', val)}
                    />
                    <CMSInput
                      label="Valor"
                      value={st.value || ''}
                      onChange={(val) => updateStat(sIdx, 'value', val)}
                    />
                    <CMSInput
                      label="Detalle"
                      value={st.detail || ''}
                      onChange={(val) => updateStat(sIdx, 'detail', val)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          );
        })()}

        {selectedLanding === 'afiliados' && activeTab === 'afi_pushpop' && data && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0A2A5B]">2. Push Pop Minimalista (Avisos / Promos Partners)</h3>
                <p className="text-xs text-slate-500 mt-1">Modal corporativo minimalista. Podés usarlo como aviso informativo o habilitar el cupón opcional.</p>
              </div>
              <label className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!data.promoPopup?.enabled}
                  onChange={(e) => updateField('promoPopup', 'enabled', e.target.checked)}
                  className="w-4 h-4 accent-[#0A2A5B]"
                />
                <span className="text-xs font-bold text-slate-800">
                  {data.promoPopup?.enabled ? 'Push Pop ACTIVO' : 'Push Pop Desactivado'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Etiqueta Superior (Badge)"
                value={data.promoPopup?.badge || ''}
                onChange={(val) => updateField('promoPopup', 'badge', val)}
                placeholder="PROGRAMA PARTNERS"
              />
              <CMSInput
                label="Demora de aparición (segundos)"
                type="number"
                value={String(data.promoPopup?.delaySeconds ?? 4)}
                onChange={(val) => updateField('promoPopup', 'delaySeconds', Math.max(0, Number(val) || 0))}
              />
              <div className="md:col-span-2">
                <CMSInput
                  label="Título del Push Pop"
                  value={data.promoPopup?.title || ''}
                  onChange={(val) => updateField('promoPopup', 'title', val)}
                />
              </div>
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Mensaje / Descripción"
                  value={data.promoPopup?.subtitle || ''}
                  onChange={(val) => updateField('promoPopup', 'subtitle', val)}
                  rows={2}
                />
              </div>

              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!data.promoPopup?.showDiscountCode}
                    onChange={(e) => updateField('promoPopup', 'showDiscountCode', e.target.checked)}
                    className="w-4 h-4 accent-[#0A2A5B]"
                  />
                  <span className="text-xs font-bold text-[#0A2A5B]">
                    Mostrar Cupón de Descuento (desactivá esta opción para usar el Push Pop solo como aviso informativo)
                  </span>
                </label>
                {data.promoPopup?.showDiscountCode && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <CMSInput
                      label="Código del Cupón"
                      value={data.promoPopup?.discountCode || ''}
                      onChange={(val) => updateField('promoPopup', 'discountCode', val)}
                      placeholder="PARTNER20"
                    />
                    <CMSInput
                      label="Etiqueta Beneficio"
                      value={data.promoPopup?.discountBadge || ''}
                      onChange={(val) => updateField('promoPopup', 'discountBadge', val)}
                      placeholder="Bono Especial"
                    />
                  </div>
                )}
              </div>

              <CMSInput
                label="Texto del Botón CTA"
                value={data.promoPopup?.ctaText || ''}
                onChange={(val) => updateField('promoPopup', 'ctaText', val)}
                placeholder="Registrarme Gratis"
              />
              <CMSInput
                label="Enlace del Botón CTA"
                value={data.promoPopup?.ctaUrl || ''}
                onChange={(val) => updateField('promoPopup', 'ctaUrl', val)}
                placeholder="/afiliados/register"
              />
              <div className="md:col-span-2">
                <MediaFieldUploader
                  label="Imagen Opcional del Push Pop"
                  value={data.promoPopup?.imageUrl || ''}
                  onChange={(val) => updateField('promoPopup', 'imageUrl', val)}
                  folder="cms/afiliados/pushpop"
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'afiliados' && activeTab === 'afi_cobro' && data?.payoutMethods && (
          <div className="space-y-6">
            <h3 className="text-base font-extrabold text-purple-700">3. Cobros (MP / CBU), Paneles Editoriales & Niveles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Título Sección Cobros"
                value={data.payoutMethods.title || ''}
                onChange={(val) => updateField('payoutMethods', 'title', val)}
              />
              <CMSInput
                label="Subtítulo Transparencia"
                value={data.payoutMethods.subtitle || ''}
                onChange={(val) => updateField('payoutMethods', 'subtitle', val)}
              />
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 md:col-span-2 space-y-3">
                <span className="text-xs font-bold text-purple-900">Panel 1: Split Mercado Pago Instantáneo</span>
                <CMSInput
                  label="Título Opción MP"
                  value={data.payoutMethods.optionMpTitle || ''}
                  onChange={(val) => updateField('payoutMethods', 'optionMpTitle', val)}
                />
                <CMSTextarea
                  label="Descripción Split Inverso MP"
                  value={data.payoutMethods.optionMpDesc || ''}
                  onChange={(val) => updateField('payoutMethods', 'optionMpDesc', val)}
                  rows={2}
                />
              </div>
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 md:col-span-2 space-y-3">
                <span className="text-xs font-bold text-amber-900">Panel 2: CBU / CVU Liquidación Semanal</span>
                <CMSInput
                  label="Título Opción CBU"
                  value={data.payoutMethods.optionCbuTitle || ''}
                  onChange={(val) => updateField('payoutMethods', 'optionCbuTitle', val)}
                />
                <CMSTextarea
                  label="Descripción CBU Semanal"
                  value={data.payoutMethods.optionCbuDesc || ''}
                  onChange={(val) => updateField('payoutMethods', 'optionCbuDesc', val)}
                  rows={2}
                />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-[#0A2A5B]">Panel 3: Códigos Nominales y QR</span>
                <CMSInput
                  label="Título Panel 3"
                  value={data.payoutMethods.panel3Title || ''}
                  onChange={(val) => updateField('payoutMethods', 'panel3Title', val)}
                />
                <CMSTextarea
                  label="Descripción Panel 3"
                  value={data.payoutMethods.panel3Desc || ''}
                  onChange={(val) => updateField('payoutMethods', 'panel3Desc', val)}
                  rows={2}
                />
                <MediaFieldUploader
                  label="Imagen Panel 3"
                  value={data.payoutMethods.panel3Image || ''}
                  onChange={(val) => updateField('payoutMethods', 'panel3Image', val)}
                  folder="cms/afiliados/panel3"
                />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-[#0A2A5B]">Panel 4: Creadores, Conserjerías y Hoteles</span>
                <CMSInput
                  label="Título Panel 4"
                  value={data.payoutMethods.panel4Title || ''}
                  onChange={(val) => updateField('payoutMethods', 'panel4Title', val)}
                />
                <CMSTextarea
                  label="Descripción Panel 4"
                  value={data.payoutMethods.panel4Desc || ''}
                  onChange={(val) => updateField('payoutMethods', 'panel4Desc', val)}
                  rows={2}
                />
                <MediaFieldUploader
                  label="Imagen Panel 4"
                  value={data.payoutMethods.panel4Image || ''}
                  onChange={(val) => updateField('payoutMethods', 'panel4Image', val)}
                  folder="cms/afiliados/panel4"
                />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <span className="text-xs font-bold text-[#0A2A5B]">Encabezado Sección Niveles y Comisiones</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Los porcentajes y rangos de cada nivel se sincronizan automáticamente desde Configuración de Afiliados.</p>
                </div>
                <CMSInput
                  label="Título Niveles"
                  value={data.payoutMethods.nivelesTitle || ''}
                  onChange={(val) => updateField('payoutMethods', 'nivelesTitle', val)}
                />
                <CMSInput
                  label="Subtítulo Niveles"
                  value={data.payoutMethods.nivelesSubtitle || ''}
                  onChange={(val) => updateField('payoutMethods', 'nivelesSubtitle', val)}
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'afiliados' && activeTab === 'afi_faq' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-purple-700">4. Preguntas Frecuentes (FAQ)</h3>
                <p className="text-xs text-slate-400 mt-1">Configura las preguntas y respuestas para embajadores.</p>
              </div>
              <button
                onClick={() => addFaq()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-600 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-600 hover:text-white transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Pregunta
              </button>
            </div>

            <div className="space-y-4">
              {(data.faqs || []).map((faqItem: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm relative space-y-3">
                  <button
                    onClick={() => deleteFaq(idx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg border border-slate-200 shadow-sm transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="text-xs font-black text-purple-700">Pregunta N° {idx + 1}</div>
                  <FaqInput label="Pregunta" value={faqItem.q || ''} idx={idx} field="q" />
                  <FaqTextarea label="Respuesta" value={faqItem.a || ''} idx={idx} field="a" />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'afiliados' && activeTab === 'afi_footer' && (
          <div className="space-y-6">
            <h3 className="text-base font-extrabold text-[#0A2A5B]">5. Contacto, Redes Sociales, Legales & Pie de Página</h3>

            {/* Canales de Contacto Directo */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-[#0A2A5B] uppercase tracking-wider">Datos de Contacto (Header, Travis y Footer)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <CMSInput
                  label="Teléfono de Atención"
                  value={data.contacto?.telefono || ''}
                  onChange={(val) => updateField('contacto', 'telefono', val)}
                  placeholder="0810-220-0018"
                />
                <CMSInput
                  label="Email Oficial"
                  value={data.contacto?.email || ''}
                  onChange={(val) => updateField('contacto', 'email', val)}
                  placeholder="hola@travelapp.ar"
                />
                <CMSInput
                  label="WhatsApp (Solo Dígitos)"
                  value={data.contacto?.whatsapp || ''}
                  onChange={(val) => updateField('contacto', 'whatsapp', val)}
                  placeholder="5493812000712"
                />
                <CMSInput
                  label="WhatsApp Visible"
                  value={data.contacto?.whatsappDisplay || ''}
                  onChange={(val) => updateField('contacto', 'whatsappDisplay', val)}
                  placeholder="+54 9 381 200-0712"
                />
              </div>
            </div>

            {/* Redes Sociales */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-[#0A2A5B] uppercase tracking-wider">Redes Sociales (si dejás una vacía se oculta del Footer)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CMSInput
                  label="WhatsApp URL (Botón Flotante)"
                  value={data.redesSociales?.whatsapp || ''}
                  onChange={(val) => updateField('redesSociales', 'whatsapp', val)}
                  placeholder="https://wa.me/5493812000712"
                />
                <CMSInput
                  label="Messenger URL"
                  value={data.redesSociales?.messenger || ''}
                  onChange={(val) => updateField('redesSociales', 'messenger', val)}
                  placeholder="https://m.me/travelapp"
                />
                <CMSInput
                  label="Instagram URL"
                  value={data.redesSociales?.instagram || ''}
                  onChange={(val) => updateField('redesSociales', 'instagram', val)}
                  placeholder="https://instagram.com/travelapp.ar"
                />
                <CMSInput
                  label="Facebook URL"
                  value={data.redesSociales?.facebook || ''}
                  onChange={(val) => updateField('redesSociales', 'facebook', val)}
                  placeholder="https://facebook.com/travelapp.ar"
                />
                <CMSInput
                  label="YouTube URL"
                  value={data.redesSociales?.youtube || ''}
                  onChange={(val) => updateField('redesSociales', 'youtube', val)}
                />
                <CMSInput
                  label="TikTok URL"
                  value={data.redesSociales?.tiktok || ''}
                  onChange={(val) => updateField('redesSociales', 'tiktok', val)}
                />
                <CMSInput
                  label="LinkedIn URL"
                  value={data.redesSociales?.linkedin || ''}
                  onChange={(val) => updateField('redesSociales', 'linkedin', val)}
                />
              </div>
            </div>

            {/* Información Legal Corporativa */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-[#0A2A5B] uppercase tracking-wider">Información Legal & Razón Social</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CMSInput
                  label="Razón Social"
                  value={data.legales?.razonSocial || ''}
                  onChange={(val) => updateField('legales', 'razonSocial', val)}
                  placeholder="TravelApp S.A.S."
                />
                <CMSInput
                  label="CUIT"
                  value={data.legales?.cuit || ''}
                  onChange={(val) => updateField('legales', 'cuit', val)}
                  placeholder="30-71829340-9"
                />
                <CMSInput
                  label="Domicilio Legal"
                  value={data.legales?.domicilio || ''}
                  onChange={(val) => updateField('legales', 'domicilio', val)}
                  placeholder="San Miguel de Tucumán, Argentina"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSTextarea
                  label="Términos y Condiciones"
                  value={data.legales?.terminos || ''}
                  onChange={(val) => updateField('legales', 'terminos', val)}
                  rows={3}
                />
                <CMSTextarea
                  label="Política de Privacidad"
                  value={data.legales?.privacidad || ''}
                  onChange={(val) => updateField('legales', 'privacidad', val)}
                  rows={3}
                />
              </div>
            </div>

            {/* Sellos Legales & Fiscales */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-[#0A2A5B] uppercase tracking-wider">Sellos Fiscales & Registros (ARCA / Base de Datos)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSTextarea
                  label="Sello ARCA / AFIP (Código HTML QR o URL de imagen)"
                  value={data.sellosLegales?.arcaQr || ''}
                  onChange={(val) => updateField('sellosLegales', 'arcaQr', val)}
                  rows={2}
                />
                <CMSTextarea
                  label="Sello Protección de Datos Personales (HTML o URL)"
                  value={data.sellosLegales?.baseDatosSello || ''}
                  onChange={(val) => updateField('sellosLegales', 'baseDatosSello', val)}
                  rows={2}
                />
              </div>
            </div>

            {/* Copyright & Marca */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CMSInput
                label="Nombre de Marca Footer"
                value={data.footer?.brandText || ''}
                onChange={(val) => updateField('footer', 'brandText', val)}
              />
              <CMSInput
                label="Texto Copyright"
                value={data.footer?.copyrightText || ''}
                onChange={(val) => updateField('footer', 'copyrightText', val)}
              />
              <div className="md:col-span-2">
                <CMSTextarea
                  label="Descripción Institucional del Footer"
                  value={data.footer?.description || ''}
                  onChange={(val) => updateField('footer', 'description', val)}
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* EDITORES LUNA VIAJERA */}
        {/* ======================================================== */}

        {selectedLanding === 'lunaviajera' && activeTab === 'lv_hero' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-[#0A2E20] flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-[#DFB15B]" />
                Hero Slider & Portada (Luna Viajera)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configura las fotos de fondo, textos principales y botones del Hero rotativo.</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-[#0A2E20] uppercase tracking-wider">Encabezado Global</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="Badge Superior"
                  value={data.hero?.badge || ''}
                  onChange={(val) => updateField('hero', 'badge', val)}
                  placeholder="✦ EXCURSIONES REGIONALES & SALIDAS DE 1 DÍA"
                />
                <CMSInput
                  label="Título Principal"
                  value={data.hero?.title || ''}
                  onChange={(val) => updateField('hero', 'title', val)}
                  placeholder="Descubrí la magia de los Valles y las Yungas"
                />
              </div>
              <CMSTextarea
                label="Subtítulo / Bajada"
                value={data.hero?.subtitle || ''}
                onChange={(val) => updateField('hero', 'subtitle', val)}
                rows={2}
                placeholder="Excursiones de día completo con transporte ida y vuelta desde Yerba Buena..."
              />
            </div>

            {/* Slides en Rotación */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#0A2E20] uppercase tracking-wider">
                  Slides de Fondo (Soporta Imágenes HD y Videos MP4)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const currentSlides = data.hero?.slides || [];
                    const newSlide = {
                      id: `lv-slide-${Date.now()}`,
                      badge: '✦ NUEVA SALIDA REGIONAL',
                      title: 'Nuevo Destino en el Norte',
                      subtitle: 'Excursiones de día completo con transporte y guías habilitados.',
                      mediaUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1800&q=85',
                      videoUrl: ''
                    };
                    updateField('hero', 'slides', [...currentSlides, newSlide]);
                  }}
                  className="flex items-center gap-1 text-xs font-bold bg-[#0A2E20] text-[#DFB15B] px-3 py-1.5 rounded-xl hover:bg-[#0A2E20]/90 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar Slide
                </button>
              </div>

              {(data.hero?.slides || []).map((slide: any, sIdx: number) => (
                <div key={slide.id || sIdx} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-black text-[#DFB15B]">Slide N° {sIdx + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">{slide.badge}</span>
                      {(data.hero?.slides || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (data.hero?.slides || []).filter((_: any, i: number) => i !== sIdx);
                            updateField('hero', 'slides', updated);
                          }}
                          className="text-slate-400 hover:text-red-500 transition p-1"
                          title="Eliminar slide"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CMSInput
                      label="Badge del Slide"
                      value={slide.badge || ''}
                      onChange={(val) => {
                        const updated = [...(data.hero?.slides || [])];
                        updated[sIdx] = { ...updated[sIdx], badge: val };
                        updateField('hero', 'slides', updated);
                      }}
                    />
                    <CMSInput
                      label="Título"
                      value={slide.title || ''}
                      onChange={(val) => {
                        const updated = [...(data.hero?.slides || [])];
                        updated[sIdx] = { ...updated[sIdx], title: val };
                        updateField('hero', 'slides', updated);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Imagen de Fondo HD (URL o Subir Archivo)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={slide.mediaUrl || ''}
                        onChange={(e) => {
                          const updated = [...(data.hero?.slides || [])];
                          updated[sIdx] = { ...updated[sIdx], mediaUrl: e.target.value };
                          updateField('hero', 'slides', updated);
                        }}
                        placeholder="https://..."
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none"
                      />
                      <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-[#0A2E20] border border-[#0A2E20] bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all shadow-sm shrink-0">
                        <Upload className="h-3.5 w-3.5" />
                        Subir Imagen
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const url = await uploadMediaFile(file, 'cms_lunaviajera_slides');
                                const updated = [...(data.hero?.slides || [])];
                                updated[sIdx] = { ...updated[sIdx], mediaUrl: url };
                                updateField('hero', 'slides', updated);
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Video HD en Loop Opcional (MP4 / WebM URL o Subir Archivo)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={slide.videoUrl || ''}
                        onChange={(e) => {
                          const updated = [...(data.hero?.slides || [])];
                          updated[sIdx] = { ...updated[sIdx], videoUrl: e.target.value, mediaType: e.target.value ? 'video' : 'image' };
                          updateField('hero', 'slides', updated);
                        }}
                        placeholder="Opcional: URL .mp4 para reproducir video en el Hero"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none font-mono"
                      />
                      <label className="flex cursor-pointer items-center justify-center gap-1 text-[11px] font-bold text-indigo-600 border border-indigo-600 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-all shadow-sm shrink-0">
                        <Upload className="h-3.5 w-3.5" />
                        Subir Video
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const url = await uploadMediaFile(file, 'cms_lunaviajera_videos');
                                const updated = [...(data.hero?.slides || [])];
                                updated[sIdx] = { ...updated[sIdx], videoUrl: url, mediaType: 'video' };
                                updateField('hero', 'slides', updated);
                              } catch (err: any) {
                                alert(`No se pudo subir el video (${err.message}). Podés pegar una URL .mp4.`);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {slide.mediaUrl && (
                      <div className="w-36 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={slide.mediaUrl} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {slide.videoUrl && (
                      <div className="w-36 h-20 rounded-lg overflow-hidden border border-indigo-200 bg-slate-900">
                        <video src={slide.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <CMSTextarea
                    label="Descripción / Bajada"
                    value={slide.subtitle || ''}
                    onChange={(val) => {
                      const updated = [...(data.hero?.slides || [])];
                      updated[sIdx] = { ...updated[sIdx], subtitle: val };
                      updateField('hero', 'slides', updated);
                    }}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'lunaviajera' && activeTab === 'lv_cards' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-[#0A2E20] flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-[#DFB15B]" />
                5 Tarjetas Flotantes Superpuestas
              </h3>
              <p className="text-xs text-slate-400 mt-1">Los 5 pilares operativos que se muestran sobre el pie del Hero en Luna Viajera.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data.floatingCards || []).map((card: any, cIdx: number) => (
                <div key={card.id || cIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-black text-[#DFB15B]">Pilar N° {cIdx + 1}</span>
                    <span className="text-[10px] font-bold bg-[#0A2E20] text-[#DFB15B] px-2 py-0.5 rounded">{card.tag}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CMSInput
                      label="Etiqueta / Tag"
                      value={card.tag || ''}
                      onChange={(val) => {
                        const updated = [...(data.floatingCards || [])];
                        updated[cIdx] = { ...updated[cIdx], tag: val };
                        setData((prev: any) => ({ ...prev, floatingCards: updated }));
                      }}
                    />
                    <CMSInput
                      label="Ícono (bus, users, mountain, heart, card)"
                      value={card.iconName || ''}
                      onChange={(val) => {
                        const updated = [...(data.floatingCards || [])];
                        updated[cIdx] = { ...updated[cIdx], iconName: val };
                        setData((prev: any) => ({ ...prev, floatingCards: updated }));
                      }}
                    />
                  </div>
                  <CMSInput
                    label="Título"
                    value={card.title || ''}
                    onChange={(val) => {
                      const updated = [...(data.floatingCards || [])];
                      updated[cIdx] = { ...updated[cIdx], title: val };
                      setData((prev: any) => ({ ...prev, floatingCards: updated }));
                    }}
                  />
                  <CMSTextarea
                    label="Descripción"
                    value={card.desc || ''}
                    onChange={(val) => {
                      const updated = [...(data.floatingCards || [])];
                      updated[cIdx] = { ...updated[cIdx], desc: val };
                      setData((prev: any) => ({ ...prev, floatingCards: updated }));
                    }}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'lunaviajera' && activeTab === 'lv_galeria' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0A2E20] flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-[#DFB15B]" />
                  Galería de Experiencias & Fotos Reales
                </h3>
                <p className="text-xs text-slate-400 mt-1">Imágenes y postales de excursiones subidas desde el dashboard para la landing de Luna Viajera.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newImg = {
                    id: `gal-${Date.now()}`,
                    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
                    caption: "Nueva Postal de Excursión",
                    location: "Tucumán"
                  };
                  setData((prev: any) => ({
                    ...prev,
                    galeria: {
                      ...prev.galeria,
                      images: [...(prev.galeria?.images || []), newImg]
                    }
                  }));
                }}
                className="px-4 py-2 bg-[#0A2E20] text-[#F4D375] hover:bg-[#0c3525] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Foto</span>
              </button>
            </div>

            {/* Cabecera de la sección */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="Badge Superior"
                  value={data.galeria?.badge || ''}
                  onChange={(val) => {
                    setData((prev: any) => ({
                      ...prev,
                      galeria: { ...prev.galeria, badge: val }
                    }));
                  }}
                  placeholder="Recuerdos & Postales"
                />
                <CMSInput
                  label="Título de la Galería"
                  value={data.galeria?.title || ''}
                  onChange={(val) => {
                    setData((prev: any) => ({
                      ...prev,
                      galeria: { ...prev.galeria, title: val }
                    }));
                  }}
                  placeholder="Galería de Experiencias"
                />
              </div>
              <CMSInput
                label="Subtítulo / Bajada"
                value={data.galeria?.subtitle || ''}
                onChange={(val) => {
                  setData((prev: any) => ({
                    ...prev,
                    galeria: { ...prev.galeria, subtitle: val }
                  }));
                }}
                placeholder="Momentos reales compartidos por nuestros viajeros en los rincones más mágicos..."
              />
            </div>

            {/* Lista de Fotos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(data.galeria?.images || []).map((img: any, iIdx: number) => (
                <div key={img.id || iIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative group">
                  <div className="h-40 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 relative">
                    <img
                      src={img.url}
                      alt={img.caption || `Foto ${iIdx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = (data.galeria?.images || []).filter((_: any, i: number) => i !== iIdx);
                        setData((prev: any) => ({
                          ...prev,
                          galeria: { ...prev.galeria, images: filtered }
                        }));
                      }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition shadow-md"
                      title="Eliminar foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <CMSInput
                    label="URL de la Foto (HD)"
                    value={img.url || ''}
                    onChange={(val) => {
                      const updated = [...(data.galeria?.images || [])];
                      updated[iIdx] = { ...updated[iIdx], url: val };
                      setData((prev: any) => ({
                        ...prev,
                        galeria: { ...prev.galeria, images: updated }
                      }));
                    }}
                    placeholder="https://images.unsplash.com/..."
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <CMSInput
                      label="Título / Epígrafe"
                      value={img.caption || ''}
                      onChange={(val) => {
                        const updated = [...(data.galeria?.images || [])];
                        updated[iIdx] = { ...updated[iIdx], caption: val };
                        setData((prev: any) => ({
                          ...prev,
                          galeria: { ...prev.galeria, images: updated }
                        }));
                      }}
                      placeholder="Ej: Amanecer en Tafí"
                    />
                    <CMSInput
                      label="Lugar / Ubicación"
                      value={img.location || ''}
                      onChange={(val) => {
                        const updated = [...(data.galeria?.images || [])];
                        updated[iIdx] = { ...updated[iIdx], location: val };
                        setData((prev: any) => ({
                          ...prev,
                          galeria: { ...prev.galeria, images: updated }
                        }));
                      }}
                      placeholder="Ej: Valles Calchaquíes"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'lunaviajera' && activeTab === 'lv_catalogo' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-[#0A2E20] flex items-center gap-1.5">
                  <Compass className="h-5 w-5 text-[#DFB15B]" />
                  Catálogo Oficial de Excursiones (Luna Viajera)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Creá, editá y nutrí las excursiones de la web. La duración y las etiquetas para los filtros las creás vos libremente. Cada excursión cuenta además con un espacio de texto libre para redactar el detalle completo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newEx = {
                    id: `excursion-${Date.now()}`,
                    title: 'NUEVA EXCURSIÓN',
                    tagline: 'Experiencia inolvidable en el norte argentino',
                    detail: 'Escribí aquí el detalle libre de la excursión, notas para el viajero, itinerario y recomendaciones.',
                    badge: 'Salida Especial',
                    duration: '8 hs',
                    category: 'valles',
                    categoryLabel: '⛰️ Valles Calchaquíes',
                    price: 45000,
                    departurePoint: 'Yerba Buena — Tucumán',
                    departureTime: '08:00 hs — Regreso 17:00 hs',
                    difficulty: 'Baja · Para toda la familia',
                    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
                    stops: ['Punto panorámico 1', 'Parada en reserva natural', 'Tiempo libre para almuerzo regional'],
                    includes: ['Transporte ida y vuelta coordinado', 'Guía local habilitado', 'Seguro de actividad']
                  };
                  setData((prev: any) => ({
                    ...prev,
                    excursiones: [newEx, ...(prev.excursiones || [])]
                  }));
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0A2E20] hover:bg-[#0e3f2c] text-[#F4D375] rounded-xl text-xs font-bold shadow-md transition whitespace-nowrap self-start sm:self-auto border border-[#DFB15B]/50"
              >
                <Plus className="h-4 w-4 text-[#DFB15B]" />
                <span>+ Nueva Excursión</span>
              </button>
            </div>

            {/* Listado de Excursiones */}
            <div className="space-y-6">
              {(data.excursiones || []).map((ex: any, exIdx: number) => (
                <div key={ex.id || exIdx} className="p-6 bg-slate-50/80 rounded-2xl border-2 border-slate-200/90 shadow-sm space-y-5 transition hover:border-[#DFB15B]/60">
                  
                  {/* Encabezado de la Tarjeta en CMS */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#0A2E20] text-[#F4D375] flex items-center justify-center text-xs font-black">
                        {exIdx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-[#0A2E20] uppercase tracking-wide">
                          {ex.title || 'Excursión sin título'}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ID: <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px]">{ex.id}</code> · Filtro: <strong className="text-emerald-700">{ex.categoryLabel || ex.category}</strong> · Duración: <strong className="text-amber-700">{ex.duration}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Estás seguro de eliminar la excursión "${ex.title}" del catálogo?`)) {
                          const updated = (data.excursiones || []).filter((_: any, idx: number) => idx !== exIdx);
                          setData((prev: any) => ({
                            ...prev,
                            excursiones: updated
                          }));
                        }
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 self-end sm:self-center px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>

                  {/* Campos Principales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CMSInput
                      label="Título de la Excursión"
                      value={ex.title || ''}
                      onChange={(val) => {
                        const updated = [...(data.excursiones || [])];
                        updated[exIdx] = { ...updated[exIdx], title: val };
                        setData((prev: any) => ({ ...prev, excursiones: updated }));
                      }}
                      placeholder="Ej: TAFÍ DEL VALLE Day Trip"
                    />

                    <CMSInput
                      label="Bajada / Subtítulo Corto"
                      value={ex.tagline || ''}
                      onChange={(val) => {
                        const updated = [...(data.excursiones || [])];
                        updated[exIdx] = { ...updated[exIdx], tagline: val };
                        setData((prev: any) => ({ ...prev, excursiones: updated }));
                      }}
                      placeholder="Ej: Descubre la belleza de los Valles Calchaquíes"
                    />

                    {/* Espacio de Texto Libre: Detalle de la Excursión */}
                    <div className="md:col-span-2">
                      <CMSTextarea
                        label="Detalle de la Excursión (Espacio de Texto Libre para cargar el detalle completo sin límites)"
                        value={ex.detail || ex.description || ''}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], detail: val, description: val };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        rows={3}
                        placeholder="Escribí detalladamente todo lo que el viajero vivirá en la excursión, historia, sensaciones, vestimenta recomendada, etc."
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Este texto se muestra directamente en la tarjeta de la web y en la ventana de detalle ("Ver detalle").</p>
                    </div>

                    {/* Duración Personalizada */}
                    <div>
                      <CMSInput
                        label="Duración (Creada libremente por vos)"
                        value={ex.duration || ''}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], duration: val };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        placeholder="Ej: 8 - 9 hs, Día Completo, 4 hs, 2 Días"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Aparece en el badge de la imagen y en la ficha técnica.</p>
                    </div>

                    {/* Badge de la Imagen */}
                    <div>
                      <CMSInput
                        label="Badge / Distintivo Superior"
                        value={ex.badge || ''}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], badge: val };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        placeholder="Ej: Salida Tradicional, 100% Selva, Cupos Limitados"
                      />
                    </div>

                    {/* Etiqueta / Categoría para los Filtros de la Web */}
                    <div>
                      <CMSInput
                        label="Etiqueta / ID de Filtro (Creada libremente por vos)"
                        value={ex.category || ''}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], category: val.toLowerCase().trim() };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        placeholder="Ej: valles, yungas, astroturismo, trekking, cabalgatas"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Identificador en minúsculas para agrupar salidas similares.</p>
                    </div>

                    {/* Nombre Visible del Filtro en la Web */}
                    <div>
                      <CMSInput
                        label="Texto del Botón de Filtro en la Web"
                        value={ex.categoryLabel || ''}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], categoryLabel: val };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        placeholder="Ej: ⛰️ Valles Calchaquíes, 🌿 Selva de Yungas, 🐎 Cabalgatas"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Nombre con emoji que el usuario verá en la barra de filtros.</p>
                    </div>

                    {/* Precio por Persona */}
                    <div>
                      <CMSInput
                        label="Precio Final por Persona ($ ARS)"
                        type="number"
                        value={ex.price || 0}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], price: Number(val) };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        placeholder="45000"
                      />
                    </div>

                    {/* Dificultad */}
                    <div>
                      <CMSInput
                        label="Nivel de Dificultad"
                        value={ex.difficulty || ''}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], difficulty: val };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        placeholder="Ej: Baja · Para todas las edades"
                      />
                    </div>

                    {/* Punto de Salida */}
                    <div>
                      <CMSInput
                        label="Punto de Encuentro / Salida"
                        value={ex.departurePoint || ''}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], departurePoint: val };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        placeholder="Yerba Buena — Tucumán"
                      />
                    </div>

                    {/* Horarios */}
                    <div>
                      <CMSInput
                        label="Horario de Salida y Regreso"
                        value={ex.departureTime || ''}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], departureTime: val };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        placeholder="08:00 hs — Regreso aprox. 17:00 hs"
                      />
                    </div>

                    {/* URL de Imagen de Portada */}
                    <div className="md:col-span-2">
                      <CMSInput
                        label="URL de Imagen de Portada HD"
                        value={ex.imageUrl || ''}
                        onChange={(val) => {
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], imageUrl: val };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        placeholder="https://images.unsplash.com/..."
                      />
                      {ex.imageUrl && (
                        <div className="mt-2 h-32 rounded-xl overflow-hidden border border-slate-200 relative w-full sm:w-60">
                          <img src={ex.imageUrl} alt={ex.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Paradas y Atractivos */}
                    <div>
                      <CMSTextarea
                        label="Paradas y Atractivos (una por línea)"
                        value={(ex.stops || []).join('\n')}
                        onChange={(val) => {
                          const lines = val.split('\n').filter((l: string) => l.trim().length > 0);
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], stops: lines };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        rows={3}
                        placeholder="Quebrada Los Sosa&#10;Reserva Los Menhires&#10;Dique La Angostura"
                      />
                    </div>

                    {/* Qué incluye */}
                    <div>
                      <CMSTextarea
                        label="Qué incluye la experiencia (una por línea)"
                        value={(ex.includes || []).join('\n')}
                        onChange={(val) => {
                          const lines = val.split('\n').filter((l: string) => l.trim().length > 0);
                          const updated = [...(data.excursiones || [])];
                          updated[exIdx] = { ...updated[exIdx], includes: lines };
                          setData((prev: any) => ({ ...prev, excursiones: updated }));
                        }}
                        rows={3}
                        placeholder="Transporte ida y vuelta&#10;Guía habilitado&#10;Seguro de actividad"
                      />
                    </div>

                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'lunaviajera' && activeTab === 'lv_travis' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-[#0A2E20] flex items-center gap-1.5">
                <Bot className="h-5 w-5 text-[#DFB15B]" />
                Asistente Travis & Preguntas Rápidas
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configura los textos y preguntas frecuentes interactivas que Travis responde en la landing.</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <CMSInput
                label="Título del Bloque"
                value={data.travis?.title || ''}
                onChange={(val) => updateField('travis', 'title', val)}
                placeholder="¿Dudas o consultas? Preguntale a Travis"
              />
              <CMSTextarea
                label="Subtítulo / Bajada"
                value={data.travis?.subtitle || ''}
                onChange={(val) => updateField('travis', 'subtitle', val)}
                rows={2}
              />
              <CMSInput
                label="Enlace a WhatsApp de Travis (URL completa con mensaje)"
                value={data.travis?.whatsappUrl || ''}
                onChange={(val) => updateField('travis', 'whatsappUrl', val)}
                placeholder="https://wa.me/5493812000712?text=..."
              />
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-[#0A2E20] uppercase tracking-wider">Preguntas Sugeridas (1 Clic)</h4>
              {(data.travis?.defaultQuestions || []).map((q: string, qIdx: number) => (
                <div key={qIdx} className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 w-6">{qIdx + 1}.</span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => {
                      const updated = [...(data.travis?.defaultQuestions || [])];
                      updated[qIdx] = e.target.value;
                      setData((prev: any) => ({
                        ...prev,
                        travis: { ...prev.travis, defaultQuestions: updated }
                      }));
                    }}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLanding === 'lunaviajera' && activeTab === 'lv_quienes' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-[#0A2E20] flex items-center gap-1.5">
                <Mountain className="h-5 w-5 text-[#DFB15B]" />
                Quiénes Somos & Manifiesto de Marca
              </h3>
              <p className="text-xs text-slate-400 mt-1">Valores, filosofía de turismo responsable e historia de Luna Viajera.</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="Badge Superior"
                  value={data.quienesSomos?.badge || ''}
                  onChange={(val) => updateField('quienesSomos', 'badge', val)}
                />
                <CMSInput
                  label="Título de la Sección"
                  value={data.quienesSomos?.title || ''}
                  onChange={(val) => updateField('quienesSomos', 'title', val)}
                />
              </div>
              <CMSTextarea
                label="Descripción / Manifiesto"
                value={data.quienesSomos?.description || ''}
                onChange={(val) => updateField('quienesSomos', 'description', val)}
                rows={4}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="Lema / Tagline"
                  value={data.quienesSomos?.tagline || ''}
                  onChange={(val) => updateField('quienesSomos', 'tagline', val)}
                />
                <CMSInput
                  label="Ciudad de Origen"
                  value={data.quienesSomos?.originCity || ''}
                  onChange={(val) => updateField('quienesSomos', 'originCity', val)}
                />
              </div>
            </div>
          </div>
        )}

        {selectedLanding === 'lunaviajera' && activeTab === 'lv_contacto' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-[#0A2E20] flex items-center gap-1.5">
                <Phone className="h-5 w-5 text-[#DFB15B]" />
                Contacto, Teléfonos & Redes Oficiales
              </h3>
              <p className="text-xs text-slate-400 mt-1">Información de contacto que se muestra en el footer y en los botones de atención.</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="WhatsApp Coordinación (Ej: 381 398-1479)"
                  value={data.contacto?.whatsapp || ''}
                  onChange={(val) => updateField('contacto', 'whatsapp', val)}
                />
                <CMSInput
                  label="Central Telefónica (Ej: 0810-220-0018)"
                  value={data.contacto?.telefono || ''}
                  onChange={(val) => updateField('contacto', 'telefono', val)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSInput
                  label="Email de Contacto"
                  value={data.contacto?.email || ''}
                  onChange={(val) => updateField('contacto', 'email', val)}
                />
                <CMSInput
                  label="Instagram (Ej: @lunaviajera.turismo)"
                  value={data.contacto?.instagram || ''}
                  onChange={(val) => updateField('contacto', 'instagram', val)}
                />
              </div>
              <CMSInput
                label="Ubicación Base"
                value={data.contacto?.ubicacion || ''}
                onChange={(val) => updateField('contacto', 'ubicacion', val)}
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* EDITOR DE BOLETERÍA DE BUSES (PARA ECOSISTEMA, EXPERIENCE Y LUNA VIAJERA) */}
        {/* ======================================================== */}
        {activeTab === 'bus_cms' && (selectedLanding === 'ecosistema' || selectedLanding === 'experience' || selectedLanding === 'lunaviajera') && (() => {
          const defaultSlidesByLanding: Record<string, any[]> = {
            ecosistema: [
              {
                id: 'eco-1',
                badge: '✦ BOLETERÍA OFICIAL NACIONAL · CENTRAL DE PASAJES',
                highlightTag: '+1.600 Destinos Nacionales',
                title: 'Más de 1.600 Destinos Operados en toda Argentina',
                subtitle: 'Comercializamos pasajes oficiales de larga distancia con todas las empresas líderes del país. Elegí tu butaca Cama Suite, Ejecutivo o Semi-Cama y recibí tu E-Ticket al instante.',
                imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=85',
              },
              {
                id: 'eco-2',
                badge: '✦ FINANCIACIÓN Y BENEFICIOS EXCLUSIVOS',
                highlightTag: 'Suma Puntos TravelApp Rewards',
                title: 'Viajá en Micro con Cuotas y Sumá Puntos Rewards',
                subtitle: 'Aboná con todas las tarjetas de crédito, débito y billeteras virtuales en la pasarela oficial de Central de Pasajes y registrá tu boleto para acreditar puntos en tu cuenta TravelApp.',
                imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=85',
              },
            ],
            experience: [
              {
                id: 'exp-1',
                badge: '✦ CONECTIVIDAD RECEPTIVA · NORTE ARGENTINO (NOA)',
                highlightTag: 'Rutas Escénicas del NOA',
                title: 'Recorré los Destinos del NOA en Micros de Primera Línea',
                subtitle: 'Conectá San Miguel de Tucumán, Salta, Jujuy, Cafayate, Purmamarca, Tilcara y Termas de Río Hondo con frecuencias diarias y emisión inmediata.',
                imageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=85',
              },
              {
                id: 'exp-2',
                badge: '✦ TURISMO RECEPTIVO + BOLETERÍA OFICIAL',
                highlightTag: 'Conexiones Regionales Diarias',
                title: 'Armá tu Circuito por Tucumán, Salta y la Quebrada',
                subtitle: 'Sacá tus tramos en bus entre provincias y complementá tu estadía con nuestras excursiones guiadas y traslados receptivos desde la Terminal a tu hotel.',
                imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=85',
              },
            ],
            lunaviajera: [
              {
                id: 'luna-1',
                badge: '✦ LUNA VIAJERA · VALLES CALCHAQUÍES & TUCUMÁN',
                highlightTag: 'Postal de Tafí del Valle',
                title: 'Tafí del Valle y los Paisajes Mágicos de Tucumán',
                subtitle: 'Llegá a Tucumán desde cualquier rincón del país a través de nuestra Boletería Oficial de Central de Pasajes y descubrí la Quebrada de Los Sosa, el lago La Angostura y los Valles.',
                imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=85',
              },
              {
                id: 'luna-2',
                badge: '✦ AVENTURA EN LAS YUNGAS Y LOS VALLES',
                highlightTag: 'Valles & Selva de Yungas',
                title: 'Conectá tu Viaje de Larga Distancia con Salidas de 1 Día',
                subtitle: 'Emití tu pasaje nacional de micro al instante, validá tu boleto para sumar Puntos Rewards y reservá tu lugar en nuestras excursiones desde Yerba Buena.',
                imageUrl: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1920&q=85',
              },
            ],
          };

          const defaultDestinos = [
            {
              ciudad: 'Tafí del Valle & Valles',
              provincia: 'Tucumán · Ruta 307',
              categoria: 'Conexión Regional & Excursión',
              img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
              tag: 'Favorito Luna Viajera',
            },
            {
              ciudad: 'Salta & Cafayate',
              provincia: 'Norte Argentino (NOA)',
              categoria: 'Semi-Cama / Cama Ejecutivo',
              img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
              tag: 'Circuito NOA',
            },
            {
              ciudad: 'Buenos Aires (Retiro / Dellepiane)',
              provincia: 'Salidas Diarias Nacionales',
              categoria: 'Cama Ejecutivo / Suite',
              img: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=800&q=80',
              tag: 'Alta Frecuencia',
            },
          ];

          const busesSection = data.busesSection || {};
          const slides: any[] =
            Array.isArray(busesSection.slides) && busesSection.slides.length > 0
              ? busesSection.slides
              : defaultSlidesByLanding[selectedLanding] || defaultSlidesByLanding.ecosistema;
          const destinos: any[] =
            Array.isArray(busesSection.destinos) && busesSection.destinos.length > 0
              ? busesSection.destinos
              : defaultDestinos;

          const updateBusSlides = (newSlides: any[]) => {
            setData((prev: any) => ({
              ...prev,
              busesSection: {
                ...(prev.busesSection || {}),
                slides: newSlides,
                destinos,
              },
            }));
          };

          const updateBusDestinos = (newDestinos: any[]) => {
            setData((prev: any) => ({
              ...prev,
              busesSection: {
                ...(prev.busesSection || {}),
                slides,
                destinos: newDestinos,
              },
            }));
          };

          const updateBusText = (field: string, val: string) => {
            setData((prev: any) => ({
              ...prev,
              busesSection: {
                ...(prev.busesSection || {}),
                slides,
                destinos,
                [field]: val,
              },
            }));
          };

          const previewUrl =
            selectedLanding === 'lunaviajera'
              ? '/buses?brand=lunaviajera'
              : selectedLanding === 'experience'
              ? '/buses?brand=experience'
              : '/buses?brand=ecosistema';

          return (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-tech-blue flex items-center gap-2">
                    <Bus className="h-5 w-5 text-vial-orange" />
                    <span>
                      Gestión de Página de Buses ({selectedLanding === 'ecosistema' ? 'travelapp.ar/buses' : selectedLanding === 'experience' ? 'experience.travelapp.ar/buses' : 'lunaviajera.travelapp.ar/buses'})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Personalizá las imágenes y textos del Slider principal, la franja de TravelCab y las tarjetas de destinos y promociones que acompañan al buscador de Central de Pasajes.
                  </p>
                </div>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tech-blue text-white text-xs font-bold hover:opacity-90 transition shrink-0"
                >
                  <Eye className="h-4 w-4" />
                  <span>Ver Página /buses de esta Unidad</span>
                </a>
              </div>

              {/* 1. SLIDER HERO DE LA PÁGINA DE BUSES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    1. Slides del Hero Principal (Junto al Buscador de Central de Pasajes)
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      updateBusSlides([
                        ...slides,
                        {
                          id: `bus-slide-${Date.now()}`,
                          badge: '✦ PROMOCIÓN ESPECIAL EN BUS',
                          highlightTag: 'Salidas Diarias',
                          title: 'Nuevo Slide de Boletería',
                          subtitle: 'Descripción del servicio o promoción.',
                          imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=85',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar Slide</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {slides.map((slide, idx) => (
                    <div
                      key={slide.id || idx}
                      className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-tech-blue bg-blue-100 px-2.5 py-1 rounded-md">
                          Slide #{idx + 1}
                        </span>
                        {slides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => updateBusSlides(slides.filter((_, i) => i !== idx))}
                            className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CMSInput
                          label="Badge Superior"
                          value={slide.badge || ''}
                          onChange={(val) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], badge: val };
                            updateBusSlides(next);
                          }}
                        />
                        <CMSInput
                          label="Etiqueta Destacada (Píldora)"
                          value={slide.highlightTag || ''}
                          onChange={(val) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], highlightTag: val };
                            updateBusSlides(next);
                          }}
                        />
                      </div>

                      <CMSInput
                        label="Título Principal del Slide"
                        value={slide.title || ''}
                        onChange={(val) => {
                          const next = [...slides];
                          next[idx] = { ...next[idx], title: val };
                          updateBusSlides(next);
                        }}
                      />

                      <CMSTextarea
                        label="Subtítulo / Descripción"
                        value={slide.subtitle || ''}
                        onChange={(val) => {
                          const next = [...slides];
                          next[idx] = { ...next[idx], subtitle: val };
                          updateBusSlides(next);
                        }}
                        rows={2}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-8">
                          <CMSInput
                            label="URL de Imagen de Fondo"
                            value={slide.imageUrl || ''}
                            onChange={(val) => {
                              const next = [...slides];
                              next[idx] = { ...next[idx], imageUrl: val };
                              updateBusSlides(next);
                            }}
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer">
                            <Upload className="h-4 w-4 text-tech-blue" />
                            <span>Subir Imagen desde PC</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const uploadedUrl = await uploadMediaFile(file, 'cms_buses');
                                const next = [...slides];
                                next[idx] = { ...next[idx], imageUrl: uploadedUrl };
                                updateBusSlides(next);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. TEXTOS DEL BLOQUE TRAVELCAB Y VALIDADOR REWARDS */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  2. Textos de Conexión TravelCab y Bloque de Puntos Rewards
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput
                    label="Título Franja TravelCab a la Terminal"
                    value={busesSection.travelCabTitle || '¿Necesitás traslado hacia o desde la Terminal de Ómnibus?'}
                    onChange={(val) => updateBusText('travelCabTitle', val)}
                  />
                  <CMSInput
                    label="Subtítulo Franja TravelCab"
                    value={
                      busesSection.travelCabSubtitle ||
                      'Dejá programado tu TravelCab con tarifa fija y conductor verificado para llegar con tiempo a tu plataforma.'
                    }
                    onChange={(val) => updateBusText('travelCabSubtitle', val)}
                  />
                  <CMSInput
                    label="Título Bloque Validador Rewards"
                    value={
                      busesSection.rewardsTitle ||
                      '¿Compraste tu pasaje en nuestro buscador? ¡Reclamá tus Puntos Rewards!'
                    }
                    onChange={(val) => updateBusText('rewardsTitle', val)}
                  />
                  <CMSInput
                    label="Título Sección Destinos y Promociones"
                    value={
                      busesSection.destinosTitle || 'Destinos Más Buscados en Nuestra Boletería'
                    }
                    onChange={(val) => updateBusText('destinosTitle', val)}
                  />
                </div>
              </div>

              {/* 3. TARJETAS DE DESTINOS Y PROMOCIONES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    3. Tarjetas de Destinos y Promociones de Micro
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      updateBusDestinos([
                        ...destinos,
                        {
                          ciudad: 'Nuevo Destino',
                          provincia: 'Región / Ruta',
                          categoria: 'Semi-Cama / Cama Ejecutivo',
                          img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
                          tag: 'Destacado',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar Destino</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {destinos.map((dest, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700">
                          Destino #{idx + 1}: {dest.ciudad}
                        </span>
                        {destinos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => updateBusDestinos(destinos.filter((_, i) => i !== idx))}
                            className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Quitar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <CMSInput
                          label="Ciudad / Destino"
                          value={dest.ciudad || ''}
                          onChange={(val) => {
                            const next = [...destinos];
                            next[idx] = { ...next[idx], ciudad: val };
                            updateBusDestinos(next);
                          }}
                        />
                        <CMSInput
                          label="Provincia / Ruta"
                          value={dest.provincia || ''}
                          onChange={(val) => {
                            const next = [...destinos];
                            next[idx] = { ...next[idx], provincia: val };
                            updateBusDestinos(next);
                          }}
                        />
                        <CMSInput
                          label="Categoría de Servicio"
                          value={dest.categoria || ''}
                          onChange={(val) => {
                            const next = [...destinos];
                            next[idx] = { ...next[idx], categoria: val };
                            updateBusDestinos(next);
                          }}
                        />
                        <CMSInput
                          label="Etiqueta (Tag)"
                          value={dest.tag || ''}
                          onChange={(val) => {
                            const next = [...destinos];
                            next[idx] = { ...next[idx], tag: val };
                            updateBusDestinos(next);
                          }}
                        />
                      </div>

                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <CMSInput
                            label="Imagen del Destino (URL)"
                            value={dest.img || ''}
                            onChange={(val) => {
                              const next = [...destinos];
                              next[idx] = { ...next[idx], img: val };
                              updateBusDestinos(next);
                            }}
                          />
                        </div>
                        <label className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer shrink-0">
                          Subir Foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const uploadedUrl = await uploadMediaFile(file, 'cms_buses');
                              const next = [...destinos];
                              next[idx] = { ...next[idx], img: uploadedUrl };
                              updateBusDestinos(next);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
      </div>
        </main>
      </div>
    </div>
    </CMSActionsContext.Provider>
  );
}
