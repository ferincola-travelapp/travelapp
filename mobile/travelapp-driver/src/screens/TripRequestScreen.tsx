import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  Vibration,
  Image,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  Timestamp,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, auth } from '../lib/firebase';
import { Colors, API_BASE_URL } from '../lib/constants';
import { InteractiveMapView } from '../components/InteractiveMapView';
import {
  playTripRequestAlertSound,
  stopTripRequestAlertSound,
} from '../lib/audioService';
import {
  decodePolyline,
  estimateEtaMinutes,
  haversineDistanceKm,
} from '../lib/geoUtils';
import { presentDriverLocalNotification } from '../lib/notificationsService';

interface DriverIncomingConfig {
  enabled: boolean;
  pushEnabled: boolean;
  voiceEnabled: boolean;
  voiceTemplate: string;
  defaultCommissionPct: number;
  countdownSeconds: number;
}

const DEFAULT_INCOMING_CFG: DriverIncomingConfig = {
  enabled: true,
  pushEnabled: true,
  voiceEnabled: true,
  voiceTemplate:
    'Hola conductor {conductor}, hay un viaje desde {origen} hasta {destino}, está a {distancia} de tu ubicación.',
  defaultCommissionPct: 15,
  countdownSeconds: 25,
};

function formatDistanceVoice(km: number): string {
  if (!km || km <= 0) return 'pocos metros';
  if (km < 1) {
    const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `${meters} metros`;
  }
  return `${km.toFixed(1).replace('.', ',')} kilómetros`;
}

export default function TripRequestScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { trip } = route.params;

  const [loading, setLoading] = useState(false);
  const [incomingCfg, setIncomingCfg] =
    useState<DriverIncomingConfig>(DEFAULT_INCOMING_CFG);
  const [secondsLeft, setSecondsLeft] = useState<number>(25);
  const [commissionPct, setCommissionPct] = useState<number>(15);
  const [passengerPhoto, setPassengerPhoto] = useState<string>(
    trip?.passengerPhoto || trip?.userPhoto || ''
  );
  const [passengerRating, setPassengerRating] = useState<string>(
    Number(trip?.passengerRating || 4.9).toFixed(1)
  );
  const [pickupDistanceKm, setPickupDistanceKm] = useState<number>(
    Number(trip?.distanceToPassengerKm || 0)
  );

  const slideAnim = useRef(new Animated.Value(0)).current;
  const alertedTripRef = useRef<string | null>(null);

  // Coordenadas Origen (Pasajero) y Destino
  const originCoords = trip?.originCoords || {
    latitude: -26.82414,
    longitude: -65.2226,
  };
  const destinationCoords = trip?.destinationCoords || {
    latitude: -26.835,
    longitude: -65.23,
  };

  const pickupEtaMinutes =
    trip?.pickupEtaMinutes ||
    estimateEtaMinutes(pickupDistanceKm > 0 ? pickupDistanceKm : 2.2);

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true }).start();

    let cancelled = false;

    const initAlertAndProfile = async () => {
      try {
        const uid = auth.currentUser?.uid;
        const [cfgSnap, driverSnap, paxSnap] = await Promise.all([
          getDoc(doc(db, 'system_config', 'driver_experience')).catch(() => null),
          uid ? getDoc(doc(db, 'drivers', uid)).catch(() => null) : Promise.resolve(null),
          trip?.passengerId && (!trip?.passengerPhoto || !trip?.passengerRating)
            ? getDoc(doc(db, 'users', trip.passengerId)).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        let activeCfg = DEFAULT_INCOMING_CFG;
        if (cfgSnap?.exists()) {
          const raw = cfgSnap.data()?.incomingRequest || {};
          activeCfg = { ...DEFAULT_INCOMING_CFG, ...raw };
          setIncomingCfg(activeCfg);
          setSecondsLeft(Number(activeCfg.countdownSeconds || 25));
        }

        const dData: any = driverSnap?.exists() ? driverSnap.data() : {};
        const effectiveComm = Number(
          trip?.driverCommissionPct ??
            dData?.commissionPct ??
            dData?.companyFeePct ??
            activeCfg.defaultCommissionPct ??
            15
        );
        setCommissionPct(effectiveComm);

        if (paxSnap?.exists()) {
          const pData: any = paxSnap.data();
          if (!passengerPhoto && (pData.photoURL || pData.photoUrl)) {
            setPassengerPhoto(pData.photoURL || pData.photoUrl);
          }
          if (pData.rating) {
            setPassengerRating(Number(pData.rating).toFixed(1));
          }
        }

        const rawDriverName =
          dData?.firstName ||
          dData?.name ||
          auth.currentUser?.displayName ||
          'Conductor';
        const driverFirstName =
          String(rawDriverName).trim().split(/\s+/)[0] || 'Conductor';

        let distKm = Number(trip?.distanceToPassengerKm || 0);
        if ((!distKm || distKm <= 0) && dData?.location && trip?.originCoords) {
          distKm = haversineDistanceKm(dData.location, trip.originCoords);
        }
        setPickupDistanceKm(distKm);

        if (alertedTripRef.current !== trip?.id && activeCfg.enabled) {
          alertedTripRef.current = trip?.id;
          const originShort = String(trip?.origin || 'tu zona').split(',')[0].trim();
          const destShort = String(trip?.destination || 'destino').split(',')[0].trim();
          const distLabel = formatDistanceVoice(distKm);

          // Voz estrictamente SIN precio
          const spoken = (activeCfg.voiceTemplate || DEFAULT_INCOMING_CFG.voiceTemplate)
            .replace(/\{conductor\}/gi, driverFirstName)
            .replace(/\{origen\}/gi, originShort)
            .replace(/\{destino\}/gi, destShort)
            .replace(/\{distancia\}/gi, distLabel);

          if (activeCfg.voiceEnabled) {
            playTripRequestAlertSound(spoken);
          } else {
            Vibration.vibrate([0, 600, 300, 600, 300, 600], true);
          }

          if (activeCfg.pushEnabled && AppState.currentState !== 'active') {
            presentDriverLocalNotification({
              title: `🚕 Nuevo viaje · ${distLabel}`,
              body: `Hola ${driverFirstName}: viaje desde ${originShort} hasta ${destShort}.`,
              channelId: 'driver_alerts',
              data: { type: 'trip_request', tripId: trip?.id },
            });
          }
        }
      } catch (err) {
        console.warn('Init trip request alert error:', err);
        playTripRequestAlertSound();
      }
    };

    initAlertAndProfile();

    // Escuchar si el viaje fue tomado por otro chofer o cancelado por el cliente
    let unsubTrip: (() => void) | undefined;
    if (trip?.id) {
      unsubTrip = onSnapshot(doc(db, 'trips', trip.id), (snap) => {
        if (!snap.exists()) {
          stopTripRequestAlertSound();
          Vibration.cancel();
          navigation.goBack();
          return;
        }
        const data = snap.data();
        const currentUid = auth.currentUser?.uid;
        if (data.status !== 'searching' && data.driverId !== currentUid) {
          stopTripRequestAlertSound();
          Vibration.cancel();
          Alert.alert('Viaje ya asignado', 'Este viaje ya fue tomado por otro conductor.');
          navigation.goBack();
        }
      });
    }

    return () => {
      cancelled = true;
      stopTripRequestAlertSound();
      Vibration.cancel();
      if (unsubTrip) unsubTrip();
    };
  }, [trip?.id]);

  // Cuenta regresiva editable
  useEffect(() => {
    if (secondsLeft <= 0) {
      stopAlerts();
      navigation.goBack();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const stopAlerts = async () => {
    await stopTripRequestAlertSound();
    Vibration.cancel();
  };

  // Valores duales en pantalla: Valor total a cobrar vs Neto del Conductor (Viaje)
  const totalToCollect = Number(trip?.estimatedPrice || trip?.price || 0);
  const driverNetAmount = trip?.driverNetAmount
    ? Number(trip.driverNetAmount)
    : Math.max(0, Math.round(totalToCollect * (1 - commissionPct / 100)));

  const handleAccept = async () => {
    stopAlerts();
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const driverRef = doc(db, 'drivers', user.uid);
      const driverSnap = await getDoc(driverRef);
      const driverData: any = driverSnap.data() || {};

      const rawName =
        driverData?.firstName ||
        driverData?.name ||
        user.displayName ||
        (user.email ? user.email.split('@')[0] : 'Conductor');
      const driverName = String(rawName).trim().split(/\s+/)[0] || 'Conductor';
      const driverPhone = driverData?.phone || user.phoneNumber || '';
      const driverRating = Number(driverData?.rating || 5.0);
      const driverTotalTrips = Number(driverData?.totalTrips || 0);
      const vehicleBrand =
        driverData?.activeVehicle?.brand || driverData?.vehicleBrand || 'Vehículo';
      const vehicleModelName =
        driverData?.activeVehicle?.model || driverData?.vehicleModel || 'Habilitado';
      const vehicleColor =
        driverData?.activeVehicle?.color || driverData?.vehicleColor || '';
      const vehiclePlate = String(
        driverData?.activeVehicle?.plate || driverData?.vehiclePlate || driverData?.plate || ''
      )
        .trim()
        .toUpperCase();
      const driverProfilePhoto =
        driverData?.photoURL ||
        driverData?.photoUrl ||
        driverData?.profilePhotoUrl ||
        driverData?.avatar ||
        driverData?.selfieUrl ||
        user.photoURL ||
        '';
      const driverCarPhoto =
        driverData?.activeVehicle?.photoUrl ||
        driverData?.activeVehicle?.vehiclePhoto ||
        driverData?.vehiclePhotoUrl ||
        '';

      const isMercadoPago = trip?.paymentMethod === 'Mercado Pago';
      const isRewards = trip?.paymentMethod === 'Rewards';

      const tripDocRef = doc(db, 'trips', trip.id);

      // Asignación atómica mediante transacción para envío automático inmediato a Fase 1
      await runTransaction(db, async (tx) => {
        const latestTripSnap = await tx.get(tripDocRef);
        if (!latestTripSnap.exists() || latestTripSnap.data()?.status !== 'searching') {
          throw new Error('TRIP_ALREADY_TAKEN');
        }

        const updatePayload: any = {
          status: 'accepted',
          driverId: user.uid,
          driverName,
          driverPhone,
          driverRating,
          driverTotalTrips,
          vehicleBrand,
          vehicleModel: vehicleModelName,
          vehicleColor,
          vehiclePlate,
          driverProfilePhoto,
          driverCarPhoto,
          driverCommissionPct: commissionPct,
          driverNetAmount,
          acceptedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          paymentMethod: trip?.paymentMethod || 'Efectivo',
          paymentStatus: isRewards || isMercadoPago ? 'awaiting_payment' : 'pending',
        };
        if (trip?.pin) updatePayload.pin = trip.pin;

        tx.update(tripDocRef, updatePayload);
      });

      // Enviar Push automático al celular del pasajero (con foto de perfil + auto + patente enmascarada)
      if (trip?.passengerId) {
        const idToken = await user.getIdToken().catch(() => null);
        if (idToken) {
          fetch(`${API_BASE_URL}/api/trips/driver-assigned-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              tripId: trip.id,
              passengerId: trip.passengerId,
              driver: {
                id: user.uid,
                name: driverName,
                plate: vehiclePlate,
                brand: vehicleBrand,
                vehicleModelName,
                color: vehicleColor,
                rating: driverRating.toFixed(1),
                totalTrips: driverTotalTrips,
                phone: driverPhone,
                avatar: driverProfilePhoto,
                carPhoto: driverCarPhoto,
              },
            }),
          }).catch(() => {});
        }
      }

      // Si el método es Mercado Pago, intentar débito automático luego de reservar el viaje atómicamente
      if (isMercadoPago) {
        try {
          const payResponse = await fetch(`${API_BASE_URL}/api/checkout/process-debit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId: trip.id,
              passengerId: trip.passengerId,
              driverId: user.uid,
              amount: trip.estimatedPrice,
            }),
          });
          if (payResponse.ok) {
            const payData = await payResponse.json();
            if (payData && payData.success) {
              await updateDoc(tripDocRef, {
                paymentStatus: 'paid',
                ...(payData.paymentId ? { paymentId: payData.paymentId } : {}),
                updatedAt: Timestamp.now(),
              });
            }
          }
        } catch (e) {
          console.log('Optional auto-debit notice:', e);
        }
      }

      navigation.navigate('ActiveTrip', { tripId: trip.id });
    } catch (err: any) {
      if (err?.message === 'TRIP_ALREADY_TAKEN') {
        Alert.alert(
          'Viaje no disponible',
          'Lo sentimos, este viaje ya fue tomado por otro conductor o fue cancelado.'
        );
        navigation.goBack();
        return;
      }
      console.error('Error accepting trip:', err);
      Alert.alert(
        'Error',
        'No se pudo aceptar el viaje: ' + (err?.message || 'Intentá nuevamente.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    stopAlerts();
    try {
      const user = auth.currentUser;
      if (user && trip?.id) {
        await updateDoc(doc(db, 'trips', trip.id), {
          rejectedBy: arrayUnion(user.uid),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (e) {
      console.warn('Error rejecting trip in Firestore:', e);
    } finally {
      navigation.goBack();
    }
  };

  const passengerNameDisplay =
    trip?.passengerName || trip?.userName || 'Pasajero';

  const rawPaymentMethod = (trip?.paymentMethod || 'Efectivo').trim();
  const normalizedPayment = rawPaymentMethod.toLowerCase();
  const paymentMeta =
    normalizedPayment === 'efectivo'
      ? {
          icon: 'cash' as const,
          label: 'Efectivo',
          hint: 'Cobrás al pasajero al finalizar',
          color: '#15803D',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          collectLabel: 'COBRAR EN EFECTIVO',
        }
      : normalizedPayment === 'rewards'
      ? {
          icon: 'sparkles' as const,
          label: 'Puntos Rewards',
          hint: 'Pago con saldo Rewards · Se acredita en tu cuenta',
          color: '#B45309',
          bg: '#FFFBEB',
          border: '#FDE68A',
          collectLabel: 'VALOR DEL VIAJE',
        }
      : normalizedPayment.includes('mercado')
      ? {
          icon: 'card' as const,
          label: 'Mercado Pago',
          hint: 'Pago digital en la app · No cobrar efectivo',
          color: '#0369A1',
          bg: '#F0F9FF',
          border: '#BAE6FD',
          collectLabel: 'VALOR DEL VIAJE',
        }
      : normalizedPayment.includes('transfer')
      ? {
          icon: 'swap-horizontal' as const,
          label: rawPaymentMethod,
          hint: 'Transferencia al finalizar el viaje',
          color: '#4338CA',
          bg: '#EEF2FF',
          border: '#C7D2FE',
          collectLabel: 'COBRAR TRANSFERENCIA',
        }
      : {
          icon: 'card' as const,
          label: rawPaymentMethod,
          hint: `Medio elegido por el pasajero: ${rawPaymentMethod}`,
          color: Colors.primary,
          bg: '#EFF6FF',
          border: '#BFDBFE',
          collectLabel: 'VALOR DEL VIAJE',
        };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backdrop} onPress={handleReject} />

      <Animated.View
        style={[
          styles.panel,
          {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.panelHeader}>
          <View style={styles.pingDot} />
          <Text style={styles.panelTitle}>
            Nueva solicitud · {secondsLeft}s
          </Text>
          <View
            style={[
              styles.payBadge,
              {
                backgroundColor: paymentMeta.bg,
                borderColor: paymentMeta.border,
              },
            ]}
          >
            <Ionicons
              name={paymentMeta.icon}
              size={14}
              color={paymentMeta.color}
            />
            <Text style={[styles.payBadgeText, { color: paymentMeta.color }]}>
              {paymentMeta.label}
            </Text>
          </View>
        </View>

        {/* Distancia y ETA para buscar al pasajero */}
        <View style={styles.etaBadgeBox}>
          <Ionicons name="time" size={16} color="#0284C7" />
          <Text style={styles.etaBadgeText}>
            ⏱️ <Text style={styles.etaBold}>{pickupEtaMinutes} min</Text> (
            {pickupDistanceKm > 0
              ? formatDistanceVoice(pickupDistanceKm)
              : 'cerca de tu zona'}
            ) hasta el origen
          </Text>
        </View>

        {/* Mapa Interactivo con Origen, Destino y Traza Real */}
        <View style={styles.mapContainer}>
          <InteractiveMapView
            style={styles.map}
            originCoords={originCoords}
            destinationCoords={destinationCoords}
            routeCoordinates={
              trip?.routePolyline ? decodePolyline(trip.routePolyline) : null
            }
          />
        </View>

        {/* Tarifa Dual: Tu ganancia (Viaje) y Total a cobrar al pasajero */}
        <View style={styles.dualPriceRow}>
          <View style={styles.priceBoxNet}>
            <Text style={styles.priceBoxLabel}>TU VIAJE (NETO)</Text>
            <Text style={styles.priceNet}>
              ${driverNetAmount.toLocaleString('es-AR')}
            </Text>
          </View>
          <View style={styles.priceBoxCollect}>
            <Text style={styles.priceBoxLabel}>{paymentMeta.collectLabel}</Text>
            <Text style={styles.priceCollect}>
              ${totalToCollect.toLocaleString('es-AR')}
            </Text>
          </View>
        </View>

        {/* Forma de pago elegida por el pasajero */}
        <View
          style={[
            styles.paymentMethodBanner,
            {
              backgroundColor: paymentMeta.bg,
              borderColor: paymentMeta.border,
            },
          ]}
        >
          <View
            style={[
              styles.paymentIconCircle,
              { backgroundColor: paymentMeta.color },
            ]}
          >
            <Ionicons name={paymentMeta.icon} size={16} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.paymentMethodKicker}>
              FORMA DE PAGO DEL PASAJERO
            </Text>
            <Text
              style={[styles.paymentMethodTitle, { color: paymentMeta.color }]}
            >
              {paymentMeta.label} ·{' '}
              <Text style={styles.paymentMethodHint}>{paymentMeta.hint}</Text>
            </Text>
          </View>
        </View>

        {trip.bonusIncentive ? (
          <View style={styles.bonusBanner}>
            <Ionicons name="flash" size={14} color="#92400E" />
            <Text style={styles.bonusBannerText}>
              ¡Incluye +${trip.bonusIncentive} ARS de incentivo prioritario!
            </Text>
          </View>
        ) : null}

        {/* Ruta */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.dotGreen} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Origen</Text>
              <Text style={styles.routeText} numberOfLines={1}>
                {trip.origin || 'Ubicación del pasajero'}
              </Text>
            </View>
          </View>
          <View style={styles.routeDash} />
          <View style={styles.routeRow}>
            <View style={styles.dotRed} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Destino</Text>
              <Text style={styles.routeText} numberOfLines={1}>
                {trip.destination}
              </Text>
            </View>
          </View>
        </View>

        {/* Info del pasajero con foto de perfil y nombre */}
        <View style={styles.passengerCard}>
          {passengerPhoto ? (
            <Image
              source={{ uri: passengerPhoto }}
              style={styles.passengerPhotoImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.passengerAvatar}>
              <Ionicons name="person" size={22} color={Colors.white} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.passengerName}>{passengerNameDisplay}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={Colors.accent} />
              <Text style={styles.ratingText}>
                {passengerRating} · {trip.serviceType || 'TravelCab'}
              </Text>
            </View>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
            <Text style={styles.rejectBtnText}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleAccept}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.acceptBtnText}>Aceptar Viaje 🚕</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  panel: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 10,
    maxHeight: '94%',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  panelTitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: 8,
  },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  payBadgeText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
  },
  etaBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  etaBadgeText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#0369A1',
    flex: 1,
  },
  etaBold: {
    fontFamily: 'Quicksand-Bold',
    color: '#0284C7',
  },
  mapContainer: {
    height: 132,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  dualPriceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priceBoxNet: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  priceBoxCollect: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  priceBoxLabel: {
    fontSize: 9,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  priceNet: {
    fontSize: 21,
    fontFamily: 'Quicksand-Bold',
    color: '#047857',
  },
  priceCollect: {
    fontSize: 21,
    fontFamily: 'Quicksand-Bold',
    color: Colors.primary,
  },
  paymentMethodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  paymentIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodKicker: {
    fontSize: 9,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  paymentMethodTitle: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
  },
  paymentMethodHint: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textSecondary,
  },
  bonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bonusBannerText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: '#92400E',
  },
  routeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
  },
  routeDash: {
    width: 2,
    height: 10,
    backgroundColor: '#CBD5E1',
    marginLeft: 4,
    marginVertical: 2,
  },
  routeLabel: {
    fontSize: 10,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textMuted,
  },
  routeText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
  },
  passengerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passengerPhotoImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  passengerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerName: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectBtnText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textSecondary,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
  },
});
