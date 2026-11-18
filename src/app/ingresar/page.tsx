"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  Plane,
  ShieldCheck,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const BLOCKED_DASHBOARD_PREFIXES = [
  "/vision-general",
  "/crm",
  "/hr",
  "/admin",
  "/experiences",
  "/finance",
  "/marketing",
  "/operations",
  "/logistics",
  "/settings",
  "/travelcab",
  "/afiliados/portal",
  "/ai-copilot",
  "/kpi",
  "/users",
  "/messages",
  "/audit",
  "/cms",
  "/supervisor",
];

function resolveSafePublicNext(rawNext: string | null): string {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return "/mi-perfil";
  }
  const lower = rawNext.toLowerCase();
  if (BLOCKED_DASHBOARD_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return "/mi-perfil";
  }
  return rawNext;
}

function PublicIngresarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = resolveSafePublicNext(searchParams.get("next"));

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace(safeNext);
      }
    });
    return () => unsub();
  }, [router, safeNext]);

  const normalizeEmail = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      const cleanDigits = trimmed.replace(/\D/g, "");
      return `${cleanDigits}@pasajero.travelapp.ar`;
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!emailOrPhone.trim() || !password) {
      setError("Por favor completá tu correo o teléfono y tu contraseña.");
      return;
    }

    const finalEmail = normalizeEmail(emailOrPhone);
    setIsSubmitting(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, finalEmail, password);
      if (userCred.user) {
        document.cookie = "ta_session=1; path=/; max-age=31536000; SameSite=Lax";
        if (typeof window !== "undefined") {
          localStorage.setItem("travelapp_last_email", finalEmail);
        }
        setSuccess("¡Sesión iniciada! Abriendo tu perfil de viajero...");
        setTimeout(() => {
          router.replace(safeNext);
        }, 350);
      }
    } catch (authErr: any) {
      if (
        authErr?.code === "auth/user-not-found" ||
        authErr?.code === "auth/invalid-credential"
      ) {
        setError(
          "Credenciales incorrectas o cuenta inexistente. Podés crear tu perfil tocando 'Crear Perfil'."
        );
      } else if (authErr?.code === "auth/wrong-password") {
        setError("Contraseña incorrecta. Verificá tu clave o recuperala abajo.");
      } else {
        setError("No pudimos iniciar sesión. Verificá tus datos o tu conexión.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setSuccess(null);
    if (!emailOrPhone.trim() || !emailOrPhone.includes("@")) {
      setError("Ingresá tu correo electrónico arriba para enviarte el enlace de recuperación.");
      return;
    }
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, emailOrPhone.trim().toLowerCase());
      setSuccess("Te enviamos un correo para restablecer tu contraseña.");
    } catch {
      setError("No pudimos enviar el correo de recuperación. Verificá la dirección.");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">
      <header className="w-full bg-[#0A2A5B] text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#FF5A19] flex items-center justify-center shadow-sm">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white">TravelApp</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">
                Mi Cuenta Viajero
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/registro"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FF5A19] hover:bg-[#e04d12] text-white text-xs font-bold transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Crear Perfil</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Volver al sitio</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-7 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#0A2A5B]/10 flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6 text-[#0A2A5B]" />
            </div>
            <h1 className="text-2xl font-black text-[#0A2A5B]">Ingresar a Mi Perfil</h1>
            <p className="text-xs text-slate-500 mt-1">
              Acceso exclusivo para viajeros y clientes del ecosistema TravelApp
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email o Teléfono
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="tu@email.com o 3815551234"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-[#0A2A5B] focus:ring-2 focus:ring-[#0A2A5B]/10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Contraseña</label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={sendingReset}
                  className="text-[11px] font-semibold text-[#FF5A19] hover:underline disabled:opacity-50"
                >
                  {sendingReset ? "Enviando..." : "¿Olvidaste tu clave?"}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-[#0A2A5B] focus:ring-2 focus:ring-[#0A2A5B]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#0A2A5B] hover:bg-[#071f44] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>{isSubmitting ? "Ingresando..." : "Ingresar a Mi Perfil"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500">¿Todavía no tenés tu Perfil de Viajero?</p>
            <Link
              href="/registro"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[#FF5A19] text-[#FF5A19] hover:bg-[#FF5A19] hover:text-white font-bold text-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Perfil Nuevo</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PublicIngresarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f6f9]" />}>
      <PublicIngresarContent />
    </Suspense>
  );
}
