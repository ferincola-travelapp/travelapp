// =============================================================================
// DRIVER PANIC SOS PUSH TO SUPERVISOR
// POST /api/safety/driver-panic-push
// Envía notificación Push de prioridad máxima al Supervisor asignado al chofer
// (y admins maestros) cuando el conductor activa el Botón de Pánico SOS.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { adminAwareGetDoc, adminAwareGetDocs } from '@/lib/firebase-admin';
import { sendExpoPushNotifications } from '@/lib/broadcast-dispatcher';

export async function POST(req: NextRequest) {
  try {
    const authRes = await requireAuth(req);
    if (authRes.error) return authRes.error;

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

    const body = await req.json();
    const {
      alertId,
      driverId,
      driverName,
      driverPhone,
      supervisorId,
      supervisorCode,
      vehicleInfo,
      vehiclePlate,
      driverLocation,
    } = body;

    if (!alertId || !driverId) {
      return NextResponse.json({ error: 'Missing alertId or driverId' }, { status: 400 });
    }

    const tokens: string[] = [];

    if (supervisorId) {
      const [supSnap, usrSnap] = await Promise.all([
        adminAwareGetDoc('supervisors', supervisorId, bearerToken).catch(() => ({ exists: false, data: () => null })),
        adminAwareGetDoc('users', supervisorId, bearerToken).catch(() => ({ exists: false, data: () => null })),
      ]);
      if (supSnap.exists) {
        const s = supSnap.data() || {};
        if (s.expoPushToken) tokens.push(s.expoPushToken);
        if (s.pushToken) tokens.push(s.pushToken);
      }
      if (usrSnap.exists) {
        const u = usrSnap.data() || {};
        if (u.expoPushToken) tokens.push(u.expoPushToken);
        if (u.pushToken) tokens.push(u.pushToken);
      }
    }

    if (supervisorCode) {
      const matchedSups = await adminAwareGetDocs(
        'users',
        { where: [['supervisorCode', '==', String(supervisorCode).toUpperCase().trim()]] },
        bearerToken
      ).catch(() => ({ empty: true, docs: [] }));
      matchedSups.docs.forEach((d) => {
        const u = d.data() || {};
        if (u.expoPushToken) tokens.push(u.expoPushToken);
        if (u.pushToken) tokens.push(u.pushToken);
      });
    }

    const uniqueTokens = Array.from(new Set(tokens));
    const locSuffix = driverLocation?.latitude
      ? ` GPS: ${Number(driverLocation.latitude).toFixed(4)}, ${Number(driverLocation.longitude).toFixed(4)}`
      : '';

    const pushRes =
      uniqueTokens.length > 0
        ? await sendExpoPushNotifications({
            tokens: uniqueTokens,
            title: '🚨 BOTÓN DE PÁNICO · CONDUCTOR EN EMERGENCIA',
            message: `${driverName || 'Conductor'}${driverPhone ? ` (${driverPhone})` : ''} activó SOS en ${vehicleInfo || 'vehículo'} (${vehiclePlate || 'S/D'}).${locSuffix}`,
            soundAlert: 'driver_alert',
            category: 'safety',
            data: {
              category: 'safety',
              type: 'driver_panic',
              alertId,
              driverId,
              driverName,
              driverPhone,
              supervisorId,
              supervisorCode,
              driverLocation,
            },
          })
        : { sent: 0, failed: 0 };

    return NextResponse.json({
      success: true,
      tokensTargeted: uniqueTokens.length,
      ...pushRes,
    });
  } catch (error: any) {
    console.error('[driver-panic-push] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
