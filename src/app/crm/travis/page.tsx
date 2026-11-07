'use client';

import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  TravisConfig, TravisKnowledgeEntry, DEFAULT_TRAVIS_CONFIG,
  MessageChannel, CommentAutomationRule, DEFAULT_COMMENT_RULES, BusinessUnit,
} from '@/types/messaging';
import {
  Bot, Save, RefreshCw, Send, Plus, Edit2, Trash2, Check, X,
  AlertCircle, Zap, BookOpen,
  Settings, MessageSquare, Phone, Globe,
  ThumbsUp, ThumbsDown, Sparkles,
  ToggleLeft, ToggleRight, Clock,
} from 'lucide-react';

// Inline SVG para íconos de redes sociales no disponibles en lucide-react v1.x
const Instagram = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const Facebook = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

// ─── Channel status badge ─────────────────────────────────────────────────────

const CHANNEL_CONFIG = [
  { key: 'whatsapp' as MessageChannel, label: 'WhatsApp Oficial', icon: Phone, color: 'emerald', desc: 'Conectado directo por Meta Cloud API ($0 costo extra).' },
  { key: 'instagram' as MessageChannel, label: 'Instagram DM + Comentarios', icon: Instagram, color: 'pink', desc: 'Conectado directo por Meta Graph API (DMs y Private Replies).' },
  { key: 'messenger' as MessageChannel, label: 'Facebook Messenger + Comentarios', icon: Facebook, color: 'blue', desc: 'Conectado directo por Meta Graph API (Messenger y Feed).' },
  { key: 'web' as MessageChannel, label: 'Chat Web', icon: Globe, color: 'sky', desc: 'Widget nativo de chat en las landing pages de TravelApp.' },
];

type TravisTab = 'prompt' | 'knowledge' | 'comments' | 'channels' | 'training';

// ─── System Prompt Tab ────────────────────────────────────────────────────────

function SystemPromptTab({ config, onSave }: { config: TravisConfig; onSave: (partial: Partial<TravisConfig>) => Promise<void> }) {
  const [prompt, setPrompt] = useState(config.systemPrompt);
  const [context, setContext] = useState(config.businessContext);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrompt(config.systemPrompt);
    setContext(config.businessContext);
  }, [config.systemPrompt, config.businessContext]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ systemPrompt: prompt, businessContext: context });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const VARIABLES = ['{nombre}', '{unidad_negocio}', '{puntos_rewards}', '{conductor}', '{eta}', '{destino}'];

  return (
    <div className="space-y-5">
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex gap-2.5">
        <Sparkles className="h-4 w-4 text-tech-blue flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-slate-700">¿Qué es el System Prompt?</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Es la "personalidad" y las instrucciones base de Travis. Define cómo debe hablar, qué sabe y qué tiene que hacer en cada situación. Cuanto más detallado, mejor responderá.
          </p>
        </div>
      </div>

      {/* Variables disponibles */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Variables disponibles</label>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map(v => (
            <button
              key={v}
              onClick={() => setPrompt(p => p + ' ' + v)}
              className="px-2 py-1 bg-slate-100 hover:bg-tech-blue/10 hover:text-tech-blue border border-slate-200 rounded-lg text-xs font-mono transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Context */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Contexto del Negocio
          <span className="ml-1 text-slate-400 font-normal">(breve descripción de TravelApp)</span>
        </label>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-tech-blue/20 resize-none"
          placeholder="Descripción del negocio..."
        />
      </div>

      {/* System prompt */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          System Prompt Principal
          <span className="ml-1 text-slate-400 font-normal">({prompt.length} caracteres)</span>
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={18}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-tech-blue/20 resize-none font-mono leading-relaxed"
          placeholder="Instrucciones detalladas para Travis..."
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="flex items-center gap-2 px-5 py-2.5 bg-tech-blue hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-70"
      >
        {saved ? <><Check className="h-4 w-4" /> ¡Guardado!</> : saving ? <><RefreshCw className="h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4" /> Guardar System Prompt</>}
      </button>
    </div>
  );
}

// ─── Knowledge Base Tab ───────────────────────────────────────────────────────

function KnowledgeBaseTab({ config, onSave }: { config: TravisConfig; onSave: (partial: Partial<TravisConfig>) => Promise<void> }) {
  const [entries, setEntries] = useState<TravisKnowledgeEntry[]>(config.knowledgeBase || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<TravisKnowledgeEntry['category']>('General');
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEntries(config.knowledgeBase || []);
  }, [config.knowledgeBase]);

  const CATEGORIES: TravisKnowledgeEntry['category'][] = ['TravelCab', 'Experiences', 'Rewards', 'General', 'Drivers'];
  const CATEGORY_COLORS: Record<string, string> = {
    TravelCab: 'bg-blue-100 text-blue-700',
    Experiences: 'bg-emerald-100 text-emerald-700',
    Rewards: 'bg-amber-100 text-amber-700',
    General: 'bg-slate-100 text-slate-600',
    Drivers: 'bg-orange-100 text-orange-700',
  };

  const saveEntry = async (isNew: boolean) => {
    setSaving(true);
    let updated: TravisKnowledgeEntry[];
    if (isNew) {
      const newEntry: TravisKnowledgeEntry = {
        id: `kb_${Date.now()}`,
        title: editTitle,
        content: editContent,
        category: editCategory,
        createdAt: Date.now(),
      };
      updated = [...entries, newEntry];
    } else {
      updated = entries.map(e => e.id === editingId ? { ...e, title: editTitle, content: editContent, category: editCategory } : e);
    }
    await onSave({ knowledgeBase: updated });
    setEntries(updated);
    setEditingId(null);
    setAddingNew(false);
    setEditTitle('');
    setEditContent('');
    setSaving(false);
  };

  const deleteEntry = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    await onSave({ knowledgeBase: updated });
    setEntries(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            Agregá artículos de conocimiento para que Travis pueda responder con información específica y precisa sobre TravelApp.
          </p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setEditTitle(''); setEditContent(''); setEditCategory('General'); }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-tech-blue text-white text-xs font-bold rounded-lg"
        >
          <Plus className="h-3.5 w-3.5" /> Nuevo Artículo
        </button>
      </div>

      {/* New/Edit form */}
      {(addingNew || editingId) && (
        <div className="bg-white border border-tech-blue/30 rounded-xl p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-slate-800">{addingNew ? 'Nuevo Artículo' : 'Editar Artículo'}</h4>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Título del artículo (ej: Tarifas TravelCab)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tech-blue/20"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setEditCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${editCategory === cat ? 'border-tech-blue bg-tech-blue/10 text-tech-blue' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={6}
            placeholder="Contenido del artículo. Podés usar Markdown (**negrita**, listas, etc.)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tech-blue/20 resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={() => saveEntry(addingNew)}
              disabled={saving || !editTitle.trim() || !editContent.trim()}
              className="px-4 py-2 bg-tech-blue text-white text-sm font-bold rounded-lg disabled:opacity-50"
            >
              {saving ? 'Guardando...' : <><Save className="h-3.5 w-3.5 inline mr-1" /> Guardar</>}
            </button>
            <button onClick={() => { setEditingId(null); setAddingNew(false); }} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Entries list */}
      {entries.length === 0 && !addingNew ? (
        <div className="text-center py-10 text-slate-400">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin artículos. Agregá el primero para entrenar a Travis.</p>
          <p className="text-xs mt-1">Ej: "Tarifas TravelCab", "¿Cómo funciona Rewards?", "Requisitos para conductores"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{entry.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CATEGORY_COLORS[entry.category] || 'bg-slate-100 text-slate-500'}`}>
                      {entry.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{entry.content}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setEditingId(entry.id); setAddingNew(false); setEditTitle(entry.title); setEditContent(entry.content); setEditCategory(entry.category); }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                  <button onClick={() => deleteEntry(entry.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comment Automation Tab (Instagram & Facebook Specific Posts) ─────────────

function CommentAutomationTab({
  config,
  onSave,
}: {
  config: TravisConfig;
  onSave: (partial: Partial<TravisConfig>) => Promise<void>;
}) {
  const [rules, setRules] = useState<CommentAutomationRule[]>(
    config.commentRules && config.commentRules.length > 0
      ? config.commentRules
      : DEFAULT_COMMENT_RULES
  );
  const [editingRule, setEditingRule] = useState<CommentAutomationRule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [fetchedPosts, setFetchedPosts] = useState<{
    instagram: { id: string; caption: string; permalink: string }[];
    facebook: { id: string; caption: string; permalink: string }[];
  }>({ instagram: [], facebook: [] });

  // Form states
  const [keywordsInput, setKeywordsInput] = useState('');
  const [publicRepliesInput, setPublicRepliesInput] = useState('');

  useEffect(() => {
    if (config.commentRules && config.commentRules.length > 0) {
      setRules(config.commentRules);
    }
  }, [config.commentRules]);

  const BUSINESS_UNITS: BusinessUnit[] = [
    'TravelApp Experience',
    'TravelCab (Usuario)',
    'TravelCab (Conductor)',
    'TravelApp Rewards',
    'TravelApp Afiliados',
    'TravelApp',
  ];

  const handleLoadPostsFromMeta = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch('/api/webhooks/meta-social?action=list_posts');
      const data = await res.json();
      if (data.posts) {
        setFetchedPosts(data.posts);
      }
    } catch (err) {
      console.warn('Error cargando publicaciones de Meta:', err);
    }
    setLoadingPosts(false);
  };

  const openNewRule = () => {
    const draft: CommentAutomationRule = {
      id: `rule_${Date.now()}`,
      name: '',
      platform: 'both',
      postId: 'ALL',
      postUrl: '',
      keywords: ['info', 'precio'],
      publicReplies: [
        '¡Hola @{usuario}! 🙌 Ya te enviamos toda la información por mensaje privado. ¡Revisá tu bandeja!',
      ],
      sendPrivateDm: true,
      privateDmText:
        '¡Hola @{usuario}! 👋 Soy Travis de TravelApp. Vi tu comentario en nuestra publicación y te escribo por privado para pasarte toda la info. ¿En qué te puedo ayudar?',
      useTravisAiForDm: true,
      businessUnit: 'TravelApp Experience',
      isActive: true,
      stats: { commentsReplied: 0, dmsSent: 0 },
      createdAt: Date.now(),
    };
    setEditingRule(draft);
    setKeywordsInput(draft.keywords.join(', '));
    setPublicRepliesInput(draft.publicReplies.join('\n'));
    setIsNew(true);
  };

  const openEditRule = (rule: CommentAutomationRule) => {
    setEditingRule({ ...rule });
    setKeywordsInput((rule.keywords || []).join(', '));
    setPublicRepliesInput((rule.publicReplies || []).join('\n'));
    setIsNew(false);
  };

  const handleSaveRule = async () => {
    if (!editingRule || !editingRule.name.trim()) return;
    setSaving(true);
    const cleanedRule: CommentAutomationRule = {
      ...editingRule,
      postId: editingRule.postId.trim() || 'ALL',
      keywords: keywordsInput
        .split(',')
        .map(k => k.trim())
        .filter(Boolean),
      publicReplies: publicRepliesInput
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean),
    };

    const updated = isNew
      ? [...rules, cleanedRule]
      : rules.map(r => (r.id === cleanedRule.id ? cleanedRule : r));

    await onSave({ commentRules: updated });
    setRules(updated);
    setEditingRule(null);
    setIsNew(false);
    setSaving(false);
  };

  const handleToggleRule = async (id: string) => {
    const updated = rules.map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    setRules(updated);
    await onSave({ commentRules: updated });
  };

  const handleDeleteRule = async (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    await onSave({ commentRules: updated });
  };

  return (
    <div className="space-y-4">
      <div className="bg-pink-50/70 border border-pink-200 rounded-xl p-3.5 flex items-start justify-between gap-3">
        <div className="flex gap-2.5">
          <Instagram className="h-4 w-4 text-pink-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-800">
              Respuesta Automática a Comentarios + Envío de DM (Instagram & Facebook)
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Configurá respuestas para <strong>publicaciones o Reels específicos</strong> (o para todos tus posteos). Cuando alguien comenta una palabra clave, Travis responde en el comentario público y le abre una conversación por mensaje privado (Private Reply).
            </p>
          </div>
        </div>
        <button
          onClick={openNewRule}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-tech-blue text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva Regla de Posteo
        </button>
      </div>

      {/* Formulario Crear/Editar Regla */}
      {editingRule && (
        <div className="bg-white border-2 border-tech-blue/30 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-800">
              {isNew ? '✨ Nueva Regla de Comentarios en Publicación' : `✏️ Editando: ${editingRule.name}`}
            </h4>
            <button
              onClick={() => setEditingRule(null)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre de la Regla / Publicación
              </label>
              <input
                value={editingRule.name}
                onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                placeholder="Ej: Reel Excursión Tafí del Valle / Búsqueda Choferes"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tech-blue/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Red Social</label>
              <select
                value={editingRule.platform}
                onChange={e => setEditingRule({ ...editingRule, platform: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-semibold text-slate-700"
              >
                <option value="both">📸 + 📘 Instagram y Facebook</option>
                <option value="instagram">📸 Solo Instagram (Post / Reel)</option>
                <option value="facebook">📘 Solo Facebook Page</option>
              </select>
            </div>
          </div>

          {/* Selección de Publicación Específica */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-700">
                🎯 ¿En qué publicación debe actuar Travis?
              </label>
              <button
                type="button"
                onClick={handleLoadPostsFromMeta}
                disabled={loadingPosts}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:border-tech-blue text-slate-700 text-[11px] font-bold rounded-lg transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${loadingPosts ? 'animate-spin text-tech-blue' : ''}`} />
                {loadingPosts ? 'Consultando Meta...' : 'Cargar mis publicaciones de IG/FB'}
              </button>
            </div>

            {(fetchedPosts.instagram.length > 0 || fetchedPosts.facebook.length > 0) && (
              <div>
                <select
                  value={editingRule.postId}
                  onChange={e => setEditingRule({ ...editingRule, postId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
                >
                  <option value="ALL">🌐 Todas las publicaciones (cualquier post o Reel)</option>
                  {fetchedPosts.instagram.map(p => (
                    <option key={p.id} value={p.id}>
                      📸 [IG {p.id}] {p.caption.slice(0, 70)}...
                    </option>
                  ))}
                  {fetchedPosts.facebook.map(p => (
                    <option key={p.id} value={p.id}>
                      📘 [FB {p.id}] {p.caption.slice(0, 70)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  ID de Publicación (o escribí <code className="font-mono font-bold">ALL</code> para todas)
                </label>
                <input
                  value={editingRule.postId}
                  onChange={e => setEditingRule({ ...editingRule, postId: e.target.value })}
                  placeholder="ALL o el ID numérico del Post/Reel (ej: 180293847291)"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Link del Post / Reel (opcional, como referencia)
                </label>
                <input
                  value={editingRule.postUrl || ''}
                  onChange={e => setEditingRule({ ...editingRule, postUrl: e.target.value })}
                  placeholder="https://www.instagram.com/reel/..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Palabras clave disparadoras (separadas por coma)
              </label>
              <input
                value={keywordsInput}
                onChange={e => setKeywordsInput(e.target.value)}
                placeholder="info, precio, valor, quiero, chofer (vacío = responde a todo)"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Si lo dejás vacío, Travis responderá a cualquier comentario en esa publicación.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unidad de Negocio Asignada
              </label>
              <select
                value={editingRule.businessUnit}
                onChange={e =>
                  setEditingRule({ ...editingRule, businessUnit: e.target.value as BusinessUnit })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-semibold text-slate-700"
              >
                {BUSINESS_UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Clasifica automáticamente el Lead en el CRM y le da contexto a Travis.
              </p>
            </div>
          </div>

          {/* Respuestas públicas en el comentario */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              💬 Respuesta(s) Pública(s) en el Comentario (una por línea — rotan al azar)
            </label>
            <textarea
              value={publicRepliesInput}
              onChange={e => setPublicRepliesInput(e.target.value)}
              rows={3}
              placeholder="¡Hola @{usuario}! 🙌 Te enviamos toda la info por mensaje privado."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Usá <code className="bg-slate-100 px-1 rounded">{'{usuario}'}</code> para mencionar automáticamente a quien comentó.
            </p>
          </div>

          {/* Mensaje Privado (DM) automático */}
          <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">
                  📩 Enviar también Mensaje Privado (DM) automático al usuario
                </span>
                <p className="text-[11px] text-slate-500">
                  Abre el chat privado con el usuario en Instagram/Messenger usando la API oficial de Private Replies.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingRule({ ...editingRule, sendPrivateDm: !editingRule.sendPrivateDm })
                }
              >
                {editingRule.sendPrivateDm ? (
                  <ToggleRight className="h-7 w-7 text-tech-blue" />
                ) : (
                  <ToggleLeft className="h-7 w-7 text-slate-300" />
                )}
              </button>
            </div>

            {editingRule.sendPrivateDm && (
              <>
                <textarea
                  value={editingRule.privateDmText}
                  onChange={e => setEditingRule({ ...editingRule, privateDmText: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-lg bg-white resize-none"
                  placeholder="Mensaje privado inicial..."
                />
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingRule.useTravisAiForDm}
                    onChange={e =>
                      setEditingRule({ ...editingRule, useTravisAiForDm: e.target.checked })
                    }
                    className="rounded border-slate-300 text-tech-blue"
                  />
                  <span>
                    <strong>Potenciar con Travis IA (Gemini 2.5 Flash):</strong> adaptar el DM exactamente a lo que preguntó en el comentario usando el catálogo de <strong>{editingRule.businessUnit}</strong>.
                  </span>
                </label>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveRule}
              disabled={saving || !editingRule.name.trim()}
              className="px-4 py-2 bg-tech-blue hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Guardando...' : 'Guardar Regla'}
            </button>
            <button
              onClick={() => setEditingRule(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Listado de Reglas Activas */}
      <div className="space-y-2.5">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`border rounded-xl p-3.5 transition-all ${
              rule.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">{rule.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-100 text-pink-700">
                    {rule.platform === 'both'
                      ? '📸 IG + 📘 FB'
                      : rule.platform === 'instagram'
                        ? '📸 Instagram'
                        : '📘 Facebook'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700">
                    {rule.businessUnit}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-600">
                    {rule.postId === 'ALL' ? '🌐 Todos los posteos' : `📌 Post ID: ${rule.postId}`}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {rule.keywords && rule.keywords.length > 0 ? (
                    rule.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold"
                      >
                        #{kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-semibold">
                      ⚡ Responde a cualquier comentario
                    </span>
                  )}
                </div>

                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  <p className="truncate">
                    <strong>💬 Público:</strong> {rule.publicReplies?.[0] || '—'}
                  </p>
                  {rule.sendPrivateDm && (
                    <p className="truncate text-indigo-600">
                      <strong>📩 DM Privado:</strong> {rule.privateDmText}
                    </p>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-400">
                  <span>💬 {rule.stats?.commentsReplied || 0} comentarios respondidos</span>
                  <span>📩 {rule.stats?.dmsSent || 0} DMs enviados</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  title={rule.isActive ? 'Desactivar regla' : 'Activar regla'}
                >
                  {rule.isActive ? (
                    <ToggleRight className="h-6 w-6 text-tech-blue" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-300" />
                  )}
                </button>
                <button
                  onClick={() => openEditRule(rule)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg"
                >
                  <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Channels Tab ─────────────────────────────────────────────────────────────

function ChannelsTab({ config, onSave }: { config: TravisConfig; onSave: (partial: Partial<TravisConfig>) => Promise<void> }) {
  const [activeChannels, setActiveChannels] = useState(config.activeChannels);
  const [autoReply, setAutoReply] = useState(config.autoReplyEnabled);
  const [handoffTriggers, setHandoffTriggers] = useState(config.handoffTriggers.join(', '));
  const [outOfHours, setOutOfHours] = useState(config.outOfHoursMessage);
  const [anuraConfig, setAnuraConfig] = useState(
    config.anuraConfig || DEFAULT_TRAVIS_CONFIG.anuraConfig!
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      activeChannels,
      autoReplyEnabled: autoReply,
      handoffTriggers: handoffTriggers.split(',').map(t => t.trim()).filter(Boolean),
      outOfHoursMessage: outOfHours,
      anuraConfig,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const COLOR_MAP: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pink: 'bg-pink-100 text-pink-700 border-pink-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    sky: 'bg-sky-100 text-sky-700 border-sky-200',
  };

  return (
    <div className="space-y-5">
      {/* Auto-reply toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Respuesta Automática (Travis)</h4>
            <p className="text-xs text-slate-400 mt-0.5">Cuando está activo, Travis responde automáticamente a todos los mensajes entrantes.</p>
          </div>
          <button onClick={() => setAutoReply(!autoReply)} className="flex-shrink-0">
            {autoReply
              ? <ToggleRight className="h-8 w-8 text-tech-blue" />
              : <ToggleLeft className="h-8 w-8 text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Channel status */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Estado de Canales</h4>
        <div className="space-y-2">
          {CHANNEL_CONFIG.map(ch => {
            const Icon = ch.icon;
            const isActive = activeChannels[ch.key as keyof typeof activeChannels];
            return (
              <div key={ch.key} className={`flex items-center gap-3 p-3 rounded-xl border ${COLOR_MAP[ch.color]} bg-opacity-50`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? `bg-${ch.color}-100` : 'bg-slate-100'}`}>
                  <Icon className={`h-4 w-4 ${isActive ? `text-${ch.color}-600` : 'text-slate-300'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{ch.label}</span>
                    {isActive
                      ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✅ Activo</span>
                      : <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold">⭕ Inactivo</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{ch.desc}</p>
                </div>
                <button
                  onClick={() => setActiveChannels(prev => ({ ...prev, [ch.key]: !isActive }))}
                  className="flex-shrink-0"
                >
                  {isActive ? <ToggleRight className="h-6 w-6 text-tech-blue" /> : <ToggleLeft className="h-6 w-6 text-slate-300" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Configuración Meta WhatsApp + Instagram + Messenger + Comentarios Directo */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Phone className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">
              1. Conexión Directa Meta (WhatsApp, Instagram DM, Messenger y Comentarios)
            </h4>
            <p className="text-xs text-slate-500">
              Copiá estos datos en tu App de Meta for Developers (Webhooks de WhatsApp, Instagram y Page)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
            <span className="text-slate-400 block font-medium mb-1">Webhook Unificado (WA + IG + FB):</span>
            <code className="text-emerald-700 font-mono font-semibold break-all select-all">
              https://www.travelapp.ar/api/webhook
            </code>
          </div>

          <div className="bg-white p-3 rounded-xl border border-pink-100 shadow-sm">
            <span className="text-slate-400 block font-medium mb-1">Webhook IG + Messenger + Comentarios:</span>
            <code className="text-pink-700 font-mono font-semibold break-all select-all">
              https://www.travelapp.ar/api/webhooks/meta-social
            </code>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
            <span className="text-slate-400 block font-medium mb-1">Verify Token (para todos):</span>
            <code className="text-emerald-700 font-mono font-semibold select-all">
              travelapp_meta_verify_2026
            </code>
          </div>
        </div>

        <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Campos a suscribir en Instagram:</strong>{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-pink-700 font-bold">messages</code> y{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-pink-700 font-bold">comments</code>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Campos a suscribir en Página de Facebook (Page):</strong>{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-bold">messages</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-bold">messaging_postbacks</code> y{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-bold">feed</code>.
            </span>
          </div>
        </div>
      </div>

      {/* Configuración Central Telefónica ANURA ($0 costo extra -> Rescate por WhatsApp) */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                2. Central Telefónica ANURA → Derivación Automática a Travis por WhatsApp ($0 costo)
              </h4>
              <p className="text-xs text-slate-500">
                Cuando entra una llamada perdida o fuera de horario en Anura, Travis le escribe al instante por WhatsApp al número que llamó.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAnuraConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
          >
            {anuraConfig.enabled ? (
              <ToggleRight className="h-7 w-7 text-indigo-600" />
            ) : (
              <ToggleLeft className="h-7 w-7 text-slate-300" />
            )}
          </button>
        </div>

        <div className="bg-white p-3 rounded-xl border border-indigo-100 text-xs">
          <span className="text-slate-400 block font-medium mb-1">
            URL para pegar en Anura &gt; Integraciones &gt; Web Hooks:
          </span>
          <code className="text-indigo-700 font-mono font-semibold break-all select-all">
            https://www.travelapp.ar/api/webhooks/anura
          </code>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Mensaje automático de WhatsApp cuando alguien llama a la central Anura:
          </label>
          <textarea
            value={anuraConfig.missedCallWhatsAppMessage}
            onChange={e =>
              setAnuraConfig(prev => ({ ...prev, missedCallWhatsAppMessage: e.target.value }))
            }
            rows={2}
            className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white resize-none"
          />
        </div>
      </div>

      {/* Handoff triggers */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Palabras que escalan al operador humano
        </label>
        <p className="text-xs text-slate-400 mb-2">Cuando un usuario escribe estas palabras, Travis detiene sus respuestas y avisa al equipo. Separalas con comas.</p>
        <textarea
          value={handoffTriggers}
          onChange={e => setHandoffTriggers(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-tech-blue/20 resize-none"
          placeholder="hablar con una persona, urgente, reclamo, emergencia..."
        />
      </div>

      {/* Out of hours message */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Mensaje fuera de horario
        </label>
        <textarea
          value={outOfHours}
          onChange={e => setOutOfHours(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-tech-blue/20 resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="flex items-center gap-2 px-5 py-2.5 bg-tech-blue hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-70"
      >
        {saved ? <><Check className="h-4 w-4" /> ¡Guardado!</> : saving ? <><RefreshCw className="h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4" /> Guardar Configuración</>}
      </button>
    </div>
  );
}

// ─── Training Tab (Test Chat) ─────────────────────────────────────────────────

interface TrainMessage {
  role: 'user' | 'travis';
  content: string;
  feedback?: 'good' | 'bad' | null;
  businessUnit?: string;
  source?: string;
  buttons?: { id: string; title: string }[];
}

function TrainingTab() {
  const [messages, setMessages] = useState<TrainMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [businessUnit, setBusinessUnit] = useState<string>('General');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (textToSend?: string) => {
    const userMsg = (textToSend || input).trim();
    if (!userMsg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role === 'travis' ? 'assistant' : 'user', content: m.content }));
      const res = await fetch('/api/travis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, businessUnit, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'travis',
        content: data.response || 'Error al obtener respuesta.',
        feedback: null,
        businessUnit: data.businessUnit,
        source: data.source,
        buttons: data.buttons,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'travis', content: 'Error de conexión con Travis.', feedback: null }]);
    }
    setLoading(false);
  };

  const setFeedback = (idx: number, feedback: 'good' | 'bad') => {
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, feedback } : m));
  };

  const BUS = ['General', 'TravelCab', 'Experiences', 'Rewards'];

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-3 flex gap-2">
        <Bot className="h-4 w-4 text-tech-blue flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600">
          <strong>Chat de Entrenamiento:</strong> Probá cómo responde Travis en tiempo real con <strong>Gemini 2.5 Flash</strong>. Simulá preguntas de traslados, tours y rewards, o hacé clic en los botones interactivos.
        </div>
      </div>

      {/* Business unit selector */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <span className="text-xs text-slate-400 self-center">Simular como:</span>
        {BUS.map(b => (
          <button
            key={b}
            onClick={() => setBusinessUnit(b)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${businessUnit === b ? 'bg-tech-blue text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Bot className="h-10 w-10 opacity-30" />
            <p className="text-sm">Escribí un mensaje para probar a Travis</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${msg.role === 'travis' ? 'bg-gradient-to-br from-tech-blue to-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {msg.role === 'travis' ? <Bot className="h-4 w-4" /> : 'TU'}
            </div>
            <div className={`max-w-[75%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'travis' ? 'bg-white border border-slate-200 text-slate-800 shadow-sm' : 'bg-tech-blue text-white'}`}>
                {msg.content}
              </div>

              {/* Botones Interactivos de WhatsApp simulados */}
              {msg.role === 'travis' && msg.buttons && msg.buttons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {msg.buttons.map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => sendMessage(btn.title)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <span>{btn.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {msg.role === 'travis' && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className={`font-semibold ${msg.source === 'gemini_2_5_flash' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {msg.source === 'gemini_2_5_flash' ? '✨ Gemini 2.5 Flash' : msg.source === 'local_handoff' ? '🛡️ Handoff' : '🤖 Fallback Mock'}
                  </span>
                  {msg.businessUnit && <span>• {msg.businessUnit}</span>}
                  {msg.feedback !== undefined && (
                    <div className="flex items-center gap-1 ml-1">
                      <button onClick={() => setFeedback(idx, 'good')} className={`p-1 rounded-lg transition-all ${msg.feedback === 'good' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-300'}`}>
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button onClick={() => setFeedback(idx, 'bad')} className={`p-1 rounded-lg transition-all ${msg.feedback === 'bad' ? 'bg-red-100 text-red-500' : 'hover:bg-slate-100 text-slate-300'}`}>
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-tech-blue to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-slate-100 rounded-2xl px-3 py-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Escribí como si fueras un cliente de WhatsApp..."
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-tech-blue/20"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-tech-blue hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {messages.filter(m => m.feedback === 'bad').length > 0 && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Tenés {messages.filter(m => m.feedback === 'bad').length} respuesta(s) marcadas como malas. Revisá el System Prompt o agregá artículos a la Base de Conocimiento.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TravisSettingsPage() {
  const [config, setConfig] = useState<TravisConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TravisTab>('prompt');

  useEffect(() => {
    async function loadConfig() {
      try {
        const d = await getDoc(doc(db, 'travisConfig', 'main'));
        if (d.exists()) {
          setConfig(d.data() as TravisConfig);
        } else {
          const defaultConfig: TravisConfig = { ...DEFAULT_TRAVIS_CONFIG, updatedAt: Date.now() };
          await setDoc(doc(db, 'travisConfig', 'main'), defaultConfig);
          setConfig(defaultConfig);
        }
      } catch (err) {
        console.error('Error loading Travis config:', err);
        setConfig({ ...DEFAULT_TRAVIS_CONFIG, updatedAt: Date.now() });
      }
      setLoading(false);
    }
    loadConfig();
  }, []);

  const handleSave = async (partial: Partial<TravisConfig>) => {
    try {
      await updateDoc(doc(db, 'travisConfig', 'main'), { ...partial, updatedAt: Date.now() });
      setConfig(prev => prev ? { ...prev, ...partial } : prev);
    } catch (err) {
      console.error('Error saving Travis config:', err);
    }
  };

  const TABS = [
    { key: 'prompt' as TravisTab, label: 'System Prompt', icon: Sparkles, desc: 'Personalidad y reglas de Travis' },
    { key: 'knowledge' as TravisTab, label: 'Conocimiento', icon: BookOpen, desc: 'Artículos de información' },
    { key: 'comments' as TravisTab, label: 'Comentarios IG/FB', icon: MessageSquare, desc: 'Respuestas por posteo + DM' },
    { key: 'channels' as TravisTab, label: 'Canales y Anura', icon: Settings, desc: 'WhatsApp, IG, Messenger, Anura' },
    { key: 'training' as TravisTab, label: 'Entrenar', icon: Bot, desc: 'Probar y mejorar respuestas' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Cargando configuración de Travis...
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* Left sidebar - tabs */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 p-2 space-y-1">
          <div className="px-3 py-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-tech-blue to-indigo-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-black text-slate-800 text-sm">Travis IA</div>
                <div className="text-[10px] text-emerald-500 font-semibold">● En línea</div>
              </div>
            </div>
          </div>
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? 'bg-tech-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Status card */}
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">Travis Activo</span>
          </div>
          <div className="space-y-1 text-[11px] text-emerald-600">
            <div className="flex justify-between">
              <span>Auto-reply</span>
              <span className="font-bold">{config?.autoReplyEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <div className="flex justify-between">
              <span>Canales activos</span>
              <span className="font-bold">
                {config ? Object.values(config.activeChannels).filter(Boolean).length : 0}/4
              </span>
            </div>
            <div className="flex justify-between">
              <span>Artículos KB</span>
              <span className="font-bold">{config?.knowledgeBase?.length || 0}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-emerald-200/30 mt-1">
              <span>Forzar Despacho IA</span>
              <span className="font-bold">{config?.isAiDispatchForcedEnabled ? 'SÍ' : 'NO'}</span>
            </div>
          </div>
          
          <button
            onClick={() => handleSave({ isAiDispatchForcedEnabled: !config?.isAiDispatchForcedEnabled })}
            className={`w-full mt-2 py-1 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
              config?.isAiDispatchForcedEnabled
                ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700'
            }`}
          >
            {config?.isAiDispatchForcedEnabled ? '🔴 Desactivar Forzado' : '⚡ Forzar Despacho IA'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 overflow-y-auto">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-800">
            {TABS.find(t => t.key === activeTab)?.label}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {TABS.find(t => t.key === activeTab)?.desc}
          </p>
        </div>

        {config && (
          <>
            {activeTab === 'prompt' && <SystemPromptTab config={config} onSave={handleSave} />}
            {activeTab === 'knowledge' && <KnowledgeBaseTab config={config} onSave={handleSave} />}
            {activeTab === 'comments' && <CommentAutomationTab config={config} onSave={handleSave} />}
            {activeTab === 'channels' && <ChannelsTab config={config} onSave={handleSave} />}
            {activeTab === 'training' && <TrainingTab />}
          </>
        )}
      </div>
    </div>
  );
}
