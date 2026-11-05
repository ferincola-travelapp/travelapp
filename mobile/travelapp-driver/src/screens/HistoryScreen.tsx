import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../lib/firebase';
import { Colors } from '../lib/constants';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [trips, setTrips] = useState<any[]>([]);
  const [driverRating, setDriverRating] = useState<number>(5.0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('today');

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser!;
        const driverDoc = await getDoc(doc(db, 'drivers', user.uid));
        if (driverDoc.exists() && typeof driverDoc.data().rating === 'number') {
          setDriverRating(driverDoc.data().rating);
        }
        const q = query(
          collection(db, 'trips'),
          where('driverId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((t: any) => t.status === 'completed')
          .sort((a: any, b: any) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (typeof a.createdAt === 'number' ? a.createdAt : 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (typeof b.createdAt === 'number' ? b.createdAt : 0);
            return timeB - timeA;
          });
        setTrips(list);
      } catch {
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  const totalEarnings = trips.reduce((sum, t) => sum + (t.finalPrice || t.estimatedPrice || 0), 0);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de viajes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Resumen */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{trips.length}</Text>
          <Text style={styles.summaryLabel}>Viajes</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${totalEarnings}</Text>
          <Text style={styles.summaryLabel}>Total ganado</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{driverRating.toFixed(1)} ⭐</Text>
          <Text style={styles.summaryLabel}>Rating</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="car-outline" size={60} color={Colors.border} />
          <Text style={styles.emptyText}>Sin viajes completados aún</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                </View>
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.cardPrice}>${item.finalPrice || item.estimatedPrice} ARS</Text>
              </View>
              <View style={styles.cardRoute}>
                <Text style={styles.cardOrigin} numberOfLines={1}>🟢 {item.origin || 'Origen'}</Text>
                <Text style={styles.cardDest} numberOfLines={1}>🔴 {item.destination}</Text>
              </View>
              <Text style={styles.cardPassenger}>Pasajero: {item.userName || 'Usuario'}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20,
    backgroundColor: Colors.primary,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.white },
  summaryBar: {
    flexDirection: 'row', backgroundColor: Colors.white,
    paddingVertical: 16, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  summaryLabel: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.success + '15', alignItems: 'center', justifyContent: 'center' },
  cardDate: { flex: 1, fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary },
  cardPrice: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  cardRoute: { gap: 4 },
  cardOrigin: { fontSize: 13, fontFamily: 'Quicksand-Medium', color: Colors.textPrimary },
  cardDest: { fontSize: 13, fontFamily: 'Quicksand-Medium', color: Colors.textPrimary },
  cardPassenger: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textMuted },
});
