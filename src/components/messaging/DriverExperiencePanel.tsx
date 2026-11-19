'use client';

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DriverExperienceConfig,
  DEFAULT_DRIVER_EXPERIENCE_CONFIG,
} from '@/types/messaging';
import {
  AlertTriangle,
  BellRing,
  Car,
  Check,
  Clock,
  KeyRound,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  Volume2,
} from 'lucide-react';

function VariableChips({ vars }: { vars: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {vars.map((v) => (
        <span
          key={v}
          className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600"
        >
          {v}
        </span>
      ))}
    </div>
  );
}

export function DriverExperiencePanel() {
  const [config, setConfig] = useState<DriverExperienceConfig>(
    DEFAULT_DRIVER_EXPERIENCE_CONFIG
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system_config', 'driver_experience'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<DriverExperienceConfig>;
          setConfig({
            incomingRequest: {
              ...DEFAULT_DRIVER_EXPERIENCE_CONFIG.incomingRequest,
              ...(data.incomingRequest || {}),
            },
            securityPin: {
              ...DEFAULT_DRIVER_EXPERIENCE_CONFIG.securityPin,
              ...(data.securityPin || {}),
            },
            arrivingSoonAlert: {
              ...DEFAULT_DRIVER_EXPERIENCE_CONFIG.arrivingSoonAlert,
              ...(data.arrivingSoonAlert || {}),
            },
            routeDeviationAlert: {
              ...DEFAULT_DRIVER_EXPERIENCE_CONFIG.routeDeviationAlert,
              ...(data.routeDeviationAlert || {}),
            },
            panicButton: {
              ...DEFAULT_DRIVER_EXPERIENCE_CONFIG.panicButton,
              ...(data.panicButton || {}),
            },
            accountLifecycle: {
              ...DEFAULT_DRIVER_EXPERIENCE_CONFIG.accountLifecycle,
              ...(data.accountLifecycle || {}),
            },
            updatedAt: data.updatedAt,
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
        doc(db, 'system_config', 'driver_experience'),
        { ...config, updatedAt: Date.now() },
        { merge: true }
      );
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch (err) {
      console.error('Error guardando configuración de conductor:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 text-sm text-slate-400">
        Cargando configuración de experiencia del conductor...
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full space-y-5">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-tech-blue" />
              <h2 className="text-lg font-extrabold text-slate-800">
                Experiencia & Seguridad del Conductor (App Móvil)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Editá en vivo la locución por voz de viajes entrantes (sin decir precio), código PIN de 4 cifras, avisos de 2 minutos y botón de pánico SOS.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savedToast && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <Check className="h-3.5 w-3.5" /> Guardado en vivo
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tech-blue text-white text-xs font-bold hover:bg-blue-900 disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar Configuración
            </button>
          </div>
        </div>

        {/* 1. Solicitud de Viaje Entrante (Voz sin precio + Push + Dual Tarifario) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-800">
                1. Solicitud de Viaje Entrante (Notificación + Voz sin precio)
              </h3>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={config.incomingRequest.enabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    incomingRequest: {
                      ...config.incomingRequest,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              Activo
            </label>
          </div>
          <p className="text-[11px] text-slate-500">
            La voz lee únicamente conductor, origen, destino y distancia (no dice montos). En pantalla el chofer ve su ganancia neta y el total a cobrar al pasajero junto con su foto de perfil y nombre.
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.incomingRequest.pushEnabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    incomingRequest: {
                      ...config.incomingRequest,
                      pushEnabled: e.target.checked,
                    },
                  })
                }
              />
              Notificación Push en segundo plano
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.incomingRequest.voiceEnabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    incomingRequest: {
                      ...config.incomingRequest,
                      voiceEnabled: e.target.checked,
                    },
                  })
                }
              />
              Lectura automática por voz
            </label>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Guion de voz al recibir viaje
            </label>
            <textarea
              rows={2}
              value={config.incomingRequest.voiceTemplate}
              onChange={(e) =>
                setConfig({
                  ...config,
                  incomingRequest: {
                    ...config.incomingRequest,
                    voiceTemplate: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-tech-blue"
            />
            <VariableChips
              vars={['{conductor}', '{origen}', '{destino}', '{distancia}']}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Comisión base si el viaje no la trae (%)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={config.incomingRequest.defaultCommissionPct}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    incomingRequest: {
                      ...config.incomingRequest,
                      defaultCommissionPct: Number(e.target.value || 15),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tiempo para responder solicitud (segundos)
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={config.incomingRequest.countdownSeconds}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    incomingRequest: {
                      ...config.incomingRequest,
                      countdownSeconds: Number(e.target.value || 25),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </section>

        {/* 2. Código PIN de 4 dígitos */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                2. Verificación con Código Numérico de 4 Cifras
              </h3>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={config.securityPin.enabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    securityPin: {
                      ...config.securityPin,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              Habilitar opción
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={config.securityPin.requireByDefault}
              onChange={(e) =>
                setConfig({
                  ...config,
                  securityPin: {
                    ...config.securityPin,
                    requireByDefault: e.target.checked,
                  },
                })
              }
            />
            Activar solicitud de PIN de 4 dígitos por defecto en todos los viajes (si el chofer lo solicita o queda activo, no puede iniciar el viaje hasta ingresarlo)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={config.securityPin.modalTitle}
              onChange={(e) =>
                setConfig({
                  ...config,
                  securityPin: {
                    ...config.securityPin,
                    modalTitle: e.target.value,
                  },
                })
              }
              placeholder="Título del modal PIN"
              className="px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
            <input
              type="text"
              value={config.securityPin.modalSubtitle}
              onChange={(e) =>
                setConfig({
                  ...config,
                  securityPin: {
                    ...config.securityPin,
                    modalSubtitle: e.target.value,
                  },
                })
              }
              placeholder="Instrucción para el conductor"
              className="px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>
        </section>

        {/* 3. Aviso de 2 minutos + Desvío */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">
                3. Aviso Próximo a Llegada & Desvío de Ruta
              </h3>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={config.arrivingSoonAlert.enabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    arrivingSoonAlert: {
                      ...config.arrivingSoonAlert,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              Aviso llegada activo
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Minutos antes de llegar
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
                      minutesBefore: Number(e.target.value || 2),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Aviso por voz al conductor ({'{eta}'}, {'{pasajero}'})
              </label>
              <input
                type="text"
                value={config.arrivingSoonAlert.voiceMessage}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    arrivingSoonAlert: {
                      ...config.arrivingSoonAlert,
                      voiceMessage: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.routeDeviationAlert.enabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    routeDeviationAlert: {
                      ...config.routeDeviationAlert,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              Alertar también al conductor cuando supere la distancia de desvío configurada
            </label>
            <input
              type="text"
              value={config.routeDeviationAlert.voiceMessage}
              onChange={(e) =>
                setConfig({
                  ...config,
                  routeDeviationAlert: {
                    ...config.routeDeviationAlert,
                    voiceMessage: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              placeholder="Mensaje de voz por desvío ({km})"
            />
          </div>
        </section>

        {/* 4. Botón de Pánico SOS */}
        <section className="bg-rose-50/70 rounded-2xl border-2 border-rose-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <h3 className="text-sm font-bold text-rose-900">
                4. Botón de Pánico SOS (Conductor → Supervisor + Dashboard)
              </h3>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-rose-800 cursor-pointer">
              <input
                type="checkbox"
                checked={config.panicButton.enabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    panicButton: {
                      ...config.panicButton,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              Activo
            </label>
          </div>
          <p className="text-[11px] text-rose-700">
            Requiere mantener presionado el botón SOS durante los segundos configurados para evitar disparos accidentales. Al activarse suena y se muestra al instante en la app del Supervisor asignado y en el Dashboard web con distintivo de conductor.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-rose-800 mb-1">
                Segundos de pulsación
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={config.panicButton.holdSeconds}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    panicButton: {
                      ...config.panicButton,
                      holdSeconds: Number(e.target.value || 2),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200 bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-rose-800 mb-1">
                Título de alerta
              </label>
              <input
                type="text"
                value={config.panicButton.alertTitle}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    panicButton: {
                      ...config.panicButton,
                      alertTitle: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-rose-800 mb-1">
              Mensaje de emergencia ({'{conductor}'}, {'{vehiculo}'})
            </label>
            <input
              type="text"
              value={config.panicButton.alertMessage}
              onChange={(e) =>
                setConfig({
                  ...config,
                  panicButton: {
                    ...config.panicButton,
                    alertMessage: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200 bg-white"
            />
          </div>
        </section>

        {/* 5. Aprobación y Documentos */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">
              5. Aprobación de Cuenta y Vencimiento de Documentación
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={config.accountLifecycle.approvalTitle}
              onChange={(e) =>
                setConfig({
                  ...config,
                  accountLifecycle: {
                    ...config.accountLifecycle,
                    approvalTitle: e.target.value,
                  },
                })
              }
              placeholder="Título de aprobación"
              className="px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
            <input
              type="text"
              value={config.accountLifecycle.approvalMessage}
              onChange={(e) =>
                setConfig({
                  ...config,
                  accountLifecycle: {
                    ...config.accountLifecycle,
                    approvalMessage: e.target.value,
                  },
                })
              }
              placeholder="Mensaje al habilitar cuenta"
              className="px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Aviso anticipado vencimientos (días)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={config.accountLifecycle.docsExpiryWarningDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    accountLifecycle: {
                      ...config.accountLifecycle,
                      docsExpiryWarningDays: Number(e.target.value || 15),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
