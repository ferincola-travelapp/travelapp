import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
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
  const initialCenterRef = useRef(
    centerCoords ||
      (drivers.length > 0 && drivers[0].location
        ? drivers[0].location
        : { latitude: -26.82414, longitude: -65.2226 })
  );

  const serializeDrivers = (list: FleetVehicle[], selId?: string | null) =>
    list.map((d) => ({
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
    });
    webViewRef.current.injectJavaScript(
      `if (window.updateFleetState) { window.updateFleetState(${payload}); } true;`
    );
  }, [drivers, selectedDriverId, centerCoords]);

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
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([${lat}, ${lng}], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd'
    }).addTo(map);

    var carImg = "${CAR_MARKER_BASE64}";
    var markers = {};
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

      if (state.centerCoords && state.centerCoords.latitude && state.centerCoords.longitude) {
        map.panTo([state.centerCoords.latitude, state.centerCoords.longitude]);
      } else if (!hasAutoFitted && Object.keys(markers).length > 1) {
        var group = L.featureGroup(Object.values(markers));
        map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 16 });
        hasAutoFitted = true;
      }
    };

    window.updateFleetState({ drivers: ${driversJson} });
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
