'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Trash2, Mail, Phone } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const STAGES = ['Nueva', 'En Revisión', 'Entrevista', 'Contratado', 'Descartado'] as const;

export function PostulacionesTab() {
  const [applications, setApplications] = useState<any[]>([]);
  const [openings, setOpenings] = useState<any[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobArea, setJobArea] = useState('Operaciones');
  const [jobModality, setJobModality] = useState('Presencial / Híbrido');
  const [jobDescription, setJobDescription] = useState('');

  useEffect(() => {
    const unsubApps = onSnapshot(
      query(collection(db, 'job_applications'), orderBy('createdAt', 'desc')),
      (snap) => {
        setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    const unsubJobs = onSnapshot(
      query(collection(db, 'job_openings'), orderBy('createdAt', 'desc')),
      (snap) => {
        setOpenings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => {
      unsubApps();
      unsubJobs();
    };
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) return;
    await addDoc(collection(db, 'job_openings'), {
      title: jobTitle.trim(),
      area: jobArea,
      modality: jobModality,
      description: jobDescription.trim(),
      active: true,
      publishedOnWeb: true,
      createdAt: Date.now(),
    });
    setJobTitle('');
    setJobDescription('');
    setShowJobForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Postulaciones y Puestos Abiertos</h2>
          <p className="text-xs text-slate-500">
            Seguimiento tipo CRM de postulantes web (`job_applications`) y publicación de búsquedas (`job_openings`).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowJobForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" /> Crear Puesto (Web)
        </button>
      </div>

      {/* Formulario Crear Puesto */}
      {showJobForm && (
        <form onSubmit={handleCreateJob} className="bg-white/85 border border-slate-200/90 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Título del puesto (ej. Operador de Tráfico)"
              required
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
            <select
              value={jobArea}
              onChange={(e) => setJobArea(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            >
              <option value="Operaciones">Operaciones</option>
              <option value="TravelCab">TravelCab</option>
              <option value="Experience">Experience</option>
              <option value="Comercial / CRM">Comercial / CRM</option>
              <option value="Administración">Administración</option>
            </select>
            <input
              type="text"
              value={jobModality}
              onChange={(e) => setJobModality(e.target.value)}
              placeholder="Modalidad / Ubicación"
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
            />
          </div>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Requisitos y descripción del puesto para publicar en la web..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none"
          />
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer">
              Publicar Puesto
            </button>
          </div>
        </form>
      )}

      {/* Puestos Activos */}
      {openings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Puestos Publicados ({openings.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {openings.map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-200/90 bg-white/80 p-3.5 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0a2a5b] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> {job.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{job.area} · {job.modality}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDoc(doc(db, 'job_openings', job.id))}
                  className="text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban / Pipeline CRM de Postulaciones */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STAGES.map((stage) => {
          const stageApps = applications.filter((a) => (a.status || 'Nueva') === stage);
          return (
            <div key={stage} className="rounded-xl border border-slate-200/90 bg-white/70 p-3 space-y-2.5 min-h-[220px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-[#0a2a5b]">{stage}</span>
                <span className="text-[10px] font-bold bg-[#0a2a5b]/10 text-[#0a2a5b] px-2 py-0.5 rounded-full">
                  {stageApps.length}
                </span>
              </div>
              {stageApps.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-6">Sin postulantes</p>
              ) : (
                stageApps.map((app) => (
                  <div key={app.id} className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1.5 text-xs">
                    <p className="font-bold text-slate-800">{app.fullName || app.name || 'Postulante'}</p>
                    <p className="text-[11px] font-semibold text-[#0a2a5b]">{app.jobTitle || 'Postulación general'}</p>
                    {app.email && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" /> {app.email}
                      </p>
                    )}
                    {app.phone && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {app.phone}
                      </p>
                    )}
                    <select
                      value={app.status || 'Nueva'}
                      onChange={(e) => updateDoc(doc(db, 'job_applications', app.id), { status: e.target.value })}
                      className="w-full mt-1 px-2 py-1 rounded border border-slate-200 text-[11px] font-semibold text-[#0a2a5b] outline-none"
                    >
                      {STAGES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
