'use client';

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CallRecord, CallAttentionStatus } from '@/types/messaging';
import {
  BUSINESS_UNITS_CONFIG,
  ALL_SECTORS_BY_UNIT,
  normalizeBusinessUnit,
} from '@/lib/permissions';
import {
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Volume2,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  UserCheck,
} from 'lucide-react';

const ATTENTION_STATUS_META: Record<
  CallAttentionStatus,
  { label: string; badgeClass: string }
> = {
  pendiente_atencion: {
    label: 'Pendiente Atención',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  pendiente_respuesta: {
    label: 'Pendiente Respuesta',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  en_curso: {
    label: 'En Curso',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  resuelta: {
    label: 'Resuelta',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function CallsPanel({
  calls,
  operatorName,
  onOpenConversation,
}: {
  calls: CallRecord[];
  operatorName: string;
  onOpenConversation: (conversationId?: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | CallAttentionStatus>('all');
  const [onlyRecordings, setOnlyRecordings] = useState(false);
  const [search, setSearch] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const filteredCalls = calls.filter((c) => {
    if (statusFilter !== 'all' && c.attentionStatus !== statusFilter) return false;
    if (onlyRecordings && !c.recordingUrl) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchPhone = (c.callerPhone || '').toLowerCase().includes(q);
      const matchName = (c.callerName || '').toLowerCase().includes(q);
      const matchNotes = (c.notes || '').toLowerCase().includes(q);
      if (!matchPhone && !matchName && !matchNotes) return false;
    }
    return true;
  });

  const handleUpdateCall = async (callId: string, patch: Partial<CallRecord>) => {
    setSavingId(callId);
    try {
      await updateDoc(doc(db, 'calls', callId), {
        ...patch,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Error actualizando llamada:', err);
    } finally {
      setSavingId(null);
    }
  };

  const pendingCount = calls.filter(
    (c) => c.attentionStatus === 'pendiente_atencion' || c.attentionStatus === 'pendiente_respuesta'
  ).length;
  const recordingsCount = calls.filter((c) => Boolean(c.recordingUrl)).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden">
      {/* Header & Filters */}
      <div className="bg-white border-b border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-tech-blue" />
              Llamadas y Grabaciones (Anura)
            </h2>
            <p className="text-xs text-slate-500">
              {pendingCount} pendientes de atención/respuesta • {recordingsCount} con grabación
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar teléfono, nombre o nota..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-tech-blue w-56"
              />
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyRecordings}
                onChange={(e) => setOnlyRecordings(e.target.checked)}
                className="rounded border-slate-300 text-tech-blue"
              />
              Solo con grabación
            </label>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: `Todas (${calls.length})` },
            { id: 'pendiente_atencion', label: '🔴 Pendiente Atención' },
            { id: 'pendiente_respuesta', label: '🟡 Pendiente Respuesta' },
            { id: 'en_curso', label: '🔵 En Curso' },
            { id: 'resuelta', label: '🟢 Resueltas' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.id
                  ? 'bg-tech-blue text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calls List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
            <AlertCircle className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-500">Sin llamadas registradas para este filtro</p>
            <p className="text-xs mt-1 max-w-sm">
              Cuando Anura envíe eventos de llamadas o grabaciones, aparecerán aquí filtradas por tu Unidad de Negocio y Sector.
            </p>
          </div>
        ) : (
          filteredCalls.map((call) => {
            const statusMeta = ATTENTION_STATUS_META[call.attentionStatus] || ATTENTION_STATUS_META.pendiente_atencion;
            const officialUnit = normalizeBusinessUnit(call.businessUnit);
            const currentNote = notesDraft[call.id] !== undefined ? notesDraft[call.id] : (call.notes || '');

            return (
              <div
                key={call.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        call.direction === 'outbound'
                          ? 'bg-sky-50 text-sky-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {call.direction === 'outbound' ? (
                        <PhoneOutgoing className="h-5 w-5" />
                      ) : (
                        <PhoneIncoming className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">{call.callerName}</h3>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                        {call.isOutOfHours && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            🌙 Fuera de horario
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="font-mono">{call.callerPhone}</span>
                        <span>• Estado PBX: <strong>{call.callStatus}</strong></span>
                        {call.extension && <span>• Interno: <strong>{call.extension}</strong></span>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDuration(call.durationSeconds)}
                        </span>
                        <span>• {new Date(call.createdAt).toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {call.conversationId && (
                      <button
                        onClick={() => onOpenConversation(call.conversationId)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Ir al Chat
                      </button>
                    )}
                    {call.attentionStatus !== 'resuelta' && (
                      <button
                        onClick={() =>
                          handleUpdateCall(call.id, {
                            attentionStatus: 'resuelta',
                            assignedOperatorName: operatorName,
                          })
                        }
                        disabled={savingId === call.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-tech-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-tech-blue/90 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Marcar Resuelta
                      </button>
                    )}
                  </div>
                </div>

                {/* Audio Recording Player */}
                {call.recordingUrl ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 flex-shrink-0">
                      <Volume2 className="h-4 w-4 text-tech-blue" /> Grabación:
                    </span>
                    <audio controls preload="none" src={call.recordingUrl} className="w-full h-8" />
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    Sin archivo de grabación adjunto para esta llamada.
                  </div>
                )}

                {/* Controls: Status, Unit, Sector, Notes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Estado de Seguimiento</label>
                    <select
                      value={call.attentionStatus}
                      onChange={(e) =>
                        handleUpdateCall(call.id, {
                          attentionStatus: e.target.value as CallAttentionStatus,
                          assignedOperatorName: operatorName,
                        })
                      }
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
                    >
                      <option value="pendiente_atencion">Pendiente de Atención</option>
                      <option value="pendiente_respuesta">Pendiente de Respuesta</option>
                      <option value="en_curso">En Curso</option>
                      <option value="resuelta">Resuelta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unidad de Negocio</label>
                    <select
                      value={officialUnit}
                      onChange={(e) =>
                        handleUpdateCall(call.id, {
                          businessUnit: e.target.value as any,
                          sector: '',
                        })
                      }
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
                    >
                      {BUSINESS_UNITS_CONFIG.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sector / Área</label>
                    <select
                      value={call.sector || ''}
                      onChange={(e) => handleUpdateCall(call.id, { sector: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
                    >
                      <option value="">Sin sector</option>
                      {(ALL_SECTORS_BY_UNIT[officialUnit] || []).map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Operator Notes */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={currentNote}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({ ...prev, [call.id]: e.target.value }))
                    }
                    placeholder="Agregar nota sobre la llamada o grabación..."
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:border-tech-blue"
                  />
                  <button
                    onClick={() =>
                      handleUpdateCall(call.id, {
                        notes: currentNote,
                        assignedOperatorName: operatorName,
                      })
                    }
                    disabled={savingId === call.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Save className="h-3.5 w-3.5" /> Guardar Nota
                  </button>
                </div>

                {call.assignedOperatorName && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <UserCheck className="h-3 w-3" /> Última gestión por: <strong>{call.assignedOperatorName}</strong>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
