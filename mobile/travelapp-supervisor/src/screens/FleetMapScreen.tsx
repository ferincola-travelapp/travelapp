import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../lib/firebase';
import { subscribeToRealFleet, DriverItem } from '../lib/supervisorService';
import { FleetMapView, FleetVehicle } from '../components/FleetMapView';

export default function FleetMapScreen({ route, navigation }: any) {
  const initialSelectedId = route.params?.driverId || null;
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [rawDrivers, setRawDrivers] = useState<DriverItem[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<FleetVehicle | null>(null);
  const [filter, setFilter] = useState<'all' | 'Activo' | 'En Ruta' | 'Inactivo'>('all');

  // Escuchar conductores reales asignados al supervisor (o todos si es Master Admin)
  useEffect(() => {
    const uid = auth.currentUser?.uid || '';
    const unsub = subscribeToRealFleet(uid, (realDrivers) => {
      setRawDrivers(realDrivers);
      const liveDrivers: FleetVehicle[] = [];
      realDrivers.forEach((d) => {
        if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          liveDrivers.push({
            id: d.id,
            name: d.name,
            vehicle: d.vehicle,
            plate: d.plate,
            status: d.status,
            phone: d.phone,
            speed: typeof d.speed === 'number' ? d.speed : 0,
            location: {
              latitude: d.latitude,
              longitude: d.longitude,
            },
            heading: d.heading ?? 0,
            lastUpdate: 'En vivo',
            vehiclePhotoUrl: d.vehiclePhotoUrl,
            profilePhotoUrl: d.profilePhotoUrl,
            registrationType: d.registrationType,
          });
        }
      });
      setFleet(liveDrivers);
    });

    return () => unsub();
  }, []);

  // Si se pasó un driver específico por parámetros al abrir el mapa
  useEffect(() => {
    if (initialSelectedId) {
      const found = fleet.find((d) => d.id === initialSelectedId);
      if (found) setSelectedDriver(found);
    }
  }, [initialSelectedId, fleet]);

  const filteredDrivers = fleet.filter((d) => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const activeCount = fleet.filter((d) => d.status === 'Activo').length;
  const enRutaCount = fleet.filter((d) => d.status === 'En Ruta').length;
  const inactivoCount = fleet.filter((d) => d.status === 'Inactivo').length;

  const handleWhatsApp = (driver: FleetVehicle) => {
    if (!driver.phone) return;
    const cleanPhone = driver.phone.replace(/[^0-9]/g, '');
    Linking.openURL(
      `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(
        driver.name
      )},%20te%20contacto%20desde%20Supervisión%20TravelApp%20sobre%20tu%20móvil%20(${encodeURIComponent(
        driver.vehicle
      )}).`
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Geolocalización de Flota</Text>
          <View style={styles.liveBadgeRow}>
            <View style={styles.liveDot} />
            <Text style={styles.headerSub}>
              {activeCount + enRutaCount} móviles conectados en tiempo real
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => setSelectedDriver(null)}
          activeOpacity={0.7}
        >
          <Ionicons name="scan-outline" size={20} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Todos ({fleet.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'Activo' && styles.filterChipActive]}
            onPress={() => setFilter('Activo')}
          >
            <Text style={[styles.filterText, filter === 'Activo' && styles.filterTextActive]}>
              🟢 Disponibles ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'En Ruta' && styles.filterChipActive]}
            onPress={() => setFilter('En Ruta')}
          >
            <Text style={[styles.filterText, filter === 'En Ruta' && styles.filterTextActive]}>
              🟡 En Viaje ({enRutaCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'Inactivo' && styles.filterChipActive]}
            onPress={() => setFilter('Inactivo')}
          >
            <Text style={[styles.filterText, filter === 'Inactivo' && styles.filterTextActive]}>
              ⚪ Inactivos ({inactivoCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <FleetMapView
          drivers={filteredDrivers}
          selectedDriverId={selectedDriver?.id}
          onSelectDriver={(d) => setSelectedDriver(d)}
          centerCoords={selectedDriver ? selectedDriver.location : null}
        />
        {fleet.length === 0 && (
          <View style={styles.emptyFleetBanner}>
            <Ionicons name="radio-outline" size={18} color="#38BDF8" />
            <Text style={styles.emptyFleetText}>
              0 vehículos con GPS activo. Al iniciar sesión en la app Conductor, circularán en vivo en este mapa.
            </Text>
          </View>
        )}
      </View>

      {/* Floating Selected Driver Card */}
      {selectedDriver && (
        <View style={styles.driverCard}>
          <View style={styles.driverCardHeader}>
            {selectedDriver.vehiclePhotoUrl ? (
              <Image
                source={{ uri: selectedDriver.vehiclePhotoUrl }}
                style={{ width: 52, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#38BDF8' }}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.driverAvatar}>
                <Ionicons name="car-sport" size={24} color="#38BDF8" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.driverName}>{selectedDriver.name}</Text>
              <Text style={styles.driverVehicle}>{selectedDriver.vehicle}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedDriver(null)}
              style={styles.closeCardBtn}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics */}
          <View style={styles.cardMetricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>ESTADO</Text>
              <Text
                style={[
                  styles.metricValue,
                  {
                    color:
                      selectedDriver.status === 'En Ruta'
                        ? '#F59E0B'
                        : selectedDriver.status === 'Activo'
                        ? '#10B981'
                        : '#94A3B8',
                  },
                ]}
              >
                {selectedDriver.status}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>VELOCIDAD</Text>
              <Text style={styles.metricValue}>{selectedDriver.speed} km/h</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>ACTUALIZACIÓN</Text>
              <Text style={styles.metricValue}>{selectedDriver.lastUpdate || 'En vivo'}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.btnWhatsApp}
              onPress={() => handleWhatsApp(selectedDriver)}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.btnActionText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnDetail}
              onPress={() => {
                const fullDrv = rawDrivers.find((r) => r.id === selectedDriver.id) || selectedDriver;
                navigation.navigate('DriverDetail', { driver: fullDrv });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnActionText}>Ver Ficha Completa</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  mapContainer: {
    flex: 1,
  },
  driverCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  driverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  driverVehicle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeCardBtn: {
    padding: 6,
  },
  cardMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    marginVertical: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnWhatsApp: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnDetail: {
    flex: 1.2,
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyFleetBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  emptyFleetText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});
