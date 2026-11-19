import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Vibration,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { MASTER_ADMIN_EMAILS } from '../lib/supervisorService';
import {
  presentSupervisorSafetyNotification,
  registerSupervisorForPushNotificationsAsync,
} from '../lib/notificationsService';

interface DriverPanicAlert {
  id: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverPhoto?: string;
  supervisorId?: string;
  supervisorCode?: string;
  vehicleInfo?: string;
  vehiclePlate?: string;
  passengerName?: string;
  passengerPhone?: string;
  origin?: string;
  destination?: string;
  driverLocation?: { latitude: number; longitude: number };
  createdAt?: number;
}

export function SupervisorPanicOverlay() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [supervisorCode, setSupervisorCode] = useState('');
  const [alerts, setAlerts] = useState<DriverPanicAlert[]>([]);
  const [muted, setMuted] = useState(false);

  const alertedIdsRef = useRef<Set<string>>(new Set());
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u?.uid) {
        registerSupervisorForPushNotificationsAsync(u.uid);
        try {
          const [uSnap, sSnap] = await Promise.all([
            getDoc(doc(db, 'users', u.uid)),
            getDoc(doc(db, 'supervisors', u.uid)),
          ]);
          const code =
            uSnap.data()?.supervisorCode ||
            uSnap.data()?.referralCode ||
            sSnap.data()?.supervisorCode ||
            '';
          setSupervisorCode(String(code).toUpperCase().trim());
        } catch {}
      } else {
        setAlerts([]);
        setSupervisorCode('');
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const email = (user.email || '').toLowerCase().trim();
    const isMaster = MASTER_ADMIN_EMAILS.includes(email);
    const supUid = user.uid;

    const q = query(
      collection(db, 'safety_alerts'),
      where('status', '==', 'driver_panic_active')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: DriverPanicAlert[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<DriverPanicAlert, 'id'>) }))
          .filter((a) => {
            if (isMaster) return true;
            const alertSupId = String(a.supervisorId || '').trim();
            const alertSupCode = String(a.supervisorCode || '').toUpperCase().trim();
            return (
              (supUid && alertSupId === supUid) ||
              (supervisorCode && alertSupCode === supervisorCode)
            );
          })
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

        setAlerts(list);

        if (list.length > 0) {
          const newest = list[0];
          if (!alertedIdsRef.current.has(newest.id)) {
            alertedIdsRef.current.add(newest.id);
            setMuted(false);

            if (AppState.currentState !== 'active') {
              presentSupervisorSafetyNotification({
                title: '🚨 BOTÓN DE PÁNICO · CONDUCTOR',
                body: `${newest.driverName || 'Conductor'} (${newest.vehiclePlate || 'S/D'}) activó emergencia SOS.`,
                data: { alertId: newest.id, type: 'driver_panic' },
              });
            }
          }
        }
      },
      () => {}
    );

    return () => unsub();
  }, [user?.uid, user?.email, supervisorCode]);

  // Alarma sonora por voz + vibración mientras exista alerta activa sin silenciar
  useEffect(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }

    if (alerts.length === 0 || muted) {
      Vibration.cancel();
      Speech.stop();
      return;
    }

    const triggerAlarmCycle = () => {
      const top = alerts[0];
      Vibration.vibrate([0, 600, 200, 600, 200, 600]);
      Speech.stop();
      Speech.speak(
        `Alerta crítica de pánico. El conductor ${top.driverName || 'asignado'} activó el botón SOS.`,
        { language: 'es-AR', rate: 1.0, pitch: 1.05 }
      );
    };

    triggerAlarmCycle();
    alarmIntervalRef.current = setInterval(triggerAlarmCycle, 7000);

    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      Vibration.cancel();
      Speech.stop();
    };
  }, [alerts.length, alerts[0]?.id, muted]);

  if (alerts.length === 0) return null;

  const currentAlert = alerts[0];
  const mapsUrl = currentAlert.driverLocation?.latitude
    ? `https://maps.google.com/?q=${currentAlert.driverLocation.latitude},${currentAlert.driverLocation.longitude}`
    : null;
  const waPhone = String(currentAlert.driverPhone || '').replace(/\D/g, '');

  const handleResolve = async (alertId: string) => {
    Vibration.cancel();
    Speech.stop();
    try {
      await updateDoc(doc(db, 'safety_alerts', alertId), {
        status: 'resolved',
        resolutionNote: 'Atendido desde App Supervisor',
        resolvedBy: user?.email || user?.displayName || 'Supervisor',
        resolvedAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch {}
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Ionicons name="warning" size={16} color="#7F1D1D" />
            <Text style={styles.badgeText}>ALERTA CRÍTICA · CONDUCTOR SOS</Text>
          </View>

          <Text style={styles.title}>🚨 Botón de Pánico Activado</Text>
          <Text style={styles.subtitle}>
            Un conductor de tu flota necesita asistencia urgente.
          </Text>

          <View style={styles.driverBox}>
            {currentAlert.driverPhoto ? (
              <Image
                source={{ uri: currentAlert.driverPhoto }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={28} color="#FFFFFF" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>
                {currentAlert.driverName || 'Conductor'}
              </Text>
              <Text style={styles.driverMeta}>
                🚗 {currentAlert.vehicleInfo || 'Vehículo'} · Dominio{' '}
                {currentAlert.vehiclePlate || 'S/D'}
              </Text>
              {currentAlert.driverPhone ? (
                <Text style={styles.driverPhone}>📞 {currentAlert.driverPhone}</Text>
              ) : null}
            </View>
          </View>

          {currentAlert.passengerName ? (
            <View style={styles.tripInfoBox}>
              <Text style={styles.tripInfoText}>
                Pasajero en viaje: {currentAlert.passengerName}
                {currentAlert.passengerPhone
                  ? ` (${currentAlert.passengerPhone})`
                  : ''}
              </Text>
              {currentAlert.destination ? (
                <Text style={styles.tripDestText} numberOfLines={1}>
                  Destino: {currentAlert.destination}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actionsGrid}>
            {currentAlert.driverPhone ? (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${currentAlert.driverPhone}`)}
              >
                <Ionicons name="call" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>Llamar Chofer</Text>
              </TouchableOpacity>
            ) : null}

            {waPhone ? (
              <TouchableOpacity
                style={styles.waBtn}
                onPress={() => Linking.openURL(`https://wa.me/${waPhone}`)}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {mapsUrl ? (
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => Linking.openURL(mapsUrl)}
            >
              <Ionicons name="location" size={18} color="#0F172A" />
              <Text style={[styles.btnText, { color: '#0F172A' }]}>
                Abrir ubicación exacta en Google Maps
              </Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.footerBtns}>
            <TouchableOpacity
              style={styles.muteBtn}
              onPress={() => {
                setMuted((m) => !m);
                Vibration.cancel();
                Speech.stop();
              }}
            >
              <Ionicons
                name={muted ? 'volume-high' : 'volume-mute'}
                size={16}
                color="#FCA5A5"
              />
              <Text style={styles.muteText}>
                {muted ? 'Reactivar alarma' : 'Silenciar alarma'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resolveBtn}
              onPress={() => handleResolve(currentAlert.id)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.btnText}>Marcar Atendida</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 22,
    borderWidth: 2,
    borderColor: '#F87171',
    gap: 12,
  },
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDE047',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: '#7F1D1D',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 21,
    fontFamily: 'Quicksand-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Quicksand-Medium',
    color: '#CBD5E1',
    textAlign: 'center',
  },
  driverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#F87171',
  },
  avatarFallback: {
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: '#FFFFFF',
  },
  driverMeta: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#CBD5E1',
    marginTop: 2,
  },
  driverPhone: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: '#38BDF8',
    marginTop: 2,
  },
  tripInfoBox: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 10,
  },
  tripInfoText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: '#F8FAFC',
  },
  tripDestText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Regular',
    color: '#CBD5E1',
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapBtn: {
    backgroundColor: '#FBBF24',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  muteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  muteText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
  },
  resolveBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
  },
});
