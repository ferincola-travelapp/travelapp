import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, Modal, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CAR_MARKER_BASE64 } from '../assets/carMarkerBase64';

interface InteractiveMapViewProps {
  originCoords?: { latitude?: number; longitude?: number; lat?: number; lng?: number } | null;
  destinationCoords?: { latitude?: number; longitude?: number; lat?: number; lng?: number } | null;
  routeCoordinates?: Array<any> | null;
  onlineDrivers?: Array<{ id?: string; name?: string; location?: any; heading?: number }>;
  allowTrafficReport?: boolean;
  style?: any;
}

const TRAFFIC_ALERT_TYPES = [
  { type: 'roadblock', icon: '🚧', label: 'Corte de Calle / Manifestación', color: '#EF4444' },
  { type: 'heavy_traffic', icon: '🚗', label: 'Tránsito Pesado / Embotellamiento', color: '#F59E0B' },
  { type: 'accident', icon: '💥', label: 'Accidente Vial en Calzada', color: '#DC2626' },
  { type: 'police_control', icon: '🚓', label: 'Control Vehicular / Operativo', color: '#2563EB' },
];

export const InteractiveMapView: React.FC<InteractiveMapViewProps> = ({
  originCoords,
  destinationCoords,
  routeCoordinates,
  onlineDrivers = [],
  allowTrafficReport = true,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [trafficAlerts, setTrafficAlerts] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [submittingAlert, setSubmittingAlert] = useState(false);

  const originLat = originCoords?.latitude ?? (originCoords as any)?.lat ?? -26.8326;
  const originLng = originCoords?.longitude ?? (originCoords as any)?.lng ?? -65.2038;
  const destLat = destinationCoords?.latitude ?? (destinationCoords as any)?.lat ?? null;
  const destLng = destinationCoords?.longitude ?? (destinationCoords as any)?.lng ?? null;

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
            reporterName: a.reporterName || 'Conductor TravelCab',
          }))
          .filter((a) => !isNaN(a.lat) && !isNaN(a.lng));
        setTrafficAlerts(active);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  // Solo choferes con ubicación GPS real (sin coordenadas simuladas)
  const driversData = useMemo(() => {
    return onlineDrivers
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
  }, [onlineDrivers]);

  const routeData = useMemo(() => {
    return routeCoordinates && routeCoordinates.length > 0
      ? routeCoordinates
          .map((c: any) => [c.latitude ?? c.lat, c.longitude ?? c.lng])
          .filter((pair: any) => typeof pair[0] === 'number' && typeof pair[1] === 'number')
      : destLat && destLng
      ? [
          [originLat, originLng],
          [destLat, destLng],
        ]
      : [];
  }, [routeCoordinates, originLat, originLng, destLat, destLng]);

  const buildPayload = useCallback(
    () => ({
      originLat,
      originLng,
      destLat,
      destLng,
      routeData,
      driversData,
      trafficAlerts,
    }),
    [originLat, originLng, destLat, destLng, routeData, driversData, trafficAlerts]
  );

  const handleReportTrafficAlert = async (item: typeof TRAFFIC_ALERT_TYPES[0]) => {
    if (submittingAlert) return;
    setSubmittingAlert(true);
    try {
      await addDoc(collection(db, 'traffic_alerts'), {
        type: item.type,
        icon: item.icon,
        label: item.label,
        color: item.color,
        latitude: originLat,
        longitude: originLng,
        reportedBy: auth.currentUser?.uid || 'driver',
        reporterName: auth.currentUser?.displayName || 'Conductor en Ruta',
        active: true,
        createdAt: Timestamp.now(),
      });
      setShowReportModal(false);
      Alert.alert('Alerta Vial Publicada 🚦', `Se notificó "${item.label}" en el mapa en vivo para toda la flota.`);
    } catch {
      Alert.alert('Error', 'No se pudo publicar la alerta de tránsito.');
    } finally {
      setSubmittingAlert(false);
    }
  };

  const initialHtml = useMemo(() => {
    const initialState = JSON.stringify(buildPayload());
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
      background: rgba(255,255,255,0.75) !important;
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
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid #EF4444;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      font-size: 18px;
    }
    .map-layer-controls {
      position: fixed;
      bottom: 225px;
      right: 12px;
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .layer-btn {
      background: rgba(15, 23, 42, 0.9);
      color: #FFFFFF;
      border: 1.5px solid rgba(255,255,255,0.2);
      border-radius: 20px;
      padding: 7px 12px;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
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
      <span>🚦</span><span id="txtTraffic">Tránsito ON</span>
    </div>
    <div id="btnSat" class="layer-btn" onclick="toggleSatelliteLayer()">
      <span>🛰️</span><span>Satélite</span>
    </div>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([${originLat}, ${originLng}], 15);

    var trafficEnabled = true;
    var satelliteEnabled = false;

    // Capas oficiales de Google Maps con Tránsito en Tiempo Real
    var googleTrafficLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m,traffic&hl=es&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps Tránsito en Vivo'
    });
    var googleRoadLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps'
    });
    var googleSatTrafficLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y,traffic&hl=es&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps Satélite + Tránsito'
    });

    var currentBaseLayer = googleTrafficLayer;
    currentBaseLayer.addTo(map);

    function refreshMapLayer() {
      map.removeLayer(currentBaseLayer);
      if (satelliteEnabled) {
        currentBaseLayer = googleSatTrafficLayer;
      } else if (trafficEnabled) {
        currentBaseLayer = googleTrafficLayer;
      } else {
        currentBaseLayer = googleRoadLayer;
      }
      currentBaseLayer.addTo(map);
    }

    window.toggleTrafficLayer = function() {
      trafficEnabled = !trafficEnabled;
      var btn = document.getElementById('btnTraffic');
      var txt = document.getElementById('txtTraffic');
      if (trafficEnabled) {
        btn.classList.add('active');
        txt.innerText = 'Tránsito ON';
      } else {
        btn.classList.remove('active');
        txt.innerText = 'Tránsito OFF';
      }
      refreshMapLayer();
    };

    window.toggleSatelliteLayer = function() {
      satelliteEnabled = !satelliteEnabled;
      var btn = document.getElementById('btnSat');
      if (satelliteEnabled) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      refreshMapLayer();
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

    var originMarker = L.marker([${originLat}, ${originLng}], { icon: originIcon }).addTo(map);
    var destMarker = null;
    var routeLayer = null;
    var driverMarkers = [];
    var alertMarkers = [];
    var lastRouteKey = '';

    window.updateMapState = function(state) {
      try {
        if (!state) return;
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
              color: '#2563EB',
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
          if (d && d.lat && d.lng) {
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

        alertMarkers.forEach(function(m) { map.removeLayer(m); });
        alertMarkers = [];
        (state.trafficAlerts || []).forEach(function(a) {
          if (a && a.lat && a.lng) {
            var alertIcon = L.divIcon({
              className: '',
              html: '<div class="traffic-alert-pin" style="border-color:' + (a.color || '#EF4444') + ';">' + (a.icon || '⚠️') + '</div>',
              iconSize: [34, 34],
              iconAnchor: [17, 17]
            });
            var am = L.marker([a.lat, a.lng], { icon: alertIcon }).addTo(map);
            am.bindPopup('<b>' + (a.icon || '⚠️') + ' ' + (a.label || 'Alerta Vial') + '</b><br/><small>Reportado por ' + (a.reporterName || 'Flota') + '</small>');
            alertMarkers.push(am);
          }
        });
      } catch (err) {
        console.error('Map state update error:', err);
      }
    };

    window.updateMapState(${initialState});
  </script>
</body>
</html>
    `;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' && webViewRef.current) {
      const payload = JSON.stringify(buildPayload());
      webViewRef.current.injectJavaScript(
        `if (window.updateMapState) { window.updateMapState(${payload}); } true;`
      );
    }
  }, [buildPayload]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <iframe
          srcDoc={initialHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Google Maps Traffic"
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
        onLoadEnd={() => {
          const payload = JSON.stringify(buildPayload());
          webViewRef.current?.injectJavaScript(
            `if (window.updateMapState) { window.updateMapState(${payload}); } true;`
          );
        }}
      />

      {allowTrafficReport && (
        <>
          <TouchableOpacity
            style={styles.reportTrafficBtn}
            onPress={() => setShowReportModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="warning" size={16} color="#FEF08A" />
            <Text style={styles.reportTrafficText}>Alerta Vial</Text>
          </TouchableOpacity>

          <Modal
            visible={showReportModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowReportModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🚦 Reportar Alerta de Tránsito</Text>
                  <TouchableOpacity onPress={() => setShowReportModal(false)}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>
                  Tu alerta se mostrará en tiempo real en el mapa de todos los conductores y en la central de supervisión.
                </Text>

                {TRAFFIC_ALERT_TYPES.map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[styles.alertOptionBtn, { borderColor: item.color + '40' }]}
                    onPress={() => handleReportTrafficAlert(item)}
                    disabled={submittingAlert}
                  >
                    <Text style={styles.alertOptionIcon}>{item.icon}</Text>
                    <Text style={styles.alertOptionLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        </>
      )}
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
  reportTrafficBtn: {
    position: 'absolute',
    bottom: 305,
    right: 12,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  reportTrafficText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  alertOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  alertOptionIcon: {
    fontSize: 22,
  },
  alertOptionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
});
