'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Trash2, Edit2, Phone, Mail, Landmark,
  Calendar, ShieldCheck, ShieldAlert, Upload, Eye, X, CheckCircle2,
  FileText, Briefcase
} from 'lucide-react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface StaffMember {
  id: string;
  name: string;
  dni: string;
  cuit: string;
  fechaIngreso: string;
  cargo: string;
  sucursalId: string;
  sucursalName: string;
  photoBase64: string;
  contractPdfBase64: string;
  reportsToId: string;
  reportsToName: string;
  email: string;
  phone: string;
  commissionPercent?: number; // % Comisión por venta acordada en contrato
  status: 'Activo' | 'Licencia' | 'Baja';
}

export default function HRStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isPdfUploading, setIsPdfUploading] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    dni: string;
    cuit: string;
    fechaIngreso: string;
    cargo: string;
    sucursalId: string;
    photoBase64: string;
    contractPdfBase64: string;
    reportsToId: string;
    email: string;
    phone: string;
    commissionPercent: number;
    status: 'Activo' | 'Licencia' | 'Baja';
  }>({
    name: '',
    dni: '',
    cuit: '',
    fechaIngreso: '',
    cargo: '',
    sucursalId: '1',
    photoBase64: '',
    contractPdfBase64: '',
    reportsToId: '',
    email: '',
    phone: '',
    commissionPercent: 3.0,
    status: 'Activo'
  });

  useEffect(() => {
    // Sincronización en vivo con Firestore
    const unsub = onSnapshot(collection(db, 'hr_staff'), (snapshot) => {
      const list: StaffMember[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          dni: data.dni || '',
          cuit: data.cuit || '',
          fechaIngreso: data.fechaIngreso || '',
          cargo: data.cargo || '',
          sucursalId: data.sucursalId || '1',
          sucursalName: data.sucursalName || (data.sucursalId === '2' ? 'Sucursal Pilar' : data.sucursalId === '3' ? 'Sucursal Tucumán' : 'Sucursal Retiro'),
          photoBase64: data.photoBase64 || '',
          contractPdfBase64: data.contractPdfBase64 || '',
          reportsToId: data.reportsToId || '',
          reportsToName: data.reportsToName || '',
          email: data.email || '',
          phone: data.phone || '',
          commissionPercent: Number(data.commissionPercent || 3.0),
          status: data.status || 'Activo'
        };
      });
      setStaff(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading staff:", error);
      setStaff([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPhotoUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setForm(p => ({ ...p, photoBase64: base64 }));
        setIsPhotoUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPdfUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm(p => ({ ...p, contractPdfBase64: base64 }));
      setIsPdfUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      name: '',
      dni: '',
      cuit: '',
      fechaIngreso: '',
      cargo: '',
      sucursalId: '1',
      photoBase64: '',
      contractPdfBase64: '',
      reportsToId: '',
      email: '',
      phone: '',
      commissionPercent: 3.0,
      status: 'Activo'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (emp: StaffMember) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      dni: emp.dni,
      cuit: emp.cuit,
      fechaIngreso: emp.fechaIngreso,
      cargo: emp.cargo,
      sucursalId: emp.sucursalId,
      photoBase64: emp.photoBase64,
      contractPdfBase64: emp.contractPdfBase64,
      reportsToId: emp.reportsToId,
      email: emp.email,
      phone: emp.phone,
      commissionPercent: emp.commissionPercent !== undefined ? emp.commissionPercent : 3.0,
      status: emp.status
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.dni || !form.cargo) return;

    try {
      const selectedManager = staff.find(s => s.id === form.reportsToId);
      const reportsToName = selectedManager ? selectedManager.name : '';

      const sucursalName = form.sucursalId === '2' ? 'Sucursal Pilar' : form.sucursalId === '3' ? 'Sucursal Tucumán' : 'Sucursal Retiro';

      const payload = {
        name: form.name,
        dni: form.dni,
        cuit: form.cuit,
        fechaIngreso: form.fechaIngreso,
        cargo: form.cargo,
        sucursalId: form.sucursalId,
        sucursalName,
        photoBase64: form.photoBase64,
        contractPdfBase64: form.contractPdfBase64,
        reportsToId: form.reportsToId,
        reportsToName,
        email: form.email,
        phone: form.phone,
        commissionPercent: Number(form.commissionPercent || 0),
        status: form.status
      };

      const docId = editingId || `EMP-${Math.floor(100 + Math.random() * 900)}`;
      await setDoc(doc(db, 'hr_staff', docId), payload);
      
      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      console.error("Error saving staff member:", err);
      alert("Error al guardar ficha del empleado.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de dar de baja a este empleado en la base de personal?')) {
      try {
        await deleteDoc(doc(db, 'hr_staff', id));
      } catch (err) {
        console.error("Error deleting staff:", err);
      }
    }
  };

  const filtered = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.cargo.toLowerCase().includes(search.toLowerCase()) || 
    s.dni.includes(search)
  );

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-tech-blue">
            <Users className="h-7 w-7 text-green-500" />
            Gestión de Personal
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Nómina interna, contratos laborales y estructura organizacional de Concorde 360.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center space-x-2 rounded-xl bg-tech-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-tech-blue/90 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Registrar Empleado</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, cargo o documento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 shadow-sm outline-none focus:border-tech-blue/40 focus:ring-2 focus:ring-tech-blue/10 transition-all"
        />
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando nómina de personal...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(emp => (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-shadow relative">
              
              <div>
                <div className="flex gap-4 items-center">
                  <img
                    src={emp.photoBase64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`}
                    alt={emp.name}
                    className="w-14 h-14 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{emp.name}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-slate-400" /> {emp.cargo}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {emp.id}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">DNI / CUIT:</span>
                    <span className="font-semibold text-slate-700">{emp.dni} / {emp.cuit || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ingreso:</span>
                    <span className="font-semibold text-slate-700">{emp.fechaIngreso || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sucursal:</span>
                    <span className="font-semibold text-slate-700">{emp.sucursalName}</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-200">
                    <span className="text-emerald-800 font-bold text-[11px]">Comisión por Venta:</span>
                    <span className="font-black text-emerald-900 text-xs">
                      {emp.commissionPercent !== undefined ? emp.commissionPercent : 3.0}%
                    </span>
                  </div>
                  {emp.reportsToName && (
                    <div className="flex justify-between text-[11px] text-indigo-700">
                      <span>Reporta a:</span>
                      <span className="font-bold">{emp.reportsToName}</span>
                    </div>
                  )}
                </div>

                {emp.contractPdfBase64 && (
                  <div className="mt-3 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2 text-[11px] text-slate-600">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span>Contrato Escaneado (PDF/Copia)</span>
                    <a 
                      href={emp.contractPdfBase64} 
                      target="_blank" 
                      rel="noreferrer"
                      className="ml-auto text-tech-blue font-bold hover:underline"
                    >
                      Ver
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(emp)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:border-tech-blue hover:text-tech-blue transition-colors text-xs font-semibold"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Editar Ficha
                </button>
                <button
                  onClick={() => handleDelete(emp.id)}
                  className="p-1 hover:bg-red-50 text-red-500 rounded-lg hover:text-red-700 transition-colors"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Creation/Edition Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Editar Ficha de Empleado' : 'Registrar Nuevo Empleado'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 flex-1">
              
              {/* Foto y Datos principales */}
              <div className="flex gap-5 items-start">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center relative">
                    {form.photoBase64 ? (
                      <img src={form.photoBase64} alt="Foto Perfil" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-10 h-10 text-slate-350" />
                    )}
                  </div>
                  <label className="text-[10px] font-bold text-tech-blue cursor-pointer hover:underline">
                    {isPhotoUploading ? 'Subiendo...' : 'Subir Foto'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre y Apellido *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                      placeholder="Ej: Laura Gómez"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Cargo / Puesto *</label>
                    <input
                      type="text"
                      required
                      value={form.cargo}
                      onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                      placeholder="Ej: Gerente Operativo"
                    />
                  </div>
                </div>
              </div>

              {/* DNI, CUIT, Contrato */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">N° de Documento *</label>
                  <input
                    type="text"
                    required
                    value={form.dni}
                    onChange={e => setForm(p => ({ ...p, dni: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                    placeholder="Ej: 35123456"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CUIT / CUIL</label>
                  <input
                    type="text"
                    value={form.cuit}
                    onChange={e => setForm(p => ({ ...p, cuit: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                    placeholder="27-35123456-4"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de Ingreso</label>
                  <input
                    type="date"
                    value={form.fechaIngreso}
                    onChange={e => setForm(p => ({ ...p, fechaIngreso: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                  />
                </div>
              </div>

              {/* Sucursal, Reporta a, Estado, Comisión */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Sucursal</label>
                  <select
                    value={form.sucursalId}
                    onChange={e => setForm(p => ({ ...p, sucursalId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none bg-white focus:border-tech-blue"
                  >
                    <option value="1">Sucursal Retiro</option>
                    <option value="2">Sucursal Pilar</option>
                    <option value="3">Sucursal Tucumán</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Reporta a</label>
                  <select
                    value={form.reportsToId}
                    onChange={e => setForm(p => ({ ...p, reportsToId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none bg-white focus:border-tech-blue"
                  >
                    <option value="">Ninguno (Director)</option>
                    {staff.filter(s => s.id !== editingId).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.cargo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Comisión Venta (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.commissionPercent}
                    onChange={e => setForm(p => ({ ...p, commissionPercent: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-emerald-800 outline-none bg-emerald-50/50 focus:border-tech-blue"
                    placeholder="Ej: 3.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none bg-white focus:border-tech-blue"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Licencia">Licencia</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              {/* Teléfono, Email, Contrato escaneado */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email Interno</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                    placeholder="laura@concorde.360"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono Interno</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-tech-blue"
                    placeholder="+54 11..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Adjuntar Contrato Trabajo (PDF/Imagen)</label>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all h-[38px] w-full">
                      <Upload className="h-4 w-4 mr-1.5" />
                      {isPdfUploading ? 'Cargando...' : 'Adjuntar PDF'}
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handlePdfUpload} />
                    </label>
                    {form.contractPdfBase64 && (
                      <span className="text-[10px] text-emerald-600 font-bold">OK</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-tech-blue px-4 py-2 text-xs font-bold text-white hover:bg-tech-blue/90"
                >
                  Guardar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
