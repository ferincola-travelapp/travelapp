// =============================================================================
// DRIVER ASSIGNED PUSH TO PASSENGER
// POST /api/trips/driver-assigned-push
// Disparado automáticamente por la app Conductor al aceptar un viaje para
// enviar el Push Pop en segundo plano con foto de perfil + auto + datos.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { adminAwareGetDoc } from '@/lib/firebase-admin';
import { sendExpoPushNotifications } from '@/lib/broadcast-dispatcher';

function maskPlate(plate?: string, visibleLastChars = 3): string {
  const clean = String(plate || '').replace(/\s+/g, '').toUpperCase();
  if (!clean) return '•••';
  if (clean.length <= visibleLastChars) return clean;
  return `${'•'.repeat(Math.max(2, clean.length - visibleLastChars))}${clean.slice(-visibleLastChars)}`;
}

export async function POST(req: NextRequest) {
  try {
    const authRes = await requireAuth(req);
    if (authRes.error) return authRes.error;

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

    const body = await req.json();
    const {
      tripId,
      passengerId,
      driver,
    } = body as {
      tripId: string;
      passengerId: string;
      driver: {
        id: string;
        name: string;
        plate: string;
        brand?: string;
        vehicleModelName?: string;
        color?: string;
        model?: string;
        rating: string | number;
        totalTrips: number;
        phone?: string;
        avatar?: string;
        carPhoto?: string;
      };
    };

    if (!tripId || !passengerId || !driver) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userSnap = await adminAwareGetDoc('users', passengerId, bearerToken);
    if (!userSnap.exists) {
      return NextResponse.json({ success: true, sent: 0, reason: 'passenger_not_found' });
    }

    const uData = userSnap.data() || {};
    const tokens = Array.from(
      new Set([uData.expoPushToken, uData.pushToken].filter((t): t is string => Boolean(t)))
    );

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: 'no_push_token' });
    }

    const maskedPlate = maskPlate(driver.plate, 3);
    const stars = Number(driver.rating || 5).toFixed(1);
    const vehicleLabel = [driver.brand, driver.vehicleModelName || driver.model, driver.color]
      .filter(Boolean)
      .join(' ');

    const pushRes = await sendExpoPushNotifications({
      tokens,
      title: `🚕 ¡${driver.name} aceptó tu viaje!`,
      message: `⭐ ${stars} (${driver.totalTrips || 0} viajes) · ${vehicleLabel || 'Vehículo habilitado'} · Dominio ${maskedPlate}`,
      soundAlert: 'default',
      category: 'driver_assigned',
      data: {
        category: 'driver_assigned',
        type: 'driver_assigned',
        tripId,
        imageUrl: driver.avatar || driver.carPhoto || undefined,
        driver: {
          ...driver,
          rating: stars,
        },
      },
    });

    return NextResponse.json({ success: true, ...pushRes });
  } catch (error: any) {
    console.error('[driver-assigned-push] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
