'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Pencil,
  Upload,
  Image as ImageIcon,
  Video,
  Sparkles,
  Award,
  EyeOff,
  Check,
  X,
  MessageCircle,
  Bot,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type {
  OtaActionType,
  OtaBusType,
  OtaFoodPlan,
  OtaInquiryChannel,
  OtaMediaItem,
  OtaPackageType,
  OtaRegion,
  OtaTransportType,
} from '@/types/ota';

const REGION_OPTIONS: OtaRegion[] = [
  'Argentina',
  'Brasil',
  'Sudamérica',
  'Caribe',
  'Estados Unidos',
  'Europa',
  'Asia',
  'África',
  'Oceanía',
];

const SORT_ORDER_OPTIONS = [
  { value: 1, label: '1° (Principal / Destacado)' },
  { value: 2, label: '2° Posición' },
  { value: 3, label: '3° Posición' },
  { value: 4, label: '4° Posición' },
  { value: 5, label: '5° Posición' },
  { value: 6, label: '6° Posición' },
  { value: 7, label: '7° Posición' },
  { value: 8, label: '8° Posición' },
  { value: 9, label: '9° Posición' },
  { value: 10, label: '10° Posición' },
  { value: 999, label: 'Estándar (Automático)' },
];

type TripKind =
  | 'Paquete Propio'
  | 'Paquete Operador'
  | 'Salida Grupal'
  | 'Crucero'
  | 'Escapada'
  | 'Solo Alojamiento';

type PublishAction = 'reservar' | 'consultar' | 'senar' | 'comprar';

interface TourOperator {
  id: string;
  name: string;
}

const DEFAULT_WHATSAPP_NUMBER = '+54 9 3812 00-0712';

const PRESET_SERVICES = [
  'Traslados IN/OUT',
  'Solo Alojamiento',
  'Desayuno',
  'Media Pensión',
  'Pensión Completa',
  'All Inclusive',
  'Asistencia al Viajero',
  'Excursiones',
  'Coordinador en Destino',
  'Equipaje en Bodega',
];

const FOOD_PLAN_OPTIONS: OtaFoodPlan[] = [
  'Solo Alojamiento',
  'Desayuno',
  'Media Pensión',
  'Pensión Completa',
  'All Inclusive',
];

const BUS_TYPE_OPTIONS: OtaBusType[] = [
  'Semicama',
  'Cama',
  'Cama Ejecutivo',
  'Suite',
];

const MARKETPLACE_ACTION_OPTIONS: { value: OtaActionType; label: string }[] = [
  { value: 'ver_detalle', label: 'Ver Detalle' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'consultar', label: 'Consultar' },
  { value: 'reservar', label: 'Reservar' },
  { value: 'senar', label: 'Señar Cupo' },
  { value: 'pagar', label: 'Pagar Viaje' },
];

const ALL_MARKETPLACE_ACTIONS: OtaActionType[] = MARKETPLACE_ACTION_OPTIONS.map((a) => a.value);

const TRANSPORT_OPTIONS: { label: string; value: OtaTransportType }[] = [
  { label: 'Avión', value: 'Avión' },
  { label: 'Bus', value: 'Bus' },
  { label: 'Barco', value: 'Barco' },
  { label: 'Tren', value: 'Tren' },
  { label: 'Sin Transporte', value: 'Sin Transporte' },
];

const PUBLISH_ACTIONS: { value: PublishAction; label: string }[] = [
  { value: 'reservar', label: 'Reservar' },
  { value: 'consultar', label: 'Consultar' },
  { value: 'senar', label: 'Señar' },
  { value: 'comprar', label: 'Comprar' },
];

function generateTripCode(prefix = 'TM'): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${rand}`;
}

function mapTripKind(kind: TripKind): {
  type: OtaPackageType;
  providerType: 'propio' | 'mayorista';
  providerCategory: 'propio' | 'operador_verificado';
} {
  switch (kind) {
    case 'Paquete Operador':
      return { type: 'paquete', providerType: 'mayorista', providerCategory: 'operador_verificado' };
    case 'Salida Grupal':
      return { type: 'salida_grupal', providerType: 'propio', providerCategory: 'propio' };
    case 'Crucero':
      return { type: 'crucero', providerType: 'mayorista', providerCategory: 'operador_verificado' };
    case 'Escapada':
    case 'Solo Alojamiento':
      return { type: 'escapada', providerType: 'propio', providerCategory: 'propio' };
    default:
      return { type: 'paquete', providerType: 'propio', providerCategory: 'propio' };
  }
}

function mapPublishActionToEnabled(action: PublishAction): OtaActionType[] {
  switch (action) {
    case 'reservar':
      return ['ver_detalle', 'reservar'];
    case 'consultar':
      return ['ver_detalle', 'consultar', 'whatsapp'];
    case 'senar':
      return ['ver_detalle', 'senar'];
    case 'comprar':
      return ['ver_detalle', 'pagar'];
  }
}

export function TravelMarketTab() {
  const [packages, setPackages] = useState<any[]>([]);
  const [operators, setOperators] = useState<TourOperator[]>([]);
  const [searchList, setSearchList] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Campos de la ficha
  const [tripKind, setTripKind] = useState<TripKind>('Paquete Propio');
  const [region, setRegion] = useState<OtaRegion>('Argentina');
  const [sortOrder, setSortOrder] = useState<number>(999);
  const [departureDatesText, setDepartureDatesText] = useState('');
  const [customTagsText, setCustomTagsText] = useState('');
  const [code, setCode] = useState(() => generateTripCode());
  const [operatorId, setOperatorId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [durationNights, setDurationNights] = useState('6');
  const [transportType, setTransportType] = useState<OtaTransportType>('Avión');
  const [busType, setBusType] = useState<OtaBusType>('Semicama');
  const [hotelName, setHotelName] = useState('');
  const [hotelStars, setHotelStars] = useState('3');
  const [foodPlan, setFoodPlan] = useState<OtaFoodPlan>('Desayuno');
  const [title, setTitle] = useState('');
  const [includedServices, setIncludedServices] = useState<string[]>(['Traslados IN/OUT', 'Desayuno']);
  const [customService, setCustomService] = useState('');
  const [description, setDescription] = useState('');

  // Tarifas & Rewards
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [publicPrice, setPublicPrice] = useState('');
  const [rewardsDiscountPercent, setRewardsDiscountPercent] = useState('10');
  const [rewardsPointsEarned, setRewardsPointsEarned] = useState('500');

  // Selector para publicar + Seña + Travis
  const [publishAction, setPublishAction] = useState<PublishAction>('reservar');
  const [enabledActions, setEnabledActions] = useState<OtaActionType[]>(['ver_detalle', 'reservar']);
  const [depositType, setDepositType] = useState<'percentage' | 'fixed'>('percentage');
  const [depositValue, setDepositValue] = useState('30');
  const [inquiryChannel, setInquiryChannel] = useState<OtaInquiryChannel>('both');
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);
  const [travisPrompt, setTravisPrompt] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');

  // Portada y Galería
  const [imageUrl, setImageUrl] = useState('');
  const [galleryMedia, setGalleryMedia] = useState<OtaMediaItem[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    const unsubPkg = onSnapshot(collection(db, 'ota_packages'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setPackages(list);
    });
    const unsubOps = onSnapshot(collection(db, 'tour_operators'), (snap) => {
      setOperators(
        snap.docs.map((d) => ({
          id: d.id,
          name: String(d.data().name || d.data().businessName || 'Operador'),
        }))
      );
    });
    return () => {
      unsubPkg();
      unsubOps();
    };
  }, []);

  const numericPublicPrice = Math.max(0, Number(publicPrice) || 0);
  const numericDiscount = Math.min(100, Math.max(0, Number(rewardsDiscountPercent) || 0));
  const calculatedMemberPrice = useMemo(() => {
    return Math.round(numericPublicPrice * (1 - numericDiscount / 100));
  }, [numericPublicPrice, numericDiscount]);

  const calculatedDepositAmount = useMemo(() => {
    const val = Math.max(0, Number(depositValue) || 0);
    if (depositType === 'percentage') {
      return Math.round(numericPublicPrice * (Math.min(100, val) / 100));
    }
    return val;
  }, [depositType, depositValue, numericPublicPrice]);

  const formatMoney = (amount: number, curr: 'ARS' | 'USD' = currency) => {
    const prefix = curr === 'USD' ? 'USD ' : '$';
    return `${prefix}${Number(amount || 0).toLocaleString('es-AR')}`;
  };

  const resetForm = () => {
    setEditingId(null);
    setTripKind('Paquete Propio');
    setRegion('Argentina');
    setSortOrder(999);
    setDepartureDatesText('');
    setCustomTagsText('');
    setCode(generateTripCode());
    setOperatorId('');
    setOperatorName('');
    setOrigin('');
    setDestination('');
    setDurationDays('7');
    setDurationNights('6');
    setTransportType('Avión');
    setBusType('Semicama');
    setHotelName('');
    setHotelStars('3');
    setFoodPlan('Desayuno');
    setTitle('');
    setIncludedServices(['Traslados IN/OUT', 'Desayuno']);
    setCustomService('');
    setDescription('');
    setCurrency('ARS');
    setPublicPrice('');
    setRewardsDiscountPercent('10');
    setRewardsPointsEarned('500');
    setPublishAction('reservar');
    setEnabledActions(['ver_detalle', 'reservar']);
    setDepositType('percentage');
    setDepositValue('30');
    setInquiryChannel('both');
    setWhatsappNumber(DEFAULT_WHATSAPP_NUMBER);
    setTravisPrompt('');
    setStatus('published');
    setImageUrl('');
    setGalleryMedia([]);
    setNewMediaUrl('');
  };

  const handleOperatorSelect = (selectedId: string) => {
    setOperatorId(selectedId);
    const found = operators.find((op) => op.id === selectedId);
    if (found) setOperatorName(found.name);
  };

  const toggleService = (service: string) => {
    setIncludedServices((prev) => {
      const exists = prev.includes(service);
      if (!exists && FOOD_PLAN_OPTIONS.includes(service as OtaFoodPlan)) {
        setFoodPlan(service as OtaFoodPlan);
      }
      return exists ? prev.filter((s) => s !== service) : [...prev, service];
    });
  };

  const toggleEnabledAction = (action: OtaActionType) => {
    setEnabledActions((prev) => {
      const next = prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action];
      return next.length > 0 ? next : ['ver_detalle'];
    });
  };

  const selectPublishAction = (action: PublishAction) => {
    setPublishAction(action);
    const mapped = mapPublishActionToEnabled(action);
    setEnabledActions((prev) => {
      const merged = new Set<OtaActionType>(prev);
      mapped.forEach((a) => merged.add(a));
      return Array.from(merged);
    });
  };

  const handleAddCustomService = () => {
    const trimmed = customService.trim();
    if (!trimmed) return;
    if (!includedServices.includes(trimmed)) {
      setIncludedServices((prev) => [...prev, trimmed]);
    }
    setCustomService('');
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `ota_packages/${folder}/${Date.now()}_${safeName}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadFile(file, 'covers');
      setImageUrl(url);
    } catch (err) {
      console.error('Error al subir portada:', err);
      setFeedback('No se pudo subir la portada. Verificá tu conexión o pegá una URL.');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingGallery(true);
    try {
      const uploaded: OtaMediaItem[] = [];
      for (const file of files) {
        const url = await uploadFile(file, 'gallery');
        const type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
        uploaded.push({ url, type });
      }
      setGalleryMedia((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error('Error al subir galería:', err);
      setFeedback('Error al subir archivos a la galería.');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleAddMediaUrl = () => {
    const trimmed = newMediaUrl.trim();
    if (!trimmed) return;
    setGalleryMedia((prev) => [...prev, { url: trimmed, type: newMediaType }]);
    setNewMediaUrl('');
  };

  const handleEdit = (pkg: any) => {
    setEditingId(pkg.id);
    setTripKind((pkg.tripKind as TripKind) || 'Paquete Propio');
    setRegion((pkg.region as OtaRegion) || 'Argentina');
    setSortOrder(typeof pkg.sortOrder === 'number' ? pkg.sortOrder : 999);
    setDepartureDatesText(Array.isArray(pkg.departureDates) ? pkg.departureDates.join(', ') : '');
    setCustomTagsText(Array.isArray(pkg.customTags) ? pkg.customTags.join(', ') : '');
    setCode(pkg.code || generateTripCode());
    setOperatorId(pkg.operatorId || '');
    setOperatorName(pkg.operatorName || '');
    setOrigin(pkg.departureOrigin || '');
    setDestination(pkg.destination || '');
    setDurationDays(String(pkg.durationDays || 7));
    setDurationNights(String(pkg.durationNights || pkg.nights || 6));
    setTransportType((pkg.transportType as OtaTransportType) || 'Avión');
    setBusType((pkg.busType as OtaBusType) || 'Semicama');
    setHotelName(pkg.hotelName || '');
    setHotelStars(pkg.hotelStars ? String(pkg.hotelStars) : '3');
    setFoodPlan((pkg.foodPlan as OtaFoodPlan) || 'Desayuno');
    setTitle(pkg.title || '');
    setIncludedServices(Array.isArray(pkg.includedServices) ? pkg.includedServices : []);
    setDescription(pkg.description || '');
    setCurrency(pkg.currency === 'USD' ? 'USD' : 'ARS');
    setPublicPrice(String(pkg.price || ''));
    setRewardsDiscountPercent(String(pkg.rewardsDiscountPercent ?? 10));
    setRewardsPointsEarned(String(pkg.rewardsPointsEarned ?? 0));
    const parsedAction = (pkg.publishAction as PublishAction) || 'reservar';
    setPublishAction(parsedAction);
    setEnabledActions(
      Array.isArray(pkg.enabledActions) && pkg.enabledActions.length > 0
        ? pkg.enabledActions
        : mapPublishActionToEnabled(parsedAction)
    );
    setDepositType(pkg.depositType === 'fixed' ? 'fixed' : 'percentage');
    setDepositValue(String(pkg.depositValue ?? 30));
    setInquiryChannel((pkg.inquiryChannel as OtaInquiryChannel) || 'both');
    setWhatsappNumber(pkg.whatsappNumber || DEFAULT_WHATSAPP_NUMBER);
    setTravisPrompt(pkg.travisPrompt || '');
    setStatus(pkg.status === 'draft' ? 'draft' : 'published');
    setImageUrl(pkg.imageUrl || '');
    if (Array.isArray(pkg.galleryMedia) && pkg.galleryMedia.length > 0) {
      setGalleryMedia(pkg.galleryMedia);
    } else if (Array.isArray(pkg.gallery)) {
      setGalleryMedia(pkg.gallery.map((url: string) => ({ url, type: 'image' })));
    } else {
      setGalleryMedia([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim() || !origin.trim()) return;
    setSaving(true);
    setFeedback(null);

    const mapped = mapTripKind(tripKind);
    const nowIso = new Date().toISOString();
    const departureDates = departureDatesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const customTags = customTagsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      code: code.trim() || generateTripCode(),
      tripKind,
      sortOrder: Number(sortOrder || 999),
      customTags,
      type: mapped.type,
      providerType: mapped.providerType,
      providerCategory: mapped.providerCategory,
      operatorId: operatorId || '',
      operatorName: operatorName.trim(),
      departureOrigin: origin.trim(),
      destination: destination.trim(),
      country: destination.trim(),
      region,
      durationDays: Math.max(1, Number(durationDays) || 1),
      durationNights: Math.max(0, Number(durationNights) || 0),
      nights: Math.max(0, Number(durationNights) || 0),
      departureDates,
      transportType,
      busType: transportType === 'Bus' ? busType : null,
      hotelName: hotelName.trim(),
      hotelStars: hotelStars ? Number(hotelStars) : null,
      foodPlan,
      title: title.trim(),
      includedServices,
      description: description.trim(),
      currency,
      price: numericPublicPrice,
      rewardsDiscountPercent: numericDiscount,
      memberPrice: calculatedMemberPrice,
      rewardsPointsEarned: Math.max(0, Number(rewardsPointsEarned) || 0),
      publishAction,
      enabledActions: enabledActions.length > 0 ? enabledActions : mapPublishActionToEnabled(publishAction),
      depositType: enabledActions.includes('senar') || publishAction === 'senar' ? depositType : null,
      depositValue:
        enabledActions.includes('senar') || publishAction === 'senar'
          ? Math.max(0, Number(depositValue) || 0)
          : null,
      inquiryChannel:
        enabledActions.includes('consultar') || publishAction === 'consultar' ? inquiryChannel : null,
      whatsappNumber: whatsappNumber.trim() || DEFAULT_WHATSAPP_NUMBER,
      travisPrompt:
        enabledActions.includes('consultar') || publishAction === 'consultar'
          ? travisPrompt.trim() || `Quiero consultar por ${title.trim()} (${code})`
          : '',
      imageUrl: imageUrl.trim(),
      gallery: galleryMedia.filter((m) => m.type === 'image').map((m) => m.url),
      galleryMedia,
      status,
      active: status === 'published',
      updatedAt: nowIso,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'ota_packages', editingId), payload);
        setFeedback('Ficha actualizada correctamente en Travel Market.');
      } else {
        await addDoc(collection(db, 'ota_packages'), {
          ...payload,
          createdAt: Date.now(),
        });
        setFeedback('Experiencia publicada en Travel Market.');
      }
      resetForm();
    } catch (err) {
      console.error('Error guardando ficha Travel Market:', err);
      setFeedback('Ocurrió un error al guardar la ficha.');
    } finally {
      setSaving(false);
    }
  };

  const filteredPackages = useMemo(() => {
    const q = searchList.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) =>
      `${p.title || ''} ${p.destination || ''} ${p.code || ''} ${p.operatorName || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [packages, searchList]);

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#0a2a5b]';
  const labelClass = 'block text-[11px] font-bold text-slate-600 mb-1';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
            <Globe className="w-5 h-5" /> Gestión de Travel Market
          </h2>
          <p className="text-xs text-slate-500">
            Creación de fichas comerciales para el Marketplace público (`ota_packages`) con control interno de operador.
          </p>
        </div>
        <Link
          href="/marketplace"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0a2a5b]/30 text-[#0a2a5b] text-xs font-bold hover:bg-[#0a2a5b]/5 w-fit"
        >
          Ver Marketplace Público <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {feedback && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Formulario + Vista Previa */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-2 bg-white/85 border border-slate-200/90 rounded-2xl p-5 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-[#0a2a5b]">
              {editingId ? 'Editando ficha de viaje' : 'Nueva ficha de viaje'}
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="published">Publicado</option>
                <option value="draft">Borrador (oculto)</option>
              </select>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </div>

          {/* 1. Identificación y Operador (Oculto) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Tipo de Viaje</label>
              <select
                value={tripKind}
                onChange={(e) => setTripKind(e.target.value as TripKind)}
                className={inputClass}
              >
                <option value="Paquete Propio">Paquete Propio</option>
                <option value="Paquete Operador">Paquete de Operador</option>
                <option value="Salida Grupal">Salida Grupal</option>
                <option value="Crucero">Crucero</option>
                <option value="Escapada">Escapada</option>
                <option value="Solo Alojamiento">Solo Alojamiento</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Código (Automático)</label>
              <div className="flex gap-1.5">
                <input
                  value={code}
                  readOnly
                  className={`${inputClass} bg-slate-50 font-mono text-[#0a2a5b]`}
                />
                <button
                  type="button"
                  onClick={() => setCode(generateTripCode())}
                  title="Regenerar código"
                  className="px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className={`${labelClass} flex items-center gap-1`}>
                Nombre del Operador
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                  <EyeOff className="w-2.5 h-2.5" /> Oculto en Marketplace
                </span>
              </label>
              <div className="space-y-1.5">
                {operators.length > 0 && (
                  <select
                    value={operatorId}
                    onChange={(e) => handleOperatorSelect(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seleccionar operador registrado...</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  value={operatorName}
                  onChange={(e) => {
                    setOperatorName(e.target.value);
                    setOperatorId('');
                  }}
                  placeholder="O escribir nombre del operador (control interno)"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* 2. Experiencia, Ruta, Duración y Transporte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Nombre de la Experiencia *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Caribe All Inclusive en Punta Cana"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Origen *</label>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Ej: Tucumán / Ezeiza"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Destino *</label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ej: Punta Cana"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Región en Marketplace</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as OtaRegion)}
                className={inputClass}
              >
                {REGION_OPTIONS.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Orden en Marketplace</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className={inputClass}
              >
                {SORT_ORDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Fechas de Salida (separadas por coma)</label>
              <input
                value={departureDatesText}
                onChange={(e) => setDepartureDatesText(e.target.value)}
                placeholder="Ej: Enero 2027, 15 Feb 2027"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Etiquetas / Botones (ej: Verano 2027, Cupos Propios)</label>
              <input
                value={customTagsText}
                onChange={(e) => setCustomTagsText(e.target.value)}
                placeholder="Ej: Verano 2027, Cupos Propios"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Duración (Días)</label>
              <input
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Duración (Noches)</label>
              <input
                type="number"
                min={0}
                value={durationNights}
                onChange={(e) => setDurationNights(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Transporte</label>
              <div className="flex flex-wrap gap-1.5">
                {TRANSPORT_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTransportType(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                      transportType === t.value
                        ? 'bg-[#0a2a5b] text-white border-[#0a2a5b]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {transportType === 'Bus' && (
                <div className="mt-2.5">
                  <label className={labelClass}>Categoría de Bus</label>
                  <div className="flex flex-wrap gap-1.5">
                    {BUS_TYPE_OPTIONS.map((bt) => (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setBusType(bt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                          busType === bt
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Bus {bt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Nombre del Hotel (opcional)</label>
              <input
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="Ej: Hotel Nevada / Resort All Inclusive"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Categoría Hotel</label>
                <select
                  value={hotelStars}
                  onChange={(e) => setHotelStars(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin especificar</option>
                  <option value="1">1 ★</option>
                  <option value="2">2 ★</option>
                  <option value="3">3 ★</option>
                  <option value="4">4 ★</option>
                  <option value="5">5 ★</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Régimen de Comidas</label>
                <select
                  value={foodPlan}
                  onChange={(e) => setFoodPlan(e.target.value as OtaFoodPlan)}
                  className={inputClass}
                >
                  {FOOD_PLAN_OPTIONS.map((fp) => (
                    <option key={fp} value={fp}>
                      {fp}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Servicios Incluidos y Detalle */}
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Servicios Incluidos</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_SERVICES.map((srv) => {
                  const active = includedServices.includes(srv);
                  return (
                    <button
                      key={srv}
                      type="button"
                      onClick={() => toggleService(srv)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${
                        active
                          ? 'bg-[#0a2a5b]/10 text-[#0a2a5b] border-[#0a2a5b]/30'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                      {srv}
                    </button>
                  );
                })}
                {includedServices
                  .filter((s) => !PRESET_SERVICES.includes(s))
                  .map((custom) => (
                    <span
                      key={custom}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#0a2a5b]/10 text-[#0a2a5b] border border-[#0a2a5b]/30"
                    >
                      {custom}
                      <button
                        type="button"
                        onClick={() => toggleService(custom)}
                        className="hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomService();
                    }
                  }}
                  placeholder="Agregar otro servicio incluido (ej: City Tour, Cena de Gala)..."
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleAddCustomService}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-[#0a2a5b] hover:bg-slate-100 cursor-pointer shrink-0"
                >
                  + Agregar
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Detalle de la Experiencia</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Itinerario resumido, hotelería prevista, condiciones generales..."
                className={inputClass}
              />
            </div>
          </div>

          {/* 4. Tarifa Pública, Descuento Rewards, Precio Miembros y Puntos */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h4 className="text-xs font-bold text-[#0a2a5b] flex items-center gap-1.5">
              <Award className="w-4 h-4" /> Tarifas & Programa TravelApp Rewards
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>Tarifa Pública *</label>
                <div className="flex">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'ARS' | 'USD')}
                    className="px-2.5 py-2 rounded-l-lg border border-r-0 border-slate-200 bg-white text-xs font-bold text-[#0a2a5b] outline-none"
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (US$)</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    required
                    value={publicPrice}
                    onChange={(e) => setPublicPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-r-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>% Miembro Rewards</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rewardsDiscountPercent}
                  onChange={(e) => setRewardsDiscountPercent(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Precio Miembros (Automático)</label>
                <div className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-700">
                  {formatMoney(calculatedMemberPrice)}
                </div>
              </div>

              <div>
                <label className={labelClass}>Acumula Puntos Rewards (Manual)</label>
                <input
                  type="number"
                  min={0}
                  value={rewardsPointsEarned}
                  onChange={(e) => setRewardsPointsEarned(e.target.value)}
                  placeholder="Ej: 850"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* 5. Selector para Publicar + Botones habilitados + Seña editable + Conexión Travis */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className={`${labelClass} mb-0`}>
                  Botones habilitados en Marketplace (uno, varios o todos)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setEnabledActions(
                      enabledActions.length === ALL_MARKETPLACE_ACTIONS.length
                        ? ['ver_detalle', 'reservar']
                        : ALL_MARKETPLACE_ACTIONS
                    )
                  }
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#0a2a5b]/10 text-[#0a2a5b] hover:bg-[#0a2a5b]/20 cursor-pointer"
                >
                  {enabledActions.length === ALL_MARKETPLACE_ACTIONS.length
                    ? 'Dejar solo básicos'
                    : 'Habilitar todos los botones'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MARKETPLACE_ACTION_OPTIONS.map((act) => {
                  const active = enabledActions.includes(act.value);
                  return (
                    <button
                      key={act.value}
                      type="button"
                      onClick={() => toggleEnabledAction(act.value)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      {act.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>Acción principal destacada</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PUBLISH_ACTIONS.map((act) => (
                  <button
                    key={act.value}
                    type="button"
                    onClick={() => selectPublishAction(act.value)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                      publishAction === act.value
                        ? 'bg-[#0a2a5b] text-white border-[#0a2a5b]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>

            {(enabledActions.includes('senar') || publishAction === 'senar') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className={labelClass}>Modalidad de Seña</label>
                  <select
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value as 'percentage' | 'fixed')}
                    className={inputClass}
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ({currency})</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    {depositType === 'percentage' ? 'Porcentaje de Seña (%)' : `Monto de Seña (${currency})`}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={depositValue}
                    onChange={(e) => setDepositValue(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Seña calculada</label>
                  <div className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-xs font-extrabold text-[#0a2a5b]">
                    {formatMoney(calculatedDepositAmount)}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-slate-200">
              <label className={`${labelClass} flex items-center gap-1.5 text-[#0a2a5b]`}>
                <Bot className="w-4 h-4" /> WhatsApp oficial y Conexión a Travis
              </label>
              {(enabledActions.includes('consultar') || publishAction === 'consultar') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'travis_webchat', label: 'Web Chat Travis' },
                    { id: 'whatsapp', label: 'WhatsApp Travis' },
                    { id: 'both', label: 'Ambos (Web Chat + WhatsApp)' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setInquiryChannel(ch.id as OtaInquiryChannel)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                        inquiryChannel === ch.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>WhatsApp de atención</label>
                  <input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+54 9 3812 00-0712"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contexto inicial para Travis</label>
                  <input
                    value={travisPrompt}
                    onChange={(e) => setTravisPrompt(e.target.value)}
                    placeholder={`Ej: Quiero consultar disponibilidad para ${title || 'este viaje'}`}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 6. Portada y Galería Multimedia */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <div>
              <label className={`${labelClass} flex items-center gap-1.5`}>
                <ImageIcon className="w-3.5 h-3.5 text-[#0a2a5b]" /> Imagen de Portada
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Pegá la URL de la portada o subí una imagen desde tu PC..."
                  className={inputClass}
                />
                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#0a2a5b]/30 bg-white text-[#0a2a5b] text-xs font-bold cursor-pointer hover:bg-[#0a2a5b]/5 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingCover ? 'Subiendo...' : 'Subir Portada'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <label className={`${labelClass} flex items-center gap-1.5`}>
                <Video className="w-3.5 h-3.5 text-[#0a2a5b]" /> Galería de Fotos y/o Videos
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={newMediaType}
                  onChange={(e) => setNewMediaType(e.target.value as 'image' | 'video')}
                  className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none shrink-0"
                >
                  <option value="image">Foto (URL)</option>
                  <option value="video">Video (URL)</option>
                </select>
                <input
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                  placeholder="Pegar URL de foto o video..."
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleAddMediaUrl}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0a2a5b] hover:bg-slate-100 cursor-pointer shrink-0"
                >
                  + URL
                </button>
                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer hover:bg-[#071f45] shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingGallery ? 'Subiendo...' : 'Subir Fotos/Videos'}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleGalleryUpload}
                    disabled={uploadingGallery}
                    className="hidden"
                  />
                </label>
              </div>

              {galleryMedia.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2">
                  {galleryMedia.map((item, idx) => (
                    <div
                      key={`${item.url}-${idx}`}
                      className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video"
                    >
                      {item.type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold uppercase">
                        {item.type === 'video' ? 'Video' : 'Foto'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setGalleryMedia((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-90 hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45] cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Publicar en Travel Market'}
            </button>
          </div>
        </form>

        {/* Vista Previa en vivo (cómo la ve el cliente) */}
        <div className="bg-white/90 border border-slate-200/90 rounded-2xl p-4 space-y-3 xl:sticky xl:top-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0a2a5b] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Vista Previa Marketplace
            </span>
            <span className="text-[10px] font-mono text-slate-400">{code}</span>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <div className="aspect-video bg-slate-100 relative flex items-center justify-center overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt={title || 'Portada'} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-slate-400 text-xs flex flex-col items-center gap-1">
                  <ImageIcon className="w-6 h-6" />
                  <span>Sin imagen de portada</span>
                </div>
              )}
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#0a2a5b]/90 text-white text-[10px] font-bold">
                {tripKind}
              </span>
              {galleryMedia.length > 0 && (
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-semibold">
                  +{galleryMedia.length} media
                </span>
              )}
            </div>

            <div className="p-4 space-y-2.5">
              <div>
                <p className="text-[11px] font-semibold text-slate-500">
                  {origin || 'Origen'} → {destination || 'Destino'} · {durationDays}D / {durationNights}N ·{' '}
                  {transportType === 'Bus' ? `Bus ${busType}` : transportType}
                </p>
                <h4 className="text-sm font-bold text-[#0a2a5b] mt-0.5">
                  {title || 'Nombre de la experiencia'}
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {hotelName ? `${hotelStars ? `${hotelStars}★ ` : ''}${hotelName} · ` : ''}
                  {foodPlan}
                </p>
              </div>

              {includedServices.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {includedServices.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold"
                    >
                      {s}
                    </span>
                  ))}
                  {includedServices.length > 4 && (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      +{includedServices.length - 4}
                    </span>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Tarifa Pública</span>
                  <span className="line-through text-slate-400 font-semibold">
                    {formatMoney(numericPublicPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700">
                    Miembros Rewards (-{numericDiscount}%)
                  </span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {formatMoney(calculatedMemberPrice)}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Acumula {Number(rewardsPointsEarned || 0).toLocaleString('es-AR')} pts Rewards
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-1.5">
                {enabledActions.map((act) => (
                  <div
                    key={act}
                    className={`py-2 px-2 rounded-lg text-center text-[11px] font-bold flex items-center justify-center gap-1 ${
                      act === 'whatsapp'
                        ? 'bg-emerald-600 text-white'
                        : act === 'senar'
                          ? 'bg-amber-500 text-slate-950'
                          : act === 'ver_detalle'
                            ? 'bg-slate-900 text-white'
                            : 'bg-[#0a2a5b] text-white'
                    }`}
                  >
                    {act === 'whatsapp' && <MessageCircle className="w-3 h-3" />}
                    {act === 'ver_detalle' && 'Ver Detalle'}
                    {act === 'whatsapp' && 'WhatsApp'}
                    {act === 'consultar' && 'Consultar'}
                    {act === 'reservar' && 'Reservar'}
                    {act === 'senar' && `Señar (${formatMoney(calculatedDepositAmount)})`}
                    {act === 'pagar' && 'Pagar Viaje'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {operatorName && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 shrink-0" />
              <span>
                Control interno: Operador <strong>{operatorName}</strong> (no visible al público).
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Listado de paquetes cargados */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#0a2a5b]">
            Experiencias cargadas ({filteredPackages.length})
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchList}
              onChange={(e) => setSearchList(e.target.value)}
              placeholder="Buscar por título, código, operador..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.length === 0 ? (
            <p className="col-span-full text-center text-xs text-slate-400 py-8 border border-dashed border-slate-200 rounded-xl">
              No hay experiencias cargadas en Travel Market.
            </p>
          ) : (
            filteredPackages.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200/90 bg-white/85 overflow-hidden flex flex-col justify-between"
              >
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="w-full h-32 object-cover border-b border-slate-100"
                  />
                )}
                <div className="p-4 space-y-2 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {p.code || 'SIN-COD'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'draft'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {p.status === 'draft' ? 'Borrador' : 'Publicado'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#0a2a5b]">{p.title}</p>
                  <p className="text-xs text-slate-500">
                    {p.departureOrigin ? `${p.departureOrigin} → ` : ''}
                    {p.destination} · {p.durationNights ?? p.nights ?? 3} noches
                  </p>
                  {p.operatorName && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> {p.operatorName}
                    </p>
                  )}
                  <div className="pt-1 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-emerald-700">
                      {formatMoney(p.memberPrice ?? p.price, p.currency === 'USD' ? 'USD' : 'ARS')}{' '}
                      <span className="text-[10px] font-normal text-slate-400">Miembros</span>
                    </span>
                    <span className="text-[11px] font-bold uppercase text-[#0a2a5b]">
                      {p.publishAction || 'reservar'}
                    </span>
                  </div>
                </div>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#0a2a5b] hover:bg-slate-100 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'ota_packages', p.id))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
