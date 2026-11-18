'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, User, DollarSign, Car, FileText, Camera, Upload, AlertTriangle } from 'lucide-react';
import { ARGENTINA_PROVINCES } from '@/types/partners';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Types ─────────────────────────────────────────────────────
type TaxType = 'CUIL' | 'CUIT';
type RegistrationType = 'Monotributista' | 'Responsable Inscripto' | 'Exento';

interface FormData {
  // Step 1 — Personal
  firstName: string; lastName: string; dob: string;
  email: string; phone: string;
  street: string; streetNumber: string; floor: string; apartment: string;
  city: string; province: string; postalCode: string;

  // Step 2 — Tax & Bank
  taxType: TaxType; taxIdNumber: string;
  registrationType: RegistrationType | ''; arcaConstanciaUrl: string;
  cbuCvu: string; alias: string; accountHolder: string;

  // Step 3 — Vehicle
  make: string; model: string; year: string; color: string; licensePlate: string;
  hasSutrappa: boolean; sutrappaLicense: string; sutrappaHolder: string;

  // Step 4 — Docs (file names for UI demo)
  driverLicense: string; criminalRecord: string; conductCert: string; healthCert: string;
}

const INITIAL: FormData = {
  firstName: '', lastName: '', dob: '', email: '', phone: '',
  street: '', streetNumber: '', floor: '', apartment: '',
  city: '', province: '', postalCode: '',
  taxType: 'CUIL', taxIdNumber: '', registrationType: '', arcaConstanciaUrl: '',
  cbuCvu: '', alias: '', accountHolder: '',
  make: '', model: '', year: '', color: '', licensePlate: '',
  hasSutrappa: false, sutrappaLicense: '', sutrappaHolder: '',
  driverLicense: '', criminalRecord: '', conductCert: '', healthCert: '',
};

// ── Helpers ───────────────────────────────────────────────────
const isAdult = (dob: string): boolean => {
  if (!dob) return false;
  const today = new Date();
  const birth = new Date(dob);
  const age = today.getFullYear() - birth.getFullYear() - (
    today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0
  );
  return age >= 18;
};

const isValidCBU = (cbu: string) => cbu.replace(/\s/g, '').length === 22;

// ── Step indicator ────────────────────────────────────────────
const STEPS = [
  { label: 'Datos Personales', icon: User },
  { label: 'Fiscal & Bancario', icon: DollarSign },
  { label: 'Vehículo', icon: Car },
  { label: 'Documentación', icon: FileText },
];

const StepIndicator = ({ current }: { current: number }) => (
  <div className="flex items-center gap-0">
    {STEPS.map((step, i) => {
      const Icon = step.icon;
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all
              ${done ? 'border-emerald-500 bg-emerald-500 text-white'
                : active ? 'border-tech-blue bg-tech-blue text-white shadow-lg shadow-tech-blue/30'
                : 'border-slate-200 bg-white text-slate-400'}`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={`mt-1 hidden text-[10px] font-semibold sm:block whitespace-nowrap
              ${active ? 'text-tech-blue' : done ? 'text-emerald-500' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mb-4 h-0.5 w-12 flex-1 sm:w-16 transition-all
              ${i < current ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Field components ──────────────────────────────────────────
const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="mb-1 block text-xs font-semibold text-slate-600">
    {children}{required && <span className="ml-0.5 text-red-500">*</span>}
  </label>
);

const Input = ({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) => (
  <div>
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition-all
        focus:ring-2 focus:ring-tech-blue/20 focus:border-tech-blue/50
        ${error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
    />
    {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
  </div>
);

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition-all focus:ring-2 focus:ring-tech-blue/20 focus:border-tech-blue/50"
  >
    {children}
  </select>
);

// ── File Upload Field ─────────────────────────────────────────
const FileField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <Label>{label}</Label>
    <div className="flex gap-2">
      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 truncate shadow-sm">
        {value || 'Ningún archivo seleccionado'}
      </div>
      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
        <Upload className="h-3.5 w-3.5" />
        Subir
        <input type="file" className="hidden" onChange={e => onChange(e.target.files?.[0]?.name || '')} />
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
        <Camera className="h-3.5 w-3.5" />
        Cámara
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => onChange(e.target.files?.[0]?.name || '')} />
      </label>
    </div>
  </div>
);

// ── Step 1: Personal Data ─────────────────────────────────────
const Step1 = ({ data, set }: { data: FormData; set: (k: keyof FormData, v: string) => void }) => {
  const dobError = data.dob && !isAdult(data.dob) ? 'El conductor debe ser mayor de 18 años.' : undefined;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label required>Nombre</Label><Input value={data.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Ej: Carlos" /></div>
        <div><Label required>Apellido</Label><Input value={data.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Ej: Mamani" /></div>
      </div>
      <div><Label required>Fecha de Nacimiento</Label><Input type="date" value={data.dob} onChange={e => set('dob', e.target.value)} error={dobError} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label required>Email</Label><Input type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="conductor@email.com" /></div>
        <div><Label required>Teléfono</Label><Input value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="+54 381 000-0000" /></div>
      </div>
      <hr className="border-slate-100" />
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Domicilio</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2"><Label required>Calle</Label><Input value={data.street} onChange={e => set('street', e.target.value)} placeholder="Av. Belgrano" /></div>
        <div><Label required>Número</Label><Input value={data.streetNumber} onChange={e => set('streetNumber', e.target.value)} placeholder="1250" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Piso</Label><Input value={data.floor} onChange={e => set('floor', e.target.value)} placeholder="3" /></div>
        <div><Label>Depto</Label><Input value={data.apartment} onChange={e => set('apartment', e.target.value)} placeholder="B" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1"><Label required>CP</Label><Input value={data.postalCode} onChange={e => set('postalCode', e.target.value)} placeholder="4000" /></div>
        <div className="col-span-2"><Label required>Localidad</Label><Input value={data.city} onChange={e => set('city', e.target.value)} placeholder="San Miguel de Tucumán" /></div>
      </div>
      <div><Label required>Provincia</Label>
        <Select value={data.province} onChange={e => set('province', e.target.value)}>
          <option value="">Seleccionar provincia...</option>
          {ARGENTINA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>
    </div>
  );
};

// ── Step 2: Tax & Bank ────────────────────────────────────────
const Step2 = ({ data, set, setB }: { data: FormData; set: (k: keyof FormData, v: string) => void; setB: (k: keyof FormData, v: boolean) => void }) => {
  const cbuError = data.cbuCvu && !isValidCBU(data.cbuCvu) ? 'El CBU/CVU debe tener exactamente 22 caracteres numéricos.' : undefined;
  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Identificación Fiscal</p>
      <div>
        <Label required>Tipo de Identificación</Label>
        <div className="flex gap-3">
          {(['CUIL', 'CUIT'] as TaxType[]).map(t => (
            <button key={t} type="button"
              onClick={() => set('taxType', t)}
              className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-all
                ${data.taxType === t ? 'border-tech-blue bg-tech-blue/5 text-tech-blue shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >{t}</button>
          ))}
        </div>
      </div>
      <div><Label required>{data.taxType} (11 dígitos)</Label><Input value={data.taxIdNumber} onChange={e => set('taxIdNumber', e.target.value)} placeholder="20-12345678-9" maxLength={13} /></div>

      {/* CUIT conditional */}
      {data.taxType === 'CUIT' && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Campos adicionales para CUIT
          </p>
          <div>
            <Label required>Condición ARCA (ex-AFIP)</Label>
            <Select value={data.registrationType} onChange={e => set('registrationType', e.target.value)}>
              <option value="">Seleccionar inscripción...</option>
              <option value="Monotributista">Monotributista</option>
              <option value="Responsable Inscripto">Responsable Inscripto</option>
              <option value="Exento">Exento</option>
            </Select>
          </div>
          <FileField label="Constancia de Inscripción ARCA (PDF)" value={data.arcaConstanciaUrl} onChange={v => set('arcaConstanciaUrl', v)} />
        </div>
      )}

      <hr className="border-slate-100" />
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Datos Bancarios</p>
      <div>
        <Label required>CBU / CVU</Label>
        <Input
          value={data.cbuCvu}
          onChange={e => set('cbuCvu', e.target.value.replace(/\D/g, '').slice(0, 22))}
          placeholder="22 dígitos exactos"
          maxLength={22}
          error={cbuError}
        />
        <p className="mt-1 text-right text-[10px] text-slate-400">{data.cbuCvu.length}/22</p>
      </div>
      <div><Label required>Alias</Label><Input value={data.alias} onChange={e => set('alias', e.target.value)} placeholder="nombre.apellido.mp" /></div>
      <div><Label required>Titular de la Cuenta</Label><Input value={data.accountHolder} onChange={e => set('accountHolder', e.target.value)} placeholder="Carlos Mamani" /></div>
    </div>
  );
};

// ── Step 3: Vehicle ───────────────────────────────────────────
const Step3 = ({ data, set, setB }: { data: FormData; set: (k: keyof FormData, v: string) => void; setB: (k: keyof FormData, v: boolean) => void }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div><Label required>Marca</Label><Input value={data.make} onChange={e => set('make', e.target.value)} placeholder="Volkswagen" /></div>
      <div><Label required>Modelo</Label><Input value={data.model} onChange={e => set('model', e.target.value)} placeholder="Gol Trend" /></div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div><Label required>Año</Label><Input type="number" value={data.year} onChange={e => set('year', e.target.value)} placeholder="2020" min="2000" max="2026" /></div>
      <div><Label required>Color</Label><Input value={data.color} onChange={e => set('color', e.target.value)} placeholder="Blanco" /></div>
      <div><Label required>Patente</Label><Input value={data.licensePlate} onChange={e => set('licensePlate', e.target.value.toUpperCase())} placeholder="AB 123 CD" /></div>
    </div>

    {/* Insurance disclaimer */}
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
      <p className="text-xs text-amber-700">
        <strong>Seguro Comercial obligatorio.</strong> El vehículo debe contar con seguro para transporte de pasajeros (no particular). Adjunte la póliza en el paso de documentación.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FileField label="Cédula Verde/Azul — Frente" value={''} onChange={() => {}} />
      <FileField label="Cédula Verde/Azul — Dorso" value={''} onChange={() => {}} />
      <FileField label="Foto Frontal del Vehículo" value={''} onChange={() => {}} />
      <FileField label="Foto Lateral del Vehículo" value={''} onChange={() => {}} />
      <FileField label="Foto a 45° del Vehículo" value={''} onChange={() => {}} />
      <FileField label="RTO — Revisión Técnica Obligatoria" value={''} onChange={() => {}} />
    </div>

    {/* Sutrappa conditional */}
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={data.hasSutrappa}
          onChange={e => setB('hasSutrappa', e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-tech-blue"
        />
        <div>
          <p className="text-sm font-semibold text-slate-700">¿Posee Habilitación SUTRAPPA?</p>
          <p className="text-xs text-slate-400">Marcar si el conductor cuenta con licencia municipal de taxi / remis</p>
        </div>
      </label>

      {data.hasSutrappa && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          <div><Label required>N° de Licencia SUTRAPPA</Label><Input value={data.sutrappaLicense} onChange={e => set('sutrappaLicense', e.target.value)} placeholder="REM-004512" /></div>
          <div><Label required>Titular de la Licencia</Label><Input value={data.sutrappaHolder} onChange={e => set('sutrappaHolder', e.target.value)} placeholder="Carlos Mamani" /></div>
        </div>
      )}
    </div>
  </div>
);

// ── Step 4: Documentation ─────────────────────────────────────
const Step4 = ({ data, set }: { data: FormData; set: (k: keyof FormData, v: string) => void }) => (
  <div className="space-y-4">
    <p className="text-xs text-slate-500">Adjuntá los documentos del conductor. Licencia de Conducir y Certificado de Reincidencia son obligatorios; Buena Conducta y Sanidad son opcionales.</p>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FileField label="Licencia de Conducir (vigente) *" value={data.driverLicense} onChange={v => set('driverLicense', v)} />
      <FileField label="Certificado de Reincidencia *" value={data.criminalRecord} onChange={v => set('criminalRecord', v)} />
      <FileField label="Certificado de Buena Conducta (Opcional)" value={data.conductCert} onChange={v => set('conductCert', v)} />
      <FileField label="Certificado de Sanidad (Opcional)" value={data.healthCert} onChange={v => set('healthCert', v)} />
    </div>
    <FileField label="Seguro Comercial — Póliza (PDF)" value={''} onChange={() => {}} />
  </div>
);

// ── Main Form ─────────────────────────────────────────────────
export default function NewPartnerPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormData, v: string) => setData(prev => ({ ...prev, [k]: v }));
  const setB = (k: keyof FormData, v: boolean) => setData(prev => ({ ...prev, [k]: v }));

  const handleNext = async () => {
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      setSaving(true);
      try {
        await addDoc(collection(db, 'drivers'), {
          name: `${data.firstName} ${data.lastName}`,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          dob: data.dob,
          address: {
            street: data.street,
            number: data.streetNumber,
            floor: data.floor || '',
            apartment: data.apartment || '',
            city: data.city,
            province: data.province,
            postalCode: data.postalCode
          },
          taxInfo: {
            taxIdType: data.taxType,
            taxIdNumber: data.taxIdNumber,
            registrationType: data.registrationType
          },
          bankInfo: {
            cbuCvu: data.cbuCvu,
            alias: data.alias,
            accountHolder: data.accountHolder
          },
          activeVehicle: {
            brand: `${data.make} ${data.model}`,
            year: Number(data.year) || 2020,
            color: data.color,
            plate: data.licensePlate.toUpperCase(),
            sutrappa: {
              isActive: data.hasSutrappa,
              licenseNumber: data.sutrappaLicense || '',
              holder: data.sutrappaHolder || ''
            }
          },
          documents: {
            driverLicense: data.driverLicense || undefined,
            criminalRecord: data.criminalRecord || undefined,
            conductCert: data.conductCert || undefined,
            healthCert: data.healthCert || undefined,
          },
          status: 'En Revisión',
          walletBalance: 0,
          rewardsPoints: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        setSubmitted(true);
      } catch (err) {
        console.error("Error saving manual driver partner:", err);
        alert("Ocurrió un error al guardar el socio. Por favor intente de nuevo.");
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBack = () => { if (step > 0) setStep(s => s - 1); };

  if (submitted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-lg max-w-md w-full">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">¡Socio registrado!</h2>
          <p className="mt-2 text-sm text-slate-500">
            {data.firstName} {data.lastName} fue cargado al sistema. El perfil está pendiente de validación documental.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/hr" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Volver a RRHH
            </Link>
            <button onClick={() => { setData(INITIAL); setStep(0); setSubmitted(false); }}
              className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-all hover:brightness-110"
              style={{ backgroundColor: '#ff6b00' }}>
              Cargar otro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/hr" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-tech-blue transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-lg font-bold text-tech-blue">Carga Manual de Conductor</h1>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Progress */}
        <div className="flex justify-center">
          <StepIndicator current={step} />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800 border-b border-slate-100 pb-3">
            Paso {step + 1}: {STEPS[step].label}
          </h2>

          {step === 0 && <Step1 data={data} set={set} />}
          {step === 1 && <Step2 data={data} set={set} setB={setB} />}
          {step === 2 && <Step3 data={data} set={set} setB={setB} />}
          {step === 3 && <Step4 data={data} set={set} />}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={handleBack}
              disabled={step === 0 || saving}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm disabled:opacity-30 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>

            <span className="text-xs text-slate-400">{step + 1} / {STEPS.length}</span>

            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: step === 3 ? '#059669' : '#ff6b00' }}
            >
              {saving ? 'Guardando...' : step === 3 ? (<><Check className="h-4 w-4" /> Guardar Conductor</>) : (<>Siguiente <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
