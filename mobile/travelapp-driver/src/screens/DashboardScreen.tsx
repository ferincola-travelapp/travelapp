import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Image,
  Animated, Alert, Modal, Linking, Dimensions, ActivityIndicator, ScrollView, TextInput,
  AppState, AppStateStatus, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, limit } from 'firebase/firestore';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Colors } from '../lib/constants';
import { TravelCabLogo } from '../components/BrandLogos';
import { InteractiveMapView } from '../components/InteractiveMapView';
import { playTripRequestAlertSound, playSeatbeltSafetyPrompt, playCustomVoiceNotification } from '../lib/audioService';

const { width, height } = Dimensions.get('window');

interface Vehicle {
  id: string;
  brand: string;
  plate: string;
  color: string;
  category: string;
  active: boolean;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [isOnline, setIsOnline] = useState(false);
  const [todayTrips, setTodayTrips] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [activeTrip, setActiveTrip] = useState<any>(null);

  // Inactividad y Validación Biométrica
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricTimeoutMinutes, setBiometricTimeoutMinutes] = useState(5); // default 5 mins
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);

  // Taxímetro de viaje libre (Modo Taxi)
  const [taximeterVisible, setTaximeterVisible] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [taximeterStep, setTaximeterStep] = useState<'idle' | 'running' | 'summary'>('idle');
  const [taxiSeconds, setTaxiSeconds] = useState(0);
  const [taxiDistance, setTaxiDistance] = useState(0.0);
  const [taxiFare, setTaxiFare] = useState(300.0);
  const [freeTripTariff, setFreeTripTariff] = useState<{
    baseFare: number;
    pricePerKm: number;
    travelMinutePrice: number;
    waitMinutePrice: number;
    name: string;
  }>({
    baseFare: 300,
    pricePerKm: 180,
    travelMinutePrice: 50,
    waitMinutePrice: 50,
    name: 'Tarifario Municipal Oficial'
  });
  const [referralPassengerBonus, setReferralPassengerBonus] = useState(1500);
  const [referralDriverBonus, setReferralDriverBonus] = useState(2000);
  const [freeTripPassengerEmail, setFreeTripPassengerEmail] = useState('');
  const [freeTripPassengerPhone, setFreeTripPassengerPhone] = useState('');
  const [freeTripPassengerName, setFreeTripPassengerName] = useState('');
  const [sendingReceipt, setSendingReceipt] = useState(false);

  const appState = useRef(AppState.currentState);
  const [lastBackgroundTime, setLastBackgroundTime] = useState<number | null>(null);

  // Escuchar tarifario exclusivo de viaje libre / taxímetro desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tariffs'), (snap) => {
      const allTariffs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      // Buscar primero el tarifario marcado como isFreeTripOnly activo
      let taxiTariff = allTariffs.find(t => t.isActive !== false && t.isFreeTripOnly);
      // Fallback: buscar uno con categoría 'taxi' o nombre 'taxi' / 'sutrappa'
      if (!taxiTariff) {
        taxiTariff = allTariffs.find(t => t.isActive !== false && (
          t.category?.toLowerCase() === 'taxi' || 
          t.id?.toLowerCase().includes('taxi') || 
          t.name?.toLowerCase().includes('taxi') ||
          t.name?.toLowerCase().includes('sutrappa')
        ));
      }

      if (taxiTariff) {
        const base = Number(taxiTariff.baseFare) || 300;
        const km = Number(taxiTariff.pricePerKm) || 180;
        const min = Number(taxiTariff.travelMinutePrice || taxiTariff.waitMinutePrice) || 50;
        setFreeTripTariff({
          baseFare: base,
          pricePerKm: km,
          travelMinutePrice: min,
          waitMinutePrice: Number(taxiTariff.waitMinutePrice) || min,
          name: taxiTariff.name || 'Tarifario Municipal Oficial'
        });
      }
    }, (err) => console.log('Error fetching free trip tariff in driver app:', err));

    return unsub;
  }, []);

  // Escuchar configuración de seguridad de Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config', 'driver_settings'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.biometricTimeoutMinutes !== undefined) {
          setBiometricTimeoutMinutes(data.biometricTimeoutMinutes);
        }
        if (data.referralPassengerBonus !== undefined) {
          setReferralPassengerBonus(data.referralPassengerBonus);
        }
        if (data.referralDriverBonus !== undefined) {
          setReferralDriverBonus(data.referralDriverBonus);
        }
      }
    });
    return unsub;
  }, []);

  // Efecto del taxímetro digital activo con GPS Real y tarifas dinámicas de Firestore
  useEffect(() => {
    let timerInterval: any = null;

    if (taximeterStep === 'running') {
      // 1. Contador de tiempo por segundo (tiempo de viaje / espera)
      timerInterval = setInterval(() => {
        setTaxiSeconds(prev => prev + 1);
      }, 1000);

      // 2. Rastreo GPS de alta precisión en tiempo real
      const startTaximeterGps = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const currentPos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            }).catch(() => null);

            if (currentPos) {
              lastTaximeterLocation.current = {
                latitude: currentPos.coords.latitude,
                longitude: currentPos.coords.longitude,
              };
            }

            const watcher = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                timeInterval: 2000,
                distanceInterval: 4, // Actualizar cada 4 metros de desplazamiento real
              },
              (loc) => {
                if (lastTaximeterLocation.current) {
                  const deltaKm = calculateDistanceKm(
                    lastTaximeterLocation.current.latitude,
                    lastTaximeterLocation.current.longitude,
                    loc.coords.latitude,
                    loc.coords.longitude
                  );

                  // Filtrar jitter / ruido de GPS (solo si recorrió entre 4 metros y 500 metros por lectura)
                  if (deltaKm >= 0.004 && deltaKm <= 0.5) {
                    setTaxiDistance(prev => Number((prev + deltaKm).toFixed(3)));
                    lastTaximeterLocation.current = {
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                    };
                  }
                } else {
                  lastTaximeterLocation.current = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                  };
                }
              }
            );
            taximeterWatcher.current = watcher;
          }
        } catch (err) {
          console.log('Error starting taximeter GPS watcher:', err);
        }
      };

      startTaximeterGps();
    } else {
      if (taximeterWatcher.current) {
        taximeterWatcher.current.remove();
        taximeterWatcher.current = null;
      }
      lastTaximeterLocation.current = null;
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (taximeterWatcher.current) {
        taximeterWatcher.current.remove();
        taximeterWatcher.current = null;
      }
    };
  }, [taximeterStep]);

  // Recalcular tarifa acumulada del taxímetro en vivo: por saltos cada 100 metros y cada 10 minutos
  useEffect(() => {
    if (taximeterStep === 'running') {
      const base = freeTripTariff.baseFare;
      // Saltos de ficha de distancia: cada 100 metros recorridos
      const distanceBlocks = Math.floor((taxiDistance * 1000) / 100);
      const pricePer100m = (freeTripTariff.pricePerKm || 180) / 10.0;
      const distCost = distanceBlocks * pricePer100m;

      // Saltos de ficha de tiempo: cada 10 minutos de viaje o espera (600 segundos)
      const timeBlocks = Math.floor(taxiSeconds / 600);
      const waitBlockPrice = (freeTripTariff.waitMinutePrice || freeTripTariff.travelMinutePrice || 50) * 10.0;
      const timeCost = timeBlocks * waitBlockPrice;

      setTaxiFare(Math.max(base, Math.round(base + distCost + timeCost)));
    }
  }, [taxiSeconds, taxiDistance, freeTripTariff, taximeterStep]);

  // Timer de inactividad activa en pantalla
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const inactiveMs = Date.now() - lastActiveTime;
      const timeoutMs = biometricTimeoutMinutes * 60 * 1000;
      if (inactiveMs > timeoutMs && !showBiometricModal && isOnline) {
        setShowBiometricModal(true);
      }
    }, 10000); // Chequear cada 10 segundos
    return () => clearInterval(checkInterval);
  }, [lastActiveTime, biometricTimeoutMinutes, showBiometricModal, isOnline]);

  // Listener de AppState (Inactividad por segundo plano)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App vuelve al primer plano
        if (lastBackgroundTime) {
          const inactiveMs = Date.now() - lastBackgroundTime;
          const timeoutMs = biometricTimeoutMinutes * 60 * 1000;
          if (inactiveMs > timeoutMs && !showBiometricModal) {
            setShowBiometricModal(true);
          }
        }
        setLastActiveTime(Date.now()); // Reiniciar tiempo activo al volver
      } else if (nextAppState.match(/inactive|background/)) {
        // App pasa al segundo plano
        setLastBackgroundTime(Date.now());
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [lastBackgroundTime, biometricTimeoutMinutes, showBiometricModal]);

  // Disparar autenticación biométrica real automáticamente cuando se abre el modal
  useEffect(() => {
    if (showBiometricModal) {
      handleTriggerBiometric();
    }
  }, [showBiometricModal]);

  const handleTriggerBiometric = async () => {
    setIsBiometricScanning(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const isEnrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Seguridad Conductor: Verificá tu identidad',
          cancelLabel: 'Cancelar',
          disableDeviceFallback: false,
        });

        if (result.success) {
          setIsBiometricScanning(false);
          setBiometricSuccess(true);
          setTimeout(() => {
            setBiometricSuccess(false);
            setShowBiometricModal(false);
            setLastActiveTime(Date.now());
          }, 800);
          return;
        } else {
          setIsBiometricScanning(false);
          return;
        }
      } else {
        // Fallback en simulador o sin sensor
        setIsBiometricScanning(false);
        setBiometricSuccess(true);
        setTimeout(() => {
          setBiometricSuccess(false);
          setShowBiometricModal(false);
          setLastActiveTime(Date.now());
        }, 800);
      }
    } catch (e) {
      console.log('Biometric inactivity prompt error:', e);
      setIsBiometricScanning(false);
      setShowBiometricModal(false);
      setLastActiveTime(Date.now());
    }
  };
  
  // Modales y Menú
  const [menuVisible, setMenuVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  // Vehículos
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newCategory, setNewCategory] = useState('Standard');
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Ubicación del conductor
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideMenuAnim = useRef(new Animated.Value(-width * 0.75)).current;
  const locationInterval = useRef<any>(null);
  const lastTaximeterLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const taximeterWatcher = useRef<any>(null);

  // Cálculo de distancia Geodésica (Haversine) para el Taxímetro Real por GPS
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio terrestre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const user = auth.currentUser;

  // Animación de menú lateral
  useEffect(() => {
    if (menuVisible) {
      Animated.timing(slideMenuAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideMenuAnim, {
        toValue: -width * 0.75,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [menuVisible]);

  // Pulso animado cuando está online
  useEffect(() => {
    try {
      if (isOnline) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          ])
        ).start();
      } else {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
      }
    } catch (e) {
      console.warn('Animation error:', e);
    }
  }, [isOnline]);

  // Obtener ubicación inicial con fallbacks de alta robustez
  useEffect(() => {
    const getInitialLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentLocation({
            latitude: -26.82414,
            longitude: -65.22260,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
          setLoadingLocation(false);
          return;
        }

        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc || !loc.coords || typeof loc.coords.latitude !== 'number' || isNaN(loc.coords.latitude)) {
          loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        }

        if (loc && loc.coords && typeof loc.coords.latitude === 'number' && !isNaN(loc.coords.latitude)) {
          setCurrentLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        } else {
          setCurrentLocation({
            latitude: -26.82414,
            longitude: -65.22260,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        }
      } catch (e) {
        console.log("Error getting location, using fallback coordinate", e);
        setCurrentLocation({
          latitude: -26.82414,
          longitude: -65.22260,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      } finally {
        setLoadingLocation(false);
      }
    };
    getInitialLocation();
  }, []);

  // Escuchar viajes de hoy, solicitudes y modulo de vehículos
  useEffect(() => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const q = query(
      collection(db, 'trips'),
      where('driverId', '==', user.uid),
      where('status', '==', 'completed')
    );

    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      let earnings = 0;
      snap.forEach(d => {
        const trip = d.data();
        const tripDate = trip.createdAt?.toDate ? trip.createdAt.toDate().getTime() : (typeof trip.createdAt === 'number' ? trip.createdAt : 0);
        if (tripDate >= todayTimestamp) {
          count++;
          earnings += (trip.finalPrice || trip.estimatedPrice || 0);
        }
      });
      setTodayTrips(count);
      setTodayEarnings(earnings);
    }, (err) => console.log("Completed trips listener:", err));

    // Escuchar si hay un viaje activo asignado a este chofer
    const qActive = query(
      collection(db, 'trips'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'on_way', 'arrived', 'in_progress'])
    );
    const unsubActive = onSnapshot(qActive, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setActiveTrip({ id: d.id, ...d.data() });
      } else {
        setActiveTrip(null);
      }
    }, (err) => console.log('Active trip listener err:', err));

    // Escuchar si hay viajes pendientes (en búsqueda real) no rechazados por este chofer
    const qPending = query(collection(db, 'trips'), where('status', '==', 'searching'));
    const unsubPending = onSnapshot(qPending, (snap) => {
      try {
        if (isOnline && !snap.empty && user?.uid && !activeTrip) {
          const validDoc = snap.docs.find(docSnap => {
            const data = docSnap.data();
            const rejectedList = data.rejectedBy || [];
            return !rejectedList.includes(user.uid);
          });
          if (validDoc) {
            const trip = { id: validDoc.id, ...validDoc.data() };
            navigation.navigate('TripRequest', { trip });
          }
        }
      } catch (err) {
        console.warn("Error checking pending trips:", err);
      }
    }, (err) => console.warn("Pending trips error:", err));

    // Escuchar vehículos en Firestore
    const unsubVehicles = onSnapshot(collection(db, 'drivers', user.uid, 'vehicles'), async (snap) => {
      try {
        if (snap.empty) {
          const defaultVehicle = {
            brand: 'Chevrolet Prisma',
            plate: 'AB 123 CD',
            color: 'Blanco',
            category: 'Standard',
            active: true,
            createdAt: Timestamp.now()
          };
          const docRef = await addDoc(collection(db, 'drivers', user.uid, 'vehicles'), defaultVehicle);
          await setDoc(doc(db, 'drivers', user.uid), {
            activeVehicle: { id: docRef.id, ...defaultVehicle }
          }, { merge: true });
        } else {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
          setVehicles(list);
        }
      } catch (e) {
        console.warn("Error loading vehicles:", e);
      }
    }, (err) => console.warn("Vehicles listener error:", err));

    // Escuchar notificaciones y alertas de voz entrantes desde el Dashboard Web
    const lastNotifProcessed = { current: 0 };
    const qNotifications = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(1));
    const unsubNotifications = onSnapshot(qNotifications, (snap) => {
      if (!snap.empty) {
        const notif = snap.docs[0].data();
        const notifTime = notif.timestamp || 0;
        // Solo reproducir si es nueva (no escuchada previamente en esta sesión) y de los últimos 30 segundos
        if (notifTime > lastNotifProcessed.current && (Date.now() - notifTime < 30000)) {
          lastNotifProcessed.current = notifTime;
          if (notif.audience === 'all' || notif.audience === 'drivers' || notif.targetUserId === user.uid) {
            if (notif.soundAlert === 'driver_alert') {
              playTripRequestAlertSound();
            } else if (notif.soundAlert === 'seatbelt_safety') {
              playSeatbeltSafetyPrompt();
            } else if (notif.soundAlert !== 'none' && notif.message) {
              playCustomVoiceNotification(notif.message);
            }
          }
        }
      }
    });

    return () => {
      unsub();
      unsubActive();
      unsubPending();
      unsubVehicles();
      unsubNotifications();
    };
  }, [isOnline, user?.uid]);

  // Enviar ubicación periódicamente cuando está online con protección total contra crashes
  useEffect(() => {
    if (isOnline && user?.uid) {
      try {
        activateKeepAwakeAsync('driver_online').catch(() => {});
      } catch {}

      const updateLocation = async () => {
        try {
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
          if (!loc || !loc.coords) {
            loc = await Location.getLastKnownPositionAsync({}).catch(() => null);
          }
          if (loc && loc.coords && typeof loc.coords.latitude === 'number' && !isNaN(loc.coords.latitude)) {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setCurrentLocation({ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 });
            
            if (user?.uid) {
              await setDoc(doc(db, 'drivers', user.uid), {
                isOnline: true,
                location: coords,
                updatedAt: Timestamp.now(),
                name: user.displayName || 'Conductor',
              }, { merge: true }).catch(() => {});
            }
          }
        } catch (e) {
          console.log("Error updating driver location:", e);
        }
      };

      updateLocation();
      locationInterval.current = setInterval(updateLocation, 10000);
    } else {
      try {
        deactivateKeepAwake('driver_online');
      } catch {}
      if (locationInterval.current) clearInterval(locationInterval.current);
      if (user?.uid) {
        setDoc(doc(db, 'drivers', user.uid), { isOnline: false, updatedAt: Timestamp.now() }, { merge: true }).catch(() => {});
      }
    }
    return () => {
      try {
        deactivateKeepAwake('driver_online');
      } catch {}
      if (locationInterval.current) clearInterval(locationInterval.current);
    };
  }, [isOnline, user?.uid]);

  const toggleOnline = async () => {
    if (!user) return;
    if (!isOnline) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'granted' }));
        if (status !== 'granted') {
          return Alert.alert('Permisos Requeridos 📍', 'Necesitamos acceso a tu ubicación para conectarte a la flota.');
        }

        const hasServices = await Location.hasServicesEnabledAsync().catch(() => true);
        if (!hasServices) {
          return Alert.alert('GPS Desactivado 📡', 'Por favor activá la Ubicación / GPS de tu teléfono para ponerte en línea.');
        }

        setIsOnline(true);
      } catch (err) {
        console.warn("Error toggling online:", err);
        setIsOnline(true);
      }
    } else {
      setIsOnline(false);
    }
  };

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, fontFamily: 'Quicksand-Bold', color: Colors.textDark }}>Cargando sesión...</Text>
      </View>
    );
  }

  const handleSupportOption = (type: 'emergency' | 'whatsapp' | 'travis') => {
    setSupportModalVisible(false);
    if (type === 'emergency') {
      Linking.openURL('tel:911');
    } else if (type === 'whatsapp') {
      Linking.openURL('https://wa.me/5491100000000?text=Hola,%20necesito%20soporte%20como%20conductor%20en%20TravelApp.');
    } else if (type === 'travis') {
      Linking.openURL('https://travelapp.ar/support');
    }
  };

  const handleMenuNavigation = (route: string) => {
    setMenuVisible(false);
    navigation.navigate(route);
  };

  // Gestión de Vehículos
  const handleSelectActiveVehicle = async (vehicleId: string) => {
    try {
      const targetVehicle = vehicles.find(v => v.id === vehicleId);
      if (!targetVehicle) return;

      // Actualizar todos los vehículos en Firestore
      for (const v of vehicles) {
        await updateDoc(doc(db, 'drivers', user.uid, 'vehicles', v.id), {
          active: v.id === vehicleId
        });
      }

      // Actualizar el vehículo activo en el perfil principal del conductor
      await setDoc(doc(db, 'drivers', user.uid), {
        activeVehicle: {
          id: targetVehicle.id,
          brand: targetVehicle.brand,
          plate: targetVehicle.plate,
          color: targetVehicle.color,
          category: targetVehicle.category,
          active: true
        }
      }, { merge: true });

      Alert.alert('Vehículo activado', `Ahora estás manejando el ${targetVehicle.brand}.`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo activar el vehículo. Intentá de nuevo.');
    }
  };

  const handleAddVehicle = async () => {
    if (!newBrand || !newPlate || !newColor) {
      return Alert.alert('Campos incompletos', 'Por favor completa marca/modelo, patente y color.');
    }
    if (vehicles.length >= 3) {
      return Alert.alert('Límite alcanzado', 'Solo podés tener hasta 3 vehículos registrados.');
    }

    setSavingVehicle(true);
    try {
      const isFirst = vehicles.length === 0;
      const vehicleData = {
        brand: newBrand,
        plate: newPlate.toUpperCase(),
        color: newColor,
        category: newCategory,
        active: isFirst,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'drivers', user.uid, 'vehicles'), vehicleData);

      if (isFirst) {
        await setDoc(doc(db, 'drivers', user.uid), {
          activeVehicle: { id: docRef.id, ...vehicleData }
        }, { merge: true });
      }

      // Limpiar Formulario
      setNewBrand('');
      setNewPlate('');
      setNewColor('');
      setNewCategory('Standard');
      setShowAddVehicleForm(false);
      Alert.alert('Éxito', 'Vehículo registrado correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el vehículo.');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, isActive: boolean) => {
    if (isActive && vehicles.length > 1) {
      return Alert.alert('Operación no permitida', 'No podés eliminar el vehículo que tenés activo actualmente. Primero activa otro.');
    }

    Alert.alert('Eliminar vehículo', '¿Estás seguro de que deseas eliminar este vehículo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'drivers', user.uid, 'vehicles', vehicleId));
            // Si era el único, limpiar en perfil
            if (vehicles.length === 1) {
              await setDoc(doc(db, 'drivers', user.uid), {
                activeVehicle: null
              }, { merge: true });
            }
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el vehículo.');
          }
        }
      }
    ]);
  };

  const activeVehicle = vehicles.find(v => v.active);
  const isTaxi = activeVehicle?.category === 'Taxi';

  const formatTaxiTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container} onTouchStart={() => setLastActiveTime(Date.now())}>
      {/* Mapa en tiempo real */}
      {loadingLocation ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Iniciando GPS...</Text>
        </View>
      ) : (
        <InteractiveMapView
          style={styles.map}
          originCoords={
            currentLocation
              ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
              : { latitude: -26.8326, longitude: -65.2038 }
          }
          onlineDrivers={
            isOnline && currentLocation
              ? [{ id: auth.currentUser?.uid || 'me', name: 'Tu Vehículo Online', location: currentLocation, heading: 0 }]
              : []
          }
        />
      )}

      {/* Visor de recaudación del día en la parte superior */}
      <View style={[styles.topBar, { top: insets.top > 0 ? insets.top + 8 : 40 }]}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
          <Ionicons name="menu" size={28} color={Colors.primary} />
        </TouchableOpacity>

        {/* Botón Acceso Rápido a Mi Agenda */}
        <TouchableOpacity 
          style={[styles.menuButton, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1 }]}
          onPress={() => navigation.navigate('Schedule')}
        >
          <Ionicons name="calendar" size={22} color="#D97706" />
        </TouchableOpacity>

        {/* Botón Mi Código QR de Ventanilla */}
        <TouchableOpacity 
          style={[styles.menuButton, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD', borderWidth: 1 }]}
          onPress={() => setShowQrModal(true)}
        >
          <Ionicons name="qr-code" size={20} color="#0284C7" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.revenueCard}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Text style={styles.revenueLabel}>Recaudación hoy</Text>
          <Text style={styles.revenueValue}>${todayEarnings.toLocaleString('es-AR')} ARS</Text>
        </TouchableOpacity>
      </View>

      {/* Banner de Viaje en Curso si el chofer tiene un viaje activo */}
      {activeTrip && (
        <TouchableOpacity
          style={[styles.activeTripFloatingCard, { top: insets.top > 0 ? insets.top + 76 : 105 }]}
          onPress={() => navigation.navigate('ActiveTrip', { tripId: activeTrip.id })}
          activeOpacity={0.9}
        >
          <View style={styles.activeTripIconBox}>
            <Ionicons name="navigate" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.activePulseDot} />
              <Text style={styles.activeTripTitle}>
                Viaje en curso ({activeTrip.status === 'on_way' ? 'En camino' : activeTrip.status === 'arrived' ? 'En punto' : activeTrip.status === 'in_progress' ? 'Hacia destino' : 'Asignado'})
              </Text>
            </View>
            <Text style={styles.activeTripSub} numberOfLines={1}>
              {activeTrip.destination || 'Toca para continuar viaje'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* Panel Inferior Flotante */}
      <View style={styles.bottomCard}>
        {/* Switch de Online / Offline */}
        <View style={[styles.onlineRow, isOnline && styles.onlineRowActive]}>
          <Animated.View style={[styles.onlineIndicator, { transform: [{ scale: pulseAnim }], backgroundColor: isOnline ? Colors.online : Colors.offline }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.onlineTitle, isOnline && styles.onlineTitleActive]}>
              {isOnline ? '● En línea' : '○ Desconectado'}
            </Text>
            <Text style={styles.onlineSubtitle}>
              {isOnline ? 'Recibiendo solicitudes de viajes' : 'Conectate para empezar a facturar'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: Colors.border, true: Colors.online + '60' }}
            thumbColor={isOnline ? Colors.online : Colors.textMuted}
            ios_backgroundColor={Colors.border}
          />
        </View>

        {/* Estadísticas en Tarjetas */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="car" size={20} color={Colors.primary} />
            <Text style={styles.statVal}>{todayTrips}</Text>
            <Text style={styles.statLabel}>Viajes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="star" size={20} color={Colors.accent} />
            <Text style={styles.statVal}>4.9</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time" size={20} color="#8B5CF6" />
            <Text style={styles.statVal}>6.5h</Text>
            <Text style={styles.statLabel}>Activo</Text>
          </View>
        </View>

        {/* Botón Viaje Libre / Taxímetro SUTRAPA (Habilitado exclusivamente para taxis y administradores) */}
        {(vehicles.some(v => v.category?.toLowerCase().includes('taxi')) || (user?.email && (user.email.toLowerCase().includes('admin') || user.email.toLowerCase().includes('fer') || user.email.toLowerCase().includes('carlos') || user.email.toLowerCase().includes('edgar')))) && (
          <TouchableOpacity 
            style={[styles.taximeterBtn, { height: 56, justifyContent: 'center' }]} 
            onPress={() => {
              setTaximeterStep('idle');
              setTaxiSeconds(0);
              setTaxiDistance(0.0);
              setTaxiFare(freeTripTariff.baseFare);
              setTaximeterVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="calculator-outline" size={24} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={[styles.taximeterBtnText, { fontSize: 15, fontWeight: '800' }]}>Modo Taxímetro (Viaje Libre / SUTRAPPA)</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MODAL MI CÓDIGO QR DE VENTANILLA */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.qrModalIconBox}>
                  <Ionicons name="qr-code" size={24} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.qrModalTitle}>Tu QR de Ventanilla</Text>
                  <Text style={styles.qrModalSubtitle}>Para subidas directas de pasajeros</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowQrModal(false)} style={styles.qrModalCloseBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrImageContainer}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
                    `travelapp:driver:${user?.uid || 'demo'}:${(activeVehicle?.plate || 'TAXI').replace(/\s+/g, '')}`
                  )}`
                }}
                style={styles.qrCodeImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.qrCodeInfoBadge}>
              <Text style={styles.qrCodeBadgeLabel}>CÓDIGO DE CHOFER / PATENTE</Text>
              <Text style={styles.qrCodeBadgeVal}>{activeVehicle?.plate || user?.uid?.substring(0, 7).toUpperCase() || 'AUTO-01'}</Text>
            </View>

            <Text style={styles.qrInstructionText}>
              El pasajero puede escanear este código con su app TravelApp o ingresar tu código para iniciar el taxímetro digital o un viaje directo al instante.
            </Text>

            <TouchableOpacity
              style={styles.qrDoneButton}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={styles.qrDoneButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE TAXÍMETRO (VIAJE LIBRE / SUTRAPPA) */}
      <Modal
        visible={taximeterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (taximeterStep !== 'running') {
            setTaximeterVisible(false);
          }
        }}
      >
        <View style={styles.taximeterOverlay}>
          <View style={styles.taximeterSheet}>
            {/* Pull Bar */}
            <View style={styles.sheetHandle} />

            <View style={styles.taximeterHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#0284C7' + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="calculator" size={24} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.taximeterTitle}>Taxímetro SUTRAPPA</Text>
                  <Text style={styles.taximeterSubtitle}>Modo Viaje Libre en Calle</Text>
                </View>
              </View>
              {taximeterStep !== 'running' && (
                <TouchableOpacity onPress={() => setTaximeterVisible(false)} style={styles.closeTaximeterBtn}>
                  <Ionicons name="close" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
            >
              {taximeterStep === 'idle' && (
                <View style={{ width: '100%', gap: 16 }}>
                  <View style={styles.taxiRateCard}>
                    <Text style={styles.rateCardTitle}>{freeTripTariff.name}</Text>
                    <View style={styles.taxiRateRow}>
                      <Text style={styles.taxiRateLabel}>Bajada de Bandera:</Text>
                      <Text style={styles.taxiRateValue}>${freeTripTariff.baseFare.toFixed(2)} ARS</Text>
                    </View>
                    <View style={styles.taxiRateRow}>
                      <Text style={styles.taxiRateLabel}>Valor por Kilómetro:</Text>
                      <Text style={styles.taxiRateValue}>${freeTripTariff.pricePerKm.toFixed(2)} ARS</Text>
                    </View>
                    <View style={styles.taxiRateRow}>
                      <Text style={styles.taxiRateLabel}>Valor por Minuto:</Text>
                      <Text style={styles.taxiRateValue}>${freeTripTariff.travelMinutePrice.toFixed(2)} ARS</Text>
                    </View>
                  </View>

                  {/* Datos del Pasajero para Recibo Opcional */}
                  <View style={{ width: '100%', gap: 6 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Quicksand-Bold', color: '#64748B' }}>
                      Email del Pasajero (Para Recibo Digital Opcional):
                    </Text>
                    <TextInput
                      style={styles.taximeterInput}
                      placeholder="pasajero@gmail.com (Opcional)"
                      placeholderTextColor={Colors.textMuted}
                      value={freeTripPassengerEmail}
                      onChangeText={setFreeTripPassengerEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Botón Gigante Iniciar Viaje (Verde) */}
                  <TouchableOpacity 
                    style={styles.btnStartFreeTrip}
                    onPress={() => {
                      setTaxiSeconds(0);
                      setTaxiDistance(0);
                      setTaxiFare(freeTripTariff.baseFare);
                      lastTaximeterLocation.current = null;
                      setTaximeterStep('running');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="play-circle" size={32} color={Colors.white} style={{ marginRight: 10 }} />
                    <Text style={styles.btnStartFreeTripText}>INICIAR VIAJE LIBRE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.btnCancelFreeTrip}
                    onPress={() => setTaximeterVisible(false)}
                  >
                    <Text style={styles.btnCancelFreeTripText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {taximeterStep === 'running' && (
                <View style={{ width: '100%', gap: 18, alignItems: 'center' }}>
                  <View style={styles.taxiLiveBigBox}>
                    <Text style={styles.taxiLiveBigFare}>${taxiFare} ARS</Text>
                    <Text style={styles.taxiLiveBigSub}>Tarifa Acumulada en Vivo</Text>
                  </View>

                  <View style={styles.taxiLiveStatsRow}>
                    <View style={styles.taxiStatCard}>
                      <Ionicons name="time-outline" size={26} color={Colors.primary} />
                      <Text style={styles.taxiStatCardVal}>{formatTaxiTime(taxiSeconds)}</Text>
                      <Text style={styles.taxiStatCardLabel}>Tiempo</Text>
                    </View>
                    <View style={styles.taxiStatCard}>
                      <Ionicons name="speedometer-outline" size={26} color={Colors.accent} />
                      <Text style={styles.taxiStatCardVal}>{taxiDistance.toFixed(2)} km</Text>
                      <Text style={styles.taxiStatCardLabel}>Distancia</Text>
                    </View>
                  </View>

                  {/* Botón Gigante Finalizar Viaje (Rojo) */}
                  <TouchableOpacity 
                    style={styles.btnStopFreeTrip}
                    onPress={() => setTaximeterStep('summary')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="stop-circle" size={34} color={Colors.white} style={{ marginRight: 10 }} />
                    <Text style={styles.btnStopFreeTripText}>FINALIZAR VIAJE</Text>
                  </TouchableOpacity>
                </View>
              )}

              {taximeterStep === 'summary' && (
                <View style={{ width: '100%', gap: 14 }}>
                  <View style={styles.taxiSummaryBox}>
                    <Text style={styles.summaryTitle}>Resumen del Viaje Finalizado</Text>
                    <View style={styles.taxiRateRow}>
                      <Text style={styles.taxiRateLabel}>Bajada de Bandera:</Text>
                      <Text style={styles.taxiRateValue}>${freeTripTariff.baseFare} ARS</Text>
                    </View>
                    <View style={styles.taxiRateRow}>
                      <Text style={styles.taxiRateLabel}>Distancia ({taxiDistance.toFixed(2)} km):</Text>
                      <Text style={styles.taxiRateValue}>${Math.round(taxiDistance * freeTripTariff.pricePerKm)} ARS</Text>
                    </View>
                    <View style={styles.taxiRateRow}>
                      <Text style={styles.taxiRateLabel}>Tiempo ({formatTaxiTime(taxiSeconds)}):</Text>
                      <Text style={styles.taxiRateValue}>${Math.round((taxiSeconds / 60) * freeTripTariff.travelMinutePrice)} ARS</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total a Cobrar:</Text>
                      <Text style={styles.totalVal}>${taxiFare} ARS</Text>
                    </View>
                  </View>

                  {/* Inputs de Recibo */}
                  <View style={{ width: '100%', gap: 8 }}>
                    <TextInput
                      style={styles.taximeterInput}
                      placeholder="Email del pasajero (opcional)"
                      placeholderTextColor={Colors.textMuted}
                      value={freeTripPassengerEmail}
                      onChangeText={setFreeTripPassengerEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={styles.taximeterInput}
                      placeholder="WhatsApp del pasajero (ej. 3814123456)"
                      placeholderTextColor={Colors.textMuted}
                      value={freeTripPassengerPhone}
                      onChangeText={setFreeTripPassengerPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Acciones de Recibo y Cobro */}
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <TouchableOpacity 
                      style={styles.btnReceiptWhatsApp}
                      onPress={async () => {
                        const receiptMsg = 
                          `🧾 *RECIBO OFICIAL DE VIAJE - TRAVELAPP*\n\n` +
                          `🚗 *Conductor:* ${user?.displayName || 'Conductor TravelCab'}\n` +
                          `💰 *Total:* $${taxiFare} ARS\n` +
                          `⏱️ *Tiempo:* ${formatTaxiTime(taxiSeconds)} | 📏 *Distancia:* ${taxiDistance.toFixed(2)} km\n` +
                          `📍 *Servicio:* Viaje Libre / SUTRAPPA\n` +
                          `📅 *Fecha:* ${new Date().toLocaleDateString('es-AR')}\n\n` +
                          `📲 *Descargá TravelApp en tu celular para pedir tu próximo viaje:* \n` +
                          `👉 https://travelapp.ar/descargar`;

                        if (freeTripPassengerPhone) {
                          const cleanPhone = freeTripPassengerPhone.replace(/\D/g, '');
                          Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(receiptMsg)}`).catch(() => {
                            Share.share({ message: receiptMsg });
                          });
                        } else {
                          Linking.openURL(`https://wa.me/?text=${encodeURIComponent(receiptMsg)}`).catch(() => {
                            Share.share({ message: receiptMsg });
                          });
                        }
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.btnReceiptWhatsAppText}>Enviar Recibo por WhatsApp</Text>
                    </TouchableOpacity>

                    {freeTripPassengerEmail ? (
                      <TouchableOpacity 
                        style={styles.btnReceiptEmail}
                        disabled={sendingReceipt}
                        onPress={async () => {
                          setSendingReceipt(true);
                          try {
                            await fetch('https://travelapp-five-nu.vercel.app/api/receipt/send', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                passengerName: freeTripPassengerName || 'Pasajero',
                                passengerEmail: freeTripPassengerEmail,
                                passengerPhone: freeTripPassengerPhone,
                                driverName: user?.displayName || 'Conductor TravelCab',
                                origin: 'Viaje Libre SUTRAPPA',
                                destination: 'Destino Final',
                                totalFare: taxiFare,
                                distanceKm: Number(taxiDistance.toFixed(2)),
                                durationMinutes: Math.round(taxiSeconds / 60),
                                paymentMethod: 'Efectivo',
                                appDownloadUrl: 'https://travelapp.ar/descargar',
                                breakdown: { 
                                  baseFare: freeTripTariff.baseFare, 
                                  distanceCost: Math.round(taxiDistance * freeTripTariff.pricePerKm), 
                                  timeCost: Math.round((taxiSeconds / 60) * freeTripTariff.travelMinutePrice) 
                                }
                              })
                            });
                            Alert.alert('Recibo Enviado 📧', `Enviamos el comprobante digital con enlace de descarga a ${freeTripPassengerEmail}`);
                          } catch (e) {
                            console.warn('Error sending receipt:', e);
                          } finally {
                            setSendingReceipt(false);
                          }
                        }}
                      >
                        {sendingReceipt ? (
                          <ActivityIndicator color={Colors.white} />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="mail" size={18} color={Colors.white} style={{ marginRight: 6 }} />
                            <Text style={styles.btnReceiptEmailText}>Enviar Recibo por Email</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity 
                      style={styles.btnCollectAndFinish}
                      onPress={() => {
                        setTodayEarnings(prev => prev + taxiFare);
                        setTodayTrips(prev => prev + 1);
                        setTaximeterVisible(false);
                        setTaximeterStep('idle');
                        setFreeTripPassengerEmail('');
                        setFreeTripPassengerPhone('');
                        setFreeTripPassengerName('');
                        Alert.alert('Viaje Finalizado 🚖', `Cobro de $${taxiFare} ARS registrado exitosamente.`);
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={24} color={Colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.btnCollectAndFinishText}>COBRAR Y FINALIZAR</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MENÚ HAMBURGUESA LATERAL (DRAWER OVERLAY MODAL) */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} onPress={() => setMenuVisible(false)} />
          
          <Animated.View style={[styles.drawerView, { transform: [{ translateX: slideMenuAnim }] }]}>
            <View style={styles.drawerHeader}>
              <TravelCabLogo size={42} textColor={Colors.white} isAccentColor={false} />
              <View style={styles.drawerUserSection}>
                <View style={styles.drawerAvatar}>
                  <Text style={styles.drawerAvatarText}>
                    {(user.displayName || 'C')[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.drawerUserName} numberOfLines={1}>{user.displayName || 'Conductor'}</Text>
                  <Text style={styles.drawerUserSub}>Socio Verificado</Text>
                </View>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.drawerMenuItems}>
              {[
                { label: 'Mi Perfil', icon: 'person-outline', action: () => handleMenuNavigation('Profile') },
                { label: 'Mi Agenda de Traslados', icon: 'calendar-outline', action: () => handleMenuNavigation('Schedule') },
                { label: 'Mis Vehículos', icon: 'car-sport-outline', action: () => { setMenuVisible(false); setVehicleModalVisible(true); } },
                { label: 'Mi Billetera', icon: 'wallet-outline', action: () => handleMenuNavigation('Wallet') },
                { label: 'Historial de viajes', icon: 'time-outline', action: () => handleMenuNavigation('History') },
                { label: 'Notificaciones', icon: 'notifications-outline', action: () => handleMenuNavigation('Notifications') },
                { label: 'Asistencia', icon: 'help-circle-outline', action: () => { setMenuVisible(false); setSupportModalVisible(true); } },
                { label: 'Información', icon: 'information-circle-outline', action: () => { setMenuVisible(false); setInfoModalVisible(true); } },
              ].map(item => (
                <TouchableOpacity key={item.label} style={styles.drawerItem} onPress={item.action}>
                  <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
                  <Text style={styles.drawerItemLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.drawerFooter}>
              <TouchableOpacity style={styles.logoutBtn} onPress={() => { setMenuVisible(false); signOut(auth); }}>
                <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                <Text style={styles.logoutText}>Cerrar Sesión</Text>
              </TouchableOpacity>
              <Text style={styles.drawerVersion}>Versión 1.1</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL DE ASISTENCIA */}
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
            <Text style={styles.modalSubtitle}>¿En qué podemos ayudarte? Si tenés una emergencia presioná el Botón de Pánico.</Text>

            <TouchableOpacity 
              style={[styles.modalOption, styles.panicButton]} 
              onPress={() => handleSupportOption('emergency')}
            >
              <Ionicons name="call" size={22} color={Colors.white} />
              <Text style={styles.panicText}>Llamar al 911 (Botón de Pánico)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => handleSupportOption('whatsapp')}
            >
              <Ionicons name="logo-whatsapp" size={22} color={Colors.success} />
              <Text style={styles.optionText}>Soporte por WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => handleSupportOption('travis')}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color={Colors.accent} />
              <Text style={styles.optionText}>Chatear con Travis (Asistente IA)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeModalBtn} 
              onPress={() => setSupportModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE VEHÍCULOS (MIS VEHÍCULOS - MÁX 3) */}
      <Modal
        visible={vehicleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setVehicleModalVisible(false); setShowAddVehicleForm(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="car-sport" size={24} color={Colors.primary} />
              <Text style={styles.modalTitle}>Mis Vehículos ({vehicles.length}/3)</Text>
            </View>

            {!showAddVehicleForm ? (
              <ScrollView style={styles.vehicleListScroll} showsVerticalScrollIndicator={false}>
                {vehicles.map(v => (
                  <View key={v.id} style={[styles.vehicleItemCard, v.active && styles.activeVehicleCard]}>
                    <TouchableOpacity 
                      style={styles.vehicleSelectArea} 
                      onPress={() => handleSelectActiveVehicle(v.id)}
                    >
                      <Ionicons 
                        name={v.active ? "checkmark-circle" : "ellipse-outline"} 
                        size={22} 
                        color={v.active ? Colors.success : Colors.textMuted} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vehicleItemTitle}>{v.brand}</Text>
                        <Text style={styles.vehicleItemMeta}>Patente: {v.plate} · Color: {v.color}</Text>
                        <Text style={[styles.vehicleItemCategory, { color: v.active ? Colors.success : Colors.primary }]}>{v.category}</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.deleteVehicleBtn}
                      onPress={() => handleDeleteVehicle(v.id, v.active)}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                {vehicles.length < 3 && (
                  <TouchableOpacity 
                    style={styles.addVehicleBtn}
                    onPress={() => setShowAddVehicleForm(true)}
                  >
                    <Ionicons name="add" size={20} color={Colors.white} />
                    <Text style={styles.addVehicleBtnText}>Registrar nuevo vehículo</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            ) : (
              <ScrollView style={styles.vehicleFormScroll}>
                <Text style={styles.formTitle}>Registrar nuevo vehículo</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Marca y Modelo</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej. Chevrolet Prisma"
                    value={newBrand}
                    onChangeText={setNewBrand}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Patente (Dominio)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej. AB123CD"
                    value={newPlate}
                    onChangeText={setNewPlate}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Color</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej. Blanco"
                    value={newColor}
                    onChangeText={setNewColor}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Categoría de Servicio</Text>
                  <View style={styles.categoryPicker}>
                    {['Standard', 'Premium', 'Taxi'].map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryOpt, newCategory === cat && styles.categoryOptActive]}
                        onPress={() => setNewCategory(cat)}
                      >
                        <Text style={[styles.categoryOptText, newCategory === cat && styles.categoryOptTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formButtons}>
                  <TouchableOpacity 
                    style={styles.cancelFormBtn}
                    onPress={() => setShowAddVehicleForm(false)}
                  >
                    <Text style={styles.cancelFormText}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveFormBtn}
                    onPress={handleAddVehicle}
                    disabled={savingVehicle}
                  >
                    {savingVehicle ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.saveFormText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.closeModalBtn} 
              onPress={() => { setVehicleModalVisible(false); setShowAddVehicleForm(false); }}
            >
              <Text style={styles.closeModalText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE INFORMACIÓN */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="information-circle" size={24} color={Colors.primary} />
              <Text style={styles.modalTitle}>Información de la App</Text>
            </View>
            
            <Text style={styles.infoText}>
              **TravelCab Conductor** es la plataforma de movilidad urbana del ecosistema **TravelApp**.
            </Text>

            <View style={styles.infoSpecs}>
              <Text style={styles.infoSpecItem}>• Versión del sistema: 1.1</Text>
              <Text style={styles.infoSpecItem}>• Motor de Mapas: Google Maps API</Text>
              <Text style={styles.infoSpecItem}>• Ecosistema: TravelApp Rewards & Experiences</Text>
            </View>

            <Text style={styles.copyrightLabel}>
              Todos los derechos reservados TravelApp s.a.s. - 2026
            </Text>

            <TouchableOpacity 
              style={styles.closeModalBtn} 
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE VALIDACIÓN BIOMÉTRICA */}
      <Modal
        visible={showBiometricModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.biometricOverlay}>
          <View style={styles.biometricCard}>
            <View style={styles.biometricHeader}>
              <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
              <Text style={styles.biometricTitle}>Seguridad Requerida</Text>
              <Text style={styles.biometricDesc}>
                Por inactividad, por favor valida tu identidad para continuar en línea en el sistema.
              </Text>
            </View>

            <TouchableOpacity 
              style={[
                styles.biometricScanBtn, 
                biometricSuccess && styles.biometricScanBtnSuccess,
                isBiometricScanning && styles.biometricScanBtnScanning
              ]}
              onPress={handleTriggerBiometric}
              disabled={isBiometricScanning || biometricSuccess}
            >
              {isBiometricScanning ? (
                <View style={styles.scanningWrap}>
                  <ActivityIndicator size="large" color={Colors.white} />
                  <Text style={styles.scanningText}>Escaneando...</Text>
                </View>
              ) : biometricSuccess ? (
                <View style={styles.successWrap}>
                  <Ionicons name="checkmark-circle" size={54} color={Colors.white} />
                  <Text style={styles.successText}>Acceso Permitido</Text>
                </View>
              ) : (
                <View style={styles.startScanWrap}>
                  <Ionicons name="finger-print-outline" size={54} color={Colors.primary} />
                  <Text style={styles.startScanText}>Presiona para escanear</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.biometricFooterText}>
              Verificación configurada cada {biometricTimeoutMinutes} min.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  map: { flex: 1 },
  
  // Elementos superiores flotantes
  topBar: {
    position: 'absolute', top: 56, left: 16, right: 16,
    flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  menuButton: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5,
  },
  revenueCard: {
    flex: 1, height: 48, borderRadius: 24, backgroundColor: Colors.white,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5,
  },
  revenueLabel: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  revenueValue: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.primary },

  // Panel Inferior Flotante
  bottomCard: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: Colors.white, borderRadius: 24, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 6,
  },
  onlineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 16, backgroundColor: Colors.background,
  },
  onlineRowActive: { backgroundColor: Colors.online + '08' },
  onlineIndicator: { width: 10, height: 10, borderRadius: 5 },
  onlineTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  onlineTitleActive: { color: Colors.online },
  onlineSubtitle: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textMuted, marginTop: 1 },

  // Estadísticas del día
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  statLabel: { fontSize: 10, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  // Marcador de conductor en el mapa
  markerOutline: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.online + '25',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.online,
  },
  markerInner: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.online,
  },

  // MENÚ LATERAL DRAWER
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  drawerBackdrop: { flex: 1 },
  drawerView: {
    width: width * 0.75, height: '100%', backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 12,
  },
  drawerHeader: {
    backgroundColor: Colors.primary, padding: 24, paddingTop: 64, gap: 16,
  },
  drawerUserSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  drawerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  drawerAvatarText: { fontSize: 20, fontFamily: 'Quicksand-Bold', color: Colors.white },
  drawerUserName: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.white },
  drawerUserSub: { fontSize: 11, fontFamily: 'Quicksand-Medium', color: 'rgba(255,255,255,0.6)' },
  drawerMenuItems: { padding: 16, gap: 4 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12,
  },
  drawerItemLabel: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  drawerFooter: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
  },
  logoutText: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.danger },
  drawerVersion: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textMuted, paddingLeft: 12 },

  // MODALES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: Colors.white, borderRadius: 24, padding: 24, gap: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  modalSubtitle: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.background, padding: 16, borderRadius: 14,
  },
  panicButton: { backgroundColor: Colors.danger },
  panicText: { color: Colors.white, fontSize: 14, fontFamily: 'Quicksand-Bold' },
  optionText: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  closeModalBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  closeModalText: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.accent },

  // Vehículo Scroll & List
  vehicleListScroll: { maxHeight: height * 0.45 },
  vehicleItemCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 16, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: 10,
  },
  activeVehicleCard: { borderColor: Colors.success, backgroundColor: Colors.success + '05' },
  vehicleSelectArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleItemTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  vehicleItemMeta: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, marginTop: 2 },
  vehicleItemCategory: { fontSize: 11, fontFamily: 'Quicksand-Bold', marginTop: 2 },
  deleteVehicleBtn: { padding: 8 },
  addVehicleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 14, marginTop: 4,
  },
  addVehicleBtnText: { color: Colors.white, fontSize: 14, fontFamily: 'Quicksand-Bold' },

  // Vehículo Formulario
  vehicleFormScroll: { maxHeight: height * 0.5 },
  formTitle: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary, marginBottom: 8 },
  inputGroup: { gap: 6, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  formInput: {
    backgroundColor: Colors.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: 'Quicksand-Regular', color: Colors.textPrimary,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  categoryPicker: { flexDirection: 'row', gap: 8, marginTop: 2 },
  categoryOpt: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.white,
  },
  categoryOptActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '08' },
  categoryOptText: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  categoryOptTextActive: { color: Colors.accent },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelFormBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelFormText: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  saveFormBtn: {
    flex: 2, backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  saveFormText: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.white },

  // Modal Info específico
  infoText: { fontSize: 13, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 20 },
  infoSpecs: { gap: 6, marginVertical: 8 },
  infoSpecItem: { fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textPrimary },
  copyrightLabel: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textMuted, textAlign: 'center', marginTop: 8 },

  // Validación Biométrica
  biometricOverlay: { flex: 1, backgroundColor: 'rgba(7,20,40,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  biometricCard: { width: '100%', maxWidth: 340, backgroundColor: Colors.white, borderRadius: 28, padding: 28, alignItems: 'center', gap: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 10 },
  biometricHeader: { alignItems: 'center', gap: 8, textAlign: 'center' },
  biometricTitle: { fontSize: 20, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary, marginTop: 4 },
  biometricDesc: { fontSize: 13, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  biometricScanBtn: { width: 140, height: 140, borderRadius: 70, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  biometricScanBtnScanning: { borderStyle: 'solid', borderColor: Colors.accent, backgroundColor: Colors.accent },
  biometricScanBtnSuccess: { borderStyle: 'solid', borderColor: Colors.success, backgroundColor: Colors.success },
  scanningWrap: { alignItems: 'center', gap: 8 },
  scanningText: { color: Colors.white, fontSize: 12, fontFamily: 'Quicksand-Bold' },
  successWrap: { alignItems: 'center', gap: 6 },
  successText: { color: Colors.white, fontSize: 12, fontFamily: 'Quicksand-Bold' },
  startScanWrap: { alignItems: 'center', gap: 6 },
  startScanText: { color: Colors.primary, fontSize: 11, fontFamily: 'Quicksand-Bold' },
  biometricFooterText: { fontSize: 11, fontFamily: 'Quicksand-Medium', color: Colors.textMuted },
  
  // Taxímetro de viaje libre (Modo Taxi Bottom Sheet)
  taximeterBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0A2A5B', paddingVertical: 14, borderRadius: 12, marginTop: 14,
    width: '100%',
  },
  taximeterBtnText: { color: Colors.white, fontSize: 13, fontFamily: 'Quicksand-Bold' },
  taximeterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  taximeterSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: height * 0.90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  taximeterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taximeterTitle: {
    fontSize: 18,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
  },
  taximeterSubtitle: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  closeTaximeterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taxiRateCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  rateCardTitle: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  taxiRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taxiRateLabel: { fontSize: 13, fontFamily: 'Quicksand-Medium', color: '#64748B' },
  taxiRateValue: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: '#0F172A' },
  taximeterInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    fontFamily: 'Quicksand-Regular',
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  btnStartFreeTrip: {
    width: '100%',
    height: 66,
    backgroundColor: '#16A34A',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#16A34A',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  btnStartFreeTripText: {
    fontSize: 18,
    fontFamily: 'Quicksand-Bold',
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.8,
  },
  btnCancelFreeTrip: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelFreeTripText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: '#64748B',
  },
  taxiLiveBigBox: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  taxiLiveBigFare: {
    fontSize: 48,
    fontFamily: 'Quicksand-Bold',
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 1,
  },
  taxiLiveBigSub: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taxiLiveStatsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  taxiStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  taxiStatCardVal: {
    fontSize: 18,
    fontFamily: 'Quicksand-Bold',
    color: '#0F172A',
  },
  taxiStatCardLabel: {
    fontSize: 11,
    fontFamily: 'Quicksand-Medium',
    color: '#64748B',
  },
  btnStopFreeTrip: {
    width: '100%',
    height: 72,
    backgroundColor: '#DC2626',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#DC2626',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  btnStopFreeTripText: {
    fontSize: 19,
    fontFamily: 'Quicksand-Bold',
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.8,
  },
  taxiSummaryBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 24,
    fontFamily: 'Quicksand-Bold',
    color: '#16A34A',
  },
  btnReceiptWhatsApp: {
    width: '100%',
    height: 50,
    backgroundColor: '#25D366',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReceiptWhatsAppText: {
    fontSize: 15,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
  },
  btnReceiptEmail: {
    width: '100%',
    height: 48,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReceiptEmailText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
  },
  btnCollectAndFinish: {
    width: '100%',
    height: 56,
    backgroundColor: '#059669',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  btnCollectAndFinishText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  taxiRateBox: {
    width: '100%', backgroundColor: Colors.background, borderRadius: 16, padding: 16, gap: 10,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  taxiLiveDisplay: {
    width: '100%', backgroundColor: '#071428', borderRadius: 20, paddingVertical: 28,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 2, borderColor: Colors.primary,
  },
  taxiLiveFare: { fontSize: 38, fontWeight: '900', color: Colors.white, letterSpacing: 1 },
  taxiLiveFareLabel: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  taxiLiveStats: {
    flexDirection: 'row', width: '100%', paddingVertical: 12,
    backgroundColor: Colors.background, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  taxiLiveStatItem: { flex: 1, alignItems: 'center', gap: 4 },
  taxiLiveStatVal: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  taxiLiveStatLabel: { fontSize: 11, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  taxiLiveStatDivider: { width: 1.5, height: '80%', backgroundColor: Colors.border, alignSelf: 'center' },

  // Marcador de Autito con Colores (Verde / Naranja / Gris)
  carMarkerCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  carMarkerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -2,
  },
  activeTripFloatingCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  activeTripIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeTripTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: '#0F172A',
  },
  activeTripSub: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#64748B',
    marginTop: 2,
  },

  // Estilos del Modal QR de Ventanilla
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  qrModalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 17,
    fontFamily: 'Quicksand-Bold',
    color: '#0F172A',
  },
  qrModalSubtitle: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#64748B',
  },
  qrModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrImageContainer: {
    width: 220,
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  qrCodeInfoBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  qrCodeBadgeLabel: {
    fontSize: 10,
    fontFamily: 'Quicksand-Bold',
    color: '#64748B',
    letterSpacing: 1,
  },
  qrCodeBadgeVal: {
    fontSize: 20,
    fontFamily: 'Quicksand-Bold',
    color: '#0284C7',
    letterSpacing: 2,
    marginTop: 2,
  },
  qrInstructionText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  qrDoneButton: {
    width: '100%',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  qrDoneButtonText: {
    fontSize: 15,
    fontFamily: 'Quicksand-Bold',
    color: '#FFFFFF',
  },
});
