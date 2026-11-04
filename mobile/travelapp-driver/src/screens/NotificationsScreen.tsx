import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Colors } from '../lib/constants';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser!;

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [prefTrips, setPrefTrips] = useState(true);
  const [prefOffers, setPrefOffers] = useState(true);
  const [prefSystem, setPrefSystem] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, 'drivers', user.uid, 'notifications'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          setNotifications([]);
        }
      } catch (e) {
        console.log("Error fetching notifications", e);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user.uid]);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Preferencias */}
        <Text style={styles.sectionTitle}>Ajustes de alertas</Text>
        <View style={styles.card}>
          {[
            { label: 'Solicitudes de viajes cercanos', val: prefTrips, set: setPrefTrips, desc: 'Avisar por sonido y pantalla cuando haya viajes libres.' },
            { label: 'Bonos y promociones', val: prefOffers, set: setPrefOffers, desc: 'Notificar sobre multiplicadores de tarifas e incentivos.' },
            { label: 'Actualizaciones del sistema', val: prefSystem, set: setPrefSystem, desc: 'Alertas de seguridad, cuenta y mantenimiento de la app.' },
          ].map((item, index) => (
            <View key={item.label} style={[styles.prefRow, index > 0 && styles.prefBorder]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.prefLabel}>{item.label}</Text>
                <Text style={styles.prefDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={item.val}
                onValueChange={item.set}
                trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
                thumbColor={item.val ? Colors.accent : Colors.textMuted}
                ios_backgroundColor={Colors.border}
              />
            </View>
          ))}
        </View>

        {/* Lista de Alertas */}
        <Text style={styles.sectionTitle}>Mensajes recibidos</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Sin notificaciones recibidas aún</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map(item => (
              <View key={item.id} style={[styles.notifCard, !item.read && styles.unreadCard]}>
                <View style={styles.notifIconHeader}>
                  <View style={[styles.iconBg, { backgroundColor: item.type === 'promo' ? Colors.accent + '15' : Colors.primary + '15' }]}>
                    <Ionicons 
                      name={item.type === 'promo' ? 'gift' : 'information-circle'} 
                      size={20} 
                      color={item.type === 'promo' ? Colors.accent : Colors.primary} 
                    />
                  </View>
                  <Text style={styles.notifDate}>{formatDate(item.createdAt)}</Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.body}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary, marginTop: 8 },
  card: {
    backgroundColor: Colors.white, borderRadius: 20, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2,
  },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  prefBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  prefLabel: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  prefDesc: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, marginTop: 3, lineHeight: 15 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  list: { gap: 12 },
  notifCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2,
  },
  unreadCard: { borderColor: Colors.accent + '40', borderWidth: 1 },
  notifIconHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notifDate: { flex: 1, fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  notifTitle: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  notifBody: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 18 },
});
