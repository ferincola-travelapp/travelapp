// =============================================================================
// PERMISOS, UNIDADES DE NEGOCIO Y SECTORES — TravelApp Ecosystem
// =============================================================================

export type OfficialBusinessUnit =
  | 'TravelApp'
  | 'TravelApp Experience'
  | 'TravelApp Rewards'
  | 'TravelCab';

export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer';

export interface BusinessUnitDefinition {
  id: OfficialBusinessUnit;
  label: string;
  subtitle: string;
  badgeClass: string;
  sectors: string[];
}

export const BUSINESS_UNITS_CONFIG: BusinessUnitDefinition[] = [
  {
    id: 'TravelApp',
    label: 'TravelApp',
    subtitle: 'Turismo y Ecosistema',
    badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    sectors: [
      'Recursos Humanos',
      'Operaciones',
      'Atención al Cliente',
      'Soporte',
      'Ayuda',
      'Ventas',
      'Reclamos',
      'Guardia',
    ],
  },
  {
    id: 'TravelApp Experience',
    label: 'TravelApp Experience',
    subtitle: 'Turismo Receptivo',
    badgeClass: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    sectors: [
      'Atención al Cliente',
      'Ventas',
      'Reclamos',
      'Guardia',
    ],
  },
  {
    id: 'TravelApp Rewards',
    label: 'TravelApp Rewards',
    subtitle: 'Fidelización y Partners',
    badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    sectors: [
      'Atención al Cliente',
      'Atención a Partners',
      'Reclamos',
      'Administración',
    ],
  },
  {
    id: 'TravelCab',
    label: 'TravelCab',
    subtitle: 'Movilidad y Despacho',
    badgeClass: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    sectors: [
      'Atención Usuarios',
      'Atención Conductores',
      'Reclamos',
      'Ayuda Usuario',
      'Ayuda Conductores',
      'Soporte',
    ],
  },
];

export const ALL_SECTORS_BY_UNIT: Record<OfficialBusinessUnit, string[]> = {
  'TravelApp': BUSINESS_UNITS_CONFIG[0].sectors,
  'TravelApp Experience': BUSINESS_UNITS_CONFIG[1].sectors,
  'TravelApp Rewards': BUSINESS_UNITS_CONFIG[2].sectors,
  'TravelCab': BUSINESS_UNITS_CONFIG[3].sectors,
};

/**
 * Normaliza texto removiendo tildes y pasando a minúsculas para comparaciones seguras.
 */
export function normalizeText(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Mapea variantes legadas o detalladas de businessUnit a una de las 4 Unidades Oficiales.
 */
export function normalizeBusinessUnit(rawUnit?: string): OfficialBusinessUnit {
  const u = normalizeText(rawUnit);
  if (u.includes('travelcab') || u.includes('conductor') || u.includes('pasajero')) {
    return 'TravelCab';
  }
  if (u.includes('experience') || u.includes('experiencia') || u.includes('tour')) {
    return 'TravelApp Experience';
  }
  if (u.includes('reward')) {
    return 'TravelApp Rewards';
  }
  return 'TravelApp';
}

/**
 * Infiere un sector por defecto cuando un registro legado solo tiene la sub-unidad (ej: TravelCab (Conductor)).
 */
export function inferDefaultSector(rawUnit?: string): string | undefined {
  const u = normalizeText(rawUnit);
  if (u.includes('travelcab') && u.includes('conductor')) {
    return 'Atención Conductores';
  }
  if (u.includes('travelcab') && u.includes('usuario')) {
    return 'Atención Usuarios';
  }
  return undefined;
}

export interface AccessUserLike {
  role?: UserRole | string;
  allowedUnits?: OfficialBusinessUnit[];
  allowedSectors?: string[];
}

export function isSuperAdmin(user?: AccessUserLike | null): boolean {
  return user?.role === 'super_admin';
}

/**
 * Verifica si un usuario tiene permiso para ver/gestionar un registro (Lead, Conversación, Llamada, Cita)
 * perteneciente a una unidad de negocio y sector.
 */
export function canAccessRecord(
  user: AccessUserLike | null | undefined,
  recordUnit?: string,
  recordSector?: string
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const allowedUnits = user.allowedUnits || [];
  if (allowedUnits.length === 0) return false;

  const officialUnit = normalizeBusinessUnit(recordUnit);
  const hasUnitAccess = allowedUnits.some(
    (u) => normalizeBusinessUnit(u) === officialUnit
  );
  if (!hasUnitAccess) return false;

  const allowedSectors = user.allowedSectors || [];
  if (allowedSectors.length === 0) {
    // Si el usuario tiene la unidad asignada pero sin restricción específica de sector, ve toda esa unidad.
    return true;
  }

  const effectiveSector = recordSector || inferDefaultSector(recordUnit);
  if (!effectiveSector) {
    // Registros legados sin sector explícito permanecen visibles dentro de la unidad autorizada para poder clasificarlos.
    return true;
  }

  const normEffective = normalizeText(effectiveSector);
  return allowedSectors.some((s) => normalizeText(s) === normEffective);
}

/**
 * Retorna una etiqueta legible del alcance actual del usuario.
 */
export function getUserScopeLabel(user: AccessUserLike | null | undefined): string {
  if (!user) return 'Sin sesión';
  if (isSuperAdmin(user)) return 'Super Admin • Acceso Total al Ecosistema';
  const units = user.allowedUnits?.length ? user.allowedUnits.join(', ') : 'Sin unidad asignada';
  const sectors = user.allowedSectors?.length ? ` • ${user.allowedSectors.join(', ')}` : '';
  return `${units}${sectors}`;
}
