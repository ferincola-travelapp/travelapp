// =============================================================================
// META SOCIAL GRAPH API CLIENT (Instagram DM, Messenger & Post Comments)
// TravelApp Ecosystem — Travis Omnichannel Connector (100% Direct Meta API)
// =============================================================================

import { serverGetDoc } from '@/lib/firestore-server';

export interface MetaSocialConfig {
  pageAccessToken: string;
  travelcabPageAccessToken: string;
  instagramAccessToken: string;
  facebookPageId: string;
  travelcabPageId: string;
  instagramAccountId: string;
  travelcabInstagramAccountId: string;
  verifyToken: string;
  apiVersion: string;
}

let cachedFirestoreTokens: {
  travelappToken?: string;
  travelcabToken?: string;
  loadedAt: number;
} = { loadedAt: 0 };

export async function ensureMetaTokensLoaded(): Promise<{
  travelappToken: string;
  travelcabToken: string;
}> {
  const envTa =
    process.env.META_PAGE_ACCESS_TOKEN ||
    process.env.META_TRAVELAPP_PAGE_TOKEN ||
    process.env.META_INSTAGRAM_ACCESS_TOKEN ||
    '';
  const envTc = process.env.META_TRAVELCAB_PAGE_TOKEN || envTa;

  if (envTa && envTc) {
    return { travelappToken: envTa, travelcabToken: envTc };
  }

  if (
    cachedFirestoreTokens.travelappToken &&
    Date.now() - cachedFirestoreTokens.loadedAt < 300_000
  ) {
    return {
      travelappToken: cachedFirestoreTokens.travelappToken || '',
      travelcabToken:
        cachedFirestoreTokens.travelcabToken ||
        cachedFirestoreTokens.travelappToken ||
        '',
    };
  }

  try {
    const snap = await serverGetDoc('travisConfig', 'main');
    if (snap.exists) {
      const data = snap.data() as any;
      const creds = data?.metaCredentials;
      if (creds?.travelappPageToken || creds?.travelcabPageToken) {
        cachedFirestoreTokens = {
          travelappToken: creds.travelappPageToken || '',
          travelcabToken: creds.travelcabPageToken || creds.travelappPageToken || '',
          loadedAt: Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn('[Meta Social] No se pudo leer metaCredentials de Firestore:', err);
  }

  return {
    travelappToken: cachedFirestoreTokens.travelappToken || process.env.META_WHATSAPP_ACCESS_TOKEN || '',
    travelcabToken: cachedFirestoreTokens.travelcabToken || cachedFirestoreTokens.travelappToken || process.env.META_WHATSAPP_ACCESS_TOKEN || '',
  };
}

const DEFAULT_TA_B64 =
  'RUFBVVk2VWpXTFY4QlN4OUZtb01HcU9pM1lMeHdkSVpBbUZTRThhSEdyc1VaQnplRkdHU250WG5hcTVJOVJDdmttMHV2bVU3eThBSmxlSnBYYXZXWkM4cjlaQ1pBTUMwWkJya2JTU050RVpCMGM5Y3lIT2tlSVI5WkNKYmtIVkpHWkNPYURCZkZaQXdycjdBRFMweG9iV0FrV1Fnc1pCMEtjblpBTmtsZmxOb1VmeEhGamkwTVRQWkFKTmZCVTFhNW9uYUJxa3BnUlpDb3NjU2Q4WkQ=';
const DEFAULT_TC_B64 =
  'RUFBVVk2VWpXTFY4QlN4WTMyU3dwYnNDR0xwT2NmQW5FbVpDWUxqWkF5OWpLQzM4V0VPQ1YyNE9jTEtKUWt4TG1NYVVIMzlOWkN6Rm5jRU40SFhUMzhkSDVONTg2WTRiOHMydTlER0hhOUVCRjU0MnRXWkM1VmlxRXZ2Y3E0dER6QVJaQVpBeFRNeWZlc2laQVpBSU1Gcko2T0g1dzc3NzMyTzdTM1RqTHhwMnNoWkMzbU0wZTJzTDQ3WThERDBhZ3VCZEc2MU9nT3NaQ01aRA==';

export function getMetaSocialConfig(): MetaSocialConfig {
  const defaultTaToken = Buffer.from(DEFAULT_TA_B64, 'base64').toString('utf8');
  const defaultTcToken = Buffer.from(DEFAULT_TC_B64, 'base64').toString('utf8');

  const sharedToken =
    process.env.META_PAGE_ACCESS_TOKEN ||
    process.env.META_TRAVELAPP_PAGE_TOKEN ||
    cachedFirestoreTokens.travelappToken ||
    defaultTaToken;

  return {
    pageAccessToken: sharedToken,
    travelcabPageAccessToken:
      process.env.META_TRAVELCAB_PAGE_TOKEN ||
      cachedFirestoreTokens.travelcabToken ||
      defaultTcToken,
    instagramAccessToken:
      process.env.META_INSTAGRAM_ACCESS_TOKEN ||
      cachedFirestoreTokens.travelappToken ||
      sharedToken,
    facebookPageId: process.env.META_FACEBOOK_PAGE_ID || '696112136925881',
    travelcabPageId: process.env.META_TRAVELCAB_PAGE_ID || '969479339589593',
    instagramAccountId: process.env.META_INSTAGRAM_ACCOUNT_ID || '17841476493568847',
    travelcabInstagramAccountId:
      process.env.META_TRAVELCAB_INSTAGRAM_ACCOUNT_ID || '17841430644010712',
    verifyToken: process.env.META_WHATSAPP_VERIFY_TOKEN || 'travelapp_meta_verify_2026',
    apiVersion: process.env.META_GRAPH_API_VERSION || 'v19.0',
  };
}

/**
 * Resuelve el token adecuado según el ID de la página/cuenta que recibió el evento
 */
export function resolveMetaTokenForAccount(
  channelOrPlatform: 'instagram' | 'messenger' | 'facebook',
  accountOrPageId?: string
): string {
  const config = getMetaSocialConfig();
  if (
    accountOrPageId &&
    (accountOrPageId === config.travelcabPageId ||
      accountOrPageId === config.travelcabInstagramAccountId ||
      accountOrPageId === '969479339589593' ||
      accountOrPageId === '17841430644010712') &&
    config.travelcabPageAccessToken
  ) {
    return config.travelcabPageAccessToken;
  }
  if (channelOrPlatform === 'instagram') {
    return config.instagramAccessToken || config.pageAccessToken;
  }
  return config.pageAccessToken || config.travelcabPageAccessToken;
}

/**
 * Enviar mensaje directo (DM) por Facebook Messenger o Instagram Direct
 * Soporta botones Quick Reply (hasta 3 botones de respuesta rápida)
 */
export async function sendSocialTextMessage(
  channel: 'instagram' | 'messenger',
  recipientId: string,
  text: string,
  buttons?: { id: string; title: string }[],
  pageOrAccountId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  await ensureMetaTokensLoaded();
  const config = getMetaSocialConfig();
  const token = resolveMetaTokenForAccount(channel, pageOrAccountId);

  if (!token || token.includes('TU_')) {
    console.warn(`[Meta Social] Access Token no configurado para ${channel}.`);
    return { success: false, error: 'META_PAGE_ACCESS_TOKEN is missing' };
  }

  // En Graph API v19+, /me/messages con Page Access Token funciona tanto para Messenger como Instagram Messaging conectado a la página
  const endpointId = pageOrAccountId || config.facebookPageId || 'me';
  const url = `https://graph.facebook.com/${config.apiVersion}/${endpointId}/messages`;

  const messagePayload: any = {
    text,
  };

  if (buttons && buttons.length > 0) {
    messagePayload.quick_replies = buttons.slice(0, 3).map(b => ({
      content_type: 'text',
      title: b.title.substring(0, 20),
      payload: b.id.substring(0, 100),
    }));
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: messagePayload,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      // Si falló con quick_replies, reintentar solo texto
      if (buttons && buttons.length > 0) {
        return sendSocialTextMessage(channel, recipientId, text, undefined, pageOrAccountId);
      }
      console.error(`[Meta Social] Error enviando DM en ${channel}:`, data);
      return { success: false, error: data.error?.message || 'Error en Graph API Send' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error(`[Meta Social] Excepción enviando DM en ${channel}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Responder públicamente a un comentario en una publicación de Instagram o Facebook
 */
export async function replyToPublicComment(
  platform: 'instagram' | 'facebook',
  commentId: string,
  text: string,
  pageOrAccountId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  await ensureMetaTokensLoaded();
  const config = getMetaSocialConfig();
  const token = resolveMetaTokenForAccount(platform, pageOrAccountId);

  if (!token || !commentId) {
    return { success: false, error: 'Token o commentId faltante' };
  }

  // En Instagram Graph API es /{comment-id}/replies; en Facebook Page Graph API es /{comment-id}/comments
  const edge = platform === 'instagram' ? 'replies' : 'comments';
  const url = `https://graph.facebook.com/${config.apiVersion}/${commentId}/${edge}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: text,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[Meta Social] Error respondiendo comentario público en ${platform}:`, data);
      return { success: false, error: data.error?.message || 'Error respondiendo comentario' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error(`[Meta Social] Excepción respondiendo comentario en ${platform}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Enviar un DM Privado automático en respuesta a un comentario de publicación (Private Reply API de Meta)
 * Funciona dentro de los 7 días de realizado el comentario en el post/reel
 */
export async function sendPrivateReplyToComment(
  platform: 'instagram' | 'facebook',
  commentId: string,
  text: string,
  pageOrAccountId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  await ensureMetaTokensLoaded();
  const config = getMetaSocialConfig();
  const token = resolveMetaTokenForAccount(platform, pageOrAccountId);

  if (!token || !commentId) {
    return { success: false, error: 'Token o commentId faltante' };
  }

  const endpointId = pageOrAccountId || config.facebookPageId || (platform === 'instagram' ? config.instagramAccountId : 'me') || 'me';
  const url = `https://graph.facebook.com/${config.apiVersion}/${endpointId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[Meta Social] Error enviando Private Reply DM por comentario en ${platform}:`, data);
      return { success: false, error: data.error?.message || 'Error en Private Reply API' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error(`[Meta Social] Excepción en Private Reply (${platform}):`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Listar publicaciones recientes de Instagram y/o Facebook para elegir en el panel de Travis
 */
export async function fetchRecentSocialPosts(): Promise<{
  instagram: { id: string; caption: string; permalink: string; mediaType: string; timestamp: string }[];
  facebook: { id: string; caption: string; permalink: string; timestamp: string }[];
}> {
  await ensureMetaTokensLoaded();
  const config = getMetaSocialConfig();
  const result = {
    instagram: [] as { id: string; caption: string; permalink: string; mediaType: string; timestamp: string }[],
    facebook: [] as { id: string; caption: string; permalink: string; timestamp: string }[],
  };

  if (!config.pageAccessToken) return result;

  // 1. Intentar traer publicaciones de Instagram Business (@travelapp.ar y @travelcab.ar)
  const igAccounts = [
    { id: config.instagramAccountId, label: '@travelapp.ar', token: config.instagramAccessToken },
    { id: config.travelcabInstagramAccountId, label: '@travelcab.ar', token: config.travelcabPageAccessToken },
  ].filter(a => a.id && a.token);

  for (const acc of igAccounts) {
    try {
      const igUrl = `https://graph.facebook.com/${config.apiVersion}/${acc.id}/media?fields=id,caption,media_type,permalink,timestamp&limit=10`;
      const igRes = await fetch(igUrl, {
        headers: { 'Authorization': `Bearer ${acc.token}` },
      });
      if (igRes.ok) {
        const igData = await igRes.json();
        const items = (igData.data || []).map((item: any) => ({
          id: item.id,
          caption: `${acc.label}: ${item.caption || '(Publicación sin texto)'}`,
          permalink: item.permalink || '',
          mediaType: item.media_type || 'IMAGE',
          timestamp: item.timestamp || '',
        }));
        result.instagram.push(...items);
      }
    } catch (err) {
      console.warn(`[Meta Social] Error obteniendo publicaciones de ${acc.label}:`, err);
    }
  }

  // 2. Intentar traer publicaciones de Facebook Page
  if (config.facebookPageId) {
    try {
      const fbUrl = `https://graph.facebook.com/${config.apiVersion}/${config.facebookPageId}/posts?fields=id,message,permalink_url,created_time&limit=15`;
      const fbRes = await fetch(fbUrl, {
        headers: { 'Authorization': `Bearer ${config.pageAccessToken}` },
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        result.facebook = (fbData.data || []).map((item: any) => ({
          id: item.id,
          caption: item.message || '(Post de Facebook sin texto)',
          permalink: item.permalink_url || '',
          timestamp: item.created_time || '',
        }));
      }
    } catch (err) {
      console.warn('[Meta Social] Error obteniendo publicaciones de Facebook:', err);
    }
  }

  return result;
}
