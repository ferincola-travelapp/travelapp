import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CAR_MARKER_BASE64 } from '../assets/carMarkerBase64';

export interface FleetVehicle {
  id: string;
  name: string;
  vehicle: string;
  plate?: string;
  status: 'Activo' | 'En Ruta' | 'Inactivo' | string;
  phone?: string;
  speed?: number;
  location: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  lastUpdate?: string;
  vehiclePhotoUrl?: string;
  profilePhotoUrl?: string;
  registrationType?: 'supervisor' | 'direct';
}

interface FleetMapViewProps {
  drivers: FleetVehicle[];
  selectedDriverId?: string | null;
  onSelectDriver?: (driver: FleetVehicle) => void;
  centerCoords?: { latitude: number; longitude: number } | null;
  style?: any;
}

export const FleetMapView: React.FC<FleetMapViewProps> = ({
  drivers = [],
  selectedDriverId,
  onSelectDriver,
  centerCoords,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [trafficAlerts, setTrafficAlerts] = useState<any[]>([]);

  const initialCenterRef = useRef(
    centerCoords ||
      (drivers.length > 0 && drivers[0].location
        ? drivers[0].location
        : { latitude: -26.82414, longitude: -65.2226 })
  );

  // Escuchar alertas de tránsito en tiempo real para el radar del supervisor
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
            label: a.label || 'Alerta Vial',
            color: a.color || '#EF4444',
            reporterName: a.reporterName || 'Flota',
          }))
          .filter((a) => !isNaN(a.lat) && !isNaN(a.lng));
        setTrafficAlerts(active);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const serializeDrivers = (list: FleetVehicle[], selId?: string | null) =>
    list
      .filter((d) => d.location && typeof d.location.latitude === 'number' && typeof d.location.longitude === 'number')
      .map((d) => ({
        id: d.id,
        name: d.name,
        vehicle: d.vehicle,
        plate: d.plate || '',
        status: d.status,
        speed: d.speed ?? 0,
        lat: d.location.latitude,
        lng: d.location.longitude,
        heading: d.heading ?? 0,
        isSelected: selId === d.id,
      }));

  useEffect(() => {
    if (Platform.OS === 'web' || !webViewRef.current) return;
    const payload = JSON.stringify({
      drivers: serializeDrivers(drivers, selectedDriverId),
      centerCoords: centerCoords || null,
      trafficAlerts,
    });
    webViewRef.current.injectJavaScript(
      `if (window.updateFleetState) { window.updateFleetState(${payload}); } true;`
    );
  }, [drivers, selectedDriverId, centerCoords, trafficAlerts]);

  const htmlContent = useMemo(() => {
    const lat = initialCenterRef.current.latitude;
    const lng = initialCenterRef.current.longitude;
    const driversJson = JSON.stringify(serializeDrivers(drivers, selectedDriverId));

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
      background: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(15, 23, 42, 0.7) !important;
      color: #94A3B8 !important;
    }
    .car-marker-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    .car-badge {
      background: rgba(15, 23, 42, 0.92);
      border: 1.5px solid #38BDF8;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 800;
      color: #FFFFFF;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      margin-bottom: 2px;
    }
    .car-badge.en-ruta {
      border-color: #F59E0B;
      color: #F59E0B;
    }
    .car-badge.inactivo {
      border-color: #94A3B8;
      color: #94A3B8;
    }
    .car-badge.activo {
      border-color: #10B981;
      color: #10B981;
    }
    .car-marker-icon {
      filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));
      transition: transform 0.25s ease;
    }
    .car-marker-selected {
      filter: drop-shadow(0px 0px 10px #38BDF8) drop-shadow(0px 4px 6px rgba(0,0,0,0.6));
      transform: scale(1.2);
    }
    .traffic-alert-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #0F172A;
      border: 2.5px solid #EF4444;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      font-size: 18px;
    }
    .map-layer-controls {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 999;
      display: flex;
      gap: 8px;
    }
    .layer-btn {
      background: rgba(15, 23, 42, 0.92);
      color: #FFFFFF;
      border: 1.5px solid rgba(56, 189, 248, 0.4);
      border-radius: 18px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      user-select: none;
    }
    .layer-btn.active {
      border-color: #10B981;
      color: #34D399;
    }
    .leaflet-popup-content-wrapper {
      background: #1E293B !important;
      color: #FFFFFF !important;
      border: 1px solid #334155;
      border-radius: 14px !important;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
    }
    .leaflet-popup-tip {
      background: #1E293B !important;
    }
    .popup-title {
      font-weight: 900;
      font-size: 13px;
      color: #F8FAFC;
      margin: 0 0 2px 0;
    }
    .popup-sub {
      font-size: 11px;
      color: #94A3B8;
      margin: 0 0 6px 0;
    }
    .popup-tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 8px;
      margin-top: 2px;
    }
    .btn-select-driver {
      display: block;
      margin-top: 8px;
      background: #38BDF8;
      color: #0F172A;
      text-align: center;
      padding: 6px 10px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 11px;
      text-decoration: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="map-layer-controls">
    <div id="btnTraffic" class="layer-btn active" onclick="toggleTrafficLayer()">
      <span>🚦</span><span>Tránsito Vivo</span>
    </div>
    <div id="btnSat" class="layer-btn" onclick="toggleSatelliteLayer()">
      <span>🛰️</span><span>Satélite</span>
    </div>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([${lat}, ${lng}], 14);

    var trafficEnabled = true;
    var satelliteEnabled = false;

    var googleTrafficLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m,traffic&hl=es&x={x}&y={y}&z={z}', {
      maxZoom: 20
    });
    var googleRoadLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}', {
      maxZoom: 20
    });
    var googleSatTrafficLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y,traffic&hl=es&x={x}&y={y}&z={z}', {
      maxZoom: 20
    });

    var currentBaseLayer = googleTrafficLayer;
    currentBaseLayer.addTo(map);

    function refreshLayer() {
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
      if (trafficEnabled) btn.classList.add('active');
      else btn.classList.remove('active');
      refreshLayer();
    };

    window.toggleSatelliteLayer = function() {
      satelliteEnabled = !satelliteEnabled;
      var btn = document.getElementById('btnSat');
      if (satelliteEnabled) btn.classList.add('active');
      else btn.classList.remove('active');
      refreshLayer();
    };

    var carImg = "${CAR_MARKER_BASE64}";
    var markers = {};
    var alertMarkers = [];
    var hasAutoFitted = false;

    window.notifySelect = function(id) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DRIVER_SELECTED', driverId: id }));
      }
    };

    function buildDriverIcon(d) {
      var badgeClass = 'activo';
      var badgeText = '🟢 ' + d.name.split(' ')[0];
      if (d.status === 'En Ruta') {
        badgeClass = 'en-ruta';
        badgeText = '🟡 ' + d.name.split(' ')[0] + ' (En Ruta)';
      } else if (d.status === 'Inactivo') {
        badgeClass = 'inactivo';
        badgeText = '⚪ ' + d.name.split(' ')[0];
      }

      var iconHtml = '<div class="car-marker-container">' +
        '<div class="car-badge ' + badgeClass + '">' + badgeText + '</div>' +
        '<img src="' + carImg + '" class="car-marker-icon ' + (d.isSelected ? 'car-marker-selected' : '') + '" style="width:40px;height:40px;object-fit:contain;transform:rotate(' + d.heading + 'deg);" />' +
      '</div>';

      return L.divIcon({
        className: '',
        html: iconHtml,
        iconSize: [120, 60],
        iconAnchor: [60, 45],
        popupAnchor: [0, -45]
      });
    }

    function buildPopupHtml(d) {
      return '<div>' +
        '<p class="popup-title">' + d.name + '</p>' +
        '<p class="popup-sub">' + d.vehicle + '</p>' +
        '<span class="popup-tag" style="background:' + (d.status === 'En Ruta' ? 'rgba(245,158,11,0.2);color:#F59E0B' : 'rgba(16,185,129,0.2);color:#10B981') + ';">' + d.status + ' • ' + d.speed + ' km/h</span>' +
        '<div class="btn-select-driver" onclick="notifySelect(\\'' + d.id + '\\')">Ver Ficha & Acciones</div>' +
      '</div>';
    }

    window.updateFleetState = function(state) {
      var nextDrivers = state.drivers || [];
      var activeIds = {};

      nextDrivers.forEach(function(d) {
        activeIds[d.id] = true;
        var icon = buildDriverIcon(d);
        var popupHtml = buildPopupHtml(d);

        if (markers[d.id]) {
          markers[d.id].setLatLng([d.lat, d.lng]);
          markers[d.id].setIcon(icon);
          markers[d.id].setPopupContent(popupHtml);
        } else {
          var marker = L.marker([d.lat, d.lng], { icon: icon }).addTo(map);
          marker.bindPopup(popupHtml);
          marker.on('click', function() {
            notifySelect(d.id);
          });
          markers[d.id] = marker;
        }

        if (d.isSelected) {
          markers[d.id].openPopup();
        }
      });

      Object.keys(markers).forEach(function(id) {
        if (!activeIds[id]) {
          map.removeLayer(markers[id]);
          delete markers[id];
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
          am.bindPopup('<div><p class="popup-title">' + (a.icon || '⚠️') + ' ' + (a.label || 'Alerta Vial') + '</p><p class="popup-sub">Reportado por ' + (a.reporterName || 'Flota') + '</p></div>');
          alertMarkers.push(am);
        }
      });

      if (state.centerCoords && state.centerCoords.latitude && state.centerCoords.longitude) {
        map.panTo([state.centerCoords.latitude, state.centerCoords.longitude]);
      } else if (!hasAutoFitted && Object.keys(markers).length > 1) {
        var group = L.featureGroup(Object.values(markers));
        map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 16 });
        hasAutoFitted = true;
      }
    };

    window.updateFleetState({ drivers: ${driversJson}, trafficAlerts: [] });
  </script>
</body>
</html>
    `;
  }, []);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'DRIVER_SELECTED' && onSelectDriver) {
        const found = drivers.find((d) => d.id === data.driverId);
        if (found) onSelectDriver(found);
      }
    } catch (err) {
      console.warn('Error parsing map message:', err);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Fleet Map"
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
        onMessage={handleMessage}
        onLoadEnd={() => {
          const payload = JSON.stringify({
            drivers: serializeDrivers(drivers, selectedDriverId),
            centerCoords: centerCoords || null,
            trafficAlerts,
          });
          webViewRef.current?.injectJavaScript(
            `if (window.updateFleetState) { window.updateFleetState(${payload}); } true;`
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
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
  },
});
