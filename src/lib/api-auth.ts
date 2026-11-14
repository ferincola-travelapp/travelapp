import { NextRequest, NextResponse } from 'next/server';

export interface VerifiedUser {
  uid: string;
  email?: string;
}

/**
 * Verifies a Firebase ID token from the `Authorization: Bearer <token>` header.
 * Returns the verified user or a 401 NextResponse.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: VerifiedUser; error?: never } | { user?: never; error: NextResponse }> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'No autorizado: falta token de autenticación (Bearer).' },
        { status: 401 }
      ),
    };
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    return {
      error: NextResponse.json(
        { error: 'No autorizado: token vacío.' },
        { status: 401 }
      ),
    };
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return {
      error: NextResponse.json(
        { error: 'Error de configuración: falta NEXT_PUBLIC_FIREBASE_API_KEY.' },
        { status: 500 }
      ),
    };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) {
      return {
        error: NextResponse.json(
          { error: 'No autorizado: token inválido o expirado.' },
          { status: 401 }
        ),
      };
    }

    const data = await res.json();
    const userRecord = data?.users?.[0];
    if (!userRecord?.localId) {
      return {
        error: NextResponse.json(
          { error: 'No autorizado: usuario no encontrado.' },
          { status: 401 }
        ),
      };
    }

    return {
      user: {
        uid: userRecord.localId,
        email: userRecord.email,
      },
    };
  } catch (err) {
    console.error('[api-auth] Error verificando token:', err);
    return {
      error: NextResponse.json(
        { error: 'Error verificando autenticación.' },
        { status: 500 }
      ),
    };
  }
}
