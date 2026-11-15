'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Bus,
  Plane,
  Hotel,
  ShieldPlus,
  Plus,
  Trash2,
  Printer,
  Save,
  Send,
  RefreshCw,
  FolderOpen,
  X,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type TransportMode = 'bus' | 'aereo';
type IvaMode = 'none' | '10.5' | '21';
type BusFloorMode = '1_piso' | '2_pisos';
type BusSeatType = 'Semicama' | 'Mix' | 'Cama' | 'Suite';
type SingleDeckSeatType = 'Semicama' | 'Cama' | 'Suite';
type FoodPlan =
  | 'Sin Régimen'
  | 'Con Desayuno'
  | 'Media Pensión'
  | 'Pensión Completa'
  | 'All Inclusive';
type RoomKey = 'SGL' | 'DBL' | 'TPL' | 'CPL' | 'QPL';

interface RoomMeta {
  key: RoomKey;
  label: string;
  occupancy: number;
}

interface HotelItem {
  id: string;
  dest: string;
  name: string;
  category: string;
  nights: string;
  foodPlan: FoodPlan;
  rateMode: 'passenger' | 'room';
  ratePeriod: 'per_night' | 'total_stay';
  iva: IvaMode;
  rates: Record<RoomKey, string>;
}

interface AdditionalServiceItem {
  id: string;
  concept: string;
  amount: string;
  scope: 'individual' | 'total';
  iva: IvaMode;
}

const ROOM_META: RoomMeta[] = [
  { key: 'SGL', label: 'Single (SGL)', occupancy: 1 },
  { key: 'DBL', label: 'Doble (DBL)', occupancy: 2 },
  { key: 'TPL', label: 'Triple (TPL)', occupancy: 3 },
  { key: 'CPL', label: 'Cuádruple (CPL)', occupancy: 4 },
  { key: 'QPL', label: 'Quíntuple (QPL)', occupancy: 5 },
];

function createEmptyHotel(idx = 1): HotelItem {
  return {
    id: `hotel-${Date.now()}-${idx}`,
    dest: '',
    name: '',
    category: '3★',
    nights: '3',
    foodPlan: 'Con Desayuno',
    rateMode: 'passenger',
    ratePeriod: 'per_night',
    iva: 'none',
    rates: { SGL: '0', DBL: '0', TPL: '0', CPL: '0', QPL: '0' },
  };
}

function ivaMultiplier(mode: IvaMode): number {
  if (mode === '10.5') return 1.105;
  if (mode === '21') return 1.21;
  return 1;
}

function generateQuoteCode(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `COT-${year}-${rand}`;
}

export function OwnTripQuoterTab() {
  const { user, loading: authLoading } = useAuth();

  // Encabezado
  const [quoteCode, setQuoteCode] = useState(() => generateQuoteCode());
  const [tripName, setTripName] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');

  // Transportación
  const [transportMode, setTransportMode] = useState<TransportMode>('bus');
  const [busTotalValue, setBusTotalValue] = useState('0');
  const [busIva, setBusIva] = useState<IvaMode>('10.5');
  const [basePax, setBasePax] = useState('40');
  const [busFloors, setBusFloors] = useState<BusFloorMode>('2_pisos');
  const [busRefType, setBusRefType] = useState<BusSeatType>('Mix');
  const [upperDeckSeats, setUpperDeckSeats] = useState('40');
  const [upperDeckType, setUpperDeckType] = useState<SingleDeckSeatType>('Semicama');
  const [lowerDeckSeats, setLowerDeckSeats] = useState('12');
  const [lowerDeckType, setLowerDeckType] = useState<SingleDeckSeatType>('Cama');

  // Cupo Aéreo
  const [airFare, setAirFare] = useState('0');
  const [airTaxes, setAirTaxes] = useState('0');
  const [airIva, setAirIva] = useState<IvaMode>('none');

  // Servicios Terrestres (Traslados)
  const [hasTransfers, setHasTransfers] = useState<'SI' | 'NO'>('NO');
  const [transferInOrigin, setTransferInOrigin] = useState('');
  const [transferInDest, setTransferInDest] = useState('');
  const [transferInAmount, setTransferInAmount] = useState('0');
  const [transferInScope, setTransferInScope] = useState<'total' | 'individual'>('total');
  const [transferInIva, setTransferInIva] = useState<IvaMode>('none');
  const [transferOutOrigin, setTransferOutOrigin] = useState('');
  const [transferOutDest, setTransferOutDest] = useState('');
  const [transferOutAmount, setTransferOutAmount] = useState('0');
  const [transferOutScope, setTransferOutScope] = useState<'total' | 'individual'>('total');
  const [transferOutIva, setTransferOutIva] = useState<IvaMode>('none');

  // Alojamiento Multidestino (hasta 10 hoteles)
  const [enabledRooms, setEnabledRooms] = useState<Record<RoomKey, boolean>>({
    SGL: false,
    DBL: true,
    TPL: true,
    CPL: false,
    QPL: false,
  });
  const [hotels, setHotels] = useState<HotelItem[]>([createEmptyHotel(1)]);

  // Asistencia al Viajero
  const [insurerName, setInsurerName] = useState('');
  const [assistanceDailyRate, setAssistanceDailyRate] = useState('0');
  const [assistanceDays, setAssistanceDays] = useState('5');
  const [assistanceIva, setAssistanceIva] = useState<IvaMode>('none');

  // Servicios Adicionales (hasta 20)
  const [additionals, setAdditionals] = useState<AdditionalServiceItem[]>([
    { id: 'add-1', concept: 'Refrigerio a bordo', amount: '0', scope: 'individual', iva: 'none' },
  ]);

  // Liberados, Rentabilidad, Rewards y Comisiones
  const [freePaxCount, setFreePaxCount] = useState('1');
  const [manualAirFreeCost, setManualAirFreeCost] = useState('0');
  const [profitPct, setProfitPct] = useState('25');
  const [memberDiscountPct, setMemberDiscountPct] = useState('10');
  const [rewardsProfitSharePct, setRewardsProfitSharePct] = useState('5'); // % de la rentabilidad
  const [rewardPointValue, setRewardPointValue] = useState('10'); // Valor de 1 punto desde Rewards
  const [commSellerPct, setCommSellerPct] = useState('5');
  const [commPromoterPct, setCommPromoterPct] = useState('2');
  const [commAffiliatePct, setCommAffiliatePct] = useState('2');
  const [commMktPct, setCommMktPct] = useState('1');

  // Guardados y Feedback
  const [savedQuotes, setSavedQuotes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    const u1 = onSnapshot(
      collection(db, 'own_trip_quotes'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        setSavedQuotes(list);
      },
      (err) => console.warn('own_trip_quotes listener:', err?.code || err?.message)
    );
    const u2 = onSnapshot(
      doc(db, 'system_config', 'driver_settings'),
      (snap) => {
        if (snap.exists()) {
          const rate = Number(snap.data()?.pointsConversionRate);
          if (rate > 0) setRewardPointValue(String(rate));
        }
      },
      (err) => console.warn('driver_settings listener:', err?.code || err?.message)
    );
    return () => {
      u1();
      u2();
    };
  }, [authLoading, user]);

  const fmt = (val: number) => {
    const prefix = currency === 'USD' ? 'USD ' : '$';
    return `${prefix}${Math.round(val || 0).toLocaleString('es-AR')}`;
  };

  const baseCount = Math.max(1, Number(basePax) || 1);
  const totalNights = useMemo(
    () => hotels.reduce((acc, h) => acc + Math.max(0, Number(h.nights) || 0), 0),
    [hotels]
  );

  // Transporte por pasajero (con IVA)
  const busWithIva = useMemo(() => {
    const raw = Math.max(0, Number(busTotalValue) || 0);
    return raw * ivaMultiplier(busIva);
  }, [busTotalValue, busIva]);

  const airSeatTotal = useMemo(() => {
    const raw = Math.max(0, Number(airFare) || 0) + Math.max(0, Number(airTaxes) || 0);
    return raw * ivaMultiplier(airIva);
  }, [airFare, airTaxes, airIva]);

  const transportPerPax = useMemo(() => {
    return transportMode === 'bus' ? busWithIva / baseCount : airSeatTotal;
  }, [transportMode, busWithIva, baseCount, airSeatTotal]);

  // Traslados por pasajero (con IVA)
  const transfersPerPax = useMemo(() => {
    if (hasTransfers === 'NO') return 0;
    const inWithIva = Math.max(0, Number(transferInAmount) || 0) * ivaMultiplier(transferInIva);
    const outWithIva = Math.max(0, Number(transferOutAmount) || 0) * ivaMultiplier(transferOutIva);
    const inPax = transferInScope === 'total' ? inWithIva / baseCount : inWithIva;
    const outPax = transferOutScope === 'total' ? outWithIva / baseCount : outWithIva;
    return inPax + outPax;
  }, [
    hasTransfers,
    transferInAmount,
    transferInIva,
    transferInScope,
    transferOutAmount,
    transferOutIva,
    transferOutScope,
    baseCount,
  ]);

  // Asistencia por pasajero (con IVA)
  const assistanceTotalPerPax = useMemo(() => {
    const raw = Math.max(0, Number(assistanceDailyRate) || 0) * Math.max(0, Number(assistanceDays) || 0);
    return raw * ivaMultiplier(assistanceIva);
  }, [assistanceDailyRate, assistanceDays, assistanceIva]);

  // Adicionales por pasajero (con IVA)
  const additionalsPerPax = useMemo(() => {
    return additionals.reduce((acc, item) => {
      const valWithIva = Math.max(0, Number(item.amount) || 0) * ivaMultiplier(item.iva);
      return acc + (item.scope === 'total' ? valWithIva / baseCount : valWithIva);
    }, 0);
  }, [additionals, baseCount]);

  // Habitaciones habilitadas
  const activeRoomMetas = useMemo(
    () => ROOM_META.filter((r) => enabledRooms[r.key]),
    [enabledRooms]
  );

  // Cálculo por cada tipo de habitación habilitada (sumando hasta 10 hoteles)
  const roomCalculations = useMemo(() => {
    const nProfit = Math.max(0, Number(profitPct) || 0);
    const nSeller = Math.max(0, Number(commSellerPct) || 0);
    const nPromoter = Math.max(0, Number(commPromoterPct) || 0);
    const nAffiliate = Math.max(0, Number(commAffiliatePct) || 0);
    const nMkt = Math.max(0, Number(commMktPct) || 0);
    const nMemberDisc = Math.min(100, Math.max(0, Number(memberDiscountPct) || 0));
    const nRewardsShare = Math.min(100, Math.max(0, Number(rewardsProfitSharePct) || 0));
    const ptVal = Math.max(0.01, Number(rewardPointValue) || 1);
    const nFree = Math.max(0, Number(freePaxCount) || 0);

    return activeRoomMetas.map((room) => {
      const hotelPerPax = hotels.reduce((sum, h) => {
        const hNights = Math.max(1, Number(h.nights) || 1);
        const rawRate = Math.max(0, Number(h.rates?.[room.key]) || 0);
        const stayRate = h.ratePeriod === 'per_night' ? rawRate * hNights : rawRate;
        const stayWithIva = stayRate * ivaMultiplier(h.iva);
        const perPax = h.rateMode === 'room' ? stayWithIva / room.occupancy : stayWithIva;
        return sum + perPax;
      }, 0);

      const netBase =
        transportPerPax +
        transfersPerPax +
        hotelPerPax +
        assistanceTotalPerPax +
        additionalsPerPax;

      const freeCostPerPax =
        transportMode === 'bus'
          ? (netBase * nFree) / baseCount
          : Math.max(0, Number(manualAirFreeCost) || 0);

      const finalNet = netBase + freeCostPerPax;
      const totalMarginPct = nProfit + nSeller + nPromoter + nAffiliate + nMkt;

      const grossProfitAmount = finalNet * (nProfit / 100);
      // Puntos Rewards salen de la Rentabilidad (ej. 5% de la rentabilidad del 25%)
      const rewardsCostAmount = grossProfitAmount * (nRewardsShare / 100);
      const netAgencyProfit = grossProfitAmount - rewardsCostAmount;
      const rewardsPoints = Math.round(rewardsCostAmount / ptVal);

      const sellerAmount = finalNet * (nSeller / 100);
      const promoterAmount = finalNet * (nPromoter / 100);
      const affiliateAmount = finalNet * (nAffiliate / 100);
      const mktAmount = finalNet * (nMkt / 100);

      const finalSalePrice = finalNet * (1 + totalMarginPct / 100);
      const memberSalePrice = finalSalePrice * (1 - nMemberDisc / 100);

      return {
        ...room,
        hotelPerPax,
        netBase,
        freeCostPerPax,
        finalNet,
        grossProfitAmount,
        rewardsCostAmount,
        netAgencyProfit,
        rewardsPoints,
        sellerAmount,
        promoterAmount,
        affiliateAmount,
        mktAmount,
        finalSalePrice,
        memberSalePrice,
      };
    });
  }, [
    activeRoomMetas,
    hotels,
    transportPerPax,
    transfersPerPax,
    assistanceTotalPerPax,
    additionalsPerPax,
    transportMode,
    freePaxCount,
    baseCount,
    manualAirFreeCost,
    profitPct,
    commSellerPct,
    commPromoterPct,
    commAffiliatePct,
    commMktPct,
    memberDiscountPct,
    rewardsProfitSharePct,
    rewardPointValue,
  ]);

  const handleAddHotel = () => {
    if (hotels.length >= 10) return;
    setHotels((prev) => [...prev, createEmptyHotel(prev.length + 1)]);
  };

  const handleRemoveHotel = (id: string) => {
    if (hotels.length <= 1) return;
    setHotels((prev) => prev.filter((h) => h.id !== id));
  };

  const updateHotel = (id: string, patch: Partial<HotelItem>) => {
    setHotels((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  };

  const updateHotelRate = (id: string, roomKey: RoomKey, value: string) => {
    setHotels((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, rates: { ...h.rates, [roomKey]: value } } : h
      )
    );
  };

  const handleAddAdditional = () => {
    if (additionals.length >= 20) return;
    setAdditionals((prev) => [
      ...prev,
      { id: `add-${Date.now()}`, concept: '', amount: '0', scope: 'individual', iva: 'none' },
    ]);
  };

  const handleSaveQuote = async () => {
    setSaving(true);
    setFeedback(null);
    const codeToSave = quoteCode.trim() || generateQuoteCode();
    try {
      const mainDest = hotels.map((h) => h.dest.trim()).filter(Boolean).join(' + ') || 'Multidestino';
      await addDoc(collection(db, 'own_trip_quotes'), {
        code: codeToSave,
        tripName: tripName.trim() || `Salida ${mainDest}`,
        departureDate,
        currency,
        transportMode,
        busTotalValue: Number(busTotalValue || 0),
        busIva,
        basePax: baseCount,
        busFloors,
        busRefType,
        upperDeckSeats: Number(upperDeckSeats || 0),
        upperDeckType,
        lowerDeckSeats: Number(lowerDeckSeats || 0),
        lowerDeckType,
        airFare: Number(airFare || 0),
        airTaxes: Number(airTaxes || 0),
        airIva,
        hasTransfers,
        transferInOrigin,
        transferInDest,
        transferInAmount: Number(transferInAmount || 0),
        transferInScope,
        transferInIva,
        transferOutOrigin,
        transferOutDest,
        transferOutAmount: Number(transferOutAmount || 0),
        transferOutScope,
        transferOutIva,
        enabledRooms,
        hotels,
        insurerName,
        assistanceDailyRate: Number(assistanceDailyRate || 0),
        assistanceDays: Number(assistanceDays || 0),
        assistanceIva,
        additionals,
        freePaxCount: Number(freePaxCount || 0),
        manualAirFreeCost: Number(manualAirFreeCost || 0),
        profitPct: Number(profitPct || 0),
        memberDiscountPct: Number(memberDiscountPct || 0),
        rewardsProfitSharePct: Number(rewardsProfitSharePct || 0),
        rewardPointValue: Number(rewardPointValue || 10),
        commSellerPct: Number(commSellerPct || 0),
        commPromoterPct: Number(commPromoterPct || 0),
        commAffiliatePct: Number(commAffiliatePct || 0),
        commMktPct: Number(commMktPct || 0),
        summaryRooms: roomCalculations.map((r) => ({
          key: r.key,
          finalNet: Math.round(r.finalNet),
          finalSalePrice: Math.round(r.finalSalePrice),
          memberSalePrice: Math.round(r.memberSalePrice),
          rewardsPoints: r.rewardsPoints,
        })),
        createdAt: Date.now(),
      });
      setQuoteCode(codeToSave);
      setFeedback(`Cotización ${codeToSave} guardada en Firestore.`);
    } catch (err) {
      console.error('Error guardando cotización:', err);
      setFeedback('Error al guardar la cotización.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadQuote = (q: any) => {
    setQuoteCode(q.code || generateQuoteCode());
    setTripName(q.tripName || '');
    setDepartureDate(q.departureDate || '');
    setCurrency(q.currency === 'USD' ? 'USD' : 'ARS');
    setTransportMode(q.transportMode === 'aereo' ? 'aereo' : 'bus');
    setBusTotalValue(String(q.busTotalValue ?? '0'));
    setBusIva((q.busIva as IvaMode) || '10.5');
    setBasePax(String(q.basePax ?? '40'));
    setBusFloors((q.busFloors as BusFloorMode) || '2_pisos');
    setBusRefType((q.busRefType as BusSeatType) || 'Mix');
    setUpperDeckSeats(String(q.upperDeckSeats ?? '40'));
    setUpperDeckType((q.upperDeckType as SingleDeckSeatType) || 'Semicama');
    setLowerDeckSeats(String(q.lowerDeckSeats ?? '12'));
    setLowerDeckType((q.lowerDeckType as SingleDeckSeatType) || 'Cama');
    setAirFare(String(q.airFare ?? '0'));
    setAirTaxes(String(q.airTaxes ?? '0'));
    setAirIva((q.airIva as IvaMode) || 'none');
    setHasTransfers(q.hasTransfers === 'SI' ? 'SI' : 'NO');
    setTransferInOrigin(q.transferInOrigin || '');
    setTransferInDest(q.transferInDest || '');
    setTransferInAmount(String(q.transferInAmount ?? '0'));
    setTransferInScope(q.transferInScope === 'individual' ? 'individual' : 'total');
    setTransferInIva((q.transferInIva as IvaMode) || 'none');
    setTransferOutOrigin(q.transferOutOrigin || '');
    setTransferOutDest(q.transferOutDest || '');
    setTransferOutAmount(String(q.transferOutAmount ?? '0'));
    setTransferOutScope(q.transferOutScope === 'individual' ? 'individual' : 'total');
    setTransferOutIva((q.transferOutIva as IvaMode) || 'none');
    if (q.enabledRooms) setEnabledRooms(q.enabledRooms);
    if (Array.isArray(q.hotels) && q.hotels.length > 0) setHotels(q.hotels);
    setInsurerName(q.insurerName || '');
    setAssistanceDailyRate(String(q.assistanceDailyRate ?? '0'));
    setAssistanceDays(String(q.assistanceDays ?? '5'));
    setAssistanceIva((q.assistanceIva as IvaMode) || 'none');
    if (Array.isArray(q.additionals)) setAdditionals(q.additionals);
    setFreePaxCount(String(q.freePaxCount ?? '1'));
    setManualAirFreeCost(String(q.manualAirFreeCost ?? '0'));
    setProfitPct(String(q.profitPct ?? '25'));
    setMemberDiscountPct(String(q.memberDiscountPct ?? '10'));
    setRewardsProfitSharePct(String(q.rewardsProfitSharePct ?? '5'));
    setRewardPointValue(String(q.rewardPointValue ?? '10'));
    setCommSellerPct(String(q.commSellerPct ?? '5'));
    setCommPromoterPct(String(q.commPromoterPct ?? '2'));
    setCommAffiliatePct(String(q.commAffiliatePct ?? '2'));
    setCommMktPct(String(q.commMktPct ?? '1'));
    setFeedback(`Cotización ${q.code} cargada para edición.`);
  };

  const handleExportToMarketplace = async () => {
    const primaryRoom =
      roomCalculations.find((r) => r.key === 'DBL') || roomCalculations[0];
    if (!primaryRoom) {
      setFeedback('Habilitá al menos una habitación antes de exportar a Marketplace.');
      return;
    }
    setExporting(true);
    setFeedback(null);
    try {
      const destList = hotels.map((h) => h.dest.trim()).filter(Boolean);
      const mainDest = destList.join(' / ') || 'Destino a definir';
      const hotelSummary = hotels
        .map((h) => `${h.name || 'Hotel'} (${h.nights}N · ${h.foodPlan})`)
        .join(' + ');

      const included: string[] = [
        `Transporte ${transportMode === 'bus' ? 'Bus' : 'Aéreo'}`,
        hotelSummary,
      ];
      if (hasTransfers === 'SI') included.push('Traslados IN/OUT');
      if (assistanceTotalPerPax > 0) included.push(`Asistencia al Viajero (${insurerName || 'Incluida'})`);
      additionals
        .filter((a) => a.concept.trim())
        .forEach((a) => included.push(a.concept.trim()));

      await addDoc(collection(db, 'ota_packages'), {
        code: quoteCode.trim() || generateQuoteCode(),
        tripKind: 'Paquete Propio',
        type: 'paquete',
        providerType: 'propio',
        providerCategory: 'propio',
        operatorName: 'TravelApp Salida Propia',
        departureOrigin: transferInOrigin || 'Tucumán',
        destination: mainDest,
        country: destList[0] || 'Argentina',
        region: 'Argentina',
        durationDays: Math.max(1, totalNights + 1),
        durationNights: totalNights,
        nights: totalNights,
        departureDates: departureDate ? [departureDate] : [],
        transportType: transportMode === 'bus' ? 'Bus' : 'Avión',
        foodPlan: hotels[0]?.foodPlan || 'Con Desayuno',
        title: tripName.trim() || `Paquete a ${mainDest}`,
        includedServices: included,
        description: `Cotización ${quoteCode}. Base ${baseCount} pax. Hotelería: ${hotelSummary}.`,
        currency,
        price: Math.round(primaryRoom.finalSalePrice),
        rewardsDiscountPercent: Number(memberDiscountPct || 0),
        memberPrice: Math.round(primaryRoom.memberSalePrice),
        rewardsPointsEarned: primaryRoom.rewardsPoints,
        publishAction: 'reservar',
        enabledActions: ['ver_detalle', 'reservar'],
        sortOrder: 999,
        status: 'draft',
        active: false,
        imageUrl: '',
        gallery: [],
        createdAt: Date.now(),
        updatedAt: new Date().toISOString(),
      });
      setFeedback(
        `¡Exportado! Se creó un borrador en Travel Market con el código ${quoteCode}. Abrí "Travel Market" para agregar fotos y publicarlo.`
      );
    } catch (err) {
      console.error('Error exportando a Travel Market:', err);
      setFeedback('No se pudo exportar a Travel Market.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintA4 = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#0a2a5b]';
  const labelClass = 'block text-[11px] font-bold text-slate-600 mb-1';

  const IvaSelect = ({
    value,
    onChange,
  }: {
    value: IvaMode;
    onChange: (v: IvaMode) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as IvaMode)}
      className={inputClass}
    >
      <option value="none">SIN IVA</option>
      <option value="10.5">IVA 10.5%</option>
      <option value="21">IVA 21%</option>
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Estilos de impresión en UNA SOLA HOJA A4 */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        @media print {
          aside,
          header,
          .no-print {
            display: none !important;
          }
          body,
          main {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #quoter-a4-sheet {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          #quoter-a4-sheet table {
            font-size: 9.5px !important;
          }
          #quoter-a4-sheet th,
          #quoter-a4-sheet td {
            padding: 4px 6px !important;
          }
        }
      `}</style>

      {/* Cabecera */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
            <Calculator className="w-5 h-5" /> Cotizador de Viajes Propios
          </h2>
          <p className="text-xs text-slate-500">
            Multidestino (hasta 10 hoteles), IVA por ítem, Rewards sobre rentabilidad y análisis en 1 sola hoja A4 PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveQuote}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45] cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar Cotización'}
          </button>
          <button
            type="button"
            onClick={handleExportToMarketplace}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {exporting ? 'Exportando...' : 'Exportar a Travel Market'}
          </button>
          <button
            type="button"
            onClick={handlePrintA4}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-[#0a2a5b] text-xs font-bold hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Exportar Hoja A4 / PDF
          </button>
        </div>
      </div>

      {feedback && (
        <div className="no-print px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 0. Datos Generales & Moneda Global */}
      <div className="no-print bg-white/85 border border-slate-200/90 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Código de Cotización</label>
            <div className="flex gap-1.5">
              <input value={quoteCode} readOnly className={`${inputClass} bg-slate-50 font-mono text-[#0a2a5b]`} />
              <button
                type="button"
                onClick={() => setQuoteCode(generateQuoteCode())}
                className="px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Nombre del Viaje / Salida</label>
            <input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Ej: Circuito Norte + Mendoza 2027"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Fecha de Salida</label>
            <input
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              placeholder="Ej: 15 Jul 2027"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Moneda de Toda la Cotización</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'ARS' | 'USD')}
              className={`${inputClass} bg-blue-50/50 border-[#0a2a5b]/30 text-[#0a2a5b] font-bold`}
            >
              <option value="ARS">Pesos Argentinos (ARS $)</option>
              <option value="USD">Dólares (USD US$)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. Transportación */}
      <div className="no-print bg-white/85 border border-slate-200/90 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-[#0a2a5b] flex items-center gap-2">
            {transportMode === 'bus' ? <Bus className="w-4 h-4" /> : <Plane className="w-4 h-4" />}
            1. Transportación
          </h3>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setTransportMode('bus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                transportMode === 'bus' ? 'bg-[#0a2a5b] text-white' : 'text-slate-600'
              }`}
            >
              Bus
            </button>
            <button
              type="button"
              onClick={() => setTransportMode('aereo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                transportMode === 'aereo' ? 'bg-[#0a2a5b] text-white' : 'text-slate-600'
              }`}
            >
              Cupo Aéreo
            </button>
          </div>
        </div>

        {transportMode === 'bus' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>Valor Total del Viaje ({currency})</label>
                <input
                  type="number"
                  min={0}
                  value={busTotalValue}
                  onChange={(e) => setBusTotalValue(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>IVA Transporte</label>
                <IvaSelect value={busIva} onChange={setBusIva} />
              </div>
              <div>
                <label className={labelClass}>Base de Cotización (Pax)</label>
                <input
                  type="number"
                  min={1}
                  value={basePax}
                  onChange={(e) => setBasePax(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Valor de Butaca (c/ IVA ÷ Base)</label>
                <div className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-700">
                  {fmt(transportPerPax)} <span className="font-normal text-[10px]">(Total: {fmt(busWithIva)})</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className={labelClass}>Referencias de Unidad</label>
                <select
                  value={busFloors}
                  onChange={(e) => setBusFloors(e.target.value as BusFloorMode)}
                  className={inputClass}
                >
                  <option value="1_piso">1 Piso</option>
                  <option value="2_pisos">2 Pisos (Doble Piso)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Tipo de Butaca General</label>
                <select
                  value={busRefType}
                  onChange={(e) => setBusRefType(e.target.value as BusSeatType)}
                  className={inputClass}
                >
                  <option value="Semicama">Semicama</option>
                  <option value="Mix">Mix</option>
                  <option value="Cama">Cama</option>
                  <option value="Suite">Suite</option>
                </select>
              </div>
            </div>

            {busFloors === '2_pisos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#0a2a5b]">Piso Superior (Control Operativo)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Cant. Butacas</label>
                      <input
                        type="number"
                        min={0}
                        value={upperDeckSeats}
                        onChange={(e) => setUpperDeckSeats(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Tipo</label>
                      <select
                        value={upperDeckType}
                        onChange={(e) => setUpperDeckType(e.target.value as SingleDeckSeatType)}
                        className={inputClass}
                      >
                        <option value="Semicama">Semicama</option>
                        <option value="Cama">Cama</option>
                        <option value="Suite">Suite</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#0a2a5b]">Piso Inferior (Control Operativo)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Cant. Butacas</label>
                      <input
                        type="number"
                        min={0}
                        value={lowerDeckSeats}
                        onChange={(e) => setLowerDeckSeats(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Tipo</label>
                      <select
                        value={lowerDeckType}
                        onChange={(e) => setLowerDeckType(e.target.value as SingleDeckSeatType)}
                        className={inputClass}
                      >
                        <option value="Semicama">Semicama</option>
                        <option value="Cama">Cama</option>
                        <option value="Suite">Suite</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className={labelClass}>Tarifa de Lugar ({currency})</label>
              <input type="number" min={0} value={airFare} onChange={(e) => setAirFare(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Impuestos ({currency})</label>
              <input type="number" min={0} value={airTaxes} onChange={(e) => setAirTaxes(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>IVA Aéreo</label>
              <IvaSelect value={airIva} onChange={setAirIva} />
            </div>
            <div>
              <label className={labelClass}>Base de Cotización</label>
              <input type="number" min={1} value={basePax} onChange={(e) => setBasePax(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Valor Total Cupo c/ IVA</label>
              <div className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-700">
                {fmt(airSeatTotal)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Servicios Terrestres (Traslados) */}
      <div className="no-print bg-white/85 border border-slate-200/90 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-[#0a2a5b]">2. Servicios Terrestres — Traslados en Destino</h3>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            {(['NO', 'SI'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setHasTransfers(opt)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  hasTransfers === opt ? 'bg-[#0a2a5b] text-white' : 'text-slate-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {hasTransfers === 'SI' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-bold text-[#0a2a5b]">Transfer IN</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={transferInOrigin} onChange={(e) => setTransferInOrigin(e.target.value)} placeholder="Origen" className={inputClass} />
                <input value={transferInDest} onChange={(e) => setTransferInDest(e.target.value)} placeholder="Destino" className={inputClass} />
                <input type="number" min={0} value={transferInAmount} onChange={(e) => setTransferInAmount(e.target.value)} placeholder={`Importe (${currency})`} className={inputClass} />
                <select value={transferInScope} onChange={(e) => setTransferInScope(e.target.value as 'total' | 'individual')} className={inputClass}>
                  <option value="total">Total grupal (÷ Base)</option>
                  <option value="individual">Individual (por Pax)</option>
                </select>
                <div className="col-span-2">
                  <IvaSelect value={transferInIva} onChange={setTransferInIva} />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-bold text-[#0a2a5b]">Transfer OUT</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={transferOutOrigin} onChange={(e) => setTransferOutOrigin(e.target.value)} placeholder="Origen" className={inputClass} />
                <input value={transferOutDest} onChange={(e) => setTransferOutDest(e.target.value)} placeholder="Destino" className={inputClass} />
                <input type="number" min={0} value={transferOutAmount} onChange={(e) => setTransferOutAmount(e.target.value)} placeholder={`Importe (${currency})`} className={inputClass} />
                <select value={transferOutScope} onChange={(e) => setTransferOutScope(e.target.value as 'total' | 'individual')} className={inputClass}>
                  <option value="total">Total grupal (÷ Base)</option>
                  <option value="individual">Individual (por Pax)</option>
                </select>
                <div className="col-span-2">
                  <IvaSelect value={transferOutIva} onChange={setTransferOutIva} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Alojamiento Multidestino (hasta 10 hoteles) */}
      <div className="no-print bg-white/85 border border-slate-200/90 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0a2a5b] flex items-center gap-2">
              <Hotel className="w-4 h-4" /> 3. Alojamiento Multidestino ({hotels.length}/10 hoteles · {totalNights} noches totales)
            </h3>
            <p className="text-[11px] text-slate-400">Habilitá los tipos de habitación y cargá cada hotel del circuito.</p>
          </div>
          <button
            type="button"
            onClick={handleAddHotel}
            disabled={hotels.length >= 10}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a2a5b] text-white text-xs font-bold hover:bg-[#071f45] cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Hotel
          </button>
        </div>

        {/* Selector global de habitaciones habilitadas */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Habitaciones habilitadas:</span>
          {ROOM_META.map((r) => (
            <label
              key={r.key}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                enabledRooms[r.key]
                  ? 'bg-[#0a2a5b] text-white border-[#0a2a5b]'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={enabledRooms[r.key]}
                onChange={() =>
                  setEnabledRooms((prev) => ({ ...prev, [r.key]: !prev[r.key] }))
                }
                className="hidden"
              />
              {r.label}
            </label>
          ))}
        </div>

        <div className="space-y-4">
          {hotels.map((hotel, hIdx) => (
            <div key={hotel.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#0a2a5b]">
                  Hotel #{hIdx + 1} {hotel.dest ? `— ${hotel.dest}` : ''}
                </span>
                {hotels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveHotel(hotel.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Quitar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Destino</label>
                  <input value={hotel.dest} onChange={(e) => updateHotel(hotel.id, { dest: e.target.value })} placeholder="Ej: Salta" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nombre de Hotel</label>
                  <input value={hotel.name} onChange={(e) => updateHotel(hotel.id, { name: e.target.value })} placeholder="Ej: Hotel Design Suites" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Categoría</label>
                  <select value={hotel.category} onChange={(e) => updateHotel(hotel.id, { category: e.target.value })} className={inputClass}>
                    {['1★', '2★', '3★', '4★', '5★', 'Apart', 'Boutique'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Noches</label>
                  <input type="number" min={1} value={hotel.nights} onChange={(e) => updateHotel(hotel.id, { nights: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Régimen de Comidas</label>
                  <select value={hotel.foodPlan} onChange={(e) => updateHotel(hotel.id, { foodPlan: e.target.value as FoodPlan })} className={inputClass}>
                    <option value="Sin Régimen">Sin Régimen</option>
                    <option value="Con Desayuno">Con Desayuno</option>
                    <option value="Media Pensión">Media Pensión</option>
                    <option value="Pensión Completa">Pensión Completa</option>
                    <option value="All Inclusive">All Inclusive</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tarifa</label>
                  <select value={hotel.rateMode} onChange={(e) => updateHotel(hotel.id, { rateMode: e.target.value as 'passenger' | 'room' })} className={inputClass}>
                    <option value="passenger">Por Pasajero</option>
                    <option value="room">Por Habitación (÷ ocupación)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Periodicidad</label>
                  <select value={hotel.ratePeriod} onChange={(e) => updateHotel(hotel.id, { ratePeriod: e.target.value as 'per_night' | 'total_stay' })} className={inputClass}>
                    <option value="per_night">Por Noche (× {hotel.nights || 1}N)</option>
                    <option value="total_stay">Total Estadía</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>IVA Alojamiento</label>
                  <IvaSelect value={hotel.iva} onChange={(v) => updateHotel(hotel.id, { iva: v })} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200/70">
                {ROOM_META.map((r) => (
                  <div key={r.key} className={enabledRooms[r.key] ? '' : 'opacity-40'}>
                    <label className={labelClass}>
                      {r.key} ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      disabled={!enabledRooms[r.key]}
                      value={hotel.rates?.[r.key] || '0'}
                      onChange={(e) => updateHotelRate(hotel.id, r.key, e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Asistencia al Viajero & 5. Servicios Adicionales */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/85 border border-slate-200/90 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#0a2a5b] flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <ShieldPlus className="w-4 h-4" /> 4. Asistencia al Viajero
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Compañía Aseguradora</label>
              <input value={insurerName} onChange={(e) => setInsurerName(e.target.value)} placeholder="Ej: Assist Card" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>IVA Asistencia</label>
              <IvaSelect value={assistanceIva} onChange={setAssistanceIva} />
            </div>
            <div>
              <label className={labelClass}>Valor por Día ({currency})</label>
              <input type="number" min={0} value={assistanceDailyRate} onChange={(e) => setAssistanceDailyRate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cantidad de Días</label>
              <input type="number" min={0} value={assistanceDays} onChange={(e) => setAssistanceDays(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-700 flex justify-between">
            <span>Total Asistencia c/ IVA (por pax)</span>
            <span>{fmt(assistanceTotalPerPax)}</span>
          </div>
        </div>

        <div className="bg-white/85 border border-slate-200/90 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-[#0a2a5b]">
              5. Servicios Adicionales ({additionals.length}/20)
            </h3>
            <button
              type="button"
              onClick={handleAddAdditional}
              disabled={additionals.length >= 20}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0a2a5b] text-white text-[11px] font-bold cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Ítem
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {additionals.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center">
                <input
                  value={item.concept}
                  onChange={(e) => {
                    const next = [...additionals];
                    next[idx] = { ...next[idx], concept: e.target.value };
                    setAdditionals(next);
                  }}
                  placeholder="Concepto"
                  className={`${inputClass} col-span-4`}
                />
                <input
                  type="number"
                  min={0}
                  value={item.amount}
                  onChange={(e) => {
                    const next = [...additionals];
                    next[idx] = { ...next[idx], amount: e.target.value };
                    setAdditionals(next);
                  }}
                  placeholder="Importe"
                  className={`${inputClass} col-span-2`}
                />
                <select
                  value={item.scope}
                  onChange={(e) => {
                    const next = [...additionals];
                    next[idx] = { ...next[idx], scope: e.target.value as 'individual' | 'total' };
                    setAdditionals(next);
                  }}
                  className={`${inputClass} col-span-3`}
                >
                  <option value="individual">Individual</option>
                  <option value="total">Total (÷Base)</option>
                </select>
                <div className="col-span-2">
                  <IvaSelect
                    value={item.iva}
                    onChange={(v) => {
                      const next = [...additionals];
                      next[idx] = { ...next[idx], iva: v };
                      setAdditionals(next);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAdditionals((prev) => prev.filter((a) => a.id !== item.id))}
                  className="col-span-1 p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-[#0a2a5b] flex justify-between">
            <span>Total Adicionales c/ IVA por pasajero</span>
            <span>{fmt(additionalsPerPax)}</span>
          </div>
        </div>
      </div>

      {/* 6. Liberados, Rentabilidad, Rewards (sale de la Rentabilidad) y Comisiones */}
      <div className="no-print bg-white/85 border border-slate-200/90 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-[#0a2a5b] border-b border-slate-100 pb-2.5">
          6. Liberados, Rentabilidad, Rewards (Costo desde Rentabilidad) & Comisiones
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
          {transportMode === 'bus' ? (
            <div>
              <label className={labelClass}>Liberados (Cant.)</label>
              <input type="number" min={0} value={freePaxCount} onChange={(e) => setFreePaxCount(e.target.value)} className={inputClass} />
            </div>
          ) : (
            <div>
              <label className={labelClass}>Liberado Manual</label>
              <input type="number" min={0} value={manualAirFreeCost} onChange={(e) => setManualAirFreeCost(e.target.value)} className={inputClass} />
            </div>
          )}

          <div>
            <label className={labelClass}>Rentabilidad (%)</label>
            <input type="number" min={0} step="0.5" value={profitPct} onChange={(e) => setProfitPct(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>% Rewards s/ Rent.</label>
            <input type="number" min={0} max={100} step="0.5" value={rewardsProfitSharePct} onChange={(e) => setRewardsProfitSharePct(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Valor 1 Pto ({currency})</label>
            <input type="number" min={0.01} step="0.5" value={rewardPointValue} onChange={(e) => setRewardPointValue(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Benef. Miembro (%)</label>
            <input type="number" min={0} max={100} step="0.5" value={memberDiscountPct} onChange={(e) => setMemberDiscountPct(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Vendedor (%)</label>
            <input type="number" min={0} step="0.5" value={commSellerPct} onChange={(e) => setCommSellerPct(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Promotor (%)</label>
            <input type="number" min={0} step="0.5" value={commPromoterPct} onChange={(e) => setCommPromoterPct(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Afiliado / Emb. (%)</label>
            <input type="number" min={0} step="0.5" value={commAffiliatePct} onChange={(e) => setCommAffiliatePct(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>MKT (%)</label>
            <input type="number" min={0} step="0.5" value={commMktPct} onChange={(e) => setCommMktPct(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* 7. HOJA A4 ÚNICA DE ANÁLISIS DE COSTOS Y RENTABILIDADES (Exportable a PDF) */}
      <div
        id="quoter-a4-sheet"
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#0a2a5b] pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <img src="/assets/travelapp_original.svg" alt="TravelApp" className="h-5 w-auto" />
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-[#0a2a5b]">
                {quoteCode}
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-[#0a2a5b] mt-1">
              Análisis de Costos, Rentabilidades & Tarifa Final de Venta
            </h3>
            <p className="text-[11px] text-slate-500">
              {tripName || 'Salida Propia'} · {hotels.length} hotel{hotels.length === 1 ? '' : 'es'} ({totalNights} noches) · Salida: {departureDate || 'A definir'}
            </p>
            <p className="text-[10px] text-slate-400">
              Hotelería: {hotels.map((h) => `${h.dest || 'Destino'}: ${h.name || 'Hotel'} (${h.nights}N ${h.foodPlan})`).join(' | ')}
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-500 shrink-0">
            <p className="font-bold text-[#0a2a5b]">Moneda: {currency}</p>
            <p>
              Base: {baseCount} pax ·{' '}
              {transportMode === 'bus'
                ? `Bus ${busFloors === '2_pisos' ? `2 Pisos (${upperDeckSeats} ${upperDeckType} / ${lowerDeckSeats} ${lowerDeckType})` : `1 Piso (${busRefType})`}`
                : 'Cupo Aéreo'}
            </p>
            <p>Emisión: {new Date().toLocaleDateString('es-AR')}</p>
          </div>
        </div>

        {roomCalculations.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Habilitá al menos un tipo de habitación (SGL, DBL, TPL, CPL o QPL) para visualizar la matriz de precios.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0a2a5b] text-white">
                  <th className="p-2 font-bold rounded-tl-lg">Concepto (por Pasajero)</th>
                  {roomCalculations.map((r) => (
                    <th key={r.key} className="p-2 font-bold text-right">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2 font-semibold text-slate-600">Transporte ({transportMode === 'bus' ? 'Butaca Bus' : 'Cupo Aéreo'})</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono">{fmt(transportPerPax)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-slate-600">Servicios Terrestres (Traslados IN/OUT)</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono">{fmt(transfersPerPax)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-slate-600">Alojamiento Total ({hotels.length} hoteles · {totalNights}N)</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono">{fmt(r.hotelPerPax)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-slate-600">Asistencia al Viajero ({insurerName || 'Sin especificar'})</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono">{fmt(assistanceTotalPerPax)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-slate-600">Servicios Adicionales</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono">{fmt(additionalsPerPax)}</td>
                  ))}
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-2 font-bold text-slate-700">Precio Neto Base</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono font-bold">{fmt(r.netBase)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-slate-600">Liberados ({transportMode === 'bus' ? `${freePaxCount} pax ÷ ${baseCount}` : 'Manual'})</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono">{fmt(r.freeCostPerPax)}</td>
                  ))}
                </tr>
                <tr className="bg-slate-100">
                  <td className="p-2 font-extrabold text-[#0a2a5b]">Valor Neto Final</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono font-extrabold text-[#0a2a5b]">{fmt(r.finalNet)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-emerald-700">Rentabilidad Bruta ({profitPct}%)</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono text-emerald-700">{fmt(r.grossProfitAmount)}</td>
                  ))}
                </tr>
                <tr className="bg-amber-50/70">
                  <td className="p-2 font-semibold text-amber-800">
                    Costo Rewards ({rewardsProfitSharePct}% de Rentab. · 1 pto = {fmt(Number(rewardPointValue || 10))})
                  </td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono text-amber-800">
                      -{fmt(r.rewardsCostAmount)} ({r.rewardsPoints.toLocaleString('es-AR')} pts)
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-50/50">
                  <td className="p-2 font-bold text-emerald-800">Rentabilidad Neta Agencia (descontando Rewards)</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono font-bold text-emerald-800">{fmt(r.netAgencyProfit)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">Comisión Vendedor ({commSellerPct}%)</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono text-slate-600">{fmt(r.sellerAmount)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">Comisión Promotor ({commPromoterPct}%)</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono text-slate-600">{fmt(r.promoterAmount)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">Comisión Afiliado / Embajador ({commAffiliatePct}%)</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono text-slate-600">{fmt(r.affiliateAmount)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">MKT ({commMktPct}%)</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono text-slate-600">{fmt(r.mktAmount)}</td>
                  ))}
                </tr>
                <tr className="bg-[#0a2a5b]/10">
                  <td className="p-2.5 font-extrabold text-[#0a2a5b] text-xs">PRECIO FINAL DE VENTA (Público)</td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2.5 text-right font-mono font-extrabold text-[#0a2a5b] text-xs">
                      {fmt(r.finalSalePrice)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-50">
                  <td className="p-2 font-extrabold text-emerald-800">
                    Precio Miembro Rewards (-{memberDiscountPct}%)
                  </td>
                  {roomCalculations.map((r) => (
                    <td key={r.key} className="p-2 text-right font-mono font-extrabold text-emerald-700">
                      {fmt(r.memberSalePrice)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Panel de Firmas para Aprobación (al pie de la hoja A4 única) */}
        <div className="pt-6 mt-4 border-t border-slate-200 grid grid-cols-3 gap-6 text-center">
          <div className="pt-6 border-t border-slate-400">
            <p className="text-[11px] font-bold text-[#0a2a5b]">Elaboró / Cotizó</p>
            <p className="text-[9px] text-slate-400">Firma y Aclaración</p>
          </div>
          <div className="pt-6 border-t border-slate-400">
            <p className="text-[11px] font-bold text-[#0a2a5b]">Revisión Operativa</p>
            <p className="text-[9px] text-slate-400">Firma y Aclaración</p>
          </div>
          <div className="pt-6 border-t border-slate-400">
            <p className="text-[11px] font-bold text-[#0a2a5b]">Aprobación Final</p>
            <p className="text-[9px] text-slate-400">Gerencia · Fecha: ___/___/202_</p>
          </div>
        </div>
      </div>

      {/* Historial de Cotizaciones Guardadas */}
      <div className="no-print bg-white/85 border border-slate-200/90 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-[#0a2a5b] flex items-center gap-2">
          <FolderOpen className="w-4 h-4" /> Cotizaciones Guardadas ({savedQuotes.length})
        </h3>
        {savedQuotes.length === 0 ? (
          <p className="text-xs text-slate-400">No hay cotizaciones guardadas aún.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedQuotes.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-start justify-between gap-2 text-xs">
                <div>
                  <span className="font-mono text-[10px] font-bold text-[#0a2a5b] bg-slate-100 px-2 py-0.5 rounded">
                    {q.code}
                  </span>
                  <p className="font-bold text-slate-800 mt-1">{q.tripName}</p>
                  <p className="text-slate-500">
                    {Array.isArray(q.hotels) ? `${q.hotels.length} hotel(es)` : q.hotelDest || '-'} · {q.currency}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLoadQuote(q)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-[#0a2a5b] hover:bg-slate-50 cursor-pointer"
                  >
                    Cargar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'own_trip_quotes', q.id))}
                    className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
