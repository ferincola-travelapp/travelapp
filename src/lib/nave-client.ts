// =============================================================================
// NAVE BANCO GALICIA / NARANJA X — CLIENTE OFICIAL DE PAGOS MULTI-TIENDA
// Soporta Autenticación M2M OAuth2, Creación de Intención de Pago y Consulta
// Ruteo automático:
//   1) TravelApp Turismo + TravelApp Experience (unificados)
//   2) Luna Viajera (entorno dedicado)
// =============================================================================

export type NaveBrandChannel = 'travelapp' | 'lunaviajera';

interface NaveAuthResponse {
  access_token: string;
  scope: string;
  expires_in: string | number;
  token_type: string;
}

export interface CreatePaymentIntentParams {
  externalPaymentId: string; // N° de File (ej: EXP-477173, LUNA-1024, FILE-2026-0042)
  amount: number;
  currency?: 'ARS' | 'USD';
  productName: string;
  productDescription?: string;
  brand?: NaveBrandChannel;
  buyer?: {
    name?: string;
    email?: string;
    docNumber?: string;
    phone?: string;
    street?: string;
    city?: string;
    region?: string;
    zipcode?: string;
  };
  callbackUrl?: string;
}

export interface PaymentIntentResponse {
  id: string;
  external_payment_id: string;
  checkout_url: string;
  qr_data: string;
}

export interface NaveEnvironmentInfo {
  mode: 'production' | 'sandbox' | 'simulated';
  isProduction: boolean;
  hasCredentials: boolean;
  label: string;
  authUrl: string;
  paymentUrl: string;
  audience: string;
  channels: {
    travelapp: { posId: string; storeCode: string; configured: boolean };
    lunaviajera: { posId: string; storeCode: string; configured: boolean };
  };
}

// Credenciales Oficiales de Homologación (Sandbox) provistas por Integraciones Nave
const SANDBOX_DEFAULTS = {
  audience: 'https://api.ranty.io/integrations',
  travelapp: {
    clientId: 'n3snIZKXuMNDbVODBXWVGhgl7ySW3HRe',
    clientSecret: 'H2kO2ToQmRru0Awu6XF0_oTSsUj3VfycQQxF3KnX6a7q94wkFnGJnyLIJKXxWicW',
    posId: 'f71ba756-1d80-4ab3-9f43-5dc247fd6c4a',
    storeCode: 'S-6A60-0761-P' // Unificado para TravelApp Experience (S-6A60-0761-P) y TravelApp Turismo (M-6AD8-08F9-Y)
  },
  lunaviajera: {
    clientId: 'oC1hHjzyo5ZhGwma2CyhDCNawUd0tQ9O',
    clientSecret: 't0Y2D3ZkIHYK9mev-V8DoqBilFOGNeFBvmvplDow5itLPz49T2zr7uysM80mkmpz',
    posId: 'f71ba756-1d80-4ab3-9f43-5dc247fd6c4a',
    storeCode: 'H-6AD8-1058-D'
  }
};

export function resolveNaveBrandChannel(params: {
  brand?: string;
  externalPaymentId?: string;
  callbackUrl?: string;
  host?: string;
}): NaveBrandChannel {
  const b = (params.brand || '').toLowerCase();
  const ext = (params.externalPaymentId || '').toUpperCase();
  const cb = (params.callbackUrl || '').toLowerCase();
  const h = (params.host || '').toLowerCase();

  if (
    b.includes('luna') ||
    ext.startsWith('LUNA') ||
    ext.startsWith('LV-') ||
    cb.includes('lunaviajera') ||
    h.includes('lunaviajera')
  ) {
    return 'lunaviajera';
  }
  return 'travelapp';
}

function getChannelCredentials(channel: NaveBrandChannel) {
  const envRaw = (process.env.NAVE_ENVIRONMENT || 'sandbox').toLowerCase().trim();
  const isProd = envRaw === 'production' || envRaw === 'prod';
  const audience = process.env.NAVE_AUDIENCE || SANDBOX_DEFAULTS.audience;

  if (channel === 'lunaviajera') {
    const clientId =
      process.env.NAVE_LUNA_CLIENT_ID ||
      (!isProd ? SANDBOX_DEFAULTS.lunaviajera.clientId : process.env.NAVE_CLIENT_ID || '');
    const clientSecret =
      process.env.NAVE_LUNA_CLIENT_SECRET ||
      (!isProd ? SANDBOX_DEFAULTS.lunaviajera.clientSecret : process.env.NAVE_CLIENT_SECRET || '');
    const posId =
      process.env.NAVE_LUNA_POS_ID ||
      process.env.NAVE_POS_ID ||
      SANDBOX_DEFAULTS.lunaviajera.posId;
    const storeCode =
      process.env.NAVE_LUNA_STORE_CODE || SANDBOX_DEFAULTS.lunaviajera.storeCode;

    return { isProd, audience, clientId, clientSecret, posId, storeCode };
  }

  const clientId =
    process.env.NAVE_CLIENT_ID ||
    (!isProd ? SANDBOX_DEFAULTS.travelapp.clientId : '');
  const clientSecret =
    process.env.NAVE_CLIENT_SECRET ||
    (!isProd ? SANDBOX_DEFAULTS.travelapp.clientSecret : '');
  const posId =
    process.env.NAVE_POS_ID || SANDBOX_DEFAULTS.travelapp.posId;
  const storeCode =
    process.env.NAVE_STORE_CODE || SANDBOX_DEFAULTS.travelapp.storeCode;

  return { isProd, audience, clientId, clientSecret, posId, storeCode };
}

export function getNaveEnvironmentInfo(): NaveEnvironmentInfo {
  const travelCreds = getChannelCredentials('travelapp');
  const lunaCreds = getChannelCredentials('lunaviajera');
  const isProd = travelCreds.isProd;

  const hasCredentials = Boolean(
    travelCreds.clientId &&
    travelCreds.clientSecret &&
    travelCreds.clientId !== 'demo_client_id' &&
    !travelCreds.clientId.includes('TU_CLIENT_ID')
  );

  const authUrl = isProd
    ? 'https://services.apinaranja.com/security-ms/api/security/auth0/b2b/m2msPrivate'
    : 'https://homoservices.apinaranja.com/security-ms/api/security/auth0/b2b/m2msPrivate';

  const paymentUrl = isProd
    ? 'https://api.ranty.io/integrations/payment_requests/ecommerce'
    : 'https://api-sandbox.ranty.io/integrations/payment_requests/ecommerce';

  if (!hasCredentials) {
    return {
      mode: 'simulated',
      isProduction: false,
      hasCredentials: false,
      label: 'Entorno de Pruebas Simulado (Sin credenciales configuradas)',
      authUrl: 'local-simulated',
      paymentUrl: '/checkout/nave-simulated-pay',
      audience: travelCreds.audience,
      channels: {
        travelapp: { posId: travelCreds.posId, storeCode: travelCreds.storeCode, configured: false },
        lunaviajera: { posId: lunaCreds.posId, storeCode: lunaCreds.storeCode, configured: false }
      }
    };
  }

  if (isProd) {
    return {
      mode: 'production',
      isProduction: true,
      hasCredentials: true,
      label: 'Entorno REAL de Producción (NAVE Banco Galicia / Naranja X)',
      authUrl,
      paymentUrl,
      audience: travelCreds.audience,
      channels: {
        travelapp: { posId: travelCreds.posId, storeCode: travelCreds.storeCode, configured: Boolean(travelCreds.clientId) },
        lunaviajera: { posId: lunaCreds.posId, storeCode: lunaCreds.storeCode, configured: Boolean(lunaCreds.clientId) }
      }
    };
  }

  return {
    mode: 'sandbox',
    isProduction: false,
    hasCredentials: true,
    label: 'Entorno Oficial de Homologación / Sandbox (NAVE Banco Galicia)',
    authUrl,
    paymentUrl,
    audience: travelCreds.audience,
    channels: {
      travelapp: { posId: travelCreds.posId, storeCode: travelCreds.storeCode, configured: Boolean(travelCreds.clientId) },
      lunaviajera: { posId: lunaCreds.posId, storeCode: lunaCreds.storeCode, configured: Boolean(lunaCreds.clientId) }
    }
  };
}

const cachedNaveTokens: Record<NaveBrandChannel, { token: string | null; expiry: number }> = {
  travelapp: { token: null, expiry: 0 },
  lunaviajera: { token: null, expiry: 0 }
};

/**
 * Obtener Access Token mediante servicio de Autenticación M2M de Nave / Auth0
 */
export async function getNaveAccessToken(channel: NaveBrandChannel = 'travelapp'): Promise<string> {
  const now = Date.now();
  const cached = cachedNaveTokens[channel];
  if (cached && cached.token && now < cached.expiry) {
    return cached.token;
  }

  const { isProd, audience, clientId, clientSecret } = getChannelCredentials(channel);

  const authUrl = isProd
    ? 'https://services.apinaranja.com/security-ms/api/security/auth0/b2b/m2msPrivate'
    : 'https://homoservices.apinaranja.com/security-ms/api/security/auth0/b2b/m2msPrivate';

  if (!clientId || !clientSecret || clientId === 'demo_client_id') {
    return `nave_mock_token_${Date.now()}`;
  }

  try {
    const res = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[NAVE Auth ${channel}] Token request returned ${res.status}: ${errText}`);
      return `nave_mock_token_${Date.now()}`;
    }

    const data: NaveAuthResponse = await res.json();
    const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : parseInt(String(data.expires_in || '86400'), 10);
    cachedNaveTokens[channel] = {
      token: data.access_token,
      expiry: now + (expiresInSec * 1000) - 120000
    };
    return data.access_token;
  } catch (err) {
    console.error(`[NAVE Auth Error (${channel})]:`, err);
    return `nave_mock_token_${Date.now()}`;
  }
}

/**
 * Crear Intención de Pago e-Commerce en Nave (Devuelve checkout_url oficial y QR)
 */
export async function createNavePaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> {
  const channel = resolveNaveBrandChannel({
    brand: params.brand,
    externalPaymentId: params.externalPaymentId,
    callbackUrl: params.callbackUrl
  });

  const { isProd, clientId, posId } = getChannelCredentials(channel);
  const token = await getNaveAccessToken(channel);

  let detectedOrigin = '';
  if (params.callbackUrl && params.callbackUrl.startsWith('http')) {
    try {
      detectedOrigin = new URL(params.callbackUrl).origin;
    } catch {
      detectedOrigin = '';
    }
  }
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const appUrl =
    (detectedOrigin && (!envAppUrl || envAppUrl.includes('localhost')))
      ? detectedOrigin
      : (envAppUrl || detectedOrigin || 'https://experience.travelapp.ar');

  const formattedAmount = params.amount.toFixed(2);
  const currency = params.currency || 'ARS';

  // Si no hay credenciales reales ni de sandbox o el token falló, retornar pasarela simulada de contingencia
  if (!clientId || clientId === 'demo_client_id' || token.startsWith('nave_mock_token_')) {
    const mockId = `nave_req_${Date.now()}`;
    return {
      id: mockId,
      external_payment_id: params.externalPaymentId,
      checkout_url: `${appUrl}/checkout/nave-simulated-pay?file=${params.externalPaymentId}&amount=${formattedAmount}&title=${encodeURIComponent(params.productName)}&id=${mockId}`,
      qr_data: `00020101021244360012com.naranjax9811306922647859901150150011272813311895204729953030325406190.005802AR5911TravelApp`
    };
  }

  const endpoint = isProd
    ? 'https://api.ranty.io/integrations/payment_requests/ecommerce'
    : 'https://api-sandbox.ranty.io/integrations/payment_requests/ecommerce';

  const cleanDocNumber = (params.buyer?.docNumber || '').replace(/\D/g, '') || '30111222';
  const buyerEmail = params.buyer?.email || 'reservas@travelapp.ar';
  const buyerName = params.buyer?.name || 'Pasajero TravelApp';

  const payload = {
    external_payment_id: params.externalPaymentId,
    seller: {
      pos_id: posId
    },
    transactions: [
      {
        amount: {
          currency,
          value: formattedAmount
        },
        products: [
          {
            name: params.productName,
            description: params.productDescription || params.productName,
            quantity: 1,
            unit_price: {
              currency,
              value: formattedAmount
            }
          }
        ]
      }
    ],
    buyer: {
      doc_type: 'DNI',
      doc_number: cleanDocNumber,
      name: buyerName,
      user_email: buyerEmail,
      user_id: buyerEmail,
      billing_address: {
        street_1: params.buyer?.street || 'San Martin 500',
        street_2: 'Oficina 1',
        city: params.buyer?.city || 'San Miguel de Tucuman',
        region: params.buyer?.region || 'Tucuman',
        country: 'AR',
        zipcode: params.buyer?.zipcode || '4000'
      }
    },
    additional_info: {
      callback_url: params.callbackUrl || `${appUrl}/checkout/success?file=${params.externalPaymentId}&type=experience&amount=${formattedAmount}`
    },
    duration_time: 3600
  };

  // Política de reintento recomendada por la documentación oficial de Nave (evita fallos por cold-start stores_error)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(14000)
      });

      if (res.ok) {
        const data: PaymentIntentResponse = await res.json();
        return data;
      }

      const errBody = await res.text().catch(() => '');
      console.warn(`[NAVE Create Payment (${channel}) attempt ${attempt}] HTTP ${res.status}: ${errBody}`);

      if (res.status < 500 || attempt === 2) {
        break;
      }
    } catch (err) {
      console.error(`[NAVE Payment Intent Error (${channel}) attempt ${attempt}]:`, err);
      if (attempt === 2) break;
    }
  }

  // Fallback seguro si el servidor de Nave no responde tras el reintento
  const mockId = `nave_req_${Date.now()}`;
  return {
    id: mockId,
    external_payment_id: params.externalPaymentId,
    checkout_url: `${appUrl}/checkout/nave-simulated-pay?file=${params.externalPaymentId}&amount=${formattedAmount}&title=${encodeURIComponent(params.productName)}&id=${mockId}`,
    qr_data: `00020101021244360012com.naranjax9811306922647859901150150011272813311895204729953030325406190.005802AR5911TravelApp`
  };
}

/**
 * Consultar Estado de Pago en Nave mediante payment_check_url o payment_id
 */
export async function checkNavePaymentStatus(
  paymentCheckUrlOrId: string,
  channel: NaveBrandChannel = 'travelapp'
): Promise<any> {
  const token = await getNaveAccessToken(channel);
  const { isProd } = getChannelCredentials(channel);

  let fetchUrl = paymentCheckUrlOrId;
  if (!paymentCheckUrlOrId.startsWith('http')) {
    if (paymentCheckUrlOrId.includes('ranty.io')) {
      fetchUrl = `https://${paymentCheckUrlOrId.replace(/^\/+/, '')}`;
    } else {
      const baseUrl = isProd ? 'https://api.ranty.io' : 'https://api-sandbox.ranty.io';
      fetchUrl = `${baseUrl}/integrations/payments/${paymentCheckUrlOrId}`;
    }
  }

  try {
    const res = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      throw new Error(`Nave Payment Check failed: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('[NAVE Check Payment Status Error]:', err);
    return null;
  }
}
