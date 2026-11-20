'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Trash2,
  Mail,
  Phone,
  MessageCircle,
  FileText,
  Printer,
  ExternalLink,
  Eye,
  X,
  PauseCircle,
  PlayCircle,
  Calendar,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const STAGES = ['Nueva', 'En Revisión', 'Entrevista', 'Contratado', 'Descartado'] as const;

function escapeHtml(str: string) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(ts: any) {
  if (!ts) return '—';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getWhatsAppDigits(raw?: string) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('54') ? digits : `549${digits}`;
}

export function PostulacionesTab() {
  const [applications, setApplications] = useState<any[]>([]);
  const [openings, setOpenings] = useState<any[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobArea, setJobArea] = useState('Operaciones');
  const [jobModality, setJobModality] = useState('Presencial / Híbrido');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  useEffect(() => {
    const unsubApps = onSnapshot(
      query(collection(db, 'job_applications'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setApplications(list);
        setSelectedApp((prev: any) =>
          prev ? list.find((a) => a.id === prev.id) || null : null
        );
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

  const handleToggleJobActive = async (job: any) => {
    const nextActive = job.active === false || job.publishedOnWeb === false;
    await updateDoc(doc(db, 'job_openings', job.id), {
      active: nextActive,
      publishedOnWeb: nextActive,
    });
  };

  const handlePrintCandidate = (app: any) => {
    const fullName = app.fullName || app.name || 'Postulante';
    const job = app.jobTitle || app.positionTitle || 'Postulación Espontánea';
    const motivation = app.motivation || app.message || 'Sin respuesta registrada.';
    const cvUrl = app.cvUrl || '';
    const cvLink = app.cvLink || '';
    const isImageCv =
      cvUrl &&
      ((app.cvMimeType || '').startsWith('image/') ||
        /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(cvUrl) ||
        cvUrl.startsWith('data:image/'));

    const win = window.open('', '_blank', 'width=900,height=750');
    if (!win) {
      alert('Permití las ventanas emergentes en tu navegador para imprimir la ficha.');
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ficha RRHH - ${escapeHtml(fullName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 32px; line-height: 1.5; }
    .header { border-bottom: 3px solid #0a2a5b; padding-bottom: 14px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 20px; font-weight: 800; color: #0a2a5b; letter-spacing: -0.02em; }
    .sub { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.12em; }
    .badge { display: inline-block; padding: 4px 10px; background: #e2e8f0; color: #0a2a5b; font-size: 11px; font-weight: 700; border-radius: 4px; }
    h1 { font-size: 24px; margin: 0 0 6px; color: #0f172a; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 18px 0 24px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; }
    .field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; }
    .field-val { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px; word-break: break-word; }
    .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #0a2a5b; font-weight: 800; margin: 22px 0 8px; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; background: #ffffff; font-size: 13px; white-space: pre-wrap; }
    .cv-img { max-width: 100%; border: 1px solid #e2e8f0; margin-top: 12px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="sub">Concorde 360 · Recursos Humanos</div>
      <div class="brand">TravelApp · Ficha de Postulante</div>
    </div>
    <div class="badge">Etapa: ${escapeHtml(app.status || 'Nueva')}</div>
  </div>

  <h1>${escapeHtml(fullName)}</h1>
  <div style="font-size: 14px; font-weight: 700; color: #0a2a5b;">Puesto: ${escapeHtml(job)}</div>

  <div class="grid">
    <div>
      <div class="field-label">Correo Electrónico</div>
      <div class="field-val">${escapeHtml(app.email || '—')}</div>
    </div>
    <div>
      <div class="field-label">Fecha de Postulación</div>
      <div class="field-val">${escapeHtml(formatDate(app.createdAt || app.timestamp))}</div>
    </div>
    <div>
      <div class="field-label">Teléfono</div>
      <div class="field-val">${escapeHtml(app.phone || '—')}</div>
    </div>
    <div>
      <div class="field-label">WhatsApp</div>
      <div class="field-val">${escapeHtml(app.whatsapp || app.phone || '—')}</div>
    </div>
    ${
      cvLink
        ? `<div style="grid-column: span 2;">
             <div class="field-label">Enlace LinkedIn / Portfolio / Drive</div>
             <div class="field-val">${escapeHtml(cvLink)}</div>
           </div>`
        : ''
    }
    ${
      app.cvFileName
        ? `<div style="grid-column: span 2;">
             <div class="field-label">Archivo de Currículum Adjunto</div>
             <div class="field-val">${escapeHtml(app.cvFileName)}</div>
           </div>`
        : ''
    }
  </div>

  <div class="section-title">¿Por qué quiere formar parte de TravelApp y qué valor aportaría?</div>
  <div class="box">${escapeHtml(motivation)}</div>

  ${
    isImageCv
      ? `<div class="section-title">Currículum Vitae Adjunto</div><img src="${cvUrl}" class="cv-img" />`
      : ''
  }

  <div class="footer">
    <span>Documento confidencial — Uso interno RRHH TravelApp S.A.S.</span>
    <span>Impreso el ${escapeHtml(new Date().toLocaleDateString('es-AR'))}</span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`);
    win.document.close();
  };

  const renderCvPreview = (app: any) => {
    const cvUrl = app.cvUrl || '';
    const cvLink = app.cvLink || '';
    const mime = String(app.cvMimeType || '').toLowerCase();
    const fileName = app.cvFileName || 'Curriculum_Vitae';

    const isPdf =
      cvUrl &&
      (mime.includes('pdf') ||
        /\.pdf(\?.*)?$/i.test(cvUrl) ||
        /\.pdf$/i.test(fileName) ||
        cvUrl.startsWith('data:application/pdf'));

    const isImage =
      cvUrl &&
      (mime.startsWith('image/') ||
        /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(cvUrl) ||
        cvUrl.startsWith('data:image/'));

    if (!cvUrl && !cvLink) {
      return (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 text-center">
          Este postulante no adjuntó archivo ni enlace de Currículum Vitae.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#0a2a5b] shrink-0" />
            <span className="text-xs font-bold text-slate-800 truncate">
              {cvUrl ? fileName : 'Enlace externo de CV / Perfil'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cvUrl && (
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={cvUrl.startsWith('data:') ? fileName : undefined}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-[11px] font-bold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir / Imprimir CV</span>
              </a>
            )}
            {cvLink && (
              <a
                href={cvLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-[#0a2a5b] text-[11px] font-bold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Enlace Externo</span>
              </a>
            )}
          </div>
        </div>

        {isPdf && (
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <iframe
              src={cvUrl}
              title={`CV de ${app.fullName || 'Postulante'}`}
              className="w-full h-[460px] bg-white"
            />
          </div>
        )}

        {isImage && (
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex justify-center">
            <img
              src={cvUrl}
              alt={`CV de ${app.fullName || 'Postulante'}`}
              className="max-h-[460px] w-auto object-contain rounded"
            />
          </div>
        )}

        {cvUrl && !isPdf && !isImage && (
          <p className="text-[11px] text-slate-500">
            Archivo formato Word/documento: hacé clic en <strong>Abrir / Imprimir CV</strong> para descargarlo y analizarlo en tu equipo.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a2a5b]">Postulaciones y Puestos Abiertos</h2>
          <p className="text-xs text-slate-500">
            Cada puesto publicado aquí se replica automáticamente en <strong>travelapp.ar</strong>. Analizá e imprimí currículums desde cada ficha.
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
              <option value="Tecnología / Marketing">Tecnología / Marketing</option>
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
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowJobForm(false)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#0a2a5b] text-white text-xs font-bold cursor-pointer">
              Publicar en Web
            </button>
          </div>
        </form>
      )}

      {/* Puestos Publicados */}
      {openings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Puestos Publicados ({openings.filter((o) => o.active !== false && o.publishedOnWeb !== false).length} activos en web / {openings.length} totales)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {openings.map((job) => {
              const isLive = job.active !== false && job.publishedOnWeb !== false;
              return (
                <div
                  key={job.id}
                  className={`rounded-xl border p-3.5 flex items-start justify-between gap-2 ${
                    isLive
                      ? 'border-slate-200/90 bg-white/90'
                      : 'border-slate-200 bg-slate-100/70 opacity-75'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-[#0a2a5b] flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 shrink-0" /> {job.title}
                      </p>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isLive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isLive ? 'Visible en Web' : 'Pausado'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {job.area} · {job.modality}
                    </p>
                    {job.description && (
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                        {job.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleJobActive(job)}
                      title={isLive ? 'Pausar publicación en web' : 'Reactivar en web'}
                      className="p-1 text-slate-400 hover:text-[#0a2a5b] cursor-pointer"
                    >
                      {isLive ? (
                        <PauseCircle className="w-4 h-4" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDoc(doc(db, 'job_openings', job.id))}
                      title="Eliminar puesto"
                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
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
                stageApps.map((app) => {
                  const hasCv = Boolean(app.cvUrl || app.cvLink);
                  const motivation = app.motivation || app.message || '';
                  return (
                    <div
                      key={app.id}
                      className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1.5 text-xs shadow-xs hover:border-[#0a2a5b]/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-bold text-slate-800 leading-tight">
                          {app.fullName || app.name || 'Postulante'}
                        </p>
                        {hasCv && (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                            CV
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-[#0a2a5b]">
                        {app.jobTitle || app.positionTitle || 'Postulación Espontánea'}
                      </p>
                      {app.email && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" /> {app.email}
                        </p>
                      )}
                      {app.phone && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" /> {app.phone}
                        </p>
                      )}
                      {app.whatsapp && (
                        <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 shrink-0" /> WA: {app.whatsapp}
                        </p>
                      )}
                      {motivation && (
                        <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded p-1.5 line-clamp-2 italic">
                          &ldquo;{motivation}&rdquo;
                        </p>
                      )}

                      <div className="pt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-[#0a2a5b] hover:bg-[#071f45] text-white text-[10px] font-bold cursor-pointer transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ficha & CV</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintCandidate(app)}
                          title="Imprimir ficha"
                          className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-[#0a2a5b] hover:bg-slate-50 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                        </button>
                      </div>

                      <select
                        value={app.status || 'Nueva'}
                        onChange={(e) =>
                          updateDoc(doc(db, 'job_applications', app.id), { status: e.target.value })
                        }
                        className="w-full mt-1 px-2 py-1 rounded border border-slate-200 text-[11px] font-semibold text-[#0a2a5b] outline-none bg-slate-50"
                      >
                        {STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Ficha de Postulante: Análisis completo, Visor de CV e Impresión */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Ficha */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Ficha de Postulante · Concorde 360 RRHH
                </span>
                <h3 className="text-2xl font-black text-[#0a2a5b] mt-0.5">
                  {selectedApp.fullName || selectedApp.name || 'Postulante'}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                    <Briefcase className="w-3.5 h-3.5 text-[#0a2a5b]" />
                    {selectedApp.jobTitle || selectedApp.positionTitle || 'Postulación Espontánea'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(selectedApp.createdAt || selectedApp.timestamp)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedApp.status || 'Nueva'}
                  onChange={(e) =>
                    updateDoc(doc(db, 'job_applications', selectedApp.id), {
                      status: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-[#0a2a5b] bg-white outline-none"
                >
                  {STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handlePrintCandidate(selectedApp)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Ficha</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  aria-label="Cerrar ficha"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Datos de contacto rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <a
                href={`mailto:${selectedApp.email || ''}`}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-[#0a2a5b] transition flex items-center gap-2.5"
              >
                <Mail className="w-4 h-4 text-[#0a2a5b] shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Correo</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {selectedApp.email || '—'}
                  </span>
                </div>
              </a>

              <a
                href={`tel:${String(selectedApp.phone || '').replace(/[^0-9+]/g, '')}`}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-[#0a2a5b] transition flex items-center gap-2.5"
              >
                <Phone className="w-4 h-4 text-[#0a2a5b] shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Teléfono</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {selectedApp.phone || '—'}
                  </span>
                </div>
              </a>

              <a
                href={
                  getWhatsAppDigits(selectedApp.whatsapp || selectedApp.phone)
                    ? `https://wa.me/${getWhatsAppDigits(selectedApp.whatsapp || selectedApp.phone)}`
                    : '#'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:border-emerald-500 transition flex items-center gap-2.5"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-emerald-700">WhatsApp</span>
                  <span className="font-bold text-emerald-900 truncate block">
                    {selectedApp.whatsapp || selectedApp.phone || '—'}
                  </span>
                </div>
              </a>
            </div>

            {/* Respuesta Motivacional */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0a2a5b]">
                ¿Por qué quiere formar parte de TravelApp y qué valor aportaría?
              </h4>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedApp.motivation || selectedApp.message || 'Sin respuesta registrada.'}
              </div>
            </div>

            {/* Visor de Currículum Vitae */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0a2a5b]">
                Currículum Vitae Adjunto
              </h4>
              {renderCvPreview(selectedApp)}
            </div>

            {/* Pie acciones */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={async () => {
                  if (confirm('¿Eliminar permanentemente esta postulación?')) {
                    await deleteDoc(doc(db, 'job_applications', selectedApp.id));
                    setSelectedApp(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar postulación
              </button>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
