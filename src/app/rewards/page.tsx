"use client";

import React, { useState, useEffect } from "react";
import {
  Gift,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Award,
  RefreshCw,
  Save,
  X,
  AlertCircle,
  Bus,
  AlertTriangle,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ════════════════════════════════════════════════════════════
   TIPOS
════════════════════════════════════════════════════════════ */
interface RewardItem {
  id?: string;
  title: string;
  description: string;
  pointsRequired: number;
  category: string;
  availability: "Disponible" | "Limitado" | "Agotado";
  imageUrl?: string;
  partner?: string;
  details?: string;
  badge?: string;
}

interface Redemption {
  id?: string;
  itemId: string;
  itemTitle: string;
  pointsRequired: number;
  category: string;
  nombreSolicitante: string;
  emailSolicitante: string;
  telefonoSolicitante: string;
  estado: "Pendiente" | "Aprobado" | "Rechazado";
  createdAt: string;
}

const EMPTY_ITEM: RewardItem = {
  title: "",
  description: "",
  pointsRequired: 0,
  category: "Viajes y Traslados",
  availability: "Disponible",
  imageUrl: "",
  partner: "",
  details: "",
  badge: "",
};

const CATEGORIES = [
  "Viajes y Traslados",
  "Gastronomía",
  "Retail y Compras",
  "Entretenimiento",
  "Salud y Bienestar",
  "Tecnología",
  "Otros",
];

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
  status: "Pendiente" | "Aprobado" | "Rechazado";
  createdAt: string;
  approvedAt?: string;
}

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function RewardsAdminPage() {
  const [activeSection, setActiveSection] = useState<"catalog" | "redemptions" | "bus_claims">("catalog");

  // Catálogo de ítems
  const [items, setItems] = useState<RewardItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  // Solicitudes de canje
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  const [redemptionSearch, setRedemptionSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Reclamos de Boletos Central de Pasajes
  const [busClaims, setBusClaims] = useState<BusTicketClaim[]>([]);
  const [loadingBusClaims, setLoadingBusClaims] = useState(true);
  const [busClaimSearch, setBusClaimSearch] = useState("");

  // Status
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Cargar ítems del catálogo
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reward_items"), (snap) => {
      const list: RewardItem[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RewardItem));
      setItems(list);
      setLoadingItems(false);
    });
    return () => unsub();
  }, []);

  // Cargar solicitudes de canje
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reward_redemptions"), (snap) => {
      const list: Redemption[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Redemption));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRedemptions(list);
      setLoadingRedemptions(false);
    });
    return () => unsub();
  }, []);

  // Cargar reclamos de boletos de Central de Pasajes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bus_ticket_claims"), (snap) => {
      const list: BusTicketClaim[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as BusTicketClaim));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setBusClaims(list);
      setLoadingBusClaims(false);
    });
    return () => unsub();
  }, []);

  const handleSaveItem = async (item: RewardItem) => {
    setSavingItem(true);
    try {
      const data = {
        title: item.title,
        description: item.description,
        pointsRequired: Number(item.pointsRequired),
        category: item.category,
        availability: item.availability,
        imageUrl: item.imageUrl || "",
        partner: item.partner || "",
        details: item.details || "",
        badge: item.badge || "",
      };
      if (item.id) {
        await updateDoc(doc(db, "reward_items", item.id), data);
        showStatus("success", "Ítem actualizado correctamente.");
      } else {
        await addDoc(collection(db, "reward_items"), data);
        showStatus("success", "Ítem creado correctamente.");
      }
      setEditingItem(null);
      setIsCreating(false);
    } catch (err: any) {
      showStatus("error", `Error al guardar: ${err.message}`);
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este ítem?")) return;
    try {
      await deleteDoc(doc(db, "reward_items", id));
      showStatus("success", "Ítem eliminado.");
    } catch (err: any) {
      showStatus("error", `Error al eliminar: ${err.message}`);
    }
  };

  const handleUpdateRedemptionStatus = async (id: string, estado: "Aprobado" | "Rechazado") => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, "reward_redemptions", id), { estado });
      showStatus("success", `Solicitud marcada como ${estado}.`);
    } catch (err: any) {
      showStatus("error", `Error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateBusClaimStatus = async (claim: BusTicketClaim, newStatus: "Aprobado" | "Rechazado") => {
    if (!claim.id) return;
    setUpdatingId(claim.id);
    try {
      if (newStatus === "Aprobado") {
        // Control estricto de unicidad para el Operador antes de aprobar
        const dupSnap = await getDocs(
          query(
            collection(db, "bus_ticket_claims"),
            where("ticketNumberNormalized", "==", claim.ticketNumberNormalized)
          )
        );
        let duplicateApprovedBy: string | null = null;
        dupSnap.forEach((d) => {
          const data = d.data();
          if (d.id !== claim.id && data.status === "Aprobado") {
            duplicateApprovedBy = data.passengerName || data.passengerEmail || "otro pasajero";
          }
        });

        if (duplicateApprovedBy) {
          showStatus(
            "error",
            `🚨 ALERTA DE BOLETO DUPLICADO: El boleto N.º ${claim.ticketNumber} ya fue aprobado y acreditado anteriormente a ${duplicateApprovedBy}. Operación bloqueada.`
          );
          setUpdatingId(null);
          return;
        }

        // Acreditar puntos en la cuenta del usuario si está registrado por email
        if (claim.passengerEmail) {
          const userSnap = await getDocs(
            query(collection(db, "users"), where("email", "==", claim.passengerEmail.toLowerCase()))
          );
          for (const uDoc of userSnap.docs) {
            await updateDoc(doc(db, "users", uDoc.id), {
              points: increment(Number(claim.estimatedPoints || 15)),
              rewardPoints: increment(Number(claim.estimatedPoints || 15)),
            });
          }
        }
      }

      await updateDoc(doc(db, "bus_ticket_claims", claim.id), {
        status: newStatus,
        approvedAt: new Date().toISOString(),
      });
      showStatus(
        "success",
        newStatus === "Aprobado"
          ? `Boleto N.º ${claim.ticketNumber} aprobado y +${claim.estimatedPoints} puntos acreditados.`
          : `Boleto N.º ${claim.ticketNumber} marcado como Rechazado.`
      );
    } catch (err: any) {
      showStatus("error", `Error al procesar boleto: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.title?.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.category?.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.partner?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredRedemptions = redemptions.filter(
    (r) =>
      r.nombreSolicitante?.toLowerCase().includes(redemptionSearch.toLowerCase()) ||
      r.itemTitle?.toLowerCase().includes(redemptionSearch.toLowerCase()) ||
      r.emailSolicitante?.toLowerCase().includes(redemptionSearch.toLowerCase())
  );

  const ItemForm = ({ item, onSave, onCancel }: { item: RewardItem; onSave: (i: RewardItem) => void; onCancel: () => void }) => {
    const [form, setForm] = useState({ ...item });
    return (
      <div className="bg-white rounded-2xl border border-violet-200 p-6 shadow-lg space-y-4">
        <h3 className="text-base font-black text-violet-800">{form.id ? "Editar Ítem" : "Nuevo Ítem de Canje"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Título *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Categoría</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Puntos requeridos *</label>
            <input type="number" min="0" value={form.pointsRequired} onChange={(e) => setForm({ ...form, pointsRequired: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Disponibilidad</label>
            <select value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value as any })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              <option value="Disponible">Disponible</option>
              <option value="Limitado">Limitado</option>
              <option value="Agotado">Agotado</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Descripción corta *</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">URL de imagen</label>
            <input type="text" value={form.imageUrl || ""} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Partner / Comercio</label>
            <input type="text" value={form.partner || ""} onChange={(e) => setForm({ ...form, partner: e.target.value })} placeholder="Ej: McDonald's, Falabella..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Badge (etiqueta)</label>
            <input type="text" value={form.badge || ""} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Ej: Nuevo, Popular, VIP..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Detalles adicionales (modal)</label>
            <textarea rows={3} value={form.details || ""} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Descripción completa del beneficio, condiciones, vigencia..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onSave(form)}
            disabled={savingItem || !form.title || !form.description}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-fuchsia-600 px-5 py-2.5 text-sm font-black text-white transition-all disabled:opacity-50 shadow-sm"
          >
            <Save className="h-4 w-4" />
            {savingItem ? "Guardando..." : "Guardar Ítem"}
          </button>
          <button onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-600 transition-all">
            <X className="h-4 w-4" /> Cancelar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-violet-700 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-violet-100 flex items-center justify-center">
            <Gift className="h-5 w-5 text-violet-600" />
          </div>
          Gestión de Rewards
        </h1>
        <p className="mt-2 text-slate-500">Administrá el catálogo de canjes y las solicitudes de los usuarios.</p>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className={`mb-6 rounded-xl border p-4 flex items-center gap-3 ${
          statusMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {statusMsg.type === "success" ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
          <p className="text-sm font-semibold">{statusMsg.text}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveSection("catalog")}
          className={`px-5 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-all ${
            activeSection === "catalog" ? "border-violet-600 text-violet-700 bg-violet-50" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          🎁 Catálogo de Canjes ({items.length})
        </button>
        <button
          onClick={() => setActiveSection("redemptions")}
          className={`px-5 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-all ${
            activeSection === "redemptions" ? "border-violet-600 text-violet-700 bg-violet-50" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📋 Solicitudes ({redemptions.filter(r => r.estado === "Pendiente").length} pendientes)
        </button>
        <button
          onClick={() => setActiveSection("bus_claims")}
          className={`px-5 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSection === "bus_claims" ? "border-violet-600 text-violet-700 bg-violet-50" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Bus className="h-4 w-4" />
          <span>Boletos Central de Pasajes ({busClaims.filter(c => c.status === "Pendiente").length} pendientes)</span>
        </button>
      </div>

      {/* ══ SECCIÓN: CATÁLOGO ══ */}
      {activeSection === "catalog" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar ítems..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 w-64"
              />
            </div>
            {!isCreating && !editingItem && (
              <button
                onClick={() => { setIsCreating(true); setEditingItem(EMPTY_ITEM); }}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-fuchsia-600 px-5 py-2.5 text-sm font-black text-white transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" /> Nuevo Ítem
              </button>
            )}
          </div>

          {(isCreating || editingItem) && (
            <ItemForm
              item={editingItem || EMPTY_ITEM}
              onSave={handleSaveItem}
              onCancel={() => { setEditingItem(null); setIsCreating(false); }}
            />
          )}

          {loadingItems ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                  {item.imageUrl && (
                    <div className="h-36 w-full bg-violet-50 overflow-hidden">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-black uppercase text-violet-500 tracking-wider">{item.category}{item.partner && ` · ${item.partner}`}</p>
                        <h3 className="font-black text-slate-800 text-sm leading-snug">{item.title}</h3>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                        item.availability === "Disponible" ? "bg-emerald-100 text-emerald-700" :
                        item.availability === "Limitado" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {item.availability}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-black text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-2 py-1">
                        <Award className="h-3 w-3" /> {item.pointsRequired?.toLocaleString("es-AR")} pts
                      </span>
                      {item.badge && (
                        <span className="text-[9px] font-bold bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded-full">{item.badge}</span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => { setEditingItem(item); setIsCreating(false); }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 py-1.5 text-xs font-bold text-slate-600 hover:text-violet-700 transition-all"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id!)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-16 text-slate-400">
                  <Gift className="h-12 w-12 mx-auto mb-3 text-violet-200" />
                  <p className="font-semibold">No hay ítems en el catálogo todavía.</p>
                  <p className="text-xs mt-1">Hacé clic en "Nuevo Ítem" para agregar el primero.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ SECCIÓN: SOLICITUDES ══ */}
      {activeSection === "redemptions" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o beneficio..."
              value={redemptionSearch}
              onChange={(e) => setRedemptionSearch(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 w-full max-w-sm"
            />
          </div>

          {loadingRedemptions ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRedemptions.map((r) => (
                <div key={r.id} className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                  r.estado === "Pendiente" ? "border-amber-200" : r.estado === "Aprobado" ? "border-emerald-200" : "border-slate-200"
                }`}>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        r.estado === "Pendiente" ? "bg-amber-100 text-amber-700" :
                        r.estado === "Aprobado" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {r.estado === "Pendiente" ? <Clock className="h-2.5 w-2.5" /> : r.estado === "Aprobado" ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                        {r.estado}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                    <h3 className="font-black text-slate-800 text-sm">{r.nombreSolicitante}</h3>
                    <p className="text-xs text-slate-500">{r.emailSolicitante} · {r.telefonoSolicitante}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Award className="h-3.5 w-3.5 text-violet-500" />
                      <span className="text-xs font-bold text-slate-700">{r.itemTitle}</span>
                      <span className="text-[10px] text-violet-600 font-black">{r.pointsRequired?.toLocaleString("es-AR")} pts</span>
                    </div>
                  </div>
                  {r.estado === "Pendiente" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleUpdateRedemptionStatus(r.id!, "Aprobado")}
                        disabled={updatingId === r.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-black text-white transition-all disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Aprobar
                      </button>
                      <button
                        onClick={() => handleUpdateRedemptionStatus(r.id!, "Rechazado")}
                        disabled={updatingId === r.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-100 hover:bg-red-200 border border-red-200 px-4 py-2 text-xs font-black text-red-700 transition-all disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {filteredRedemptions.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                  <p className="font-semibold">No hay solicitudes de canje todavía.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ SECCIÓN: VALIDACIÓN DE BOLETOS CENTRAL DE PASAJES (CON ALERTA DE DUPLICADOS) ══ */}
      {activeSection === "bus_claims" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N.º de boleto, pasajero, DNI o destino..."
              value={busClaimSearch}
              onChange={(e) => setBusClaimSearch(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 w-full max-w-md"
            />
          </div>

          {loadingBusClaims ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {busClaims
                .filter(
                  (c) =>
                    c.ticketNumber?.toLowerCase().includes(busClaimSearch.toLowerCase()) ||
                    c.passengerName?.toLowerCase().includes(busClaimSearch.toLowerCase()) ||
                    c.passengerDni?.toLowerCase().includes(busClaimSearch.toLowerCase()) ||
                    c.destination?.toLowerCase().includes(busClaimSearch.toLowerCase())
                )
                .map((c) => {
                  const alreadyApprovedDuplicate = busClaims.find(
                    (other) =>
                      other.id !== c.id &&
                      other.ticketNumberNormalized === c.ticketNumberNormalized &&
                      other.status === "Aprobado"
                  );

                  return (
                    <div
                      key={c.id}
                      className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                        alreadyApprovedDuplicate
                          ? "border-red-400 bg-red-50/40"
                          : c.status === "Pendiente"
                          ? "border-amber-200"
                          : c.status === "Aprobado"
                          ? "border-emerald-200"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              c.status === "Pendiente"
                                ? "bg-amber-100 text-amber-800"
                                : c.status === "Aprobado"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {c.status === "Pendiente" ? (
                              <Clock className="h-2.5 w-2.5" />
                            ) : c.status === "Aprobado" ? (
                              <CheckCircle className="h-2.5 w-2.5" />
                            ) : (
                              <XCircle className="h-2.5 w-2.5" />
                            )}
                            {c.status}
                          </span>
                          <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-0.5 rounded-lg">
                            Boleto N.º {c.ticketNumber}
                          </span>
                          {c.brandSource && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-violet-100 text-violet-700">
                              Origen: {c.brandSource}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleDateString("es-AR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        {alreadyApprovedDuplicate && (
                          <div className="mt-2 p-2.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
                            <span>
                              🚨 ALERTA AL OPERADOR: Este N.º de boleto ({c.ticketNumber}) YA FUE ACREDITADO a{" "}
                              {alreadyApprovedDuplicate.passengerName} (DNI {alreadyApprovedDuplicate.passengerDni}). No aprobar duplicado.
                            </span>
                          </div>
                        )}

                        <h3 className="font-black text-slate-800 text-sm pt-1">
                          {c.passengerName} · DNI {c.passengerDni}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {c.passengerEmail} · WhatsApp: {c.passengerPhone}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                          <span className="font-bold text-slate-700">
                            🚌 Ruta: {c.origin} → {c.destination}
                          </span>
                          <span className="font-bold text-slate-700">
                            💳 Abonado: ${Number(c.amountPaid || 0).toLocaleString("es-AR")} ARS
                          </span>
                          <span className="text-violet-700 font-black bg-violet-50 px-2 py-0.5 rounded">
                            +{c.estimatedPoints || 15} Puntos Rewards
                          </span>
                        </div>
                      </div>

                      {c.status === "Pendiente" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleUpdateBusClaimStatus(c, "Aprobado")}
                            disabled={updatingId === c.id || Boolean(alreadyApprovedDuplicate)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-black text-white transition-all disabled:opacity-40 cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Aprobar y Acreditar
                          </button>
                          <button
                            onClick={() => handleUpdateBusClaimStatus(c, "Rechazado")}
                            disabled={updatingId === c.id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-100 hover:bg-red-200 border border-red-200 px-4 py-2 text-xs font-black text-red-700 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              {busClaims.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <Bus className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                  <p className="font-semibold">No hay boletos pendientes de validación todavía.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
