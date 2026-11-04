'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function AutoDownloadTrigger({ url, fileName }: { url: string; fileName: string }) {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTriggered(true);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', fileName);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 500);
    return () => clearTimeout(timer);
  }, [url, fileName]);

  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      <span>
        {triggered
          ? `Descarga de ${fileName} iniciada automáticamente. Si no comenzó, tocá el botón de arriba.`
          : `Preparando descarga directa de ${fileName}...`}
      </span>
    </div>
  );
}
