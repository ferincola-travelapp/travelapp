import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  getOrInitSupervisorProfile,
  subscribeToRealFleet,
  SupervisorData,
  FleetMetrics,
  DriverItem,
} from '../lib/supervisorService';

export default function HomeScreen({ navigation }: any) {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);

  // Perfil del supervisor
  const [supervisor, setSupervisor] = useState<SupervisorData>({
    uid: auth.currentUser?.uid || '',
    name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Supervisor',
    email: auth.currentUser?.email || '',
    phone: '',
    supervisorCode: 'CARGANDO...',
    downloadUrl: 'https://travelapp.ar/descargas/conductor',
    qrImageUrl: '',
  });

  // Métricas 100% REALES de Firestore (inician en 0)
  const [metrics, setMetrics] = useState<FleetMetrics>({
    totalRecruited: 0,
    activeDriversToday: 0,
    fleetRevenueMonth: 0,
    companyFee: 0,
    supervisorCommission: 0,
  });

  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // 1. Cargar perfil real del supervisor
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const prof = await getOrInitSupervisorProfile();
        if (prof && isMounted) {
          setSupervisor(prof);
        }
      } catch (err: any) {
        if (err?.message === 'UNAUTHORIZED_ROLE') {
          Alert.alert(
            'Acceso Restringido',
            'Tu cuenta no posee permisos de Supervisión de Flota.'
          );
          await signOut(auth).catch(() => {});
          return;
        }
        console.warn('Error cargando perfil de supervisor:', err);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Suscribirse a la flota real de Firestore
  useEffect(() => {
    const uid = auth.currentUser?.uid || '';
    const unsub = subscribeToRealFleet(uid, (realDrivers, realMetrics) => {
      setDrivers(realDrivers);
      setMetrics(realMetrics);
    });

    return () => unsub();
  }, []);

  // Compartir enlace con código único
  const handleShareLink = async () => {
    try {
      await Share.share({
        title: 'Alta de Conductor - TravelApp',
        message: `¡Hola! Descargá la app de conductores de TravelApp y quedá asignado a mi equipo con el código oficial ${supervisor.supervisorCode}:\n${supervisor.downloadUrl}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar Cuenta Definitivamente',
      '¿Estás seguro de que deseás eliminar tu cuenta de Supervisor y tus datos asociados? Esta acción es permanente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Mi Cuenta',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                await deleteDoc(doc(db, 'supervisors', user.uid)).catch(() => {});
                await deleteDoc(doc(db, 'users', user.uid)).catch(() => {});
                await user.delete();
              }
            } catch (e: any) {
              Alert.alert(
                'Seguridad de Cuenta',
                'Para eliminar tu cuenta definitivamente, cerrá sesión, volvé a ingresar y repetí la operación.'
              );
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Cuenta de Supervisión', 'Seleccioná una acción para tu sesión actual:', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar Cuenta',
        style: 'destructive',
        onPress: handleDeleteAccount,
      },
      {
        text: 'Cerrar Sesión',
        onPress: () => signOut(auth),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.badge}>SUPERVISOR DE FLOTA</Text>
          <Text style={styles.greeting} numberOfLines={1}>
            Hola, {supervisor.name}
          </Text>
          <Text style={styles.subgreeting}>
            Código Único:{' '}
            <Text style={{ color: '#F59E0B', fontWeight: '800' }}>{supervisor.supervisorCode}</Text>
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => setQrModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={22} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.qrButton, { borderColor: '#475569' }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Balance Card (100% Real) */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>MI COMISIÓN ACUMULADA (MES)</Text>
        <Text style={styles.balanceAmount}>
          ${metrics.supervisorCommission.toLocaleString('es-AR')}
        </Text>
        <Text style={styles.balanceDetail}>
          10% del Fee Empresa (${metrics.companyFee.toLocaleString('es-AR')})
        </Text>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('WalletSupervisor', { metrics })}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>Solicitar Retiro de Haberes</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid (100% Real) */}
      <View style={styles.grid}>
        <View style={styles.card}>
          <Ionicons name="car-sport-outline" size={22} color="#10B981" />
          <Text style={styles.cardValue}>
            {metrics.activeDriversToday} / {metrics.totalRecruited}
          </Text>
          <Text style={styles.cardLabel}>Activos Hoy</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="cash-outline" size={22} color="#3B82F6" />
          <Text style={styles.cardValue}>
            ${(metrics.fleetRevenueMonth / 1000).toFixed(0)}k
          </Text>
          <Text style={styles.cardLabel}>Recaudación Mes</Text>
        </View>
      </View>

      {/* Hero Banner: Geolocalización en Tiempo Real */}
      <TouchableOpacity
        style={styles.mapHeroCard}
        onPress={() => navigation.navigate('FleetMap')}
        activeOpacity={0.85}
      >
        <View style={styles.mapHeroHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.mapHeroIconBox}>
              <Ionicons name="map" size={24} color="#38BDF8" />
            </View>
            <View>
              <Text style={styles.mapHeroTitle}>Geolocalización de Flota</Text>
              <Text style={styles.mapHeroSub}>Monitoreo satelital y rutas en vivo</Text>
            </View>
          </View>
          <View style={styles.mapLiveBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.mapLiveText}>EN VIVO</Text>
          </View>
        </View>
        <View style={styles.mapHeroFooter}>
          <Text style={styles.mapHeroCta}>
            {metrics.activeDriversToday > 0
              ? `Ver ${metrics.activeDriversToday} choferes en mapa`
              : 'Abrir Mapa de Flota'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#38BDF8" />
        </View>
      </TouchableOpacity>

      {/* Action Quick Links */}
      <Text style={styles.sectionTitle}>Gestión de Flota</Text>

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => navigation.navigate('DriversList', { drivers })}
        activeOpacity={0.8}
      >
        <View style={styles.menuIconContainer}>
          <Ionicons name="people-outline" size={22} color="#3B82F6" />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Conductores a Cargo ({metrics.totalRecruited})</Text>
          <Text style={styles.menuSubtitle}>Ver choferes, saldos y viajes realizados</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => navigation.navigate('DocumentAlerts', { drivers })}
        activeOpacity={0.8}
      >
        <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
          <Ionicons name="alert-circle-outline" size={22} color="#F59E0B" />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Semáforo de Vencimientos</Text>
          <Text style={styles.menuSubtitle}>Control de licencias, seguros y RTO</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => navigation.navigate('Messaging', { totalDrivers: metrics.totalRecruited })}
        activeOpacity={0.8}
      >
        <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
          <Ionicons name="chatbubbles-outline" size={22} color="#A855F7" />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Centro de Mensajería</Text>
          <Text style={styles.menuSubtitle}>Enviar avisos broadcast o chat directo</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      </TouchableOpacity>

      {/* QR & Código Único Modal 100% REAL */}
      <Modal visible={qrModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>QR Único de Alta</Text>
                <Text style={styles.modalSub}>
                  Los choferes que escaneen este código o abran el link quedarán asignados a tu
                  supervisión.
                </Text>
              </View>
            </View>

            {/* QR Real Generado */}
            <View style={styles.qrContainer}>
              {supervisor.qrImageUrl ? (
                <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center' }}>
                  {qrLoading && (
                    <ActivityIndicator size="small" color="#F59E0B" style={{ position: 'absolute' }} />
                  )}
                  <Image
                    source={{ uri: supervisor.qrImageUrl }}
                    style={{ width: 220, height: 220, borderRadius: 12 }}
                    onLoadEnd={() => setQrLoading(false)}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#F59E0B" />
                </View>
              )}
            </View>

            {/* Código Único del Supervisor */}
            <View style={styles.codeBadge}>
              <Text style={styles.codeLabel}>CÓDIGO ÚNICO DE SUPERVISOR</Text>
              <Text style={styles.codeText}>{supervisor.supervisorCode}</Text>
            </View>

            <Text style={styles.urlText} numberOfLines={1}>
              {supervisor.downloadUrl}
            </Text>

            {/* Botones de acción */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShareLink}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                <Text style={styles.shareBtnText}>Compartir Enlace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setQrModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: { color: '#F59E0B', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  greeting: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  subgreeting: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  qrButton: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  balanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  balanceLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
  balanceAmount: { color: '#F59E0B', fontSize: 32, fontWeight: '900', marginVertical: 4 },
  balanceDetail: { color: '#CBD5E1', fontSize: 12, marginBottom: 16 },
  actionBtn: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: { flex: 1, backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  cardValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 8 },
  cardLabel: { color: '#94A3B8', fontSize: 11 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  menuSubtitle: { color: '#94A3B8', fontSize: 11 },
  mapHeroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    marginBottom: 24,
  },
  mapHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mapHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapHeroTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  mapHeroSub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  mapLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  mapLiveText: { color: '#10B981', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  mapHeroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  mapHeroCta: { color: '#38BDF8', fontSize: 13, fontWeight: '800' },

  // Modal QR
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: { marginBottom: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  modalSub: { color: '#94A3B8', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  codeBadge: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
  },
  codeLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  codeText: { color: '#F59E0B', fontWeight: '900', fontSize: 18, letterSpacing: 1.5 },
  urlText: { color: '#64748B', fontSize: 11, marginBottom: 18, textAlign: 'center' },
  modalActionsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  shareBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  shareBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  closeBtn: {
    backgroundColor: '#334155',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
