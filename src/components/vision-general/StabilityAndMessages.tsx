'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Database,
  Wifi,
  ShieldCheck,
  RefreshCw,
  Send,
  MessageSquare,
  Users,
  User,
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  limit,
  onSnapshot,
  addDoc,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface OperatorMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string; // 'all' o email específico
  recipientLabel: string;
  text: string;
  createdAt: number;
}

interface StaffOption {
  id: string;
  name: string;
  email: string;
}

export function StabilityAndMessages() {
  const { user } = useAuth();
  const [online, setOnline] = useState(true);
  const [dbLatencyMs, setDbLatencyMs] = useState<number | null>(null);
  const [dbStatus, setDbStatus] = useState<'ok' | 'slow' | 'error'>('ok');
  const [checking, setChecking] = useState(false);

  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [messages, setMessages] = useState<OperatorMessage[]>([]);
  const [recipient, setRecipient] = useState('all');
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);

  const checkStability = useCallback(async () => {
    setChecking(true);
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const start = performance.now();
    try {
      await getDocs(query(collection(db, 'branches'), limit(1)));
      const elapsed = Math.round(performance.now() - start);
      setDbLatencyMs(elapsed);
      setDbStatus(elapsed > 1500 ? 'slow' : 'ok');
    } catch {
      setDbLatencyMs(null);
      setDbStatus('error');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStability();
    const interval = setInterval(checkStability, 30000);
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener('online', onOn);
    window.addEventListener('offline', onOff);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOn);
      window.removeEventListener('offline', onOff);
    };
  }, [checkStability]);

  useEffect(() => {
    const unsubStaff = onSnapshot(collection(db, 'staff_users'), (snap) => {
      setStaffList(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().email || 'Operador',
          email: (d.data().email || '').toLowerCase(),
        }))
      );
    });

    const q = query(collection(db, 'operator_messages'), orderBy('createdAt', 'desc'), limit(25));
    const unsubMsgs = onSnapshot(q, (snap) => {
      const currentEmail = (user?.email || '').toLowerCase();
      const allMsgs = snap.docs.map((d) => ({
        id: d.id,
        senderEmail: d.data().senderEmail || '',
        senderName: d.data().senderName || 'Operador',
        recipientEmail: d.data().recipientEmail || 'all',
        recipientLabel: d.data().recipientLabel || 'Todos los operadores',
        text: d.data().text || '',
        createdAt: d.data().createdAt || 0,
      }));
      // Filtrar para mostrar globales, enviados por mí o dirigidos a mí
      setMessages(
        allMsgs.filter(
          (m) =>
            m.recipientEmail === 'all' ||
            m.recipientEmail === currentEmail ||
            m.senderEmail.toLowerCase() === currentEmail
        )
      );
    });

    return () => {
      unsubStaff();
      unsubMsgs();
    };
  }, [user?.email]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    setSending(true);
    try {
      const selectedStaff = staffList.find((s) => s.email === recipient);
      await addDoc(collection(db, 'operator_messages'), {
        senderEmail: user?.email || 'sistema@travelapp.ar',
        senderName: user?.displayName || user?.email?.split('@')[0] || 'Operador',
        recipientEmail: recipient,
        recipientLabel:
          recipient === 'all'
            ? 'Todos los operadores'
            : selectedStaff?.name || recipient,
        text: msgText.trim(),
        createdAt: Date.now(),
      });
      setMsgText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Monitor de Estabilidad */}
      <div className="rounded-xl border border-slate-200/90 bg-white/75 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0a2a5b]" />
            <h3 className="text-sm font-bold text-[#0a2a5b]">Monitor de Estabilidad del Sistema</h3>
          </div>
          <button
            type="button"
            onClick={checkStability}
            disabled={checking}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0a2a5b] hover:underline cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            Verificar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Conexión Red</span>
              <Wifi className={`w-4 h-4 ${online ? 'text-emerald-600' : 'text-red-500'}`} />
            </div>
            <p className={`mt-2 text-sm font-bold ${online ? 'text-emerald-700' : 'text-red-600'}`}>
              {online ? 'En línea' : 'Sin conexión'}
            </p>
            <p className="text-[11px] text-slate-400">Navegador activo</p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Base Firestore</span>
              <Database
                className={`w-4 h-4 ${
                  dbStatus === 'ok'
                    ? 'text-emerald-600'
                    : dbStatus === 'slow'
                    ? 'text-amber-500'
                    : 'text-red-500'
                }`}
              />
            </div>
            <p className="mt-2 text-sm font-bold text-[#0a2a5b]">
              {dbStatus === 'error'
                ? 'Error'
                : dbLatencyMs !== null
                ? `${dbLatencyMs} ms`
                : 'Midiendo...'}
            </p>
            <p className="text-[11px] text-slate-400">
              {dbStatus === 'ok' ? 'Latencia óptima' : dbStatus === 'slow' ? 'Latencia elevada' : 'Revisar reglas/red'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Firebase Auth</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-sm font-bold text-emerald-700">
              {auth.currentUser ? 'Verificada' : 'Activa'}
            </p>
            <p className="text-[11px] text-slate-400">Dominio corporativo</p>
          </div>
        </div>
      </div>

      {/* Mensajería Interna de Operadores */}
      <div className="rounded-xl border border-slate-200/90 bg-white/75 p-5 flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#0a2a5b]" />
            <h3 className="text-sm font-bold text-[#0a2a5b]">Mensajería a Operadores</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Tiempo real</span>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
          {messages.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Sin mensajes recientes entre operadores.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#0a2a5b]">{m.senderName}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    {m.recipientEmail === 'all' ? (
                      <Users className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    Para: {m.recipientLabel}
                  </span>
                </div>
                <p className="text-slate-700 mt-1">{m.text}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-2 pt-1">
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="sm:w-44 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
          >
            <option value="all">Todos los operadores</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.email}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
          <input
            type="text"
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder="Escribir mensaje interno..."
            required
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-[#0a2a5b] outline-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
}
