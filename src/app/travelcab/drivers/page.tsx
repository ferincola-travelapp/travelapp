'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Plus, Search, Eye, CheckCircle,
  AlertCircle, XCircle, Clock, Car, ChevronRight,
  Filter, RefreshCw, Mail, Phone, Edit2, Trash2, CheckCircle2,
  Building2, Tag, ShieldCheck, CheckSquare, Square, Sparkles, Crown, DollarSign,
  QrCode, Printer
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Branch, VehicleCategory } from '@/types/logistics';
import { DriverPartner } from '@/types/partners';

export default function TravelCabDriversPage() {
  const [drivers, setDrivers] = useState<DriverPartner[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');

  // Modal de Habilitación / Asignación de Tarifas
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverPartner | null>(null);
  const [qrDriverForPrint, setQrDriverForPrint] = useState<DriverPartner | null>(null);

  // Form State para la Habilitación / Asignación
  const [assignForm, setAssignForm] = useState({
    branchIds: ['all'] as string[],
    allowedCategories: ['estandar'] as string[],
    assignedTariffIds: [] as string[],
    allowedServiceModes: ['mu'] as string[],
    planType: 'commission' as 'commission' | 'membership',
    maxNegativeBalance: '-10000',
    status: 'Activo' as 'Activo' | 'Suspendido' | 'En Revisión' | 'Pendiente Documentación',
    make: '',
    model: '',
    licensePlate: '',
    color: '',
    year: '2020'
  });

  // 1. Escuchar Conductores en tiempo real
  useEffect(() => {
    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const list: DriverPartner[] = snapshot.docs.map(d => {
        const data = d.data();
        const fullName = data.name || data.displayName || 'Conductor';
        const parts = fullName.split(' ');
        const fName = data.firstName || parts[0] || 'Conductor';
        const lName = data.lastName || parts.slice(1).join(' ') || '';

        return {
          id: d.id,
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
          firstName: fName,
          lastName: lName,
          dob: data.dob || '1990-01-01',
          email: data.email || 'correo@travelapp.ar',
          phone: data.phone || '+54 381 000-0000',
          status: data.status || 'En Revisión',
          photoUrl: data.photoUrl || undefined,
          address: data.address || { street: '', number: '', city: '', province: '', postalCode: '' },
          taxInfo: data.taxInfo || { taxIdType: 'CUIL', taxIdNumber: '' },
          bankInfo: data.bankInfo || { cbuCvu: '', alias: '', accountHolder: '' },
          wallet: data.wallet || { cashBalance: 0, pointsBalance: 0, transactions: [] },
          branchIds: data.branchIds || (data.branchId ? [data.branchId] : ['all']),
          allowedCategories: data.allowedCategories || (data.category ? [data.category] : ['estandar']),
          assignedTariffIds: data.assignedTariffIds || [],
          allowedServiceModes: data.allowedServiceModes || ['mu'],
          planType: data.planType || 'commission',
          maxNegativeBalance: data.maxNegativeBalance !== undefined ? Number(data.maxNegativeBalance) : -10000,
          currentCommissionBalance: data.currentCommissionBalance !== undefined ? Number(data.currentCommissionBalance) : 0,
          vehicle: data.activeVehicle ? {
            id: 'VH-active',
            make: data.activeVehicle.brand?.split(' ')[0] || 'Vehículo',
            model: data.activeVehicle.brand?.split(' ').slice(1).join(' ') || '',
            licensePlate: data.activeVehicle.plate || '',
            color: data.activeVehicle.color || '',
            year: Number(data.activeVehicle.year) || 2020,
            sutrappa: { isActive: false }
          } : (data.vehicle || undefined)
        };
      });
      setDrivers(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching drivers:", error);
      setLoading(false);
    });

    // 2. Escuchar Sucursales
    const unsubBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Branch);
      setBranches(list.filter(b => b.active !== false));
    });

    // 3. Escuchar Categorías
    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as VehicleCategory);
      setCategories(list);
    });

    // 4. Escuchar Tarifarios
    const unsubTariffs = onSnapshot(collection(db, 'tariffs'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTariffs(list.filter(t => t.id !== 'mu_active' && t.id !== 'arc_active'));
    });

    return () => {
      unsubDrivers();
      unsubBranches();
      unsubCats();
      unsubTariffs();
    };
  }, []);

  // Abrir Modal de Habilitación y Asignación
  const handleOpenAssignModal = (drv: DriverPartner) => {
    setSelectedDriver(drv);
    setAssignForm({
      branchIds: drv.branchIds && drv.branchIds.length > 0 ? drv.branchIds : ['all'],
      allowedCategories: drv.allowedCategories && drv.allowedCategories.length > 0 ? drv.allowedCategories : ['estandar'],
      assignedTariffIds: drv.assignedTariffIds || [],
      allowedServiceModes: drv.allowedServiceModes || ['mu'],
      planType: drv.planType || 'commission',
      maxNegativeBalance: String(drv.maxNegativeBalance !== undefined ? drv.maxNegativeBalance : -10000),
      status: 'Activo',
      make: drv.vehicle?.make || '',
      model: drv.vehicle?.model || '',
      licensePlate: drv.vehicle?.licensePlate || '',
      color: drv.vehicle?.color || '',
      year: String(drv.vehicle?.year || '2020')
    });
    setShowAssignModal(true);
  };

  // Guardar Asignación y Habilitar Chofer
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    if (assignForm.branchIds.length === 0) {
      alert("Debes seleccionar al menos una sucursal asignada.");
      return;
    }

    if (assignForm.allowedCategories.length === 0) {
      alert("Debes seleccionar al menos una categoría de servicio para el conductor (ej. Taxi, Estándar, VIP).");
      return;
    }

    try {
      const payload = {
        status: assignForm.status,
        branchIds: assignForm.branchIds,
        allowedCategories: assignForm.allowedCategories,
        assignedTariffIds: assignForm.assignedTariffIds,
        allowedServiceModes: assignForm.allowedServiceModes,
        planType: assignForm.planType,
        maxNegativeBalance: Number(assignForm.maxNegativeBalance) || -10000,
        enabledAt: Date.now(),
        updatedAt: Date.now(),
        activeVehicle: {
          brand: `${assignForm.make} ${assignForm.model}`.trim() || 'Vehículo Habilitado',
          plate: assignForm.licensePlate,
          color: assignForm.color,
          year: Number(assignForm.year) || 2020
        }
      };

      await updateDoc(doc(db, 'drivers', selectedDriver.id), payload);
      alert(`¡Conductor "${selectedDriver.firstName} ${selectedDriver.lastName}" configurado y habilitado con éxito!`);
      setShowAssignModal(false);
      setSelectedDriver(null);
    } catch (err: any) {
      console.error("Error updating driver assignment:", err);
      alert("Error al guardar la asignación: " + err.message);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'drivers', id), { 
        status: newStatus,
        updatedAt: Date.now()
      });
    } catch (err: any) {
      console.error("Error updating status:", err);
      alert("Error al cambiar estado: " + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar al conductor "${name}" del sistema?`)) {
      try {
        await deleteDoc(doc(db, 'drivers', id));
        alert("Conductor eliminado.");
      } catch (err: any) {
        console.error("Error deleting driver:", err);
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  // Helper para nombres de sucursales
  const getBranchBadges = (branchIds?: string[]) => {
    if (!branchIds || branchIds.length === 0 || branchIds.includes('all')) {
      return ['🌐 Todas'];
    }
    return branchIds.map(bId => {
      const found = branches.find(b => b.id === bId);
      return found ? found.name : `Sucursal #${bId.slice(0, 4)}`;
    });
  };

  // Helper para etiquetas de categorías
  const getCategoryLabel = (catId: string) => {
    const found = categories.find(c => c.id === catId);
    return found ? found.name : catId.toUpperCase();
  };

  // Filtrar conductores
  const filtered = drivers.filter(d => {
    const matchSearch = `${d.firstName} ${d.lastName}`.toLowerCase().includes(search.toLowerCase()) || 
                        d.email.toLowerCase().includes(search.toLowerCase()) ||
                        d.phone.includes(search);
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchBranch = filterBranch === 'all' || 
                        (d.branchIds && (d.branchIds.includes('all') || d.branchIds.includes(filterBranch)));
    return matchSearch && matchStatus && matchBranch;
  });

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 p-6 gap-6 overflow-y-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-tech-blue">
            <Users className="h-7 w-7 text-vial-orange" /> Gestión y Habilitación de Conductores
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Habilitación de choferes con asignación de sucursales operativas, categorías autorizadas (Taxi, Estándar, VIP) y tarifarios.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Choferes', value: drivers.length, color: 'text-tech-blue' },
          { label: 'Habilitados (Activos)', value: drivers.filter(d => d.status === 'Activo').length, color: 'text-emerald-600' },
          { label: 'Pendientes de Habilitación', value: drivers.filter(d => d.status === 'Pendiente Documentación' || d.status === 'En Revisión').length, color: 'text-amber-600' },
          { label: 'Suspendidos', value: drivers.filter(d => d.status === 'Suspendido').length, color: 'text-rose-600' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-bold text-slate-700 shadow-xs outline-none focus:border-vial-orange"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Filtro por Sucursal */}
          <select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs outline-none focus:border-vial-orange"
          >
            <option value="all">🏢 Todas las Sucursales</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>📍 {b.name}</option>
            ))}
          </select>

          {/* Filtro por Estado */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs outline-none focus:border-vial-orange"
          >
            <option value="all">⚡ Todos los Estados</option>
            <option value="Activo">Habilitados (Activos)</option>
            <option value="Pendiente Documentación">Pendiente Docs</option>
            <option value="En Revisión">En Revisión</option>
            <option value="Suspendido">Suspendidos</option>
          </select>
        </div>
      </div>

      {/* List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Conductor</th>
                <th className="px-4 py-3 text-left">Contacto</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Sucursales Asignadas</th>
                <th className="px-4 py-3 text-left">Categorías de Servicio</th>
                <th className="px-4 py-3 text-left">Vehículo</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.map(partner => (
                <tr key={partner.id} className="group hover:bg-slate-50/80 transition-colors">
                  
                  {/* Conductor */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        {partner.photoUrl ? (
                          <img src={partner.photoUrl} alt="Chofer" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-bold text-slate-400">
                            {partner.firstName[0]}{partner.lastName[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800">{partner.firstName} {partner.lastName}</p>
                        <p className="text-[10px] font-mono text-slate-400">ID: {partner.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contacto */}
                  <td className="px-4 py-3.5">
                    <p className="flex items-center gap-1 font-medium"><Mail className="h-3 w-3 text-slate-400" /> {partner.email}</p>
                    <p className="flex items-center gap-1 font-mono text-slate-500 mt-0.5"><Phone className="h-3 w-3 text-slate-400" /> {partner.phone}</p>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3.5">
                    {partner.status === 'Activo' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                        <CheckCircle className="h-3 w-3" /> Habilitado
                      </span>
                    ) : partner.status === 'Suspendido' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-[10px] font-black uppercase text-red-700">
                        <XCircle className="h-3 w-3" /> Suspendido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
                        <Clock className="h-3 w-3" /> {partner.status}
                      </span>
                    )}
                  </td>

                  {/* Sucursales */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {getBranchBadges(partner.branchIds).map((bName, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                          <Building2 className="h-2.5 w-2.5 text-vial-orange" />
                          {bName}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Categorías */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(partner.allowedCategories || ['estandar']).map((catId, i) => (
                        <span key={i} className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                          {getCategoryLabel(catId)}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Vehículo */}
                  <td className="px-4 py-3.5">
                    {partner.vehicle ? (
                      <div>
                        <p className="font-bold text-slate-800">{partner.vehicle.make} {partner.vehicle.model}</p>
                        <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">{partner.vehicle.licensePlate} ({partner.vehicle.color || 'Color n/d'})</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Sin Vehículo</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 justify-center">
                      
                      {/* Botón Principal: Habilitar / Asignar Tarifas */}
                      <button
                        onClick={() => handleOpenAssignModal(partner)}
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-bold transition-all text-xs shadow-xs ${
                          partner.status === 'Activo'
                            ? 'bg-tech-blue/5 text-tech-blue border border-tech-blue/20 hover:bg-tech-blue/10'
                            : 'bg-vial-orange text-gray-950 hover:bg-[#ff7b1a]'
                        }`}
                        title="Asignar Sucursal, Categorías y Tarifarios"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {partner.status === 'Activo' ? 'Configurar Tarifas' : 'Habilitar'}
                      </button>

                      <Link
                        href={`/travelcab/drivers/${partner.id}`}
                        className="inline-flex items-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-tech-blue hover:text-tech-blue transition-all"
                        title="Ver Perfil Detallado"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>

                      <button
                        onClick={() => setQrDriverForPrint(partner)}
                        className="inline-flex items-center p-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-all"
                        title="Imprimir Cartel QR de Ventanilla"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </button>

                      {partner.status === 'Activo' ? (
                        <button
                          onClick={() => handleUpdateStatus(partner.id, 'Suspendido')}
                          className="inline-flex items-center p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all"
                          title="Suspender Conductor"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(partner.id, 'Activo')}
                          className="inline-flex items-center p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"
                          title="Reactivar Conductor"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(partner.id, `${partner.firstName} ${partner.lastName}`)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg hover:text-red-700 transition-colors border border-transparent hover:border-red-200"
                        title="Eliminar Conductor"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    No se encontraron conductores registrados con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE HABILITACIÓN Y ASIGNACIÓN DE SUCURSALES, CATEGORÍAS Y TARIFARIOS */}
      {/* ========================================================================= */}
      {showAssignModal && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header del Modal */}
            <div className="bg-tech-blue text-white p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-vial-orange bg-white/10 px-2.5 py-0.5 rounded-full">
                  Habilitación de Socio Conductor
                </span>
                <h2 className="text-xl font-black mt-1">
                  {selectedDriver.firstName} {selectedDriver.lastName}
                </h2>
                <p className="text-xs text-slate-300">Asigna las sucursales, categorías de servicio y tarifarios permitidos.</p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-white/60 hover:text-white text-xl font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveAssignment} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* 1. SUCURSALES ASIGNADAS */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-tech-blue flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-vial-orange" />
                    1. Sucursal(es) de Operación
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (assignForm.branchIds.includes('all')) {
                        setAssignForm(p => ({ ...p, branchIds: branches.map(b => b.id) }));
                      } else {
                        setAssignForm(p => ({ ...p, branchIds: ['all'] }));
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    {assignForm.branchIds.includes('all') ? 'Seleccionar específicas' : 'Todas las sucursales'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    onClick={() => setAssignForm(p => ({ ...p, branchIds: ['all'] }))}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      assignForm.branchIds.includes('all')
                        ? 'border-vial-orange bg-vial-orange/10 font-black text-gray-950'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={assignForm.branchIds.includes('all')}
                      onChange={() => {}}
                      className="rounded text-vial-orange"
                    />
                    <span className="text-xs">🌐 Todas las Sucursales</span>
                  </label>

                  {branches.map(branch => {
                    const isChecked = !assignForm.branchIds.includes('all') && assignForm.branchIds.includes(branch.id);
                    return (
                      <label
                        key={branch.id}
                        onClick={() => {
                          let next = assignForm.branchIds.filter(id => id !== 'all');
                          if (next.includes(branch.id)) {
                            next = next.filter(id => id !== branch.id);
                          } else {
                            next.push(branch.id);
                          }
                          setAssignForm(p => ({ ...p, branchIds: next.length === 0 ? ['all'] : next }));
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-vial-orange bg-vial-orange/10 font-black text-gray-950'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-vial-orange"
                        />
                        <span className="text-xs">📍 {branch.name} ({branch.city || branch.province})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. CATEGORÍAS DE SERVICIO PERMITIDAS */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-tech-blue flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-vial-orange" />
                  2. Categorías de Servicio Habilitadas (Taxi, Estándar, VIP, etc.)
                </label>
                <p className="text-[11px] text-slate-500">
                  El chofer podrá recibir solicitudes y despachos en todas las categorías marcadas.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {categories.map(cat => {
                    const isChecked = assignForm.allowedCategories.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        onClick={() => {
                          const next = isChecked
                            ? assignForm.allowedCategories.filter(c => c !== cat.id)
                            : [...assignForm.allowedCategories, cat.id];
                          setAssignForm(p => ({ ...p, allowedCategories: next }));
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isChecked
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 text-indigo-950 font-black shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black">{cat.name}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-indigo-600"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{cat.description || 'Categoría activa'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. MODALIDADES DE TRANSPORTE */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-tech-blue flex items-center gap-1.5">
                  <Car className="h-4 w-4 text-vial-orange" />
                  3. Modalidades de Transporte Permitidas
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'mu', label: '🏙️ Urbana (MU)', desc: 'Despacho urbano por taxímetro/distancia' },
                    { id: 'arc', label: '🚌 Rural Compartido (ARC)', desc: 'Rutas troncales por asiento' },
                    { id: 'transfers', label: '✈️ Traslados Fijos', desc: 'Punto a punto aeropuertos/hoteles' }
                  ].map(mode => {
                    const isChecked = assignForm.allowedServiceModes.includes(mode.id);
                    return (
                      <label
                        key={mode.id}
                        onClick={() => {
                          const next = isChecked
                            ? assignForm.allowedServiceModes.filter(m => m !== mode.id)
                            : [...assignForm.allowedServiceModes, mode.id];
                          setAssignForm(p => ({ ...p, allowedServiceModes: next }));
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-tech-blue bg-tech-blue/5 text-tech-blue font-black'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs">{mode.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-tech-blue"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-normal">{mode.desc}</p>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. ESQUEMA FINANCIERO Y LÍMITE DE SALDO NEGATIVO */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-tech-blue flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-vial-orange" />
                  4. Esquema Financiero & Saldo Negativo
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Modalidad de Liquidación</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAssignForm(p => ({ ...p, planType: 'commission' }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          assignForm.planType === 'commission'
                            ? 'bg-tech-blue text-white border-tech-blue shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Comisión por Viaje
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignForm(p => ({ ...p, planType: 'membership' }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          assignForm.planType === 'membership'
                            ? 'bg-tech-blue text-white border-tech-blue shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Membresía Semanal
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Límite de Saldo Negativo ($)</label>
                    <input
                      type="number"
                      value={assignForm.maxNegativeBalance}
                      onChange={e => setAssignForm(p => ({ ...p, maxNegativeBalance: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-tech-blue focus:border-vial-orange focus:outline-none"
                      placeholder="-10000"
                    />
                  </div>
                </div>
              </div>

              {/* 5. DATOS DEL VEHÍCULO HABILITADO */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-tech-blue flex items-center gap-1.5">
                  <Car className="h-4 w-4 text-vial-orange" />
                  5. Datos del Vehículo Habilitado
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Marca</label>
                    <input
                      type="text"
                      value={assignForm.make}
                      onChange={e => setAssignForm(p => ({ ...p, make: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-tech-blue focus:outline-none"
                      placeholder="Ej: Toyota"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Modelo</label>
                    <input
                      type="text"
                      value={assignForm.model}
                      onChange={e => setAssignForm(p => ({ ...p, model: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-tech-blue focus:outline-none"
                      placeholder="Ej: Corolla"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Patente</label>
                    <input
                      type="text"
                      value={assignForm.licensePlate}
                      onChange={e => setAssignForm(p => ({ ...p, licensePlate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-tech-blue focus:outline-none uppercase"
                      placeholder="Ej: AF 123 CD"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Año</label>
                    <input
                      type="number"
                      value={assignForm.year}
                      onChange={e => setAssignForm(p => ({ ...p, year: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-tech-blue focus:outline-none"
                      placeholder="2022"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-vial-orange px-6 py-2.5 text-xs font-black text-gray-950 hover:bg-[#ff7b1a] transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Guardar y Habilitar Conductor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Cartel Imprimible de Código QR para Ventanilla */}
      {qrDriverForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 print:p-0 print:bg-white print:static animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
            
            {/* Modal Controls (No se imprimen) */}
            <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-sky-400" />
                <span className="text-sm font-black text-white">Cartel Oficial de Ventanilla para Imprimir</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-vial-orange text-gray-950 text-xs font-black hover:bg-[#ff7b1a] shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Cartel
                </button>
                <button
                  onClick={() => setQrDriverForPrint(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Poster Imprimible (Diseño Premium para Ventanilla de Taxi/Auto) */}
            <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible bg-slate-100/60 print:bg-white flex justify-center">
              <div className="w-full max-w-md bg-white border-2 border-slate-300 rounded-3xl p-6 shadow-xl print:shadow-none print:border-4 print:border-slate-800 print:rounded-3xl flex flex-col items-center text-center relative overflow-hidden">
                
                {/* Franja Superior de Marca */}
                <div className="w-full bg-[#0B192C] text-white py-3 px-4 rounded-2xl mb-4 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-wider text-white">TRAVEL<span className="text-[#38BDF8]">CAB</span></span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 px-2 py-0.5 rounded-full">
                    OFICIAL
                  </span>
                </div>

                <h2 className="text-base font-black text-[#0B192C] uppercase tracking-wide">
                  Escaneá con tu celular
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5 mb-4">
                  Iniciá viaje directo con taxímetro o vinculá tu destino al instante
                </p>

                {/* Código QR Generado */}
                <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=4&data=${encodeURIComponent(
                      `travelapp:driver:${qrDriverForPrint.id}:${(qrDriverForPrint.vehicle?.licensePlate || 'TAXI').replace(/\s+/g, '')}`
                    )}`}
                    alt="QR Conductor"
                    className="w-56 h-56 object-contain"
                  />
                </div>

                {/* Badge con Patente y Código de Conductor */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Patente / Código de Conductor</p>
                  <p className="text-2xl font-black text-[#0284C7] tracking-widest font-mono mt-0.5">
                    {qrDriverForPrint.vehicle?.licensePlate || qrDriverForPrint.id}
                  </p>
                </div>

                {/* Ficha del Conductor y Vehículo */}
                <div className="w-full border-t border-dashed border-slate-200 pt-3 text-left grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Conductor</span>
                    <span className="font-extrabold text-slate-800">{qrDriverForPrint.firstName} {qrDriverForPrint.lastName}</span>
                  </div>
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehículo</span>
                    <span className="font-extrabold text-slate-800">
                      {qrDriverForPrint.vehicle?.make || 'Auto'} {qrDriverForPrint.vehicle?.model || ''}
                    </span>
                  </div>
                </div>

                {/* Pasos de Uso */}
                <div className="w-full mt-4 bg-sky-50/60 border border-sky-100 rounded-2xl p-3 text-left">
                  <p className="text-[11px] font-black text-sky-950 uppercase tracking-wider mb-1">
                    ¿Cómo funciona?
                  </p>
                  <ol className="text-[11px] text-sky-800 space-y-0.5 list-decimal list-inside font-medium leading-relaxed">
                    <li>Abrí la app <b>TravelApp</b> en tu celular.</li>
                    <li>Presioná el botón <b>"Escanear QR Chofer"</b>.</li>
                    <li>Apuntá tu cámara a este código para vincularte.</li>
                  </ol>
                </div>

                {/* Pie de cartel */}
                <p className="mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  TravelApp Ecosystem • Movilidad Confiable
                </p>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

