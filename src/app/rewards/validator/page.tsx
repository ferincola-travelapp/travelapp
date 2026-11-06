'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Bus,
  AlertTriangle,
  Award,
  Plus,
} from 'lucide-react';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Redemption {
  id: string;
  itemId: string;
  itemTitle: string;
  pointsRequired: number;
  nombreSolicitante: string;
  emailSolicitante: string;
  telefonoSolicitante: string;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
  createdAt: string;
}

interface BusTicketClaim {
  id?: string;
  ticketNumber: string;
  ticketNumberNormalized: string;
  passengerName: string;
  passengerDni: string;
  passengerPhone: string;
  passengerEmail: string;
  origin: string;
  destination: string;
  busCompany?: string;
  amountPaid: number;
  estimatedPoints: number;
  brandSource?: string;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  createdAt: string;
  approvedAt?: string;
}

function normalizeTicketCode(raw: string): string {
  return (raw || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export default function CouponAndBusValidatorPage() {
  const [activeTab, setActiveTab] = useState<'bus_tickets' | 'coupons'>('bus_tickets');

  // ── Estado: Validador de Boletos Central de Pasajes ──
  const [busClaims, setBusClaims] = useState<BusTicketClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [ticketSearch, setTicketSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [operatorFeedback, setOperatorFeedback] = useState<{
    type: 'success' | 'error' | 'duplicate';
    text: string;
  } | null>(null);

  // Carga directa por el operador
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTicket, setManualTicket] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualDni, setManualDni] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualRoute, setManualRoute] = useState('');

  // ── Estado: Validador de Cupones de Canje ──
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState<Redemption | null>(null);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'bus_ticket_claims'),
      (snap) => {
        const list: BusTicketClaim[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as BusTicketClaim));
        list.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setBusClaims(list);
        setLoadingClaims(false);
      },
      () => {
        setLoadingClaims(false);
      }
    );
    return () => unsub();
  }, []);

  const handleOperatorBusAction = async (
    claim: BusTicketClaim,
    newStatus: 'Aprobado' | 'Rechazado'
  ) => {
    if (!claim.id) return;
    setProcessingId(claim.id);
    setOperatorFeedback(null);

    try {
      if (newStatus === 'Aprobado') {
        const dupSnap = await getDocs(
          query(
            collection(db, 'bus_ticket_claims'),
            where('ticketNumberNormalized', '==', claim.ticketNumberNormalized)
          )
        );
        let duplicateHolder: string | null = null;
        dupSnap.forEach((d) => {
          const data = d.data();
          if (d.id !== claim.id && data.status === 'Aprobado') {
            duplicateHolder = `${data.passengerName} (DNI ${data.passengerDni || 'S/D'})`;
          }
        });

        if (duplicateHolder) {
          setOperatorFeedback({
            type: 'duplicate',
            text: `🚨 ALERTA DE BOLETO DUPLICADO: El boleto N.º ${claim.ticketNumber} YA FUE ACREDITADO anteriormente a ${duplicateHolder}. Se bloqueó la doble acreditación.`,
          });
          setProcessingId(null);
          return;
        }

        if (claim.passengerEmail) {
          const userSnap = await getDocs(
            query(
              collection(db, 'users'),
              where('email', '==', claim.passengerEmail.toLowerCase())
            )
          );
          for (const uDoc of userSnap.docs) {
            await updateDoc(doc(db, 'users', uDoc.id), {
              points: increment(Number(claim.estimatedPoints || 15)),
              rewardPoints: increment(Number(claim.estimatedPoints || 15)),
            });
          }
        }
      }

      await updateDoc(doc(db, 'bus_ticket_claims', claim.id), {
        status: newStatus,
        approvedAt: new Date().toISOString(),
      });

      setOperatorFeedback({
        type: 'success',
        text:
          newStatus === 'Aprobado'
            ? `✅ Boleto N.º ${claim.ticketNumber} validado con éxito (+${claim.estimatedPoints || 15} pts acreditados a ${claim.passengerName}).`
            : `Boleto N.º ${claim.ticketNumber} marcado como Rechazado.`,
      });
    } catch (err: any) {
      setOperatorFeedback({
        type: 'error',
        text: `Error al procesar el boleto: ${err.message || 'Permisos insuficientes'}`,
      });
    } finally {
      setProcessingId(false as any);
    }
  };

  const handleManualOperatorIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperatorFeedback(null);
    const normalized = normalizeTicketCode(manualTicket);
    if (normalized.length < 4) {
      setOperatorFeedback({
        type: 'error',
        text: 'Ingresá un N.º de Boleto válido.',
      });
      return;
    }

    try {
      const dupSnap = await getDocs(
        query(
          collection(db, 'bus_ticket_claims'),
          where('ticketNumberNormalized', '==', normalized)
        )
      );
      if (!dupSnap.empty) {
        const first = dupSnap.docs[0].data();
        setOperatorFeedback({
          type: 'duplicate',
          text: `🚨 ALERTA AL OPERADOR: El boleto N.º ${manualTicket.toUpperCase()} ya figura registrado en el sistema a nombre de ${first.passengerName} con estado "${first.status}". No se puede volver a acreditar.`,
        });
        return;
      }

      const amt = Number(manualAmount.replace(/[^0-9.]/g, '')) || 0;
      const pts = amt > 0 ? Math.max(5, Math.round((amt * 0.05) / 175)) : 15;

      await addDoc(collection(db, 'bus_ticket_claims'), {
        ticketNumber: manualTicket.trim().toUpperCase(),
        ticketNumberNormalized: normalized,
        passengerName: manualName.trim(),
        passengerDni: manualDni.trim(),
        passengerPhone: '',
        passengerEmail: manualEmail.trim().toLowerCase(),
        origin: 'Validación Manual Operador',
        destination: manualRoute.trim() || 'Nacional',
        busCompany: 'Central de Pasajes',
        amountPaid: amt,
        estimatedPoints: pts,
        brandSource: 'concorde_360_operator',
        agencyCode: 'cag',
        status: 'Aprobado',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      });

      if (manualEmail.trim()) {
        const userSnap = await getDocs(
          query(
            collection(db, 'users'),
            where('email', '==', manualEmail.trim().toLowerCase())
          )
        );
        for (const uDoc of userSnap.docs) {
          await updateDoc(doc(db, 'users', uDoc.id), {
            points: increment(pts),
            rewardPoints: increment(pts),
          });
        }
      }

      setOperatorFeedback({
        type: 'success',
        text: `✅ Boleto N.º ${manualTicket.toUpperCase()} validado y +${pts} Puntos Rewards acreditados.`,
      });
      setManualTicket('');
      setManualName('');
      setManualDni('');
      setManualEmail('');
      setManualAmount('');
      setManualRoute('');
      setShowManualForm(false);
    } catch (err: any) {
      setOperatorFeedback({
        type: 'error',
        text: `Error al registrar boleto: ${err.message}`,
      });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setCoupon(null);
    setSearched(true);

    try {
      const code = couponCode.trim();
      const docRef = doc(db, 'reward_redemptions', code);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setCoupon({
          id: docSnap.id,
          itemId: data.itemId || '',
          itemTitle: data.itemTitle || 'Premio',
          pointsRequired: Number(data.pointsRequired || 0),
          nombreSolicitante: data.nombreSolicitante || 'Cliente',
          emailSolicitante: data.emailSolicitante || '',
          telefonoSolicitante: data.telefonoSolicitante || '',
          estado: data.estado || 'Pendiente',
          createdAt: data.createdAt || '',
        });
      } else {
        const q = query(collection(db, 'reward_redemptions'), where('itemId', '==', code));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const first = qSnap.docs[0];
          const data = first.data();
          setCoupon({
            id: first.id,
            itemId: data.itemId || '',
            itemTitle: data.itemTitle || 'Premio',
            pointsRequired: Number(data.pointsRequired || 0),
            nombreSolicitante: data.nombreSolicitante || 'Cliente',
            emailSolicitante: data.emailSolicitante || '',
            telefonoSolicitante: data.telefonoSolicitante || '',
            estado: data.estado || 'Pendiente',
            createdAt: data.createdAt || '',
          });
        } else {
          setErrorMsg('No se encontró ningún cupón con el código proporcionado.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al consultar la base de datos de cupones.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!coupon) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'reward_redemptions', coupon.id), {
        estado: 'Aprobado',
      });
      setCoupon((prev) => (prev ? { ...prev, estado: 'Aprobado' } : null));
      setSuccessMsg('¡El cupón ha sido validado y canjeado con éxito!');
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo validar el cupón.');
    } finally {
      setLoading(false);
    }
  };

  const filteredBusClaims = busClaims.filter(
    (c) =>
      c.ticketNumber?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      c.passengerName?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      c.passengerDni?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      c.destination?.toLowerCase().includes(ticketSearch.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-tech-blue flex items-center gap-2">
            <Zap className="h-7 w-7 text-vial-orange" />
            Validador Rewards · Concorde 360
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium">
            Acreditación de puntos por boletos de Central de Pasajes (con bloqueo anti-duplicados) y validación de cupones de canje.
          </p>
        </div>

        {/* Selector de Pestaña */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('bus_tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              activeTab === 'bus_tickets'
                ? 'bg-tech-blue text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bus className="h-4 w-4" />
            <span>
              Boletos Central de Pasajes ({busClaims.filter((c) => c.status === 'Pendiente').length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-tech-blue text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Cupones de Canje</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB 1: VALIDADOR DE BOLETOS CENTRAL DE PASAJES (CON ALERTA DE DUPLICADOS)
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'bus_tickets' && (
        <div className="space-y-5">
          {operatorFeedback && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm font-bold ${
                operatorFeedback.type === 'duplicate'
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : operatorFeedback.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {operatorFeedback.type === 'duplicate' ? (
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              ) : operatorFeedback.type === 'error' ? (
                <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <span>{operatorFeedback.text}</span>
            </div>
          )}

          {/* Barra de búsqueda y botón para validar manualmente un boleto */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Verificar N.º de Boleto, DNI o Pasajero..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-tech-blue"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowManualForm((prev) => !prev)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-vial-orange hover:bg-orange-600 text-white text-xs font-black transition cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>
                {showManualForm ? 'Cerrar Carga Manual' : 'Acreditar Boleto Manualmente'}
              </span>
            </button>
          </div>

          {/* Formulario de acreditación directa por operador */}
          {showManualForm && (
            <form
              onSubmit={handleManualOperatorIssue}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
            >
              <h3 className="text-sm font-black text-tech-blue uppercase tracking-wider">
                Acreditar Boleto Verificado en Central de Pasajes (Agencia CAG)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    N.º de Boleto / Voucher *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualTicket}
                    onChange={(e) => setManualTicket(e.target.value)}
                    placeholder="Ej: B-00492817"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Pasajero *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Nombre y Apellido"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    DNI *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualDni}
                    onChange={(e) => setManualDni(e.target.value)}
                    placeholder="DNI sin puntos"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Email Usuario TravelApp
                  </label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Ruta / Destino
                  </label>
                  <input
                    type="text"
                    value={manualRoute}
                    onChange={(e) => setManualRoute(e.target.value)}
                    placeholder="Ej: Tucumán - Salta"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Monto Abonado ($ ARS) *
                  </label>
                  <input
                    type="number"
                    required
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="Ej: 65000"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-tech-blue hover:bg-tech-blue/90 text-white text-xs font-black cursor-pointer"
                >
                  Verificar Unicidad y Acreditar Puntos
                </button>
              </div>
            </form>
          )}

          {/* Lista de Boletos Cargados */}
          {loadingClaims ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-7 w-7 animate-spin text-tech-blue" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBusClaims.map((c) => {
                const duplicateApproved = busClaims.find(
                  (other) =>
                    other.id !== c.id &&
                    other.ticketNumberNormalized === c.ticketNumberNormalized &&
                    other.status === 'Aprobado'
                );

                return (
                  <div
                    key={c.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      duplicateApproved
                        ? 'border-red-400 bg-red-50/40'
                        : c.status === 'Pendiente'
                        ? 'border-amber-200'
                        : c.status === 'Aprobado'
                        ? 'border-emerald-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            c.status === 'Pendiente'
                              ? 'bg-amber-100 text-amber-800'
                              : c.status === 'Aprobado'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {c.status}
                        </span>
                        <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-0.5 rounded-lg font-mono">
                          Boleto: {c.ticketNumber}
                        </span>
                        {c.brandSource && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-tech-blue">
                            Canal: {c.brandSource}
                          </span>
                        )}
                      </div>

                      {duplicateApproved && (
                        <div className="p-2.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
                          <span>
                            🚨 ALERTA AL OPERADOR: Este N.º de boleto ({c.ticketNumber}) YA FUE ACREDITADO a{' '}
                            {duplicateApproved.passengerName} (DNI {duplicateApproved.passengerDni}).
                          </span>
                        </div>
                      )}

                      <p className="text-sm font-black text-slate-800">
                        {c.passengerName} {c.passengerDni ? `· DNI ${c.passengerDni}` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.passengerEmail} {c.passengerPhone ? `· Tel: ${c.passengerPhone}` : ''}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                        <span className="font-bold text-slate-700">
                          🚌 {c.origin} → {c.destination}
                        </span>
                        <span className="font-bold text-slate-700">
                          💳 ${Number(c.amountPaid || 0).toLocaleString('es-AR')} ARS
                        </span>
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <Award className="h-3.5 w-3.5" />+{c.estimatedPoints || 15} pts Rewards
                        </span>
                      </div>
                    </div>

                    {c.status === 'Pendiente' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOperatorBusAction(c, 'Aprobado')}
                          disabled={processingId === c.id || Boolean(duplicateApproved)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Aprobar y Acreditar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOperatorBusAction(c, 'Rechazado')}
                          disabled={processingId === c.id}
                          className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-black transition cursor-pointer flex items-center gap-1.5"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Rechazar</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredBusClaims.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                  <Bus className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">
                    No hay boletos pendientes de validación
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Cuando un pasajero cargue su N.º de boleto en /buses o en la App aparecerá aquí para aprobar.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2: VALIDADOR DE CUPONES DE CANJE
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'coupons' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-tech-blue uppercase tracking-wide">
              Ingresar Código de Cupón de Canje
            </h3>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Ej: dGZ5V8vW9H7rY12s o EXP-001"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-tech-blue font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-tech-blue hover:bg-tech-blue/90 text-white font-bold py-2 px-5 rounded-lg text-xs transition-all flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Buscar'}
              </button>
            </form>
          </div>

          {searched && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold">
                  <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  {successMsg}
                </div>
              )}

              {coupon && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{coupon.itemTitle}</h4>
                      <p className="text-[10px] text-slate-450 font-mono mt-0.5">
                        Código: {coupon.id}
                      </p>
                    </div>
                    {coupon.estado === 'Aprobado' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-250 px-2.5 py-0.5 font-bold text-emerald-700 text-[10px] uppercase">
                        <CheckCircle className="h-3.5 w-3.5" /> Canjeado
                      </span>
                    ) : coupon.estado === 'Rechazado' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-250 px-2.5 py-0.5 font-bold text-rose-700 text-[10px] uppercase">
                        <XCircle className="h-3.5 w-3.5" /> Rechazado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-250 px-2.5 py-0.5 font-bold text-amber-700 text-[10px] uppercase animate-pulse">
                        <Clock className="h-3.5 w-3.5" /> Pendiente de Canje
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Beneficiario</p>
                      <p className="font-bold text-slate-700 mt-1">{coupon.nombreSolicitante}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {coupon.emailSolicitante}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Puntos Requeridos
                      </p>
                      <p className="font-black text-tech-blue mt-1">
                        {coupon.pointsRequired} pts
                      </p>
                    </div>
                  </div>

                  {coupon.estado === 'Pendiente' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleValidate}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg text-xs shadow transition-all"
                      >
                        Aprobar &amp; Validar Canje
                      </button>
                    </div>
                  )}

                  {coupon.estado === 'Aprobado' && !successMsg && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                      <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
                      Este cupón ya fue canjeado. No requiere ninguna otra acción.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
