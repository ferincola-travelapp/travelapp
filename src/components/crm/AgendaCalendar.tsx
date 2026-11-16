"use client";

import React, { useState, useEffect } from 'react';
import {
  Video,
  Clock,
  Phone,
  UserCheck,
  Plus,
  Calendar as CalendarIcon,
  X,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Shield,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CalendarEvent, CalendarEventType, CalendarEventStatus, Unit } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAccessRecord,
  isSuperAdmin,
  getUserScopeLabel,
  BUSINESS_UNITS_CONFIG,
  ALL_SECTORS_BY_UNIT,
  OfficialBusinessUnit,
  normalizeBusinessUnit,
} from '@/lib/permissions';

const timeSlots = [
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

const EVENT_TYPE_META: Record<
  CalendarEventType,
  { label: string; color: string; bg: string; text: string; icon: React.ReactNode }
> = {
  Entrevista: {
    label: 'Entrevista',
    color: 'bg-purple-500',
    bg: 'bg-purple-50 border-purple-200',
    text: 'text-purple-700',
    icon: <UserCheck className="h-3.5 w-3.5" />,
  },
  Llamada: {
    label: 'Llamada',
    color: 'bg-emerald-500',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: <Phone className="h-3.5 w-3.5" />,
  },
  Videollamada: {
    label: 'Videollamada',
    color: 'bg-tech-blue',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    icon: <Video className="h-3.5 w-3.5" />,
  },
};

function getTodayISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const AgendaCalendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [typeFilter, setTypeFilter] = useState<'all' | CalendarEventType>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const defaultUnit: OfficialBusinessUnit = isSuperAdmin(user)
    ? 'TravelApp'
    : (user?.allowedUnits?.[0] || 'TravelApp');

  const [form, setForm] = useState({
    title: '',
    eventType: 'Entrevista' as CalendarEventType,
    date: getTodayISO(),
    time: '10:00 AM',
    duration: '30 min',
    businessUnit: defaultUnit as OfficialBusinessUnit,
    sector: '',
    phone: '',
    meetingLink: '',
    notes: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'calendar_events'), orderBy('date', 'asc'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedEvents: CalendarEvent[] = [];
        snapshot.forEach((docSnap) => {
          fetchedEvents.push({ id: docSnap.id, ...docSnap.data() } as CalendarEvent);
        });
        setEvents(fetchedEvents);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching calendar events:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtrado por permisos de Unidad y Sector (Super Admin ve todo)
  const authorizedEvents = events.filter((e) =>
    canAccessRecord(user, e.businessUnit, e.sector)
  );

  const visibleEvents = authorizedEvents.filter((e) => {
    const resolvedType: CalendarEventType =
      e.eventType ||
      (e.type?.toLowerCase().includes('llamada')
        ? 'Llamada'
        : e.type?.toLowerCase().includes('entrevista')
        ? 'Entrevista'
        : 'Videollamada');
    if (typeFilter !== 'all' && resolvedType !== typeFilter) return false;
    return true;
  });

  const dayEvents = visibleEvents.filter((e) => e.date === selectedDate);

  const availableUnits = isSuperAdmin(user)
    ? BUSINESS_UNITS_CONFIG
    : BUSINESS_UNITS_CONFIG.filter((u) =>
        (user?.allowedUnits || []).some((au) => normalizeBusinessUnit(au) === u.id)
      );

  const openNewModal = (presetTime?: string) => {
    setForm({
      title: '',
      eventType: 'Entrevista',
      date: selectedDate,
      time: presetTime || '10:00 AM',
      duration: '30 min',
      businessUnit: availableUnits[0]?.id || 'TravelApp',
      sector: user?.allowedSectors?.[0] || '',
      phone: '',
      meetingLink: '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const meta = EVENT_TYPE_META[form.eventType];
      await addDoc(collection(db, 'calendar_events'), {
        title: form.title.trim(),
        eventType: form.eventType,
        type: form.eventType,
        status: 'Programada' as CalendarEventStatus,
        date: form.date,
        time: form.time,
        duration: form.duration,
        color: meta.color,
        businessUnit: form.businessUnit as Unit,
        sector: form.sector || '',
        phone: form.phone.trim(),
        meetingLink: form.meetingLink.trim(),
        notes: form.notes.trim(),
        assignedTo: user?.displayName || user?.email || 'Operador',
        createdAt: Date.now(),
      });
      setShowModal(false);
    } catch (err) {
      console.error('Error creando evento:', err);
      alert('No se pudo guardar la cita.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (eventId: string, status: CalendarEventStatus) => {
    try {
      await updateDoc(doc(db, 'calendar_events', eventId), { status });
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('¿Eliminar esta cita de la agenda?')) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', eventId));
    } catch (err) {
      console.error('Error eliminando evento:', err);
    }
  };

  const getEventStyle = (event: CalendarEvent) => {
    const resolvedType: CalendarEventType =
      event.eventType ||
      (event.type?.toLowerCase().includes('llamada')
        ? 'Llamada'
        : event.type?.toLowerCase().includes('entrevista')
        ? 'Entrevista'
        : 'Videollamada');
    return EVENT_TYPE_META[resolvedType] || EVENT_TYPE_META.Videollamada;
  };

  return (
    <div className="space-y-4">
      {/* Scope & Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-center gap-2 text-xs">
          <Shield className={`h-4 w-4 ${isSuperAdmin(user) ? 'text-purple-600' : 'text-tech-blue'}`} />
          <span className="font-semibold text-slate-700">{getUserScopeLabel(user)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'Entrevista', label: '👤 Entrevistas' },
            { id: 'Llamada', label: '📞 Llamadas' },
            { id: 'Videollamada', label: '🎥 Videollamadas' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                typeFilter === t.id
                  ? 'bg-tech-blue text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}

          <button
            onClick={() => openNewModal()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-tech-blue px-3.5 py-1.5 text-xs font-bold text-white hover:bg-tech-blue/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva Cita
          </button>
        </div>
      </div>

      <div className="flex h-full flex-col lg:flex-row gap-6">
        {/* Columna Izquierda: Selector de Fecha y Próximas Citas */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="font-semibold text-tech-blue flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Fecha Seleccionada
            </h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
            />
            <p className="text-xs text-slate-500">
              Agenda sincronizada en tiempo real con Firestore. Podés agendar entrevistas, llamadas o videollamadas por unidad y sector.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 flex-1 overflow-y-auto custom-scrollbar max-h-[520px]">
            <h3 className="font-semibold text-tech-blue mb-4">
              Próximas Citas ({visibleEvents.length})
            </h3>
            {loading ? (
              <p className="text-sm text-slate-500">Cargando eventos...</p>
            ) : visibleEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No hay citas programadas para tu área.</p>
            ) : (
              <div className="space-y-3">
                {visibleEvents.map((event) => {
                  const style = getEventStyle(event);
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedDate(event.date)}
                      className="flex items-start space-x-3 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer hover:border-tech-blue/40 transition-colors"
                    >
                      <div className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${style.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-tech-blue truncate">{event.title}</p>
                        <div className="mt-1 flex flex-wrap items-center text-xs text-slate-500 gap-2">
                          <span>{event.date}</span>
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" /> {event.time}
                          </span>
                          <span className="flex items-center gap-1">
                            {style.icon} {style.label}
                          </span>
                        </div>
                        {(event.businessUnit || event.sector) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {event.businessUnit && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                                {event.businessUnit}
                              </span>
                            )}
                            {event.sector && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                                {event.sector}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Grilla de Horarios o Lista Semanal */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 overflow-y-auto custom-scrollbar h-[calc(100vh-14rem)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-tech-blue">
                {viewMode === 'day' ? `Agenda del ${selectedDate}` : 'Todas las Citas Programadas'}
              </h2>
              <p className="text-xs text-slate-400">
                Hacé clic en un horario libre para agendar una nueva entrevista, llamada o videollamada.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('day')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'day'
                    ? 'border border-slate-300 bg-slate-100 text-slate-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Día
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'week'
                    ? 'border border-slate-300 bg-slate-100 text-slate-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Listado
              </button>
            </div>
          </div>

          {viewMode === 'day' ? (
            <div className="relative">
              {timeSlots.map((slot) => {
                const slotEvents = dayEvents.filter((e) => e.time === slot);
                return (
                  <div key={slot} className="flex group min-h-[84px]">
                    <div className="w-20 pr-4 text-right text-xs font-medium text-slate-500 pt-2">
                      {slot}
                    </div>
                    <div
                      onClick={() => {
                        if (slotEvents.length === 0) openNewModal(slot);
                      }}
                      className={`flex-1 border-t border-slate-200 p-2 space-y-2 transition-colors ${
                        slotEvents.length === 0
                          ? 'cursor-pointer hover:bg-slate-50'
                          : ''
                      }`}
                    >
                      {slotEvents.map((event) => {
                        const style = getEventStyle(event);
                        return (
                          <div
                            key={event.id}
                            className={`rounded-lg ${style.bg} border p-3 shadow-xs flex flex-wrap items-center justify-between gap-2`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold ${style.text}`}>{event.title}</p>
                                {event.status && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 font-semibold text-slate-600">
                                    {event.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1">
                                  {style.icon} {style.label}
                                </span>
                                <span>• {event.duration}</span>
                                {event.phone && <span>• 📞 {event.phone}</span>}
                                {event.businessUnit && <span>• {event.businessUnit}</span>}
                                {event.sector && <span>({event.sector})</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {event.meetingLink && (
                                <a
                                  href={event.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-xs font-semibold text-tech-blue hover:bg-slate-50"
                                >
                                  <ExternalLink className="h-3 w-3" /> Unirse
                                </a>
                              )}
                              {event.id && event.status !== 'Completada' && (
                                <button
                                  onClick={() => handleStatusChange(event.id!, 'Completada')}
                                  className="inline-flex items-center gap-1 rounded-md bg-white border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 className="h-3 w-3" /> Completar
                                </button>
                              )}
                              {event.id && (
                                <button
                                  onClick={() => handleDeleteEvent(event.id!)}
                                  className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-white"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleEvents.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sin citas registradas.</p>
              ) : (
                visibleEvents.map((event) => {
                  const style = getEventStyle(event);
                  return (
                    <div
                      key={event.id}
                      className={`rounded-xl ${style.bg} border p-4 flex flex-wrap items-center justify-between gap-3`}
                    >
                      <div>
                        <p className={`text-sm font-bold ${style.text}`}>{event.title}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {event.date} • {event.time} ({event.duration}) • {style.label}
                          {event.businessUnit ? ` • ${event.businessUnit}` : ''}
                          {event.sector ? ` (${event.sector})` : ''}
                        </p>
                        {event.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">{event.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
                          {event.status || 'Programada'}
                        </span>
                        {event.id && (
                          <button
                            onClick={() => handleDeleteEvent(event.id!)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Cita */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 p-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Agendar Entrevista / Llamada / Videollamada</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Título / Motivo *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ej: Entrevista Chofer - Juan Pérez"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-tech-blue"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['Entrevista', 'Llamada', 'Videollamada'] as CalendarEventType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, eventType: t }))}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition-all ${
                      form.eventType === t
                        ? 'border-tech-blue bg-tech-blue/10 text-tech-blue'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {EVENT_TYPE_META[t].icon} {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-tech-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Horario</label>
                  <select
                    value={form.time}
                    onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs bg-white outline-none focus:border-tech-blue"
                  >
                    {timeSlots.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Duración</label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs bg-white outline-none focus:border-tech-blue"
                  >
                    <option value="15 min">15 min</option>
                    <option value="30 min">30 min</option>
                    <option value="45 min">45 min</option>
                    <option value="60 min">60 min</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Unidad de Negocio</label>
                  <select
                    value={form.businessUnit}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        businessUnit: e.target.value as OfficialBusinessUnit,
                        sector: '',
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs bg-white outline-none focus:border-tech-blue"
                  >
                    {(availableUnits.length > 0 ? availableUnits : BUSINESS_UNITS_CONFIG).map((u) => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Sector / Área</label>
                  <select
                    value={form.sector}
                    onChange={(e) => setForm((p) => ({ ...p, sector: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs bg-white outline-none focus:border-tech-blue"
                  >
                    <option value="">Sin sector</option>
                    {(ALL_SECTORS_BY_UNIT[form.businessUnit] || []).map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono (opcional)</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+54 9 381..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-tech-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Link Videollamada (opcional)</label>
                  <input
                    type="url"
                    value={form.meetingLink}
                    onChange={(e) => setForm((p) => ({ ...p, meetingLink: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-tech-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Notas</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Detalles previos a la cita..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-tech-blue resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-tech-blue px-4 py-2 text-xs font-bold text-white hover:bg-tech-blue/90 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
