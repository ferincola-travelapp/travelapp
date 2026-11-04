import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, doc, getDoc, setDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { subscribeToRealFleet, FleetMetrics } from '../lib/supervisorService';

interface PayoutItem {
  id: string;
  amount: number;
  status: string;
  date: string;
  cbuAlias?: string;
}

export default function WalletSupervisorScreen({ route, navigation }: any) {
  const [metrics, setMetrics] = useState<FleetMetrics>(
    route.params?.metrics || {
      totalRecruited: 0,
      activeDriversToday: 0,
      fleetRevenueMonth: 0,
      companyFee: 0,
      supervisorCommission: 0,
    }
  );

  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [cbuAlias, setCbuAlias] = useState('');
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Escuchar métricas en tiempo real si no vinieron por params
  useEffect(() => {
    const uid = auth.currentUser?.uid || '';
    if (uid) {
      getDoc(doc(db, 'users', uid))
        .then((snap) => {
          if (snap.exists() && snap.data().cbuAlias) {
            setCbuAlias(snap.data().cbuAlias);
          }
        })
        .catch(() => {});
    }
    const unsub = subscribeToRealFleet(uid, (_, realMetrics) => {
      setMetrics(realMetrics);
    });

    return () => unsub();
  }, []);

  // Escuchar solicitudes de liquidación reales en Firestore
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoadingPayouts(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'payout_requests'),
        where('supervisorId', '==', uid)
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: PayoutItem[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
            const dateStr = createdAt.toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            list.push({
              id: docSnap.id.slice(0, 8).toUpperCase(),
              amount: Number(data.amount || 0),
              status: data.status === 'approved' ? 'Pagado' : data.status === 'rejected' ? 'Rechazado' : 'En Proceso',
              date: dateStr,
              cbuAlias: data.cbuAlias || '',
            });
          });

          setPayouts(list);
          setLoadingPayouts(false);
        },
        (err) => {
          console.warn('Error escuchando payout_requests:', err);
          setPayouts([]);
          setLoadingPayouts(false);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn('Catch payout listener:', e);
      setLoadingPayouts(false);
    }
  }, []);

  const totalRequestedOrPaid = payouts
    .filter((p) => p.status !== 'Rechazado')
    .reduce((acc, p) => acc + p.amount, 0);

  const availableCommission = Math.max(0, metrics.supervisorCommission - totalRequestedOrPaid);

  const handleRequestPayout = async () => {
    if (availableCommission <= 0) {
      return Alert.alert(
        'Saldo Insuficiente',
        'Tu comisión disponible actual para retiro es $0. A medida que tus choferes realicen viajes, se generarán haberes disponibles.'
      );
    }

    if (!cbuAlias.trim()) {
      return Alert.alert('CBU / Alias requerido', 'Ingresá tu CBU, CVU o Alias bancario para recibir la transferencia.');
    }

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'users', uid), { cbuAlias: cbuAlias.trim() }, { merge: true });
      await addDoc(collection(db, 'payout_requests'), {
        supervisorId: uid,
        supervisorEmail: auth.currentUser?.email || '',
        supervisorName: auth.currentUser?.displayName || 'Supervisor',
        amount: availableCommission,
        cbuAlias: cbuAlias.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        'Solicitud Enviada',
        `Tu solicitud de liquidación de haberes por $${availableCommission.toLocaleString(
          'es-AR'
        )} al destino (${cbuAlias.trim()}) fue registrada y transmitida al área de Finanzas.`
      );
    } catch (err: any) {
      console.warn('Error al solicitar retiro:', err);
      Alert.alert('Error', 'No se pudo registrar la solicitud. Verificá tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Liquidación de Haberes</Text>
      </View>

      <Text style={styles.headerSub}>Administración de comisiones de supervisión de flota</Text>

      {/* Balance Card (100% Real) */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>COMISIÓN DISPONIBLE PARA RETIRO</Text>
        <Text style={styles.cardAmount}>
          ${availableCommission.toLocaleString('es-AR')}
        </Text>
        <Text style={styles.cardSub}>
          Acumulado Mes: ${metrics.supervisorCommission.toLocaleString('es-AR')} · Fee Empresa: ${metrics.companyFee.toLocaleString('es-AR')}
        </Text>

        <TextInput
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#334155',
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: '#FFFFFF',
            fontSize: 13,
            marginBottom: 14,
          }}
          placeholder="Ingresá tu CBU, CVU o Alias bancario..."
          placeholderTextColor="#64748B"
          value={cbuAlias}
          onChangeText={setCbuAlias}
          autoCapitalize="none"
        />

        <TouchableOpacity
          disabled={submitting}
          style={[
            styles.payoutBtn,
            { backgroundColor: availableCommission > 0 ? '#10B981' : '#334155' },
          ]}
          onPress={handleRequestPayout}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="card-outline" size={18} color="#FFFFFF" />
              <Text style={styles.payoutBtnText}>
                {availableCommission > 0
                  ? 'Solicitar Retiro / Transferencia'
                  : 'Sin saldo disponible para retirar ($0)'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* History (100% Real) */}
      <Text style={styles.sectionTitle}>Historial de Liquidaciones</Text>

      {loadingPayouts ? (
        <ActivityIndicator size="small" color="#38BDF8" style={{ marginVertical: 20 }} />
      ) : payouts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={32} color="#64748B" />
          <Text style={styles.emptyTitle}>Sin liquidaciones solicitadas</Text>
          <Text style={styles.emptySub}>
            Cuando generes solicitudes de retiro de comisión, aparecerán registradas aquí.
          </Text>
        </View>
      ) : (
        payouts.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View>
              <Text style={styles.itemTitle}>Liquidación #{item.id}</Text>
              <Text style={styles.itemId}>Fecha: {item.date}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.itemAmount}>${item.amount.toLocaleString('es-AR')}</Text>
              <Text
                style={[
                  styles.itemBadge,
                  {
                    color:
                      item.status === 'Pagado'
                        ? '#10B981'
                        : item.status === 'Rechazado'
                        ? '#EF4444'
                        : '#F59E0B',
                  },
                ]}
              >
                ● {item.status}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    paddingTop: 8,
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  headerSub: { color: '#94A3B8', fontSize: 12, marginBottom: 16, marginTop: 4 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  cardLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
  cardAmount: { color: '#10B981', fontSize: 32, fontWeight: '900', marginVertical: 6 },
  cardSub: { color: '#CBD5E1', fontSize: 11, marginBottom: 16 },
  payoutBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  payoutBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginTop: 8 },
  emptySub: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  historyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  itemId: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  itemAmount: { color: '#F1F5F9', fontSize: 15, fontWeight: '900' },
  itemBadge: { fontSize: 11, fontWeight: '800', marginTop: 2 },
});
