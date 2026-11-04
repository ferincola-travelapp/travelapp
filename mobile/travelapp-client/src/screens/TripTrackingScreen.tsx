import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Alert, Linking, Modal } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, auth } from '../lib/firebase';
import { Colors } from '../lib/constants';
import { formatDriverName, formatPlate } from './HomeScreen';
import { playSeatbeltSafetyPrompt } from '../lib/audioService';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  searching: { label: 'Buscando conductor cercano...', color: Colors.accent || '#F59E0B', icon: 'search' },
  accepted: { label: 'Conductor asignado', color: Colors.primary, icon: 'checkmark-circle' },
  on_way: { label: 'Conductor en camino', color: Colors.primary, icon: 'car' },
  arrived: { label: 'Conductor llegó al origen', color: Colors.success, icon: 'location' },
  in_progress: { label: 'Viaje en curso', color: Colors.primary, icon: 'navigate' },
  completed: { label: 'Viaje completado ✓', color: Colors.success, icon: 'checkmark-done' },
  cancelled: { label: 'Viaje cancelado', color: Colors.danger, icon: 'close-circle' },
};

const FEEDBACK_TAGS = [
  'Auto impecable ✨',
  'Conducción suave 🚘',
  'Muy amable 😊',
  'Puntual ⏱️',
  'Buena música 🎵'
];

export default function TripTrackingScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tripId } = route.params;
  const [trip, setTrip] = useState<any>(null);
  
  // Cronómetro de búsqueda
  const [searchSeconds, setSearchSeconds] = useState(0);
  
  // Rating & Propina States
  const [userRating, setUserRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [hasSubmittedRating, setHasSubmittedRating] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);

  // Animaciones del Radar
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;

  const hasPlayedSafetyPrompt = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'trips', tripId), (snap) => {
      const data: any = { id: snap.id, ...snap.data() };
      setTrip(data);
      if (data?.status === 'in_progress' && !hasPlayedSafetyPrompt.current) {
        hasPlayedSafetyPrompt.current = true;
        playSeatbeltSafetyPrompt();
      }
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.parallel([
        Animated.timing(wave1Anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(wave2Anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ]),
      ])
    ).start();

    return unsub;
  }, [tripId]);

  useEffect(() => {
    let interval: any;
    if (trip && (trip.status === 'searching' || trip.status === 'requested')) {
      interval = setInterval(() => {
        setSearchSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [trip?.status]);

  const handleCancel = async () => {
    Alert.alert(
      'Cancelar viaje',
      '¿Estás seguro de que deseas cancelar la búsqueda?',
      [
        { text: 'No, esperar', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            await updateDoc(doc(db, 'trips', tripId), { status: 'cancelled' });
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const handleAddIncentive = async (amount: number) => {
    if (!trip) return;
    const currentPrice = Number(trip.estimatedPrice || 800);
    const newPrice = currentPrice + amount;
    const currentBonus = Number(trip.bonusIncentive || 0) + amount;

    try {
      await updateDoc(doc(db, 'trips', tripId), {
        estimatedPrice: newPrice,
        bonusIncentive: currentBonus,
      });
      Alert.alert(
        '¡Incentivo añadido! 🚀',
        `Aumentaste la tarifa a $${newPrice} ARS (+$${amount} de incentivo). Esto notificará a los conductores con alta prioridad.`
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudo aplicar el incentivo.');
    }
  };

  const isDigitalPayment = trip?.paymentMethod && trip.paymentMethod !== 'Efectivo';

  const handleSubmitRating = async () => {
    try {
      // Puntos TravelRewards acumulados por igual para AMBOS medios de pago (efectivo y digital)
      const earnedRewards = Math.round((trip.estimatedPrice || trip.price || 500) * 0.1);

      await updateDoc(doc(db, 'trips', tripId), {
        rated: true,
        rating: userRating,
        feedbackTags: selectedTags,
        tipAmount: isDigitalPayment ? tipAmount : 0,
        rewardsPointsEarned: earnedRewards,
      });

      setHasSubmittedRating(true);
      Alert.alert(
        '¡Gracias por tu calificación! ⭐',
        `Tu opinión fue enviada exitosamente. Acumulaste +${earnedRewards} Puntos TravelRewards por tu viaje.`
      );
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert('Error', 'No se pudo registrar la calificación.');
    }
  };

  const handleToggleAudioRecording = async () => {
    if (!isRecordingAudio) {
      setIsRecordingAudio(true);
      try {
        await updateDoc(doc(db, 'trips', tripId), {
          securityMonitoringActive: true,
          securityMonitoringActivatedAt: Timestamp.now(),
        });
        await addDoc(collection(db, 'audit_logs'), {
          action: 'PASSENGER_SECURITY_MONITOR_ACTIVATED',
          tripId,
          passengerId: auth.currentUser?.uid || null,
          driverId: trip?.driverId || null,
          createdAt: Timestamp.now(),
        });
      } catch {}
      Alert.alert(
        '🛡️ Monitoreo de Seguridad Activo',
        'Se notificó a la central de TravelCab y se activó el registro prioritario de seguridad para tu recorrido.'
      );
    } else {
      setIsRecordingAudio(false);
      try {
        await updateDoc(doc(db, 'trips', tripId), {
          securityMonitoringActive: false,
        });
      } catch {}
      Alert.alert(
        'Monitoreo Finalizado',
        'El registro de monitoreo preventivo fue guardado correctamente.'
      );
    }
  };

  const handleShareTrip = () => {
    if (!trip) return;
    const text = `🚕 *Viaje en TravelCab en vivo*\n\n` +
      `👤 Conductor: ${trip.driverName || 'Conductor asignado'}\n` +
      `🚘 Vehículo: ${trip.driverVehicle || 'Vehículo'} (${trip.vehiclePlate || 'Patente'})\n` +
      `📍 Origen: ${trip.origin || 'Origen'}\n` +
      `🏁 Destino: ${trip.destination}\n` +
      `🔑 PIN de Seguridad: ${trip.securityPin || '4829'}\n\n` +
      `🗺️ *Seguí mi recorrido en vivo:* https://travelapp.ar/track/${tripId}\n` +
      `🚨 Central de Emergencias: 0810-220-0018 / 911`;
    
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`).catch(() => {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`).catch(() => {
        Alert.alert('Compartir Viaje', text);
      });
    });
  };

  const handleSOSCall = () => {
    Alert.alert(
      '🚨 Asistencia de Emergencia (SOS)',
      '¿Deseás llamar inmediatamente al 911 o a la central de despacho de TravelCab?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Llamar 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
      ]
    );
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!trip) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  const isSearching = trip.status === 'searching' || trip.status === 'requested';
  const statusInfo = STATUS_CONFIG[trip.status] || STATUS_CONFIG.searching;
  const isCompleted = trip.status === 'completed';
  const isCancelled = trip.status === 'cancelled';
  const prefs = trip.tripPreferences || {};

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: -31.4167, longitude: -64.1833,
          latitudeDelta: 0.05, longitudeDelta: 0.05,
        }}
        showsUserLocation>
        {trip.driverLocation && (
          <Marker coordinate={trip.driverLocation} title="Tu conductor">
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={18} color={Colors.white} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        {(isCompleted || isCancelled) && (
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Seguimiento de viaje</Text>
      </View>

      {/* Panel de estado */}
      <View style={styles.panel}>
        {/* Radar Animado durante búsqueda */}
        {isSearching ? (
          <View style={styles.radarCard}>
            <View style={styles.radarVisualContainer}>
              <Animated.View
                style={[
                  styles.radarWave,
                  {
                    transform: [{
                      scale: wave1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2.8]
                      })
                    }],
                    opacity: wave1Anim.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [0.6, 0.2, 0]
                    })
                  }
                ]}
              />
              <Animated.View
                style={[
                  styles.radarWave,
                  {
                    transform: [{
                      scale: wave2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2.8]
                      })
                    }],
                    opacity: wave2Anim.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [0.6, 0.2, 0]
                    })
                  }
                ]}
              />
              <Animated.View style={[styles.radarCenter, { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="car-sport" size={28} color={Colors.white} />
              </Animated.View>
            </View>

            <View style={styles.radarTextContainer}>
              <Text style={styles.radarTitle}>Buscando al mejor conductor...</Text>
              <Text style={styles.radarTimer}>Tiempo de búsqueda: {formatTimer(searchSeconds)}</Text>
              <Text style={styles.radarSub}>Conectando con choferes cercanos a tu ubicación</Text>
            </View>

            <View style={styles.incentiveBox}>
              <View style={styles.incentiveHeader}>
                <Ionicons name="flash" size={16} color="#D97706" />
                <Text style={styles.incentiveTitle}>¿Tardan en aceptar? Acelerá tu viaje</Text>
              </View>
              <Text style={styles.incentiveSub}>Ofrecé un bono extra para que un conductor acepte de inmediato:</Text>
              
              <View style={styles.incentiveButtonsRow}>
                <TouchableOpacity style={styles.incBtn} onPress={() => handleAddIncentive(200)}>
                  <Text style={styles.incBtnText}>+ $200 ARS</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.incBtn, styles.incBtnHighlight]} onPress={() => handleAddIncentive(500)}>
                  <Text style={[styles.incBtnText, styles.incBtnTextHighlight]}>+ $500 ARS ⭐</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '18' }]}>
            <Ionicons name={statusInfo.icon as any} size={20} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        )}

        {/* Info del viaje */}
        <View style={styles.tripInfo}>
          <View style={styles.tripRow}>
            <View style={styles.dotGreen} />
            <Text style={styles.tripText} numberOfLines={1}>{trip.origin || 'Ubicación actual'}</Text>
          </View>
          <View style={styles.tripLine} />
          <View style={styles.tripRow}>
            <View style={styles.dotRed} />
            <Text style={styles.tripText} numberOfLines={1}>{trip.destination}</Text>
          </View>

          {(prefs.petFriendly || prefs.largeTrunk || prefs.quietTrip || prefs.ac) && (
            <View style={styles.prefBadgesRow}>
              {prefs.petFriendly && <Text style={styles.prefBadgeItem}>🐾 Mascota</Text>}
              {prefs.largeTrunk && <Text style={styles.prefBadgeItem}>🧳 Baúl Amplio</Text>}
              {prefs.quietTrip && <Text style={styles.prefBadgeItem}>🤫 Silencio</Text>}
              {prefs.ac && <Text style={styles.prefBadgeItem}>❄️ Aire Acond.</Text>}
            </View>
          )}
        </View>

        {/* Tarjeta de Seguridad (PIN de 4 dígitos + Compartir + Audio + SOS) */}
        {!isSearching && !isCancelled && (
          <View style={styles.securityCard}>
            <View style={styles.pinBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pinLabel}>PIN DE SEGURIDAD (OPCIONAL)</Text>
                <Text style={styles.pinSubLabel}>Dictale este código al chofer solo si te lo solicita:</Text>
              </View>
              <Text style={styles.pinCode}>{trip.securityPin || '4829'}</Text>
            </View>

            {isRecordingAudio && (
              <View style={styles.recordingBanner}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Grabando audio de seguridad del habitáculo en vivo</Text>
              </View>
            )}
            
            <View style={styles.securityButtonsRow}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareTrip}>
                <Ionicons name="logo-whatsapp" size={17} color="#16A34A" />
                <Text style={styles.shareBtnText}>Compartir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.audioBtn, isRecordingAudio && styles.audioBtnActive]}
                onPress={handleToggleAudioRecording}
              >
                <Ionicons name={isRecordingAudio ? "mic" : "mic-outline"} size={17} color={isRecordingAudio ? Colors.white : Colors.primary} />
                <Text style={[styles.audioBtnText, isRecordingAudio && styles.audioBtnTextActive]}>
                  {isRecordingAudio ? "Grabando" : "Grabar Audio"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sosBtn} onPress={handleSOSCall}>
                <Ionicons name="alert-circle" size={17} color={Colors.danger} />
                <Text style={styles.sosBtnText}>SOS 911</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info del conductor (si fue asignado) */}
        {trip.driverName && (
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={24} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{formatDriverName(trip.driverName)}</Text>
              <Text style={styles.driverSub}>{trip.driverVehicle || 'Vehículo'} • {formatPlate(trip.vehiclePlate)} • ⭐ {trip.driverRating || '4.9'} ({trip.totalTrips || 142} viajes)</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${trip.driverPhone || ''}`)}>
              <Ionicons name="call" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Precio */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Precio total estimado</Text>
            {trip.bonusIncentive ? (
              <Text style={styles.bonusText}>Incluye +${trip.bonusIncentive} de incentivo prioritario</Text>
            ) : null}
          </View>
          <Text style={styles.price}>${trip.estimatedPrice || trip.price || 0} ARS</Text>
        </View>

        {/* Botones */}
        {!isCompleted && !isCancelled && isSearching && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancelar viaje</Text>
          </TouchableOpacity>
        )}
        {(isCompleted || isCancelled) && (
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.homeBtnText}>Volver al inicio</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de Calificación y Propina Digital Post-Viaje */}
      <Modal visible={isCompleted && !trip.rated && !hasSubmittedRating} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.ratingModalContent}>
            <Ionicons name="star" size={54} color="#F59E0B" />
            <Text style={styles.ratingModalTitle}>¡Llegaste a tu destino!</Text>
            <Text style={styles.ratingModalSub}>¿Qué tal fue tu experiencia con {trip.driverName || 'el conductor'}?</Text>

            {/* Estrellas */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
                  <Ionicons
                    name={star <= userRating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= userRating ? '#F59E0B' : Colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags Rápidos */}
            <Text style={styles.tagsSectionTitle}>Elegí etiquetas de feedback:</Text>
            <View style={styles.tagsGrid}>
              {FEEDBACK_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, active && styles.tagChipActive]}
                    onPress={() => toggleTag(tag)}>
                    <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Propina Digital (Solo Pagos Electrónicos) */}
            {isDigitalPayment ? (
              <>
                <Text style={styles.tagsSectionTitle}>💳 Propina Digital para el chofer:</Text>
                <View style={styles.tipRow}>
                  {[0, 200, 500, 1000].map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[styles.tipChip, tipAmount === amount && styles.tipChipActive]}
                      onPress={() => setTipAmount(amount)}>
                      <Text style={[styles.tipChipText, tipAmount === amount && styles.tipChipTextActive]}>
                        {amount === 0 ? 'Sin propina' : `+$${amount}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.cashNoticeBox}>
                <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.cashNoticeText}>
                  Pago en Efectivo: La propina digital aplica exclusivamente para pagos electrónicos.
                </Text>
              </View>
            )}

            {/* Enviar */}
            <TouchableOpacity style={styles.submitRatingBtn} onPress={handleSubmitRating}>
              <Text style={styles.submitRatingText}>Enviar Calificación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  driverMarker: {
    backgroundColor: Colors.primary, width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 4,
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, elevation: 10,
  },
  radarCard: {
    alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  radarVisualContainer: {
    width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginVertical: 8,
  },
  radarWave: {
    position: 'absolute', width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.primary, opacity: 0.3,
  },
  radarCenter: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 6,
  },
  radarTextContainer: { alignItems: 'center', marginVertical: 6 },
  radarTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  radarTimer: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  radarSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  incentiveBox: {
    width: '100%', backgroundColor: '#FEF3C7', borderRadius: 14, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  incentiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  incentiveTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  incentiveSub: { fontSize: 11, color: '#B45309', marginTop: 2, marginBottom: 8 },
  incentiveButtonsRow: { flexDirection: 'row', gap: 8 },
  incBtn: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 10, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B',
  },
  incBtnHighlight: { backgroundColor: '#F59E0B', borderColor: '#D97706' },
  incBtnText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  incBtnTextHighlight: { color: Colors.white },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
    borderRadius: 12, alignSelf: 'flex-start',
  },
  statusText: { fontSize: 14, fontWeight: '700' },
  tripInfo: { backgroundColor: Colors.background, borderRadius: 14, padding: 14, gap: 8 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger },
  tripLine: { width: 1, height: 16, backgroundColor: Colors.border, marginLeft: 4 },
  tripText: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  prefBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  prefBadgeItem: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, backgroundColor: Colors.white, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  
  securityCard: {
    backgroundColor: '#F0F9FF', borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  pinBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  pinLabel: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  pinSubLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  pinCode: { fontSize: 22, fontWeight: '900', color: Colors.primary, letterSpacing: 3, marginLeft: 8 },
  recordingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
  recordingText: { fontSize: 11, fontWeight: '700', color: Colors.danger },
  securityButtonsRow: { flexDirection: 'row', gap: 8 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#DCFCE7', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#86EFAC',
  },
  shareBtnText: { fontSize: 12, fontWeight: '700', color: '#15803D' },
  audioBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.white, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary + '40',
  },
  audioBtnActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  audioBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  audioBtnTextActive: { color: Colors.white },
  sosBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#FCA5A5',
  },
  sosBtnText: { fontSize: 12, fontWeight: '700', color: Colors.danger },

  driverInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.background, borderRadius: 14, padding: 14,
  },
  driverAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  driverName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  driverSub: { fontSize: 12, color: Colors.textSecondary },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: Colors.textSecondary },
  bonusText: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  price: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  cancelBtn: {
    borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  cancelText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  homeBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  homeBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  ratingModalContent: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 8,
  },
  ratingModalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  ratingModalSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  starsRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  tagsSectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, alignSelf: 'flex-start', marginTop: 6 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' },
  tagChip: {
    backgroundColor: Colors.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  tagChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tagChipText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  tagChipTextActive: { color: Colors.white },
  tipRow: { flexDirection: 'row', gap: 8, width: '100%' },
  tipChip: {
    flex: 1, backgroundColor: Colors.background, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  tipChipActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  tipChipText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  tipChipTextActive: { color: Colors.white },
  submitRatingBtn: {
    backgroundColor: Colors.primary, width: '100%', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 10,
  },
  submitRatingText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  cashNoticeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9',
    padding: 10, borderRadius: 10, width: '100%', marginTop: 6,
  },
  cashNoticeText: { flex: 1, fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
});
