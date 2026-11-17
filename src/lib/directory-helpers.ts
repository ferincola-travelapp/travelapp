// =============================================================================
// HELPERS DE SEGMENTACIÓN Y TRAZABILIDAD 360° — TravelApp Ecosystem
// =============================================================================

export function isCompleteTravelerProfile(data: Record<string, any>): boolean {
  if (!data) return false;
  if (Number(data.customerLevel) === 2) return true;
  if (Number(data.profileCompletedPercentage || 0) >= 80) return true;

  const hasDoc = Boolean(data.document?.number || data.documentNumber);
  const hasAddress = Boolean(data.address?.city || data.address?.street);
  const hasEmergency = Boolean(data.emergencyContact?.phone || data.emergencyContact?.name);
  const hasTax = Boolean(data.taxData?.cuitCuil);

  return hasDoc && (hasAddress || hasEmergency || hasTax);
}

export function normalizeContactEmail(email?: string): string {
  return (email || '').trim().toLowerCase();
}

export function normalizeContactPhone(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}
