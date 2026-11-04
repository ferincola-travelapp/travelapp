import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../lib/firebase';
import { subscribeToRealFleet, DriverItem } from '../lib/supervisorService';

export default function DriversListScreen({ route, navigation }: any) {
  const [search, setSearch] = useState('');
  const [drivers, setDrivers] = useState<DriverItem[]>(route.params?.drivers || []);
  const [loading, setLoading] = useState(!route.params?.drivers);

  useEffect(() => {
    const uid = auth.currentUser?.uid || '';
    const unsub = subscribeToRealFleet(uid, (realDrivers) => {
      setDrivers(realDrivers);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filtered = drivers.filter((d) =>
    (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.vehicle || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.plate || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Top Bar Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Conductores a Cargo ({drivers.length})</Text>
      </View>

      {/* Search & Map Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Buscar chofer o patente..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.mapShortcutBtn}
          onPress={() => navigation.navigate('FleetMap')}
          activeOpacity={0.8}
        >
          <Ionicons name="map" size={18} color="#0F172A" />
          <Text style={styles.mapShortcutText}>Mapa</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Cargando conductores de la flota...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="people-outline" size={44} color="#64748B" />
          </View>
          <Text style={styles.emptyTitle}>
            {search ? 'Sin resultados' : 'Sin conductores registrados'}
          </Text>
          <Text style={styles.emptySub}>
            {search
              ? 'No hay choferes que coincidan con la búsqueda.'
              : 'Aún no hay choferes dados de alta bajo tu supervisión. Compartí tu código o código QR para que se registren.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('DriverDetail', { driver: item })}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                {item.vehiclePhotoUrl ? (
                  <Image
                    source={{ uri: item.vehiclePhotoUrl }}
                    style={{ width: 48, height: 48, borderRadius: 12, marginRight: 12, borderWidth: 1, borderColor: '#334155' }}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.driverName}>{item.name}</Text>
                    <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800' }}>
                      ⭐ {(item.rating || 5.0).toFixed(1)}
                    </Text>
                  </View>
                  <Text style={styles.driverId}>
                    {item.id.slice(0, 8)} · {item.vehicle}
                  </Text>
                  <Text style={{ color: item.registrationType === 'direct' ? '#38BDF8' : '#A855F7', fontSize: 10, fontWeight: '800', marginTop: 3 }}>
                    {item.registrationType === 'direct'
                      ? '● Alta Directa'
                      : `● Vinculado (${item.supervisorCode || 'Supervisor'})`}
                    {item.isSuspended ? ' · 🔴 SUSPENDIDO' : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === 'Inactivo'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : item.status === 'En Ruta'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === 'Inactivo'
                              ? '#EF4444'
                              : item.status === 'En Ruta'
                              ? '#F59E0B'
                              : '#10B981',
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.locateBtn}
                    onPress={() => navigation.navigate('FleetMap', { driverId: item.id })}
                  >
                    <Ionicons name="navigate-outline" size={13} color="#38BDF8" />
                    <Text style={styles.locateBtnText}>Ubicación</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.footerLabel}>SALDO BILLETERA</Text>
                  <Text style={styles.footerValue}>${item.cashBalance.toLocaleString('es-AR')}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.footerLabel}>VIAJES REALIZADOS</Text>
                  <Text style={styles.footerValue}>{item.tripsMonth} viajes</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingTop: 8,
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  topBar: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 13, marginLeft: 8 },
  mapShortcutBtn: {
    backgroundColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
  },
  mapShortcutText: { color: '#0F172A', fontWeight: '800', fontSize: 13 },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  locateBtnText: { color: '#38BDF8', fontSize: 10, fontWeight: '800' },
  list: { paddingBottom: 20 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  driverId: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '800' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerLabel: { color: '#64748B', fontSize: 9, fontWeight: '800' },
  footerValue: { color: '#F1F5F9', fontSize: 13, fontWeight: '700', marginTop: 2 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: { color: '#94A3B8', fontSize: 13, marginTop: 12 },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptySub: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
