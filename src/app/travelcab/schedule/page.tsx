'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Car, Users, Plus, Search, Filter,
  Phone, MessageSquare, AlertTriangle, CheckCircle2, ChevronRight,
  Plane, MapPin, DollarSign, X, Check, Eye, UserCheck, RefreshCw,
  Compass, ArrowRight, ShieldCheck, Tag
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, addDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

interface ScheduledTrip {
  id: string;
  passengerId?: string;
  userName?: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  origin: string;
  destination: string;
  serviceCategory?: 'MU' | 'TRANSFER' | 'ARC';
  serviceType?: string;
  isScheduled?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledDateTime?: any;
  flightNumber?: string;
  luggageCount?: number;
  passengersCount?: number;
  estimatedPrice?: number;
  finalPrice?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status: 'searching' | 'accepted' | 'on_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  securityPin?: string;
  notes?: string;
  createdAt?: any;
}

export default function TravelCabSchedulePage() {
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'MU' | 'TRANSFER' | 'ARC'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [filterDate, setFilterDate] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modal para Asignar Chofer
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<ScheduledTrip | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // Modal para Crear Viaje Manual Programado
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    serviceCategory: 'MU' as 'MU' | 'TRANSFER' | 'ARC',
    passengerName: '',
    passengerPhone: '',
    passengerEmail: '',
    origin: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    flightNumber: '',
    luggageCount: 1,
    passengersCount: 1,
    estimatedPrice: '3500',
    paymentMethod: 'Efectivo',
    driverId: '',
    notes: '',
  });
  const [savingTrip, setSavingTrip] = useState(false);

  // 1. Escuchar Viajes en tiempo real
  useEffect(() => {
    const qTrips = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));
    const unsubTrips = onSnapshot(qTrips, (snapshot) => {
      const list: ScheduledTrip[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          origin: data.origin || 'Origen no especificado',
          destination: data.destination || 'Destino no especificado',
          status: data.status || 'searching',
        } as ScheduledTrip;
      });

      // Filtrar los que son programados o tienen fecha/hora de agenda
      const scheduledOnly = list.filter(t => 
        t.isScheduled === true || 
        Boolean(t.scheduledDate || t.scheduledTime || t.scheduledDateTime) ||
        t.serviceCategory === 'TRANSFER' ||
        t.serviceCategory === 'ARC'
      );

      setTrips(scheduledOnly);
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching scheduled trips:", err);
      setLoading(false);
    });

    // 2. Escuchar Conductores disponibles
    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      const driverList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDrivers(driverList);
    });

    return () => {
      unsubTrips();
      unsubDrivers();
    };
  }, []);

  // Formatear Fecha y Hora
  const formatTripDateTime = (trip: ScheduledTrip) => {
    if (trip.scheduledDate && trip.scheduledTime) {
      return `${trip.scheduledDate} · ${trip.scheduledTime} hs`;
    }
    if (trip.scheduledDateTime) {
      try {
        const d = trip.scheduledDateTime.toDate ? trip.scheduledDateTime.toDate() : new Date(trip.scheduledDateTime);
        return d.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
      } catch {
        return 'Horario a confirmar';
      }
    }
    return 'Programado para hoy';
  };

  // Asignar Chofer a Viaje
  const handleAssignDriver = async () => {
    if (!selectedTrip || !selectedDriverId) return;
    try {
      const driver = drivers.find(d => d.id === selectedDriverId);
      const driverName = driver?.name || driver?.displayName || 'Socio Conductor';
      const driverPhone = driver?.phone || '+5491100000000';
      const vehicleModel = driver?.activeVehicle?.brand || driver?.vehicleModel || 'Vehículo Habilitado';
      const vehiclePlate = driver?.activeVehicle?.plate || driver?.licensePlate || 'AF 123 JK';

      await updateDoc(doc(db, 'trips', selectedTrip.id), {
        driverId: selectedDriverId,
        driverName,
        driverPhone,
        vehicleModel,
        vehiclePlate,
        status: 'accepted',
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      setShowAssignModal(false);
      setSelectedTrip(null);
      setSelectedDriverId('');
    } catch (err) {
      console.error("Error assigning driver:", err);
      alert("Error al asignar conductor. Verificá tu conexión.");
    }
  };

  // Liberar a la Bolsa de Choferes
  const handleReleaseTripToPool = async (tripId: string) => {
    if (!confirm("¿Deseas liberar este viaje para que cualquier chofer disponible pueda tomarlo en su app?")) return;
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        driverId: null,
        driverName: null,
        driverPhone: null,
        vehicleModel: null,
        vehiclePlate: null,
        status: 'searching',
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      console.error("Error releasing trip:", e);
    }
  };

  // Crear Viaje Agendado Manual
  const handleCreateScheduledTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.origin || !createForm.destination || !createForm.passengerName) {
      alert("Completá los campos obligatorios (Origen, Destino y Nombre del Pasajero).");
      return;
    }

    setSavingTrip(true);
    try {
      const scheduledDateTimeStr = `${createForm.date}T${createForm.time}:00`;
      const assignedDriver = createForm.driverId ? drivers.find(d => d.id === createForm.driverId) : null;

      const newTripData: any = {
        isScheduled: true,
        serviceCategory: createForm.serviceCategory,
        passengerName: createForm.passengerName,
        userName: createForm.passengerName,
        passengerPhone: createForm.passengerPhone,
        passengerEmail: createForm.passengerEmail,
        origin: createForm.origin,
        destination: createForm.destination,
        scheduledDate: createForm.date,
        scheduledTime: createForm.time,
        scheduledDateTime: new Date(scheduledDateTimeStr),
        flightNumber: createForm.flightNumber || '',
        luggageCount: Number(createForm.luggageCount) || 0,
        passengersCount: Number(createForm.passengersCount) || 1,
        estimatedPrice: Number(createForm.estimatedPrice) || 3500,
        paymentMethod: createForm.paymentMethod,
        paymentStatus: 'pending',
        notes: createForm.notes,
        securityPin: String(Math.floor(1000 + Math.random() * 9000)),
        status: assignedDriver ? 'accepted' : 'searching',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (assignedDriver) {
        newTripData.driverId = assignedDriver.id;
        newTripData.driverName = assignedDriver.name || assignedDriver.displayName || 'Socio Conductor';
        newTripData.driverPhone = assignedDriver.phone || '+5491100000000';
        newTripData.vehicleModel = assignedDriver.activeVehicle?.brand || 'Vehículo Asignado';
        newTripData.vehiclePlate = assignedDriver.activeVehicle?.plate || 'AF 123 JK';
      }

      await addDoc(collection(db, 'trips'), newTripData);
      setShowCreateModal(false);
      setCreateForm({
        serviceCategory: 'MU',
        passengerName: '',
        passengerPhone: '',
        passengerEmail: '',
        origin: '',
        destination: '',
        date: new Date().toISOString().split('T')[0],
        time: '08:00',
        flightNumber: '',
        luggageCount: 1,
        passengersCount: 1,
        estimatedPrice: '3500',
        paymentMethod: 'Efectivo',
        driverId: '',
        notes: '',
      });
    } catch (err) {
      console.error("Error creating scheduled trip:", err);
      alert("Error al programar el viaje.");
    } finally {
      setSavingTrip(false);
    }
  };

  // Filtrado de Viajes
  const filteredTrips = trips.filter(t => {
    const text = `${t.passengerName || t.userName || ''} ${t.origin} ${t.destination} ${t.driverName || ''} ${t.flightNumber || ''}`.toLowerCase();
    if (searchTerm && !text.includes(searchTerm.toLowerCase())) return false;

    // Filtro Categoría
    const cat = t.serviceCategory || (t.serviceType?.toLowerCase().includes('transfer') ? 'TRANSFER' : 'MU');
    if (filterCategory !== 'ALL' && cat !== filterCategory) return false;

    // Filtro Estado
    if (filterStatus === 'UNASSIGNED' && (t.driverId || t.status === 'completed' || t.status === 'cancelled')) return false;
    if (filterStatus === 'ASSIGNED' && (!t.driverId || t.status === 'completed' || t.status === 'cancelled')) return false;
    if (filterStatus === 'ACTIVE' && (t.status !== 'on_way' && t.status !== 'arrived' && t.status !== 'in_progress')) return false;
    if (filterStatus === 'COMPLETED' && t.status !== 'completed') return false;

    return true;
  });

  // Estadísticas rápidas
  const totalCount = trips.length;
  const unassignedCount = trips.filter(t => !t.driverId && t.status !== 'completed' && t.status !== 'cancelled').length;
  const muCount = trips.filter(t => (t.serviceCategory === 'MU' || !t.serviceCategory) && t.status !== 'cancelled').length;
  const transferCount = trips.filter(t => t.serviceCategory === 'TRANSFER' && t.status !== 'cancelled').length;
  const arcCount = trips.filter(t => t.serviceCategory === 'ARC' && t.status !== 'cancelled').length;

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0a2a5b] flex items-center gap-2">
                Agenda de Traslados & Calendario
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  TravelCab Despacho
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Control y asignación de viajes programados urbanos, traslados al aeropuerto y media distancia
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r bg-[#0a2a5b] hover:bg-[#071f45] text-white font-black text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Programar Traslado Manual
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Programados</span>
            <Calendar className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-[#0a2a5b] mt-1.5">{totalCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300">⚠️ Sin Asignar (Bolsa)</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1.5">{unassignedCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300">🏙️ Movilidad Urbana</span>
            <Car className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-1.5">{muCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300">✈️ Transfers / Aeropuerto</span>
            <Plane className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-1.5">{transferCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">🛣️ Media Distancia (ARC)</span>
            <Compass className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1.5">{arcCount}</p>
        </div>
      </div>

      {/* Barra de Filtros y Control */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-white/80 border border-slate-200/90 p-3.5 rounded-2xl">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por pasajero, origen, destino, chofer o vuelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#0a2a5b] placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Botones de Filtro por Categoría */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          <button
            onClick={() => setFilterCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterCategory === 'ALL' ? 'bg-slate-700 text-[#0a2a5b]' : 'bg-slate-100 text-slate-600 hover:text-[#0a2a5b]'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterCategory('MU')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'MU' ? 'bg-blue-600 text-[#0a2a5b]' : 'bg-blue-50 text-blue-700 hover:bg-blue-950/50'
            }`}
          >
            🏙️ Movilidad Urbana
          </button>
          <button
            onClick={() => setFilterCategory('TRANSFER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'TRANSFER' ? 'bg-purple-600 text-[#0a2a5b]' : 'bg-purple-50 text-purple-700 hover:bg-purple-950/50'
            }`}
          >
            ✈️ Transfers
          </button>
          <button
            onClick={() => setFilterCategory('ARC')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'ARC' ? 'bg-amber-600 text-[#0a2a5b]' : 'bg-amber-50 text-amber-700 hover:bg-amber-950/50'
            }`}
          >
            🛣️ Media Distancia
          </button>
        </div>

        {/* Filtro Estado */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <select
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#0a2a5b] focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="ALL">Estado: Todos</option>
            <option value="UNASSIGNED">⚠️ Sin Asignar (Bolsa)</option>
            <option value="ASSIGNED">✅ Con Chofer Asignado</option>
            <option value="ACTIVE">🚗 En Curso / En Camino</option>
            <option value="COMPLETED">🏁 Completados</option>
          </select>
        </div>
      </div>

      {/* Lista de Viajes Agendados */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-xs font-bold uppercase tracking-widest">Cargando Agenda en tiempo real...</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-white/80 border border-slate-200/90 p-8">
          <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0a2a5b]">No hay traslados agendados con este filtro</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Los viajes programados desde la app de clientes o agendados manualmente aparecerán aquí organizados por horario.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
          >
            + Programar el Primer Traslado
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTrips.map(trip => {
            const isUnassigned = !trip.driverId && trip.status !== 'completed' && trip.status !== 'cancelled';
            const cat = trip.serviceCategory || (trip.serviceType?.toLowerCase().includes('transfer') ? 'TRANSFER' : 'MU');

            return (
              <div
                key={trip.id}
                className={`rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                  isUnassigned
                    ? 'bg-rose-950/20 border-rose-500/30 shadow-lg shadow-rose-950/20'
                    : 'bg-white/85 border-slate-200/90 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase ${
                        cat === 'TRANSFER'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : cat === 'ARC'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {cat === 'TRANSFER' ? '✈️ Transfer' : cat === 'ARC' ? '🛣️ Media Dist.' : '🏙️ Urbana (MU)'}
                      </span>

                      {trip.flightNumber && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-600">
                          Vuelo: {trip.flightNumber}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-400">
                        ${trip.estimatedPrice || trip.finalPrice || 0} ARS
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {trip.paymentMethod || 'Efectivo'}
                      </span>
                    </div>
                  </div>

                  {/* Horario de Agenda Destacado */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 mb-3.5">
                    <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-[11px] font-black text-amber-400 uppercase tracking-wide">
                        {formatTripDateTime(trip)}
                      </span>
                      {trip.securityPin && (
                        <span className="ml-2 text-[10px] font-bold text-slate-500">
                          PIN: <span className="text-[#0a2a5b]">{trip.securityPin}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ruta Origen ➡️ Destino */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Punto de Recogida</span>
                        <p className="text-xs font-semibold text-slate-700 line-clamp-1">{trip.origin}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Destino</span>
                        <p className="text-xs font-semibold text-slate-700 line-clamp-1">{trip.destination}</p>
                      </div>
                    </div>
                  </div>

                  {/* Datos del Pasajero */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Pasajero</span>
                      <p className="text-xs font-bold text-[#0a2a5b]">
                        {trip.passengerName || trip.userName || 'Pasajero TravelCab'}
                      </p>
                    </div>

                    {trip.passengerPhone && (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${trip.passengerPhone}`}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-600 hover:text-[#0a2a5b]"
                          title="Llamar"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${trip.passengerPhone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(trip.passengerName || 'Pasajero')}%2C%20nos%20comunicamos%20desde%20la%20central%20de%20TravelCab%20respecto%20a%20tu%20traslado%20programado.`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                          title="WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sección Chofer Asignado / Acción de Despacho */}
                <div className="border-t border-slate-200/80 pt-3 mt-1">
                  {isUnassigned ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                        Sin Chofer Asignado
                      </span>
                      <button
                        onClick={() => {
                          setSelectedTrip(trip);
                          setShowAssignModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all cursor-pointer"
                      >
                        Asignar Chofer
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                          {(trip.driverName || 'C')[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0a2a5b]">{trip.driverName}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {trip.vehicleModel} · {trip.vehiclePlate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setSelectedDriverId(trip.driverId || '');
                            setShowAssignModal(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-600"
                          title="Cambiar Chofer"
                        >
                          Reasignar
                        </button>
                        <button
                          onClick={() => handleReleaseTripToPool(trip.id)}
                          className="px-2 py-1 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 text-[10px] font-bold"
                          title="Liberar a Bolsa de Choferes"
                        >
                          Liberar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ASIGNAR CHOFER */}
      {showAssignModal && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0a2a5b]">Asignar Chofer al Traslado</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedTrip.origin} ➡️ {selectedTrip.destination}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTrip(null);
                }}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-[#0a2a5b]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-600 block">
                Seleccioná el Conductor de la Flota:
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {drivers.map(d => {
                  const isSelected = selectedDriverId === d.id;
                  const name = d.name || d.displayName || 'Conductor';
                  const vehicle = d.activeVehicle?.brand || d.vehicleModel || 'Vehículo';
                  const plate = d.activeVehicle?.plate || d.licensePlate || 'AF 123 JK';

                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDriverId(d.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-[#0a2a5b]'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-700 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-600'
                        }`}>
                          {name[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0a2a5b]">{name}</p>
                          <p className="text-[10px] text-slate-500">{vehicle} · {plate}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTrip(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-600 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedDriverId}
                onClick={handleAssignDriver}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Confirmar Asignación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROGRAMAR VIAJE MANUAL DESDE CENTRAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0a2a5b] flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  Programar Traslado Manual
                </h3>
                <p className="text-xs text-slate-500 font-medium">Despacho telefónico o corporativo agendado</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-[#0a2a5b]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScheduledTrip} className="space-y-4">
              {/* Tipo de Servicio */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Tipo de Servicio:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, serviceCategory: 'MU' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      createForm.serviceCategory === 'MU'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    🏙️ Urbana (MU)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, serviceCategory: 'TRANSFER' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      createForm.serviceCategory === 'TRANSFER'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    ✈️ Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, serviceCategory: 'ARC' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      createForm.serviceCategory === 'ARC'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    🛣️ Media Dist.
                  </button>
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Fecha de Recogida:</label>
                  <input
                    type="date"
                    required
                    value={createForm.date}
                    onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#0a2a5b] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Hora:</label>
                  <input
                    type="time"
                    required
                    value={createForm.time}
                    onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#0a2a5b] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Pasajero y Teléfono */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Nombre Pasajero:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Martín Gómez"
                    value={createForm.passengerName}
                    onChange={(e) => setCreateForm({ ...createForm, passengerName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#0a2a5b] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Teléfono / WhatsApp:</label>
                  <input
                    type="tel"
                    placeholder="+54 9 381 ..."
                    value={createForm.passengerPhone}
                    onChange={(e) => setCreateForm({ ...createForm, passengerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#0a2a5b] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Origen y Destino */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Origen (Dirección exacta):</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Hotel Hilton Garden Inn, Tucumán"
                    value={createForm.origin}
                    onChange={(e) => setCreateForm({ ...createForm, origin: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#0a2a5b] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Destino:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Aeropuerto Internacional Benjamín Matienzo (TUC)"
                    value={createForm.destination}
                    onChange={(e) => setCreateForm({ ...createForm, destination: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#0a2a5b] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Tarifa y Chofer Asignado Opcional */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Precio Pactado ($ ARS):</label>
                  <input
                    type="number"
                    value={createForm.estimatedPrice}
                    onChange={(e) => setCreateForm({ ...createForm, estimatedPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Asignar Chofer:</label>
                  <select
                    value={createForm.driverId}
                    onChange={(e) => setCreateForm({ ...createForm, driverId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#0a2a5b] focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Dejar en Bolsa Pública</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name || d.displayName || 'Conductor'} ({d.activeVehicle?.plate || 'S/P'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTrip}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r bg-[#0a2a5b] hover:bg-[#071f45] text-white font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {savingTrip ? 'Programando...' : 'Programar y Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
