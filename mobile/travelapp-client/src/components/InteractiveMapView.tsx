import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
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

  const buildMapPayload = useCallback(() => {
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

    return {
      originLat,
      originLng,
      destLat,
      destLng,
      driversData,
      routeData,
    };
  }, [originCoords, destinationCoords, routeCoordinates, onlineDrivers]);

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
    }).setView([${initial.originLat}, ${initial.originLng}], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

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
          color: '#FF6B00',
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
        if (d.lat && d.lng) {
          var driverIcon = L.divIcon({
            className: '',
            html: '<img src="' + carImg + '" class="car-marker-icon" style="width:42px;height:42px;object-fit:contain;transform:rotate(' + d.heading + 'deg);" />',
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          });
          driverMarkers.push(L.marker([d.lat, d.lng], { icon: driverIcon }).addTo(map));
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
