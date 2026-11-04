import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../lib/firebase';
import { Colors } from '../lib/constants';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completado', color: Colors.success },
  cancelled: { label: 'Cancelado', color: Colors.danger },
  in_progress: { label: 'En curso', color: Colors.primary },
  searching: { label: 'Buscando', color: Colors.accent },
};

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const user = auth.currentUser!;
        const q = query(
          collection(db, 'trips'),
          where('passengerId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis viajes</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="car-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Sin viajes aún</Text>
          <Text style={styles.emptyText}>Cuando solicites un viaje, aparecerá aquí</Text>
          <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('RequestTrip')}>
            <Text style={styles.ctaText}>Solicitar mi primer viaje</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const s = STATUS_LABELS[item.status] || { label: item.status, color: Colors.textSecondary };
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('TripTracking', { tripId: item.id })}>
                <View style={styles.cardLeft}>
                  <View style={[styles.serviceIcon, { backgroundColor: Colors.primary + '15' }]}>
                    <Ionicons name="car" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.destination} numberOfLines={1}>{item.destination}</Text>
                    <Text style={styles.origin} numberOfLines={1}>{item.origin || 'Ubicación actual'}</Text>
                    <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.price}>${item.estimatedPrice}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: s.color + '18' }]}>
                    <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  cta: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  ctaText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  serviceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  destination: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  origin: { fontSize: 12, color: Colors.textSecondary },
  date: { fontSize: 11, color: Colors.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
