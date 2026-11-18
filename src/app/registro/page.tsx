"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck,
  CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Gift,
  Plane, Compass, Smartphone, CreditCard, Calendar, MapPin,
  Camera, Upload
} from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { DEFAULT_REWARDS_CONFIG, subscribeGlobalRewardsConfig } from "@/lib/rewards-config";
import { GlobalRewardsConfig } from "@/types/rewards";


export default function RegistroPage() {
  const router = useRouter();

  // Paso actual del onboarding: 1 (Cuenta), 2 (Identidad), 3 (Éxito & Tarjeta Rewards)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Paso 1: Cuenta y Acceso
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Paso 2: Identidad & Perfil Viajero (Copia exacta de CompleteProfileScreen de la App)
  const [docType, setDocType] = useState<"DNI" | "Pasaporte">("DNI");
  const [docNumber, setDocNumber] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "X">("M");
  const [nationality, setNationality] = useState("Argentina");
  const [city, setCity] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Política Global de Rewards (Concorde 360)
  const [rewardsConfig, setRewardsConfig] = useState<GlobalRewardsConfig>(DEFAULT_REWARDS_CONFIG);
  const [awardedPoints, setAwardedPoints] = useState<number>(DEFAULT_REWARDS_CONFIG.welcomePointsBonus);

  // Estados de carga y error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeGlobalRewardsConfig((cfg) => {
      setRewardsConfig(cfg);
      setAwardedPoints(cfg.welcomePointsBonus);
    });
    return () => unsub();
  }, []);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        setError("La imagen no debe superar los 2.5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  // Manejo de paso 1 a paso 2
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Por favor ingresá tu nombre y apellido completo.");
      return;
    }
    if (!phone.trim()) {
      setError("Por favor ingresá tu número de teléfono / WhatsApp.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Por favor ingresá un correo electrónico válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setStep(2);
  };

  // Manejo de finalización de registro y creación en Firebase
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!docNumber.trim()) {
      setError("Por favor ingresá tu número de documento.");
      return;
    }
    if (!termsAccepted) {
      setError("Debes aceptar los Términos y Condiciones para continuar.");
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // 1. Crear usuario en Firebase Auth
      let userCred;
      try {
        userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } catch (authErr: any) {
        if (authErr.code === "auth/email-already-in-use") {
          setError("Este correo electrónico ya está registrado. Podés iniciar sesión directamente.");
          setLoading(false);
          return;
        }
        throw authErr;
      }

      if (userCred?.user) {
        if (photoUrl) {
          try {
            await updateProfile(userCred.user, {
              displayName: fullName.trim(),
              photoURL: photoUrl,
            });
          } catch (e) {
            console.warn("Could not set photoURL on auth user:", e);
          }
        } else {
          await updateProfile(userCred.user, {
            displayName: fullName.trim(),
          });
        }

        const totalBonus = photoUrl 
          ? (rewardsConfig.welcomePointsBonus + rewardsConfig.profilePhotoBonusPoints) 
          : rewardsConfig.welcomePointsBonus;
        setAwardedPoints(totalBonus);

        // 2. Crear documento en Firestore (colección users) idéntico a la app móvil
        const userRef = doc(db, "users", userCred.user.uid);
        await setDoc(userRef, {
          customerName: fullName.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          customerLevel: 1,
          customerStatus: "Cliente",
          rewardsPoints: totalBonus,
          photoURL: photoUrl || null,
          hasReceivedPhotoBonus: Boolean(photoUrl),
          walletBalance: 0,
          document: {
            type: docType,
            number: docNumber.trim(),
            nationality: nationality,
          },
          dob: dob || null,
          gender: gender,
          city: city.trim() || "Argentina",
          isAdmin: false,
          role: "passenger",
          createdAt: Timestamp.now(),
        });

        // Guardar sesión ligera
        document.cookie = "ta_session=1; path=/; max-age=31536000; SameSite=Lax";
        if (typeof window !== "undefined") {
          localStorage.setItem("travelapp_last_email", cleanEmail);
        }

        // Avanzar a la pantalla de felicitaciones / onboarding finalizado
        setStep(3);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("No se pudo completar el registro. Verificá tu conexión a internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#071C3D] flex flex-col items-center justify-center px-3 py-6 sm:p-6 overflow-x-hidden w-full font-sans">
      
      {/* Fondo Azul Tech con resplandor sutil */}
      <div className="absolute inset-0 bg-radial-gradient from-[#0A2A5B]/90 via-[#071C3D] to-[#040E1F] pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Barra Superior */}
      <div className="w-full max-w-lg relative z-10 mb-4 flex items-center justify-between">
        <Link
          href="/landing/ecosistema"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Inicio</span>
        </Link>
        <span className="text-[11px] font-bold text-slate-400">
          Onboarding Oficial TravelApp
        </span>
      </div>

      {/* Tarjeta Flotante Blanca - Copia fiel del Onboarding de la App */}
      <div className="w-full max-w-lg relative z-10 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-9 shadow-2xl border border-slate-100">
        
        {/* Cabecera de Marca con Travis en primer plano */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <Link href="/landing/ecosistema" className="inline-block">
              <span className="text-3xl font-black tracking-tight text-[#0A2A5B]">
                Travel<span className="text-[#FF5A19]">App</span>
              </span>
            </Link>
          </div>

          {/* Avatar Circular de Travis con halo naranja */}
          <div className="relative mx-auto my-3 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#FF5A19] to-[#FF7A00] p-1 shadow-lg shadow-orange-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-[#0A2A5B] flex items-center justify-center text-white overflow-hidden">
              <span className="text-2xl sm:text-3xl">🤖</span>
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {step === 1 && "Crear mi Cuenta de Viajero"}
            {step === 2 && "Datos de Identidad & Pasajero"}
            {step === 3 && "¡Bienvenido a Bordo!"}
          </h1>

          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {step === 1 && `Completá tus datos de acceso para ingresar al ecosistema y recibir tus ${rewardsConfig.welcomePointsBonus} Puntos Rewards de bienvenida.`}
            {step === 2 && "Completá tu documentación para emitir tus pasajes y traslados de forma inmediata."}
            {step === 3 && `Tu membresía está activa y acreditamos ${awardedPoints} Puntos Rewards en tu billetera.`}
          </p>

          {/* Barra de Progreso del Onboarding (3 Pasos) */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? "w-10 bg-[#FF5A19]" : "w-6 bg-slate-200"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? "w-10 bg-[#FF5A19]" : "w-6 bg-slate-200"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 3 ? "w-10 bg-emerald-500" : "w-6 bg-slate-200"}`} />
          </div>
        </div>

        {/* Notificación de Error */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
            <span className="shrink-0 text-red-600 font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── PASO 1: CUENTA Y CONTACTO ── */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nombre y Apellido Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Manuel Pérez"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Número de Celular / WhatsApp *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 9 11 1234 5678"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caract."
                    required
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Confirmar Clave *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetir clave"
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#FF5A19] hover:bg-[#e04c10] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <span>Continuar a Identidad de Pasajero</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ── PASO 2: DOCUMENTACIÓN & PERFIL VIAJERO (COMPLETE PROFILE DE LA APP) ── */}
        {step === 2 && (
          <form onSubmit={handleCompleteRegistration} className="space-y-3.5">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tipo Doc. *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as "DNI" | "Pasaporte")}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                >
                  <option value="DNI">DNI</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Número de Documento *
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="38.123.456"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Fecha de Nacimiento
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Género
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "M" | "F" | "X")}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="X">No binario / Otro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nacionalidad
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="Argentina"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Ciudad / Provincia
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="San Miguel de Tucumán"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0A2A5B] outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Foto de Perfil Opcional con Recompensa de Puntos */}
            <div className="rounded-2xl border-2 border-dashed border-[#FF5A19]/30 bg-orange-50/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#0A2A5B] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#FF5A19]" />
                  Foto de Perfil (Opcional)
                </span>
                <span className="rounded-full bg-[#FF5A19] text-white px-2 py-0.5 text-[9px] font-black">
                  +{rewardsConfig.profilePhotoBonusPoints} PUNTOS EXTRA
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Subí tu foto para verificar tu cuenta de viajero y sumar <strong>+{rewardsConfig.profilePhotoBonusPoints} Puntos Rewards</strong> adicionales a tu saldo.
              </p>
              
              <div className="flex items-center gap-3 pt-1">
                {photoUrl ? (
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#FF5A19] shadow-sm shrink-0">
                    <img src={photoUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                    <User className="w-7 h-7" />
                  </div>
                )}
                
                <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer shadow-sm transition">
                  <Upload className="w-3.5 h-3.5 text-[#FF5A19]" />
                  <span>{photoUrl ? "Cambiar foto" : "Subir foto de perfil"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Aceptación de términos */}
            <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#FF5A19] focus:ring-[#FF5A19]"
              />
              <span className="text-[11px] text-slate-500 leading-tight">
                Declaro que los datos ingresados son verídicos y acepto los{" "}
                <Link href="/landing/ecosistema#terminos" className="text-[#0A2A5B] font-bold underline">
                  Términos y Condiciones
                </Link>{" "}
                del Club TravelApp.
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
              >
                Volver
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <span>Registrando tu cuenta...</span>
                ) : (
                  <>
                    <span>Activar mi Cuenta & Membresía</span>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── PASO 3: TARJETA DIGITAL REWARDS & ONBOARDING FINALIZADO ── */}
        {step === 3 && (
          <div className="space-y-6 animate-in zoom-in-95 duration-200">
            {/* Tarjeta de Membresía Digital TravelApp Rewards */}
            <div className="relative rounded-3xl p-6 bg-gradient-to-tr from-[#0A2A5B] via-[#0E387A] to-[#1E4E9E] text-white shadow-2xl border border-blue-400/30 overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-[#FF5A19]/30 rounded-full blur-2xl" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-amber-300">
                    Membresía Digital Oficial
                  </span>
                  <h3 className="text-xl font-black tracking-tight">TravelApp Pass</h3>
                </div>
                <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#FF5A19]" />
                  <span>Nivel Silver</span>
                </div>
              </div>

              <div className="space-y-1 mb-6 relative z-10">
                <p className="text-[10px] uppercase font-bold text-blue-200">Titular de Cuenta</p>
                <p className="text-lg font-black tracking-wide truncate">{fullName || "Nuevo Viajero"}</p>
                <p className="text-xs text-blue-300 font-medium">
                  {docType}: {docNumber || "Pendiente"} · {email}
                </p>
              </div>

              <div className="pt-4 border-t border-white/15 flex items-center justify-between relative z-10">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-200">Puntos Acreditados</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Gift className="w-4 h-4 text-[#FF5A19]" />
                    <span className="text-xl font-black text-amber-300">{awardedPoints} Pts</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-blue-200">Estado</span>
                  <p className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verificada</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Mensaje de Bienvenida de Travis */}
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex items-start gap-3">
              <span className="text-2xl shrink-0">🤖</span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                <span className="font-bold text-[#0A2A5B]">¡Felicitaciones {fullName.split(" ")[0]}!</span> Tu cuenta ya está lista. Tus <strong className="text-[#FF5A19]">{awardedPoints} Puntos TravelRewards</strong> ya están disponibles para ser canjeados en descuentos y traslados.
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2.5">
              <Link
                href="/mi-perfil"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#FF5A19] hover:bg-[#e04d12] text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all"
              >
                <User className="w-4 h-4" />
                <span>Completar Mi Perfil de Viajero</span>
              </Link>

              <Link
                href="/marketplace"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0A2A5B] hover:bg-[#071d3f] text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all"
              >
                <Plane className="w-4 h-4" />
                <span>Explorar travelmarket (Turismo Emisivo)</span>
              </Link>

              <Link
                href="/landing/rewards"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs transition"
              >
                <Gift className="w-4 h-4 text-[#FF5A19]" />
                <span>Ver Catálogo de Beneficios Rewards</span>
              </Link>
            </div>
          </div>
        )}

        {/* Pie: Iniciar Sesión para usuarios existentes */}
        {step < 3 && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              ¿Ya tenés una cuenta registrada?{" "}
              <Link href="/ingresar" className="font-bold text-[#FF5A19] hover:underline">
                Iniciá sesión acá
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Legal Footer */}
      <p className="relative z-10 text-[11px] text-slate-400 mt-6 text-center">
        Todos los derechos reservados por TravelApp s.a.s. - 2026
      </p>
    </div>
  );
}
