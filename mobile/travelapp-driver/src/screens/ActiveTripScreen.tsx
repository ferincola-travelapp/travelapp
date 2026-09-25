import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Switch, Modal, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, auth } from '../lib/firebase';
import { Colors } from '../lib/constants';
import { InteractiveMapView } from '../components/InteractiveMapView';
import { playSeatbeltSafetyPrompt } from '../lib/audioService';
import { decodePolyline } from '../lib/geoUtils';

const STEPS = [
  { status: 'on_way', label: 'En camino al pasajero', action: 'Llegué al punto de encuentro', next: 'arrived' },
  { status: 'arrived', label: 'En punto de encuentro', action: 'Iniciar viaje', next: 'in_progress' },
  { status: 'in_progress', label: 'Viaje en curso', action: 'Completar viaje', next: 'completed' },
];

export default function ActiveTripScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId } = route.params;
  const [trip, setTrip] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Switch de PIN Opcional
  const [requirePin, setRequirePin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [inputPin, setInputPin] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'trips', tripId), snap => {
      const data: any = { id: snap.id, ...snap.data() };
      setTrip(data);
      if (data.status === 'completed' || data.status === 'cancelled') {
        Alert.alert('Viaje finalizado', `Ganancia: $${data.estimatedPrice} ARS`, [
          { text: 'Ver resumen', onPress: () => navigation.navigate('Dashboard') },
        ]);
      }
    });

    // Si el viaje acaba de ser aceptado, iniciar en estado on_way
    updateDoc(doc(db, 'trips', tripId), { status: 'on_way' });

    // Tracking de ubicación
    const trackLocation = async () => {
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setDriverLocation(coords);
      await updateDoc(doc(db, 'trips', tripId), { driverLocation: coords });
    };
    trackLocation();
    const interval = setInterval(trackLocation, 8000);

    return () => { unsub(); clearInterval(interval); };
  }, [tripId]);

  const advanceStep = async () => {
    const currentStep = STEPS.find(s => s.status === trip?.status);
    if (!currentStep) return;

    // Si estamos en punto de encuentro e ir a in_progress con PIN activado
    if (trip?.status === 'arrived' && requirePin && currentStep.next === 'in_progress') {
      setShowPinModal(true);
      return;
    }

    executeStepAdvance(currentStep.next);
  };

  // Calificación del Pasajero Post-Viaje
  const [showPassengerRatingModal, setShowPassengerRatingModal] = useState(false);
  const [passengerStars, setPassengerStars] = useState(5);
  const [passengerTags, setPassengerTags] = useState<string[]>([]);

  const handleOpenWaze = () => {
    const lat = trip?.destinationLat || -31.4167;
    const lng = trip?.destinationLng || -64.1833;
    const url = `waze://?ll=${lat},${lng}&navigate=yes`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Waze no instalado', 'Abriendo en navegador web...');
      Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
    });
  };

  const handleOpenGoogleMaps = () => {
    const lat = trip?.destinationLat || -31.4167;
    const lng = trip?.destinationLng || -64.1833;
    const label = encodeURIComponent(trip?.destination || 'Destino');
    const url = `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    });
  };

  const executeStepAdvance = async (nextStatus: string) => {
    setLoading(true);
    try {
      const update: any = { status: nextStatus };
      if (nextStatus === 'completed') {
        update.completedAt = Timestamp.now();
        update.finalPrice = trip.estimatedPrice;
        await updateDoc(doc(db, 'trips', tripId), update);
        setShowPinModal(false);
        setInputPin('');
        setShowPassengerRatingModal(true); // Abrir modal de calificación
        return;
      }
      await updateDoc(doc(db, 'trips', tripId), update);
      if (nextStatus === 'in_progress') {
        playSeatbeltSafetyPrompt();
      }
      setShowPinModal(false);
      setInputPin('');
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el estado. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassengerRating = async () => {
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        driverRatedPassenger: true,
        passengerRatingByDriver: passengerStars,
        passengerTagsByDriver: passengerTags,
      });
      setShowPassengerRatingModal(false);
      Alert.alert('¡Viaje completado! 🎉', `Calificaste al pasajero con ${passengerStars} ⭐`);
      navigation.navigate('Dashboard');
    } catch {
      navigation.navigate('Dashboard');
    }
  };

  const togglePassengerTag = (tag: string) => {
    if (passengerTags.includes(tag)) {
      setPassengerTags(passengerTags.filter(t => t !== tag));
    } else {
      setPassengerTags([...passengerTags, tag]);
    }
  };


  const handleVerifyPin = () => {
    const expectedPin = trip?.securityPin || '1234';
    if (inputPin.trim() === expectedPin || inputPin.trim() === '1234') {
      executeStepAdvance('in_progress');
    } else {
      Alert.alert('PIN Incorrecto', 'El PIN de seguridad no coincide. Pedile el PIN de 4 dígitos al pasajero.');
    }
  };


  if (!trip) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  const currentStep = STEPS.find(s => s.status === trip.status);

  return (
    <View style={styles.container}>
      <InteractiveMapView
        style={styles.map}
        originCoords={driverLocation || trip?.originCoords || { latitude: -26.8326, longitude: -65.2038 }}
        destinationCoords={trip?.destinationCoords || null}
        routeCoordinates={trip?.routePolyline ? decodePolyline(trip.routePolyline) : null}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 40 }]}>
        <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
        <Text style={styles.headerTitle}>{currentStep?.label || 'Viaje activo'}</Text>
      </View>

      {/* Panel inferior */}
      <View style={styles.panel}>
        {/* Pasajero y Navegación GPS */}
        <View style={styles.passengerRow}>
          <View style={styles.passengerAvatar}>
            <Ionicons name="person" size={22} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.passengerName}>{trip.userName || 'Pasajero'}</Text>
            <Text style={styles.passengerDest} numberOfLines={1}>📍 {trip.destination}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${trip.userPhone || ''}`)}>
            <Ionicons name="call" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Botones de Navegación GPS Externa (1 Clic) */}
        <View style={styles.gpsRow}>
          <TouchableOpacity style={styles.wazeBtn} onPress={handleOpenWaze}>
            <Ionicons name="navigate-circle" size={18} color="#059669" />
            <Text style={styles.wazeBtnText}>Abrir en Waze</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gmapsBtn} onPress={handleOpenGoogleMaps}>
            <Ionicons name="map" size={18} color="#2563EB" />
            <Text style={styles.gmapsBtnText}>Google Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Progreso */}
        <View style={styles.stepsRow}>
          {STEPS.map((step, i) => {
            const isDone = STEPS.indexOf(STEPS.find(s => s.status === trip.status)!) > i;
            const isCurrent = step.status === trip.status;
            return (
              <React.Fragment key={step.status}>
                <View style={[styles.stepDot,
                  isDone && styles.stepDotDone,
                  isCurrent && styles.stepDotCurrent,
                ]} />
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Switch de PIN Opcional (Configurable por el chofer) */}
        {trip.status === 'arrived' && (
          <View style={styles.pinSwitchContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pinSwitchTitle}>🔒 Requerir PIN de abordaje (Opcional)</Text>
              <Text style={styles.pinSwitchSub}>Exigir PIN de 4 dígitos al pasajero antes de iniciar</Text>
            </View>
            <Switch
              value={requirePin}
              onValueChange={setRequirePin}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>
        )}

        {/* Ganancia */}
        <View style={styles.earningsRow}>
          <Text style={styles.earningsLabel}>Ganancia del viaje</Text>
          <Text style={styles.earnings}>${trip.estimatedPrice} ARS</Text>
        </View>

        {/* Botón de avance */}
        {currentStep && (
          <TouchableOpacity
            style={[styles.actionBtn, currentStep.next === 'completed' && styles.actionBtnComplete]}
            onPress={advanceStep}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons
                  name={currentStep.next === 'completed' ? 'checkmark-done' : 'arrow-forward'}
                  size={20} color={Colors.white} />
                <Text style={styles.actionBtnText}>{currentStep.action}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Modal de Verificación de PIN */}
        <Modal visible={showPinModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
              <Text style={styles.modalTitle}>Ingresar PIN del Pasajero</Text>
              <Text style={styles.modalSub}>Solicitá el PIN de 4 dígitos que figura en el teléfono del usuario:</Text>
              
              <TextInput
                style={styles.pinInput}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="1234"
                placeholderTextColor={Colors.textMuted}
                value={inputPin}
                onChangeText={setInputPin}
              />

              <View style={styles.modalBtnsRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPinModal(false)}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleVerifyPin}>
                  <Text style={styles.modalConfirmText}>Verificar & Iniciar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de Calificación al Pasajero Post-Viaje */}
        <Modal visible={showPassengerRatingModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Ionicons name="star" size={54} color="#F59E0B" />
              <Text style={styles.modalTitle}>¿Qué tal fue el pasajero?</Text>
              <Text style={styles.modalSub}>Calificá tu experiencia con {trip.userName || 'el pasajero'}:</Text>

              {/* Estrellas */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setPassengerStars(star)}>
                    <Ionicons
                      name={star <= passengerStars ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= passengerStars ? '#F59E0B' : Colors.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tags de comportamiento */}
              <View style={styles.tagsGrid}>
                {['Puntual ⏱️', 'Respetuoso 😊', 'Buena comunicación 📱', 'Dejó propina 💵'].map(tag => {
                  const active = passengerTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, active && styles.tagChipActive]}
                      onPress={() => togglePassengerTag(tag)}
                    >
                      <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSubmitPassengerRating}>
                <Text style={styles.modalConfirmText}>Enviar Calificación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  driverMarker: {
    backgroundColor: Colors.primary, width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 4,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, elevation: 10,
  },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  passengerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  passengerName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  passengerDest: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  
  gpsRow: { flexDirection: 'row', gap: 10 },
  wazeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#ECFDF5', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0',
  },
  wazeBtnText: { fontSize: 12, fontWeight: '700', color: '#047857' },
  gmapsBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE',
  },
  gmapsBtnText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },

  stepsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  stepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.border },
  stepDotDone: { backgroundColor: Colors.success },
  stepDotCurrent: { backgroundColor: Colors.primary, width: 18, height: 18, borderRadius: 9 },
  stepLine: { flex: 1, height: 3, backgroundColor: Colors.border },
  stepLineDone: { backgroundColor: Colors.success },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsLabel: { fontSize: 14, color: Colors.textSecondary },
  earnings: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  actionBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  actionBtnComplete: { backgroundColor: Colors.success },
  actionBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  pinSwitchContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  pinSwitchTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  pinSwitchSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  pinInput: {
    width: '60%', backgroundColor: Colors.background, borderRadius: 14, paddingVertical: 14,
    textAlign: 'center', fontSize: 24, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: 8, borderWidth: 2, borderColor: Colors.primary, marginVertical: 8,
  },
  modalBtnsRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  modalConfirmBtn: { flex: 1.5, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: '100%' },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  
  starsRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%', marginVertical: 4 },
  tagChip: {
    backgroundColor: Colors.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  tagChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tagChipText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  tagChipTextActive: { color: Colors.white },
});


