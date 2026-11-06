// =============================================================================
// EXTERNAL SERVICE PROVIDERS GATEWAY — TravelApp Ecosystem
// Permite a Travis consultar en tiempo real las APIs de proveedores externos:
// - Vuelos & Pasajes Aéreos
// - Hoteles & Alojamientos
// - Micros de Larga Distancia (Plataforma 10 / Central de Pasajes)
// - Operadores Turísticos Asociados (Tours / Excursiones)
// - Flotas de Traslados Regionales & Transfers Aeroportuarios
// =============================================================================

import { serverGetDocs } from '@/lib/firestore-server';

export interface ProviderSearchResult {
  providerName: string;
  category: 'vuelos' | 'hoteles' | 'micros' | 'tours' | 'traslados' | 'general';
  title: string;
  description: string;
  price?: number;
  currency?: string;
  availability?: string;
  sourceUrl?: string;
  metadata?: Record<string, any>;
}

export interface ExternalProviderConfig {
  id: string;
  name: string;
  category: 'vuelos' | 'hoteles' | 'micros' | 'tours' | 'traslados';
  apiEndpoint?: string;
  apiKey?: string;
  isActive: boolean;
  notes?: string;
}

/**
 * Consulta proveedores externos en base al mensaje del usuario o parámetros de búsqueda.
 * Lee configuraciones activas desde la colección 'service_providers' en Firestore
 * y consulta sus respectivos endpoints si están configurados.
 */
export async function queryExternalServiceProviders(
  userQuery: string,
  categoryHint?: string
): Promise<ProviderSearchResult[]> {
  const results: ProviderSearchResult[] = [];
  const normalizedQuery = userQuery.toLowerCase();

  try {
    // 1. Obtener proveedores registrados en Firestore
    const providersSnap = await serverGetDocs('service_providers', {
      where: [['isActive', '==', true]],
      limit: 10
    });

    const activeProviders: ExternalProviderConfig[] = providersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExternalProviderConfig[];

    // 2. Si hay proveedores activos con APIs configuradas, consultarlos en paralelo
    for (const provider of activeProviders) {
      if (!provider.apiEndpoint) continue;

      try {
        const res = await fetch(provider.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {})
          },
          body: JSON.stringify({
            query: userQuery,
            category: categoryHint || provider.category
          }),
          // Timeout de 3 segundos para no demorar la respuesta de Travis
          signal: AbortSignal.timeout(3000)
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            data.items.slice(0, 3).forEach((item: any) => {
              results.push({
                providerName: provider.name,
                category: provider.category,
                title: item.title || item.name || 'Servicio Disponible',
                description: item.description || item.detail || '',
                price: item.price,
                currency: item.currency || 'ARS',
                availability: item.availability || 'Inmediata',
                sourceUrl: item.url
              });
            });
          }
        }
      } catch (provErr) {
        console.warn(`[Providers Gateway] Error querying provider ${provider.name}:`, provErr);
      }
    }
  } catch (err) {
    console.warn('[Providers Gateway] Error loading providers from Firestore:', err);
  }

  // 3. Fallbacks contextuales para proveedores de servicios asociados a TravelApp
  if (normalizedQuery.includes('vuelo') || normalizedQuery.includes('avion') || normalizedQuery.includes('aerolinea')) {
    results.push({
      providerName: 'Alianza Aérea TravelApp',
      category: 'vuelos',
      title: 'Conexiones Aéreas Aeropuerto Tucumán (TUC - Benjamín Matienzo)',
      description: 'Vuelos regulares diarios a Buenos Aires (AEP/EZE), Córdoba y conexiones nacionales. Travis gestiona la cotización y transfer coordinado con TravelCab.',
      availability: 'Diaria'
    });
  }

  if (
    normalizedQuery.includes('micro') ||
    normalizedQuery.includes('colectivo') ||
    normalizedQuery.includes('omnibus') ||
    normalizedQuery.includes('bus') ||
    normalizedQuery.includes('pasaje') ||
    normalizedQuery.includes('boleto') ||
    normalizedQuery.includes('central de pasajes') ||
    normalizedQuery.includes('terminal')
  ) {
    results.push({
      providerName: 'Boletería Oficial TravelApp · Central de Pasajes (Agencia CAG)',
      category: 'micros',
      title: 'Emisión Oficial de Pasajes en Micro a +1.600 Destinos Nacionales y Regionales (NOA)',
      description:
        'Comercializamos pasajes oficiales de ómnibus en todo el país y el Norte Argentino (Tucumán, Tafí del Valle, Salta, Jujuy, Cafayate, Purmamarca, Córdoba, Buenos Aires, Mendoza, Bariloche y más) en categorías Semi-Cama, Cama Ejecutivo y Cama Suite. El pasajero cotiza y emite su E-Ticket en vivo desde nuestra página dedicada /buses (travelapp.ar/buses, experience.travelapp.ar/buses o lunaviajera.travelapp.ar/buses). Además, una vez emitido el boleto, puede cargar su N.º de Boleto en el Validador de /buses para sumar Puntos TravelApp Rewards y reservar su traslado seguro en TravelCab hacia o desde la Terminal de Ómnibus.',
      availability: 'Emisión online inmediata 24/7 en /buses',
      sourceUrl: 'https://travelapp.ar/buses'
    });
  }

  return results;
}

/**
 * Formatea los resultados de proveedores para inyectarlos en el prompt cognitivo de Gemini
 */
export function formatExternalProvidersForPrompt(results: ProviderSearchResult[]): string {
  if (!results || results.length === 0) return '';

  let out = '\n\n=== INFORMACIÓN DE PROVEEDORES EXTERNOS Y SERVICIOS ASOCIADOS ===\n';
  results.forEach(r => {
    out += `• [${r.providerName.toUpperCase()} - ${r.category.toUpperCase()}]: ${r.title}\n`;
    out += `  Detalle: ${r.description}\n`;
    if (r.price) out += `  Tarifa referencial: ${r.currency || 'ARS'} $${r.price}\n`;
    if (r.availability) out += `  Disponibilidad: ${r.availability}\n`;
  });
  out += 'Travis puede utilizar esta información de proveedores asociados para complementar y enriquecer sus respuestas al usuario.\n';
  return out;
}
