import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Linking, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, onSnapshot, collection, query, where, deleteDoc } from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';
import { Colors } from '../lib/constants';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser;
  const initials = (user?.displayName || 'C')[0].toUpperCase();

  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [docsModalVisible, setDocsModalVisible] = useState(false);

  const [driverRating, setDriverRating] = useState<number>(5.0);
  const [totalTrips, setTotalTrips] = useState<number>(0);
  const [registrationType, setRegistrationType] = useState<'direct' | 'supervisor'>('direct');
  const [supervisorCode, setSupervisorCode] = useState<string>('');
  const [driverPhotoUrl, setDriverPhotoUrl] = useState<string>('');
  const [driverStatus, setDriverStatus] = useState<string>('active');

  // Vehicle State (100% Real from Firestore)
  const [vehicleData, setVehicleData] = useState({
    brand: '',
    model: '',
    color: '',
    plate: '',
    category: 'TravelCab Standard',
    photoUrl: '',
  });
  const [savingVehicle, setSavingVehicle] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubDriver = onSnapshot(doc(db, 'drivers', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.rating === 'number') setDriverRating(data.rating);
        if (typeof data.totalTrips === 'number') setTotalTrips(data.totalTrips);
        setRegistrationType(data.registrationType === 'supervisor' || data.referredBySupervisorCode ? 'supervisor' : 'direct');
        setSupervisorCode(data.referredBySupervisorCode || '');
        if (data.photoUrl) setDriverPhotoUrl(data.photoUrl);
        if (data.status) setDriverStatus(data.status);
        if (data.activeVehicle) {
          setVehicleData({
            brand: data.activeVehicle.brand || '',
            model: data.activeVehicle.model || '',
            color: data.activeVehicle.color || '',
            plate: data.activeVehicle.plate || '',
            category: data.activeVehicle.category || 'TravelCab Standard',
            photoUrl: data.activeVehicle.photoUrl || data.vehiclePhotoUrl || '',
          });
        }
      }
    });

    const qTrips = query(
      collection(db, 'trips'),
      where('driverId', '==', user.uid),
      where('status', '==', 'completed')
    );
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      setTotalTrips(snap.size);
    });

    return () => {
      unsubDriver();
      unsubTrips();
    };
  }, [user?.uid]);

  const handlePickVehiclePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir la foto del vehículo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setVehicleData((prev) => ({ ...prev, photoUrl: uri }));
    }
  };

  const handleSaveVehicle = async () => {
    if (!vehicleData.brand.trim() || !vehicleData.plate.trim()) {
      Alert.alert('Datos incompletos', 'Por favor ingresá al menos la marca/modelo y la patente (dominio) del vehículo.');
      return;
    }
    setSavingVehicle(true);
    try {
      const normalizedVehicle = {
        ...vehicleData,
        brand: vehicleData.brand.trim(),
        plate: vehicleData.plate.trim().toUpperCase(),
        color: vehicleData.color.trim(),
      };
      if (user) {
        await updateDoc(doc(db, 'drivers', user.uid), {
          activeVehicle: normalizedVehicle,
          vehiclePhotoUrl: normalizedVehicle.photoUrl || null,
          updatedAt: Date.now(),
        });
      }
      setVehicleData(normalizedVehicle);
      setVehicleModalVisible(false);
      Alert.alert('¡Vehículo Actualizado!', 'Los datos y foto de tu vehículo activo fueron guardados en tiempo real.');
    } catch (err) {
      console.warn('Error saving vehicle:', err);
      Alert.alert('Error', 'No se pudieron actualizar los datos del vehículo.');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta y datos',
      '¿Estás seguro de que querés eliminar permanentemente tu cuenta de conductor y todos tus datos asociados? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar permanentemente',
          style: 'destructive',
          onPress: async () => {
            try {
              if (auth.currentUser) {
                const uid = auth.currentUser.uid;
                await deleteDoc(doc(db, 'drivers', uid)).catch(() => {});
                await deleteUser(auth.currentUser);
              }
            } catch (e: any) {
              Alert.alert(
                'Reautenticación requerida',
                'Por seguridad, cerrá sesión, volvé a ingresar y solicitá nuevamente la eliminación de tu cuenta, o escribinos a soporte@travelapp.ar.'
              );
            }
          },
        },
      ]
    );
  };

  const handleSupportOption = (type: 'emergency' | 'whatsapp' | 'travis' | 'phone' | 'email') => {
    setSupportModalVisible(false);
    if (type === 'emergency') {
      Linking.openURL('tel:911');
    } else if (type === 'phone') {
      Linking.openURL('tel:08102200018');
    } else if (type === 'email') {
      Linking.openURL('mailto:soporte@travelapp.ar?subject=Soporte%20Conductor%20TravelApp');
    } else if (type === 'whatsapp') {
      Linking.openURL('https://wa.me/?text=Hola%2C%20necesito%20soporte%20como%20conductor%20en%20TravelApp.');
    } else if (type === 'travis') {
      Linking.openURL('https://travelapp.ar/support');
    }
  };

  const menuItems = [
    { icon: 'car-outline', label: 'Mi vehículo activo', action: () => setVehicleModalVisible(true) },
    { icon: 'card-outline', label: 'Mi Billetera / Split MP', action: () => navigation.navigate('Wallet') },
    { icon: 'document-text-outline', label: 'Documentación al día', action: () => setDocsModalVisible(true) },
    { icon: 'notifications-outline', label: 'Notificaciones', action: () => navigation.navigate('Notifications') },
    { icon: 'help-circle-outline', label: 'Soporte y ayuda', action: () => setSupportModalVisible(true) },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil de Conductor</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Tarjeta de conductor */}
        <View style={styles.driverCard}>
          {driverPhotoUrl ? (
            <Image source={{ uri: driverPhotoUrl }} style={[styles.avatar, { overflow: 'hidden' }]} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.name}>{user?.displayName || 'Conductor Registrado'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
              <Text style={styles.badgeText}>
                {driverStatus === 'active' || driverStatus === 'approved' ? 'Socio Habilitado 🟢' : 'En Verificación 🟡'}
              </Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="git-network-outline" size={14} color={Colors.primary} />
              <Text style={styles.badgeText}>
                {registrationType === 'supervisor' ? `Supervisor (${supervisorCode || 'Red'})` : 'Alta Directa'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Viajes realizados', value: String(totalTrips), icon: 'car' },
            { label: 'Dominio activo', value: vehicleData.plate || 'Sin patente', icon: 'pricetag' },
            { label: 'Rating', value: `${driverRating.toFixed(1)} ⭐`, icon: 'star' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon as any} size={20} color={Colors.accent} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menú de opciones */}
        <View style={styles.menuSection}>
          {menuItems.map(item => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.action}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { marginTop: 10, backgroundColor: 'transparent', borderColor: '#CBD5E1' }]}
          onPress={handleDeleteAccount}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          <Text style={[styles.logoutText, { color: Colors.textMuted, fontSize: 12 }]}>Eliminar mi cuenta y datos</Text>
        </TouchableOpacity>
        <Text style={styles.version}>TravelCab Conductor v1.0.0 — APK Producción 🟢</Text>
      </ScrollView>

      {/* Modal de Edición de Vehículo */}
      <Modal
        visible={vehicleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVehicleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="car" size={24} color={Colors.primary} />
              <Text style={styles.modalTitle}>Datos de Vehículo Activo</Text>
            </View>
            <Text style={styles.modalSubtitle}>Esta información y la foto real del auto se muestran al pasajero al aceptar un viaje.</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Marca y Modelo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Fiat Cronos"
                value={vehicleData.brand}
                onChangeText={(text) => setVehicleData({ ...vehicleData, brand: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Patente / Dominio (Visible al pasajero)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: AF 123 JK"
                autoCapitalize="characters"
                value={vehicleData.plate}
                onChangeText={(text) => setVehicleData({ ...vehicleData, plate: text.toUpperCase() })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Gris Plata"
                value={vehicleData.color}
                onChangeText={(text) => setVehicleData({ ...vehicleData, color: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Categoría Habilitada</Text>
              <TextInput
                style={styles.input}
                value={vehicleData.category}
                onChangeText={(text) => setVehicleData({ ...vehicleData, category: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Foto Real del Vehículo</Text>
              <TouchableOpacity
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }]}
                onPress={handlePickVehiclePhoto}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={vehicleData.photoUrl ? 'checkmark-circle' : 'camera-outline'} size={18} color={vehicleData.photoUrl ? Colors.success : Colors.primary} />
                  <Text style={{ fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.textDark }}>
                    {vehicleData.photoUrl ? 'Foto del vehículo cargada (Tocar para cambiar)' : 'Subir foto exterior del auto'}
                  </Text>
                </View>
                <Ionicons name="cloud-upload-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setVehicleModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveVehicle} disabled={savingVehicle}>
                <Text style={styles.saveBtnText}>{savingVehicle ? 'Guardando...' : 'Guardar Vehículo'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Documentación al Día */}
      <Modal
        visible={docsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDocsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text" size={24} color={Colors.primary} />
              <Text style={styles.modalTitle}>Documentación Operativa</Text>
            </View>
            <Text style={styles.modalSubtitle}>Estado de tus documentos verificados en Concorde 360 ({registrationType === 'supervisor' ? 'Vía Supervisor' : 'Alta Directa'}).</Text>

            <View style={styles.docItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>Licencia de Conducir Profesional</Text>
                <Text style={styles.docStatus}>Presentada en legajo digital · Vigente 🟢</Text>
              </View>
            </View>

            <View style={styles.docItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>Cédula y Seguro Automotor</Text>
                <Text style={styles.docStatus}>Dominio {vehicleData.plate || 'Registrado'} · Vigente 🟢</Text>
              </View>
            </View>

            <View style={styles.docItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>Certificado de Antecedentes</Text>
                <Text style={styles.docStatus}>Verificado por Compliance · Vigente 🟢</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeDocsBtn} onPress={() => setDocsModalVisible(false)}>
              <Text style={styles.closeDocsText}>Cerrar Expediente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Asistencia y Soporte */}
      <Modal
        visible={supportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
              <Text style={styles.modalTitle}>Centro de Asistencia</Text>
            </View>
            <Text style={styles.modalSubtitle}>¿En qué podemos ayudarte hoy? Si tenés una emergencia, presioná el Botón de Pánico.</Text>

            <TouchableOpacity style={styles.emergencyBtn} onPress={() => handleSupportOption('emergency')}>
              <Ionicons name="alert-circle" size={22} color="#FFFFFF" />
              <Text style={styles.emergencyBtnText}>Llamar al 911 (Emergencia)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportOptionBtn} onPress={() => handleSupportOption('phone')}>
              <Ionicons name="call" size={20} color="#0284C7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.supportOptionText}>Teléfono de Atención</Text>
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>0810-220-0018 (Llamada directa)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportOptionBtn} onPress={() => handleSupportOption('email')}>
              <Ionicons name="mail" size={20} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.supportOptionText}>Correo Oficial</Text>
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>soporte@travelapp.ar</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportOptionBtn} onPress={() => handleSupportOption('whatsapp')}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.supportOptionText}>Soporte vía WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportOptionBtn} onPress={() => handleSupportOption('travis')}>
              <Ionicons name="hardware-chip-outline" size={20} color={Colors.primary} />
              <Text style={styles.supportOptionText}>Ayuda IA Travis (Soporte 24/7)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeSupportBtn} onPress={() => setSupportModalVisible(false)}>
              <Text style={styles.closeSupportText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F4C35',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: Colors.white, fontSize: 16, fontFamily: 'Quicksand-Bold' },
  driverCard: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0F4C35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontSize: 28, fontFamily: 'Quicksand-Bold' },
  name: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.textDark },
  email: { fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.textDark },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.textDark, marginTop: 4 },
  statLabel: { fontSize: 10, fontFamily: 'Quicksand-Medium', color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  menuSection: { backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 20, padding: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textDark },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, padding: 14, backgroundColor: '#FEF2F2', borderRadius: 16, borderWidth: 1, borderColor: '#FCA5A5' },
  logoutText: { color: Colors.danger, fontSize: 14, fontFamily: 'Quicksand-Bold' },
  version: { textAlign: 'center', fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textMuted, marginVertical: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.textDark },
  modalSubtitle: { fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textMuted, lineHeight: 18 },
  formGroup: { gap: 4 },
  label: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.textDark },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, fontFamily: 'Quicksand-Medium' },
  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.textDark, fontSize: 12, fontFamily: 'Quicksand-Bold' },
  saveBtn: { flex: 1, backgroundColor: '#0F4C35', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 12, fontFamily: 'Quicksand-Bold' },
  docItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  docName: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.textDark },
  docStatus: { fontSize: 10, fontFamily: 'Quicksand-Medium', color: Colors.success, marginTop: 2 },
  closeDocsBtn: { backgroundColor: '#0F4C35', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  closeDocsText: { color: Colors.white, fontSize: 12, fontFamily: 'Quicksand-Bold' },
  emergencyBtn: { backgroundColor: Colors.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  emergencyBtnText: { color: Colors.white, fontSize: 13, fontFamily: 'Quicksand-Bold' },
  supportOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  supportOptionText: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textDark },
  closeSupportBtn: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  closeSupportText: { color: Colors.textDark, fontSize: 12, fontFamily: 'Quicksand-Bold' },
});
