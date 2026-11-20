"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Gift,
  ArrowLeft,
  Search,
  Filter,
  X,
  Sparkles,
  Star,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Award,
  Plane,
  Coffee,
  ShoppingBag,
  Zap,
  Heart,
} from "lucide-react";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ════════════════════════════════════════════════════════════
   TIPOS
════════════════════════════════════════════════════════════ */
interface RewardItem {
  id: string;
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

/* ════════════════════════════════════════════════════════════
   ICONOS INLINE
════════════════════════════════════════════════════════════ */
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

const CategoryIcon = ({ category }: { category: string }) => {
  if (category?.toLowerCase().includes("viaje") || category?.toLowerCase().includes("traslado")) return <Plane className="h-4 w-4" />;
  if (category?.toLowerCase().includes("gastro") || category?.toLowerCase().includes("comida")) return <Coffee className="h-4 w-4" />;
  if (category?.toLowerCase().includes("retail") || category?.toLowerCase().includes("compra")) return <ShoppingBag className="h-4 w-4" />;
  if (category?.toLowerCase().includes("premio") || category?.toLowerCase().includes("recompensa")) return <Star className="h-4 w-4" />;
  return <Gift className="h-4 w-4" />;
};

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function RewardsCanjesClient() {
  const [items, setItems] = useState<RewardItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [errorItems, setErrorItems] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [pointsSortOrder, setPointsSortOrder] = useState<"none" | "asc" | "desc">("none");

  // Modal detalle
  const [activeItemDetail, setActiveItemDetail] = useState<RewardItem | null>(null);

  // Formulario de solicitud de canje
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  // Cargar ítems en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "reward_items"),
      (snapshot) => {
        const list: RewardItem[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as RewardItem);
        });
        setItems(list);
        setErrorItems(null);
        setLoadingItems(false);
      },
      (error) => {
        console.error("Error cargando catálogo de canjes:", error);
        setErrorItems(error.message || "Error de conexión o permisos.");
        setLoadingItems(false);
      }
    );
    return () => unsub();
  }, []);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.partner?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((i) => i.category === selectedCategory);
    }

    if (selectedAvailability !== "all") {
      result = result.filter((i) => i.availability === selectedAvailability);
    }

    if (pointsSortOrder === "asc") {
      result.sort((a, b) => a.pointsRequired - b.pointsRequired);
    } else if (pointsSortOrder === "desc") {
      result.sort((a, b) => b.pointsRequired - a.pointsRequired);
    }

    return result;
  }, [items, searchQuery, selectedCategory, selectedAvailability, pointsSortOrder]);

  const handleRedemptionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemDetail) return;
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      await addDoc(collection(db, "reward_redemptions"), {
        itemId: activeItemDetail.id,
        itemTitle: activeItemDetail.title,
        pointsRequired: activeItemDetail.pointsRequired,
        category: activeItemDetail.category,
        nombreSolicitante: requesterName,
        emailSolicitante: requesterEmail,
        telefonoSolicitante: requesterPhone,
        estado: "Pendiente",
        createdAt: new Date().toISOString(),
      });
      setSubmitStatus("success");
      setRequesterName("");
      setRequesterEmail("");
      setRequesterPhone("");
    } catch (err) {
      console.error("Error al solicitar canje:", err);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-lg">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/landing/rewards"
              className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-slate-700 transition-colors"
              title="Volver a TravelApp Rewards"
            >
              <ArrowLeft className="h-5 w-5 text-violet-400" />
            </a>
            <img src="/assets/rewards_blanco.svg" alt="TravelApp Rewards" className="h-8 w-auto object-contain" />
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-black tracking-wide">
            <Sparkles className="h-3.5 w-3.5" /> CATÁLOGO DE CANJES
          </span>
        </div>
      </header>

      {/* ══ PORTADA BANNER ══ */}
      <section className="bg-gradient-to-r from-violet-900 via-slate-900 to-fuchsia-950 text-white py-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600 via-slate-900 to-slate-950" />
        <div className="mx-auto max-w-7xl relative z-10 text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Catálogo de <span className="text-violet-400">Canjes y Beneficios</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Usá tus puntos Travel para acceder a viajes gratis, descuentos exclusivos y beneficios en toda la red de partners del ecosistema TravelApp.
          </p>
        </div>
      </section>

      {/* ══ PANEL PRINCIPAL ══ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* FILTROS */}
        <aside className="lg:col-span-3 space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" /> Filtrar Canjes
            </h2>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedAvailability("all");
                setPointsSortOrder("none");
              }}
              className="text-[10px] font-bold text-violet-600 hover:text-violet-700 uppercase"
            >
              Limpiar
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-600 block">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-700 focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="all">Todas las categorías</option>
                {uniqueCategories.map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-600 block">Disponibilidad</label>
              <select
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-700 focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="all">Cualquier estado</option>
                <option value="Disponible">Disponible</option>
                <option value="Limitado">Limitado</option>
                <option value="Agotado">Agotado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-600 block">Ordenar por Puntos</label>
              <select
                value={pointsSortOrder}
                onChange={(e) => setPointsSortOrder(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-700 focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="none">Sin ordenar</option>
                <option value="asc">Menor a Mayor puntos</option>
                <option value="desc">Mayor a Menor puntos</option>
              </select>
            </div>
          </div>
        </aside>

        {/* GRILLA DE ÍTEMS */}
        <section className="lg:col-span-9 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar beneficio, partner, categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
            />
          </div>

          {loadingItems ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sincronizando Catálogo de Canjes...</p>
            </div>
          ) : errorItems ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-red-200 p-8 space-y-3 shadow-sm">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-black text-red-700">Error al cargar el catálogo</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                No pudimos conectar con la base de datos. Aseguráte de habilitar los permisos de lectura para la colección{" "}
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">reward_items</span>.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
              <Gift className="h-10 w-10 text-violet-400 mx-auto" />
              <h3 className="text-lg font-black text-slate-800">No encontramos canjes disponibles</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                No hay ítems en el sistema o ninguno coincide con los filtros actuales. Intentá reestablecer los filtros.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const isAvailable = item.availability === "Disponible" || item.availability === "Limitado";
                return (
                  <div
                    key={item.id}
                    className="flex flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    {/* Imagen */}
                    <div className="h-44 w-full bg-gradient-to-br from-violet-100 to-fuchsia-100 relative overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Gift className="h-16 w-16 text-violet-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />
                      {item.badge && (
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-violet-600 text-[10px] font-black text-white uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                      <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${
                        item.availability === "Disponible" ? "bg-emerald-500" :
                        item.availability === "Limitado" ? "bg-amber-500" : "bg-slate-500"
                      }`}>
                        {item.availability}
                      </span>
                    </div>

                    {/* Contenido */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          <CategoryIcon category={item.category} />
                          {item.category}
                          {item.partner && (
                            <span className="ml-auto bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{item.partner}</span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-slate-800 leading-snug line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>

                      <div className="border-t border-slate-100 pt-3 space-y-3">
                        {/* Puntos requeridos */}
                        <div className="flex items-center justify-between">
                          <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-2.5 flex items-center gap-2 flex-1 mr-2">
                            <Award className="h-4 w-4 text-violet-600" />
                            <div>
                              <span className="text-[9px] font-black text-violet-700 uppercase block tracking-wider leading-none">Puntos necesarios</span>
                              <span className="text-base font-black text-violet-600 mt-0.5 block">
                                {item.pointsRequired?.toLocaleString("es-AR")} pts
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => { setActiveItemDetail(item); setSubmitStatus("idle"); }}
                            disabled={!isAvailable}
                            className={`rounded-xl px-3 py-2 text-xs font-black text-white transition-colors shadow-sm flex-shrink-0 ${
                              isAvailable
                                ? "bg-violet-600 hover:bg-fuchsia-600"
                                : "bg-slate-300 cursor-not-allowed"
                            }`}
                          >
                            {isAvailable ? "Canjear" : "Agotado"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ══ FOOTER ══ */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <img src="/assets/rewards_blanco.svg" alt="TravelApp Rewards" className="h-7 w-auto object-contain" />
          <p>© 2026 TravelApp Rewards. Una marca de TravelApp s.a.s.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-300">Términos de Servicio</a>
            <a href="#" className="hover:text-slate-300">Políticas de Privacidad</a>
          </div>
        </div>
      </footer>

      {/* ══ MODAL DETALLE + SOLICITUD DE CANJE ══ */}
      {activeItemDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setActiveItemDetail(null); setSubmitStatus("idle"); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Imagen */}
            {activeItemDetail.imageUrl && (
              <div className="h-48 w-full rounded-2xl overflow-hidden bg-slate-100 mb-4">
                <img src={activeItemDetail.imageUrl} alt={activeItemDetail.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <CategoryIcon category={activeItemDetail.category} />
              </div>
              <div>
                <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider">{activeItemDetail.category}{activeItemDetail.partner && ` · ${activeItemDetail.partner}`}</p>
                <h3 className="text-xl font-black text-slate-900">{activeItemDetail.title}</h3>
              </div>
            </div>

            <p className="text-sm text-slate-500 leading-relaxed mb-4">{activeItemDetail.description}</p>
            {activeItemDetail.details && (
              <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">{activeItemDetail.details}</p>
            )}

            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-6">
              <Award className="h-5 w-5 text-violet-600" />
              <div>
                <p className="text-[10px] font-black text-violet-700 uppercase tracking-wider">Puntos necesarios para canjear</p>
                <p className="text-2xl font-black text-violet-600">{activeItemDetail.pointsRequired?.toLocaleString("es-AR")} pts</p>
              </div>
            </div>

            {submitStatus === "success" ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
                <h4 className="text-lg font-black text-slate-900">¡Solicitud enviada!</h4>
                <p className="text-sm text-slate-500">Vamos a revisar tu solicitud de canje y te contactaremos pronto para confirmar los detalles.</p>
                <button
                  onClick={() => { setActiveItemDetail(null); setSubmitStatus("idle"); }}
                  className="mt-4 w-full rounded-xl bg-violet-600 py-3 text-sm font-black text-white hover:bg-fuchsia-600 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleRedemptionRequest} className="space-y-4">
                <h4 className="text-base font-black text-slate-800 border-t border-slate-100 pt-4">Solicitar este canje</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Nombre completo *</label>
                  <input
                    type="text"
                    required
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Ej: María González"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    placeholder="+54 9 381 000-0000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                  />
                </div>
                {submitStatus === "error" && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    Hubo un error al enviar tu solicitud. Por favor intentá de nuevo.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-violet-600 hover:bg-fuchsia-600 py-3.5 text-sm font-black text-white transition-all disabled:opacity-50 shadow-lg shadow-violet-200"
                >
                  {isSubmitting ? "Enviando solicitud..." : "Solicitar Canje"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
