'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Save, CheckCircle2 } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FiscalInfo {
  razonSocial: string;
  cuit: string;
  condicionIva: string;
  ingresosBrutos: string;
  domicilioFiscal: string;
  inicioActividades: string;
  puntoVentaAfip: string;
  emailFacturacion: string;
}

const DEFAULT_FISCAL: FiscalInfo = {
  razonSocial: 'TravelApp s.a.s.',
  cuit: '30-71922034-3',
  condicionIva: 'Responsable Inscripto',
  ingresosBrutos: '',
  domicilioFiscal: '',
  inicioActividades: '',
  puntoVentaAfip: '0001',
  emailFacturacion: 'administracion@travelapp.ar',
};

export function FiscalTab() {
  const [form, setForm] = useState<FiscalInfo>(DEFAULT_FISCAL);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config', 'fiscal_info'), (snap) => {
      if (snap.exists()) {
        setForm({ ...DEFAULT_FISCAL, ...(snap.data() as Partial<FiscalInfo>) });
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(false);
    try {
      await setDoc(doc(db, 'system_config', 'fiscal_info'), {
        ...form,
        updatedAt: Date.now(),
      }, { merge: true });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Información Fiscal</h2>
          <p className="text-xs text-slate-500">
            Datos societarios e impositivos oficiales sincronizados en Firestore (`system_config/fiscal_info`).
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0a2a5b] bg-[#0a2a5b]/5 px-3 py-1 rounded-full w-fit">
          <FileText className="w-3.5 h-3.5" /> CUIT {form.cuit}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white/75 border border-slate-200/90 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#0a2a5b] mb-1">Razón Social</label>
            <input
              type="text"
              value={form.razonSocial}
              onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#0a2a5b] mb-1">C.U.I.T.</label>
            <input
              type="text"
              value={form.cuit}
              onChange={(e) => setForm({ ...form, cuit: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#0a2a5b] mb-1">Condición frente al IVA</label>
            <input
              type="text"
              value={form.condicionIva}
              onChange={(e) => setForm({ ...form, condicionIva: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#0a2a5b] mb-1">Ingresos Brutos (IIBB)</label>
            <input
              type="text"
              value={form.ingresosBrutos}
              onChange={(e) => setForm({ ...form, ingresosBrutos: e.target.value })}
              placeholder="Ej. Convenio Multilateral 901-..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#0a2a5b] mb-1">Domicilio Fiscal</label>
            <input
              type="text"
              value={form.domicilioFiscal}
              onChange={(e) => setForm({ ...form, domicilioFiscal: e.target.value })}
              placeholder="Calle, Número, Provincia"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#0a2a5b] mb-1">Inicio de Actividades</label>
            <input
              type="text"
              value={form.inicioActividades}
              onChange={(e) => setForm({ ...form, inicioActividades: e.target.value })}
              placeholder="DD/MM/AAAA"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#0a2a5b] mb-1">Punto de Venta AFIP</label>
            <input
              type="text"
              value={form.puntoVentaAfip}
              onChange={(e) => setForm({ ...form, puntoVentaAfip: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#0a2a5b] mb-1">Email de Facturación</label>
            <input
              type="email"
              value={form.emailFacturacion}
              onChange={(e) => setForm({ ...form, emailFacturacion: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedMsg ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" /> Información fiscal guardada correctamente
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Datos Fiscales'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
