import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CAR_MARKER_BASE64 } from '../assets/carMarkerBase64';

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
  const webViewRef = useRef<WebView>(null);
  const [trafficAlerts, setTrafficAlerts] = useState<any[]>([]);

  // Suscripción en tiempo real a alertas de tránsito reales (últimas 3 horas)
  useEffect(() => {
    const q = query(collection(db, 'traffic_alerts'), orderBy('createdAt', 'desc'), limit(40));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const nowMs = Date.now();
        const threeHoursMs = 3 * 60 * 60 * 1000;
        const active = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((a) => {
            if (a.active === false) return false;
            const createdMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : nowMs;
            return nowMs - createdMs <= threeHoursMs;
          })
          .map((a) => ({
            id: a.id,
            lat: Number(a.latitude ?? a.lat),
            lng: Number(a.longitude ?? a.lng),
            icon: a.icon || '⚠️',
            label: a.label || 'Alerta de Tránsito',
            color: a.color || '#EF4444',
          }))
          .filter((a) => !isNaN(a.lat) && !isNaN(a.lng));
        setTrafficAlerts(active);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const buildMapPayload = useCallback(() => {
    const originLat = originCoords?.latitude ?? (originCoords as any)?.lat ?? -26.8326;
    const originLng = originCoords?.longitude ?? (originCoords as any)?.lng ?? -65.2038;
    const destLat = destinationCoords?.latitude ?? (destinationCoords as any)?.lat ?? null;
    const destLng = destinationCoords?.longitude ?? (destinationCoords as any)?.lng ?? null;

    // Solo conductores con ubicación GPS real (sin coordenadas simuladas)
    const driversData = onlineDrivers
      .map((d) => {
        const loc = d.location;
        if (!loc) return null;
        const lat = (loc as any).latitude ?? (loc as any).lat;
        const lng = (loc as any).longitude ?? (loc as any).lng;
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        return {
          lat,
          lng,
          heading: typeof d.heading === 'number' ? d.heading : 0,
          name: d.name || 'Chofer TravelCab',
        };
      })
      .filter(Boolean);

    const routeData =
      routeCoordinates && routeCoordinates.length > 0
        ? routeCoordinates
            .map((c: any) => [c.latitude ?? c.lat, c.longitude ?? c.lng])
            .filter((pair: any) => typeof pair[0] === 'number' && typeof pair[1] === 'number')
        : destLat && destLng
        ? [
            [originLat, originLng],
            [destLat, destLng],
          ]
        : [];

    return {
      originLat,
      originLng,
      destLat,
      destLng,
      driversData,
      routeData,
      trafficAlerts,
    };
  }, [originCoords, destinationCoords, routeCoordinates, onlineDrivers, trafficAlerts]);

  useEffect(() => {
    if (Platform.OS !== 'web' && webViewRef.current) {
      const payload = JSON.stringify(buildMapPayload());
      webViewRef.current.injectJavaScript(
        `if (window.updateMapState) { window.updateMapState(${payload}); } true;`
      );
    }
  }, [buildMapPayload]);

  const htmlContent = useMemo(() => {
    const initial = buildMapPayload();
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
      background: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
    .traffic-alert-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2px solid #EF4444;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      font-size: 16px;
    }
    .map-layer-controls {
      position: fixed;
      top: 120px;
      right: 12px;
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .layer-btn {
      background: rgba(15, 23, 42, 0.88);
      color: #FFFFFF;
      border: 1.5px solid rgba(255,255,255,0.2);
      border-radius: 18px;
      padding: 6px 10px;
      font-size: 10px;
      font-weight: 800;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      user-select: none;
    }
    .layer-btn.active {
      background: #0F172A;
      border-color: #10B981;
      color: #34D399;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="map-layer-controls">
    <div id="btnTraffic" class="layer-btn active" onclick="toggleTrafficLayer()">
      <span>🚦</span><span id="txtTraffic">Tránsito</span>
    </div>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${initial.originLat}, ${initial.originLng}], 15);

    var trafficEnabled = true;
    var googleTrafficLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m,traffic&hl=es&x={x}&y={y}&z={z}', {
      maxZoom: 20
    });
    var googleRoadLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}', {
      maxZoom: 20
    });

    var currentBaseLayer = googleTrafficLayer;
    currentBaseLayer.addTo(map);

    window.toggleTrafficLayer = function() {
      trafficEnabled = !trafficEnabled;
      var btn = document.getElementById('btnTraffic');
      map.removeLayer(currentBaseLayer);
      if (trafficEnabled) {
        btn.classList.add('active');
        currentBaseLayer = googleTrafficLayer;
      } else {
        btn.classList.remove('active');
        currentBaseLayer = googleRoadLayer;
      }
      currentBaseLayer.addTo(map);
    };

    var carImg = "${CAR_MARKER_BASE64}";
    var originIcon = L.divIcon({
      className: '',
      html: '<div class="pulse-pin-origin"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    var destIcon = L.divIcon({
      className: '',
      html: '<div class="pulse-pin-dest"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    var originMarker = null;
    var destMarker = null;
    var routePolyline = null;
    var driverMarkers = [];
    var alertMarkers = [];
    var lastRouteKey = '';

    window.updateMapState = function(state) {
      if (!state) return;
      if (originMarker) {
        originMarker.setLatLng([state.originLat, state.originLng]);
      } else {
        originMarker = L.marker([state.originLat, state.originLng], { icon: originIcon }).addTo(map);
      }

      if (state.destLat && state.destLng) {
        if (destMarker) {
          destMarker.setLatLng([state.destLat, state.destLng]);
        } else {
          destMarker = L.marker([state.destLat, state.destLng], { icon: destIcon }).addTo(map);
        }
      } else if (destMarker) {
        map.removeLayer(destMarker);
        destMarker = null;
      }

      if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
      }
      if (state.routeData && state.routeData.length > 0) {
        routePolyline = L.polyline(state.routeData, {
          color: '#2563EB',
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
        var routeKey = state.originLat + ',' + state.originLng + '-' + state.destLat + ',' + state.destLng;
        if (routeKey !== lastRouteKey) {
          lastRouteKey = routeKey;
          map.fitBounds(routePolyline.getBounds(), {
            padding: [60, 60],
            maxZoom: 16
          });
        }
      }

      driverMarkers.forEach(function(m) { map.removeLayer(m); });
      driverMarkers = [];
      (state.driversData || []).forEach(function(d) {
        if (d && d.lat && d.lng) {
          var driverIcon = L.divIcon({
            className: '',
            html: '<img src="' + carImg + '" class="car-marker-icon" style="width:42px;height:42px;object-fit:contain;transform:rotate(' + d.heading + 'deg);" />',
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          });
          driverMarkers.push(L.marker([d.lat, d.lng], { icon: driverIcon }).addTo(map));
        }
      });

      alertMarkers.forEach(function(m) { map.removeLayer(m); });
      alertMarkers = [];
      (state.trafficAlerts || []).forEach(function(a) {
        if (a && a.lat && a.lng) {
          var alertIcon = L.divIcon({
            className: '',
            html: '<div class="traffic-alert-pin" style="border-color:' + (a.color || '#EF4444') + ';">' + (a.icon || '⚠️') + '</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          var am = L.marker([a.lat, a.lng], { icon: alertIcon }).addTo(map);
          am.bindPopup('<b>' + (a.icon || '⚠️') + ' ' + (a.label || 'Alerta Vial') + '</b>');
          alertMarkers.push(am);
        }
      });
    };

    window.updateMapState(${JSON.stringify(initial)});
  </script>
</body>
</html>
    `;
  }, [Platform.OS === 'web' ? buildMapPayload : null]);

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
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        onLoadEnd={() => {
          const payload = JSON.stringify(buildMapPayload());
          webViewRef.current?.injectJavaScript(
            `if (window.updateMapState) { window.updateMapState(${payload}); } true;`
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
});
