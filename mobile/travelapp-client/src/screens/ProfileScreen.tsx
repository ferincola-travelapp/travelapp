import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../lib/firebase';
import { Colors } from '../lib/constants';
import { doc, onSnapshot, collection, query, where, deleteDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';

const MENU_ITEMS = [
  { icon: 'person-circle-outline', label: 'Ficha de Cliente (Datos & Familia)', route: 'CompleteProfile', highlight: true },
  { icon: 'headset-outline', label: 'Atención al Cliente (0810 / WhatsApp / Mail)', action: 'support' },
  { icon: 'shield-checkmark-outline', label: 'Centro de Seguridad & SOS', action: 'safety' },
  { icon: 'star-outline', label: 'Mis rewards', route: 'Rewards' },
  { icon: 'time-outline', label: 'Historial de viajes', route: 'History' },
  { icon: 'chatbubbles-outline', label: 'Asistente Virtual (Travis AI)', route: 'Chat' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser;
  const [points, setPoints] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [customerLevel, setCustomerLevel] = useState<number>(1);
  const [progress, setProgress] = useState<number>(30);
  const [familyCount, setFamilyCount] = useState<number>(0);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPoints(Number(data.rewardsPoints) || 0);
          if (data.customerLevel !== undefined) {
            setCustomerLevel(data.customerLevel);
          }
          if (data.profileCompletedPercentage !== undefined) {
            setProgress(data.profileCompletedPercentage);
          }
          if (Array.isArray(data.familyMembers)) {
            setFamilyCount(data.familyMembers.length);
          }
        }
      });

      const qTrips = query(collection(db, 'trips'), where('passengerId', '==', user.uid));
      const unsubTrips = onSnapshot(qTrips, (snap) => {
        setTripsCount(snap.size);
      });

      return () => {
        unsubUser();
        unsubTrips();
      };
    }
  }, [user?.uid]);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => auth.signOut(),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar mi cuenta',
      '¿Estás seguro de que deseás eliminar permanentemente tu cuenta y tus datos de TravelApp? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Cuenta',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUser = auth.currentUser;
              if (!currentUser) return;
              await deleteDoc(doc(db, 'users', currentUser.uid)).catch(() => {});
              try {
                await deleteUser(currentUser);
              } catch {
                await auth.signOut();
              }
            } catch {
              Alert.alert('Aviso', 'Por seguridad, iniciá sesión nuevamente antes de eliminar tu cuenta.');
            }
          },
        },
      ]
    );
  };

  const handleSupportAction = (type: 'phone' | 'email' | 'whatsapp' | 'travis' | 'emergency') => {
    setSupportModalVisible(false);
    if (type === 'phone') {
      Linking.openURL('tel:08102200018');
    } else if (type === 'email') {
      Linking.openURL('mailto:soporte@travelapp.ar?subject=Consulta%20desde%20TravelApp%20Cliente');
    } else if (type === 'whatsapp') {
      Linking.openURL('https://wa.me/?text=Hola%20TravelApp%2C%20necesito%20atenci%C3%B3n%20al%20cliente%20con%20mi%20cuenta.');
    } else if (type === 'travis') {
      navigation.navigate('Chat');
    } else if (type === 'emergency') {
      Linking.openURL('tel:911');
    }
  };

  const initials = (user?.displayName || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const isVIP = customerLevel === 2 || progress === 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.displayName || 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          {/* VIP Level Badge */}
          <View style={[styles.levelBadge, isVIP ? styles.levelBadgeVip : styles.levelBadgeBasic]}>
            <Ionicons name={isVIP ? "sparkles" : "shield-outline"} size={14} color={isVIP ? "#D97706" : Colors.textSecondary} />
            <Text style={[styles.levelBadgeText, isVIP ? styles.levelBadgeTextVip : styles.levelBadgeTextBasic]}>
              {isVIP ? 'Cliente VIP Nivel 2' : 'Cliente Básico Nivel 1'}
            </Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{tripsCount}</Text>
              <Text style={styles.statLabel}>Viajes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{points}</Text>
              <Text style={styles.statLabel}>Puntos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{familyCount}</Text>
              <Text style={styles.statLabel}>Familiares</Text>
            </View>
          </View>
        </View>

        {/* Tarjeta de Acción: Completar Perfil de Pasajero y Familia */}
        <TouchableOpacity
          style={styles.bannerCard}
          onPress={() => navigation.navigate('CompleteProfile')}
          activeOpacity={0.88}
        >
          <View style={styles.bannerHeader}>
            <View style={styles.bannerIconBox}>
              <Ionicons name="airplane" size={22} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {isVIP ? 'Ficha de Cliente Activa' : 'Completar Ficha de Cliente'}
              </Text>
              <Text style={styles.bannerSub}>
                {isVIP
                  ? `${familyCount} acompañantes · DNI/Pasaporte y AFIP al día`
                  : 'Completá tu DNI, datos fiscales, grupo familiar y ficha médica'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.accent} />
          </View>

          <View style={styles.bannerProgressRow}>
            <View style={styles.bannerTrack}>
              <View style={[styles.bannerFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.bannerProgressText}>{progress}% completo</Text>
          </View>
        </TouchableOpacity>

        {/* Menú */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label + idx}
              style={[styles.menuItem, item.highlight && styles.menuItemHighlight]}
              onPress={() => {
                if (item.action === 'support') {
                  setSupportModalVisible(true);
                } else if (item.action === 'safety') {
                  setSafetyModalVisible(true);
                } else if (item.route) {
                  navigation.navigate(item.route);
                }
              }}>
              <View style={[styles.menuIconWrap, item.highlight && { backgroundColor: Colors.accent + '15' }]}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={item.highlight ? Colors.accent : Colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, item.highlight && { fontWeight: '700', color: Colors.textPrimary }]}>
                  {item.label}
                </Text>
                {item.highlight && (
                  <Text style={{ fontSize: 11, color: Colors.accent, fontWeight: '600' }}>
                    {isVIP ? 'Perfil Completo (VIP Nivel 2)' : 'Completar ahora para beneficios'}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Eliminar Cuenta (Requisito Oficial Google Play) */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: '#CBD5E1', marginTop: 0 }]}
          onPress={handleDeleteAccount}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          <Text style={[styles.logoutText, { color: Colors.textMuted, fontSize: 13 }]}>
            Eliminar mi cuenta y datos
          </Text>
        </TouchableOpacity>

        <Text style={styles.version}>TravelApp v1.0.0 · Producción Segura</Text>
      </ScrollView>

      {/* Modal de Atención al Cliente */}
      <Modal
        visible={supportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBadge}>
                <Ionicons name="headset" size={26} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Atención al Cliente</Text>
                <Text style={styles.modalSubtitle}>Estamos disponibles 24/7 para asistirte</Text>
              </View>
              <TouchableOpacity onPress={() => setSupportModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.supportOptionsList}>
              <TouchableOpacity
                style={styles.supportChannelBtn}
                onPress={() => handleSupportAction('phone')}
                activeOpacity={0.8}
              >
                <View style={[styles.channelIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="call" size={22} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelTitle}>Teléfono de Atención</Text>
                  <Text style={styles.channelValue}>0810-220-0018</Text>
                  <Text style={styles.channelSub}>Llamada directa sin costo adicional</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.supportChannelBtn}
                onPress={() => handleSupportAction('email')}
                activeOpacity={0.8}
              >
                <View style={[styles.channelIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="mail" size={22} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelTitle}>Correo Electrónico</Text>
                  <Text style={styles.channelValue}>soporte@travelapp.ar</Text>
                  <Text style={styles.channelSub}>Respuesta y seguimiento oficial</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.supportChannelBtn}
                onPress={() => handleSupportAction('whatsapp')}
                activeOpacity={0.8}
              >
                <View style={[styles.channelIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelTitle}>WhatsApp Oficial</Text>
                  <Text style={styles.channelValue}>Chat con Operador en Vivo</Text>
                  <Text style={styles.channelSub}>Atención ágil e inmediata</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.supportChannelBtn}
                onPress={() => handleSupportAction('travis')}
                activeOpacity={0.8}
              >
                <View style={[styles.channelIconWrap, { backgroundColor: Colors.primary + '18' }]}>
                  <Ionicons name="sparkles" size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelTitle}>Asistente Virtual Travis AI</Text>
                  <Text style={styles.channelValue}>Chat Inteligente 24/7</Text>
                  <Text style={styles.channelSub}>Consultas sobre viajes, tarifas y cuenta</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emergencySupportBtn}
                onPress={() => handleSupportAction('emergency')}
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle" size={20} color={Colors.white} />
                <Text style={styles.emergencySupportText}>Línea de Emergencias 911</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Centro de Seguridad */}
      <Modal
        visible={safetyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSafetyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBadge, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="shield-checkmark" size={26} color={Colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Centro de Seguridad</Text>
                <Text style={styles.modalSubtitle}>Tu bienestar y tranquilidad son prioridad</Text>
              </View>
              <TouchableOpacity onPress={() => setSafetyModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.safetyInfoCard}>
              <View style={styles.safetyInfoRow}>
                <Ionicons name="mic-circle" size={24} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.safetyInfoTitle}>Grabación de Audio en Cabina</Text>
                  <Text style={styles.safetyInfoDesc}>Durante cualquier viaje podés activar el micrófono para respaldar el audio del recorrido con encriptación segura.</Text>
                </View>
              </View>

              <View style={styles.safetyInfoRow}>
                <Ionicons name="keypad" size={24} color={Colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.safetyInfoTitle}>Código PIN Anti-Impostores</Text>
                  <Text style={styles.safetyInfoDesc}>Al asignar un conductor, tu app genera un código de 4 dígitos para que el chofer verifique tu identidad antes de arrancar.</Text>
                </View>
              </View>

              <View style={styles.safetyInfoRow}>
                <Ionicons name="share-social" size={24} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.safetyInfoTitle}>Seguimiento en Vivo por WhatsApp</Text>
                  <Text style={styles.safetyInfoDesc}>Compartí tu recorrido en tiempo real con familiares para que vean el avance del auto en el mapa.</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.emergencySupportBtn}
              onPress={() => {
                setSafetyModalVisible(false);
                Linking.openURL('tel:911');
              }}
            >
              <Ionicons name="call" size={20} color={Colors.white} />
              <Text style={styles.emergencySupportText}>Llamar al 911 Inmediatamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  profileSection: {
    alignItems: 'center', backgroundColor: Colors.white, paddingVertical: 28,
    paddingHorizontal: 20, marginBottom: 12,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: Colors.white },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  email: { fontSize: 14, color: Colors.textSecondary, marginTop: 2, marginBottom: 10 },

  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  levelBadgeVip: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  levelBadgeBasic: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },
  levelBadgeTextVip: { color: '#B45309' },
  levelBadgeTextBasic: { color: '#64748B' },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  bannerCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: Colors.accent + '30',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  bannerSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  bannerProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerTrack: { flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  bannerFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  bannerProgressText: { fontSize: 11, fontWeight: '700', color: Colors.accent },

  menuSection: { backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuItemHighlight: { backgroundColor: '#FFFBF5' },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, color: Colors.textPrimary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.danger, marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.danger },
  version: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, marginBottom: 32 },

  // Modals de Soporte y Seguridad
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  modalIconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  modalCloseBtn: { padding: 4 },

  supportOptionsList: { gap: 10 },
  supportChannelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  channelIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  channelTitle: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  channelValue: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginTop: 1 },
  channelSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  emergencySupportBtn: {
    backgroundColor: Colors.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 6,
  },
  emergencySupportText: { color: Colors.white, fontSize: 14, fontWeight: '800' },

  safetyInfoCard: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 14 },
  safetyInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  safetyInfoTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  safetyInfoDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
});
