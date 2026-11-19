export interface GeoPoint {
  latitude: number;
  longitude: number;
}

function toPoint(pt: any): GeoPoint | null {
  if (!pt) return null;
  const lat = Number(pt.latitude ?? pt.lat);
  const lng = Number(pt.longitude ?? pt.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

export function haversineDistanceKm(aRaw: any, bRaw: any): number {
  const a = toPoint(aRaw);
  const b = toPoint(bRaw);
  if (!a || !b) return 0;

  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

export function distanceToPolylineKm(pointRaw: any, polylineCoords: any[]): number {
  const point = toPoint(pointRaw);
  if (!point || !Array.isArray(polylineCoords) || polylineCoords.length === 0) {
    return 0;
  }

  let minKm = Infinity;
  for (let i = 0; i < polylineCoords.length; i++) {
    const pt = toPoint(polylineCoords[i]);
    if (!pt) continue;
    const d = haversineDistanceKm(point, pt);
    if (d < minKm) minKm = d;
  }
  return minKm === Infinity ? 0 : minKm;
}

export function estimateEtaMinutes(distanceKm: number, avgCitySpeedKmh = 28): number {
  if (!distanceKm || distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / avgCitySpeedKmh) * 60));
}

export function decodePolyline(encoded: any): Array<{ latitude: number; longitude: number }> {
  if (Array.isArray(encoded)) {
    return encoded.map((pt: any) => ({
      latitude: pt.latitude ?? pt.lat,
      longitude: pt.longitude ?? pt.lng,
    }));
  }
  if (!encoded || typeof encoded !== 'string') return [];
  try {
    const poly: Array<{ latitude: number; longitude: number }> = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      const nLat = lat / 1e5;
      const nLng = lng / 1e5;
      if (!isNaN(nLat) && !isNaN(nLng)) {
        poly.push({ latitude: nLat, longitude: nLng });
      }
    }
    return poly;
  } catch {
    return [];
  }
}
