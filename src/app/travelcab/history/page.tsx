'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Route, Calendar, Download, Printer, Filter, Search,
  TrendingUp, MapPin, Clock, Navigation, Activity, CheckCircle2,
  AlertCircle, RefreshCw, FileSpreadsheet, X, Eye, ShieldCheck,
  DollarSign, BarChart2, Layers, Check, Building2, Settings, Image as ImageIcon
} from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ExtendedTrip {
  id: string;
  passengerName: string;
  passengerPhone?: string;
  origin: string;
  destination: string;
  status: 'Buscando Chofer' | 'En Camino' | 'En Viaje' | 'Completado' | 'Cancelado';
  driverName?: string;
  price?: number;
  scheduledTime?: number;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  distanceKm?: number;
  durationMinutes?: number;
  serviceType?: string;
  paymentMethod?: string;
  createdAt: number;
}

interface CompanyVoucherConfig {
  companyName: string;
  cuit: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  footerText: string;
}

const DEFAULT_COMPANY_CONFIG: CompanyVoucherConfig = {
  companyName: 'TravelApp Argentina S.A.',
  cuit: '30-71882390-4',
  address: 'Av. Del Libertador 2440, CABA',
  phone: '+54 11 5234-8000',
  email: 'soporte@travelapp.ar',
  logoUrl: '',
  footerText: 'Documento oficial de trazabilidad logística y comprobante de recibo de servicio.',
};

// Datos de muestra realistas cuando Firestore esté en cero
const SEED_TRIPS: ExtendedTrip[] = [
  {
    id: 'TRIP-8841',
    passengerName: 'Gonzalo Fernández',
    passengerPhone: '+54 9 11 4589-2231',
    origin: 'Av. Del Libertador 2440, CABA',
    destination: 'Aeropuerto Internacional Ezeiza (EZE)',
    status: 'Completado',
    driverName: 'Carlos Mamani (VW Gol AB123CD)',
    price: 34500,
    distanceKm: 34.2,
    durationMinutes: 42,
    serviceType: 'Transfer Aeropuerto',
    paymentMethod: 'Mercado Pago',
    createdAt: Date.now() - 1000 * 60 * 60 * 3, // Hace 3 hs
  },
  {
    id: 'TRIP-8842',
    passengerName: 'María Eugenia Rossi',
    passengerPhone: '+54 9 11 3321-9988',
    origin: 'Terminal de Omnibus Retiro',
    destination: 'Hotel Alvear Palace, Recoleta',
    status: 'Completado',
    driverName: 'Jorge Ruiz (Toyota Corolla GH789IJ)',
    price: 9800,
    distanceKm: 6.8,
    durationMinutes: 18,
    serviceType: 'MU Urbana',
    paymentMethod: 'Efectivo',
    createdAt: Date.now() - 1000 * 60 * 60 * 5, // Hace 5 hs
  },
  {
    id: 'TRIP-8843',
    passengerName: 'Roberto Gómez',
    passengerPhone: '+54 9 11 8877-1122',
    origin: 'Sucursal Pilar Centro',
    destination: 'Parque Industrial Pilar, Lote 4',
    status: 'En Viaje',
    driverName: 'Mariano Silva (Fiat Cronos AB456EF)',
    price: 14200,
    distanceKm: 18.5,
    durationMinutes: 25,
    serviceType: 'MU Urbana',
    paymentMethod: 'Cuenta Corriente',
    createdAt: Date.now() - 1000 * 60 * 20, // Hace 20 min
  },
  {
    id: 'TRIP-8844',
    passengerName: 'Lucía Benítez',
    passengerPhone: '+54 9 11 6655-4433',
    origin: 'Bodega Catena Zapata, Mendoza',
    destination: 'Hotel Park Hyatt Mendoza',
    status: 'Completado',
    driverName: 'Valeria Luna (Chevrolet Onix DC789GH)',
    price: 28000,
    distanceKm: 38.0,
    durationMinutes: 45,
    serviceType: 'ARC Rural',
    paymentMethod: 'Mercado Pago',
    createdAt: Date.now() - 1000 * 60 * 60 * 12, // Hace 12 hs
  },
  {
    id: 'TRIP-8845',
    passengerName: 'Esteban Morales',
    passengerPhone: '+54 9 11 9911-2233',
    origin: 'Av. Corrientes 1250, CABA',
    destination: 'Aeroparque Jorge Newbery (AEP)',
    status: 'Completado',
    driverName: 'Carlos Mamani (VW Gol AB123CD)',
    price: 12500,
    distanceKm: 9.4,
    durationMinutes: 22,
    serviceType: 'Transfer Aeropuerto',
    paymentMethod: 'Efectivo',
    createdAt: Date.now() - 1000 * 60 * 60 * 26, // Hace 1 dia
  },
  {
    id: 'TRIP-8846',
    passengerName: 'Sofía Martínez',
    passengerPhone: '+54 9 11 2233-4455',
    origin: 'Nordelta Centro Comercial',
    destination: 'San Isidro Labrador, Tigre',
    status: 'Completado',
    driverName: 'Jorge Ruiz (Toyota Corolla GH789IJ)',
    price: 16800,
    distanceKm: 14.1,
    durationMinutes: 28,
    serviceType: 'MU Urbana',
    paymentMethod: 'Mercado Pago',
    createdAt: Date.now() - 1000 * 60 * 60 * 30,
  }
];

// Opciones de campos para exportar a CSV/Excel
const EXPORT_FIELDS = [
  { key: 'id', label: 'ID de Viaje', default: true },
  { key: 'createdAt', label: 'Fecha y Hora', default: true },
  { key: 'passengerName', label: 'Nombre Pasajero', default: true },
  { key: 'passengerPhone', label: 'Teléfono Pasajero', default: false },
  { key: 'driverName', label: 'Conductor & Vehículo', default: true },
  { key: 'origin', label: 'Dirección Origen', default: true },
  { key: 'destination', label: 'Dirección Destino', default: true },
  { key: 'serviceType', label: 'Tipo de Servicio', default: true },
  { key: 'paymentMethod', label: 'Método de Pago', default: true },
  { key: 'distanceKm', label: 'Distancia (Km)', default: true },
  { key: 'durationMinutes', label: 'Duración (Min)', default: false },
  { key: 'status', label: 'Estado del Viaje', default: true },
  { key: 'price', label: 'Importe Total ($)', default: true },
];

export default function TravelCabHistoryPage() {
  const [trips, setTrips] = useState<ExtendedTrip[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuración de Empresa para Vouchers / Remitos
  const [companyConfig, setCompanyConfig] = useState<CompanyVoucherConfig>(DEFAULT_COMPANY_CONFIG);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Carga de configuración persistida
  useEffect(() => {
    const saved = localStorage.getItem('travelapp_voucher_company_config');
    if (saved) {
      try {
        setCompanyConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleSaveCompanyConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('travelapp_voucher_company_config', JSON.stringify(companyConfig));
    setShowCompanyModal(false);
  };

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [serviceFilter, setServiceFilter] = useState<string>('Todos');
  
  // Rango de fechas editable (Por defecto: últimos 30 días)
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Modales
  const [selectedTripForVoucher, setSelectedTripForVoucher] = useState<ExtendedTrip | null>(null);
  const [selectedTripDetail, setSelectedTripDetail] = useState<ExtendedTrip | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    EXPORT_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {})
  );

// Funciones auxiliares de normalización de datos
function parseTimestamp(val: any): number {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val.seconds !== undefined) return val.seconds * 1000;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

function normalizeStatus(status: any): ExtendedTrip['status'] {
  if (!status) return 'Completado';
  const s = String(status).toLowerCase().trim();
  if (s === 'completed' || s === 'completado' || s === 'finished') return 'Completado';
  if (s === 'in_progress' || s === 'en viaje' || s === 'arrived' || s === 'on_way' || s === 'en camino' || s === 'accepted') return 'En Viaje';
  if (s === 'searching' || s === 'buscando chofer' || s === 'pending') return 'Buscando Chofer';
  if (s === 'cancelled' || s === 'cancelado') return 'Cancelado';
  return 'Completado';
}

  // Sync real-time Firestore trips
  useEffect(() => {
    setLoading(true);
    const qTrips = collection(db, 'trips');
    const unsub = onSnapshot(qTrips, (snap) => {
      if (snap.empty) {
        setTrips(SEED_TRIPS);
        setLoading(false);
        return;
      }

      const docs = snap.docs.map(d => {
        const data = d.data();
        const rawCreatedAt = data.createdAt || data.completedAt || data.timestamp;
        const createdAtMs = parseTimestamp(rawCreatedAt);
        const driverDisplay = data.driverName 
          ? `${data.driverName}${data.vehiclePlate ? ` (${data.vehiclePlate})` : (data.driverVehicle ? ` (${data.driverVehicle})` : '')}`
          : (data.vehiclePlate ? `Vehículo ${data.vehiclePlate}` : undefined);

        return {
          id: d.id,
          passengerName: data.passengerName || data.userName || data.clientName || 'Pasajero a Bordo',
          passengerPhone: data.passengerPhone || data.userPhone || '',
          origin: data.origin || data.originAddress || 'Origen',
          destination: data.destination || data.destAddress || 'Destino',
          status: normalizeStatus(data.status),
          driverName: driverDisplay,
          price: Number(data.finalPrice ?? data.price ?? data.estimatedPrice ?? 0),
          scheduledTime: data.scheduledTime,
          originCoords: data.originCoords,
          destinationCoords: data.destinationCoords,
          distanceKm: Number(data.distanceKm ?? data.estimatedDistanceKm ?? data.distance ?? 0),
          durationMinutes: Number(data.durationMinutes ?? data.estimatedDurationMins ?? data.duration ?? 0),
          serviceType: data.serviceType || data.serviceCategory || 'MU Urbana',
          paymentMethod: data.paymentMethod || 'Efectivo',
          createdAt: createdAtMs,
        } as ExtendedTrip;
      });

      // Ordenar más recientes primero
      docs.sort((a, b) => b.createdAt - a.createdAt);
      setTrips(docs);
      setLoading(false);
    }, (err) => {
      console.warn('Error syncing trips from Firestore, using seed fallback:', err);
      setTrips(SEED_TRIPS);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Filtrado por fecha, búsqueda y estado
  const filteredTrips = useMemo(() => {
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    const endMs = new Date(endDate + 'T23:59:59').getTime();

    return trips.filter(t => {
      // Date filter
      const tripDate = typeof t.createdAt === 'number' ? t.createdAt : parseTimestamp(t.createdAt);
      if (tripDate < startMs || tripDate > endMs) return false;

      // Status filter
      if (statusFilter !== 'Todos' && t.status !== statusFilter) return false;

      // Service filter
      if (serviceFilter !== 'Todos' && !t.serviceType?.toLowerCase().includes(serviceFilter.toLowerCase())) return false;

      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchId = t.id.toLowerCase().includes(term);
        const matchPass = (t.passengerName || '').toLowerCase().includes(term);
        const matchDriver = (t.driverName || '').toLowerCase().includes(term);
        const matchOrig = (t.origin || '').toLowerCase().includes(term);
        const matchDest = (t.destination || '').toLowerCase().includes(term);
        return matchId || matchPass || matchDriver || matchOrig || matchDest;
      }

      return true;
    });
  }, [trips, startDate, endDate, statusFilter, serviceFilter, searchTerm]);

  // Métricas del Monitor en Vivo (Calculadas sobre los viajes filtrados)
  const metrics = useMemo(() => {
    const totalCount = filteredTrips.length;
    if (totalCount === 0) {
      return {
        totalRevenue: 0,
        avgDistance: 0,
        avgDuration: 0,
        avgTicket: 0,
        topOrigins: [],
        topDestinations: [],
      };
    }

    const totalRev = filteredTrips.reduce((acc, t) => acc + (t.price || 0), 0);
    const totalDist = filteredTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
    const totalDur = filteredTrips.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);

    // Zonas de Alta Demanda (Orígenes)
    const originCounts: Record<string, number> = {};
    const destCounts: Record<string, number> = {};

    filteredTrips.forEach(t => {
      const origKey = t.origin.split(',')[0].trim();
      const destKey = t.destination.split(',')[0].trim();
      originCounts[origKey] = (originCounts[origKey] || 0) + 1;
      destCounts[destKey] = (destCounts[destKey] || 0) + 1;
    });

    const topOrigins = Object.entries(originCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topDestinations = Object.entries(destCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalRevenue: totalRev,
      avgDistance: Number((totalDist / totalCount).toFixed(1)),
      avgDuration: Math.round(totalDur / totalCount),
      avgTicket: Math.round(totalRev / totalCount),
      topOrigins,
      topDestinations,
    };
  }, [filteredTrips]);

  // Función para exportar a CSV con los campos seleccionados
  const handleExportCSV = () => {
    const activeFields = EXPORT_FIELDS.filter(f => selectedFields[f.key]);
    if (activeFields.length === 0) {
      alert('Por favor selecciona al menos una columna para exportar.');
      return;
    }

    // Header
    const headers = activeFields.map(f => `"${f.label}"`).join(',');

    // Rows
    const rows = filteredTrips.map(t => {
      return activeFields.map(f => {
        let val: any = (t as any)[f.key];
        if (f.key === 'createdAt') {
          val = new Date(val || Date.now()).toLocaleString('es-AR');
        } else if (f.key === 'price') {
          val = `$${(val || 0).toLocaleString('es-AR')}`;
        } else if (val === undefined || val === null) {
          val = '-';
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Trazabilidad_TravelCab_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  // Función de impresión de Voucher individual
  const handlePrintVoucher = (trip: ExtendedTrip) => {
    setSelectedTripForVoucher(trip);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6 overflow-y-auto print:bg-white print:p-0">

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-tech-blue flex items-center gap-2">
            <Route className="h-7 w-7 text-vial-orange" />
            Trazabilidad & Reportes de Viajes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor logístico en vivo, auditoría de rutas, filtros avanzados y exportación personalizada.
          </p>
        </div>

        {/* Acciones de Exportación y Configuración */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCompanyModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
          >
            <Building2 className="h-4 w-4 text-tech-blue" />
            Configurar Empresa / Logo Voucher
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-700 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Reporte (CSV / Excel)
          </button>
        </div>
      </div>

      {/* Rango de Fechas Editable */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Calendar className="h-4 w-4 text-vial-orange" />
          <span>Filtro por Rango de Fechas:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
            <span className="text-[11px] text-slate-400">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
            <span className="text-[11px] text-slate-400">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
            />
          </div>

          {/* Accesos rápidos de rango */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setStartDate(new Date().toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                setStartDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Últimos 7d
            </button>
            <button
              onClick={() => {
                setStartDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Últimos 30d
            </button>
          </div>
        </div>
      </div>

      {/* MONITOR EN VIVO & MÉTRICAS DEL RANGO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 print:hidden">
        
        {/* Total Recaudado */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
            <span>Total Recaudado</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">
            ${metrics.totalRevenue.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {filteredTrips.length} viajes en el rango
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
            <span>Ticket Promedio</span>
            <TrendingUp className="h-4 w-4 text-tech-blue" />
          </div>
          <div className="text-xl font-black text-tech-blue">
            ${metrics.avgTicket.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Por viaje realizado
          </div>
        </div>

        {/* Distancia Promedio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
            <span>Promedio Distancia</span>
            <Navigation className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-800">
            {metrics.avgDistance} <span className="text-xs font-bold text-slate-400">Km</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Recorrido medio
          </div>
        </div>

        {/* Alta Demanda (Orígenes) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
            <span>Zonas Alta Demanda</span>
            <MapPin className="h-4 w-4 text-vial-orange" />
          </div>
          <div className="space-y-1 mt-1">
            {metrics.topOrigins.length > 0 ? (
              metrics.topOrigins.map(([orig, count], idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="truncate max-w-[110px] font-bold text-slate-700">{orig}</span>
                  <span className="font-extrabold text-vial-orange bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                    {count} v.
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400">Sin datos</span>
            )}
          </div>
        </div>

        {/* Destinos Frecuentes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
            <span>Destinos Top</span>
            <Activity className="h-4 w-4 text-purple-600" />
          </div>
          <div className="space-y-1 mt-1">
            {metrics.topDestinations.length > 0 ? (
              metrics.topDestinations.map(([dest, count], idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="truncate max-w-[110px] font-bold text-slate-700">{dest}</span>
                  <span className="font-extrabold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                    {count} v.
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400">Sin datos</span>
            )}
          </div>
        </div>

      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS SECUNDARIOS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        
        {/* Buscador de texto */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ID, Pasajero, Conductor, Origen o Destino..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-medium text-slate-700 outline-none focus:border-tech-blue focus:bg-white transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtros Dropdown */}
        <div className="flex items-center gap-3">
          
          {/* Tipo de Servicio */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">Servicio:</span>
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-700 text-xs outline-none cursor-pointer"
            >
              <option value="Todos">Todos</option>
              <option value="MU Urbana">MU Urbana</option>
              <option value="ARC Rural">ARC Rural</option>
              <option value="Transfer Aeropuerto">Transfer Aeropuerto</option>
            </select>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">Estado:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-700 text-xs outline-none cursor-pointer"
            >
              <option value="Todos">Todos</option>
              <option value="Completado">Completado</option>
              <option value="En Viaje">En Viaje</option>
              <option value="Buscando Chofer">Buscando Chofer</option>
            </select>
          </div>

        </div>
      </div>

      {/* TABLA DE TRAZABILIDAD COMPLETA DE VIAJES */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden print:hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Listado de Trazabilidad Logística</span>
            <span className="rounded-full bg-tech-blue/10 px-2 py-0.5 text-[11px] font-extrabold text-tech-blue">
              {filteredTrips.length} registrados
            </span>
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-vial-orange" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-black text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">ID / Hora</th>
                <th className="px-4 py-3">Pasajero</th>
                <th className="px-4 py-3">Ruta (Origen ➔ Destino)</th>
                <th className="px-4 py-3">Conductor & Vehículo</th>
                <th className="px-4 py-3">Servicio / Pago</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Importe</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs font-semibold">
                    No se encontraron viajes registrados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredTrips.map(trip => (
                  <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* ID / Hora */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-tech-blue text-xs">{trip.id}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(trip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                      </div>
                    </td>

                    {/* Pasajero */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{trip.passengerName}</div>
                      {trip.passengerPhone && (
                        <div className="text-[11px] text-slate-400">{trip.passengerPhone}</div>
                      )}
                    </td>

                    {/* Ruta */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-1 text-slate-700 font-medium truncate">
                        <MapPin className="h-3.5 w-3.5 text-vial-orange shrink-0" />
                        <span className="truncate">{trip.origin}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 truncate mt-0.5">
                        <Navigation className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">{trip.destination}</span>
                      </div>
                      {trip.distanceKm && (
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {trip.distanceKm} km · {trip.durationMinutes || 0} min
                        </div>
                      )}
                    </td>

                    {/* Conductor */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {trip.driverName ? (
                        <span className="font-bold text-slate-700">{trip.driverName}</span>
                      ) : (
                        <span className="italic text-slate-400 text-[11px]">Sin asignar aún</span>
                      )}
                    </td>

                    {/* Servicio / Pago */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-slate-700">{trip.serviceType || 'MU Urbana'}</div>
                      <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                        {trip.paymentMethod || 'Efectivo'}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        trip.status === 'Completado' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : trip.status === 'En Viaje' || trip.status === 'En Camino'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {trip.status === 'Completado' && <CheckCircle2 className="h-3 w-3" />}
                        {trip.status}
                      </span>
                    </td>

                    {/* Importe */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="font-black text-tech-blue text-sm">
                        ${(trip.price || 0).toLocaleString('es-AR')}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedTripDetail(trip)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                          title="Ver Ficha Completa"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrintVoucher(trip)}
                          className="p-1.5 rounded-lg border border-vial-orange/30 bg-vial-orange/10 text-vial-orange hover:bg-vial-orange/20 transition-colors"
                          title="Imprimir Voucher de Viaje"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CONFIGURACIÓN DE EMPRESA Y LOGO PARA VOUCHERS */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 print:hidden">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-tech-blue p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-300" />
                <h2 className="text-sm font-bold">Datos de Empresa & Logo para Vouchers</h2>
              </div>
              <button onClick={() => setShowCompanyModal(false)} className="text-white/70 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyConfig} className="p-6 space-y-4 text-xs">
              
              {/* Avisos de medida ideal */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                  <ImageIcon className="h-4 w-4 text-vial-orange" />
                  <span>Especificaciones de Imagen para Logo</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Medida ideal recomendada:</strong> <span className="font-mono text-tech-blue font-bold">240 x 80 px</span>.
                  <br />
                  Formato preferido: <strong>PNG transparente</strong> o JPG con fondo blanco de alta definición.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Comercial / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={companyConfig.companyName}
                  onChange={e => setCompanyConfig(p => ({ ...p, companyName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-tech-blue"
                  placeholder="Ej: TravelApp Argentina S.A."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CUIT / Identificación Fiscal *</label>
                  <input
                    type="text"
                    required
                    value={companyConfig.cuit}
                    onChange={e => setCompanyConfig(p => ({ ...p, cuit: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-tech-blue"
                    placeholder="Ej: 30-71882390-4"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={companyConfig.phone}
                    onChange={e => setCompanyConfig(p => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-tech-blue"
                    placeholder="Ej: +54 11 5234-8000"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección Fiscal / Sede Central</label>
                <input
                  type="text"
                  value={companyConfig.address}
                  onChange={e => setCompanyConfig(p => ({ ...p, address: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-tech-blue"
                  placeholder="Ej: Av. Del Libertador 2440, CABA"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email de Soporte / Atención</label>
                <input
                  type="email"
                  value={companyConfig.email}
                  onChange={e => setCompanyConfig(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-tech-blue"
                  placeholder="Ej: soporte@travelapp.ar"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  URL del Logo Personalizado (PNG / JPG)
                </label>
                <input
                  type="text"
                  value={companyConfig.logoUrl}
                  onChange={e => setCompanyConfig(p => ({ ...p, logoUrl: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-tech-blue"
                  placeholder="https://tudominio.com/logo.png"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Deja vacío para usar el isotipo oficial predeterminado de TravelApp.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Texto Legal de Pie de página</label>
                <textarea
                  rows={2}
                  value={companyConfig.footerText}
                  onChange={e => setCompanyConfig(p => ({ ...p, footerText: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-tech-blue"
                />
              </div>

              {/* Pie de modal */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-tech-blue px-4 py-2 text-xs font-bold text-white shadow hover:bg-tech-blue/90"
                >
                  Guardar Configuración
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURADOR DE CAMPOS PARA EXPORTACIÓN A EXCEL/CSV */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 print:hidden">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">Filtro de Campos para Exportación</h2>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Selecciona las columnas que deseas incluir en el archivo CSV / Excel. Se exportarán los <strong>{filteredTrips.length} viajes</strong> filtrados.
              </p>

              {/* Botones Seleccionar Todos / Ninguno */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const allTrue = EXPORT_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: true }), {});
                    setSelectedFields(allTrue);
                  }}
                  className="text-[11px] font-bold text-tech-blue hover:underline"
                >
                  Seleccionar Todos
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => {
                    const allFalse = EXPORT_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: false }), {});
                    setSelectedFields(allFalse);
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:underline"
                >
                  Deseleccionar Todos
                </button>
              </div>

              {/* Grid de Checkboxes */}
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                {EXPORT_FIELDS.map(field => (
                  <label
                    key={field.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      selectedFields[field.key]
                        ? 'border-emerald-500/40 bg-emerald-50/50 text-slate-800'
                        : 'border-slate-200 bg-slate-50/50 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedFields[field.key]}
                      onChange={e => setSelectedFields(prev => ({ ...prev, [field.key]: e.target.checked }))}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>

              {/* Pie con botón de descarga */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Descargar Excel / CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHA COMPLETA DE DETALLE */}
      {selectedTripDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 print:hidden">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-tech-blue p-5 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Ficha de Trazabilidad</span>
                <h2 className="text-lg font-black">{selectedTripDetail.id}</h2>
              </div>
              <button onClick={() => setSelectedTripDetail(null)} className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Pasajero</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedTripDetail.passengerName}</span>
                  <div className="text-slate-500">{selectedTripDetail.passengerPhone || 'Sin teléfono'}</div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Conductor Asignado</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedTripDetail.driverName || 'Sin asignar'}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-vial-orange shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Origen</span>
                    <span className="font-bold text-slate-800">{selectedTripDetail.origin}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2 border-t border-slate-200">
                  <Navigation className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Destino</span>
                    <span className="font-bold text-slate-800">{selectedTripDetail.destination}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Tipo Servicio</span>
                  <span className="font-extrabold text-tech-blue text-xs">{selectedTripDetail.serviceType || 'MU Urbana'}</span>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Distancia / Tiempo</span>
                  <span className="font-extrabold text-slate-700 text-xs">{selectedTripDetail.distanceKm || 0} km ({selectedTripDetail.durationMinutes || 0} min)</span>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Método Pago</span>
                  <span className="font-extrabold text-emerald-600 text-xs">{selectedTripDetail.paymentMethod || 'Efectivo'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Importe Total</span>
                  <span className="text-xl font-black text-tech-blue">${(selectedTripDetail.price || 0).toLocaleString('es-AR')}</span>
                </div>

                <button
                  onClick={() => {
                    const trip = selectedTripDetail;
                    setSelectedTripDetail(null);
                    handlePrintVoucher(trip);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-vial-orange px-4 py-2 text-xs font-black text-gray-950 hover:opacity-90 shadow"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Comprobante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLANTILLA DE IMPRESIÓN VOUCHER (DINÁMICA CON DATOS DE EMPRESA Y LOGO CONFIGURADOS) */}
      {selectedTripForVoucher && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 font-sans text-slate-900">
          <div className="max-w-2xl mx-auto border-2 border-slate-800 p-6 rounded-2xl space-y-6">
            
            {/* Membrete Dinámico con Logo de Empresa */}
            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4">
              <div>
                {companyConfig.logoUrl ? (
                  <img
                    src={companyConfig.logoUrl}
                    alt={companyConfig.companyName}
                    className="max-h-16 max-w-[240px] object-contain mb-1"
                  />
                ) : (
                  <h1 className="text-2xl font-black tracking-wider text-slate-900">
                    {companyConfig.companyName.toUpperCase()}
                  </h1>
                )}
                <p className="text-xs text-slate-600 font-bold">Voucher & Remito de Servicio Logístico</p>
                <p className="text-[10px] text-slate-500">{companyConfig.address} · Tel: {companyConfig.phone}</p>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-500">Comprobante Nº</span>
                <span className="text-lg font-black font-mono text-slate-900">{selectedTripForVoucher.id}</span>
                <div className="text-[10px] font-mono text-slate-500 mt-1">CUIT: {companyConfig.cuit}</div>
              </div>
            </div>

            {/* Fecha y Estado */}
            <div className="flex justify-between text-xs font-semibold bg-slate-100 p-3 rounded-lg">
              <div>Fecha de Emisión: <strong>{new Date(selectedTripForVoucher.createdAt).toLocaleString('es-AR')}</strong></div>
              <div>Estado: <strong className="uppercase">{selectedTripForVoucher.status}</strong></div>
            </div>

            {/* Pasajero y Conductor */}
            <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-4">
              <div>
                <span className="block text-slate-500 uppercase font-bold text-[10px]">Pasajero Solicitante</span>
                <strong className="text-sm">{selectedTripForVoucher.passengerName}</strong>
                <div className="text-slate-600">{selectedTripForVoucher.passengerPhone || 'Sin teléfono registrado'}</div>
              </div>

              <div>
                <span className="block text-slate-500 uppercase font-bold text-[10px]">Conductor / Unidad</span>
                <strong className="text-sm">{selectedTripForVoucher.driverName || 'Asignación de Sistema'}</strong>
              </div>
            </div>

            {/* Detalle de Ruta */}
            <div className="space-y-3 text-xs border-b border-slate-200 pb-4">
              <div>
                <span className="block text-slate-500 uppercase font-bold text-[10px]">Punto de Origen</span>
                <strong className="text-slate-800">{selectedTripForVoucher.origin}</strong>
              </div>

              <div>
                <span className="block text-slate-500 uppercase font-bold text-[10px]">Punto de Destino</span>
                <strong className="text-slate-800">{selectedTripForVoucher.destination}</strong>
              </div>
            </div>

            {/* Métricas y Valores */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded">
                <span className="block text-slate-500 text-[10px]">Modalidad</span>
                <strong>{selectedTripForVoucher.serviceType || 'MU Urbana'}</strong>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <span className="block text-slate-500 text-[10px]">Distancia Recorrida</span>
                <strong>{selectedTripForVoucher.distanceKm || 0} Km</strong>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <span className="block text-slate-500 text-[10px]">Método de Pago</span>
                <strong>{selectedTripForVoucher.paymentMethod || 'Efectivo'}</strong>
              </div>
            </div>

            {/* Total e Impuestos */}
            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-800">
              <div className="text-[11px] text-slate-500 max-w-xs leading-tight">
                <p><strong>{companyConfig.companyName}</strong> · CUIT: {companyConfig.cuit}</p>
                <p className="mt-1">{companyConfig.footerText}</p>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-500 uppercase">Tarifa Total Cobrada</span>
                <span className="text-2xl font-black text-slate-900">${(selectedTripForVoucher.price || 0).toLocaleString('es-AR')}</span>
              </div>
            </div>

            {/* Pie y Firma */}
            <div className="pt-8 flex justify-between items-end text-center text-[10px] text-slate-400">
              <div className="border-t border-slate-300 w-40 pt-1">Firma de Conformidad Pasajero</div>
              <div className="border-t border-slate-300 w-40 pt-1">Firma de Recepción Conductor</div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
