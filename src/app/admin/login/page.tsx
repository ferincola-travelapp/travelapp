"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plane, Lock, Mail, AlertCircle, Fingerprint } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isBiometricsAvailable, registerBiometric, verifyBiometric, getSavedBiometricEmail } from "@/lib/biometrics";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminLoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = getSavedBiometricEmail() || localStorage.getItem("travelapp_last_email");
      if (savedEmail) {
        setEmail(savedEmail);
      }
      isBiometricsAvailable().then((supported) => {
        setBiometricsAvailable(supported);
      });
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const isCorporateEmail = (emailStr: string): boolean => {
    const normalized = emailStr.trim().toLowerCase();
    if (normalized === "ferincola@gmail.com") return true;
    return normalized.endsWith("@travelapp.ar") || normalized.endsWith("@travelcab.ar");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!isCorporateEmail(trimmedEmail)) {
      setError(
        "Acceso Denegado. El Centro de Comando Global Concorde 360 es exclusivo para correos corporativos oficiales (@travelapp.ar o @travelcab.ar)."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await login(trimmedEmail, password);
      if (typeof window !== "undefined") {
        localStorage.setItem("travelapp_last_email", trimmedEmail);
        if (window.PublicKeyCredential) {
          registerBiometric(trimmedEmail).catch(() => {});
        }
      }
      router.replace("/");
    } catch (err: unknown) {
      const code =
        err != null && typeof err === "object" && "code" in err
          ? (err as { code: unknown }).code
          : null;

      switch (code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Credenciales incorrectas. Verificá tu email y contraseña.");
          break;
        case "auth/too-many-requests":
          setError("Demasiados intentos fallidos. Intentá más tarde.");
          break;
        case "auth/network-request-failed":
          setError("Sin conexión a internet. Verificá tu red.");
          break;
        default:
          setError("Ocurrió un error al iniciar sesión. Intentá nuevamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await verifyBiometric();
      if (result.success && result.email) {
        document.cookie = "ta_session=1; path=/; max-age=31536000; SameSite=Lax";
        setSuccess("¡Identidad biométrica confirmada! Ingresando...");
        setTimeout(() => {
          router.replace("/");
        }, 300);
      } else {
        if (email.trim()) {
          const registered = await registerBiometric(email.trim());
          if (registered) {
            setSuccess("¡Huella / Face ID registrado con éxito para este dispositivo!");
          } else {
            setError("No se pudo validar la biometría. Por favor ingresá tu contraseña.");
          }
        } else {
          setError("Ingresá tu correo electrónico para registrar o validar tu huella / Face ID.");
        }
      }
    } catch (err) {
      console.error("Biometrics error:", err);
      setError("Error al procesar la biometría en este dispositivo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Por favor, ingresá tu correo electrónico en la casilla para poder enviarte el enlace de recuperación.");
      setSuccess(null);
      return;
    }
    setError(null);
    setSuccess(null);
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess("¡Correo de recuperación enviado! Revisá tu bandeja de entrada y spam.");
    } catch (err: any) {
      console.error("Error resetting password:", err);
      setError("No pudimos enviar el correo de recuperación. Asegurate de que el correo esté registrado.");
    } finally {
      setSendingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0a2a5b] border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen flex-col justify-between bg-gradient-to-b from-white via-[#F5F7FA] to-[#ECEFF4] text-slate-800 px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
      style={{ fontFamily: "'Quicksand', sans-serif" }}
    >
      {/* Detalle sutil superior en azul institucional */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#0a2a5b] z-20" />

      {/* Parte superior: Logo grande de TravelApp centrado */}
      <header className="w-full flex flex-col items-center pt-4 sm:pt-6 pb-2">
        <img
          src="/assets/travelapp_original.svg"
          alt="TravelApp"
          className="h-16 sm:h-20 md:h-24 w-auto object-contain select-none"
        />
        <div className="mt-3 h-0.5 w-12 rounded-full bg-[#0a2a5b]/25" />
      </header>

      {/* Parte central: Casilleros de credenciales (sin tarjetas flotantes) */}
      <main className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center py-6 sm:py-8">
        <div className="text-center mb-7">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0a2a5b] tracking-tight">
            Acceso Administrativo
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Ingresá tus credenciales corporativas
          </p>
        </div>

        {error && (
          <div className="mb-5 px-3.5 py-2.5 rounded-lg border-l-4 border-red-500 bg-red-50/80 text-xs font-medium text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 px-3.5 py-2.5 rounded-lg border-l-4 border-emerald-600 bg-emerald-50/80 text-xs font-medium text-emerald-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-bold text-[#0a2a5b] mb-1.5"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#0a2a5b]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@travelapp.ar"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300/80 bg-white/80 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#0a2a5b] focus:ring-2 focus:ring-[#0a2a5b]/10 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold text-[#0a2a5b] mb-1.5"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#0a2a5b]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-300/80 bg-white/80 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#0a2a5b] focus:ring-2 focus:ring-[#0a2a5b]/10 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0a2a5b] transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={sendingReset}
                className="text-xs font-semibold text-[#0a2a5b] hover:underline underline-offset-4 transition disabled:opacity-50 cursor-pointer"
              >
                {sendingReset ? "Enviando enlace..." : "Olvidé mi contraseña"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white font-bold text-sm tracking-wide transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? "Ingresando..." : "Iniciar Sesión"}
          </button>

          {biometricsAvailable && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg border border-[#0a2a5b]/20 hover:border-[#0a2a5b]/40 text-[#0a2a5b] font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Fingerprint className="w-4 h-4" />
              <span>Ingresar con biometría</span>
            </button>
          )}
        </form>
      </main>

      {/* Parte inferior: 3 Logos del ecosistema + Soporte + Footer */}
      <footer className="w-full max-w-2xl mx-auto flex flex-col items-center gap-5 pt-4 pb-2">
        {/* 3 Logos del ecosistema: Experience (izq), TravelCab (centro), Rewards (der) */}
        <div className="w-full grid grid-cols-3 items-center justify-items-center gap-4 sm:gap-8 py-2 border-t border-slate-200/80 pt-5">
          <div className="flex items-center justify-center">
            <img
              src="/assets/experience_original.svg"
              alt="TravelApp Experience"
              className="h-9 sm:h-11 md:h-12 w-auto object-contain opacity-90 hover:opacity-100 transition"
            />
          </div>
          <div className="flex items-center justify-center">
            <img
              src="/assets/travelcab_original.svg"
              alt="TravelCab"
              className="h-9 sm:h-11 md:h-12 w-auto object-contain opacity-90 hover:opacity-100 transition"
            />
          </div>
          <div className="flex items-center justify-center">
            <img
              src="/assets/rewards_original.svg"
              alt="TravelApp Rewards"
              className="h-9 sm:h-11 md:h-12 w-auto object-contain opacity-90 hover:opacity-100 transition"
            />
          </div>
        </div>

        {/* Botón de texto Contactar a soporte */}
        <a
          href="mailto:soporte@travelapp.ar"
          className="text-xs sm:text-sm font-semibold text-[#0a2a5b] hover:underline underline-offset-4 transition"
        >
          Contactar a soporte
        </a>

        {/* Footer */}
        <p className="text-[11px] sm:text-xs font-bold text-[#0a2a5b]/80 text-center tracking-wide">
          TravelApp - 2026 - Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
