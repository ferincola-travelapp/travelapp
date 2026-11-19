// =============================================================================
// BROADCAST — Envío de campañas de mensajería segmentadas
// Soporta todos, pasajeros, conductores, clientes específicos o filtros
// avanzados (región/provincia/ciudad, sexo, foto de perfil, viajes, puntos).
//
// POST /api/broadcast
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { BroadcastCampaign } from '@/types/messaging';
import { requireAuth } from '@/lib/api-auth';
import { adminAwareAddDoc } from '@/lib/firebase-admin';
import {
  BroadcastInput,
  executeBroadcastDelivery,
  resolveAudienceRecipients,
} from '@/lib/broadcast-dispatcher';

export async function POST(req: NextRequest) {
  try {
    const authRes = await requireAuth(req);
    if (authRes.error) return authRes.error;

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

    const body = (await req.json()) as BroadcastInput & { previewOnly?: boolean };
    const {
      title,
      message,
      audience,
      channel = 'push',
      soundAlert = 'default',
      category = 'general',
      specificIds = [],
      filters,
      inAppPopup = true,
      ctaLabel,
      ctaTab,
      createdBy = authRes.user.email || authRes.user.uid || 'admin',
      scheduledAt,
      previewOnly = false,
    } = body;

    if (previewOnly) {
      const resolved = await resolveAudienceRecipients(
        audience,
        specificIds,
        filters,
        bearerToken
      );
      return NextResponse.json({
        success: true,
        targetedCount: resolved.targetedCount,
        pushTokensCount: resolved.pushTokens.length,
      });
    }

    if (!title || !message || !audience) {
      return NextResponse.json(
        { error: 'Missing required fields: title, message, audience' },
        { status: 400 }
      );
    }

    const isScheduled = !!scheduledAt && scheduledAt > Date.now();
    const initialEstimate = isScheduled
      ? (await resolveAudienceRecipients(audience, specificIds, filters, bearerToken)).targetedCount
      : 0;

    const campaign: Omit<BroadcastCampaign, 'id'> = {
      title,
      message,
      audience,
      ...(audience === 'specific' ? { specificIds } : {}),
      ...(audience === 'segmented' && filters ? { filters } : {}),
      inAppPopup,
      ...(ctaLabel ? { ctaLabel } : {}),
      ...(ctaTab ? { ctaTab } : {}),
      channel,
      soundAlert,
      category,
      status: isScheduled ? 'scheduled' : 'sending',
      ...(scheduledAt ? { scheduledAt } : {}),
      ...(!isScheduled ? { sentAt: Date.now() } : {}),
      stats: { targeted: initialEstimate, sent: 0, delivered: 0, read: 0 },
      createdBy,
      createdAt: Date.now(),
    };

    const campaignDoc = await adminAwareAddDoc('broadcastCampaigns', campaign, bearerToken);

    if (isScheduled) {
      return NextResponse.json({
        success: true,
        campaignId: campaignDoc.id,
        scheduled: true,
        stats: campaign.stats,
      });
    }

    const result = await executeBroadcastDelivery(
      campaignDoc.id,
      {
        title,
        message,
        audience,
        channel,
        soundAlert,
        category,
        specificIds,
        filters,
        inAppPopup,
        ctaLabel,
        ctaTab,
        createdBy,
      },
      bearerToken
    );

    return NextResponse.json({
      success: true,
      campaignId: campaignDoc.id,
      stats: result.stats,
      expoPushSent: result.expoPushSent,
      manyChatEnabled: result.manyChatEnabled,
    });
  } catch (error: any) {
    console.error('[Broadcast API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', detail: error.message },
      { status: 500 }
    );
  }
}
