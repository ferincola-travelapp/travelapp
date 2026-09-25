import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { CAR_MARKER_SVG } from '../assets/carMarkerSvgBase64';

interface InteractiveMapViewProps {
  originCoords?: { latitude?: number; longitude?: number; lat?: number; lng?: number } | null;
  destinationCoords?: { latitude?: number; longitude?: number; lat?: number; lng?: number } | null;
  routeCoordinates?: Array<any> | null;
  onlineDrivers?: Array<{ id?: string; name?: string; location?: any; heading?: number }>;
  style?: any;
}

export const InteractiveMapView: React.FC<InteractiveMapViewProps> = ({
  originCoords,
  destinationCoords,
  routeCoordinates,
  onlineDrivers = [],
  style,
}) => {
  const htmlContent = useMemo(() => {
    const originLat = originCoords?.latitude ?? (originCoords as any)?.lat ?? -26.8326;
    const originLng = originCoords?.longitude ?? (originCoords as any)?.lng ?? -65.2038;
    const destLat = destinationCoords?.latitude ?? (destinationCoords as any)?.lat ?? null;
    const destLng = destinationCoords?.longitude ?? (destinationCoords as any)?.lng ?? null;

    const driversData = onlineDrivers.map((d, index) => {
      const loc = d.location || {
        latitude: originLat + (index * 0.004 - 0.006),
        longitude: originLng + (index * 0.005 - 0.004),
      };
      const heading = d.heading !== undefined ? d.heading : (index * 70 + 35) % 360;
      return {
        lat: (loc as any).latitude ?? (loc as any).lat,
        lng: (loc as any).longitude ?? (loc as any).lng,
        heading: heading,
        name: d.name || 'Chofer TravelCab',
      };
    });

    const routeData = routeCoordinates && routeCoordinates.length > 0
      ? routeCoordinates.map((c: any) => [c.latitude ?? c.lat, c.longitude ?? c.lng])
      : (destLat && destLng ? [[originLat, originLng], [destLat, destLng]] : []);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #EAEFF5;
    }
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(255,255,255,0.7) !important;
    }
    .car-marker-icon {
      transition: transform 0.3s ease;
      filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.35));
    }
    .pulse-pin-origin {
      width: 22px;
      height: 22px;
      background: #10B981;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.8), 0 3px 6px rgba(0,0,0,0.3);
    }
    .pulse-pin-dest {
      width: 22px;
      height: 22px;
      background: #EF4444;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.8), 0 3px 6px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${originLat}, ${originLng}], 15);

    // Capa de Google Maps con Tráfico en Tiempo Real
    L.tileLayer('https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    var carImg = "${CAR_MARKER_SVG}";

    // Alertas de Tránsito en Vivo (Simulación y puntos clave de la ciudad)
    var trafficAlerts = [
      { lat: ${originLat} + 0.003, lng: ${originLng} + 0.002, type: 'traffic', label: 'Tránsito Pesado', icon: '🔴' },
      { lat: ${originLat} - 0.004, lng: ${originLng} - 0.003, type: 'works', label: 'Obras en Calzada', icon: '🚧' },
      { lat: ${originLat} + 0.006, lng: ${originLng} - 0.004, type: 'police', label: 'Control Municipal SUTRAPPA', icon: '🚨' }
    ];

    trafficAlerts.forEach(function(alert) {
      var alertIcon = L.divIcon({
        className: '',
        html: '<div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid #FF6B00; color: #FFF; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 12px; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap;">' + alert.icon + ' ' + alert.label + '</div>',
        iconSize: [120, 26],
        iconAnchor: [60, 13]
      });
      L.marker([alert.lat, alert.lng], { icon: alertIcon }).addTo(map);
    });

    // Marcador de Origen
    var originIcon = L.divIcon({
      className: '',
      html: '<div class="pulse-pin-origin"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    L.marker([${originLat}, ${originLng}], { icon: originIcon }).addTo(map);

    // Marcador de Destino
    ${destLat && destLng ? `
    var destIcon = L.divIcon({
      className: '',
      html: '<div class="pulse-pin-dest"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    L.marker([${destLat}, ${destLng}], { icon: destIcon }).addTo(map);
    ` : ''}

    // Ruta
    var routePoints = ${JSON.stringify(routeData)};
    if (routePoints.length > 0) {
      var polyline = L.polyline(routePoints, {
        color: '#FF6B00',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), {
        padding: [60, 60],
        maxZoom: 16
      });
    }

    // Choferes con tu icono SVG diseñado y rotación exacta
    var drivers = ${JSON.stringify(driversData)};
    drivers.forEach(function(d) {
      var driverIcon = L.divIcon({
        className: '',
        html: '<img src="' + carImg + '" class="car-marker-icon" style="width:42px;height:42px;object-fit:contain;transform:rotate(' + d.heading + 'deg);" />',
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });
      L.marker([d.lat, d.lng], { icon: driverIcon }).addTo(map);
    });
  </script>
</body>
</html>
    `;
  }, [originCoords, destinationCoords, routeCoordinates, onlineDrivers]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Interactive Map"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#EAEFF5',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#EAEFF5',
  },
});
