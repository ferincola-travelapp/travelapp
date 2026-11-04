import React, { useMemo, useRef, useEffect } from 'react';
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

  const originLat = originCoords?.latitude ?? (originCoords as any)?.lat ?? -26.8326;
  const originLng = originCoords?.longitude ?? (originCoords as any)?.lng ?? -65.2038;
  const destLat = destinationCoords?.latitude ?? (destinationCoords as any)?.lat ?? null;
  const destLng = destinationCoords?.longitude ?? (destinationCoords as any)?.lng ?? null;

  const driversData = useMemo(() => {
    return onlineDrivers.map((d, index) => {
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
  }, [onlineDrivers, originLat, originLng]);

  const routeData = useMemo(() => {
    return routeCoordinates && routeCoordinates.length > 0
      ? routeCoordinates.map((c: any) => [c.latitude ?? c.lat, c.longitude ?? c.lng])
      : (destLat && destLng ? [[originLat, originLng], [destLat, destLng]] : []);
  }, [routeCoordinates, originLat, originLng, destLat, destLng]);

  const initialHtml = useMemo(() => {
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
      attributionControl: true
    }).setView([${originLat}, ${originLng}], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO'
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

    var originMarker = L.marker([${originLat}, ${originLng}], { icon: originIcon }).addTo(map);
    var destMarker = null;
    var routeLayer = null;
    var driverMarkers = [];
    var lastRouteKey = '';

    window.updateMapState = function(state) {
      try {
        if (state.originLat && state.originLng) {
          originMarker.setLatLng([state.originLat, state.originLng]);
        }

        if (state.destLat && state.destLng) {
          if (!destMarker) {
            destMarker = L.marker([state.destLat, state.destLng], { icon: destIcon }).addTo(map);
          } else {
            destMarker.setLatLng([state.destLat, state.destLng]);
          }
        } else if (destMarker) {
          map.removeLayer(destMarker);
          destMarker = null;
        }

        var routePoints = state.routeData || [];
        var routeKey = JSON.stringify(routePoints);
        if (routeKey !== lastRouteKey) {
          lastRouteKey = routeKey;
          if (routeLayer) {
            map.removeLayer(routeLayer);
            routeLayer = null;
          }
          if (routePoints.length > 0) {
            routeLayer = L.polyline(routePoints, {
              color: '#FF6B00',
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);
            map.fitBounds(routeLayer.getBounds(), {
              padding: [60, 60],
              maxZoom: 16
            });
          } else if (state.originLat && state.originLng) {
            map.panTo([state.originLat, state.originLng]);
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
            var m = L.marker([d.lat, d.lng], { icon: driverIcon }).addTo(map);
            driverMarkers.push(m);
          }
        });
      } catch (err) {
        console.error('Map state update error:', err);
      }
    };

    window.updateMapState(${JSON.stringify({
      originLat,
      originLng,
      destLat,
      destLng,
      routeData,
      driversData,
    })});
  </script>
</body>
</html>
    `;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' && webViewRef.current) {
      const payload = JSON.stringify({
        originLat,
        originLng,
        destLat,
        destLng,
        routeData,
        driversData,
      });
      webViewRef.current.injectJavaScript(`if (window.updateMapState) { window.updateMapState(${payload}); } true;`);
    }
  }, [originLat, originLng, destLat, destLng, routeData, driversData]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <iframe
          srcDoc={initialHtml}
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
        source={{ html: initialHtml }}
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
