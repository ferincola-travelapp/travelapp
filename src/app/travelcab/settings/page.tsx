'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Play, Sparkles, Save, CheckCircle2 } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TravelCabAudiosPage() {
  const [notificationSoundUrl, setNotificationSoundUrl] = useState('');
  const [seatbeltPromptText, setSeatbeltPromptText] = useState(
    'Por tu seguridad, es importante que te coloques el cinturón de seguridad y verifiques tu destino. ¡Buen viaje!'
  );
  const [seatbeltAudioUrl, setSeatbeltAudioUrl] = useState('');
  const [arrivalPromptText, setArrivalPromptText] = useState(
    'Has llegado a tu destino. ¡Muchas gracias por viajar con TravelApp! No olvides tus pertenencias.'
  );
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config', 'logistics'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setNotificationSoundUrl(data.notificationSoundUrl || '');
        if (data.seatbeltPromptText) setSeatbeltPromptText(data.seatbeltPromptText);
        if (data.seatbeltAudioUrl) setSeatbeltAudioUrl(data.seatbeltAudioUrl);
        if (data.arrivalPromptText) setArrivalPromptText(data.arrivalPromptText);
        if (data.voiceGender) setVoiceGender(data.voiceGender);
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedMsg(false);
    try {
      await setDoc(
        doc(db, 'system_config', 'logistics'),
        {
          notificationSoundUrl,
          seatbeltPromptText,
          seatbeltAudioUrl,
          arrivalPromptText,
          voiceGender,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const speakPreview = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-AR';
      utterance.pitch = voiceGender === 'male' ? 0.8 : 1.15;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Tu navegador no soporta síntesis de voz.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200/80 pb-4">
        <h2 className="text-lg font-bold text-[#0a2a5b] flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-[#0a2a5b]" />
          Audios, Locuciones y Alertas Sonoras
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configura los tonos de solicitud de viaje y las locuciones automáticas de seguridad en Firestore (`system_config/logistics`).
        </p>
      </div>

      {/* 1. Alerta sonora de solicitud */}
      <div className="rounded-xl border border-slate-200/90 bg-white/80 p-5 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[#0a2a5b]">1. Alerta Sonora de Solicitud de Viaje (Chofer)</h3>
          <p className="text-xs text-slate-500">Tono que suena en bucle cuando el conductor recibe un viaje.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={notificationSoundUrl}
            onChange={(e) => setNotificationSoundUrl(e.target.value)}
            placeholder="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0a2a5b]"
          />
          <button
            type="button"
            onClick={() => {
              const url =
                notificationSoundUrl ||
                'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
              const audio = new Audio(url);
              audio.play().catch(() => alert('No se pudo reproducir el audio. Verificá la URL.'));
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Escuchar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setNotificationSoundUrl('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
            }
            className="text-[11px] font-bold text-[#0a2a5b] border border-slate-200 bg-white px-2.5 py-1 rounded-lg hover:border-[#0a2a5b] cursor-pointer"
          >
            Radar Oficial TravelCab
          </button>
          <button
            type="button"
            onClick={() =>
              setNotificationSoundUrl('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3')
            }
            className="text-[11px] font-bold text-[#0a2a5b] border border-slate-200 bg-white px-2.5 py-1 rounded-lg hover:border-[#0a2a5b] cursor-pointer"
          >
            Campana Aguda
          </button>
        </div>
      </div>

      {/* 2. Locución de cinturón */}
      <div className="rounded-xl border border-slate-200/90 bg-white/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0a2a5b] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> 2. Locución de Seguridad (Cinturón)
            </h3>
            <p className="text-xs text-slate-500">Voz automática al iniciar el viaje.</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setVoiceGender('female')}
              className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer ${
                voiceGender === 'female' ? 'bg-[#0a2a5b] text-white' : 'text-slate-600'
              }`}
            >
              Voz Femenina
            </button>
            <button
              type="button"
              onClick={() => setVoiceGender('male')}
              className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer ${
                voiceGender === 'male' ? 'bg-[#0a2a5b] text-white' : 'text-slate-600'
              }`}
            >
              Voz Masculina
            </button>
          </div>
        </div>

        <textarea
          rows={2}
          value={seatbeltPromptText}
          onChange={(e) => setSeatbeltPromptText(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0a2a5b] resize-none"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <input
            type="text"
            value={seatbeltAudioUrl}
            onChange={(e) => setSeatbeltAudioUrl(e.target.value)}
            placeholder="(Opcional) URL de MP3 grabado en estudio"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0a2a5b]"
          />
          <button
            type="button"
            onClick={() => speakPreview(seatbeltPromptText)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#0a2a5b]/30 text-[#0a2a5b] text-xs font-bold hover:bg-[#0a2a5b]/5 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" /> Probar Locución
          </button>
        </div>
      </div>

      {/* 3. Locución de llegada */}
      <div className="rounded-xl border border-slate-200/90 bg-white/80 p-5 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[#0a2a5b]">3. Locución al Llegar a Destino</h3>
          <p className="text-xs text-slate-500">Aviso hablado al finalizar el recorrido.</p>
        </div>
        <textarea
          rows={2}
          value={arrivalPromptText}
          onChange={(e) => setArrivalPromptText(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0a2a5b] resize-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => speakPreview(arrivalPromptText)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#0a2a5b]/30 text-[#0a2a5b] text-xs font-bold hover:bg-[#0a2a5b]/5 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" /> Probar Voz de Llegada
          </button>
        </div>
      </div>

      {/* Guardar */}
      <div className="flex items-center justify-between pt-2">
        {savedMsg ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Configuración guardada correctamente
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0a2a5b] hover:bg-[#071f45] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Guardando...' : 'Guardar Audios y Locuciones'}</span>
        </button>
      </div>
    </div>
  );
}
