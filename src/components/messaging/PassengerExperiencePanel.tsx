'use client';

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DEFAULT_PASSENGER_EXPERIENCE_CONFIG,
  ExperienceRecipientTarget,
  PassengerExperienceConfig,
} from '@/types/messaging';
import {
  Bell,
  Car,
  Check,
  Clock,
  Gift,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Star,
} from 'lucide-react';

function VariableChips({
  vars,
  onInsert,
}: {
  vars: string[];
  onInsert: (token: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      <span className="text-[10px] text-slate-400 font-semibold mr-1">Insertar variable:</span>
      {vars.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(v)}
          className="px-2 py-0.5 rounded-full bg-tech-blue/10 text-tech-blue text-[10px] font-bold hover:bg-tech-blue/20 transition-colors"
        >
          + {v}
        </button>
      ))}
    </div>
  );
}

function TogglePill({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
        checked
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          : 'bg-slate-100 text-slate-500 border border-slate-200'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${checked ? 'bg-emerald-500' : 'bg-slate-400'}`}
      />
      {label ? label : checked ? 'Activo' : 'Pausado'}
    </button>
  );
}

export function PassengerExperiencePanel() {
  const [config, setConfig] = useState<PassengerExperienceConfig>(
    DEFAULT_PASSENGER_EXPERIENCE_CONFIG
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system_config', 'passenger_experience'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PassengerExperienceConfig>;
          setConfig({
            welcomePopup: {
              ...DEFAULT_PASSENGER_EXPERIENCE_CONFIG.welcomePopup,
              ...(data.welcomePopup || {}),
            },
            searchingModal: {
              ...DEFAULT_PASSENGER_EXPERIENCE_CONFIG.searchingModal,
              ...(data.searchingModal || {}),
            },
            driverAssignedModal: {
              ...DEFAULT_PASSENGER_EXPERIENCE_CONFIG.driverAssignedModal,
              ...(data.driverAssignedModal || {}),
            },
            arrivingSoonAlert: {
              ...DEFAULT_PASSENGER_EXPERIENCE_CONFIG.arrivingSoonAlert,
              ...(data.arrivingSoonAlert || {}),
            },
            routeDeviationProtocol: {
              ...DEFAULT_PASSENGER_EXPERIENCE_CONFIG.routeDeviationProtocol,
              ...(data.routeDeviationProtocol || {}),
            },
            tripCompletedRating: {
              ...DEFAULT_PASSENGER_EXPERIENCE_CONFIG.tripCompletedRating,
              ...(data.tripCompletedRating || {}),
            },
          });
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'system_config', 'passenger_experience'),
        { ...config, updatedAt: Date.now() },
        { merge: true }
      );
      // Mantener sincronizado el bono por foto con rewards_config/global
      await setDoc(
        doc(db, 'rewards_config', 'global'),
        { profilePhotoBonusPoints: Number(config.welcomePopup.bonusPoints || 0) },
        { merge: true }
      );
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
        Cargando configuración de experiencia...
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-800 text-base">
            Experiencia Automática del Pasajero (App Cliente)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Editá en tiempo real textos, tiempos, distancias y destinatarios sin recompilar la app.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-tech-blue text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {savedToast ? (
            <>
              <Check className="h-4 w-4" /> ¡Cambios Guardados!
            </>
          ) : saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Guardar Toda la Configuración
            </>
          )}
        </button>
      </div>

      {/* 1. Bienvenida primer login */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-amber-500" />
            <h4 className="font-bold text-sm text-slate-800">
              1. Push-Pop de Bienvenida (Primer Login + Foto = Puntos)
            </h4>
          </div>
          <TogglePill
            checked={config.welcomePopup.enabled}
            onChange={(v) =>
              setConfig({ ...config, welcomePopup: { ...config.welcomePopup, enabled: v } })
            }
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Título</label>
            <input
              value={config.welcomePopup.title}
              onChange={(e) =>
                setConfig({ ...config, welcomePopup: { ...config.welcomePopup, title: e.target.value } })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Puntos extras por subir foto
            </label>
            <input
              type="number"
              min={0}
              value={config.welcomePopup.bonusPoints}
              onChange={(e) =>
                setConfig({
                  ...config,
                  welcomePopup: { ...config.welcomePopup, bonusPoints: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold text-amber-700"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Mensaje</label>
          <textarea
            rows={2}
            value={config.welcomePopup.message}
            onChange={(e) =>
              setConfig({ ...config, welcomePopup: { ...config.welcomePopup, message: e.target.value } })
            }
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg resize-none"
          />
          <VariableChips
            vars={['{puntos}']}
            onInsert={(v) =>
              setConfig({
                ...config,
                welcomePopup: {
                  ...config.welcomePopup,
                  message: `${config.welcomePopup.message} ${v}`.trim(),
                },
              })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Botón principal</label>
            <input
              value={config.welcomePopup.ctaText}
              onChange={(e) =>
                setConfig({ ...config, welcomePopup: { ...config.welcomePopup, ctaText: e.target.value } })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Botón omitir</label>
            <input
              value={config.welcomePopup.skipText}
              onChange={(e) =>
                setConfig({ ...config, welcomePopup: { ...config.welcomePopup, skipText: e.target.value } })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 2. Modal de Búsqueda + Bloqueo de Mapa */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-tech-blue" />
            <h4 className="font-bold text-sm text-slate-800">
              2. Modal de Búsqueda de Conductor (Bloquea mapa al pedir)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <TogglePill
              checked={config.searchingModal.lockMapInteraction}
              label={config.searchingModal.lockMapInteraction ? 'Mapa bloqueado' : 'Mapa libre'}
              onChange={(v) =>
                setConfig({
                  ...config,
                  searchingModal: { ...config.searchingModal, lockMapInteraction: v },
                })
              }
            />
            <TogglePill
              checked={config.searchingModal.enabled}
              onChange={(v) =>
                setConfig({ ...config, searchingModal: { ...config.searchingModal, enabled: v } })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Título</label>
            <input
              value={config.searchingModal.title}
              onChange={(e) =>
                setConfig({ ...config, searchingModal: { ...config.searchingModal, title: e.target.value } })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Botón cancelar</label>
            <input
              value={config.searchingModal.cancelText}
              onChange={(e) =>
                setConfig({
                  ...config,
                  searchingModal: { ...config.searchingModal, cancelText: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Descripción</label>
          <input
            value={config.searchingModal.description}
            onChange={(e) =>
              setConfig({
                ...config,
                searchingModal: { ...config.searchingModal, description: e.target.value },
              })
            }
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* 3. Modal Conductor Asignado */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-emerald-600" />
            <h4 className="font-bold text-sm text-slate-800">
              3. Modal al Aceptar Viaje (Foto Auto, Patente Parcial, Marca/Modelo/Color, Viajes y Estrellas)
            </h4>
          </div>
          <TogglePill
            checked={config.driverAssignedModal.enabled}
            onChange={(v) =>
              setConfig({
                ...config,
                driverAssignedModal: { ...config.driverAssignedModal, enabled: v },
              })
            }
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Título</label>
            <input
              value={config.driverAssignedModal.title}
              onChange={(e) =>
                setConfig({
                  ...config,
                  driverAssignedModal: { ...config.driverAssignedModal, title: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Subtítulo</label>
            <input
              value={config.driverAssignedModal.subtitle}
              onChange={(e) =>
                setConfig({
                  ...config,
                  driverAssignedModal: { ...config.driverAssignedModal, subtitle: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Últimos dígitos visibles de patente
            </label>
            <input
              type="number"
              min={2}
              max={6}
              value={config.driverAssignedModal.maskPlateVisibleLastChars}
              onChange={(e) =>
                setConfig({
                  ...config,
                  driverAssignedModal: {
                    ...config.driverAssignedModal,
                    maskPlateVisibleLastChars: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold"
            />
          </div>
        </div>
      </div>

      {/* 4. Aviso Próximo a la Llegada */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600" />
            <h4 className="font-bold text-sm text-slate-800">
              4. Aviso Automático Próximo a la Llegada (Cronómetro Editable)
            </h4>
          </div>
          <TogglePill
            checked={config.arrivingSoonAlert.enabled}
            onChange={(v) =>
              setConfig({
                ...config,
                arrivingSoonAlert: { ...config.arrivingSoonAlert, enabled: v },
              })
            }
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Disparar cuando falten (minutos)
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={config.arrivingSoonAlert.minutesBefore}
              onChange={(e) =>
                setConfig({
                  ...config,
                  arrivingSoonAlert: {
                    ...config.arrivingSoonAlert,
                    minutesBefore: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold text-sky-700"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Destinatario</label>
            <select
              value={config.arrivingSoonAlert.recipients}
              onChange={(e) =>
                setConfig({
                  ...config,
                  arrivingSoonAlert: {
                    ...config.arrivingSoonAlert,
                    recipients: e.target.value as ExperienceRecipientTarget,
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="passenger">Solo Pasajero</option>
              <option value="driver">Solo Conductor</option>
              <option value="both">Ambos</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Título</label>
            <input
              value={config.arrivingSoonAlert.title}
              onChange={(e) =>
                setConfig({
                  ...config,
                  arrivingSoonAlert: { ...config.arrivingSoonAlert, title: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Texto del aviso</label>
          <textarea
            rows={2}
            value={config.arrivingSoonAlert.message}
            onChange={(e) =>
              setConfig({
                ...config,
                arrivingSoonAlert: { ...config.arrivingSoonAlert, message: e.target.value },
              })
            }
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg resize-none"
          />
          <VariableChips
            vars={['{nombre}', '{conductor}', '{vehiculo}', '{eta}']}
            onInsert={(v) =>
              setConfig({
                ...config,
                arrivingSoonAlert: {
                  ...config.arrivingSoonAlert,
                  message: `${config.arrivingSoonAlert.message} ${v}`.trim(),
                },
              })
            }
          />
        </div>
      </div>

      {/* 5. Protocolo de Desvío de Recorrido */}
      <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <h4 className="font-bold text-sm text-rose-900">
              5. Protocolo de Desvío de Camino Recomendado (Interactivo + Alerta Dashboard)
            </h4>
          </div>
          <TogglePill
            checked={config.routeDeviationProtocol.enabled}
            onChange={(v) =>
              setConfig({
                ...config,
                routeDeviationProtocol: { ...config.routeDeviationProtocol, enabled: v },
              })
            }
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Distancia de desvío (Km)
            </label>
            <input
              type="number"
              step="0.1"
              min={0.3}
              value={config.routeDeviationProtocol.distanceKm}
              onChange={(e) =>
                setConfig({
                  ...config,
                  routeDeviationProtocol: {
                    ...config.routeDeviationProtocol,
                    distanceKm: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-rose-200 rounded-lg font-bold text-rose-700"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Tiempo fuera de ruta (seg)
            </label>
            <input
              type="number"
              min={10}
              value={config.routeDeviationProtocol.durationSeconds}
              onChange={(e) =>
                setConfig({
                  ...config,
                  routeDeviationProtocol: {
                    ...config.routeDeviationProtocol,
                    durationSeconds: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Espera sin respuesta (seg)
            </label>
            <input
              type="number"
              min={15}
              value={config.routeDeviationProtocol.responseTimeoutSeconds}
              onChange={(e) =>
                setConfig({
                  ...config,
                  routeDeviationProtocol: {
                    ...config.routeDeviationProtocol,
                    responseTimeoutSeconds: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Destinatarios</label>
            <select
              value={config.routeDeviationProtocol.recipients}
              onChange={(e) =>
                setConfig({
                  ...config,
                  routeDeviationProtocol: {
                    ...config.routeDeviationProtocol,
                    recipients: e.target.value as ExperienceRecipientTarget,
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="passenger">Solo Pasajero</option>
              <option value="both">Pasajero + Alerta Central</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Título al pasajero
            </label>
            <input
              value={config.routeDeviationProtocol.passengerTitle}
              onChange={(e) =>
                setConfig({
                  ...config,
                  routeDeviationProtocol: {
                    ...config.routeDeviationProtocol,
                    passengerTitle: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Mensaje al pasajero
            </label>
            <input
              value={config.routeDeviationProtocol.passengerMessage}
              onChange={(e) =>
                setConfig({
                  ...config,
                  routeDeviationProtocol: {
                    ...config.routeDeviationProtocol,
                    passengerMessage: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <VariableChips
          vars={['{km}']}
          onInsert={(v) =>
            setConfig({
              ...config,
              routeDeviationProtocol: {
                ...config.routeDeviationProtocol,
                passengerMessage: `${config.routeDeviationProtocol.passengerMessage} ${v}`.trim(),
              },
            })
          }
        />
      </div>

      {/* 6. Agradecimiento + Valoración Pendiente estilo Uber */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <h4 className="font-bold text-sm text-slate-800">
              6. Agradecimiento Final y Valoración Pendiente (Estilo Uber)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <TogglePill
              checked={config.tripCompletedRating.allowSkip}
              label={config.tripCompletedRating.allowSkip ? 'Con opción Omitir' : 'Obligatoria'}
              onChange={(v) =>
                setConfig({
                  ...config,
                  tripCompletedRating: { ...config.tripCompletedRating, allowSkip: v },
                })
              }
            />
            <TogglePill
              checked={config.tripCompletedRating.enabled}
              onChange={(v) =>
                setConfig({
                  ...config,
                  tripCompletedRating: { ...config.tripCompletedRating, enabled: v },
                })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Título de agradecimiento
            </label>
            <input
              value={config.tripCompletedRating.thankYouTitle}
              onChange={(e) =>
                setConfig({
                  ...config,
                  tripCompletedRating: {
                    ...config.tripCompletedRating,
                    thankYouTitle: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Texto botón Omitir
            </label>
            <input
              value={config.tripCompletedRating.skipText}
              onChange={(e) =>
                setConfig({
                  ...config,
                  tripCompletedRating: {
                    ...config.tripCompletedRating,
                    skipText: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            Mensaje de agradecimiento
          </label>
          <input
            value={config.tripCompletedRating.thankYouMessage}
            onChange={(e) =>
              setConfig({
                ...config,
                tripCompletedRating: {
                  ...config.tripCompletedRating,
                  thankYouMessage: e.target.value,
                },
              })
            }
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
          />
          <VariableChips
            vars={['{conductor}']}
            onInsert={(v) =>
              setConfig({
                ...config,
                tripCompletedRating: {
                  ...config.tripCompletedRating,
                  thankYouMessage: `${config.tripCompletedRating.thankYouMessage} ${v}`.trim(),
                },
              })
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
        <Bell className="h-3.5 w-3.5" />
        <span>
          Las promociones segmentadas y programadas se administran desde la pestaña{' '}
          <strong>Broadcast</strong>.
        </span>
      </div>
    </div>
  );
}
