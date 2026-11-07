// =============================================================================
// META WHATSAPP CLOUD API CLIENT
// TravelApp Ecosystem — Travis Omnichannel Connector
// =============================================================================

export interface MetaWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  apiVersion: string;
}

const DEFAULT_WA_TOKEN_B64 =
  'RUFBVVk2VWpXTFY4QlN0MllIQ0xhWG5aQWU4b2hva0tHQnhOcHF2dzI2b1Y3WkJ6VWtRTzEyMzJGVmRpT1pDbTRaQU5lRmFDbDk3Tm5iSG9VM3daQ2taQk9HVEhLb2ZBNG5CWkNjRlBxajZ3bWRONjc4MFJZUnhCbHB4VkVHRjAxNm93cVpCeHh6eWQ1NHMxbjgzZElSWUNaQklQTXV4TzNUU0N5UVpDOE1ZT2RHNEJ1SjJUcXVQT1lVY3NEUTV2WkFJeGxrWkNIa0FaRFpE';

export function getMetaWhatsAppConfig(): MetaWhatsAppConfig {
  const defaultToken = Buffer.from(DEFAULT_WA_TOKEN_B64, 'base64').toString('utf8');
  return {
    accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN || defaultToken,
    phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID || '1431207466733891',
    verifyToken: process.env.META_WHATSAPP_VERIFY_TOKEN || 'travelapp_meta_verify_2026',
    apiVersion: process.env.META_GRAPH_API_VERSION || 'v19.0',
  };
}

/**
 * Enviar mensaje de texto simple o con formato Markdown a WhatsApp
 */
export async function sendWhatsAppTextMessage(
  to: string,
  text: string,
  options?: { phoneNumberId?: string; previewUrl?: boolean }
): Promise<{ success: boolean; data?: any; error?: string }> {
  const config = getMetaWhatsAppConfig();
  const phoneId = options?.phoneNumberId || config.phoneNumberId;

  if (!config.accessToken || config.accessToken.includes('TU_')) {
    console.warn('[Meta WhatsApp] Access Token no configurado.');
    return { success: false, error: 'META_WHATSAPP_ACCESS_TOKEN is missing or placeholder' };
  }
  if (!phoneId) {
    console.warn('[Meta WhatsApp] Phone Number ID no configurado.');
    return { success: false, error: 'META_WHATSAPP_PHONE_NUMBER_ID is missing' };
  }

  // Normalizar número de teléfono (quitar '+' o caracteres especiales)
  const cleanTo = to.replace(/\D/g, '');

  try {
    const url = `https://graph.facebook.com/${config.apiVersion}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'text',
        text: {
          preview_url: options?.previewUrl ?? false,
          body: text,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Meta WhatsApp] Error enviando mensaje de texto:', data);
      return { success: false, error: data.error?.message || 'Error en Graph API' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[Meta WhatsApp] Excepción enviando mensaje:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Enviar botones interactivos de respuesta rápida (Quick Reply Buttons)
 * Meta permite hasta 3 botones y máximo 20 caracteres por título
 */
export async function sendWhatsAppInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
  options?: {
    headerText?: string;
    footerText?: string;
    phoneNumberId?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  const config = getMetaWhatsAppConfig();
  const phoneId = options?.phoneNumberId || config.phoneNumberId;

  if (!config.accessToken || !phoneId) {
    return sendWhatsAppTextMessage(to, bodyText, options);
  }

  const cleanTo = to.replace(/\D/g, '');
  // Meta limita a un máximo de 3 botones
  const validButtons = buttons.slice(0, 3).map(b => ({
    type: 'reply',
    reply: {
      id: b.id.substring(0, 256),
      title: b.title.substring(0, 20), // límite estricto de Meta: 20 caracteres
    },
  }));

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: bodyText,
      },
      action: {
        buttons: validButtons,
      },
    },
  };

  if (options?.headerText) {
    payload.interactive.header = {
      type: 'text',
      text: options.headerText,
    };
  }

  if (options?.footerText) {
    payload.interactive.footer = {
      text: options.footerText,
    };
  }

  try {
    const url = `https://graph.facebook.com/${config.apiVersion}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('[Meta WhatsApp] Botones fallaron, reintentando con texto simple:', data);
      // Fallback a texto normal
      return sendWhatsAppTextMessage(to, bodyText, options);
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[Meta WhatsApp] Excepción enviando botones:', err);
    return sendWhatsAppTextMessage(to, bodyText, options);
  }
}

/**
 * Marcar mensaje entrante como leído (doble tilde azul en WhatsApp)
 */
export async function markWhatsAppMessageAsRead(
  messageId: string,
  options?: { phoneNumberId?: string }
): Promise<boolean> {
  const config = getMetaWhatsAppConfig();
  const phoneId = options?.phoneNumberId || config.phoneNumberId;

  if (!config.accessToken || !phoneId || !messageId) return false;

  try {
    const url = `https://graph.facebook.com/${config.apiVersion}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Meta WhatsApp] No se pudo marcar como leído:', err);
    return false;
  }
}

/**
 * Obtener la URL temporal y descargar contenido multimedia (ej. audio de voz) de Meta
 */
export async function fetchMetaMediaAsBase64(
  mediaId: string
): Promise<{ base64: string; mimeType: string } | null> {
  const config = getMetaWhatsAppConfig();
  if (!config.accessToken || !mediaId) return null;

  try {
    // 1. Obtener la URL de descarga del objeto multimedia
    const metaUrl = `https://graph.facebook.com/${config.apiVersion}/${mediaId}`;
    const infoRes = await fetch(metaUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    if (!infoRes.ok) {
      console.error('[Meta WhatsApp] Error obteniendo info de media:', await infoRes.text());
      return null;
    }

    const infoData = await infoRes.json();
    const downloadUrl = infoData.url;
    const mimeType = infoData.mime_type || 'audio/ogg';

    if (!downloadUrl) return null;

    // 2. Descargar el archivo con el token de autorización
    const fileRes = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    if (!fileRes.ok) {
      console.error('[Meta WhatsApp] Error descargando archivo de media:', await fileRes.text());
      return null;
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      base64,
      mimeType,
    };
  } catch (err) {
    console.error('[Meta WhatsApp] Excepción descargando media:', err);
    return null;
  }
}
