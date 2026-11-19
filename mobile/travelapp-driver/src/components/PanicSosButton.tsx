import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { API_BASE_URL } from '../lib/constants';

interface PanicSosButtonProps {
  holdSeconds?: number;
  activeTrip?: any;
  currentLocation?: { latitude: number; longitude: number } | null;
  compact?: boolean;
}

export function PanicSosButton({
  holdSeconds = 2,
  activeTrip = null,
  currentLocation = null,
  compact = false,
}: PanicSosButtonProps) {
  const safeHoldMs = Math.max(1, Number(holdSeconds || 2)) * 1000;
  const [holding, setHolding] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [sosSent, setSosSent] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (animRef.current) animRef.current.stop();
    };
  }, []);

  const triggerPanicAlert = async () => {
    setHolding(false);
    Vibration.vibrate([0, 450, 150, 450, 150, 600]);
    setSosSent(true);

    try {
      const user = auth.currentUser;
      if (!user) return;

      const driverSnap = await getDoc(doc(db, 'drivers', user.uid)).catch(() => null);
      const dData: any = driverSnap?.exists() ? driverSnap.data() : {};

      let gps = currentLocation;
      if (!gps?.latitude) {
        const loc = await Location.getLastKnownPositionAsync({}).catch(() => null);
        if (loc?.coords) {
          gps = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      }

      const driverName =
        dData?.name ||
        [dData?.firstName, dData?.lastName].filter(Boolean).join(' ') ||
        user.displayName ||
        'Conductor';
      const driverPhone = dData?.phone || user.phoneNumber || '';
      const driverPhoto =
        dData?.photoURL || dData?.photoUrl || dData?.profilePhotoUrl || user.photoURL || '';
      const vehicleInfo =
        [dData?.activeVehicle?.brand || dData?.vehicleBrand, dData?.activeVehicle?.model || dData?.vehicleModel, dData?.activeVehicle?.color]
          .filter(Boolean)
          .join(' ') || 'Vehículo habilitado';
      const vehiclePlate =
        dData?.activeVehicle?.plate || dData?.vehiclePlate || dData?.plate || 'S/D';
      const supervisorId = dData?.supervisorId || '';
      const supervisorCode = dData?.supervisorCode || '';

      const alertPayload = {
        type: 'driver_panic',
        sourceRole: 'driver',
        tripId: activeTrip?.id || 'sin-viaje-activo',
        passengerId: activeTrip?.passengerId || '',
        passengerName: activeTrip?.passengerName || activeTrip?.userName || '',
        passengerPhone: activeTrip?.passengerPhone || activeTrip?.userPhone || '',
        driverId: user.uid,
        driverName,
        driverPhone,
        driverPhoto,
        supervisorId,
        supervisorCode,
        vehicleInfo,
        vehiclePlate,
        deviationKm: 0,
        thresholdKm: 0,
        driverLocation: gps || null,
        origin: activeTrip?.origin || '',
        destination: activeTrip?.destination || '',
        status: 'driver_panic_active',
        escalatedToDashboard: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const ref = await addDoc(collection(db, 'safety_alerts'), alertPayload);

      const idToken = await user.getIdToken().catch(() => null);
      if (idToken) {
        fetch(`${API_BASE_URL}/api/safety/driver-panic-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            alertId: ref.id,
            driverId: user.uid,
            driverName,
            driverPhone,
            supervisorId,
            supervisorCode,
            vehicleInfo,
            vehiclePlate,
            driverLocation: gps || null,
          }),
        }).catch(() => {});
      }

      Alert.alert(
        '🚨 Alerta SOS Enviada',
        'Tu Supervisor asignado y la Central de Monitoreo ya recibieron tu ubicación en vivo y la alerta de pánico.'
      );
    } catch (err) {
      console.warn('Error sending driver SOS panic:', err);
      Alert.alert('Error SOS', 'No pudimos confirmar el envío. Si estás en peligro llamá al 911.');
    } finally {
      setTimeout(() => setSosSent(false), 6000);
    }
  };

  const handlePressIn = () => {
    if (sosSent) return;
    setHintText(null);
    setHolding(true);
    Vibration.vibrate(40);
    progressAnim.setValue(0);

    animRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: safeHoldMs,
      useNativeDriver: false,
    });
    animRef.current.start();

    holdTimerRef.current = setTimeout(() => {
      triggerPanicAlert();
    }, safeHoldMs);
  };

  const handlePressOut = () => {
    if (!holding) return;
    setHolding(false);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    progressAnim.setValue(0);
    setHintText(`Mantené ${holdSeconds}s para activar SOS`);
    setTimeout(() => setHintText(null), 2200);
  };

  const fillWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={compact ? styles.wrapCompact : styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.btn,
          compact && styles.btnCompact,
          holding && styles.btnHolding,
          sosSent && styles.btnSent,
        ]}
      >
        <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
        <Ionicons
          name={sosSent ? 'checkmark-circle' : 'alert-circle'}
          size={compact ? 18 : 20}
          color="#FFFFFF"
        />
        <Text style={[styles.btnText, compact && styles.btnTextCompact]}>
          {sosSent
            ? 'SOS ENVIADO'
            : holding
            ? 'SOLTÁ PARA CANCELAR...'
            : compact
            ? `SOS (${holdSeconds}s)`
            : `BOTÓN PÁNICO · MANTENER ${holdSeconds}s`}
        </Text>
      </TouchableOpacity>
      {hintText ? <Text style={styles.hintText}>{hintText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  wrapCompact: {
    alignItems: 'center',
  },
  btn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  btnCompact: {
    width: 'auto',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
  },
  btnHolding: {
    backgroundColor: '#991B1B',
    borderColor: '#FDE047',
  },
  btnSent: {
    backgroundColor: '#7F1D1D',
    borderColor: '#4ADE80',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(253, 224, 71, 0.35)',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    letterSpacing: 0.4,
    zIndex: 2,
  },
  btnTextCompact: {
    fontSize: 11,
  },
  hintText: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: 'Quicksand-Bold',
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
