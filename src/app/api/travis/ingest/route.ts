// =============================================================================
// TRAVIS KNOWLEDGE INGESTION API — PDF, Archivos de Texto y URLs
// POST /api/travis/ingest
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

function htmlToCleanText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title,
    text: stripped.slice(0, 30000),
  };
}

async function extractPdfWithGemini(base64Data: string, fileName: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!geminiKey || geminiKey.includes('TU_')) {
    throw new Error('GEMINI_API_KEY no está configurada para procesar archivos PDF.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Extraé fielmente y de forma estructurada en Markdown todo el contenido útil de este documento PDF ("${fileName}") para la base de conocimiento de un asistente de atención y ventas. Conservá precios, condiciones, políticas, requisitos y detalles importantes. No inventes ni agregues datos que no estén en el PDF.`,
              },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al leer PDF con Gemini: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const extracted = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!extracted.trim()) {
    throw new Error('No se pudo extraer texto legible del PDF.');
  }
  return extracted.trim().slice(0, 35000);
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // 1. Ingesta desde URL
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const rawUrl = String(body.url || '').trim();
      if (!rawUrl || (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://'))) {
        return NextResponse.json(
          { error: 'Ingresá una URL válida que comience con http:// o https://' },
          { status: 400 }
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TravelAppTravisBot/1.0)',
          Accept: 'text/html,application/xhtml+xml,text/plain',
        },
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        return NextResponse.json(
          { error: `No se pudo descargar la URL (HTTP ${res.status})` },
          { status: 400 }
        );
      }

      const html = await res.text();
      const { title, text } = htmlToCleanText(html);

      if (!text) {
        return NextResponse.json(
          { error: 'La página no contiene texto legible para extraer.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        title: title || rawUrl,
        content: text,
        sourceType: 'url',
        sourceUrl: rawUrl,
      });
    }

    // 2. Ingesta desde Archivo (PDF / TXT / MD / CSV)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No se adjuntó ningún archivo.' }, { status: 400 });
      }

      const fileName = file.name || 'documento';
      const lowerName = fileName.toLowerCase();
      const cleanTitle = fileName.replace(/\.[^/.]+$/, '');

      if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.byteLength > 12 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'El PDF supera el límite de 12 MB.' },
            { status: 400 }
          );
        }
        const base64 = buffer.toString('base64');
        const extractedText = await extractPdfWithGemini(base64, fileName);

        return NextResponse.json({
          success: true,
          title: cleanTitle,
          content: extractedText,
          sourceType: 'pdf',
          fileName,
        });
      }

      // Archivos de texto plano (.txt, .md, .csv)
      const textContent = (await file.text()).trim().slice(0, 35000);
      if (!textContent) {
        return NextResponse.json(
          { error: 'El archivo está vacío o no tiene texto legible.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        title: cleanTitle,
        content: textContent,
        sourceType: 'file',
        fileName,
      });
    }

    return NextResponse.json({ error: 'Formato de solicitud no soportado.' }, { status: 400 });
  } catch (error: any) {
    console.error('[Travis Ingest] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error procesando el documento o URL.' },
      { status: 500 }
    );
  }
}
