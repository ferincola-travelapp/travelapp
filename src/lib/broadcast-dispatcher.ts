import {
  adminAwareGetDoc,
  adminAwareGetDocs,
  adminAwareAddDoc,
  adminAwareUpdateDoc,
} from '@/lib/firebase-admin';
import {
  BroadcastAudience,
  BroadcastCampaign,
  BroadcastFilters,
  MessageChannel,
  NotificationAudioType,
  NotificationCategory,
} from '@/types/messaging';

export interface BroadcastInput {
  title: string;
  message: string;
  audience: BroadcastAudience;
  channel: MessageChannel | 'both';
  soundAlert?: NotificationAudioType;
  category?: NotificationCategory;
  specificIds?: string[];
  filters?: BroadcastFilters;
  inAppPopup?: boolean;
  ctaLabel?: string;
  ctaTab?: string;
  createdBy?: string;
  scheduledAt?: number;
}

function normStr(val: unknown): string {
  return String(val || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesFilters(data: Record<string, any>, filters?: BroadcastFilters): boolean {
  if (!filters) return true;

  if (filters.province && filters.province.trim()) {
    const targetProv = normStr(filters.province);
    const userProv = normStr(data.address?.province || data.province || data.region);
    if (!userProv.includes(targetProv)) return false;
  }

  if (filters.city && filters.city.trim()) {
    const targetCity = normStr(filters.city);
    const userCity = normStr(data.address?.city || data.city);
    if (!userCity.includes(targetCity)) return false;
  }

  if (filters.region && filters.region.trim()) {
    const targetReg = normStr(filters.region);
    const haystack = normStr(
      `${data.address?.province || ''} ${data.address?.city || ''} ${data.region || ''} ${data.city || ''}`
    );
    if (!haystack.includes(targetReg)) return false;
  }

  if (filters.gender && filters.gender !== 'all') {
    if (String(data.gender || '').toUpperCase() !== filters.gender) return false;
  }

  if (filters.hasPhoto === 'with_photo') {
    if (!data.photoURL && !data.photoUrl) return false;
  } else if (filters.hasPhoto === 'without_photo') {
    if (data.photoURL || data.photoUrl) return false;
  }

  if (filters.profileCompleted === 'complete') {
    if (!data.profileCompleted && !data.document?.number) return false;
  } else if (filters.profileCompleted === 'incomplete') {
    if (data.profileCompleted || data.document?.number) return false;
  }

  if (typeof filters.minTrips === 'number' && filters.minTrips > 0) {
    if (Number(data.totalTrips ?? 0) < filters.minTrips) return false;
  }

  if (typeof filters.minPoints === 'number' && filters.minPoints > 0) {
    if (Number(data.rewardsPoints ?? 0) < filters.minPoints) return false;
  }

  return true;
}

function collectTokens(data: Record<string, any>, out: string[]) {
  if (data.pushToken && typeof data.pushToken === 'string') out.push(data.pushToken);
  if (data.expoPushToken && typeof data.expoPushToken === 'string' && data.expoPushToken !== data.pushToken) {
    out.push(data.expoPushToken);
  }
}

export async function resolveAudienceRecipients(
  audience: BroadcastAudience,
  specificIds: string[] = [],
  filters?: BroadcastFilters,
  authToken?: string
): Promise<{
  pushTokens: string[];
  targetUserIds: string[];
  manyChatSubscriberIds: string[];
  targetedCount: number;
}> {
  const pushTokens: string[] = [];
  const targetUserIds: string[] = [];
  let manyChatSubscriberIds: string[] = [];
  let targetedCount = 0;

  if (audience === 'specific' && specificIds.length > 0) {
    manyChatSubscriberIds = specificIds;
    targetedCount = specificIds.length;
    targetUserIds.push(...specificIds);

    for (const id of specificIds) {
      try {
        const uDoc = await adminAwareGetDoc('users', id, authToken);
        if (uDoc.exists) collectTokens(uDoc.data() || {}, pushTokens);
        const dDoc = await adminAwareGetDoc('drivers', id, authToken);
        if (dDoc.exists) collectTokens(dDoc.data() || {}, pushTokens);
      } catch (err) {
        console.warn('[Broadcast] Error fetching token for specific id:', id, err);
      }
    }
    return { pushTokens, targetUserIds, manyChatSubscriberIds, targetedCount };
  }

  try {
    if (audience === 'all' || audience === 'passengers' || audience === 'segmented') {
      const uSnap = await adminAwareGetDocs('users', {}, authToken);
      uSnap.docs.forEach((d) => {
        const data = d.data() || {};
        if (audience === 'segmented' && !matchesFilters(data, filters)) return;
        targetedCount++;
        targetUserIds.push(d.id);
        collectTokens(data, pushTokens);
      });
    }

    if (audience === 'all' || audience === 'drivers') {
      const dSnap = await adminAwareGetDocs('drivers', {}, authToken);
      dSnap.docs.forEach((d) => {
        targetedCount++;
        targetUserIds.push(d.id);
        collectTokens(d.data() || {}, pushTokens);
      });
    }
  } catch (e) {
    console.warn('[Broadcast] Error querying users/drivers:', e);
  }

  // ManyChat subscribers for omnichannel reach when not strictly segmented
  if (audience !== 'segmented') {
    try {
      const constraints: { where?: [string, any, any][] } = {};
      if (audience === 'all') constraints.where = [['status', '!=', 'closed']];
      else if (audience === 'passengers') constraints.where = [['type', '==', 'customer_support']];
      else if (audience === 'drivers') constraints.where = [['type', '==', 'driver_passenger']];

      const convsSnap = await adminAwareGetDocs('conversations', constraints, authToken);
      const seenIds = new Set<string>();
      convsSnap.docs.forEach((d) => {
        const subscriberId = d.data()?.manyChatSubscriberId;
        if (subscriberId && !seenIds.has(subscriberId)) {
          seenIds.add(subscriberId);
          manyChatSubscriberIds.push(subscriberId);
        }
      });
    } catch (err) {
      console.warn('[Broadcast] ManyChat convs query warning:', err);
    }
  }

  return { pushTokens, targetUserIds, manyChatSubscriberIds, targetedCount };
}

export async function sendExpoPushNotifications({
  tokens,
  title,
  message,
  soundAlert = 'default',
  category = 'general',
  data = {},
}: {
  tokens: string[];
  title: string;
  message: string;
  soundAlert?: string;
  category?: string;
  data?: Record<string, any>;
}): Promise<{ sent: number; failed: number }> {
  const validTokens = Array.from(new Set(tokens)).filter(
    (t) => typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))
  );

  if (validTokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < validTokens.length; i += 100) {
    const batch = validTokens.slice(i, i + 100);
    const messages = batch.map((to) => ({
      to,
      sound: soundAlert === 'none' ? null : 'default',
      title: title.startsWith('📢') || title.startsWith('🎁') || title.startsWith('⚠️') ? title : `📢 ${title}`,
      body: message,
      data: { ...data, category, soundAlert },
      priority: 'high',
      channelId:
        soundAlert === 'driver_alert'
          ? 'driver_alerts'
          : category === 'safety'
          ? 'safety_alerts'
          : category === 'promo'
          ? 'promos'
          : 'trip_updates',
      _displayInForeground: true,
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      if (response.ok) sent += batch.length;
      else failed += batch.length;
    } catch (e) {
      console.error('[Expo Push Send Error]:', e);
      failed += batch.length;
    }
  }

  return { sent, failed };
}

async function sendViaManyChatBroadcast(
  subscriberIds: string[],
  message: string
): Promise<{ sent: number; failed: number }> {
  const token = process.env.MANYCHAT_API_TOKEN;
  if (!token || token === 'TU_MANYCHAT_API_TOKEN_AQUI') {
    return { sent: 0, failed: subscriberIds.length };
  }

  let sent = 0;
  let failed = 0;

  for (const subscriberId of subscriberIds) {
    try {
      const response = await fetch('https://api.manychat.com/fb/sending/sendContent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          data: {
            version: 'v2',
            content: {
              messages: [{ type: 'text', text: message }],
            },
          },
          message_tag: 'ACCOUNT_UPDATE',
        }),
      });
      if (response.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  return { sent, failed };
}

/**
 * Executes delivery for an existing or freshly created broadcast campaign.
 */
export async function executeBroadcastDelivery(
  campaignId: string,
  input: BroadcastInput,
  authToken?: string
): Promise<{
  stats: BroadcastCampaign['stats'];
  expoPushSent: number;
  manyChatEnabled: boolean;
}> {
  const {
    title,
    message,
    audience,
    channel,
    soundAlert = 'default',
    category = 'general',
    specificIds = [],
    filters,
    inAppPopup = true,
    ctaLabel,
    ctaTab,
  } = input;

  const { pushTokens, targetUserIds, manyChatSubscriberIds, targetedCount } =
    await resolveAudienceRecipients(audience, specificIds, filters, authToken);

  // Create in-app notification document for live pop-ups inside mobile apps
  let pushNotificationDocId = '';
  if (channel === 'push' || channel === 'both' || channel === 'internal') {
    const notifDoc = await adminAwareAddDoc(
      'notifications',
      {
        title: title.startsWith('📢') || title.startsWith('🎁') ? title : `📢 ${title}`,
        message,
        timestamp: Date.now(),
        createdAt: Date.now(),
        read: false,
        type: category === 'promo' ? 'promo' : 'alert',
        soundAlert,
        category,
        broadcastId: campaignId,
        audience,
        inAppPopup,
        ctaLabel: ctaLabel || null,
        ctaTab: ctaTab || null,
        specificIds:
          audience === 'specific'
            ? specificIds
            : audience === 'segmented'
            ? targetUserIds
            : null,
        targetUserId:
          (audience === 'specific' || audience === 'segmented') && targetUserIds.length === 1
            ? targetUserIds[0]
            : null,
      },
      authToken
    );
    pushNotificationDocId = notifDoc.id;
  }

  let expoPushStats = { sent: 0, failed: 0 };
  if ((channel === 'push' || channel === 'both') && pushTokens.length > 0) {
    expoPushStats = await sendExpoPushNotifications({
      tokens: pushTokens,
      title,
      message,
      soundAlert,
      category,
      data: {
        broadcastId: campaignId,
        notificationId: pushNotificationDocId,
        audience,
        category,
        inAppPopup,
        ctaLabel: ctaLabel || '',
        ctaTab: ctaTab || '',
      },
    });
  }

  let manyChatStats = { sent: 0, failed: 0 };
  if ((channel === 'whatsapp' || channel === 'both') && manyChatSubscriberIds.length > 0) {
    manyChatStats = await sendViaManyChatBroadcast(manyChatSubscriberIds, message);
  }

  const finalStats: BroadcastCampaign['stats'] = {
    targeted: targetedCount,
    sent: expoPushStats.sent || manyChatStats.sent || (targetedCount > 0 ? targetedCount : 0),
    delivered: targetedCount,
    read: 0,
  };

  await adminAwareUpdateDoc(
    'broadcastCampaigns',
    campaignId,
    {
      status: 'sent',
      sentAt: Date.now(),
      stats: finalStats,
    },
    authToken
  );

  return {
    stats: finalStats,
    expoPushSent: expoPushStats.sent,
    manyChatEnabled:
      Boolean(process.env.MANYCHAT_API_TOKEN) &&
      process.env.MANYCHAT_API_TOKEN !== 'TU_MANYCHAT_API_TOKEN_AQUI',
  };
}
