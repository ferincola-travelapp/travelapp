export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export function decodePolyline(encoded: any): Array<LatLngPoint> {
  if (Array.isArray(encoded)) {
    return encoded
      .map((pt: any) => ({
        latitude: Number(pt.latitude ?? pt.lat),
        longitude: Number(pt.longitude ?? pt.lng),
      }))
      .filter((pt) => !isNaN(pt.latitude) && !isNaN(pt.longitude));
  }
  if (!encoded || typeof encoded !== 'string') return [];
  try {
    const poly: Array<LatLngPoint> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;
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

export function haversineDistanceKm(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function distancePointToSegmentKm(p: LatLngPoint, v: LatLngPoint, w: LatLngPoint): number {
  const cosLat = Math.cos((p.latitude * Math.PI) / 180);
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * cosLat;

  const vx = (v.longitude - p.longitude) * kmPerDegLng;
  const vy = (v.latitude - p.latitude) * kmPerDegLat;
  const wx = (w.longitude - p.longitude) * kmPerDegLng;
  const wy = (w.latitude - p.latitude) * kmPerDegLat;

  const dx = wx - vx;
  const dy = wy - vy;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt(vx * vx + vy * vy);
  }

  // Projection of origin (0,0) onto segment VW
  let t = -(vx * dx + vy * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = vx + t * dx;
  const projY = vy + t * dy;
  return Math.sqrt(projX * projX + projY * projY);
}

/**
 * Returns the minimum distance in km from a GPS coordinate to a polyline route.
 */
export function distanceToPolylineKm(point: LatLngPoint, polyline: LatLngPoint[]): number {
  if (!polyline || polyline.length === 0) return 0;
  if (polyline.length === 1) return haversineDistanceKm(point, polyline[0]);

  let minKm = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distancePointToSegmentKm(point, polyline[i], polyline[i + 1]);
    if (d < minKm) minKm = d;
  }
  return minKm;
}

export function estimateEtaMinutes(a: LatLngPoint, b: LatLngPoint, avgSpeedKmh = 28): number {
  const distKm = haversineDistanceKm(a, b);
  // Road factor ~1.3x over straight-line distance
  const roadKm = distKm * 1.3;
  return Math.max(1, Math.round((roadKm / avgSpeedKmh) * 60));
}
