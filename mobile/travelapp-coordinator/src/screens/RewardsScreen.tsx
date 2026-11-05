import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Colors } from '../lib/constants';

const TIERS = [
  { name: 'Explorer', minPoints: 0, maxPoints: 499, color: '#94A3B8', icon: 'leaf' },
  { name: 'Traveler', minPoints: 500, maxPoints: 1499, color: Colors.accent, icon: 'airplane' },
  { name: 'Premium', minPoints: 1500, maxPoints: 2999, color: Colors.primary, icon: 'star' },
  { name: 'Elite', minPoints: 3000, maxPoints: 99999, color: '#7C3AED', icon: 'diamond' },
];

const BENEFITS = [
  { icon: 'car-outline', label: 'Descuentos en viajes', desc: 'Hasta 15% off en cada viaje' },
  { icon: 'gift-outline', label: 'Canjes de puntos', desc: 'Por viajes gratis y experiencias' },
  { icon: 'flash-outline', label: 'Prioridad de asignación', desc: 'Conductor asignado más rápido' },
  { icon: 'shield-checkmark-outline', label: 'Cobertura premium', desc: 'Seguro adicional en cada viaje' },
];

export default function RewardsScreen() {
  const navigation = useNavigation<any>();
  const [userPoints, setUserPoints] = useState<number>(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const pts = Number(data.rewardsPoints ?? data.points ?? 0);
        if (!isNaN(pts)) setUserPoints(pts);
      }
    });
    return () => unsub();
  }, []);
  const currentTier = TIERS.find(t => userPoints >= t.minPoints && userPoints <= t.maxPoints) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const progress = nextTier
    ? (userPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)
    : 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Rewards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Tarjeta principal */}
        <View style={[styles.rewardCard, { backgroundColor: currentTier.color }]}>
          <View style={styles.tierBadge}>
            <Ionicons name={currentTier.icon as any} size={20} color={Colors.white} />
            <Text style={styles.tierName}>{currentTier.name}</Text>
          </View>
          <Text style={styles.points}>{userPoints.toLocaleString()}</Text>
          <Text style={styles.pointsLabel}>puntos acumulados</Text>

          {nextTier && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {nextTier.minPoints - userPoints} puntos para {nextTier.name}
              </Text>
            </View>
          )}
        </View>

        {/* Niveles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Niveles</Text>
          <View style={styles.tiersGrid}>
            {TIERS.map(tier => (
              <View key={tier.name} style={[styles.tierCard, { borderColor: tier.color, opacity: userPoints >= tier.minPoints ? 1 : 0.4 }]}>
                <Ionicons name={tier.icon as any} size={22} color={tier.color} />
                <Text style={[styles.tierCardName, { color: tier.color }]}>{tier.name}</Text>
                <Text style={styles.tierCardMin}>{tier.minPoints}+ pts</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Beneficios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus beneficios</Text>
          {BENEFITS.map(benefit => (
            <View key={benefit.label} style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon as any} size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitLabel}>{benefit.label}</Text>
                <Text style={styles.benefitDesc}>{benefit.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
          ))}
        </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  rewardCard: {
    margin: 20, borderRadius: 24, padding: 28, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, elevation: 8,
  },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  tierName: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  points: { fontSize: 52, fontWeight: '900', color: Colors.white, lineHeight: 60 },
  pointsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  progressContainer: { width: '100%', gap: 6, marginTop: 8 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: Colors.white, borderRadius: 3 },
  progressText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  tiersGrid: { flexDirection: 'row', gap: 10 },
  tierCard: {
    flex: 1, alignItems: 'center', gap: 4, padding: 12,
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 2,
  },
  tierCardName: { fontSize: 12, fontWeight: '700' },
  tierCardMin: { fontSize: 10, color: Colors.textMuted },
  benefitCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, elevation: 1,
  },
  benefitIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  benefitLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  benefitDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
