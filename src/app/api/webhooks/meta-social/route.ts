// =============================================================================
// META SOCIAL WEBHOOK — Instagram DM, Facebook Messenger & Post Comments
// TravelApp Ecosystem — Travis Omnichannel & Comment Automation Engine
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  serverGetDoc,
  serverGetDocs,
  serverAddDoc,
  serverSetDoc,
  serverUpdateDoc,
} from '@/lib/firestore-server';
import {
  MessageChannel,
  TravisConfig,
  DEFAULT_TRAVIS_CONFIG,
  DEFAULT_COMMENT_RULES,
  CommentAutomationRule,
} from '@/types/messaging';
import { processTravisMessage, detectDetailedBusinessUnit } from '@/app/api/travis/chat/route';
import {
  getMetaSocialConfig,
  sendSocialTextMessage,
  replyToPublicComment,
  sendPrivateReplyToComment,
  fetchRecentSocialPosts,
} from '@/lib/meta-social';

export const maxDuration = 60;

// -----------------------------------------------------------------------------
// Helper: Cargar configuración de Travis desde Firestore
// -----------------------------------------------------------------------------
async function loadTravisConfig(): Promise<TravisConfig> {
  try {
    const docSnap = await serverGetDoc('travisConfig', 'main');
    if (docSnap.exists) {
      const data = docSnap.data() as TravisConfig;
      return {
        ...DEFAULT_TRAVIS_CONFIG,
        ...data,
        commentRules: data.commentRules || DEFAULT_COMMENT_RULES,
      };
    }
  } catch (err) {
    console.warn('[Meta Social Webhook] Fallback a DEFAULT_TRAVIS_CONFIG:', err);
  }
  return { ...DEFAULT_TRAVIS_CONFIG, updatedAt: Date.now() };
}

// -----------------------------------------------------------------------------
// GET: Handshake de Verificación de Meta + Listado de Publicaciones para el Panel
// -----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Endpoint auxiliar para el panel de Travis: traer últimos posteos de IG y FB
  if (searchParams.get('action') === 'list_posts') {
    const posts = await fetchRecentSocialPosts();
    return NextResponse.json({ success: true, posts });
  }

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const { verifyToken } = getMetaSocialConfig();

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Meta Social Webhook] Verificado con éxito por Meta.');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// -----------------------------------------------------------------------------
// Core Processor: Procesar DMs y Comentarios de Instagram y Facebook
// -----------------------------------------------------------------------------
export async function handleMetaSocialWebhookPayload(body: any) {
  const objectType = body.object; // 'instagram' | 'page'
  if (objectType !== 'instagram' && objectType !== 'page') {
    return NextResponse.json({ status: 'unsupported_object', objectType });
  }

  const config = await loadTravisConfig();
  const socialConfig = getMetaSocialConfig();
  const entries = Array.isArray(body.entry) ? body.entry : [];

  for (const entry of entries) {
    const entryId = String(entry.id || '');

    // =========================================================================
    // 1. MENSAJES DIRECTOS (Instagram DM & Facebook Messenger)
    // =========================================================================
    if (Array.isArray(entry.messaging)) {
      for (const messagingEvent of entry.messaging) {
        // Ignorar mensajes enviados por nuestra propia página/cuenta (echo) o acuses de lectura
        if (
          messagingEvent.message?.is_echo ||
          messagingEvent.read ||
          messagingEvent.delivery
        ) {
          continue;
        }

        const senderId = messagingEvent.sender?.id;
        if (!senderId || senderId === entryId || senderId === socialConfig.facebookPageId || senderId === socialConfig.instagramAccountId) {
          continue;
        }

        const channel: MessageChannel = objectType === 'instagram' ? 'instagram' : 'messenger';

        // Extraer texto del mensaje o postback / quick_reply
        let userMessage = '';
        if (messagingEvent.message?.text) {
          userMessage = messagingEvent.message.text;
        } else if (messagingEvent.postback?.title || messagingEvent.postback?.payload) {
          userMessage = messagingEvent.postback.title || messagingEvent.postback.payload;
        } else if (messagingEvent.message?.attachments?.length > 0) {
          const att = messagingEvent.message.attachments[0];
          if (att.type === 'audio') {
            userMessage = 'Te envié un mensaje de voz por privado.';
          } else if (att.type === 'image') {
            userMessage = 'Te comparto esta imagen.';
          } else {
            userMessage = '[Archivo adjunto recibido]';
          }
        }

        if (!userMessage.trim()) continue;

        const prefix = channel === 'instagram' ? 'ig' : 'fb';
        const conversationId = `${prefix}_${senderId}`;
        const senderLabel = channel === 'instagram' ? `Usuario IG (${senderId.slice(-4)})` : `Usuario FB (${senderId.slice(-4)})`;
        const businessUnit = detectDetailedBusinessUnit(userMessage);

        console.log(`[Meta Social] 📩 DM entrante en ${channel} de ${senderId}: "${userMessage}"`);

        // Cargar historial reciente de la conversación
        let history: { role: 'user' | 'assistant'; content: string }[] = [];
        let currentStatus = 'bot';
        try {
          const convDoc = await serverGetDoc('conversations', conversationId);
          if (convDoc.exists) {
            currentStatus = convDoc.data()?.status || 'bot';
          }
          const historySnap = await serverGetDocs(`conversations/${conversationId}/messages`, {
            orderBy: [['timestamp', 'asc']],
            limit: 8,
          });
          if (historySnap?.docs?.length > 0) {
            history = historySnap.docs.map((d: any) => {
              const data = typeof d.data === 'function' ? d.data() : d;
              return {
                role: data.sender?.role === 'customer' ? 'user' : 'assistant',
                content: data.content || '',
              };
            });
          }
        } catch (err) {
          console.warn('[Meta Social] Historial no disponible:', err);
        }

        let travisReply = '';
        let finalBusinessUnit = businessUnit;

        // Responder automáticamente con Travis si el canal está activo y la conversación está en modo 'bot'
        const isChannelActive = config.activeChannels?.[channel] ?? true;
        if (config.autoReplyEnabled && isChannelActive && currentStatus === 'bot') {
          const travisResult = await processTravisMessage(
            userMessage,
            history,
            businessUnit,
            conversationId
          );
          travisReply = travisResult.response;
          finalBusinessUnit = (travisResult.businessUnit as any) || businessUnit;

          if (travisReply) {
            await sendSocialTextMessage(
              channel,
              senderId,
              travisReply,
              travisResult.buttons,
              entryId
            );
          }
        }

        // Persistir conversación, mensaje y Lead en Firestore
        try {
          const now = Date.now();
          await serverAddDoc(`conversations/${conversationId}/messages`, {
            conversationId,
            sender: { id: senderId, name: senderLabel, role: 'customer' },
            content: userMessage,
            timestamp: now,
            type: 'text',
            channel,
            isRead: true,
          });

          if (travisReply) {
            await serverAddDoc(`conversations/${conversationId}/messages`, {
              conversationId,
              sender: { id: 'travis', name: 'Travis IA', role: 'travis' },
              content: travisReply,
              timestamp: now + 1,
              type: 'text',
              channel,
              isRead: false,
            });
          }

          await serverSetDoc('conversations', conversationId, {
            type: 'customer_support',
            channel,
            status: currentStatus,
            customerName: senderLabel,
            externalId: senderId,
            participants: [
              { id: senderId, name: senderLabel, role: 'customer' },
              { id: 'travis', name: 'Travis IA', role: 'travis' },
            ],
            lastMessage: (travisReply || userMessage).substring(0, 120),
            lastMessageAt: now,
            unreadCount: currentStatus === 'bot' ? 0 : 1,
            metadata: {
              businessUnit: finalBusinessUnit,
              passengerName: senderLabel,
            },
            createdAt: now,
            updatedAt: now,
          });

          await serverAddDoc('leads', {
            customerName: senderLabel,
            phone: '',
            origin: channel === 'instagram' ? 'IG' : 'Messenger',
            status: 'Nuevos',
            customerStatus: 'Prospecto',
            customerLevel: 1,
            businessUnit: finalBusinessUnit,
            conversationId,
            createdAt: now,
            lastInteraction: now,
          });
        } catch (saveErr) {
          console.warn('[Meta Social] Error guardando DM en Firestore:', saveErr);
        }
      }
    }

    // =========================================================================
    // 2. COMENTARIOS EN PUBLICACIONES ESPECÍFICAS (Instagram & Facebook Feed)
    // =========================================================================
    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        const field = change.field;
        const val = change.value;
        if (!val) continue;

        let isCommentEvent = false;
        let platform: 'instagram' | 'facebook' = objectType === 'instagram' ? 'instagram' : 'facebook';
        let commentId = '';
        let postId = '';
        let commentText = '';
        let authorId = '';
        let authorUsername = '';

        // Caso A: Comentario en Instagram (field === 'comments' o 'live_comments')
        if (objectType === 'instagram' && (field === 'comments' || field === 'live_comments')) {
          isCommentEvent = true;
          platform = 'instagram';
          commentId = String(val.id || '');
          postId = String(val.media?.id || '');
          commentText = String(val.text || '');
          authorId = String(val.from?.id || '');
          authorUsername = String(val.from?.username || 'usuario');
        }

        // Caso B: Comentario en Publicación de Página de Facebook (field === 'feed', item === 'comment', verb === 'add')
        if (
          objectType === 'page' &&
          field === 'feed' &&
          val.item === 'comment' &&
          (val.verb === 'add' || !val.verb)
        ) {
          isCommentEvent = true;
          platform = 'facebook';
          commentId = String(val.comment_id || val.id || '');
          postId = String(val.post_id || '');
          commentText = String(val.message || '');
          authorId = String(val.from?.id || '');
          authorUsername = String(val.from?.name || 'usuario');
        }

        if (!isCommentEvent || !commentId || !commentText.trim()) continue;

        // Evitar bucle infinito: ignorar comentarios hechos por nuestra propia cuenta/página
        if (
          authorId &&
          (authorId === entryId ||
            authorId === socialConfig.facebookPageId ||
            authorId === socialConfig.instagramAccountId)
        ) {
          continue;
        }

        console.log(`[Meta Social] 💬 Comentario en ${platform} (Post ${postId}) de @${authorUsername}: "${commentText}"`);

        // Buscar regla de automatización activa para esta publicación y palabras clave
        const rules: CommentAutomationRule[] = config.commentRules || DEFAULT_COMMENT_RULES;
        const matchedRule = rules.find(rule => {
          if (!rule.isActive) return false;
          if (rule.platform !== 'both' && rule.platform !== platform) return false;

          // Verificar si la regla aplica a una publicación específica o a todas ('ALL')
          const rulePostId = (rule.postId || 'ALL').trim();
          const matchesPost =
            rulePostId === 'ALL' ||
            rulePostId === '' ||
            rulePostId === postId ||
            postId.includes(rulePostId) ||
            (rule.postUrl && postId && rule.postUrl.includes(postId));

          if (!matchesPost) return false;

          // Verificar palabras clave (si keywords está vacío, responde a cualquier comentario en ese post)
          if (!rule.keywords || rule.keywords.length === 0) return true;
          const lowerComment = commentText.toLowerCase();
          return rule.keywords.some(kw => kw.trim() && lowerComment.includes(kw.trim().toLowerCase()));
        });

        if (!matchedRule) {
          console.log(`[Meta Social] ℹ️ Comentario no coincidió con ninguna regla activa.`);
          continue;
        }

        console.log(`[Meta Social] 🎯 Regla activada: "${matchedRule.name}" (${matchedRule.businessUnit})`);

        // 2.1. Responder públicamente en el comentario
        let publicReplySent = false;
        if (matchedRule.publicReplies && matchedRule.publicReplies.length > 0) {
          const randomTemplate =
            matchedRule.publicReplies[Math.floor(Math.random() * matchedRule.publicReplies.length)];
          const publicReplyText = randomTemplate.replace(/\{usuario\}/gi, authorUsername);

          const pubRes = await replyToPublicComment(platform, commentId, publicReplyText, entryId);
          publicReplySent = pubRes.success;
        }

        // 2.2. Enviar DM Privado automático (Private Reply API)
        let privateDmSent = false;
        let dmMessageToSend = (matchedRule.privateDmText || '').replace(/\{usuario\}/gi, authorUsername);

        if (matchedRule.sendPrivateDm) {
          if (matchedRule.useTravisAiForDm) {
            try {
              const aiRes = await processTravisMessage(
                `[Comentario en publicación "${matchedRule.name}"]: "${commentText}". Respondé cordialmente por mensaje privado a @${authorUsername}.`,
                [],
                matchedRule.businessUnit
              );
              if (aiRes.response) {
                dmMessageToSend = aiRes.response;
              }
            } catch (aiErr) {
              console.warn('[Meta Social] Fallback a texto fijo de DM en regla de comentario:', aiErr);
            }
          }

          if (dmMessageToSend) {
            const dmRes = await sendPrivateReplyToComment(platform, commentId, dmMessageToSend, entryId);
            privateDmSent = dmRes.success;
          }
        }

        // 2.3. Registrar la conversación y el Lead en Firestore + actualizar estadísticas de la regla
        try {
          const now = Date.now();
          const channel: MessageChannel = platform === 'instagram' ? 'instagram' : 'messenger';
          const convId = `comment_${platform}_${authorId || commentId}`;

          await serverAddDoc(`conversations/${convId}/messages`, {
            conversationId: convId,
            sender: { id: authorId || commentId, name: `@${authorUsername}`, role: 'customer' },
            content: `[Comentó en post ${postId || matchedRule.name}]: "${commentText}"`,
            timestamp: now,
            type: 'text',
            channel,
            isRead: true,
          });

          if (dmMessageToSend) {
            await serverAddDoc(`conversations/${convId}/messages`, {
              conversationId: convId,
              sender: { id: 'travis', name: 'Travis IA', role: 'travis' },
              content: dmMessageToSend,
              timestamp: now + 1,
              type: 'text',
              channel,
              isRead: false,
            });
          }

          await serverSetDoc('conversations', convId, {
            type: 'customer_support',
            channel,
            status: 'bot',
            customerName: `@${authorUsername}`,
            externalId: authorId || commentId,
            participants: [
              { id: authorId || commentId, name: `@${authorUsername}`, role: 'customer' },
              { id: 'travis', name: 'Travis IA', role: 'travis' },
            ],
            lastMessage: (dmMessageToSend || commentText).substring(0, 120),
            lastMessageAt: now,
            unreadCount: 0,
            metadata: {
              businessUnit: matchedRule.businessUnit,
              passengerName: `@${authorUsername}`,
            },
            createdAt: now,
            updatedAt: now,
          });

          await serverAddDoc('leads', {
            customerName: `@${authorUsername}`,
            phone: '',
            origin: platform === 'instagram' ? 'IG' : 'Messenger',
            status: 'Nuevos',
            customerStatus: 'Prospecto',
            customerLevel: 1,
            businessUnit: matchedRule.businessUnit,
            conversationId: convId,
            createdAt: now,
            lastInteraction: now,
          });

          // Actualizar contadores de la regla en travisConfig
          const updatedRules = rules.map(r => {
            if (r.id !== matchedRule.id) return r;
            return {
              ...r,
              stats: {
                commentsReplied: (r.stats?.commentsReplied || 0) + (publicReplySent ? 1 : 0),
                dmsSent: (r.stats?.dmsSent || 0) + (privateDmSent ? 1 : 0),
              },
            };
          });
          await serverUpdateDoc('travisConfig', 'main', {
            commentRules: updatedRules,
            updatedAt: now,
          });
        } catch (err) {
          console.warn('[Meta Social] Error registrando interacción de comentario en Firestore:', err);
        }
      }
    }
  }

  return NextResponse.json({ status: 'success' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return await handleMetaSocialWebhookPayload(body);
  } catch (error: any) {
    console.error('[Meta Social Webhook] Error procesando evento:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
