// =============================================================================
// PROCESS SCHEDULED BROADCASTS (Google Cloud Scheduler + Manual Dashboard)
// GET / POST /api/broadcast/process-scheduled
// Ejecuta campañas programadas cuya fecha/hora ya venció.
// Autenticación:
//   - Google Cloud Scheduler: header `x-cron-secret: <CRON_SECRET>` o
//     `Authorization: Bearer <CRON_SECRET>`
//   - Operador desde Dashboard: `Authorization: Bearer <Firebase ID Token>`
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { BroadcastCampaign } from '@/types/messaging';
import { requireAuth } from '@/lib/api-auth';
import {
  getAdminDb,
  adminAwareGetDocs,
  adminAwareUpdateDoc,
} from '@/lib/firebase-admin';
import { executeBroadcastDelivery } from '@/lib/broadcast-dispatcher';

async function authorizeRequest(
  req: NextRequest
): Promise<{ ok: true; bearerToken?: string } | { ok: false; response: NextResponse }> {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (cronSecret && (headerSecret === cronSecret || (bearerToken && bearerToken === cronSecret))) {
    return { ok: true };
  }

  const authRes = await requireAuth(req);
  if (authRes.error) {
    return { ok: false, response: authRes.error };
  }

  return { ok: true, bearerToken: bearerToken || undefined };
}

async function runScheduledProcessor(bearerToken?: string) {
  const now = Date.now();
  const snap = await adminAwareGetDocs(
    'broadcastCampaigns',
    { where: [['status', '==', 'scheduled']] },
    bearerToken
  );

  const due = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<BroadcastCampaign, 'id'>) }))
    .filter((c) => typeof c.scheduledAt === 'number' && c.scheduledAt <= now);

  const processed: { id: string; title: string; targeted: number; expoPushSent: number }[] = [];

  for (const camp of due) {
    try {
      await adminAwareUpdateDoc(
        'broadcastCampaigns',
        camp.id,
        { status: 'sending' },
        bearerToken
      );
      const res = await executeBroadcastDelivery(
        camp.id,
        {
          title: camp.title,
          message: camp.message,
          audience: camp.audience,
          channel: camp.channel,
          soundAlert: camp.soundAlert,
          category: camp.category,
          specificIds: camp.specificIds,
          filters: camp.filters,
          inAppPopup: camp.inAppPopup ?? true,
          ctaLabel: camp.ctaLabel,
          ctaTab: camp.ctaTab,
          createdBy: camp.createdBy,
        },
        bearerToken
      );
      processed.push({
        id: camp.id,
        title: camp.title,
        targeted: res.stats.targeted,
        expoPushSent: res.expoPushSent,
      });
    } catch (err) {
      console.error('[Process Scheduled Broadcast] Failed for', camp.id, err);
      await adminAwareUpdateDoc(
        'broadcastCampaigns',
        camp.id,
        { status: 'failed' },
        bearerToken
      ).catch(() => {});
    }
  }

  return NextResponse.json({
    success: true,
    checkedAt: now,
    usingAdminSdk: Boolean(getAdminDb()),
    dueCount: due.length,
    processed,
  });
}

export async function GET(req: NextRequest) {
  try {
    const authCheck = await authorizeRequest(req);
    if (!authCheck.ok) return authCheck.response;
    return await runScheduledProcessor(authCheck.bearerToken);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await authorizeRequest(req);
    if (!authCheck.ok) return authCheck.response;
    return await runScheduledProcessor(authCheck.bearerToken);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
