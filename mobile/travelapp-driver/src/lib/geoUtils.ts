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
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      const nLat = lat / 1e5;
      const nLng = lng / 1e5;
      if (!isNaN(nLat) && !isNaN(nLng)) {
        poly.push({ latitude: nLat, longitude: nLng });
      }
    }
    return poly;
  } catch (e) {
    return [];
  }
}
