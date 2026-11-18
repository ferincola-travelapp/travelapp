"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Users,
  FileText,
  HeartPulse,
  Sliders,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Camera,
  Plane,
  ArrowLeft,
  LogOut,
  Save,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface FamilyMember {
  id: string;
  fullName: string;
  relationship: string;
  documentType: "DNI" | "Pasaporte";
  documentNumber: string;
  passportExpiryDate?: string;
  dob: string;
}

type ProfileSection = "identity" | "family" | "fiscal" | "medical" | "prefs";

export default function PublicMiPerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>("identity");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Identidad y Domicilio
  const [fullName, setFullName] = useState("");
  const [docType, setDocType] = useState<"DNI" | "Pasaporte">("DNI");
  const [docNumber, setDocNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [nationality, setNationality] = useState("Argentina");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Otro");
  const [occupation, setOccupation] = useState("");
  const [dniFrontPhoto, setDniFrontPhoto] = useState<string | null>(null);
  const [dniBackPhoto, setDniBackPhoto] = useState<string | null>(null);
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);

  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // 2. Fiscal (AFIP)
  const [taxCondition, setTaxCondition] = useState<
    "Consumidor Final" | "Monotributista" | "Responsable Inscripto" | "Exento"
  >("Consumidor Final");
  const [cuitCuil, setCuitCuil] = useState("");
  const [businessName, setBusinessName] = useState("");

  // 3. Médico y Emergencia
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [dietary, setDietary] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [mobilityAssistance, setMobilityAssistance] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [insuranceCompany, setInsuranceCompany] = useState("");

  // 4. Grupo Familiar
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [mName, setMName] = useState("");
  const [mRel, setMRel] = useState("Hijo/a");
  const [mDocType, setMDocType] = useState<"DNI" | "Pasaporte">("DNI");
  const [mDocNum, setMDocNum] = useState("");
  const [mPassportExp, setMPassportExp] = useState("");
  const [mDob, setMDob] = useState("");

  // 5. Preferencias
  const [seatPref, setSeatPref] = useState<"Ventana" | "Pasillo" | "Indistinto">("Indistinto");
  const [roomPref, setRoomPref] = useState<"Matrimonial" | "Twin" | "Individual">("Matrimonial");
  const [frequentFlyerProgram, setFrequentFlyerProgram] = useState("");
  const [frequentFlyerNumber, setFrequentFlyerNumber] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setFullName(data.customerName || firebaseUser.displayName || "");
          if (data.document) {
            setDocType(data.document.type || "DNI");
            setDocNumber(data.document.number || "");
            setPassportExpiry(data.document.expiryDate || "");
            setNationality(data.document.nationality || "Argentina");
            if (data.document.frontUrl) setDniFrontPhoto(data.document.frontUrl);
            if (data.document.backUrl) setDniBackPhoto(data.document.backUrl);
            if (data.document.passportUrl) setPassportPhoto(data.document.passportUrl);
          }
          if (data.passport) setPassportNumber(data.passport);
          if (data.dob) setDob(data.dob);
          if (data.gender) setGender(data.gender);
          if (data.occupation) setOccupation(data.occupation);

          if (data.address) {
            setStreet(data.address.street || "");
            setStreetNumber(data.address.number || "");
            setApartment(data.address.apartment || "");
            setCity(data.address.city || "");
            setProvince(data.address.province || "");
            setPostalCode(data.address.postalCode || "");
          }

          if (data.taxData) {
            setTaxCondition(data.taxData.taxCondition || "Consumidor Final");
            setCuitCuil(data.taxData.cuitCuil || "");
            setBusinessName(data.taxData.businessName || "");
          }

          if (data.emergencyContact) {
            setEmergencyName(data.emergencyContact.name || "");
            setEmergencyPhone(data.emergencyContact.phone || "");
            setEmergencyRelation(data.emergencyContact.relationship || "");
          }

          if (data.medicalSafety) {
            setDietary(data.medicalSafety.dietaryRestrictions || "");
            setAllergies(data.medicalSafety.allergies || "");
            setMedicalConditions(data.medicalSafety.medicalConditions || "");
            setMobilityAssistance(Boolean(data.medicalSafety.mobilityAssistance));
            setHasInsurance(Boolean(data.medicalSafety.hasTravelInsurance));
            setInsuranceCompany(data.medicalSafety.insuranceCompany || "");
          } else {
            if (data.allergies) setAllergies(data.allergies);
            if (data.dietaryRestrictions) setDietary(data.dietaryRestrictions);
          }

          if (Array.isArray(data.familyMembers)) {
            setFamilyMembers(data.familyMembers);
          }

          if (data.preferences) {
            setSeatPref(data.preferences.seatPreference || "Indistinto");
            setRoomPref(data.preferences.roomPreference || "Matrimonial");
            setFrequentFlyerProgram(data.preferences.frequentFlyerProgram || "");
            setFrequentFlyerNumber(data.preferences.frequentFlyerNumber || "");
          }
        } else {
          setFullName(firebaseUser.displayName || "");
        }
      } catch (err) {
        console.error("Error loading traveler profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const calculateProgress = () => {
    let score = 0;
    if (fullName && (docNumber || passportNumber)) score += 30;
    if (dob && gender) score += 15;
    if (city && street) score += 15;
    if (emergencyName && emergencyPhone) score += 15;
    if (cuitCuil || taxCondition) score += 10;
    if (familyMembers.length > 0) score += 15;
    return Math.min(score, 100);
  };

  const progress = calculateProgress();

  const handleImageUpload = (
    file: File,
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetMemberForm = () => {
    setEditingMemberId(null);
    setMName("");
    setMRel("Hijo/a");
    setMDocType("DNI");
    setMDocNum("");
    setMPassportExp("");
    setMDob("");
    setShowFamilyForm(false);
  };

  const handleSaveFamilyMember = () => {
    if (!mName.trim() || !mDocNum.trim()) {
      setToast({ type: "error", text: "Ingresá nombre y documento del acompañante." });
      return;
    }

    if (editingMemberId) {
      setFamilyMembers((prev) =>
        prev.map((m) =>
          m.id === editingMemberId
            ? {
                ...m,
                fullName: mName.trim(),
                relationship: mRel,
                documentType: mDocType,
                documentNumber: mDocNum.trim(),
                passportExpiryDate: mPassportExp,
                dob: mDob,
              }
            : m
        )
      );
    } else {
      setFamilyMembers((prev) => [
        ...prev,
        {
          id: `fam_${Date.now()}`,
          fullName: mName.trim(),
          relationship: mRel,
          documentType: mDocType,
          documentNumber: mDocNum.trim(),
          passportExpiryDate: mPassportExp,
          dob: mDob,
        },
      ]);
    }
    resetMemberForm();
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setToast(null);

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          customerName: fullName.trim() || user.displayName || "Viajero",
          email: user.email || "",
          document: {
            type: docType,
            number: docNumber.trim(),
            expiryDate: passportExpiry,
            nationality,
            frontUrl: dniFrontPhoto || null,
            backUrl: dniBackPhoto || null,
            passportUrl: passportPhoto || null,
          },
          passport: passportNumber.trim() || null,
          dob: dob || null,
          gender,
          occupation: occupation.trim() || null,
          address: {
            street: street.trim(),
            number: streetNumber.trim(),
            apartment: apartment.trim(),
            city: city.trim(),
            province: province.trim(),
            postalCode: postalCode.trim(),
          },
          taxData: {
            taxCondition,
            cuitCuil: cuitCuil.trim(),
            businessName: businessName.trim(),
          },
          emergencyContact: {
            name: emergencyName.trim(),
            phone: emergencyPhone.trim(),
            relationship: emergencyRelation.trim(),
          },
          medicalSafety: {
            dietaryRestrictions: dietary.trim(),
            allergies: allergies.trim(),
            medicalConditions: medicalConditions.trim(),
            mobilityAssistance,
            hasTravelInsurance: hasInsurance,
            insuranceCompany: insuranceCompany.trim(),
          },
          familyMembers,
          preferences: {
            seatPreference: seatPref,
            roomPreference: roomPref,
            frequentFlyerProgram: frequentFlyerProgram.trim(),
            frequentFlyerNumber: frequentFlyerNumber.trim(),
          },
          customerStatus: progress >= 75 ? "Cliente" : "Usuario",
          profileCompletion: progress,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      setToast({ type: "success", text: "¡Perfil de Viajero guardado correctamente!" });
    } catch (err) {
      console.error("Error saving profile:", err);
      setToast({ type: "error", text: "Ocurrió un error al guardar tu perfil." });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    document.cookie = "ta_session=; path=/; max-age=0";
    router.replace("/ingresar");
  };

  const tabs: { id: ProfileSection; label: string; icon: React.ReactNode }[] = [
    { id: "identity", label: "Identidad", icon: <User className="w-4 h-4" /> },
    { id: "family", label: `Grupo Familiar (${familyMembers.length})`, icon: <Users className="w-4 h-4" /> },
    { id: "fiscal", label: "Fiscal / AFIP", icon: <FileText className="w-4 h-4" /> },
    { id: "medical", label: "Médico y Seguridad", icon: <HeartPulse className="w-4 h-4" /> },
    { id: "prefs", label: "Preferencias", icon: <Sliders className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">
      <header className="w-full bg-[#0A2A5B] text-white border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#FF5A19] flex items-center justify-center shadow-sm">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white">TravelApp</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">
                Perfil de Viajero
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/85 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al sitio</span>
            </Link>
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {!authReady || loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
            Cargando tu Perfil de Viajero...
          </div>
        ) : !user ? (
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#0A2A5B]/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-[#0A2A5B]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#0A2A5B]">Creá o Completá tu Perfil de Viajero</h1>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Para cargar tus datos de identidad, grupo familiar, facturación y preferencias igual que en la App Cliente, iniciá sesión o creá tu cuenta primero.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/ingresar?next=/mi-perfil"
                className="flex-1 py-3 rounded-xl bg-[#0A2A5B] hover:bg-[#071f44] text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Ingresar a Mi Cuenta
              </Link>
              <Link
                href="/registro"
                className="flex-1 py-3 rounded-xl bg-[#FF5A19] hover:bg-[#e04d12] text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Crear Cuenta Nueva
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl font-black text-[#0A2A5B]">
                    Ficha de Viajero: {fullName || user.email}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Completá tu ficha igual que en la App Cliente para agilizar reservas, emisiones y traslados.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#FF5A19]">{progress}% completado</span>
                  <div className="w-44 h-2.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-[#FF5A19] rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {toast && (
                <div
                  className={`mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                    toast.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {toast.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{toast.text}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSection === tab.id
                      ? "bg-[#0A2A5B] text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {activeSection === "identity" && (
                <div className="space-y-5">
                  <h2 className="text-base font-black text-[#0A2A5B] border-b border-slate-100 pb-2">
                    Identidad y Domicilio
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nacionalidad</label>
                      <input
                        type="text"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Documento</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as "DNI" | "Pasaporte")}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white"
                      >
                        <option value="DNI">DNI</option>
                        <option value="Pasaporte">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Número de Documento *</label>
                      <input
                        type="text"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">N° Pasaporte (Opcional)</label>
                      <input
                        type="text"
                        value={passportNumber}
                        onChange={(e) => setPassportNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Vencimiento Pasaporte</label>
                      <input
                        type="date"
                        value={passportExpiry}
                        onChange={(e) => setPassportExpiry(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Género</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white"
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Ocupación / Profesión</label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { label: "DNI Frente", val: dniFrontPhoto, setter: setDniFrontPhoto },
                      { label: "DNI Dorso", val: dniBackPhoto, setter: setDniBackPhoto },
                      { label: "Pasaporte", val: passportPhoto, setter: setPassportPhoto },
                    ].map((docItem) => (
                      <label
                        key={docItem.label}
                        className="cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center hover:border-[#0A2A5B] transition-colors"
                      >
                        <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs font-bold text-slate-700">{docItem.label}</p>
                        <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                          {docItem.val ? "✓ Imagen cargada" : "Subir foto"}
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            e.target.files?.[0] && handleImageUpload(e.target.files[0], docItem.setter)
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <h3 className="text-sm font-bold text-[#0A2A5B] pt-2">Domicilio</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Calle</label>
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Altura</label>
                      <input
                        type="text"
                        value={streetNumber}
                        onChange={(e) => setStreetNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Piso / Depto</label>
                      <input
                        type="text"
                        value={apartment}
                        onChange={(e) => setApartment(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Provincia</label>
                      <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Código Postal</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "family" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h2 className="text-base font-black text-[#0A2A5B]">Grupo Familiar / Acompañantes</h2>
                    <button
                      type="button"
                      onClick={() => {
                        resetMemberForm();
                        setShowFamilyForm(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5A19] text-white text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Acompañante</span>
                    </button>
                  </div>

                  {showFamilyForm && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Nombre Completo *"
                          value={mName}
                          onChange={(e) => setMName(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Vínculo (Cónyuge, Hijo/a, etc.)"
                          value={mRel}
                          onChange={(e) => setMRel(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                        <select
                          value={mDocType}
                          onChange={(e) => setMDocType(e.target.value as "DNI" | "Pasaporte")}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="DNI">DNI</option>
                          <option value="Pasaporte">Pasaporte</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Número de Documento *"
                          value={mDocNum}
                          onChange={(e) => setMDocNum(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="date"
                          value={mDob}
                          onChange={(e) => setMDob(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="date"
                          placeholder="Vencimiento Pasaporte"
                          value={mPassportExp}
                          onChange={(e) => setMPassportExp(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={resetMemberForm}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveFamilyMember}
                          className="px-4 py-1.5 rounded-lg bg-[#0A2A5B] text-white text-xs font-bold"
                        >
                          {editingMemberId ? "Actualizar" : "Agregar"}
                        </button>
                      </div>
                    </div>
                  )}

                  {familyMembers.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No cargaste acompañantes todavía. Podés agregarlos para agilizar tus reservas grupales o familiares.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {familyMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-800">{member.fullName}</p>
                            <p className="text-xs text-slate-500">
                              {member.relationship} · {member.documentType}: {member.documentNumber}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMemberId(member.id);
                                setMName(member.fullName);
                                setMRel(member.relationship);
                                setMDocType(member.documentType);
                                setMDocNum(member.documentNumber);
                                setMPassportExp(member.passportExpiryDate || "");
                                setMDob(member.dob || "");
                                setShowFamilyForm(true);
                              }}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFamilyMembers((prev) => prev.filter((m) => m.id !== member.id))
                              }
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "fiscal" && (
                <div className="space-y-4">
                  <h2 className="text-base font-black text-[#0A2A5B] border-b border-slate-100 pb-2">
                    Datos Fiscales (Facturación AFIP)
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Condición Fiscal</label>
                      <select
                        value={taxCondition}
                        onChange={(e) => setTaxCondition(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white"
                      >
                        <option value="Consumidor Final">Consumidor Final</option>
                        <option value="Monotributista">Monotributista</option>
                        <option value="Responsable Inscripto">Responsable Inscripto</option>
                        <option value="Exento">Exento</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CUIT / CUIL</label>
                      <input
                        type="text"
                        value={cuitCuil}
                        onChange={(e) => setCuitCuil(e.target.value)}
                        placeholder="20-12345678-9"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Razón Social (si aplica)</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "medical" && (
                <div className="space-y-4">
                  <h2 className="text-base font-black text-[#0A2A5B] border-b border-slate-100 pb-2">
                    Información Médica y Contacto de Emergencia
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Contacto de Emergencia</label>
                      <input
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Emergencia</label>
                      <input
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Parentesco / Relación</label>
                      <input
                        type="text"
                        value={emergencyRelation}
                        onChange={(e) => setEmergencyRelation(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Restricciones Alimentarias</label>
                      <input
                        type="text"
                        value={dietary}
                        onChange={(e) => setDietary(e.target.value)}
                        placeholder="Ej: Celíaco, Vegetariano"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Alergias</label>
                      <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Condiciones Médicas</label>
                      <input
                        type="text"
                        value={medicalConditions}
                        onChange={(e) => setMedicalConditions(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mobilityAssistance}
                        onChange={(e) => setMobilityAssistance(e.target.checked)}
                        className="w-4 h-4 accent-[#0A2A5B]"
                      />
                      <span>Requiere asistencia de movilidad</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasInsurance}
                        onChange={(e) => setHasInsurance(e.target.checked)}
                        className="w-4 h-4 accent-[#0A2A5B]"
                      />
                      <span>Posee cobertura médica / asistencia al viajero</span>
                    </label>
                  </div>

                  {hasInsurance && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Aseguradora / Plan</label>
                      <input
                        type="text"
                        value={insuranceCompany}
                        onChange={(e) => setInsuranceCompany(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeSection === "prefs" && (
                <div className="space-y-4">
                  <h2 className="text-base font-black text-[#0A2A5B] border-b border-slate-100 pb-2">
                    Preferencias de Viaje
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Preferencia de Asiento</label>
                      <select
                        value={seatPref}
                        onChange={(e) => setSeatPref(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white"
                      >
                        <option value="Indistinto">Indistinto</option>
                        <option value="Ventana">Ventana</option>
                        <option value="Pasillo">Pasillo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Preferencia de Habitación</label>
                      <select
                        value={roomPref}
                        onChange={(e) => setRoomPref(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white"
                      >
                        <option value="Matrimonial">Matrimonial</option>
                        <option value="Twin">Twin (2 camas)</option>
                        <option value="Individual">Individual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Programa de Viajero Frecuente</label>
                      <input
                        type="text"
                        value={frequentFlyerProgram}
                        onChange={(e) => setFrequentFlyerProgram(e.target.value)}
                        placeholder="Ej: Aerolíneas Plus, LATAM Pass"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">N° de Socio Frecuente</label>
                      <input
                        type="text"
                        value={frequentFlyerNumber}
                        onChange={(e) => setFrequentFlyerNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF5A19] hover:bg-[#e04d12] text-white font-bold text-sm shadow-md transition-all disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Guardando..." : "Guardar Perfil Completo"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
