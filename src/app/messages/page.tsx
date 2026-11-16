'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, where, getDocs, limit, deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Conversation, Message, AutomatedMessage, BroadcastCampaign,
  MessageChannel, AUTOMATED_TRIGGER_LABELS, DEFAULT_AUTOMATED_MESSAGES,
  AutomatedTrigger, NotificationAudioType, NotificationCategory, CallRecord,
} from '@/types/messaging';
import { CallsPanel } from '@/components/messaging/CallsPanel';
import { LeadDetailSlideOver } from '@/components/crm/LeadDetailSlideOver';
import { Lead } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAccessRecord,
  getUserScopeLabel,
  BUSINESS_UNITS_CONFIG,
  ALL_SECTORS_BY_UNIT,
  normalizeBusinessUnit,
  isSuperAdmin,
} from '@/lib/permissions';
import {
  MessageSquare, Send, Bot, Users, Zap, Megaphone, Search,
  Phone, Globe, X, Check,
  UserCheck, RefreshCw, Bell, Plus, Edit2, Trash2, Save, Clock,
  ToggleLeft, ToggleRight, AlertCircle,
  Shield, Sparkles, Radio,
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

// ─── Channel helpers ────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<MessageChannel, React.ReactNode> = {
  whatsapp: <Phone className="h-3.5 w-3.5 text-emerald-500" />,
  instagram: <Instagram className="h-3.5 w-3.5 text-pink-500" />,
  messenger: <Facebook className="h-3.5 w-3.5 text-blue-500" />,
  web: <Globe className="h-3.5 w-3.5 text-sky-400" />,
  internal: <Shield className="h-3.5 w-3.5 text-violet-500" />,
  push: <Bell className="h-3.5 w-3.5 text-amber-500" />,
};

const CHANNEL_LABEL: Record<MessageChannel, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  web: 'Chat Web',
  internal: 'Interno',
  push: 'Push',
};

const CHANNEL_BG: Record<MessageChannel, string> = {
  whatsapp: 'bg-emerald-50 border-emerald-200',
  instagram: 'bg-pink-50 border-pink-200',
  messenger: 'bg-blue-50 border-blue-200',
  web: 'bg-sky-50 border-sky-200',
  internal: 'bg-violet-50 border-violet-200',
  push: 'bg-amber-50 border-amber-200',
};

const ROLE_COLORS: Record<string, string> = {
  travis: 'bg-gradient-to-br from-tech-blue to-indigo-600 text-white',
  operator: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white',
  system: 'bg-slate-100 text-slate-500 text-xs italic',
  customer: 'bg-white border border-slate-200 text-slate-800',
  driver: 'bg-amber-50 border border-amber-200 text-slate-800',
};

const STATUS_DOT: Record<string, string> = {
  bot: 'bg-tech-blue',
  pending: 'bg-amber-400',
  active: 'bg-emerald-500',
  closed: 'bg-slate-300',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// ─── Conversation List ───────────────────────────────────────────────────────

function ConversationList({
  conversations,
  activeId,
  onSelect,
  filter,
  setFilter,
  search,
  setSearch,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (c: Conversation) => void;
  filter: string;
  setFilter: (f: string) => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  const filtered = conversations.filter(c => {
    // Excluir conversaciones cerradas de la vista de chats activos
    if (c.status === 'closed') return false;

    const matchSearch = !search || 
      (c.participants || []).some(p => p.name.toLowerCase().includes(search.toLowerCase())) ||
      ((c as any).customerName && (c as any).customerName.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'all') return matchSearch;
    if (filter === 'bot') return c.status === 'bot' && matchSearch;
    if (filter === 'pending') return c.status === 'pending' && matchSearch;
    if (filter === 'active') return c.status === 'active' && matchSearch;
    if (filter === 'whatsapp') return c.channel === 'whatsapp' && matchSearch;
    if (filter === 'instagram') return c.channel === 'instagram' && matchSearch;
    if (filter === 'messenger') return c.channel === 'messenger' && matchSearch;
    if (filter === 'web') return c.channel === 'web' && matchSearch;
    if (filter === 'cab_driver') return (c.metadata?.businessUnit || '').includes('Conductor') && matchSearch;
    if (filter === 'cab_user') return (c.metadata?.businessUnit || '').includes('TravelCab') && !(c.metadata?.businessUnit || '').includes('Conductor') && matchSearch;
    if (filter === 'experiences') return ((c.metadata?.businessUnit || '').includes('Experience') || (c.metadata?.businessUnit || '').includes('Experiencias')) && matchSearch;
    if (filter === 'rewards') return (c.metadata?.businessUnit || '').includes('Rewards') && matchSearch;
    if (filter === 'afiliados') return (c.metadata?.businessUnit || '').includes('Afiliados') && matchSearch;
    return matchSearch;
  });

  const FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'bot', label: '🤖 Travis' },
    { key: 'pending', label: '⏳ Esperando Operador' },
    { key: 'active', label: '👤 Operador' },
    { key: 'whatsapp', label: '📱 WhatsApp' },
    { key: 'instagram', label: '📷 Instagram' },
    { key: 'messenger', label: '💬 Messenger' },
    { key: 'web', label: '🌐 Web' },
    { key: 'cab_user', label: '🚕 Pasajeros' },
    { key: 'cab_driver', label: '👨‍✈️ Choferes' },
    { key: 'experiences', label: '🗺️ Tours' },
    { key: 'rewards', label: '🎁 Rewards' },
    { key: 'afiliados', label: '🤝 Afiliados' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar conversación..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tech-blue/20"
          />
        </div>
        {/* Filter chips */}
        <div className="flex flex-wrap gap-1 mt-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${filter === f.key ? 'bg-tech-blue text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Sin conversaciones</p>
          </div>
        ) : (
          filtered.map(conv => {
            const mainParticipant = (conv.participants || []).find(p => p.role === 'customer' || p.role === 'driver') || { name: (conv as any).customerName || 'Contacto' };
            const isActive = conv.id === activeId;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${isActive ? 'bg-tech-blue/5 border-l-2 border-l-tech-blue' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-tech-blue to-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                    {mainParticipant?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {mainParticipant?.name || 'Desconocido'}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {CHANNEL_ICON[conv.channel]}
                      <span className="text-xs text-slate-400 truncate flex-1">{conv.lastMessage}</span>
                      {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 bg-tech-blue text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[conv.status]}`} />
                      <span className="text-[10px] text-slate-400">
                        {conv.status === 'bot' ? 'Travis respondiendo' : conv.status === 'pending' ? 'Esperando operador' : conv.status === 'active' ? `Operador: ${conv.operatorName || 'equipo'}` : 'Cerrado'}
                      </span>
                      {conv.metadata?.businessUnit && (
                        <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                          {conv.metadata.businessUnit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Chat Window ─────────────────────────────────────────────────────────────

function ChatWindow({
  conversation,
  operatorName = 'Operador',
}: {
  conversation: Conversation;
  operatorName?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isOperatorMode, setIsOperatorMode] = useState(conversation.status === 'active');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Real-time messages
  useEffect(() => {
    const q = query(
      collection(db, `conversations/${conversation.id}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
    return () => unsub();
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const msg: Omit<Message, 'id'> = {
        conversationId: conversation.id,
        sender: { id: 'operator', name: operatorName, role: 'operator' },
        content: input.trim(),
        timestamp: Date.now(),
        type: 'text',
        channel: conversation.channel,
      };
      await addDoc(collection(db, `conversations/${conversation.id}/messages`), msg);
      await updateDoc(doc(db, 'conversations', conversation.id), {
        lastMessage: input.trim().substring(0, 100),
        lastMessageAt: Date.now(),
        status: 'active',
        operatorName,
      });
      setInput('');
      // Despachar el mensaje al canal correspondiente (WhatsApp Cloud API o ManyChat)
      const customerParticipant = conversation.participants?.find(p => p.role === 'customer' || p.role === 'driver');
      const recipientPhone = customerParticipant?.phone || (conversation as any).externalId;

      try {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversation.id,
            content: input.trim(),
            channel: conversation.channel,
            recipientPhone,
            manyChatSubscriberId: conversation.manyChatSubscriberId,
          }),
        });
      } catch (sendErr) {
        console.warn('Error dispatching operator reply externally:', sendErr);
      }
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setSending(false);
    }
  };

  const handleTakeOver = async () => {
    await updateDoc(doc(db, 'conversations', conversation.id), {
      status: 'active',
      operatorId: 'operator',
      operatorName,
    });
    setIsOperatorMode(true);
    // System message
    await addDoc(collection(db, `conversations/${conversation.id}/messages`), {
      conversationId: conversation.id,
      sender: { id: 'system', name: 'Sistema', role: 'system' },
      content: `${operatorName} tomó el control de la conversación.`,
      timestamp: Date.now(),
      type: 'system',
      channel: 'internal',
    });
  };

  const handleReturnToTravis = async () => {
    await updateDoc(doc(db, 'conversations', conversation.id), {
      status: 'bot',
      operatorId: null,
      operatorName: null,
    });
    setIsOperatorMode(false);
    await addDoc(collection(db, `conversations/${conversation.id}/messages`), {
      conversationId: conversation.id,
      sender: { id: 'system', name: 'Sistema', role: 'system' },
      content: `${operatorName} devolvió la conversación a Travis.`,
      timestamp: Date.now(),
      type: 'system',
      channel: 'internal',
    });
  };

  const mainParticipant = (conversation.participants || []).find(p => p.role === 'customer' || p.role === 'driver') || { name: (conversation as any).customerName || 'Contacto' };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-tech-blue to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {mainParticipant?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">{mainParticipant?.name || 'Contacto'}</span>
            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${CHANNEL_BG[conversation.channel]}`}>
              {CHANNEL_ICON[conversation.channel]}
              {CHANNEL_LABEL[conversation.channel]}
            </span>
            {conversation.metadata?.businessUnit && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {conversation.metadata.businessUnit}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[conversation.status]}`} />
            <span className="text-[11px] text-slate-400">
              {conversation.status === 'bot' ? 'Travis está respondiendo' : conversation.status === 'active' ? `Operador activo: ${conversation.operatorName}` : 'Pendiente de atención'}
            </span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isOperatorMode ? (
            <button
              onClick={handleTakeOver}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Tomar Conversación
            </button>
          ) : (
            <button
              onClick={handleReturnToTravis}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-tech-blue hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Bot className="h-3.5 w-3.5" />
              Devolver a Travis
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Sin mensajes aún</p>
          </div>
        )}
        {messages.map(msg => {
          const isSystem = msg.sender.role === 'system';
          const isRight = msg.sender.role === 'operator' || msg.sender.role === 'travis';
          const isTravis = msg.sender.role === 'travis';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-[11px] text-slate-400 bg-slate-200/70 px-3 py-1 rounded-full">{msg.content}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isTravis ? 'bg-gradient-to-br from-tech-blue to-indigo-600 text-white' : msg.sender.role === 'operator' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {isTravis ? <Bot className="h-4 w-4" /> : msg.sender.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className={`max-w-[70%] ${isRight ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">{msg.sender.name}</span>
                  <span className="text-[10px] text-slate-300">{new Date(msg.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isTravis ? 'bg-gradient-to-br from-tech-blue to-indigo-600 text-white rounded-tl-sm' : msg.sender.role === 'operator' ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white">
        {!isOperatorMode && (
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400 bg-sky-50 border border-sky-200 rounded-lg px-3 py-1.5">
            <Bot className="h-3.5 w-3.5 text-tech-blue" />
            Travis está respondiendo automáticamente. Tomá el control para intervenir.
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isOperatorMode ? `Responder como ${operatorName}...` : 'Tomá el control para responder...'}
            disabled={!isOperatorMode}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-tech-blue/20 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!isOperatorMode || !input.trim() || sending}
            className="p-2.5 bg-tech-blue hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Automated Messages Panel ────────────────────────────────────────────────

function AutomatedMessagesPanel() {
  const [messages, setMessages] = useState<AutomatedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTrigger, setEditTrigger] = useState<AutomatedTrigger>('welcome');
  const [editContent, setEditContent] = useState('');
  const [editDelay, setEditDelay] = useState(0);
  const [editChannel, setEditChannel] = useState<MessageChannel | 'both'>('whatsapp');
  
  // Create state
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTrigger, setNewTrigger] = useState<AutomatedTrigger>('welcome');
  const [newContent, setNewContent] = useState('');
  const [newDelay, setNewDelay] = useState(0);
  const [newChannel, setNewChannel] = useState<MessageChannel | 'both'>('whatsapp');

  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'automatedMessages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, async snap => {
      if (snap.empty && !seeded) {
        setSeeded(true);
        for (const msg of DEFAULT_AUTOMATED_MESSAGES) {
          await addDoc(collection(db, 'automatedMessages'), {
            ...msg, createdAt: Date.now(), updatedAt: Date.now(),
          });
        }
      } else {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as AutomatedMessage)));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [seeded]);

  const toggleActive = async (msg: AutomatedMessage) => {
    await updateDoc(doc(db, 'automatedMessages', msg.id), { isActive: !msg.isActive, updatedAt: Date.now() });
  };

  const startEdit = (msg: AutomatedMessage) => {
    setEditingId(msg.id);
    setEditTitle(msg.title);
    setEditTrigger(msg.trigger);
    setEditContent(msg.content);
    setEditDelay(msg.delaySeconds || 0);
    setEditChannel(msg.channel || 'whatsapp');
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    await updateDoc(doc(db, 'automatedMessages', id), { 
      title: editTitle,
      trigger: editTrigger,
      content: editContent,
      delaySeconds: Number(editDelay),
      channel: editChannel,
      updatedAt: Date.now() 
    });
    setEditingId(null);
    setSaving(false);
  };

  const createMessage = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    await addDoc(collection(db, 'automatedMessages'), {
      title: newTitle,
      trigger: newTrigger,
      content: newContent,
      delaySeconds: Number(newDelay),
      channel: newChannel,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setCreating(false);
    setNewTitle('');
    setNewContent('');
    setNewDelay(0);
    setNewChannel('whatsapp');
    setSaving(false);
  };

  const deleteMessage = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este mensaje automático?')) {
      await deleteDoc(doc(db, 'automatedMessages', id));
    }
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">Mensajes Automáticos</h3>
          <p className="text-xs text-slate-400 mt-0.5">Se envían por WhatsApp o push según el evento del viaje.</p>
        </div>
        {!creating && (
          <button 
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-tech-blue text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo
          </button>
        )}
      </div>

      {creating && (
        <div className="bg-white border border-tech-blue/30 rounded-xl p-4 shadow-md space-y-3">
          <h4 className="text-sm font-bold text-slate-800">Nuevo Mensaje Automático</h4>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Título del mensaje"
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-tech-blue"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Trigger / Evento</label>
              <select
                value={newTrigger}
                onChange={e => setNewTrigger(e.target.value as any)}
                className="w-full text-xs border border-slate-200 rounded-lg p-1.5 focus:outline-none"
              >
                {Object.entries(AUTOMATED_TRIGGER_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Canal de Envío</label>
              <select
                value={newChannel}
                onChange={e => setNewChannel(e.target.value as any)}
                className="w-full text-xs border border-slate-200 rounded-lg p-1.5 focus:outline-none"
              >
                <option value="whatsapp">📱 WhatsApp</option>
                <option value="push">🔔 Notificación Push</option>
                <option value="both">⚡ Ambos (WA + Push)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase">Retardo (segundos)</label>
            <input
              type="number"
              value={newDelay}
              onChange={e => setNewDelay(Number(e.target.value))}
              className="w-24 px-2 py-1 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            rows={4}
            placeholder="Contenido..."
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-tech-blue resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={createMessage}
              disabled={saving || !newTitle.trim() || !newContent.trim()}
              className="px-3 py-1.5 bg-tech-blue text-white text-xs font-bold rounded-lg disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear'}
            </button>
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Cargando...</div>
      ) : (
        messages.map(msg => (
          <div key={msg.id} className={`rounded-xl border p-4 transition-all ${msg.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800">{msg.title}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {AUTOMATED_TRIGGER_LABELS[msg.trigger as AutomatedTrigger] || msg.trigger}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CHANNEL_BG[(msg.channel === 'both' ? 'whatsapp' : msg.channel) as MessageChannel]}`}>
                    {msg.channel === 'both' ? '📱 WA + 🔔 Push' : CHANNEL_LABEL[(msg.channel) as MessageChannel] || msg.channel}
                  </span>
                  {msg.delaySeconds > 0 && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {msg.delaySeconds}s después
                    </span>
                  )}
                </div>
                
                {editingId === msg.id ? (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Título</label>
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Trigger</label>
                        <select
                          value={editTrigger}
                          onChange={e => setEditTrigger(e.target.value as any)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-1 focus:outline-none"
                        >
                          {Object.entries(AUTOMATED_TRIGGER_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Canal</label>
                        <select
                          value={editChannel}
                          onChange={e => setEditChannel(e.target.value as any)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-1 focus:outline-none"
                        >
                          <option value="whatsapp">📱 WhatsApp</option>
                          <option value="push">🔔 Notificación Push</option>
                          <option value="both">⚡ Ambos (WA + Push)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Retardo (segundos)</label>
                        <input
                          type="number"
                          value={editDelay}
                          onChange={e => setEditDelay(Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-tech-blue"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(msg.id)} disabled={saving} className="px-3 py-1 bg-tech-blue text-white text-xs font-semibold rounded-lg disabled:opacity-50">
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">{msg.content}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {editingId !== msg.id && (
                  <>
                    <button onClick={() => startEdit(msg)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                      <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => deleteMessage(msg.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </>
                )}
                <button onClick={() => toggleActive(msg)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                  {msg.isActive
                    ? <ToggleRight className="h-5 w-5 text-tech-blue" />
                    : <ToggleLeft className="h-5 w-5 text-slate-300" />}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
function BroadcastPanel() {
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<string>('all');
  const [channel, setChannel] = useState('push');
  const [soundAlert, setSoundAlert] = useState<NotificationAudioType>('default');
  const [category, setCategory] = useState<NotificationCategory>('general');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; phone?: string; role: string; email?: string }[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'broadcastCampaigns'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, snap => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as BroadcastCampaign)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (audience === 'specific') {
      const fetchContacts = async () => {
        try {
          const list: { id: string; name: string; phone?: string; role: string; email?: string }[] = [];
          
          // Cargar usuarios de 'users'
          const usersSnap = await getDocs(collection(db, 'users'));
          usersSnap.docs.forEach(doc => {
            const data = doc.data();
            list.push({
              id: doc.id,
              name: data.displayName || data.fullName || data.email?.split('@')[0] || 'Pasajero',
              phone: data.phoneNumber || data.phone || '',
              email: data.email || '',
              role: 'customer'
            });
          });

          // Cargar conductores de 'drivers'
          const driversSnap = await getDocs(collection(db, 'drivers'));
          driversSnap.docs.forEach(doc => {
            const data = doc.data();
            list.push({
              id: doc.id,
              name: data.name || data.fullName || 'Conductor TravelCab',
              phone: data.phone || '',
              email: data.email || '',
              role: 'driver'
            });
          });

          // Deduplicar
          const uniqueList = list.filter((item, index, self) =>
            item.id && self.findIndex(t => t.id === item.id) === index
          );
          setContacts(uniqueList);
        } catch (error) {
          console.error("Error cargando contactos:", error);
        }
      };
      fetchContacts();
    }
  }, [audience]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      const scheduledAt = scheduledTime ? new Date(scheduledTime).getTime() : undefined;
      await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: title.trim(), 
          message: message.trim(), 
          audience, 
          channel,
          soundAlert,
          category,
          specificIds: audience === 'specific' ? selectedIds : undefined,
          scheduledAt
        }),
      });
      setSent(true);
      setTimeout(() => { 
        setSent(false); 
        setComposing(false); 
        setTitle(''); 
        setMessage(''); 
        setSoundAlert('default');
        setCategory('general');
        setScheduledTime('');
        setSelectedIds([]);
      }, 2000);
    } catch (err) {
      console.error("Error al enviar campaña:", err);
    }
    setSending(false);
  };

  const AUDIENCE_OPTIONS = [
    { value: 'all', label: '🌎 Todos los Usuarios', desc: 'Pasajeros, Choferes y Afiliados' },
    { value: 'passengers', label: '👤 Solo Pasajeros', desc: 'Clientes de la app' },
    { value: 'drivers', label: '🚗 Solo Conductores', desc: 'Choferes activos de TravelCab' },
    { value: 'specific', label: '🎯 Destinatario Específico', desc: 'Buscar por nombre, email o ID' },
  ];

  const SOUND_OPTIONS: { value: NotificationAudioType; label: string; desc: string }[] = [
    { value: 'default', label: '🔔 Campana Estándar', desc: 'Notificación tradicional' },
    { value: 'driver_alert', label: '🚨 Alerta Fuerte de Solicitud', desc: 'Tono agudo continuo para choferes' },
    { value: 'seatbelt_safety', label: '🛡️ Locución de Cinturón', desc: 'Audio hablado de seguridad' },
    { value: 'promo', label: '🎁 Audio Promocional', desc: 'Tono festivo para cupones' },
    { value: 'none', label: '🔇 Silencioso', desc: 'Sin audio en el dispositivo' },
  ];

  const CATEGORY_OPTIONS: { value: NotificationCategory; label: string }[] = [
    { value: 'general', label: 'ℹ️ General' },
    { value: 'travelcab', label: '🚕 Tarifas & Viajes' },
    { value: 'promo', label: '🎁 Promociones & Rewards' },
    { value: 'safety', label: '🛡️ Seguridad & Protocolos' },
    { value: 'maintenance', label: '🔧 Novedad del Sistema' },
  ];

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">Centro de Notificaciones Push & Alertas Sonoras</h3>
          <p className="text-xs text-slate-400 mt-0.5">Enviá avisos masivos, segmentados o individuales con audio integrado.</p>
        </div>
        {!composing && (
          <button onClick={() => setComposing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-tech-blue text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Nueva Notificación
          </button>
        )}
      </div>

      {composing && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-tech-blue" /> Redactar Notificación & Alerta de Audio
          </h4>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Título</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: ¡Lluvia en la ciudad! Multiplicador activo 🌧️"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tech-blue/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as NotificationCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white font-medium"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mensaje / Cuerpo de la Notificación</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Escribí el texto que aparecerá en los teléfonos..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tech-blue/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Audiencia Destino</label>
              <div className="space-y-1">
                {AUDIENCE_OPTIONS.map(o => (
                  <label key={o.value} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${audience === o.value ? 'border-tech-blue bg-tech-blue/5' : 'border-slate-200 hover:bg-slate-55'}`}>
                    <input type="radio" name="audience" value={o.value} checked={audience === o.value} onChange={e => setAudience(e.target.value)} className="sr-only" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{o.label}</div>
                      <div className="text-[10px] text-slate-400">{o.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Sonido / Alerta de Audio en Celular</label>
              <div className="space-y-1">
                {SOUND_OPTIONS.map(s => (
                  <label key={s.value} className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${soundAlert === s.value ? 'border-tech-blue bg-tech-blue/5' : 'border-slate-200 hover:bg-slate-55'}`}>
                    <input type="radio" name="soundAlert" value={s.value} checked={soundAlert === s.value} onChange={e => setSoundAlert(e.target.value as NotificationAudioType)} className="sr-only" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{s.label}</div>
                      <div className="text-[10px] text-slate-400">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {audience === 'specific' && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold text-slate-600">Seleccionar Destinatarios Específicos</label>
              <input
                type="text"
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Buscar contacto por nombre o teléfono..."
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white"
              />
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-white">
                {contacts
                  .filter(c => 
                    c.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
                    c.phone?.includes(contactSearch)
                  )
                  .map(c => {
                    const isChecked = selectedIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedIds(selectedIds.filter(id => id !== c.id));
                            } else {
                              setSelectedIds([...selectedIds, c.id]);
                            }
                          }}
                          className="rounded border-slate-300 text-tech-blue focus:ring-tech-blue"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{c.role === 'driver' ? '🚗 Chofer' : '👤 Pasajero'} • {c.phone || 'Sin número'}</p>
                        </div>
                      </label>
                    );
                  })
                }
                {contacts.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-4">No se encontraron contactos</p>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">
                Seleccionados: {selectedIds.length} destinatarios
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Programar Fecha/Hora de Envío</label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-tech-blue"
            />
            <p className="text-[10px] text-slate-400 mt-1">Dejar vacío para enviar inmediatamente</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSend}
              disabled={sending || sent || !title.trim() || !message.trim() || (audience === 'specific' && selectedIds.length === 0)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-tech-blue hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {sent ? <><Check className="h-4 w-4" /> {scheduledTime ? '¡Programada!' : '¡Enviada!'}</> : sending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Procesando...</> : <><Send className="h-4 w-4" /> {scheduledTime ? 'Programar Campaña' : 'Enviar Campaña'}</>}
            </button>
            <button onClick={() => setComposing(false)} className="px-4 py-2.5 border border-slate-200 text-slate-655 text-sm font-semibold rounded-xl hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Campaign history */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Historial de Campañas</h4>
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Sin campañas enviadas</div>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">{c.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : c.status === 'scheduled' ? 'bg-indigo-50 text-indigo-700' : c.status === 'sending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.status === 'sent' ? '✅ Enviada' : c.status === 'scheduled' ? '📅 Programada' : c.status === 'sending' ? '⏳ Enviando' : c.status}
                      </span>
                      {c.soundAlert && c.soundAlert !== 'none' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {c.soundAlert === 'driver_alert' ? '🚨 Alerta Chofer' : c.soundAlert === 'seatbelt_safety' ? '🛡️ Locución Cinturón' : c.soundAlert === 'promo' ? '🎁 Audio Promo' : '🔔 Campana'}
                        </span>
                      )}
                      {c.audience && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700">
                          {c.audience === 'drivers' ? '🚗 Solo Choferes' : c.audience === 'passengers' ? '👤 Solo Pasajeros' : c.audience === 'specific' ? '🎯 Específico' : '🌎 Todos'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.message}</p>
                    
                    {c.status === 'scheduled' && c.scheduledAt && (
                      <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                        📅 Programada para: {new Date(c.scheduledAt).toLocaleString('es-AR')}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      <span>🎯 {c.stats?.targeted || 0} destinatarios</span>
                      <span>📤 {c.stats?.sent || 0} enviados</span>
                      <span>👁️ {c.stats?.read || 0} leídos</span>
                      <span className="ml-auto">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-AR') : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function ContactPanel({
  conversation,
  onViewCRM,
  onClose,
}: {
  conversation: Conversation | null;
  onViewCRM: () => void;
  onClose: () => void;
}) {
  if (!conversation) return (
    <div className="p-4 text-center text-slate-400 text-sm mt-8">
      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
      Seleccioná una conversación
    </div>
  );
  const main = conversation.participants.find(p => p.role === 'customer' || p.role === 'driver');

  const handleUpdateBusinessUnit = async (unit: string) => {
    try {
      await updateDoc(doc(db, 'conversations', conversation.id), {
        'metadata.businessUnit': unit,
        'metadata.sector': ''
      });
      const q = query(collection(db, 'leads'), where('conversationId', '==', conversation.id), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'leads', snap.docs[0].id), {
          businessUnit: unit,
          sector: ''
        });
      }
    } catch (error) {
      console.error("Error al actualizar unidad:", error);
    }
  };

  const handleUpdateSector = async (sector: string) => {
    try {
      await updateDoc(doc(db, 'conversations', conversation.id), {
        'metadata.sector': sector
      });
      const q = query(collection(db, 'leads'), where('conversationId', '==', conversation.id), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'leads', snap.docs[0].id), {
          sector
        });
      }
    } catch (error) {
      console.error("Error al actualizar sector:", error);
    }
  };

  const handleUpdateChannel = async (channel: MessageChannel) => {
    try {
      await updateDoc(doc(db, 'conversations', conversation.id), {
        channel: channel
      });
      const q = query(collection(db, 'leads'), where('conversationId', '==', conversation.id), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const sourceMap: Record<string, string> = {
          whatsapp: 'WhatsApp',
          web: 'Web',
          instagram: 'IG',
          messenger: 'Messenger'
        };
        const origin = sourceMap[channel];
        if (origin) {
          await updateDoc(doc(db, 'leads', snap.docs[0].id), {
            origin
          });
        }
      }
    } catch (error) {
      console.error("Error al actualizar canal:", error);
    }
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-tech-blue to-indigo-650 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          {main?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <h3 className="mt-3 font-bold text-slate-800">{main?.name || 'Contacto'}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          {CHANNEL_ICON[conversation.channel]}
          <span className="text-xs text-slate-400">{CHANNEL_LABEL[conversation.channel]}</span>
        </div>
        {main?.phone && (
          <span className="text-xs text-slate-400 mt-1">{main.phone}</span>
        )}
      </div>

      {/* Conversation info */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-100">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado Conversación</label>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[conversation.status]}`} />
            <span className="text-xs font-semibold text-slate-700 capitalize">{conversation.status}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unidad de Negocio</label>
          <select 
            value={normalizeBusinessUnit(conversation.metadata?.businessUnit)}
            onChange={(e) => handleUpdateBusinessUnit(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-tech-blue text-slate-800"
          >
            {BUSINESS_UNITS_CONFIG.map(u => (
              <option key={u.id} value={u.id}>{u.label} ({u.subtitle})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sector / Área</label>
          <select 
            value={conversation.metadata?.sector || ''}
            onChange={(e) => handleUpdateSector(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-tech-blue text-slate-800"
          >
            <option value="">Sin sector asignado</option>
            {(ALL_SECTORS_BY_UNIT[normalizeBusinessUnit(conversation.metadata?.businessUnit)] || []).map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canal de Ingreso</label>
          <select 
            value={conversation.channel}
            onChange={(e) => handleUpdateChannel(e.target.value as any)}
            className="w-full text-xs bg-white border border-slate-202 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-tech-blue text-slate-800"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="web">Chat Web</option>
            <option value="instagram">Instagram</option>
            <option value="messenger">Messenger</option>
            <option value="push">Notificación Push</option>
            <option value="internal">Interno</option>
          </select>
        </div>

        <div className="flex justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
          <span className="text-slate-400">Iniciada</span>
          <span className="font-semibold text-slate-700">{new Date(conversation.createdAt).toLocaleDateString('es-AR')}</span>
        </div>
        {conversation.operatorName && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Operador</span>
            <span className="font-semibold text-emerald-600">{conversation.operatorName}</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Acciones Rápidas</h4>
        <button 
          onClick={onViewCRM}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-202 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Users className="h-4 w-4 text-tech-blue" /> Ver en CRM
        </button>
        <button 
          onClick={async () => {
            if (!confirm("¿Estás seguro de que deseas cerrar esta conversación?")) return;
            try {
              await updateDoc(doc(db, 'conversations', conversation.id), {
                status: 'closed'
              });
              onClose();
            } catch (err) {
              console.error("Error al cerrar conversación:", err);
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <X className="h-4 w-4" /> Cerrar Conversación
        </button>
      </div>
    </div>
  );
}
// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'conversations' | 'calls' | 'automated' | 'broadcast';

export default function MessagesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [crmLead, setCrmLead] = useState<Lead | null>(null);
  const [crmSlideOpen, setCrmSlideOpen] = useState(false);

  const handleViewCRM = async () => {
    if (!activeConversation) return;
    try {
      const leadsRef = collection(db, 'leads');
      let q = query(leadsRef, where('conversationId', '==', activeConversation.id), limit(1));
      let snap = await getDocs(q);
      
      if (snap.empty && activeConversation.manyChatSubscriberId) {
        q = query(leadsRef, where('manyChatSubscriberId', '==', activeConversation.manyChatSubscriberId), limit(1));
        snap = await getDocs(q);
      }
      
      if (snap.empty) {
        const main = activeConversation.participants.find(p => p.role === 'customer' || p.role === 'driver');
        if (main?.phone) {
          q = query(leadsRef, where('phone', '==', main.phone), limit(1));
          snap = await getDocs(q);
        }
      }
      
      if (!snap.empty) {
        setCrmLead({ id: snap.docs[0].id, ...snap.docs[0].data() } as Lead);
        setCrmSlideOpen(true);
      } else {
        alert("No se encontró un Lead asociado en el CRM para este contacto.");
      }
    } catch (error) {
      console.error("Error al buscar Lead en CRM:", error);
    }
  };
  const [loadingConvs, setLoadingConvs] = useState(true);

  // Real-time conversations listener
  useEffect(() => {
    const q = query(collection(db, 'conversations'), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs);
      setLoadingConvs(false);
      // Update active conversation if it changed
      if (activeConversation) {
        const updated = convs.find(c => c.id === activeConversation.id);
        if (updated) setActiveConversation(updated);
      }
    });
    return () => unsub();
  }, [activeConversation?.id]);

  // Real-time calls listener (Anura)
  useEffect(() => {
    const q = query(collection(db, 'calls'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CallRecord));
      setCalls(list);
    });
    return () => unsub();
  }, []);

  const TABS = [
    { key: 'conversations' as Tab, label: 'Chats', icon: MessageSquare },
    { key: 'calls' as Tab, label: 'Llamadas', icon: Phone },
    { key: 'automated' as Tab, label: 'Automáticos', icon: Zap },
    { key: 'broadcast' as Tab, label: 'Broadcast', icon: Megaphone },
  ];

  // Filtrado estricto por Unidad de Negocio y Sector del usuario (Super Admin ve todo)
  const authorizedConversations = conversations.filter(c =>
    canAccessRecord(user, c.metadata?.businessUnit, c.metadata?.sector)
  );
  const authorizedCalls = calls.filter(c =>
    canAccessRecord(user, c.businessUnit, c.sector)
  );

  const totalUnread = authorizedConversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const pendingCallsCount = authorizedCalls.filter(
    c => c.attentionStatus === 'pendiente_atencion' || c.attentionStatus === 'pendiente_respuesta'
  ).length;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {/* ── Left Sidebar ── */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-800 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-tech-blue" />
              Mensajería
            </h2>
            {totalUnread > 0 && (
              <span className="bg-tech-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>
            )}
          </div>
          <p className={`mt-1 text-[10px] font-semibold truncate ${isSuperAdmin(user) ? 'text-purple-600' : 'text-slate-500'}`} title={getUserScopeLabel(user)}>
            {getUserScopeLabel(user)}
          </p>
          {/* Tabs */}
          <div className="flex gap-0.5 mt-3 bg-slate-100 p-0.5 rounded-lg">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${activeTab === t.key ? 'bg-white text-tech-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.key === 'calls' && pendingCallsCount > 0 && (
                    <span className="ml-0.5 bg-rose-500 text-white text-[9px] px-1.5 rounded-full">{pendingCallsCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'conversations' && (
            loadingConvs ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Cargando...</div>
            ) : (
              <ConversationList
                conversations={authorizedConversations}
                activeId={activeConversation?.id || null}
                onSelect={setActiveConversation}
                filter={filter}
                setFilter={setFilter}
                search={search}
                setSearch={setSearch}
              />
            )
          )}
          {activeTab === 'calls' && (
            <div className="p-4 text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-700">Bandeja Telefónica Anura</p>
              <p>Visualizá las llamadas entrantes/salientes, escuchá grabaciones pendientes y actualizá su estado.</p>
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <p>Pendientes: <strong className="text-rose-600">{pendingCallsCount}</strong></p>
                <p>Total autorizadas: <strong>{authorizedCalls.length}</strong></p>
              </div>
            </div>
          )}
          {activeTab === 'automated' && <AutomatedMessagesPanel />}
          {activeTab === 'broadcast' && <BroadcastPanel />}
        </div>
      </div>

      {/* ── Center: Chat Window or Calls Panel ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === 'calls' ? (
          <CallsPanel
            calls={authorizedCalls}
            operatorName={user?.displayName || 'Operador TravelApp'}
            onOpenConversation={(convId) => {
              if (!convId) return;
              const target = authorizedConversations.find(c => c.id === convId);
              if (target) {
                setActiveConversation(target);
              }
              setActiveTab('conversations');
            }}
          />
        ) : activeConversation && activeTab === 'conversations' ? (
          <ChatWindow conversation={activeConversation} operatorName={user?.displayName || 'Operador TravelApp'} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-tech-blue/10 to-indigo-600/10 flex items-center justify-center">
              <MessageSquare className="h-10 w-10 text-tech-blue/40" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-500">Centro de Mensajería</p>
              <p className="text-sm mt-1">
                {activeTab === 'conversations' ? 'Seleccioná una conversación para empezar' : activeTab === 'automated' ? 'Configurá los mensajes automáticos en el panel izquierdo' : 'Creá y gestioná campañas de broadcast en el panel izquierdo'}
              </p>
            </div>
            {activeTab === 'conversations' && conversations.length === 0 && (
              <div className="mt-4 bg-sky-50 border border-sky-200 rounded-xl p-4 max-w-sm text-center">
                <Bot className="h-8 w-8 text-tech-blue mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Esperando conversaciones</p>
                <p className="text-xs text-slate-400 mt-1">
                  Las conversaciones de WhatsApp, Instagram y Messenger aparecerán aquí automáticamente cuando Travis o un cliente inicie un chat.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right Panel: Contact Info ── */}
      {activeTab === 'conversations' && (
        <div className="w-64 flex-shrink-0 border-l border-slate-200 bg-white hidden xl:flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700">Información del Contacto</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ContactPanel conversation={activeConversation} onViewCRM={handleViewCRM} onClose={() => setActiveConversation(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
