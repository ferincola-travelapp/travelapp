import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  TextInput, ActivityIndicator, Animated, ScrollView, Dimensions, Alert, Modal, Image, Linking, Platform, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../lib/firebase';
import { Colors, Fonts, TRAVIS_WEBHOOK_URL, GOOGLE_MAPS_KEY, API_BASE_URL } from '../lib/constants';
import { TravelCabLogo, TravelAppLogo, TravelExperienceLogo } from '../components/BrandLogos';
import { InteractiveMapView } from '../components/InteractiveMapView';
import { playSeatbeltSafetyPrompt, playCustomVoiceNotification } from '../lib/audioService';
import { WebView } from 'react-native-webview';

import { OverlappingNativeCarousel } from '../components/OverlappingNativeCarousel';

const { width, height } = Dimensions.get('window');

interface CMSBlock {
  id: string;
  blockTitle: string;
  cards: {
    title: string;
    badge?: string;
    subtitle?: string;
    description: string;
    imageUrl: string;
    url: string;
    ctaText?: string;
  }[];
}

interface RewardItem {
  id: string;
  title: string;
  points: number;
  description: string;
  imageUrl: string;
}

function getNext10Days() {
  const days = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }));
  }
  return days;
}

export function decodePolyline(encoded: any) {
  if (Array.isArray(encoded)) return encoded;
  if (!encoded || typeof encoded !== 'string') return [];
  try {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      const nLat = lat / 1e5;
      const nLng = lng / 1e5;
      if (!isNaN(nLat) && !isNaN(nLng)) {
        poly.push({ latitude: nLat, longitude: nLng });
      }
    }
    return poly;
  } catch (e) {
    return [];
  }
}

export const DEFAULT_REGION = {
  latitude: -26.8326,
  longitude: -65.2038,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export const MAP_PROVIDER = Platform.OS === 'android' ? undefined : PROVIDER_GOOGLE;

export const getMapRegion = (coords?: any, userLoc?: any) => {
  if (coords?.latitude && coords?.longitude) {
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }
  if (userLoc?.latitude && userLoc?.longitude) {
    return {
      latitude: userLoc.latitude,
      longitude: userLoc.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }
  return DEFAULT_REGION;
};

export const getSafeIoniconsName = (iconName: any, fallback = 'car-outline'): any => {
  if (typeof iconName !== 'string' || !iconName) return fallback;
  const clean = iconName.trim();
  if (clean.startsWith('http') || clean.startsWith('data:') || clean.length > 30 || clean.includes('/') || clean.includes(';') || clean.includes('+') || clean.includes('=')) {
    return fallback;
  }
  return clean;
};

export const formatDriverName = (fullName?: string) => {
  if (!fullName) return 'Conductor';
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
};

export const formatPlate = (plate?: string) => {
  if (!plate) return '•••• 76 YZ';
  const clean = plate.trim().toUpperCase();
  if (clean.length > 4) {
    const visibleEnd = clean.slice(-4);
    return `•••• ${visibleEnd}`;
  }
  return `•••• ${clean}`;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const user = auth.currentUser!;
  const firstName = user?.displayName?.split(' ')[0] || 'Pasajero';

  // Navegación de Tabs: 'home' | 'experience' | 'trips' | 'rewards' | 'profile'
  const [activeTab, setActiveTab] = useState<'home' | 'experience' | 'trips' | 'rewards' | 'profile'>('home');

  // Modo de servicio: 'urbana' (Movilidad Urbana) | 'aci' (Auto Compartido Interurbano)
  const [serviceMode, setServiceMode] = useState<'urbana' | 'aci'>('urbana');

  // Estados de Ubicación y Mapa
  const [currentLocation, setCurrentLocation] = useState<any>(DEFAULT_REGION);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [onlineDrivers, setOnlineDrivers] = useState<any[]>([]);

  // Estados de Búsqueda de Viaje
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Estandar');
  const [selectedPayment, setSelectedPayment] = useState('Efectivo');
  
  // Autocomplete y Ruta
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [originCoords, setOriginCoords] = useState<any>(null);
  const [destinationCoords, setDestinationCoords] = useState<any>(null);
  const [routePolyline, setRoutePolyline] = useState<any>('');
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [routeDuration, setRouteDuration] = useState<number>(0);
  const [activeSearchField, setActiveSearchField] = useState<'origin' | 'destination' | null>(null);
  const [activeTariffs, setActiveTariffs] = useState<any[]>([]);
  const [notificationSoundUrl, setNotificationSoundUrl] = useState<string | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
  const overlayAnim = useRef(new Animated.Value(-100)).current;
  
  // Agendar Viaje
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  // Vinculación QR / Código de Conductor
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrScannerMode, setQrScannerMode] = useState<'camera' | 'manual'>('camera');
  const [driverCodeInput, setDriverCodeInput] = useState('');
  const [isLinkingDriver, setIsLinkingDriver] = useState(false);

  // Flujo de Viaje Activo
  const [requestFlowStep, setRequestFlowStep] = useState<'idle' | 'pricing' | 'searching' | 'active'>('idle');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [driverDetails, setDriverDetails] = useState<any>(null);
  const [searchTimer, setSearchTimer] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  // Categorías de Vehículos (Dinámicas de Firestore)
  const [categories, setCategories] = useState<any[]>([]);
  const [allTariffs, setAllTariffs] = useState<any[]>([]);

  // Categorías de Vehículos disponibles para el cliente (oculta las exclusivas de taxímetro / viaje libre)
  const availableCategories = useMemo(() => {
    const norm = (s: any) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    
    return categories.filter(cat => {
      const catNorm = norm(cat.name);
      const catIdNorm = norm(cat.id);

      // 1. Si existe un tarifario en Firestore con isFreeTripOnly === true que corresponda a esta categoría (o a Taxi), la ocultamos
      const isFreeTripOnlyTariff = allTariffs.some(t => 
        t.isFreeTripOnly === true && (
          norm(t.category) === catNorm || 
          norm(t.category) === catIdNorm || 
          (catNorm.includes('taxi') && (norm(t.category).includes('taxi') || norm(t.name).includes('taxi') || norm(t.id).includes('taxi')))
        )
      );
      if (isFreeTripOnlyTariff) return false;

      // 2. Si hay tarifarios públicos configurados en Firestore pero ninguno público activo para Taxi, ocultar Taxi
      if (activeTariffs.length > 0 && catNorm.includes('taxi')) {
        const hasActivePublicTaxiTariff = activeTariffs.some(t => 
          norm(t.category) === catNorm || 
          norm(t.category) === catIdNorm || 
          norm(t.category).includes('taxi') || 
          norm(t.name).includes('taxi')
        );
        if (!hasActivePublicTaxiTariff) return false;
      }

      return true;
    });
  }, [categories, allTariffs, activeTariffs]);

  // Si la categoría seleccionada ya no está disponible (ej. se activó modo taxímetro exclusivo), auto-seleccionar la primera disponible
  useEffect(() => {
    if (availableCategories.length > 0) {
      const exists = availableCategories.some(c => c.name === selectedCategory);
      if (!exists) {
        setSelectedCategory(availableCategories[0].name);
      }
    }
  }, [availableCategories, selectedCategory]);
  const [cmsBlocks, setCmsBlocks] = useState<CMSBlock[]>([]);
  const [rewardsBlocks, setRewardsBlocks] = useState<any[]>([]);
  const [rewardsList, setRewardsList] = useState<RewardItem[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [passengerTrips, setPassengerTrips] = useState<any[]>([]);
  const [rewardsPoints, setRewardsPoints] = useState(1450); // Puntos por defecto
  const [activeSubMode, setActiveSubMode] = useState<'urbana' | 'interurbano' | 'traslados'>('urbana');
  const [intermediateStops, setIntermediateStops] = useState<string[]>([]); // Hasta 3 paradas intermedias
  const [scheduleCity, setScheduleCity] = useState('');
  const [schedulePassengers, setSchedulePassengers] = useState('1');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Estados de Billetera TravelPay y Perfil
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [userPhone, setUserPhone] = useState<string>('');
  const [userPhotoURL, setUserPhotoURL] = useState<string>('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);

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

  // Estados de Chat en Vivo (Conductor - Pasajero - Concorde 360)
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleAddStop = () => {
    if (intermediateStops.length < 3) {
      setIntermediateStops([...intermediateStops, '']);
    } else {
      Alert.alert('Límite alcanzado', 'Podés agregar un máximo de 3 paradas intermedias.');
    }
  };

  const handleRemoveStop = (index: number) => {
    const updated = [...intermediateStops];
    updated.splice(index, 1);
    setIntermediateStops(updated);
  };

  const handleUpdateStop = (index: number, text: string) => {
    const updated = [...intermediateStops];
    updated[index] = text;
    setIntermediateStops(updated);
  };


  // Datos de TravelApp Experience - Viajes Contratados
  const [hasPurchasedOrganizedTrip, setHasPurchasedOrganizedTrip] = useState(false);
  const [contractedTrip, setContractedTrip] = useState<any | null>(null);
  const [experienceMainTab, setExperienceMainTab] = useState<'catalog' | 'trip'>('catalog');
  const [activeTripSubTab, setActiveTripSubTab] = useState<'itinerary' | 'payments' | 'group' | 'gallery'>('itinerary');
  const [expandedDay, setExpandedDay] = useState<number | null>(1); // Acordeón de itinerario
  const [travisQuery, setTravisQuery] = useState('');
  const [travisAnswer, setTravisAnswer] = useState('');
  const [travisLoading, setTravisLoading] = useState(false);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [coordinatorMessage, setCoordinatorMessage] = useState('');
  const [isGaliciaPaying, setIsGaliciaPaying] = useState(false);
  const [selectedExcursion, setSelectedExcursion] = useState<any | null>(null);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(false);
  const [excursionsList, setExcursionsList] = useState<any[]>([]);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [rewardsSubTab, setRewardsSubTab] = useState<'canje' | 'beneficios'>('canje');
  const [selectedBenefit, setSelectedBenefit] = useState<any | null>(null);

  // Datos extendidos de Perfil para TravelApp Experience
  const [passport, setPassport] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [isDossierModalVisible, setIsDossierModalVisible] = useState(false);
  const [mpLinked, setMpLinked] = useState(false);
  const [mpLinkedEmail, setMpLinkedEmail] = useState('');
  const [tripCompletedModalVisible, setTripCompletedModalVisible] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [isEcosystemExpanded, setIsEcosystemExpanded] = useState(false);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Escuchador de autenticación y errores de Google Maps API (gm_authFailure)
  useEffect(() => {
    if (Platform.OS === 'web') {
      (window as any).gm_authFailure = () => {
        console.error("❌ Google Maps API Error: gm_authFailure. Clave de API denegada o cuota excedida.");
        Alert.alert("Google Maps Error", "gm_authFailure: Error de autenticación o cuota en clave API de Google Maps.");
      };
    }
  }, []);

  // Animación de paneles
  const panelSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(panelSlideAnim, { toValue: 1, useNativeDriver: true }).start();
  }, [activeTab]);

  useEffect(() => {
    if (requestFlowStep === 'active') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -6, duration: 800, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [requestFlowStep]);

  useEffect(() => {
    if (originCoords && destinationCoords && mapRef.current) {
      mapRef.current.fitToCoordinates([originCoords, destinationCoords], {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
  }, [originCoords, destinationCoords, routePolyline]);

  // Escuchar perfil en tiempo real para Mercado Pago, Billetera y datos extendidos
  useEffect(() => {
    if (user?.uid) {
      const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPassport(data.passport || '');
          setEmergencyContact(data.emergencyContact || '');
          setMedicalNotes(data.medicalNotes || '');
          setMpLinked(!!data.mpLinked);
          setMpLinkedEmail(data.mpUserEmail || '');
          setHasPurchasedOrganizedTrip(!!data.hasPurchasedOrganizedTrip);
          if (data.rewardsPoints !== undefined) {
            setRewardsPoints(data.rewardsPoints);
          }
          if (data.walletBalance !== undefined) {
            setWalletBalance(data.walletBalance);
          }
          if (data.phoneNumber) {
            setUserPhone(data.phoneNumber);
          } else if (user?.phoneNumber) {
            setUserPhone(user.phoneNumber);
          }
          if (data.photoURL) {
            setUserPhotoURL(data.photoURL);
          } else if (user?.photoURL) {
            setUserPhotoURL(user.photoURL);
          }
        }
      });
      return unsubProfile;
    }
  }, [user?.uid]);

  // Selección de Foto de Perfil (Cámara o Galería)
  const handlePickProfileImage = () => {
    Alert.alert(
      'Foto de Perfil',
      'Seleccioná una opción para actualizar tu foto de perfil:',
      [
        {
          text: 'Tomar Foto con Cámara 📷',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permiso Requerido', 'Necesitamos acceso a la cámara para tomar tu foto.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true,
              });
              if (!result.canceled && result.assets && result.assets[0]) {
                await uploadProfilePhoto(result.assets[0]);
              }
            } catch (e) {
              console.error('Error al abrir cámara:', e);
              Alert.alert('Error', 'No se pudo abrir la cámara.');
            }
          },
        },
        {
          text: 'Seleccionar de Galería 🖼️',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permiso Requerido', 'Necesitamos acceso a la galería para seleccionar la foto.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true,
              });
              if (!result.canceled && result.assets && result.assets[0]) {
                await uploadProfilePhoto(result.assets[0]);
              }
            } catch (e) {
              console.error('Error al abrir galería:', e);
              Alert.alert('Error', 'No se pudo abrir la galería.');
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const uploadProfilePhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      const photoUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setUserPhotoURL(photoUri);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: photoUri });
      }
      await setDoc(doc(db, 'users', user.uid), { photoURL: photoUri }, { merge: true });
      Alert.alert('¡Foto Actualizada!', 'Tu foto de perfil se guardó correctamente.');
    } catch (e) {
      console.error('Error actualizando foto:', e);
      Alert.alert('Error', 'No se pudo guardar la foto de perfil.');
    }
  };

  const handleSavePhone = async () => {
    if (!userPhone.trim()) {
      return Alert.alert('Campo Requerido', 'Ingresá tu número de teléfono / WhatsApp.');
    }
    setIsSavingPhone(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { phoneNumber: userPhone.trim() }, { merge: true });
      Alert.alert('Guardado', 'Número de teléfono actualizado con éxito.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el número de teléfono.');
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Escuchar mensajes del chat del viaje activo en Firestore (Sincronizado con Concorde 360)
  useEffect(() => {
    if (activeTrip?.id) {
      const q = collection(db, 'trips', activeTrip.id, 'messages');
      const unsubChat = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        msgs.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tA - tB;
        });
        setChatMessages(msgs);
      });
      return unsubChat;
    }
  }, [activeTrip?.id]);

  const handleSendMessage = async () => {
    if (!chatInputText.trim() || !activeTrip?.id) return;
    const messageText = chatInputText.trim();
    setChatInputText('');
    setIsSendingMessage(true);
    try {
      await addDoc(collection(db, 'trips', activeTrip.id, 'messages'), {
        text: messageText,
        senderId: user.uid,
        senderName: firstName || 'Pasajero',
        senderRole: 'passenger',
        createdAt: Timestamp.now(),
      });
    } catch (e) {
      console.error('Error enviando mensaje:', e);
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    } finally {
      setIsSendingMessage(false);
    }
  };
  useEffect(() => {
    if (user?.uid) {
      const q = query(collection(db, 'contracted_trips'), where('userId', '==', user.uid));
      const unsubTrip = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const tripDoc = snap.docs[0];
          const data = { id: tripDoc.id, ...tripDoc.data() } as any;
          setContractedTrip(data);
          setExcursionsList(data.optionalExcursions || []);
          
          // Suscribirse a los mensajes del grupo de este viaje
          const unsubMessages = onSnapshot(collection(db, 'contracted_trips', tripDoc.id, 'group_messages'), (msgSnap) => {
            const msgs = msgSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            msgs.sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
            setGroupMessages(msgs);
          });
          return () => unsubMessages();
        } else {
          setContractedTrip(null);
          setExcursionsList([]);
          setGroupMessages([]);
        }
      });
      return unsubTrip;
    }
  }, [user?.uid]);

  // Escuchar viajes de TravelCab del usuario en tiempo real
  useEffect(() => {
    if (user?.uid) {
      const q = query(collection(db, 'trips'), where('passengerId', '==', user.uid));
      const unsubPassengerTrips = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setPassengerTrips(list);
      });
      return unsubPassengerTrips;
    }
  }, [user?.uid]);

  // Cambiar por defecto al tab de viaje activo si ya tiene uno comprado
  useEffect(() => {
    if (hasPurchasedOrganizedTrip) {
      setExperienceMainTab('trip');
    } else {
      setExperienceMainTab('catalog');
    }
  }, [hasPurchasedOrganizedTrip]);

  // Manejar simulación de compra/cancelación de viaje grupal (Modo Tester)
  const handleSimulateTrip = async (enable: boolean) => {
    if (!user?.uid) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      if (enable) {
        await setDoc(userRef, { hasPurchasedOrganizedTrip: true }, { merge: true });
        
        const tripId = `trip_humahuaca_${user.uid}`;
        const tripRef = doc(db, 'contracted_trips', tripId);
        const tripData = {
          id: tripId,
          userId: user.uid,
          destination: "Quebrada de Humahuaca & Salinas Grandes",
          dates: "12 Oct - 19 Oct, 2026",
          imageUrl: "https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?q=80&w=800&auto=format&fit=crop",
          coordinator: {
            name: "Marcos Vignola",
            phone: "+5493815556667",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
          },
          services: [
            "Aéreos ida y vuelta (Aerolíneas Argentinas)",
            "Traslados privados en minibus (TravelCab ACI)",
            "7 noches en Posada del Silencio (Purmamarca)",
            "Régimen de media pensión (Desayuno y Cena)",
            "Excursiones terrestres con guías locales autorizados",
            "Cobertura Assist Card Premium (Asistencia Médica Completa)"
          ],
          itinerary: [
            { day: 1, title: "Vuelo a Salta & Transfer a Purmamarca", description: "Arribo al aeropuerto de Salta. Recepción por Marcos Vignola y traslado privado a Purmamarca recorriendo el espectacular camino de cornisa. Check-in en el hotel y cena grupal de bienvenida." },
            { day: 2, title: "Cerro de Siete Colores & Paseo de los Colorados", description: "Trekking matutino suave por el Paseo de los Colorados para apreciar las distintas tonalidades geológicas del Cerro de Siete Colores. Tarde libre para recorrer la feria de artesanos locales de Purmamarca." },
            { day: 3, title: "Salinas Grandes & Cuesta de Lipán", description: "Ascenso por la impactante Cuesta de Lipán hasta alcanzar los 4.170 msnm. Descenso a las imponentes Salinas Grandes. Almuerzo campestre en el salar y sesión fotográfica interactiva." },
            { day: 4, title: "Pucará de Tilcara & Garganta del Diablo", description: "Traslado a Tilcara. Visita guiada al sitio arqueológico Pucará de Tilcara. Trekking opcional a la Garganta del Diablo para ver las cascadas naturales en el lecho del río." },
            { day: 5, title: "Hornocal (Serranía de los 14 Colores) & Humahuaca", description: "Viaje al norte hacia Humahuaca. Almuerzo tradicional con peña folclórica en vivo. Por la tarde, ascenso en camionetas 4x4 al mirador del Hornocal (4.350 msnm) para ver el atardecer sobre los 14 colores." },
            { day: 6, title: "Día Libre en Purmamarca o Excursión Opcional a Iruya", description: "Día libre para descansar y disfrutar del hotel. Recomendamos la excursión opcional de día entero al mágico pueblo colgado de la montaña: Iruya." },
            { day: 7, title: "Caminata entre Cardones & Regreso a Salta Capital", description: "Check-out del hotel. Viaje de regreso visitando el Parque Nacional Los Cardones. Tarde libre en Salta Capital para últimas compras y cena de despedida grupal en la Peña de Balderrama." },
            { day: 8, title: "Despedida & Vuelo de Retorno", description: "Transfer al aeropuerto de Salta para abordar el vuelo de regreso a Buenos Aires. Fin de la experiencia." }
          ],
          payment: {
            totalAmount: 1450,
            paidAmount: 950,
            currency: "USD"
          },
          assistancePdfUrl: "https://www.assistcard.com/content/dam/assistcard/global/pdf/condiciones-generales.pdf",
          recommendations: "Llevar ropa de abrigo en capas (amplitud térmica), protector solar factor 50+, anteojos de sol, calzado de trekking cómodo y abundante agua para evitar el mal de altura (apunamiento).",
          optionalExcursions: [
            { id: "exc-iruya", title: "Excursión Especial de Día Entero a Iruya (4x4)", description: "Aventura todo terreno cruzando el Abra del Cóndor a 4000 msnm para descender al histórico pueblo colgado de Iruya. Incluye almuerzo.", price: 120, paid: false },
            { id: "exc-bodega", title: "Degustación de Vinos de Altura & Almuerzo en Cafayate", description: "Visita a una prestigiosa bodega boutique con degustación dirigida por enólogo y almuerzo de pasos maridado.", price: 85, paid: false }
          ],
          photos: [
            "https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1619542402915-dcaf30e4e2a1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=600&auto=format&fit=crop"
          ]
        };
        await setDoc(tripRef, tripData);
        
        // Crear un par de mensajes de grupo de bienvenida
        const welcomeRef1 = doc(collection(db, 'contracted_trips', tripId, 'group_messages'), 'msg_welcome_1');
        const welcomeRef2 = doc(collection(db, 'contracted_trips', tripId, 'group_messages'), 'msg_welcome_2');
        await setDoc(welcomeRef1, {
          sender: "Marcos Vignola",
          senderRole: "coordinador",
          text: "¡Hola a todos! Bienvenidos al grupo de la expedición a Humahuaca y Salinas Grandes. Acá voy a ir subiendo novedades y vamos a estar en contacto durante todo el viaje.",
          timestamp: Date.now() - 3600000 * 2
        });
        await setDoc(welcomeRef2, {
          sender: "Sofía (BsAs)",
          senderRole: "pasajero",
          text: "¡Hola Marcos! Qué bueno, estoy re entusiasmada con este viaje. Ya tengo todo listo para arrancar.",
          timestamp: Date.now() - 3600000
        });
      } else {
        await setDoc(userRef, { hasPurchasedOrganizedTrip: false }, { merge: true });
        await deleteDoc(doc(db, 'contracted_trips', `trip_humahuaca_${user.uid}`));
      }
    } catch (err) {
      console.log("Error in simulator trip toggle:", err);
    }
  };

  // Preguntar a Travis AI sobre el destino
  const handleAskTravisAboutDestination = async () => {
    const text = travisQuery.trim();
    if (!text || travisLoading) return;
    setTravisLoading(true);
    setTravisAnswer('');
    try {
      const res = await fetch(TRAVIS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriber_id: user?.uid || 'app_user',
          message: `Pregunta sobre mi viaje grupal a ${contractedTrip?.destination || 'nuestro destino'}: ${text}`,
          first_name: user?.displayName?.split(' ')[0] || 'Pasajero',
          channel: 'app_client',
        }),
      });
      const data = await res.json();
      const reply = data.messages?.[0]?.text || data.reply || 'No tengo respuesta en este momento sobre el destino.';
      setTravisAnswer(reply);
    } catch (err) {
      setTravisAnswer('Hubo un problema de conexión con Travis AI. Intentá de nuevo.');
    } finally {
      setTravisLoading(false);
    }
  };

  // Enviar mensaje al grupo del coordinador
  const handleSendCoordinatorMessage = async () => {
    const text = coordinatorMessage.trim();
    if (!text || !contractedTrip?.id) return;
    try {
      const msgRef = doc(collection(db, 'contracted_trips', contractedTrip.id, 'group_messages'), `msg_${Date.now()}`);
      await setDoc(msgRef, {
        sender: user.displayName || 'Pasajero',
        senderRole: 'pasajero',
        text: text,
        timestamp: Date.now()
      });
      setCoordinatorMessage('');
      
      // Auto respuesta simulada del coordinador después de 3 segundos
      setTimeout(async () => {
        const replyRef = doc(collection(db, 'contracted_trips', contractedTrip.id, 'group_messages'), `msg_reply_${Date.now()}`);
        await setDoc(replyRef, {
          sender: "Marcos Vignola",
          senderRole: "coordinador",
          text: `¡Hola ${firstName}! Recibí tu mensaje. Recordá que nos reunimos todos hoy a las 20hs en el lobby del hotel para repasar los detalles de mañana.`,
          timestamp: Date.now()
        });
      }, 3000);
      
    } catch (err) {
      console.log("Error sending coordinator message:", err);
    }
  };

  // Procesar pago con Nave Galicia
  const handleStartGaliciaPayment = (excursion: any) => {
    setSelectedExcursion(excursion);
    setIsGaliciaPaying(true);
  };

  const handleConfirmGaliciaPayment = async () => {
    if (!selectedExcursion || !contractedTrip?.id) return;
    setIsGaliciaPaying(true);
    
    setTimeout(async () => {
      try {
        const tripRef = doc(db, 'contracted_trips', contractedTrip.id);
        const updatedExcursions = excursionsList.map(exc => {
          if (exc.id === selectedExcursion.id) {
            return { ...exc, paid: true };
          }
          return exc;
        });
        
        await updateDoc(tripRef, {
          optionalExcursions: updatedExcursions,
          'payment.paidAmount': contractedTrip.payment.paidAmount + selectedExcursion.price
        });

        // Sumar puntos en Rewards (1 punto por cada USD gastado)
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          rewardsPoints: rewardsPoints + selectedExcursion.price
        });
        
        setExcursionsList(updatedExcursions);
        setIsGaliciaPaying(false);
        setPaymentSuccessModal(true);
      } catch (err) {
        console.log("Error executing Galicia payment:", err);
        setIsGaliciaPaying(false);
        Alert.alert("Error de pago", "No se pudo procesar la transacción.");
      }
    }, 2000);
  };

  // Cargar ubicación GPS inicial
  useEffect(() => {
    const getGPS = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentLocation({
            latitude: -34.6037,
            longitude: -58.3816,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
          setLoadingLocation(false);
          return;
        }
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }
        if (loc) {
          const userCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          };
          setCurrentLocation(userCoords);
          setOriginCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

          // Asignar dirección del GPS por defecto al campo de Origen
          try {
            const addressRes = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (addressRes && addressRes.length > 0) {
              const addr = addressRes[0];
              const street = addr.street || addr.name || '';
              const number = addr.streetNumber ? ` ${addr.streetNumber}` : '';
              const district = addr.city || addr.subregion || addr.region || '';
              const formatted = street ? `${street}${number}${district ? `, ${district}` : ''}` : 'Ubicación actual';
              setOrigin(formatted);
            } else {
              setOrigin('Ubicación actual');
            }
          } catch {
            setOrigin('Ubicación actual');
          }
        } else {
          setCurrentLocation(DEFAULT_REGION);
        }
      } catch (e) {
        console.log("Error obtaining GPS client", e);
        // Fallback Buenos Aires
        setCurrentLocation({
          latitude: -34.6037,
          longitude: -58.3816,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      } finally {
        setLoadingLocation(false);
      }
    };
    getGPS();
  }, []);

  // Escuchar Choferes online, Categorías de Vehículos y CMS en tiempo real
  useEffect(() => {
    // 1. Choferes activos
    const qDrivers = query(collection(db, 'drivers'), where('isOnline', '==', true));
    const unsubDrivers = onSnapshot(qDrivers, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOnlineDrivers(list);
    });

    // 2. Categorías dinámicas (mismo catálogo que la Landing)
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      if (!snap.empty) {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        // Fallbacks si la base de datos está limpia
        setCategories([
          { id: 'cat-1', name: 'Estandar', multiplier: 1.0, basePrice: 400, icon: 'car-outline' },
          { id: 'cat-2', name: 'Premium', multiplier: 1.5, basePrice: 600, icon: 'sparkles-outline' },
          { id: 'cat-3', name: 'Taxi', multiplier: 1.1, basePrice: 450, icon: 'color-palette-outline' },
        ]);
      }
    });

    // 3. Bloques CMS para carrusel promocional
    const unsubCMS = onSnapshot(collection(db, 'cms_blocks'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const block1 = list.find(b => b.id === 'block-1');
        const block2 = list.find(b => b.id === 'block-2');
        
        if (block1) {
          setCmsBlocks([block1]);
        } else {
          setCmsBlocks([]);
        }
        
        if (block2) {
          setRewardsBlocks(block2.cards || []);
        } else {
          setRewardsBlocks([]);
        }
      } else {
        // Fallback CMS Blocks
        setCmsBlocks([
          {
            id: 'block-1',
            blockTitle: 'Novedades del Ecosistema',
            cards: [
              {
                title: 'TravelApp Rewards',
                description: 'Completá tu foto de perfil en el panel y ganá 150 puntos extra al instante para tu próximo canje.',
                imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
                url: 'https://travelapp.ar/rewards',
              },
              {
                title: 'Nuevas Experiencias',
                description: 'Ya podés agendar paseos de aventura y traslados rurales en las yungas tucumanas.',
                imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
                url: 'https://travelapp.ar/experiences',
              }
            ]
          }
        ]);
        setRewardsBlocks([
          {
            title: 'Descuento Gastronómico',
            description: 'Obtené un 20% de descuento en restaurantes adheridos presentando tu código QR.',
            imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
            url: 'https://travelapp.ar/rewards/food'
          },
          {
            title: 'Descuento Hotelería',
            description: 'Ahorrá hasta un 15% en estadías seleccionadas de TravelApp Experiences.',
            imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
            url: 'https://travelapp.ar/rewards/hotel'
          }
        ]);
      }
    });

    // 4. Catálogo de Canjes / Beneficios de Rewards
    const unsubRewards = onSnapshot(collection(db, 'rewards_catalog'), (snap) => {
      if (!snap.empty) {
        setRewardsList(snap.docs.map(d => ({ id: d.id, ...d.data() } as RewardItem)));
      } else {
        setRewardsList([
          {
            id: 'item-1',
            title: '15% Off en Traslado Premium',
            points: 400,
            description: 'Canjeá este beneficio por un descuento en tu próximo viaje ejecutivo.',
            imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80'
          },
          {
            id: 'item-2',
            title: 'Tour en Cerro San Javier',
            points: 1200,
            description: 'Un traslado de ida y vuelta con merienda de campo incluida.',
            imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80'
          }
        ]);
      }
    });

    // 5. Catálogo de Experiencias en tiempo real
    const unsubExperiences = onSnapshot(collection(db, 'experiences'), (snap) => {
      if (!snap.empty) {
        setExperiences(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setExperiences([
          {
            id: 'cat-mendoza',
            title: 'Mendoza: Caminos del Vino & Aconcagua',
            desc: 'Sumergite en las mejores bodegas boutique de Luján de Cuyo y Valle de Uco, combinado con un trekking suave en el Parque Provincial Aconcagua.',
            price: 'U$S 980',
            duration: '5 Días / 4 Noches',
            img: 'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?q=80&w=600&auto=format&fit=crop'
          },
          {
            id: 'cat-ushuaia',
            title: 'Ushuaia & Calafate: Glaciares y Fin del Mundo',
            desc: 'Explorá el Glaciar Perito Moreno y navegá el Canal Beagle en una expedición de lujo con coordinator permanente de TravelApp.',
            price: 'U$S 1.650',
            duration: '8 Días / 7 Noches',
            img: 'https://images.unsplash.com/photo-1473163928189-364b2c4e1135?q=80&w=600&auto=format&fit=crop'
          },
          {
            id: 'cat-iguazu',
            title: 'Iguazú Premium & Selva Misionera',
            desc: 'Disfrutá de las Cataratas del Iguazú desde una perspectiva exclusiva con paseos náuticos de aventura y hospedaje dentro del Parque Nacional.',
            price: 'U$S 740',
            duration: '4 Días / 3 Noches',
            img: 'https://images.unsplash.com/photo-1581404179374-e35df3e48118?q=80&w=600&auto=format&fit=crop'
          }
        ]);
      }
    });

    // 6. Tarifarios activos sincronizados en tiempo real con el Dashboard Web
    const unsubTariffs = onSnapshot(collection(db, 'tariffs'), (snap) => {
      const rawList = snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      setAllTariffs(rawList);
      const list = rawList.filter(t => t.isActive !== false && !t.id.endsWith('_active') && !t.isFreeTripOnly);
      setActiveTariffs(list);
    }, (err) => console.log("Error fetching active tariffs:", err));

    // 7. Configuración de sonido y logística
    const unsubLogistics = onSnapshot(doc(db, 'system_config', 'logistics'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.notificationSoundUrl) {
          setNotificationSoundUrl(data.notificationSoundUrl);
        }
      }
    }, (err) => console.log("Error fetching logistics config:", err));

    // 8. Notificaciones push y alertas de audio en vivo desde el Dashboard Web
    const lastNotifProcessed = { current: 0 };
    const qNotifications = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(1));
    const unsubNotifications = onSnapshot(qNotifications, (snap) => {
      if (!snap.empty) {
        const notif = snap.docs[0].data();
        const notifTime = notif.timestamp || 0;
        if (notifTime > lastNotifProcessed.current && (Date.now() - notifTime < 30000)) {
          lastNotifProcessed.current = notifTime;
          const currentUserId = auth.currentUser?.uid;
          if (notif.audience === 'all' || notif.audience === 'passengers' || (currentUserId && notif.targetUserId === currentUserId)) {
            showOverlayNotification(notif.title + ': ' + notif.message);
            if (notif.soundAlert === 'seatbelt_safety') {
              playSeatbeltSafetyPrompt();
            } else if (notif.soundAlert !== 'none' && notif.message) {
              playCustomVoiceNotification(notif.message);
            }
          }
        }
      }
    });

    return () => {
      unsubDrivers();
      unsubCategories();
      unsubCMS();
      unsubRewards();
      unsubExperiences();
      unsubTariffs();
      unsubLogistics();
      unsubNotifications();
    };
  }, []);

  const showOverlayNotification = (msg: string) => {
    setOverlayMessage(msg);
    Animated.sequence([
      Animated.timing(overlayAnim, {
        toValue: 20,
        duration: 400,
        useNativeDriver: true
      }),
      Animated.delay(4000),
      Animated.timing(overlayAnim, {
        toValue: -100,
        duration: 400,
        useNativeDriver: true
      })
    ]).start(() => {
      setOverlayMessage(null);
    });
  };

  const playNotificationSoundAndVibrate = async () => {
    try {
      Vibration.vibrate([0, 500, 200, 500]);
    } catch (e) {
      console.warn("Failed to vibrate:", e);
    }
  };

  const fetchPlaceSuggestions = async (text: string, field: 'origin' | 'destination') => {
    if (field === 'origin') setOrigin(text);
    else setDestination(text);

    if (!text || text.length < 3) {
      if (field === 'origin') setOriginSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_KEY}&language=es&components=country:ar`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.predictions && data.predictions.length > 0) {
        if (field === 'origin') setOriginSuggestions(data.predictions);
        else setDestSuggestions(data.predictions);
      } else {
        const mockSuggestions = [
          { place_id: `mock-1-${field}`, description: `${text}, San Miguel de Tucumán` },
          { place_id: `mock-2-${field}`, description: `${text}, Yerba Buena, Tucumán` },
          { place_id: `mock-3-${field}`, description: `${text}, Tafí Viejo, Tucumán` },
        ];
        if (field === 'origin') setOriginSuggestions(mockSuggestions);
        else setDestSuggestions(mockSuggestions);
      }
    } catch (e) {
      const mockSuggestions = [
        { place_id: `mock-1-${field}`, description: `${text}, San Miguel de Tucumán` },
        { place_id: `mock-2-${field}`, description: `${text}, Yerba Buena, Tucumán` },
        { place_id: `mock-3-${field}`, description: `${text}, Tafí Viejo, Tucumán` },
      ];
      if (field === 'origin') setOriginSuggestions(mockSuggestions);
      else setDestSuggestions(mockSuggestions);
    }
  };

  const handleSelectSuggestion = async (suggestion: any, field: 'origin' | 'destination') => {
    const { place_id, description } = suggestion;
    
    if (field === 'origin') {
      setOrigin(description);
      setOriginSuggestions([]);
    } else {
      setDestination(description);
      setDestSuggestions([]);
    }
    setActiveSearchField(null);

    // 1. Prioridad: Google Place Details usando place_id (funciona 100% con la API key de Google)
    if (place_id && !place_id.startsWith('mock-')) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=geometry&key=${GOOGLE_MAPS_KEY}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();
        if (detailsData.result?.geometry?.location) {
          const loc = detailsData.result.geometry.location;
          const coords = { latitude: loc.lat, longitude: loc.lng };
          if (field === 'origin') setOriginCoords(coords);
          else setDestinationCoords(coords);
          return;
        }
      } catch (dErr) {
        console.warn("Place Details lookup failed for suggestion:", dErr);
      }
    }

    // 2. Google Geocoding API
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(description)}&key=${GOOGLE_MAPS_KEY}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      if (geoData.results && geoData.results.length > 0) {
        const loc = geoData.results[0].geometry.location;
        const coords = { latitude: loc.lat, longitude: loc.lng };
        if (field === 'origin') setOriginCoords(coords);
        else setDestinationCoords(coords);
        return;
      }
    } catch (gErr) {
      console.warn("Geocoding lookup failed for suggestion:", gErr);
    }

    // 3. Fallback inteligente: OpenStreetMap Nominatim
    try {
      const cleanQuery = description.replace(/, Argentina$/i, '') + ', Tucumán, Argentina';
      const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&limit=1`;
      const osmRes = await fetch(osmUrl, { headers: { 'User-Agent': 'TravelAppClient/1.0' } });
      const osmData = await osmRes.json();
      if (Array.isArray(osmData) && osmData.length > 0) {
        const coords = { latitude: parseFloat(osmData[0].lat), longitude: parseFloat(osmData[0].lon) };
        if (field === 'origin') setOriginCoords(coords);
        else setDestinationCoords(coords);
        return;
      }
    } catch (osmErr) {
      console.warn("Nominatim lookup failed for suggestion:", osmErr);
    }
  };

  const ensureCoordsAndRoute = async (): Promise<boolean> => {
    let oCoords = originCoords;
    let dCoords = destinationCoords;

    // Si origen está vacío o es 'Ubicación actual', asignar GPS actual del usuario
    if (!origin || origin.toLowerCase().includes('ubicación') || origin.toLowerCase().includes('actual')) {
      if (currentLocation) {
        oCoords = { latitude: currentLocation.latitude, longitude: currentLocation.longitude };
        setOriginCoords(oCoords);
        if (!origin) setOrigin('Ubicación actual');
      }
    }

    const resolveAddressCoordinates = async (addressText: string) => {
      // 1. Google Places Autocomplete -> Details
      try {
        const autoUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(addressText)}&key=${GOOGLE_MAPS_KEY}&language=es&components=country:ar`;
        const autoRes = await fetch(autoUrl);
        const autoData = await autoRes.json();
        if (autoData.predictions && autoData.predictions.length > 0 && autoData.predictions[0].place_id) {
          const pid = autoData.predictions[0].place_id;
          const detUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pid}&fields=geometry&key=${GOOGLE_MAPS_KEY}`;
          const detRes = await fetch(detUrl);
          const detData = await detRes.json();
          if (detData.result?.geometry?.location) {
            return { latitude: detData.result.geometry.location.lat, longitude: detData.result.geometry.location.lng };
          }
        }
      } catch (e) {
        console.warn("Place details lookup failed in resolveAddressCoordinates:", e);
      }

      // 2. Google Geocoding API
      try {
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressText + ', Tucumán, Argentina')}&key=${GOOGLE_MAPS_KEY}`;
        const res = await fetch(geoUrl);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return { latitude: loc.lat, longitude: loc.lng };
        }
      } catch (e) {
        console.warn("Geocoding failed in resolveAddressCoordinates:", e);
      }

      // 3. OpenStreetMap Nominatim
      try {
        const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressText + ', Tucumán, Argentina')}&format=json&limit=1`;
        const res = await fetch(osmUrl, { headers: { 'User-Agent': 'TravelAppClient/1.0' } });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
        }
      } catch (e) {
        console.warn("Nominatim failed in resolveAddressCoordinates:", e);
      }

      return null;
    };

    if (!oCoords && origin) {
      oCoords = await resolveAddressCoordinates(origin);
      if (oCoords) setOriginCoords(oCoords);
    }

    if (!dCoords && destination) {
      dCoords = await resolveAddressCoordinates(destination);
      if (dCoords) setDestinationCoords(dCoords);
    }

    if (oCoords && dCoords) {
      await fetchRouteDetailsWithCoords(oCoords, dCoords);
      return true;
    }

    if (!oCoords) {
      Alert.alert('Origen requerido', 'Por favor seleccioná una dirección de origen válida.');
      return false;
    }
    if (!dCoords) {
      Alert.alert('Destino requerido', 'Por favor seleccioná una dirección de destino válida.');
      return false;
    }
    return false;
  };

  useEffect(() => {
    if (originCoords && destinationCoords) {
      fetchRouteDetailsWithCoords(originCoords, destinationCoords);
    }
  }, [originCoords, destinationCoords]);

  const fetchRouteDetailsWithCoords = async (oCoords: any, dCoords: any) => {
    const lat1 = oCoords.latitude ?? oCoords.lat;
    const lon1 = oCoords.longitude ?? oCoords.lng;
    const lat2 = dCoords.latitude ?? dCoords.lat;
    const lon2 = dCoords.longitude ?? dCoords.lng;

    // 1. Google Directions API
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat1},${lon1}&destination=${lat2},${lon2}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        setRouteDistance(Math.round((leg.distance.value / 1000) * 10) / 10);
        setRouteDuration(Math.round(leg.duration.value / 60));
        setRoutePolyline(route.overview_polyline.points);
        return;
      }
    } catch (e) {
      console.warn("Google Directions API failed:", e);
    }

    // 2. Fallback: OSRM (Open Source Routing Machine) - Rutas de calles reales garantizadas
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=polyline`;
      const osrmRes = await fetch(osrmUrl, { headers: { 'User-Agent': 'TravelAppClient/1.0' } });
      const osrmData = await osrmRes.json();
      if (osrmData.routes && osrmData.routes.length > 0) {
        const route = osrmData.routes[0];
        const distKm = Math.round((route.distance / 1000) * 10) / 10;
        const durMins = Math.max(1, Math.round(route.duration / 60));
        setRouteDistance(distKm);
        setRouteDuration(durMins);
        setRoutePolyline(route.geometry);
        return;
      }
    } catch (osrmErr) {
      console.warn("OSRM fallback routing failed:", osrmErr);
    }

    // 3. Fallback en línea recta geodésica si no hay conexión a APIs de ruta
    const dist = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)) * 111.32;
    const finalDist = dist > 0.5 ? Math.round(dist * 10) / 10 : 3.0;
    setRouteDistance(finalDist);
    setRouteDuration(Math.round(finalDist * 2.5));
    setRoutePolyline([{ latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 }]);
  };

  const fetchRouteDetails = async () => {
    if (originCoords && destinationCoords) {
      await fetchRouteDetailsWithCoords(originCoords, destinationCoords);
    }
  };

  const startSearchDriver = async () => {
    if (!origin || !destination) {
      return Alert.alert('Ruta incompleta', 'Por favor ingresá origen y destino del traslado.');
    }

    try {
      const estimatedPrice = calculateFare(selectedCategory);
      const randomPin = String(Math.floor(1000 + Math.random() * 9000));
      const cat = activeSubMode === 'traslados' ? 'TRANSFER' : activeSubMode === 'interurbano' ? 'ARC' : 'MU';
      const isTripScheduled = isScheduled || Boolean(scheduleDate && scheduleTime);

      const tripData: any = {
        passengerId: user.uid,
        userName: firstName,
        passengerPhone: userPhone || '',
        origin,
        destination,
        originCoords: originCoords ? { 
          lat: originCoords.latitude ?? originCoords.lat, 
          lng: originCoords.longitude ?? originCoords.lng,
          latitude: originCoords.latitude ?? originCoords.lat,
          longitude: originCoords.longitude ?? originCoords.lng,
        } : null,
        destinationCoords: destinationCoords ? { 
          lat: destinationCoords.latitude ?? destinationCoords.lat, 
          lng: destinationCoords.longitude ?? destinationCoords.lng,
          latitude: destinationCoords.latitude ?? destinationCoords.lat,
          longitude: destinationCoords.longitude ?? destinationCoords.lng,
        } : null,
        routePolyline: routePolyline || '',
        estimatedDistanceKm: routeDistance || 0,
        estimatedDurationMins: routeDuration || 0,
        serviceType: selectedCategory,
        serviceCategory: cat,
        isScheduled: isTripScheduled,
        scheduledDate: isTripScheduled ? scheduleDate : null,
        scheduledTime: isTripScheduled ? scheduleTime : null,
        scheduledDateTime: isTripScheduled && scheduleDate && scheduleTime ? new Date(`${scheduleDate}T${scheduleTime}:00`) : null,
        estimatedPrice,
        securityPin: randomPin,
        paymentMethod: selectedPayment,
        paymentStatus: selectedPayment === 'Efectivo' ? 'pending' : 'awaiting_payment',
        status: 'searching',
        createdAt: Timestamp.now()
      };

      // Búsqueda en vivo de choferes reales en Firestore
      setRequestFlowStep('searching');
      const docRef = await addDoc(collection(db, 'trips'), tripData);
      setActiveTrip({ id: docRef.id, ...tripData });

      // Escuchar el documento en tiempo real
      const unsubTrip = onSnapshot(doc(db, 'trips', docRef.id), async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        // 1. Aceptado
        if (data.status === 'accepted' && data.driverId) {
          if (searchTimer) clearTimeout(searchTimer);
          
          const driverDetailsObj = {
            id: data.driverId,
            name: data.driverName || 'Roberto Gómez',
            plate: data.vehiclePlate || 'AB 876 YZ',
            model: data.vehicleModel || 'Chevrolet Prisma (Blanco)',
            rating: String(data.driverRating || '4.9'),
            phone: data.driverPhone || '+5491100000000',
            avatar: data.driverProfilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            carPhoto: data.driverCarPhoto || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80'
          };

          // DEBITAR SI EL PAGO ES MERCADO PAGO Y ESTÁ VINCULADO
          if (data.paymentMethod === 'Mercado Pago' && data.paymentStatus === 'awaiting_payment') {
            if (mpLinked) {
              try {
                const payResponse = await fetch(`${API_BASE_URL}/api/checkout/process-debit`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tripId: docRef.id,
                    passengerId: user.uid,
                    driverId: data.driverId,
                    amount: estimatedPrice
                  })
                });
                const payData = await payResponse.json();
                if (payData.success) {
                  showOverlayNotification(`¡Pago Acreditado! Cobrado automáticamente en Mercado Pago.`);
                  await updateDoc(doc(db, 'trips', docRef.id), { paymentStatus: 'paid', paymentId: payData.paymentId });
                } else {
                  showOverlayNotification(`Pago fallido. Se cambió el viaje a Efectivo.`);
                  await updateDoc(doc(db, 'trips', docRef.id), { paymentMethod: 'Efectivo', paymentStatus: 'pending' });
                }
              } catch (err) {
                console.log("Error debiting trip:", err);
              }
            } else {
              showOverlayNotification(`Mercado Pago no vinculado. Pago en Efectivo.`);
              await updateDoc(doc(db, 'trips', docRef.id), { paymentMethod: 'Efectivo', paymentStatus: 'pending' });
            }
          }

          setDriverDetails(driverDetailsObj);
          setActiveTrip({ id: snap.id, ...data });
          setRequestFlowStep('active');
          showOverlayNotification(`¡Chofer asignado! ${driverDetailsObj.name} se encuentra en camino.`);
          playNotificationSoundAndVibrate();
        }

        // 2. En camino al pasajero (actualizar ubicación)
        if (data.status === 'on_way') {
          setActiveTrip((prev: any) => prev ? { ...prev, status: 'on_way' } : null);
        }

        // 3. Chofer llegó
        if (data.status === 'arrived') {
          setActiveTrip((prev: any) => prev ? { ...prev, status: 'arrived' } : null);
          showOverlayNotification("¡Tu conductor ha llegado! Te espera en el punto de encuentro.");
          playNotificationSoundAndVibrate();
        }

        // 4. Viaje en curso
        if (data.status === 'in_progress') {
          setActiveTrip((prev: any) => prev ? { ...prev, status: 'in_progress' } : null);
          showOverlayNotification("Viaje iniciado. ¡Disfrutá tu viaje!");
          playNotificationSoundAndVibrate();
        }

        // 5. Completado
        if (data.status === 'completed') {
          setActiveTrip((prev: any) => prev ? { ...prev, status: 'completed', finalPrice: data.finalPrice } : null);
          const userEmail = user?.email || 'tu correo';
          showOverlayNotification(`¡Viaje finalizado! Enviamos tu recibo digital a ${userEmail} 📧`);
          playNotificationSoundAndVibrate();
          
          // Enviar recibo digital automáticamente por correo electrónico
          if (user?.email) {
            fetch(`${API_BASE_URL}/api/receipt/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tripId: snap.id,
                passengerEmail: user.email,
                passengerName: user.displayName || 'Pasajero',
                amount: data.finalPrice || estimatedPrice,
                origin: data.origin || origin,
                destination: data.destination || destination,
                driverName: data.driverName || 'Conductor TravelCab',
                paymentMethod: data.paymentMethod || 'Efectivo',
                date: new Date().toLocaleDateString('es-AR')
              })
            }).catch(console.warn);
          }

          setTimeout(() => {
            setRequestFlowStep('idle');
            setActiveTrip(null);
            setDriverDetails(null);
            setOrigin('');
            setDestination('');
            setOriginCoords(null);
            setDestinationCoords(null);
            setRoutePolyline('');
            setRouteDistance(0);
            setRouteDuration(0);
          }, 2000);

          unsubTrip();
        }

        // 6. Cancelado
        if (data.status === 'cancelled') {
          Alert.alert('Viaje Cancelado', 'El conductor canceló el traslado.');
          setRequestFlowStep('idle');
          setActiveTrip(null);
          setDriverDetails(null);
          unsubTrip();
        }

        // 7. Sincronizar ubicación del marcador
        if (data.driverLocation) {
          setOnlineDrivers([
            {
              id: data.driverId,
              latitude: data.driverLocation.latitude,
              longitude: data.driverLocation.longitude,
              name: data.driverName
            }
          ]);
        }
      });

    } catch (e) {
      console.log("Error creating trip", e);
      setRequestFlowStep('idle');
    }
  };

  const cancelSearch = () => {
    if (searchTimer) clearTimeout(searchTimer);
    setRequestFlowStep('idle');
  };

  const handleCancelTrip = () => {
    Alert.alert('Cancelar viaje', '¿Seguro que deseas cancelar el traslado actual?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, Cancelar', style: 'destructive', onPress: () => setRequestFlowStep('idle') }
    ]);
  };

  // Vincular pasajero con chofer vía QR o código de ventanilla
  const handleLinkDriver = async (directCode?: string) => {
    const raw = (typeof directCode === 'string' && directCode ? directCode : driverCodeInput).trim().toUpperCase();
    if (!raw) {
      Alert.alert('Código requerido', 'Por favor ingresá la patente o el código del chofer que figura en la ventanilla.');
      return;
    }

    // Normalizar si viene con prefijo travelapp:driver:UID:PLATE
    let targetPlate = raw;
    let targetUid = raw;
    if (raw.includes(':')) {
      const parts = raw.split(':');
      if (parts.length >= 3) {
        targetUid = parts[2];
        targetPlate = parts[3] || parts[2];
      }
    }

    try {
      setIsLinkingDriver(true);
      const driversRef = collection(db, 'drivers');
      const qPlate = query(driversRef, where('activeVehicle.plate', '==', targetPlate));
      const snapPlate = await getDocs(qPlate);

      let matchedDriver: any = null;
      if (!snapPlate.empty) {
        matchedDriver = { id: snapPlate.docs[0].id, ...snapPlate.docs[0].data() };
      } else {
        const docSnap = await getDoc(doc(db, 'drivers', targetUid));
        if (docSnap.exists()) {
          matchedDriver = { id: docSnap.id, ...docSnap.data() };
        } else {
          const qOnline = query(driversRef, where('isOnline', '==', true));
          const snapOnline = await getDocs(qOnline);
          const found = snapOnline.docs.find(d => {
            const data = d.data();
            const plate = (data.activeVehicle?.plate || '').replace(/\s+/g, '').toUpperCase();
            const cleanTarget = targetPlate.replace(/\s+/g, '').toUpperCase();
            return d.id.toUpperCase().startsWith(cleanTarget) || (plate && plate === cleanTarget);
          });
          if (found) {
            matchedDriver = { id: found.id, ...found.data() };
          }
        }
      }

      if (!matchedDriver) {
        Alert.alert(
          'Conductor no encontrado',
          `No se encontró ningún conductor con el código "${raw}". Verificá la patente o código de ventanilla.`
        );
        setIsLinkingDriver(false);
        return;
      }

      const driverName = matchedDriver.name || 'Conductor';
      const vehicleInfo = matchedDriver.activeVehicle 
        ? `${matchedDriver.activeVehicle.brand || ''} (${matchedDriver.activeVehicle.plate || ''})`
        : 'Vehículo Oficial';

      // Si el pasajero ya cotizó destino (viaje con tarifa fija pactada)
      if (requestFlowStep === 'pricing' && originCoords && destinationCoords) {
        const estimatedPrice = calculateFare(selectedCategory);
        const tripData: any = {
          passengerId: user?.uid || 'anonymous',
          passengerName: user?.displayName || 'Pasajero',
          passengerPhone: user?.phoneNumber || '',
          origin,
          destination,
          originCoords: { lat: originCoords.lat || originCoords.latitude, lng: originCoords.lng || originCoords.longitude, latitude: originCoords.latitude || originCoords.lat, longitude: originCoords.longitude || originCoords.lng },
          destinationCoords: { lat: destinationCoords.lat || destinationCoords.latitude, lng: destinationCoords.lng || destinationCoords.longitude, latitude: destinationCoords.latitude || destinationCoords.lat, longitude: destinationCoords.longitude || destinationCoords.lng },
          status: 'accepted',
          driverId: matchedDriver.id,
          driverName: driverName,
          driverPlate: matchedDriver.activeVehicle?.plate || '',
          driverPhone: matchedDriver.phone || '',
          directAssigned: true,
          estimatedPrice,
          routeDistance,
          routeDuration,
          routePolyline,
          createdAt: Timestamp.now(),
          paymentMethod: selectedPayment,
        };

        const docRef = await addDoc(collection(db, 'trips'), tripData);
        setActiveTrip({ id: docRef.id, ...tripData });
        setRequestFlowStep('active');
        setQrModalVisible(false);
        setDriverCodeInput('');
        Alert.alert(
          '¡Conductor Vinculado!',
          `Tu viaje hacia "${destination}" fue asignado directamente a ${driverName} en su ${vehicleInfo}.`
        );
        return;
      }

      // Si el pasajero subió al auto en la calle (Modo Taxímetro / Taxi Libre)
      const freeTripData: any = {
        passengerId: user?.uid || 'anonymous',
        passengerName: user?.displayName || 'Pasajero a Bordo',
        passengerPhone: user?.phoneNumber || '',
        origin: 'Subida Directa en Calle (QR)',
        destination: 'En trayecto (Taxímetro)',
        pricingMode: 'taximeter',
        serviceType: 'TAXI_METER',
        status: 'in_progress',
        driverId: matchedDriver.id,
        driverName: driverName,
        driverPlate: matchedDriver.activeVehicle?.plate || '',
        directAssigned: true,
        createdAt: Timestamp.now(),
        paymentMethod: 'Efectivo',
      };

      const docRef = await addDoc(collection(db, 'trips'), freeTripData);
      setActiveTrip({ id: docRef.id, ...freeTripData });
      setRequestFlowStep('active');
      setQrModalVisible(false);
      setDriverCodeInput('');
      Alert.alert(
        '¡Viaje Iniciado!',
        `Te vinculaste con ${driverName} (${vehicleInfo}). El taxímetro digital está corriendo en tu pantalla.`
      );
    } catch (err: any) {
      console.error('Error linking driver via QR:', err);
      Alert.alert('Error', 'No se pudo vincular al conductor. Intentá nuevamente.');
    } finally {
      setIsLinkingDriver(false);
    }
  };

  // Cálculo de tarifa real usando tarifario o fallback sincronizado 1:1 con el Dashboard Web
  const calculateFare = (categoryName: string) => {
    const norm = (s: any) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const targetNorm = norm(categoryName);

    // 1. Encontrar la categoría seleccionada
    const selectedCat = categories.find(c => norm(c.name) === targetNorm || norm(c.id) === targetNorm) || { id: targetNorm, name: categoryName, basePrice: 400, multiplier: 1 };
    
    // 2. Buscar si hay una tarifa activa de Firestore para esta categoría o la estándar por defecto
    const matchedTariff = 
      activeTariffs.find((t: any) => norm(t.category) === norm(selectedCat.id) || norm(t.category) === targetNorm) ||
      activeTariffs.find((t: any) => norm(t.category).includes('estandar') || norm(t.category).includes('standard')) ||
      activeTariffs[0];

    const distance = routeDistance > 0 ? routeDistance : 1;
    const duration = routeDuration > 0 ? routeDuration : Math.round(distance * 2);

    if (!matchedTariff) {
      // Fallback si la base de datos no tiene tarifarios creados aún
      const baseFare = targetNorm.includes('prem') ? 600 : targetNorm.includes('tax') ? 450 : 400;
      const pricePerKm = targetNorm.includes('prem') ? 550 : targetNorm.includes('tax') ? 450 : 350;
      return Math.round(baseFare + pricePerKm * distance);
    }

    // 3. Usar valores del tarifario real configurado en el Dashboard
    const baseFare = Number(matchedTariff.baseFare || 0);
    const pricePerKm = Number(matchedTariff.pricePerKm || 0);
    const travelMinutePrice = Number(matchedTariff.travelMinutePrice || 0);
    const minimumFare = Number(matchedTariff.minimumFare || 0);

    const calculatedFare = baseFare + (pricePerKm * distance) + (travelMinutePrice * duration);
    let base = Math.max(minimumFare, Math.round(calculatedFare));

    // Aplicar recargo de tarifa especial (días y horarios / nocturno) si está configurado
    if (matchedTariff.specialRates && Array.isArray(matchedTariff.specialRates) && base > 0) {
      const DAYS_MAP = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const now = new Date();
      const currentDay = DAYS_MAP[now.getDay()];
      const currentMin = now.getHours() * 60 + now.getMinutes();

      for (const sr of matchedTariff.specialRates) {
        if (!sr.active) continue;
        const days = (sr.daysOfWeek || []).map((d: string) => norm(d));
        if (days.length === 0 || days.includes(currentDay) || days.includes('todos')) {
          const [startH, startM] = (sr.startTime || '00:00').split(':').map(Number);
          const [endH, endM] = (sr.endTime || '23:59').split(':').map(Number);
          const startTotal = startH * 60 + startM;
          const endTotal = endH * 60 + endM;

          const isInTime = startTotal <= endTotal
            ? (currentMin >= startTotal && currentMin <= endTotal)
            : (currentMin >= startTotal || currentMin <= endTotal);

          if (isInTime && sr.percentageModifier) {
            base = Math.round(base * (1 + Number(sr.percentageModifier) / 100));
            break;
          }
        }
      }
    }

    // Aplicar recargo por pago electrónico si no es Efectivo
    if (selectedPayment !== 'Efectivo' && matchedTariff.electronicPaymentFee) {
      base = Math.round(base * (1 + Number(matchedTariff.electronicPaymentFee) / 100));
    }

    return Math.max(minimumFare, base);
  };

  const getDaysRemaining = (dateStr: string) => {
    try {
      const match = dateStr.match(/(\d+)\s+([A-Za-z]+).*?(\d{4})/);
      if (match) {
        const day = parseInt(match[1]);
        const monthStr = match[2].toLowerCase();
        const year = parseInt(match[3]);
        
        const months: any = {
          jan: 0, ene: 0, feb: 1, mar: 2, apr: 3, abr: 3, may: 4, jun: 5, jul: 6, aug: 7, ago: 7, sep: 8, oct: 9, nov: 10, dec: 11, dic: 11
        };
        
        const month = months[monthStr.substring(0, 3)] || 9; // default Oct
        const targetDate = new Date(year, month, day);
        const today = new Date();
        targetDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
      }
    } catch (e) {
      console.error(e);
    }
    const targetDate = new Date(2026, 9, 12); // Oct 12, 2026
    const today = new Date();
    targetDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
      const options: any = { day: 'numeric', month: 'short' };
      return date.toLocaleDateString('es-AR', options);
    } catch (e) {
      return '';
    }
  };

  // Agendar Viaje Logic
  const handleScheduleTrip = () => {
    if (!scheduleDate || !scheduleTime) {
      return Alert.alert('Completar campos', 'Ingresá fecha y hora para programar el traslado.');
    }
    setIsScheduled(true);
    setScheduleModalVisible(false);
    Alert.alert('¡Viaje Agendado!', `Tu traslado desde "${origin || 'Tu ubicación'}" ha sido programado para el día ${scheduleDate} a las ${scheduleTime} hs.`);
  };

  // Vinculación de Billetera Mercado Pago (Wallet Connect)
  const handleLinkMercadoPago = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/checkout/wallet-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, email: user.email })
      });
      const data = await response.json();
      if (data.url) {
        Linking.openURL(data.url);
      } else {
        Alert.alert('Error', 'No se pudo generar el enlace de vinculación.');
      }
    } catch (err) {
      console.warn(err);
      // Fallback a producción
      const localSimUrl = `${API_BASE_URL}/checkout/mp-connect?userId=${user.uid}&email=${encodeURIComponent(user.email || '')}`;
      Linking.openURL(localSimUrl);
    }
  };

  // Finalizar viaje y procesar el pago Split en Mercado Pago
  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    setSavingProfile(true);
    try {
      if (selectedPayment === 'Mercado Pago' && !mpLinked) {
        Alert.alert(
          'Mercado Pago no vinculado', 
          'Por favor vinculá tu cuenta de Mercado Pago desde la pestaña de Perfil para poder pagar de forma automática.'
        );
        setSavingProfile(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/checkout/process-debit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: activeTrip.id,
          passengerId: user.uid,
          driverId: 'driver-1',
          amount: activeTrip.estimatedPrice || calculateFare(selectedCategory)
        })
      });

      const data = await response.json();
      if (data.success) {
        setEarnedPoints(data.pointsEarned || 150);
        setTripCompletedModalVisible(true);
        setRequestFlowStep('idle');
        setActiveTrip(null);
      } else {
        Alert.alert('Error en Pago', data.error || 'No se pudo debitar el saldo de Mercado Pago.');
      }
    } catch (err) {
      console.warn(err);
      setEarnedPoints(150); // Fallback local points
      setTripCompletedModalVisible(true);
      setRequestFlowStep('idle');
      setActiveTrip(null);
    } finally {
      setSavingProfile(false);
    }
  };

  // Guardar Datos extendidos de perfil
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        passport,
        emergencyContact,
        medicalNotes,
        updatedAt: Timestamp.now()
      }, { merge: true });
      Alert.alert('Perfil ampliado', 'Tus datos para reservas de TravelApp Experience se guardaron correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudieron guardar tus datos.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <View style={[styles.container, activeTab === 'home' && requestFlowStep !== 'active' && { backgroundColor: '#0A2A5B' }]}>
      {activeTab === 'home' && requestFlowStep === 'active' && driverDetails ? (
        <View style={styles.activeTripScreenContainer}>
          {/* 50% Superior: Mapa de Seguimiento Interactivo HD */}
          <View style={styles.topHalfMapContainer}>
            <InteractiveMapView
              originCoords={originCoords}
              destinationCoords={destinationCoords}
              routeCoordinates={routePolyline ? decodePolyline(routePolyline) : null}
              onlineDrivers={activeTrip?.driverLocation ? [{ id: 'active_driver', name: driverDetails?.name, location: activeTrip.driverLocation, heading: activeTrip.driverHeading }] : onlineDrivers}
              style={{ width: '100%', height: '100%' }}
            />
          </View>

          {/* 50% Inferior: Panel de información y deslizable */}
          <View style={[styles.bottomHalfContainer, { paddingBottom: insets.bottom }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomHalfScrollContent}>
              {/* Tarjeta del Chofer Asignado y Vehículo */}
              <View style={styles.driverTrackingCard}>
                <View style={styles.driverPanelHeader}>
                  <Image 
                    source={{ uri: driverDetails.avatar || driverDetails.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' }} 
                    style={styles.driverAvatarImg} 
                  />
                  <View style={styles.driverInfoCol}>
                    <Text style={styles.driverNameLabel}>{formatDriverName(driverDetails.name)}</Text>
                    <Text style={styles.driverCarPlate}>{driverDetails.model || 'Vehículo Conductor'} · <Text style={{ fontFamily: 'Quicksand-Bold', color: Colors.primary }}>{formatPlate(driverDetails.plate)}</Text></Text>
                    <Text style={styles.driverRatingText}>
                      ⭐ {driverDetails.rating || '4.9'} · <Text style={{ color: Colors.textMuted }}>{driverDetails.totalTrips || 142} viajes realizados</Text>
                    </Text>
                  </View>
                </View>
                
                {driverDetails.carPhoto ? (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Quicksand-Bold', color: Colors.textMuted, marginBottom: 4 }}>Vehículo asignado:</Text>
                    <Image source={{ uri: driverDetails.carPhoto }} style={styles.carPhotoTrackingImg} />
                  </View>
                ) : null}

                {/* PIN de Seguridad para abordar (Opcional) */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F0FDF4',
                  borderWidth: 1.5,
                  borderColor: '#86EFAC',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginTop: 10
                }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Quicksand-Bold', color: '#15803D' }}>
                      🔑 PIN DE ABORDAJE (OPCIONAL)
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'Quicksand-Medium', color: '#166534', marginTop: 1 }}>
                      Dictáselo al chofer solo si te lo solicita antes de arrancar.
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: '#16A34A',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}>
                    <Text style={{ fontSize: 15, fontFamily: 'Quicksand-Bold', color: '#FFFFFF', letterSpacing: 2 }}>
                      {activeTrip?.securityPin || '4829'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Controles de Viaje (Fila Horizontal) */}
              <View style={styles.tripControlsRow}>
                <TouchableOpacity 
                  style={[styles.controlBtnSquare, isRecording && styles.controlBtnRecording]}
                  onPress={() => setIsRecording(prev => !prev)}
                >
                  <Ionicons name={isRecording ? "mic" : "mic-outline"} size={20} color={Colors.white} />
                  <Text style={styles.controlBtnLabel}>{isRecording ? "Grabando" : "Grabar"}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.controlBtnSquare, { backgroundColor: '#25D366' }]}
                  onPress={() => Linking.openURL('https://wa.me/?text=Hola!%20Estoy%20viajando%20en%20TravelCab,%20seguí%20mi%20recorrido%20en%20tiempo%20real.')}
                >
                  <Ionicons name="logo-whatsapp" size={20} color={Colors.white} />
                  <Text style={styles.controlBtnLabel}>Compartir</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.controlBtnSquare, { backgroundColor: Colors.danger }]}
                  onPress={() => Linking.openURL('tel:911')}
                >
                  <Ionicons name="alert-circle" size={20} color={Colors.white} />
                  <Text style={styles.controlBtnLabel}>SOS 911</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.controlBtnSquare, { backgroundColor: Colors.primary }]}
                  onPress={() => setIsChatModalVisible(true)}
                >
                  <Ionicons name="chatbubbles-outline" size={20} color={Colors.white} />
                  <Text style={styles.controlBtnLabel}>Chat Chofer</Text>
                </TouchableOpacity>
              </View>

              {/* Sección de Novedades del Ecosistema Desplegable */}
              <View style={styles.ecosystemDrawerContainer}>
                <TouchableOpacity 
                  style={styles.ecosystemDrawerHeader} 
                  onPress={() => setIsEcosystemExpanded(prev => !prev)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="compass-outline" size={20} color={Colors.primary} />
                    <Text style={styles.ecosystemDrawerTitle}>Novedades del Ecosistema</Text>
                  </View>
                  
                  {!isEcosystemExpanded ? (
                    <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
                      <Ionicons name="chevron-up" size={20} color={Colors.accent} />
                    </Animated.View>
                  ) : (
                    <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>

                {!isEcosystemExpanded && (
                  <TouchableOpacity onPress={() => setIsEcosystemExpanded(true)} style={styles.drawerHintBanner}>
                    <Text style={styles.drawerHintText}>Tocá para desplegar los beneficios y novedades 🔼</Text>
                  </TouchableOpacity>
                )}

                {isEcosystemExpanded && (
                  <View style={styles.ecosystemDrawerBody}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cmsCarousel}>
                      {cmsBlocks.length > 0 ? (
                        cmsBlocks.flatMap(block => block.cards).map((card, idx) => (
                          <TouchableOpacity key={idx} style={styles.cmsCard} onPress={() => Linking.openURL(card.url)}>
                            <Image source={{ uri: card.imageUrl }} style={styles.cmsCardImg} />
                            <View style={styles.cmsCardBody}>
                              <Text style={styles.cmsCardTitle} numberOfLines={1}>{card.title}</Text>
                              <Text style={styles.cmsCardDesc} numberOfLines={2}>{card.description}</Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.promoCard}>
                          <Text style={styles.promoCardTitle}>Info Ecosistema TravelApp</Text>
                          <Text style={styles.promoCardDesc}>
                            ¿Sabías que al completar este viaje acumulás **150 puntos** en tu perfil de Rewards? Canjealos por beneficios en TravelApp Experiences.
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Botones Finales */}
              <View style={{ gap: 10, marginTop: 12 }}>
                <TouchableOpacity 
                  style={[styles.cancelTripBtn, { borderColor: Colors.success, paddingVertical: 12 }]} 
                  onPress={handleCompleteTrip}
                >
                  <Text style={[styles.cancelTripBtnText, { color: Colors.success }]}>
                    Confirmar Llegada y Pagar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.cancelTripBtn, { paddingVertical: 12 }]} onPress={handleCancelTrip}>
                  <Text style={styles.cancelTripBtnText}>Cancelar Viaje</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      ) : activeTab === 'home' && requestFlowStep === 'pricing' ? (
        <View style={styles.activeTripScreenContainer}>
          {/* 62% Superior: Mapa de Seguimiento y Tarifas HD Interactivo */}
          <View style={styles.topHalfMapContainer}>
            <InteractiveMapView
              originCoords={originCoords}
              destinationCoords={destinationCoords}
              routeCoordinates={routePolyline ? decodePolyline(routePolyline) : null}
              onlineDrivers={onlineDrivers}
              style={{ width: '100%', height: '100%' }}
            />

            {/* Badge Flotante Superior de Direcciones Estilo Uber/Cabify */}
            <View style={styles.vectorMapHeaderBadgeLight}>
              <Ionicons name="navigate-circle" size={20} color={Colors.accent} />
              <Text style={styles.vectorMapBadgeTextLight} numberOfLines={1}>
                {origin ? `${origin.split(',')[0]} ➔ ${destination ? destination.split(',')[0] : 'Destino'}` : 'Ruta Calculada'}
              </Text>
            </View>
          </View>

          {/* 38% Inferior: Tarifas y Selección (Estilo Canva) */}
          <View style={[styles.bottomHalfContainer, { paddingBottom: insets.bottom }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomHalfScrollContent}>
              <Text style={styles.canvaPricingTitle}>Tarifa aproximada</Text>
              
              <View style={{ gap: 10 }}>
                {availableCategories.length > 0 ? (
                  availableCategories.slice(0, 4).map(cat => {
                    const isSelected = selectedCategory === cat.name;
                    const fare = calculateFare(cat.name);
                    const catLower = (cat.name || cat.id || '').toLowerCase();
                    const localCarImage = catLower.includes('taxi')
                      ? require('../../assets/landing_taxi.png')
                      : catLower.includes('vip') || catLower.includes('premium')
                        ? require('../../assets/landing_premium.png')
                        : catLower.includes('plus')
                          ? require('../../assets/landing_plus.png')
                          : catLower.includes('rural') || catLower.includes('arc')
                            ? require('../../assets/landing_rural.png')
                            : require('../../assets/landing_estandar.png');
                    
                    const remoteImage = cat.imageUrl || cat.iconImage || cat.image || (cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('data:') || cat.icon.length > 30 || cat.icon.includes('/') || cat.icon.includes(';') || cat.icon.includes('+') || cat.icon.includes('=')) ? cat.icon : null);

                    return (
                      <TouchableOpacity 
                        key={cat.id} 
                        activeOpacity={0.9}
                        style={[styles.canvaCategoryBtn, isSelected && styles.canvaCategoryBtnActive]}
                        onPress={() => setSelectedCategory(cat.name)}
                      >
                        {/* Header: Nombre, ETA y Precio */}
                        <View style={styles.canvaCategoryHeaderRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.canvaCategoryName}>{cat.name}</Text>
                            <View style={styles.canvaEtaBadge}>
                              <Text style={styles.canvaEtaText}>{cat.eta || '3-5 min'}</Text>
                            </View>
                          </View>
                          <Text style={styles.canvaCategoryPrice}>${fare.toLocaleString('es-AR')}</Text>
                        </View>

                        {/* Imagen Grande de Auto que llega casi a los bordes de la tarjeta */}
                        <View style={styles.canvaCarImageContainer}>
                          <Image 
                            source={remoteImage ? { uri: remoteImage } : localCarImage} 
                            style={styles.canvaCarImage} 
                            resizeMode="contain" 
                          />
                        </View>

                        {/* Footer: Descripción y método de pago */}
                        <View style={styles.canvaCategoryFooterRow}>
                          <Text style={styles.canvaCategoryDesc} numberOfLines={1}>
                            {cat.description || 'Sedán moderno, climatizado y confortable'}
                          </Text>
                          <Text style={styles.canvaEtaText}>Efectivo / MP</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={{ textAlign: 'center', color: Colors.textSecondary, fontFamily: 'Quicksand-Medium', marginVertical: 10 }}>
                    No hay categorías disponibles
                  </Text>
                )}
              </View>

              {/* Botón de Agenda tu viaje */}
              <TouchableOpacity 
                style={styles.canvaAgendaBtn}
                onPress={() => {
                  setScheduleModalVisible(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.accent} style={{ marginRight: 8 }} />
                <Text style={styles.canvaAgendaBtnText}>Agenda tu viaje</Text>
              </TouchableOpacity>

              {/* Botones de acción */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={styles.canvaBackBtn} onPress={() => setRequestFlowStep('idle')}>
                  <Text style={styles.canvaBackBtnText}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.canvaConfirmBtn} onPress={startSearchDriver}>
                  <Text style={styles.canvaConfirmBtnText}>Solicitar viaje</Text>
                </TouchableOpacity>
              </View>

              {/* Botón Vincular con QR directo */}
              <TouchableOpacity
                style={styles.canvaDirectQrBtn}
                onPress={() => {
                  setQrScannerMode('camera');
                  setQrModalVisible(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="qr-code-outline" size={18} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.canvaDirectQrBtnText}>¿Ya en el auto? Vincular con QR de ventanilla</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      ) : (
        <>
          {/* MAPA DE FONDO EN INICIO */}
      {activeTab === 'home' && requestFlowStep === 'searching' && (
        <View style={styles.mapContainer}>
          {loadingLocation ? (
            <ActivityIndicator size="large" color={Colors.primary} style={StyleSheet.absoluteFill} />
          ) : Platform.OS === 'web' ? (
            <View style={styles.webMapPlaceholder}>
              <View style={styles.webMapGrid}>
                <View style={[styles.gridLine, { top: '30%', left: 0, right: 0 }]} />
                <View style={[styles.gridLine, { top: '60%', left: 0, right: 0 }]} />
                <View style={[styles.gridLine, { left: '33%', top: 0, bottom: 0 }]} />
                <View style={[styles.gridLine, { left: '66%', top: 0, bottom: 0 }]} />
                
                {/* Choferes reales desde Firestore (simulados en web en posiciones relativas) */}
                {onlineDrivers.map((d: any, index: number) => {
                  const topVal = 30 + (index * 17) % 50;
                  const leftVal = 20 + (index * 23) % 65;
                  return (
                    <View key={d.id} style={[styles.simulatedCar, { top: `${topVal}%`, left: `${leftVal}%` }]}>
                      <Ionicons name="car" size={18} color={index === 0 ? Colors.accent : Colors.white} />
                      <Text style={{ color: Colors.white, fontSize: 8, fontFamily: 'Quicksand-Bold', marginTop: 2 }}>
                        {d.name || d.driverName || 'Chofer'}
                      </Text>
                    </View>
                  );
                })}

                {/* Ruta simulada en Web */}
                {originCoords && destinationCoords && (
                  <View style={styles.webSimulatedRouteContainer}>
                    <View style={[styles.simulatedMarker, { backgroundColor: Colors.success }]}>
                      <Text style={styles.simulatedMarkerText}>O</Text>
                    </View>
                    <View style={styles.simulatedRouteLine} />
                    <View style={[styles.simulatedMarker, { backgroundColor: Colors.danger }]}>
                      <Text style={styles.simulatedMarkerText}>D</Text>
                    </View>
                  </View>
                )}
              </View>
              <Text style={styles.webMapText}>
                {originCoords && destinationCoords 
                  ? `Ruta: ${origin.split(',')[0]} ➔ ${destination.split(',')[0]}` 
                  : "Mapa en Vivo (Simulación Ecosistema)"}
              </Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={DEFAULT_REGION}
              showsUserLocation
            >
              <UrlTile
                urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
                flipY={false}
              />
              {/* Choferes online */}
              {onlineDrivers.map((d: any) => d.location && (
                <Marker
                  key={d.id}
                  coordinate={d.location}
                  title={d.name}
                  description="Chofer de TravelCab cercano"
                >
                  <View style={styles.driverCarMarker}>
                    <Ionicons name="car" size={16} color={Colors.white} />
                  </View>
                </Marker>
              ))}

              {/* Ruta activa y marcadores de origen/destino */}
              {originCoords && (
                <Marker coordinate={originCoords} title="Origen">
                  <View style={[styles.markerPin, { backgroundColor: Colors.success }]}>
                    <Ionicons name="pin" size={16} color={Colors.white} />
                  </View>
                </Marker>
              )}
              {destinationCoords && (
                <Marker coordinate={destinationCoords} title="Destino">
                  <View style={[styles.markerPin, { backgroundColor: Colors.danger }]}>
                    <Ionicons name="flag" size={16} color={Colors.white} />
                  </View>
                </Marker>
              )}
              {routePolyline ? (
                <Polyline
                  coordinates={decodePolyline(routePolyline)}
                  strokeColor={Colors.accent}
                  strokeWidth={4}
                />
              ) : null}
            </MapView>
          )}
        </View>
      )}

      {/* HEADER DE INICIO (ESTILO AZUL TECH) */}
      {activeTab === 'home' && requestFlowStep === 'idle' && (
        <View style={[styles.canvaHeader, { paddingTop: insets.top > 0 ? insets.top + 12 : 36 }]}>
          <View style={[styles.canvaLogoRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <TravelCabLogo size={140} textColor={Colors.white} isAccentColor={true} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={styles.topQrScanBtn}
                onPress={() => {
                  setQrScannerMode('camera');
                  setQrModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="qr-code" size={16} color="#0B192C" />
                <Text style={styles.topQrScanText}>QR Chofer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topSafetyIconBtn}
                onPress={() => setSafetyModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={18} color="#EF4444" />
                <Text style={styles.topSafetyIconText}>Seguridad</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topSupportIconBtn}
                onPress={() => setSupportModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="headset" size={18} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.canvaUserGreetingBox}>
            <View style={styles.canvaUserGreetingRow}>
              <View style={styles.canvaUserAvatarCircle}>
                <Ionicons name="person" size={16} color={Colors.primary} />
              </View>
              <Text style={styles.canvaGreetingText}>
                Hola {user?.displayName ? user.displayName.split(' ')[0] : 'Pasajero'}, ¿a dónde vamos hoy?
              </Text>
            </View>

            <View style={styles.canvaPointsRow}>
              <Ionicons name="star" size={14} color={Colors.accent} style={{ marginRight: 4 }} />
              <Text style={styles.canvaPointsLabel}>Tenes acumulados </Text>
              <Text style={styles.canvaPointsVal}>{rewardsPoints}</Text>
              <Text style={styles.canvaPointsLabel}> puntos</Text>
            </View>
          </View>
        </View>
      )}

      {/* CONTENIDO PRINCIPAL SEGÚN EL TAB ACTIVO */}
      <ScrollView 
        style={styles.mainScroll}
        contentContainerStyle={[
          styles.mainScrollContent,
          activeTab === 'home' && requestFlowStep === 'idle' && [
            styles.mainScrollContentHomeMap,
            { paddingBottom: 82 + insets.bottom }
          ]
        ]}
        showsVerticalScrollIndicator={false}
      >
        
        {/* TABS 1: INICIO (HOME) */}
        {activeTab === 'home' && (
          <View style={[styles.tabContentContainer, { paddingTop: 16 }]}>
            
            {/* Flujo: Formulario inicial de búsqueda y QR destacado */}
            {requestFlowStep === 'idle' && (
              <>
                {/* TARJETA DESTACADA PREPONDERANTE: ESCANEAR QR CHOFER CON CÁMARA */}
                <TouchableOpacity
                  style={styles.heroQrScanCard}
                  onPress={() => {
                    setQrScannerMode('camera');
                    setQrModalVisible(true);
                  }}
                  activeOpacity={0.88}
                >
                  <View style={styles.heroQrIconContainer}>
                    <Ionicons name="qr-code" size={28} color="#0284C7" />
                    <View style={styles.heroQrCameraBadge}>
                      <Ionicons name="camera" size={11} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={styles.heroQrScanTitle}>¿Ya estás en el taxi o auto?</Text>
                      <View style={styles.heroQrScanBadge}>
                        <Text style={styles.heroQrScanBadgeText}>ESCANEAR</Text>
                      </View>
                    </View>
                    <Text style={styles.heroQrScanSubtitle}>
                      Abrí la cámara y escaneá el QR de la ventanilla para activar el taxímetro o vincular viaje
                    </Text>
                  </View>
                  <View style={styles.heroQrArrowBtn}>
                    <Ionicons name="chevron-forward" size={18} color="#0284C7" />
                  </View>
                </TouchableOpacity>

                <Animated.View style={styles.bookingCard}>
                {/* Tabs de Selección de Servicio */}
                <View style={styles.canvaTabsRow}>
                  <TouchableOpacity 
                    style={[styles.canvaTabOpt, activeSubMode === 'urbana' && styles.canvaTabOptActive]}
                    onPress={() => {
                      setActiveSubMode('urbana');
                      setServiceMode('urbana');
                    }}
                  >
                    <Ionicons name="car-outline" size={16} color={activeSubMode === 'urbana' ? Colors.white : Colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.canvaTabOptText, activeSubMode === 'urbana' && styles.canvaTabOptTextActive]}>Movilidad Urbana</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.canvaTabOpt, activeSubMode === 'interurbano' && styles.canvaTabOptActive]}
                    onPress={() => {
                      setActiveSubMode('interurbano');
                      setServiceMode('aci');
                    }}
                  >
                    <Ionicons name="navigate-outline" size={16} color={activeSubMode === 'interurbano' ? Colors.white : Colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.canvaTabOptText, activeSubMode === 'interurbano' && styles.canvaTabOptTextActive]}>Interurbano</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.canvaTabOpt, activeSubMode === 'traslados' && styles.canvaTabOptActive]}
                    onPress={() => setActiveSubMode('traslados')}
                  >
                    <Ionicons name="bus-outline" size={16} color={activeSubMode === 'traslados' ? Colors.white : Colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.canvaTabOptText, activeSubMode === 'traslados' && styles.canvaTabOptTextActive]}>Traslados</Text>
                  </TouchableOpacity>
                </View>

                {/* Título de Tarjeta dinámico */}
                <Text style={[
                  styles.canvaCardTitle,
                  activeSubMode === 'interurbano' && { color: Colors.accent },
                  activeSubMode === 'traslados' && { color: Colors.danger }
                ]}>
                  {activeSubMode === 'urbana' ? 'Movilidad Urbana' : activeSubMode === 'interurbano' ? 'Interurbano' : 'Traslados Especiales'}
                </Text>

                {/* MODO 1: MOVILIDAD URBANA */}
                {activeSubMode === 'urbana' && (
                  <View style={{ gap: 10 }}>
                    {/* Origen */}
                    <View>
                      <Text style={styles.canvaInputLabel}>Origen</Text>
                      <View style={styles.canvaInputField}>
                        <Ionicons name="ellipse" size={10} color={Colors.success} style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.canvaTextInput}
                          placeholder="Origen (Ubicación actual)"
                          placeholderTextColor="#A0AEC0"
                          value={origin}
                          onChangeText={(text) => fetchPlaceSuggestions(text, 'origin')}
                          onFocus={() => setActiveSearchField('origin')}
                        />
                        {origin.length > 0 && (
                          <TouchableOpacity onPress={() => { setOrigin(''); setOriginSuggestions([]); }}>
                            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                      {activeSearchField === 'origin' && originSuggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                          {originSuggestions.map((item) => (
                            <TouchableOpacity
                              key={item.place_id}
                              style={styles.suggestionItem}
                              onPress={() => handleSelectSuggestion(item, 'origin')}
                            >
                              <Ionicons name="location-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
                              <Text style={styles.suggestionText} numberOfLines={1}>
                                {item.description}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Paradas Intermedias (Hasta 3) */}
                    {intermediateStops.map((stopText, idx) => (
                      <View key={`stop-${idx}`}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.canvaInputLabel}>Parada Intermedia {idx + 1}</Text>
                          <TouchableOpacity onPress={() => handleRemoveStop(idx)}>
                            <Text style={{ fontSize: 11, fontFamily: Fonts.medium, color: Colors.danger }}>Quitar</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.canvaInputField}>
                          <Ionicons name="git-commit-outline" size={16} color={Colors.warning} style={{ marginRight: 8 }} />
                          <TextInput
                            style={styles.canvaTextInput}
                            placeholder={`Dirección de parada ${idx + 1}`}
                            placeholderTextColor="#A0AEC0"
                            value={stopText}
                            onChangeText={(val) => handleUpdateStop(idx, val)}
                          />
                          <TouchableOpacity onPress={() => handleRemoveStop(idx)}>
                            <Ionicons name="close-circle" size={18} color={Colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {/* Botón para agregar parada intermedia (máximo 3) */}
                    {intermediateStops.length < 3 && (
                      <TouchableOpacity onPress={handleAddStop} style={styles.addStopBtn}>
                        <Ionicons name="add-circle-outline" size={16} color={Colors.accent} />
                        <Text style={styles.addStopBtnText}>
                          + Agregar parada intermedia ({intermediateStops.length}/3)
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Destino */}
                    <View>
                      <Text style={styles.canvaInputLabel}>Destino</Text>
                      <View style={styles.canvaInputField}>
                        <Ionicons name="location" size={14} color={Colors.danger} style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.canvaTextInput}
                          placeholder="¿A dónde querés ir?"
                          placeholderTextColor="#A0AEC0"
                          value={destination}
                          onChangeText={(text) => fetchPlaceSuggestions(text, 'destination')}
                          onFocus={() => setActiveSearchField('destination')}
                        />
                        {destination.length > 0 && (
                          <TouchableOpacity onPress={() => { setDestination(''); setDestSuggestions([]); }}>
                            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                      {activeSearchField === 'destination' && destSuggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                          {destSuggestions.map((item) => (
                            <TouchableOpacity
                              key={item.place_id}
                              style={styles.suggestionItem}
                              onPress={() => handleSelectSuggestion(item, 'destination')}
                            >
                              <Ionicons name="location-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
                              <Text style={styles.suggestionText} numberOfLines={1}>
                                {item.description}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* MODO 2: INTERURBANO */}
                {activeSubMode === 'interurbano' && (
                  <View style={{ gap: 10 }}>
                    {/* Origen */}
                    <View>
                      <Text style={styles.canvaInputLabel}>Origen</Text>
                      <View style={styles.canvaInputField}>
                        <Ionicons name="ellipse" size={10} color={Colors.success} style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.canvaTextInput}
                          placeholder="Origen (Ubicación o Ciudad)"
                          placeholderTextColor="#A0AEC0"
                          value={origin}
                          onChangeText={(text) => fetchPlaceSuggestions(text, 'origin')}
                          onFocus={() => setActiveSearchField('origin')}
                        />
                      </View>
                    </View>

                    {/* Destino */}
                    <View>
                      <Text style={styles.canvaInputLabel}>Destino Interurbano</Text>
                      <View style={styles.canvaInputField}>
                        <Ionicons name="location" size={14} color={Colors.danger} style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.canvaTextInput}
                          placeholder="Ciudad / Localidad de destino"
                          placeholderTextColor="#A0AEC0"
                          value={destination}
                          onChangeText={(text) => fetchPlaceSuggestions(text, 'destination')}
                          onFocus={() => setActiveSearchField('destination')}
                        />
                      </View>
                    </View>

                    {/* Cantidad de Pasajeros */}
                    <View>
                      <Text style={styles.canvaInputLabel}>Pasajeros (Máximo habilitado en la categoría)</Text>
                      <View style={styles.passengerStepperRow}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => {
                            const val = Math.max(1, parseInt(schedulePassengers || '1') - 1);
                            setSchedulePassengers(val.toString());
                          }}
                        >
                          <Ionicons name="remove" size={18} color={Colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValText}>{schedulePassengers || '1'} Pasajero(s)</Text>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => {
                            const maxLimit = selectedCategory === 'Premium' ? 4 : 7;
                            const val = Math.min(maxLimit, parseInt(schedulePassengers || '1') + 1);
                            setSchedulePassengers(val.toString());
                          }}
                        >
                          <Ionicons name="add" size={18} color={Colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* MODO 3: TRASLADOS */}
                {activeSubMode === 'traslados' && (
                  <View style={{ gap: 10 }}>
                    {/* Fila 1: Ciudad y Pasajeros */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.canvaInputLabel}>Ciudad</Text>
                        <View style={styles.canvaInputField}>
                          <Ionicons name="business-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
                          <TextInput 
                            style={styles.canvaTextInput}
                            placeholder="Ej. Tucumán"
                            placeholderTextColor="#A0AEC0"
                            value={scheduleCity}
                            onChangeText={setScheduleCity}
                          />
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.canvaInputLabel}>Pasajeros</Text>
                        <View style={styles.canvaInputField}>
                          <Ionicons name="people-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
                          <TextInput 
                            style={styles.canvaTextInput}
                            placeholder="Cant."
                            placeholderTextColor="#A0AEC0"
                            keyboardType="numeric"
                            value={schedulePassengers}
                            onChangeText={setSchedulePassengers}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Origen */}
                    <View>
                      <Text style={styles.canvaInputLabel}>Origen de Traslado</Text>
                      <View style={styles.canvaInputField}>
                        <Ionicons name="ellipse" size={10} color={Colors.success} style={{ marginRight: 8 }} />
                        <TextInput 
                          style={styles.canvaTextInput}
                          placeholder="Aeropuerto / Hotel / Dirección"
                          placeholderTextColor="#A0AEC0"
                          value={origin}
                          onChangeText={(text) => fetchPlaceSuggestions(text, 'origin')}
                        />
                      </View>
                    </View>

                    {/* Destino */}
                    <View>
                      <Text style={styles.canvaInputLabel}>Destino de Traslado</Text>
                      <View style={styles.canvaInputField}>
                        <Ionicons name="location" size={14} color={Colors.danger} style={{ marginRight: 8 }} />
                        <TextInput 
                          style={styles.canvaTextInput}
                          placeholder="Punto final de traslado"
                          placeholderTextColor="#A0AEC0"
                          value={destination}
                          onChangeText={(text) => fetchPlaceSuggestions(text, 'destination')}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Selector Sutil de Forma de Pago */}
                <Text style={styles.canvaPaymentTitle}>Forma de pago</Text>
                <View style={styles.canvaPaymentCompactBar}>
                  {[
                    { id: 'Efectivo', label: 'Efectivo', icon: 'cash-outline', isMP: false, color: '#15803D' },
                    { id: 'Mercado Pago', label: 'Mercado Pago', icon: null, isMP: true, color: '#009EE3' },
                    { id: 'Rewards', label: 'Puntos Rewards', icon: 'gift-outline', isMP: false, color: '#D97706' }
                  ].map(m => {
                    const isSelected = selectedPayment === m.id;
                    return (
                      <TouchableOpacity 
                        key={m.id}
                        style={[
                          styles.canvaPaymentCompactItem,
                          isSelected && { backgroundColor: m.color, borderColor: m.color }
                        ]}
                        onPress={() => setSelectedPayment(m.id)}
                      >
                        {m.isMP ? (
                          <Image 
                            source={{ uri: 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadopago/logo__small@2x.png' }} 
                            style={{ width: 18, height: 18, resizeMode: 'contain', borderRadius: 4 }} 
                          />
                        ) : (
                          <Ionicons name={getSafeIoniconsName(m.icon, 'wallet-outline')} size={16} color={isSelected ? Colors.white : '#475569'} />
                        )}
                        <Text style={[
                          styles.canvaPaymentCompactLabel,
                          isSelected && { color: Colors.white, fontFamily: Fonts.bold }
                        ]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Botón Calcular Viaje Naranja Redondeado */}
                <TouchableOpacity 
                  style={styles.canvaCalcularBtn}
                  onPress={async () => {
                    if (!destination) {
                      return Alert.alert('Destino incompleto', 'Por favor ingresá la dirección a donde querés ir.');
                    }
                    await ensureCoordsAndRoute();
                    setRequestFlowStep('pricing');
                  }}
                >
                  <Text style={styles.canvaCalcularBtnText}>
                    {activeSubMode === 'traslados' ? 'Calcular traslado' : 'Calcular viaje'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}


            {/* Carruseles CMS de Novedades del Ecosistema y Beneficios Rewards (Estilo Mercado Pago / 3D Stacking) */}
            {requestFlowStep === 'idle' && (
              <View style={{ marginTop: 6 }}>
                {/* CMS: Novedades del Ecosistema */}
                <OverlappingNativeCarousel
                  cards={cmsBlocks.flatMap(block => block.cards)}
                  title="Novedades del Ecosistema"
                  subtitle="Deslizá para descubrir promociones exclusivas"
                  badgeColor="#FF6B00"
                  onSeeMore={() => setActiveTab('experience')}
                />

                {/* CMS: Beneficios Rewards */}
                {rewardsBlocks.length > 0 && (
                  <OverlappingNativeCarousel
                    cards={rewardsBlocks}
                    title="Beneficios Rewards"
                    subtitle="Canjes y descuentos exclusivos para miembros"
                    badgeColor="#F59E0B"
                    onSeeMore={() => setActiveTab('rewards')}
                  />
                )}
              </View>
            )}
          </View>
        )}

        {/* TABS: EXPERIENCIAS */}
        {activeTab === 'experience' && (
          <View style={[styles.tabContentContainer, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
            <View style={styles.experienceHeader}>
              <TravelExperienceLogo size={180} textColor={Colors.primary} />
            </View>
            <Text style={styles.experienceHeaderDesc}>Tus mejores experiencias aquí</Text>

            {/* Segmented Control de Experiencias */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity 
                style={[styles.segmentBtn, experienceMainTab === 'catalog' && styles.segmentBtnActive]}
                onPress={() => setExperienceMainTab('catalog')}
              >
                <Ionicons name="earth" size={16} color={experienceMainTab === 'catalog' ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.segmentText, experienceMainTab === 'catalog' && styles.segmentTextActive]}>Catálogo</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentBtn, experienceMainTab === 'trip' && styles.segmentBtnActive]}
                onPress={() => setExperienceMainTab('trip')}
              >
                <Ionicons name="compass" size={16} color={experienceMainTab === 'trip' ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.segmentText, experienceMainTab === 'trip' && styles.segmentTextActive]}>Mi experiencia</Text>
                {!hasPurchasedOrganizedTrip && (
                  <Ionicons name="lock-closed" size={12} color={experienceMainTab === 'trip' ? Colors.white : Colors.textMuted} style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            </View>

            {/* SECCIÓN A: CATÁLOGO */}
            {experienceMainTab === 'catalog' && (
              <View style={styles.catalogContainer}>
                {experiences.map(item => (
                  <View key={item.id} style={styles.catalogCard}>
                    <Image source={{ uri: item.img || item.imageUrl }} style={styles.catalogCardImg} />
                    <View style={styles.catalogCardBody}>
                      <View style={styles.catalogCardMeta}>
                        <Text style={styles.catalogDuration}>{item.duration}</Text>
                        <Text style={styles.catalogPrice}>{item.price}</Text>
                      </View>
                      <Text style={styles.catalogTitle}>{item.title}</Text>
                      <Text style={styles.catalogDesc}>{item.desc || item.description}</Text>
                      <TouchableOpacity 
                        style={styles.catalogConsultBtn}
                        onPress={() => {
                          Alert.alert(
                            'Consultar Experiencia',
                            `¿Querés hablar con un asesor o consultarle a Travis AI sobre "${item.title}"?`,
                            [
                              { text: 'Preguntar a Travis', onPress: () => {
                                setExperienceMainTab('trip');
                                setActiveTripSubTab('itinerary');
                                if (!hasPurchasedOrganizedTrip) {
                                  Alert.alert("Acceso Restringido", "Este sector exclusivo se habilitará una vez que realices la reserva de tu viaje.");
                                } else {
                                  setTravisQuery(`¿Qué excursiones recomiendan hacer en Mendoza en un viaje de 5 días?`);
                                }
                              }},
                              { text: 'Chatear con Asesor', onPress: () => {
                                navigation.navigate('Chat');
                              }},
                              { text: 'Cancelar', style: 'cancel' }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.white} />
                        <Text style={styles.catalogConsultBtnText}>Consultar Detalles</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* SECCIÓN B: MI EXPERIENCIA */}
            {experienceMainTab === 'trip' && (
              <View style={{ width: '100%' }}>
                {!hasPurchasedOrganizedTrip || !contractedTrip ? (
                  <View style={styles.lockedTripContainer}>
                    <View style={styles.lockIconCircle}>
                      <Ionicons name="lock-closed" size={32} color={Colors.accent} />
                    </View>
                    <Text style={styles.lockedTripTitle}>Módulo Bloqueado</Text>
                    <Text style={styles.lockedTripDesc}>
                      Este sector exclusivo se habilitará una vez que realices la reserva o contrates una experiencia organizada por nosotros. Solo usuarios con reserva activa pueden acceder.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.activeTripDetailContainer}>
                    <View style={styles.activeTripHero}>
                      <Image source={{ uri: contractedTrip.imageUrl }} style={styles.activeTripHeroImg} />
                      <View style={styles.activeTripHeroOverlay}>
                        <Text style={styles.activeTripHeroTitle}>{contractedTrip.destination}</Text>
                        <View style={styles.activeTripHeroBadge}>
                          <Ionicons name="calendar-outline" size={12} color={Colors.white} />
                          <Text style={styles.activeTripHeroBadgeText}>{contractedTrip.dates}</Text>
                        </View>
                      </View>
                    </View>

                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.subTabScroll}
                      contentContainerStyle={styles.subTabScrollContent}
                    >
                      {[
                        { id: 'itinerary', label: 'Itinerario & Info', icon: 'list-circle-outline' },
                        { id: 'payments', label: 'Pagos & Extras', icon: 'wallet-outline' },
                        { id: 'group', label: 'Comunidad', icon: 'people-outline' },
                        { id: 'gallery', label: 'Fotos', icon: 'images-outline' },
                      ].map(subTab => {
                        const isSubSelected = activeTripSubTab === subTab.id;
                        return (
                          <TouchableOpacity
                            key={subTab.id}
                            style={[styles.subTabBtn, isSubSelected && styles.subTabBtnActive]}
                            onPress={() => setActiveTripSubTab(subTab.id as any)}
                          >
                            <Ionicons name={subTab.icon as any} size={16} color={isSubSelected ? Colors.white : Colors.textSecondary} />
                            <Text style={[styles.subTabBtnText, isSubSelected && styles.subTabBtnTextActive]}>{subTab.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {activeTripSubTab === 'itinerary' && (
                      <View style={styles.subTabContent}>
                        <View style={styles.infoSectionCard}>
                          <Text style={styles.sectionSubTitle}>Servicios Contratados</Text>
                          {contractedTrip.services?.map((service: string, idx: number) => (
                            <View key={idx} style={styles.serviceRow}>
                              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                              <Text style={styles.serviceText}>{service}</Text>
                            </View>
                          ))}
                          
                          <TouchableOpacity 
                            style={styles.downloadPdfBtn}
                            onPress={() => {
                              Alert.alert(
                                'Descargar Cobertura',
                                'Descargando póliza y credencial digital de asistencia Assist Card (PDF) en segundo plano...',
                                [{ text: 'Listo' }]
                              );
                            }}
                          >
                            <Ionicons name="cloud-download-outline" size={18} color={Colors.primary} />
                            <Text style={styles.downloadPdfBtnText}>Descargar Voucher de Asistencia (PDF)</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionSubTitle}>Itinerario del Viaje</Text>
                        <View style={styles.itineraryAccordion}>
                          {contractedTrip.itinerary?.map((day: any) => {
                            const isExpanded = expandedDay === day.day;
                            return (
                              <View key={day.day} style={[styles.accordionItem, isExpanded && styles.accordionItemExpanded]}>
                                <TouchableOpacity 
                                  style={styles.accordionHeader}
                                  onPress={() => setExpandedDay(isExpanded ? null : day.day)}
                                >
                                  <View style={styles.accordionDayCircle}>
                                    <Text style={styles.accordionDayText}>D{day.day}</Text>
                                  </View>
                                  <Text style={styles.accordionHeaderTitle} numberOfLines={1}>{day.title}</Text>
                                  <Ionicons 
                                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                                    size={18} 
                                    color={Colors.textSecondary} 
                                  />
                                </TouchableOpacity>
                                
                                {isExpanded && (
                                  <View style={styles.accordionBody}>
                                    <Text style={styles.accordionBodyDesc}>{day.description}</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>

                        <View style={styles.travisWidgetCard}>
                          <View style={styles.travisWidgetHeader}>
                            <View style={styles.travisWidgetAvatar}>
                              <Text style={styles.travisWidgetAvatarText}>T</Text>
                            </View>
                            <View>
                              <Text style={styles.travisWidgetTitle}>¿Dudas sobre {contractedTrip.destination}?</Text>
                              <Text style={styles.travisWidgetSubtitle}>Preguntale a Travis AI sobre clima, ropa, gastronomía, etc.</Text>
                            </View>
                          </View>
                          
                          <View style={styles.travisWidgetForm}>
                            <TextInput
                              style={styles.travisWidgetInput}
                              placeholder="Ej: ¿Qué ropa llevo para el Hornocal?"
                              value={travisQuery}
                              onChangeText={setTravisQuery}
                            />
                            <TouchableOpacity 
                              style={styles.travisWidgetBtn}
                              onPress={handleAskTravisAboutDestination}
                              disabled={travisLoading}
                            >
                              {travisLoading ? (
                                <ActivityIndicator size="small" color={Colors.white} />
                              ) : (
                                <Ionicons name="send" size={16} color={Colors.white} />
                              )}
                            </TouchableOpacity>
                          </View>

                          {travisAnswer ? (
                            <View style={styles.travisWidgetResponse}>
                              <Text style={styles.travisWidgetResponseTitle}>Respuesta de Travis:</Text>
                              <Text style={styles.travisWidgetResponseText}>{travisAnswer}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    )}

                    {activeTripSubTab === 'payments' && (
                      <View style={styles.subTabContent}>
                        <View style={styles.paymentStatusCard}>
                          <Text style={styles.paymentCardTitle}>Financiación y Estado de Pago</Text>
                          <View style={styles.paymentProgressContainer}>
                            <View style={styles.paymentProgRow}>
                              <Text style={styles.paymentProgLabel}>Saldo Abonado</Text>
                              <Text style={styles.paymentProgValue}>
                                {contractedTrip.payment.currency} ${contractedTrip.payment.paidAmount} / ${contractedTrip.payment.totalAmount}
                              </Text>
                            </View>
                            <View style={styles.progressBarBg}>
                              <View style={[
                                styles.progressBarFill, 
                                { width: `${(contractedTrip.payment.paidAmount / contractedTrip.payment.totalAmount) * 100}%` }
                              ]} />
                            </View>
                            <Text style={styles.remainingBalanceText}>
                              Saldo Restante a pagar: {contractedTrip.payment.currency} ${contractedTrip.payment.totalAmount - contractedTrip.payment.paidAmount}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.sectionSubTitle}>Excursiones Opcionales (Adquirir con Galicia - Nave)</Text>
                        <View style={styles.excursionsList}>
                          {excursionsList.map((exc: any) => (
                            <View key={exc.id} style={styles.excursionCard}>
                              <View style={styles.excursionHeader}>
                                <Text style={styles.excursionTitle}>{exc.title}</Text>
                                <Text style={styles.excursionPrice}>U$S {exc.price}</Text>
                              </View>
                              <Text style={styles.excursionDesc}>{exc.description}</Text>
                              
                              {exc.paid ? (
                                <View style={styles.paidBadge}>
                                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                                  <Text style={styles.paidBadgeText}>ADQUIRIDA Y PAGADA</Text>
                                </View>
                              ) : (
                                <TouchableOpacity 
                                  style={styles.payExcursionBtn}
                                  onPress={() => handleStartGaliciaPayment(exc)}
                                >
                                  <Ionicons name="wallet-outline" size={16} color={Colors.white} />
                                  <Text style={styles.payExcursionBtnText}>Pagar con Galicia - Nave</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {activeTripSubTab === 'group' && (
                      <View style={styles.subTabContent}>
                        <View style={styles.coordinatorCard}>
                          <Image source={{ uri: contractedTrip.coordinator.avatar }} style={styles.coordinatorAvatar} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.coordinatorName}>{contractedTrip.coordinator.name}</Text>
                            <Text style={styles.coordinatorRole}>Coordinador de Viaje Asignado</Text>
                            <TouchableOpacity 
                              style={styles.whatsappCoordBtn}
                              onPress={() => Linking.openURL(`https://wa.me/${contractedTrip.coordinator.phone.replace(/[^0-9]/g, '')}`)}
                            >
                              <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                              <Text style={styles.whatsappCoordText}>Hablar por WhatsApp</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text style={styles.sectionSubTitle}>Tus Compañeros de Viaje</Text>
                        <View style={styles.passengersListRow}>
                          {['Sofía (BsAs)', 'Martín (Tucumán)', 'Griselda (Cba)', 'Juan Pablo (Mza)'].map((pName, index) => (
                            <View key={index} style={styles.passengerChip}>
                              <Ionicons name="person-outline" size={12} color={Colors.primary} />
                              <Text style={styles.passengerChipText}>{pName}</Text>
                            </View>
                          ))}
                        </View>

                        <Text style={styles.sectionSubTitle}>Chat Grupal de la Expedición 💬</Text>
                        <View style={styles.groupChatContainer}>
                          <ScrollView 
                            style={styles.chatScroll}
                            contentContainerStyle={{ gap: 10, padding: 10 }}
                            nestedScrollEnabled
                          >
                            {groupMessages.map((msg) => {
                              const isMe = msg.senderRole === 'pasajero' && msg.sender === user.displayName;
                              const isCoord = msg.senderRole === 'coordinador';
                              return (
                                <View 
                                  key={msg.id} 
                                  style={[
                                    styles.chatBubble, 
                                    isMe ? styles.chatBubbleMe : isCoord ? styles.chatBubbleCoord : styles.chatBubbleOther
                                  ]}
                                >
                                  <Text style={styles.chatSenderName}>{msg.sender}</Text>
                                  <Text style={styles.chatBubbleText}>{msg.text}</Text>
                                </View>
                              );
                            })}
                          </ScrollView>
                          
                          <View style={styles.chatInputRow}>
                            <TextInput
                              style={styles.chatInput}
                              placeholder="Escribí un mensaje al grupo..."
                              value={coordinatorMessage}
                              onChangeText={setCoordinatorMessage}
                            />
                            <TouchableOpacity 
                              style={styles.chatSendBtn}
                              onPress={handleSendCoordinatorMessage}
                            >
                              <Ionicons name="send" size={16} color={Colors.white} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}

                    {activeTripSubTab === 'gallery' && (
                      <View style={styles.subTabContent}>
                        <Text style={styles.sectionSubTitle}>Galería de Recuerdos del Viaje 📸</Text>
                        <Text style={styles.tabHeaderDesc}>Fotos capturadas por el coordinador y los participantes para descargar.</Text>
                        
                        <View style={styles.galleryGrid}>
                          {contractedTrip.photos?.map((photoUrl: string, index: number) => (
                            <View key={index} style={styles.galleryItem}>
                              <Image source={{ uri: photoUrl }} style={styles.galleryImg} />
                              <TouchableOpacity 
                                style={styles.downloadPhotoBtn}
                                onPress={() => {
                                  Alert.alert(
                                    'Descarga de Foto',
                                    'La foto fue guardada en tu galería de imágenes.',
                                    [{ text: 'Aceptar' }]
                                  );
                                }}
                              >
                                <Ionicons name="cloud-download-outline" size={16} color={Colors.white} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* TABS 2: MIS VIAJES */}
        {activeTab === 'trips' && (
          <View style={[styles.tabContentContainer, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
            <Text style={styles.tabHeaderTitle}>Mis Viajes y Actividad</Text>
            <Text style={styles.tabHeaderDesc}>Listado de traslados urbanos e interurbanos y tus canjes del ecosistema.</Text>
            
            {hasPurchasedOrganizedTrip && contractedTrip && (
              <View style={styles.upcomingExperienceCard}>
                <Image source={{ uri: contractedTrip.imageUrl }} style={styles.upcomingExperienceImg} />
                <View style={styles.upcomingExperienceOverlay} />
                <View style={styles.upcomingExperienceBody}>
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingBadgeText}>PRÓXIMO VIAJE GRUPAL</Text>
                  </View>
                  <Text style={styles.upcomingDest}>{contractedTrip.destination}</Text>
                  <Text style={styles.upcomingDates}><Ionicons name="calendar-outline" size={12} color="#FFF" /> {contractedTrip.dates}</Text>
                  
                  {/* Cuenta regresiva */}
                  <View style={styles.countdownRow}>
                    <Ionicons name="time-outline" size={16} color="#FFE082" />
                    <Text style={styles.countdownText}>
                      Faltan <Text style={{ fontFamily: 'Quicksand-Bold', color: '#FFE082' }}>{getDaysRemaining(contractedTrip.dates)}</Text> días para la partida
                    </Text>
                  </View>
                  
                  <View style={styles.upcomingFooter}>
                    <View style={styles.coordInfo}>
                      <Image source={{ uri: contractedTrip.coordinator?.avatar }} style={styles.coordAvatar} />
                      <View>
                        <Text style={styles.coordLabel}>Coordinador</Text>
                        <Text style={styles.coordName}>{contractedTrip.coordinator?.name}</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.qrCheckinBtn}
                      onPress={() => setIsQrModalVisible(true)}
                    >
                      <Ionicons name="qr-code-outline" size={16} color={Colors.white} />
                      <Text style={styles.qrCheckinBtnText}>Boarding Pass</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10, fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary }]}>Historial de Viajes</Text>

            <View style={styles.tripsList}>
              {passengerTrips.length > 0 ? (
                passengerTrips.map(item => (
                  <View key={item.id} style={styles.tripHistoryItem}>
                    <View style={styles.historyIcon}>
                      <Ionicons name="car-outline" size={20} color={Colors.accent} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.historyTitle} numberOfLines={1}>{item.origin} → {item.destination}</Text>
                      <Text style={styles.historyDate}>{formatDate(item.createdAt)} · {item.serviceType === 'standard' ? 'Standard' : item.serviceType === 'premium' ? 'Premium' : 'Taxi'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.historyCost}>${item.estimatedPrice} ARS</Text>
                      <Text style={styles.historyPoints}>+150 Pts</Text>
                    </View>
                  </View>
                ))
              ) : (
                // Fallbacks si no tiene viajes reales
                [
                  { id: 't-1', title: 'Viaje TravelCab - San Javier', cost: 1800, points: 150, date: '12 Jun, 2026' },
                  { id: 't-2', title: 'Viaje TravelCab - Centro', cost: 1200, points: 150, date: '10 Jun, 2026' },
                ].map(item => (
                  <View key={item.id} style={styles.tripHistoryItem}>
                    <View style={styles.historyIcon}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>{item.title}</Text>
                      <Text style={styles.historyDate}>{item.date}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.historyCost}>${item.cost} ARS</Text>
                      <Text style={styles.historyPoints}>+{item.points} Pts</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* MODAL DEL QR BOARDING PASS */}
            {contractedTrip && (
              <Modal
                visible={isQrModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsQrModalVisible(false)}
              >
                <View style={styles.qrModalOverlay}>
                  <View style={styles.qrModalContent}>
                    <View style={styles.qrModalHeader}>
                      <Text style={styles.qrModalTitle}>Boarding Pass</Text>
                      <TouchableOpacity onPress={() => setIsQrModalVisible(false)} style={styles.qrModalCloseBtn}>
                        <Ionicons name="close" size={24} color={Colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.qrModalSubtitle}>Presentá este código QR al coordinador al subir al micro</Text>
                    
                    <View style={styles.qrFrame}>
                      <Image 
                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=trip_checkin:${user.uid}:${contractedTrip.id}` }} 
                        style={styles.qrCodeImg} 
                      />
                    </View>
                    
                    <View style={styles.qrModalTripInfo}>
                      <Text style={styles.qrModalTripDest}>{contractedTrip.destination}</Text>
                      <Text style={styles.qrModalTripDate}><Ionicons name="calendar-outline" size={12} /> {contractedTrip.dates}</Text>
                      <Text style={styles.qrModalPassenger}>Pasajero: {firstName} {user?.displayName ? user.displayName.split(' ').slice(1).join(' ') : ''}</Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.qrModalButton} 
                      onPress={() => setIsQrModalVisible(false)}
                    >
                      <Text style={styles.qrModalButtonText}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        )}

        {/* TABS 3: REWARDS */}
        {activeTab === 'rewards' && (
          <View style={[styles.tabContentContainer, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
            {/* Tarjeta de Puntos */}
            <View style={styles.pointsCard}>
              <Text style={styles.pointsCardLabel}>Balance de Puntos</Text>
              <Text style={styles.pointsCardVal}>{rewardsPoints} Puntos</Text>
              <Text style={styles.pointsCardStatus}>Fidelización Nivel Oro</Text>
            </View>

            {/* Segmented Control de Rewards */}
            <View style={[styles.segmentedControl, { marginBottom: 16 }]}>
              <TouchableOpacity 
                style={[styles.segmentBtn, rewardsSubTab === 'canje' && styles.segmentBtnActive]}
                onPress={() => setRewardsSubTab('canje')}
              >
                <Ionicons name="gift-outline" size={16} color={rewardsSubTab === 'canje' ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.segmentText, rewardsSubTab === 'canje' && styles.segmentTextActive]}>Canje por Puntos</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentBtn, rewardsSubTab === 'beneficios' && styles.segmentBtnActive]}
                onPress={() => setRewardsSubTab('beneficios')}
              >
                <Ionicons name="sparkles-outline" size={16} color={rewardsSubTab === 'beneficios' ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.segmentText, rewardsSubTab === 'beneficios' && styles.segmentTextActive]}>Beneficios Libres</Text>
              </TouchableOpacity>
            </View>

            {rewardsSubTab === 'canje' ? (
              <>
                <Text style={styles.tabHeaderTitle}>Catálogo de Canjes y Promociones</Text>
                <Text style={styles.tabHeaderDesc}>Canjeá tus puntos acumulados por viajes gratis y actividades en TravelApp Experiences.</Text>

                <View style={styles.rewardsCatalogGrid}>
                  {rewardsList.map(item => (
                    <View key={item.id} style={styles.rewardCatalogCard}>
                      <Image source={{ uri: item.imageUrl }} style={styles.rewardItemImg} />
                      <View style={styles.rewardItemBody}>
                        <Text style={styles.rewardItemTitle}>{item.title}</Text>
                        <Text style={styles.rewardItemDesc}>{item.description}</Text>
                        
                        <View style={styles.rewardItemFooter}>
                          <Text style={styles.rewardItemPoints}>{item.points} Pts</Text>
                          <TouchableOpacity 
                            style={[styles.canjearBtn, rewardsPoints < item.points && styles.canjearBtnDisabled]}
                            disabled={rewardsPoints < item.points}
                            onPress={async () => {
                              try {
                                const userRef = doc(db, 'users', user.uid);
                                await updateDoc(userRef, {
                                  rewardsPoints: rewardsPoints - item.points
                                });
                                Alert.alert('¡Canje exitoso!', `Has canjeado "${item.title}". El código de cupón te fue enviado por email.`);
                              } catch (err: any) {
                                Alert.alert('Error', 'No se pudo procesar el canje: ' + err.message);
                              }
                            }}
                          >
                            <Text style={styles.canjearBtnText}>Canjear</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.tabHeaderTitle}>Beneficios Exclusivos Gratuitos</Text>
                <Text style={styles.tabHeaderDesc}>Descargá cupones de beneficios gratis en locales asociados sin consumir tus puntos.</Text>

                <View style={styles.rewardsCatalogGrid}>
                  {[
                    {
                      id: 'ben-cafemartinez',
                      title: '2x1 Cafe Martínez',
                      description: 'Presentá este cupón en sucursales adheridas para obtener un 2x1 en café y muffins.',
                      code: 'BEN_CAFEMARTINEZ_2026',
                      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80'
                    },
                    {
                      id: 'ben-shell',
                      title: '10% Off Shell V-Power',
                      description: 'Descuento los miércoles en cargas de combustibles premium Shell V-Power.',
                      code: 'BEN_SHELL_VPOWER_10',
                      imageUrl: 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=600&auto=format&fit=crop&q=80'
                    },
                    {
                      id: 'ben-posada',
                      title: 'Posada del Silencio late check-out',
                      description: 'Extensión de check-out hasta las 16:00 hs bonificada en tu estadía en Purmamarca.',
                      code: 'BEN_POSADASILENCIO_LATE',
                      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80'
                    }
                  ].map(item => (
                    <View key={item.id} style={styles.rewardCatalogCard}>
                      <Image source={{ uri: item.imageUrl }} style={styles.rewardItemImg} />
                      <View style={styles.rewardItemBody}>
                        <Text style={styles.rewardItemTitle}>{item.title}</Text>
                        <Text style={styles.rewardItemDesc}>{item.description}</Text>
                        
                        <View style={styles.rewardItemFooter}>
                          <Text style={[styles.rewardItemPoints, { color: Colors.success }]}>GRATIS</Text>
                          <TouchableOpacity 
                            style={[styles.canjearBtn, { backgroundColor: Colors.success }]}
                            onPress={() => setSelectedBenefit(item)}
                          >
                            <Text style={styles.canjearBtnText}>Obtener QR</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* MODAL DEL BENEFICIO / CUPÓN QR */}
            {selectedBenefit && (
              <Modal
                visible={!!selectedBenefit}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedBenefit(null)}
              >
                <View style={styles.qrModalOverlay}>
                  <View style={styles.qrModalContent}>
                    <View style={styles.qrModalHeader}>
                      <Text style={styles.qrModalTitle}>Cupón de Beneficio</Text>
                      <TouchableOpacity onPress={() => setSelectedBenefit(null)} style={styles.qrModalCloseBtn}>
                        <Ionicons name="close" size={24} color={Colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.qrModalSubtitle}>Presentá este código QR en el establecimiento para validar el descuento:</Text>
                    
                    <View style={styles.qrFrame}>
                      <Image 
                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=benefit_code:${selectedBenefit.code}:${user.uid}` }} 
                        style={styles.qrCodeImg} 
                      />
                    </View>
                    
                    <View style={styles.qrModalTripInfo}>
                      <Text style={styles.qrModalTripDest}>{selectedBenefit.title}</Text>
                      <Text style={[styles.qrModalTripDate, { color: Colors.success }]}>Código: {selectedBenefit.code}</Text>
                    </View>

                    <TouchableOpacity 
                      style={[styles.qrModalButton, { backgroundColor: Colors.success }]} 
                      onPress={() => setSelectedBenefit(null)}
                    >
                      <Text style={styles.qrModalButtonText}>Entendido</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        )}

        {/* TABS 4: PERFIL */}
        {activeTab === 'profile' && (
          <View style={[styles.tabContentContainer, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
            <Text style={styles.tabHeaderTitle}>Configuración de Cuenta</Text>
            <Text style={styles.tabHeaderDesc}>Actualizá tus datos personales y gestioná tu saldo y servicios.</Text>

            {/* TravelApp Experience button (Fondo blanco, reducido y nítido) */}
            <TouchableOpacity 
              style={styles.experienceBtnProfile}
              onPress={() => Linking.openURL('https://travelapp.ar/experiences')}
            >
              <TravelExperienceLogo size={140} textColor="#0B192C" />
            </TouchableOpacity>

            {/* Billetera TravelPay (Saldo a Favor) */}
            <View style={styles.walletCard}>
              <View style={styles.walletHeaderRow}>
                <View style={styles.walletIconBox}>
                  <Ionicons name="wallet-outline" size={22} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletCardTitle}>Billetera TravelPay</Text>
                  <Text style={styles.walletCardSub}>Saldo a favor recargable</Text>
                </View>
                <View style={styles.walletBalanceBadge}>
                  <Text style={styles.walletBalanceValue}>
                    $ {walletBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
              <View style={styles.walletInfoBox}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.walletInfoText}>
                  Saldo cargado desde Administración. Se aplicará automáticamente para abonar tu próximo viaje.
                </Text>
              </View>
            </View>

            {/* Mercado Pago Wallet Connect Card (Compacta) */}
            <View style={styles.mpWalletCardCompact}>
              <View style={styles.mpWalletHeaderCompact}>
                <View style={styles.mpLogoBox}>
                  <Ionicons name="card-outline" size={18} color="#009EE3" />
                </View>
                <Text style={styles.mpWalletTitleCompact}>Mercado Pago Wallet Connect</Text>
              </View>
              {mpLinked ? (
                <View style={styles.mpWalletBodyCompact}>
                  <View style={styles.mpLinkedBadgeCompact}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={styles.mpLinkedBadgeTextCompact}>Cuenta Vinculada (Débito 1-Clic)</Text>
                  </View>
                  <Text style={styles.mpWalletDescCompact}>Email: {mpLinkedEmail || user.email}</Text>
                  <TouchableOpacity 
                    style={styles.mpUnlinkBtnCompact} 
                    onPress={async () => {
                      try {
                        await setDoc(doc(db, 'users', user.uid), {
                          mpLinked: false,
                          mpPayerToken: null,
                          mpUserEmail: null
                        }, { merge: true });
                        Alert.alert('Desvinculado', 'Tu cuenta de Mercado Pago fue desvinculada con éxito.');
                      } catch {
                        Alert.alert('Error', 'No se pudo desvincular la cuenta.');
                      }
                    }}
                  >
                    <Text style={styles.mpUnlinkBtnTextCompact}>Desvincular Cuenta</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.mpWalletBodyCompact}>
                  <Text style={styles.mpWalletDescCompact}>
                    Vinculá tu cuenta para pagar traslados automáticamente en segundo plano.
                  </Text>
                  <TouchableOpacity style={styles.mpLinkBtnCompact} onPress={handleLinkMercadoPago}>
                    <Ionicons name="logo-usd" size={14} color={Colors.white} />
                    <Text style={styles.mpLinkBtnTextCompact}>Vincular Mercado Pago</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Formulario de Datos Registrados */}
            <View style={styles.profileForm}>
              <Text style={styles.sectionFormTitle}>Datos Registrados</Text>

              {/* Foto de Perfil Editable */}
              <View style={styles.avatarEditContainer}>
                <View style={styles.avatarWrapper}>
                  {userPhotoURL ? (
                    <Image source={{ uri: userPhotoURL }} style={styles.userAvatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={36} color={Colors.primary} />
                    </View>
                  )}
                  <TouchableOpacity style={styles.cameraBadgeBtn} onPress={handlePickProfileImage}>
                    <Ionicons name="camera" size={14} color={Colors.white} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.changePhotoTextBtn} onPress={handlePickProfileImage}>
                  <Text style={styles.changePhotoText}>Cambiar foto de perfil (Cámara o Galería)</Text>
                </TouchableOpacity>
              </View>

              {/* Nombre y Apellido (No Editable) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre y Apellido (Registrado)</Text>
                <TextInput 
                  style={[styles.formInput, { backgroundColor: '#ECEFF1', color: '#64748B' }]} 
                  value={user.displayName || 'Pasajero'} 
                  editable={false} 
                />
              </View>

              {/* Email Registrado (No Editable) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo Electrónico (Registrado)</Text>
                <TextInput 
                  style={[styles.formInput, { backgroundColor: '#ECEFF1', color: '#64748B' }]} 
                  value={user.email || 'Email'} 
                  editable={false} 
                />
              </View>

              {/* Nº de Teléfono / WhatsApp (Editable) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nº de Teléfono / WhatsApp (Editable)</Text>
                <View style={styles.phoneInputRow}>
                  <TextInput 
                    style={[styles.formInput, { flex: 1 }]} 
                    value={userPhone} 
                    onChangeText={setUserPhone}
                    placeholder="+54 9 11 1234 5678"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity 
                    style={styles.savePhoneBtn} 
                    onPress={handleSavePhone}
                    disabled={isSavingPhone}
                  >
                    {isSavingPhone ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.savePhoneBtnText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón para abrir la Ficha de Cliente */}
              <TouchableOpacity 
                style={[styles.dossierLaunchBtn, { backgroundColor: '#0A2A5B', paddingHorizontal: 14, justifyContent: 'space-between' }]}
                onPress={() => navigation.navigate('CompleteProfile')}
                activeOpacity={0.85}
              >
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,122,0,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person-circle-outline" size={24} color="#FF7A00" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.dossierLaunchBtnText, { textAlign: 'left', fontSize: 14 }]}>Ficha de Cliente</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontFamily: Fonts.medium }}>
                    DNI, Pasaporte, Grupo Familiar y AFIP
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>

              {/* Botón Atención al Cliente */}
              <TouchableOpacity 
                style={[styles.dossierLaunchBtn, { backgroundColor: '#0A2A5B', paddingHorizontal: 14, justifyContent: 'space-between' }]}
                onPress={() => setSupportModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(2,132,199,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="headset-outline" size={22} color="#38BDF8" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.dossierLaunchBtnText, { textAlign: 'left', fontSize: 14 }]}>Atención al Cliente 24/7</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontFamily: Fonts.medium }}>
                    Teléfono 0810-220-0018 · WhatsApp · Email
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>

              {/* Botón Centro de Seguridad */}
              <TouchableOpacity 
                style={[styles.dossierLaunchBtn, { backgroundColor: '#0A2A5B', paddingHorizontal: 14, justifyContent: 'space-between' }]}
                onPress={() => setSafetyModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#F87171" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.dossierLaunchBtnText, { textAlign: 'left', fontSize: 14 }]}>Centro de Seguridad & SOS</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontFamily: Fonts.medium }}>
                    Grabación de Audio · 911 · PIN de Viaje
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>

              {/* Cerrar Sesión */}
              <TouchableOpacity style={styles.logoutBtn} onPress={() => auth.signOut()}>
                <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL DE CHAT EN VIVO CON CONDUCTOR (MONITOREADO POR CONCORDE 360) */}
      <Modal
        visible={isChatModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsChatModalVisible(false)}
      >
        <View style={styles.chatModalContainer}>
          {/* Header del Chat */}
          <View style={[styles.chatModalHeader, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
            <TouchableOpacity style={styles.chatCloseBtn} onPress={() => setIsChatModalVisible(false)}>
              <Ionicons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.chatHeaderName}>
                {driverDetails ? formatDriverName(driverDetails.name) : 'Conductor Asignado'}
              </Text>
              <Text style={styles.chatHeaderSub}>Monitoreado en tiempo real por Concorde 360</Text>
            </View>
            <View style={styles.concordeBadge}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
            </View>
          </View>

          {/* Mensajes */}
          <ScrollView style={styles.chatMessagesScroll} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {chatMessages.length > 0 ? (
              chatMessages.map(msg => {
                const isMe = msg.senderId === user?.uid || msg.senderRole === 'passenger';
                const isAdmin = msg.senderRole === 'admin';
                return (
                  <View 
                    key={msg.id} 
                    style={[
                      styles.liveChatBubble,
                      isMe ? styles.liveChatBubbleMe : isAdmin ? styles.liveChatBubbleAdmin : styles.liveChatBubbleDriver
                    ]}
                  >
                    <Text style={[styles.chatSenderLabel, isMe && { color: 'rgba(255,255,255,0.8)' }]}>
                      {isAdmin ? '🛡️ Central Concorde 360' : msg.senderName || (isMe ? 'Vos' : 'Conductor')}
                    </Text>
                    <Text style={[styles.liveChatBubbleText, isMe && { color: Colors.white }]}>{msg.text}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyChatBox}>
                <Ionicons name="chatbubbles-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyChatText}>Iniciá la conversación con {driverDetails ? formatDriverName(driverDetails.name) : 'el conductor'}</Text>
                <Text style={styles.emptyChatSub}>Los mensajes son monitoreados desde el panel de control Concorde 360.</Text>
              </View>
            )}
          </ScrollView>

          {/* Input para enviar mensaje */}
          <View style={[styles.chatInputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 16 }]}>
            <TextInput
              style={styles.chatTextInput}
              value={chatInputText}
              onChangeText={setChatInputText}
              placeholder="Escribí un mensaje..."
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity 
              style={[styles.liveChatSendBtn, !chatInputText.trim() && { backgroundColor: Colors.border }]} 
              onPress={handleSendMessage}
              disabled={!chatInputText.trim() || isSendingMessage}
            >
              {isSendingMessage ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="send" size={18} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ATENCIÓN AL CLIENTE 24/7 */}
      <Modal
        visible={supportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.supportModalOverlay}>
          <View style={styles.supportModalContent}>
            <View style={styles.supportModalHeader}>
              <View style={styles.modalIconBadge}>
                <Ionicons name="headset" size={26} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportModalTitle}>Atención al Cliente</Text>
                <Text style={styles.supportModalSubtitle}>Estamos disponibles 24/7 para asistirte</Text>
              </View>
              <TouchableOpacity onPress={() => setSupportModalVisible(false)} style={styles.supportModalCloseBtn}>
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

      {/* MODAL VINCULACIÓN CON CONDUCTOR (CÁMARA QR / CÓDIGO) */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.qrPassengerModalOverlay}>
          <View style={styles.qrPassengerModalCard}>
            {/* Encabezado */}
            <View style={styles.qrPassengerModalHeader}>
              <View style={styles.qrPassengerIconBox}>
                <Ionicons name={qrScannerMode === 'camera' ? 'camera' : 'qr-code'} size={24} color="#0284C7" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.qrPassengerModalTitle}>Escanear QR del Conductor</Text>
                <Text style={styles.qrPassengerModalSubtitle}>
                  {requestFlowStep === 'pricing'
                    ? 'Asigna tu viaje cotizado directamente a este chofer'
                    : 'Modo Taxímetro Digital (Subida directa)'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setQrModalVisible(false)}
                style={styles.qrPassengerCloseBtn}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Pestañas de Selección: Cámara vs Manual */}
            <View style={styles.qrModeSelectorRow}>
              <TouchableOpacity
                style={[styles.qrModeTabBtn, qrScannerMode === 'camera' && styles.qrModeTabBtnActive]}
                onPress={() => setQrScannerMode('camera')}
              >
                <Ionicons
                  name="camera"
                  size={16}
                  color={qrScannerMode === 'camera' ? '#FFFFFF' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.qrModeTabBtnText, qrScannerMode === 'camera' && styles.qrModeTabBtnTextActive]}>
                  Cámara QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.qrModeTabBtn, qrScannerMode === 'manual' && styles.qrModeTabBtnActive]}
                onPress={() => setQrScannerMode('manual')}
              >
                <Ionicons
                  name="keypad-outline"
                  size={16}
                  color={qrScannerMode === 'manual' ? '#FFFFFF' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.qrModeTabBtnText, qrScannerMode === 'manual' && styles.qrModeTabBtnTextActive]}>
                  Ingreso Manual
                </Text>
              </TouchableOpacity>
            </View>

            {qrScannerMode === 'camera' ? (
              /* VISTA DE CÁMARA QR */
              <View style={styles.qrCameraContainer}>
                {isLinkingDriver ? (
                  <View style={styles.qrCameraLoadingOverlay}>
                    <ActivityIndicator size="large" color="#0284C7" />
                    <Text style={styles.qrCameraLoadingText}>Vinculando con chofer...</Text>
                  </View>
                ) : (
                  <WebView
                    style={styles.qrCameraWebView}
                    originWhitelist={['*']}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    source={{
                      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html { width: 100%; height: 100%; background: #0B192C; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #video-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #000; }
    video { width: 100%; height: 100%; object-fit: cover; }
    .overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 16px 12px; pointer-events: none; }
    .target-box {
      position: relative;
      width: 210px;
      height: 210px;
      border-radius: 20px;
      box-shadow: 0 0 0 4000px rgba(11, 25, 44, 0.65);
      overflow: hidden;
    }
    .corner { position: absolute; width: 22px; height: 22px; border-color: #38BDF8; border-style: solid; border-width: 0; }
    .tl { top: 0; left: 0; border-top-width: 4px; border-left-width: 4px; border-top-left-radius: 16px; }
    .tr { top: 0; right: 0; border-top-width: 4px; border-right-width: 4px; border-top-right-radius: 16px; }
    .bl { bottom: 0; left: 0; border-bottom-width: 4px; border-left-width: 4px; border-bottom-left-radius: 16px; }
    .br { bottom: 0; right: 0; border-bottom-width: 4px; border-right-width: 4px; border-bottom-right-radius: 16px; }
    .scan-bar {
      position: absolute;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, rgba(56,189,248,0) 0%, #38BDF8 50%, rgba(56,189,248,0) 100%);
      box-shadow: 0 0 10px #38BDF8;
      top: 0;
      animation: scanAnim 2s ease-in-out infinite alternate;
    }
    @keyframes scanAnim {
      0% { top: 8%; opacity: 0.3; }
      50% { opacity: 1; }
      100% { top: 92%; opacity: 0.3; }
    }
    .instructions {
      color: #FFF;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      background: rgba(15, 23, 42, 0.85);
      padding: 6px 14px;
      border-radius: 16px;
      letter-spacing: 0.3px;
      border: 1px solid rgba(56,189,248,0.3);
    }
    #error-msg {
      color: #FCA5A5;
      font-size: 11px;
      text-align: center;
      background: rgba(185, 28, 28, 0.8);
      padding: 6px 10px;
      border-radius: 10px;
      display: none;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
</head>
<body>
  <div id="video-container">
    <video id="webcam" playsinline autoplay muted></video>
    <canvas id="scan-canvas" style="display:none;"></canvas>
    <div class="overlay">
      <div class="instructions">📷 Enfocá el QR en la ventanilla</div>
      <div class="target-box">
        <div class="corner tl"></div>
        <div class="corner tr"></div>
        <div class="corner bl"></div>
        <div class="corner br"></div>
        <div class="scan-bar"></div>
      </div>
      <div id="error-msg">Permiso de cámara no concedido. Tocá "Ingreso Manual"</div>
    </div>
  </div>
  <script>
    var video = document.getElementById('webcam');
    var canvas = document.getElementById('scan-canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var isScanning = true;

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
    }).then(function(stream) {
      video.srcObject = stream;
      video.setAttribute('playsinline', true);
      video.play();
      requestAnimationFrame(tick);
    }).catch(function(err) {
      document.getElementById('error-msg').style.display = 'block';
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CAMERA_ERROR', error: err.message }));
      }
    });

    function tick() {
      if (!isScanning) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (window.jsQR) {
          var code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code && code.data) {
            isScanning = false;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'QR_SCANNED', data: code.data }));
            }
            return;
          }
        }
      }
      requestAnimationFrame(tick);
    }
  </script>
</body>
</html>`
                    }}
                    onMessage={(event) => {
                      try {
                        const parsed = JSON.parse(event.nativeEvent.data);
                        if (parsed.type === 'QR_SCANNED' && parsed.data) {
                          try { Vibration.vibrate(150); } catch (_) {}
                          handleLinkDriver(parsed.data);
                        } else if (parsed.type === 'CAMERA_ERROR') {
                          setQrScannerMode('manual');
                        }
                      } catch (e) {
                        console.log('WebView QR Parse error:', e);
                      }
                    }}
                  />
                )}
                <View style={styles.qrCameraFooterHint}>
                  <Text style={styles.qrCameraFooterHintText}>
                    El escaneo se procesa en tiempo real al detectar el cartel
                  </Text>
                </View>
              </View>
            ) : (
              /* VISTA DE INGRESO MANUAL */
              <View style={{ width: '100%' }}>
                {/* Cuadro de Instrucción */}
                <View style={styles.qrInstructionCard}>
                  <Ionicons name="information-circle-outline" size={20} color="#0284C7" style={{ marginRight: 8 }} />
                  <Text style={styles.qrInstructionCardText}>
                    Ingresá la patente o el código que figura en el cartel de la ventanilla del vehículo.
                  </Text>
                </View>

                {/* Input de Código / Patente */}
                <View style={{ width: '100%', marginBottom: 16 }}>
                  <Text style={styles.qrInputLabel}>Patente o Código del Conductor</Text>
                  <TextInput
                    style={styles.qrCodeTextInput}
                    placeholder="Ej: AF 123 JK o TAXI-102"
                    placeholderTextColor="#94A3B8"
                    value={driverCodeInput}
                    onChangeText={setDriverCodeInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>

                {/* Botón de Acción */}
                <TouchableOpacity
                  style={[styles.qrSubmitBtn, isLinkingDriver && { opacity: 0.7 }]}
                  onPress={() => handleLinkDriver()}
                  disabled={isLinkingDriver}
                  activeOpacity={0.85}
                >
                  {isLinkingDriver ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="link" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.qrSubmitBtnText}>
                        {requestFlowStep === 'pricing' ? 'Confirmar y Asignar Viaje' : 'Iniciar Taxímetro Digital'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.qrCancelBtn}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.qrCancelBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CENTRO DE SEGURIDAD & SOS */}
      <Modal
        visible={safetyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSafetyModalVisible(false)}
      >
        <View style={styles.supportModalOverlay}>
          <View style={styles.supportModalContent}>
            <View style={styles.supportModalHeader}>
              <View style={[styles.modalIconBadge, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="shield-checkmark" size={26} color={Colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportModalTitle}>Centro de Seguridad</Text>
                <Text style={styles.supportModalSubtitle}>Herramientas de protección en todo momento</Text>
              </View>
              <TouchableOpacity onPress={() => setSafetyModalVisible(false)} style={styles.supportModalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.safetyInfoCard}>
              <View style={styles.safetyInfoRow}>
                <Ionicons name="mic-circle" size={24} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.safetyInfoTitle}>Grabación de Audio en Cabina</Text>
                  <Text style={styles.safetyInfoDesc}>Durante cualquier viaje activo podés activar el micrófono para respaldar el audio del recorrido con encriptación segura.</Text>
                </View>
              </View>

              <View style={styles.safetyInfoRow}>
                <Ionicons name="keypad" size={24} color={Colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.safetyInfoTitle}>Código PIN Anti-Impostores</Text>
                  <Text style={styles.safetyInfoDesc}>Tu app genera un código de 4 dígitos para que el chofer verifique tu identidad antes de arrancar.</Text>
                </View>
              </View>

              <View style={styles.safetyInfoRow}>
                <Ionicons name="share-social" size={24} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.safetyInfoTitle}>Seguimiento en Vivo por WhatsApp</Text>
                  <Text style={styles.safetyInfoDesc}>Compartí tu recorrido en tiempo real con familiares para que sigan el auto en el mapa desde cualquier navegador.</Text>
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

      {/* FOOTER NAVIGATION BAR */}
      {requestFlowStep !== 'active' && (
        <View style={[styles.footerTabs, { height: 64 + insets.bottom, paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
          {[
            { id: 'home', label: 'Inicio', icon: 'map-outline' },
            { id: 'experience', label: 'Experiences', icon: 'compass-outline' },
            { id: 'trips', label: 'Mis viajes', icon: 'time-outline' },
            { id: 'rewards', label: 'Rewards', icon: 'star-outline' },
            { id: 'profile', label: 'Perfil', icon: 'person-outline' },
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity 
                key={tab.id} 
                style={styles.tabBtn}
                onPress={() => {
                  setRequestFlowStep('idle'); // Reiniciar a idle si cambia
                  setActiveTab(tab.id as any);
                }}
              >
                <Ionicons name={getSafeIoniconsName(tab.icon, 'map-outline')} size={22} color={isSelected ? Colors.accent : '#94A3B8'} />
                <Text style={[styles.tabLabel, isSelected && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  )}

      {/* Date Selector Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.canvaModalOverlay}>
          <View style={styles.canvaPickerCard}>
            <Text style={styles.canvaPickerTitle}>Seleccionar Fecha</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {getNext10Days().map((day, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.canvaPickerOption}
                  onPress={() => {
                    setScheduleDate(day);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.canvaPickerOptionText}>{day}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.canvaPickerCloseBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.canvaPickerCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Selector Modal */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.canvaModalOverlay}>
          <View style={styles.canvaPickerCard}>
            <Text style={styles.canvaPickerTitle}>Seleccionar Hora</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {Array.from({ length: 24 }).map((_, hour) => {
                const hh = hour.toString().padStart(2, '0');
                return ['00', '15', '30', '45'].map(minute => {
                  const timeString = `${hh}:${minute}`;
                  return (
                    <TouchableOpacity 
                      key={timeString} 
                      style={styles.canvaPickerOption}
                      onPress={() => {
                        setScheduleTime(timeString);
                        setShowTimePicker(false);
                      }}
                    >
                      <Text style={styles.canvaPickerOptionText}>{timeString} hs</Text>
                    </TouchableOpacity>
                  );
                });
              })}
            </ScrollView>
            <TouchableOpacity style={styles.canvaPickerCloseBtn} onPress={() => setShowTimePicker(false)}>
              <Text style={styles.canvaPickerCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE FICHA DE RESERVA */}
      <Modal
        visible={isDossierModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDossierModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text" size={24} color={Colors.primary} />
              <Text style={styles.modalTitle}>Ficha de Reserva</Text>
            </View>
            <Text style={styles.modalSubtitle}>Completá tus datos médicos y de emergencia obligatorios para viajar con TravelApp Experience.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300, width: '100%', marginBottom: 16 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DNI o Pasaporte</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Ej. DNI 35.123.456" 
                  value={passport}
                  onChangeText={setPassport}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contacto de Emergencia (Nombre y Nro)</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Ej. María Gómez (+549...)" 
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notas Médicas / Alergias (Opcional)</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Ej. Alergia a la penicilina, asma." 
                  value={medicalNotes}
                  onChangeText={setMedicalNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsDossierModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveProfileBtn, { flex: 1, marginTop: 0 }]} 
                onPress={async () => {
                  await handleSaveProfile();
                  setIsDossierModalVisible(false);
                }}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.saveProfileText}>Guardar Ficha</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE BÚSQUEDA DE CHOFER */}
      <Modal
        visible={requestFlowStep === 'searching'}
        transparent
        animationType="fade"
      >
        <View style={styles.searchingOverlay}>
          <View style={styles.searchingBox}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.searchingTitle}>Buscando tu conductor...</Text>
            <Text style={styles.searchingDesc}>Analizando choferes y tarifas activas en tu zona. Aguarda un momento.</Text>
            <TouchableOpacity style={styles.cancelSearchBtn} onPress={cancelSearch}>
              <Text style={styles.cancelSearchText}>Cancelar Búsqueda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE VIAJE FINALIZADO Y PUNTOS ACUMULADOS */}
      <Modal
        visible={tripCompletedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTripCompletedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center', padding: 30 }]}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245, 158, 11, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name="gift" size={45} color="#F59E0B" />
            </View>
            
            <Text style={[styles.modalTitle, { textAlign: 'center', fontSize: 24, marginBottom: 8 }]}>¡Viaje Finalizado!</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              Tu pago fue procesado con éxito. ¡Gracias por confiar en TravelCab!
            </Text>

            <View style={{ backgroundColor: Colors.background, borderRadius: 16, padding: 16, width: '100%', alignItems: 'center', marginBottom: 24, borderWidth: 1.5, borderColor: '#FFE082' }}>
              <Text style={{ fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>PUNTOS ACUMULADOS</Text>
              <Text style={{ fontSize: 32, fontFamily: 'Quicksand-Bold', color: '#F59E0B' }}>+{earnedPoints} PTS</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Quicksand-Medium', color: Colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                Sumados automáticamente a tu billetera Rewards
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.confirmBtn, { width: '100%', marginTop: 0 }]} 
              onPress={() => setTripCompletedModalVisible(false)}
            >
              <Text style={styles.confirmBtnText}>¡Excelente!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE AGENDAR VIAJE */}
      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="time" size={24} color={Colors.accent} />
              <Text style={styles.modalTitle}>Agendar Viaje</Text>
            </View>
            <Text style={styles.modalSubtitle}>Ingresá los datos para programar tu conductor.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fecha (DD/MM/AAAA)</Text>
              <TextInput 
                style={styles.formInput} 
                placeholder="Ej. 25/06/2026" 
                value={scheduleDate}
                onChangeText={setScheduleDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hora (HH:MM)</Text>
              <TextInput 
                style={styles.formInput} 
                placeholder="Ej. 18:30" 
                value={scheduleTime}
                onChangeText={setScheduleTime}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setScheduleModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleScheduleTrip}>
                <Text style={styles.confirmBtnText}>Programar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CHECKOUT NAVE - BANCO GALICIA */}
      <Modal
        visible={isGaliciaPaying && selectedExcursion !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setIsGaliciaPaying(false)}
      >
        <View style={styles.galiciaModalOverlay}>
          <View style={styles.galiciaCheckoutCard}>
            <View style={styles.galiciaHeader}>
              <View style={styles.galiciaLogoCol}>
                <View style={styles.galiciaLogoCircle}>
                  <Text style={styles.galiciaLogoText}>G</Text>
                </View>
                <Text style={styles.galiciaTitle}>Nave Banco Galicia</Text>
              </View>
              <TouchableOpacity onPress={() => setIsGaliciaPaying(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedExcursion && (
              <View style={styles.galiciaSummaryCard}>
                <View style={styles.galiciaSummaryRow}>
                  <Text style={styles.galiciaSummaryLabel}>Concepto:</Text>
                  <Text style={styles.galiciaSummaryVal}>{selectedExcursion.title}</Text>
                </View>
                <View style={styles.galiciaSummaryRow}>
                  <Text style={styles.galiciaSummaryLabel}>Importe:</Text>
                  <Text style={[styles.galiciaSummaryVal, { color: Colors.success }]}>U$S {selectedExcursion.price}</Text>
                </View>
                <View style={styles.galiciaSummaryRow}>
                  <Text style={styles.galiciaSummaryLabel}>Conversión Aprox:</Text>
                  <Text style={styles.galiciaSummaryVal}>${(selectedExcursion.price * 1000).toLocaleString('es-AR')} ARS</Text>
                </View>
                <View style={styles.galiciaNaveBadge}>
                  <Ionicons name="sparkles" size={12} color="#0369A1" />
                  <Text style={styles.galiciaNaveBadgeText}>3 Cuotas Sin Interés con Galicia</Text>
                </View>
              </View>
            )}

            <Text style={styles.label}>Elegí tu medio de pago:</Text>
            <View style={styles.galiciaPaymentOptions}>
              <TouchableOpacity style={[styles.galiciaOpt, styles.galiciaOptActive]}>
                <Ionicons name="card" size={18} color="#FF6B00" />
                <Text style={styles.galiciaOptText}>Tarjeta Galicia Débito Visa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.galiciaOpt}>
                <Ionicons name="logo-usd" size={18} color={Colors.textSecondary} />
                <Text style={styles.galiciaOptText}>Dinero en cuenta Nave Galicia</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.galiciaConfirmBtn}
              onPress={handleConfirmGaliciaPayment}
              disabled={isGaliciaPaying && selectedExcursion === null}
            >
              <Text style={styles.galiciaConfirmText}>Confirmar Pago Seguro</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.galiciaCancelBtn}
              onPress={() => setIsGaliciaPaying(false)}
            >
              <Text style={styles.galiciaCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ÉXITO DE PAGO GALICIA */}
      <Modal
        visible={paymentSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentSuccessModal(false)}
      >
        <View style={styles.searchingOverlay}>
          <View style={styles.searchingBox}>
            <Ionicons name="checkmark-circle" size={54} color={Colors.success} />
            <Text style={styles.searchingTitle}>¡Pago Aprobado!</Text>
            <Text style={styles.searchingDesc}>
              El cobro de tu excursión fue procesado con éxito a través de Nave Banco Galicia. Tu voucher digital ya está activo.
            </Text>
            <TouchableOpacity 
              style={[styles.cancelSearchBtn, { borderColor: Colors.success, marginTop: 12 }]} 
              onPress={() => setPaymentSuccessModal(false)}
            >
              <Text style={[styles.cancelSearchText, { color: Colors.success }]}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NOTIFICACIÓN OVERLAY FLOTANTE */}
      {overlayMessage && (
        <Animated.View style={[styles.overlayBanner, { transform: [{ translateY: overlayAnim }] }]}>
          <View style={styles.overlayIconBox}>
            <Ionicons name="notifications" size={20} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overlayTitle}>Notificación de Viaje</Text>
            <Text style={styles.overlayText} numberOfLines={2}>{overlayMessage}</Text>
          </View>
          <TouchableOpacity onPress={() => {
            Animated.timing(overlayAnim, {
              toValue: -100,
              duration: 250,
              useNativeDriver: true
            }).start(() => setOverlayMessage(null));
          }}>
            <Ionicons name="close" size={20} color={Colors.white} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  mapContainer: { ...StyleSheet.absoluteFill, zIndex: 1 },
  map: { flex: 1, width: '100%', height: '100%', backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 14, fontFamily: 'Quicksand-Medium' },
  markerPin: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  
  // Header principal flotante
  topBar: {
    position: 'absolute', top: 56, left: 16, right: 16,
    zIndex: 10, gap: 12,
  },
  brandingRow: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderRadius: 24, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 5,
  },
  serviceSelector: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 24, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 5,
  },
  selectorOpt: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 20 },
  selectorOptActive: { backgroundColor: Colors.primary },
  selectorOptText: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  selectorOptTextActive: { color: Colors.white },

  // Scroll Content principal
  mainScroll: { flex: 1, zIndex: 2 },
  mainScrollContent: { flexGrow: 1, paddingBottom: 100 },
  mainScrollContentHomeMap: { flexGrow: 1, paddingBottom: 0, justifyContent: 'flex-end' },
  webMapPlaceholder: { flex: 1, backgroundColor: '#071A3C', justifyContent: 'center', alignItems: 'center', minHeight: 250 },
  webMapGrid: { ...StyleSheet.absoluteFill },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.15)' },
  simulatedCar: { position: 'absolute', width: 50, height: 35, justifyContent: 'center', alignItems: 'center' },
  whiteCarBubblePin: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.accent,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 6,
  },
  vectorMapBackgroundLight: { ...StyleSheet.absoluteFill, backgroundColor: '#EAEFF5', overflow: 'hidden' },
  mapCityBlock: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#DCE4EE' },
  mapParkZone: { position: 'absolute', backgroundColor: '#D8F3DC', borderRadius: 10, borderWidth: 1, borderColor: '#B7E4C7' },
  gridLineLight: { position: 'absolute', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  vectorRouteLineBold: { flex: 1, height: 4, backgroundColor: Colors.accent, marginHorizontal: 4, borderRadius: 2 },
  routeCarCenterPin: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.accent,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 5,
  },
  vectorMapHeaderBadgeLight: {
    position: 'absolute', top: 12, left: 16, right: 16,
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, elevation: 6
  },
  vectorMapBadgeTextLight: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Quicksand-Bold', flex: 1 },
  vectorRouteContainer: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 50 },
  vectorRouteLine: { flex: 1, height: 4, backgroundColor: Colors.accent, marginHorizontal: 8, borderRadius: 2 },
  webMapText: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: 'rgba(255,255,255,0.4)', zIndex: 5 },
  webSimulatedRouteContainer: { position: 'absolute', top: '50%', left: '15%', right: '15%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  simulatedMarker: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  simulatedMarkerText: { color: Colors.white, fontSize: 9, fontFamily: 'Quicksand-Bold' },
  simulatedRouteLine: { flex: 1, height: 2, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.accent },

  // Contenido de cada pestaña
  tabContentContainer: { padding: 20, gap: 20 },
  tabHeaderTitle: { fontSize: 22, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  tabHeaderDesc: { fontSize: 13, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 18 },

  // Estilos Canva Redesign
  canvaHeader: { paddingHorizontal: 20, paddingBottom: 16, alignItems: 'center', gap: 10 },
  canvaLogoRow: { alignItems: 'center', justifyContent: 'center' },
  canvaUserGreetingBox: { alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' },
  canvaUserGreetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' },
  canvaUserAvatarCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  canvaGreetingText: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.white },
  canvaPointsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  canvaPointsVal: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.accent },
  canvaPointsLabel: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: 'rgba(255, 255, 255, 0.9)' },
  
  canvaTabsRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 20, padding: 3, marginBottom: 8 },
  canvaTabOpt: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 18 },
  canvaTabOptActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  canvaTabOptText: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: '#718096' },
  canvaTabOptTextActive: { color: '#0A2A5B' },
  
  canvaCardTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: '#0A2A5B', marginBottom: 12, textAlign: 'center' },
  canvaInputLabel: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: '#718096', marginLeft: 4 },
  canvaInputField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 24, paddingHorizontal: 16, height: 44, marginTop: 4, marginBottom: 8 },
  canvaTextInput: { flex: 1, fontSize: 13, fontFamily: 'Quicksand-Bold', color: '#0A2A5B', padding: 0 },
  
  canvaPaymentTitle: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: '#718096', marginTop: 10, marginBottom: 6, textAlign: 'center' },
  canvaPaymentBox: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  canvaPaymentCol: { flex: 1, alignItems: 'center', gap: 4 },
  canvaPaymentColLabel: { fontSize: 10, fontFamily: 'Quicksand-Bold', color: '#718096', textAlign: 'center' },
  canvaPaymentBlock: { width: '100%', height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
  
  canvaPaymentCompactBar: { flexDirection: 'row', gap: 6, justifyContent: 'space-between', marginBottom: 12 },
  canvaPaymentCompactItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 20 },
  canvaPaymentCompactLabel: { fontSize: 11, fontFamily: 'Quicksand-Medium', color: '#475569' },

  canvaCalcularBtn: { backgroundColor: '#FF7A00', borderRadius: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#FF7A00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  canvaCalcularBtnText: { color: Colors.white, fontSize: 16, fontFamily: 'Quicksand-Bold' },
  
  canvaSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 12, marginBottom: 8 },
  canvaSectionTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.white },
  canvaSectionVerMas: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: '#FF7A00' },
  canvaCarouselContent: { gap: 12, paddingHorizontal: 20, paddingRight: 30 },
  canvaCarouselCard: { width: 140, backgroundColor: '#071A3C', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1E293B' },
  canvaCarouselCardImg: { width: '100%', height: 80, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  canvaCarouselCardBody: { padding: 8, gap: 2 },
  canvaCarouselCardTitle: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.white },
  canvaCarouselCardDesc: { fontSize: 9, fontFamily: 'Quicksand-Regular', color: '#94A3B8', lineHeight: 12 },
  canvaCarouselCardPlaceholder: { width: 140, height: 130, backgroundColor: '#071A3C', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B' },
  
  canvaPricingTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', fontWeight: '800', color: Colors.white, marginBottom: 14, textAlign: 'center' },
  canvaCategoryBtn: { flexDirection: 'column', alignItems: 'center', backgroundColor: '#FF7A00', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 3, marginBottom: 10 },
  canvaCategoryBtnActive: { borderWidth: 2.5, borderColor: '#0A2A5B', backgroundColor: '#FF6B00' },
  canvaCategoryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 },
  canvaCategoryName: { fontSize: 15, fontFamily: 'Quicksand-Bold', fontWeight: '800', color: Colors.white },
  canvaCategoryPrice: { fontSize: 17, fontFamily: 'Quicksand-Bold', fontWeight: '800', color: Colors.white },
  canvaCarImageContainer: { width: '100%', height: 75, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  canvaCarImage: { width: '100%', height: '100%' },
  canvaEtaBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
  canvaEtaText: { fontSize: 10, fontFamily: 'Quicksand-Bold', color: Colors.white },
  canvaCategoryFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 4, marginTop: 2 },
  canvaCategoryDesc: { fontSize: 11, fontFamily: 'Quicksand-Medium', color: 'rgba(255,255,255,0.9)', flex: 1, marginRight: 8 },
  categoryIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  
  canvaAgendaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FF7A00', borderRadius: 12, paddingVertical: 10, marginTop: 12 },
  canvaAgendaBtnText: { color: '#FF7A00', fontSize: 13, fontFamily: 'Quicksand-Bold' },
  
  canvaBackBtn: { flex: 1, borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  canvaBackBtnText: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: '#475569' },
  canvaConfirmBtn: { flex: 2, backgroundColor: '#0A2A5B', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  canvaConfirmBtnText: { color: Colors.white, fontSize: 13, fontFamily: 'Quicksand-Bold' },
  
  canvaModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  canvaPickerCard: { width: '100%', maxWidth: 300, backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 12 },
  canvaPickerTitle: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: '#0A2A5B', textAlign: 'center', marginBottom: 4 },
  canvaPickerOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center' },
  canvaPickerOptionText: { fontSize: 14, fontFamily: 'Quicksand-Medium', color: '#334155' },
  canvaPickerCloseBtn: { paddingVertical: 12, marginTop: 8, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8 },
  canvaPickerCloseText: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: '#64748B' },

  // Tarjeta de reserva (Inicio)
  bookingCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 16, zIndex: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  bookingCardTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  inputsBox: {
    backgroundColor: Colors.background, borderRadius: 16, padding: 12, gap: 10,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  inputField: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  textInput: { flex: 1, fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary, padding: 0 },
  inputDivider: { height: 1.5, backgroundColor: Colors.border, marginHorizontal: 4 },
  
  // Botones de acción formulario
  actionRow: { flexDirection: 'row', gap: 12 },
  scheduleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.accent, borderRadius: 14, paddingVertical: 14,
  },
  scheduledBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  scheduleBtnText: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.accent },
  scheduledTextActive: { color: Colors.white },
  requestBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14,
  },
  requestBtnText: { color: Colors.white, fontSize: 14, fontFamily: 'Quicksand-Bold' },

  // CMS carrusel promocional
  cmsContainer: { marginTop: 8, gap: 14 },
  cmsBlock: { gap: 10 },
  cmsBlockTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  cmsCarousel: { gap: 12, paddingRight: 20 },
  cmsCard: {
    width: 250, backgroundColor: Colors.white, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  cmsCardImg: { width: '100%', height: 110 },
  cmsCardBody: { padding: 12, gap: 4 },
  cmsCardTitle: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  cmsCardDesc: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 15 },

  // Pestaña: Historial de Viajes
  tripsList: { gap: 12 },
  tripHistoryItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, padding: 16, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  historyIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.success + '10', alignItems: 'center', justifyContent: 'center' },
  historyTitle: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  historyDate: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textMuted, marginTop: 2 },
  historyCost: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  historyPoints: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.success, marginTop: 2 },

  // Pestaña: Rewards
  pointsCard: {
    backgroundColor: Colors.primary, borderRadius: 24, padding: 24, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, elevation: 5,
  },
  pointsCardLabel: { fontSize: 13, fontFamily: 'Quicksand-Medium', color: 'rgba(255,255,255,0.7)' },
  pointsCardVal: { fontSize: 32, fontFamily: 'Quicksand-Bold', color: Colors.white },
  pointsCardStatus: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.accent, marginTop: 4 },
  rewardsCatalogGrid: { gap: 14 },
  rewardCatalogCard: {
    backgroundColor: Colors.white, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  rewardItemImg: { width: '100%', height: 140 },
  rewardItemBody: { padding: 16, gap: 6 },
  rewardItemTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  rewardItemDesc: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 16 },
  rewardItemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  rewardItemPoints: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.success },
  canjearBtn: { backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  canjearBtnDisabled: { backgroundColor: Colors.border },
  canjearBtnText: { color: Colors.white, fontSize: 13, fontFamily: 'Quicksand-Bold' },

  // Pestaña: Perfil
  experienceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0A2A5B', paddingVertical: 10, borderRadius: 14,
  },
  experienceBtnText: { color: Colors.white, fontSize: 14, fontFamily: 'Quicksand-Bold' },
  dossierLaunchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0A2A5B', paddingVertical: 14, borderRadius: 12, marginTop: 8,
  },
  dossierLaunchBtnText: { color: Colors.white, fontSize: 14, fontFamily: 'Quicksand-Bold' },
  profileForm: { gap: 14 },
  extendedProfileTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.primary, marginTop: 12 },
  saveProfileBtn: {
    backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  saveProfileText: { color: Colors.white, fontSize: 14, fontFamily: 'Quicksand-Bold' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 12, paddingVertical: 14, marginTop: 14,
  },
  logoutBtnText: { color: Colors.danger, fontSize: 14, fontFamily: 'Quicksand-Bold' },

  // Marcador de auto conductor en mapa
  driverCarMarker: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.white,
  },

  // Flujo: Pricing y Fares
  pricingOverlay: { paddingHorizontal: 16, paddingBottom: 24, zIndex: 10, width: '100%' },
  pricingCard: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 20, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, elevation: 8,
  },
  pricingTitle: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  categoriesBox: { gap: 10 },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  categoryOptionActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '05' },
  categoryName: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  categoryMeta: { fontSize: 10, fontFamily: 'Quicksand-Regular', color: Colors.textMuted, marginTop: 2 },
  categoryFare: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  payLabel: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary, marginTop: 4 },
  paymentBox: { flexDirection: 'row', gap: 8 },
  paymentOpt: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  paymentOptActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '08' },
  paymentOptText: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  paymentOptTextActive: { color: Colors.accent },
  pricingActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  backBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  backBtnText: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  confirmTripBtn: { flex: 2, backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmTripText: { color: Colors.white, fontSize: 13, fontFamily: 'Quicksand-Bold' },

  // Flujo: Solicitud Activa (Chofer Asignado)
  activeTripContainer: {
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, gap: 16, zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, elevation: 10,
  },
  halfMap: { height: height * 0.22, borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.border },
  driverPanel: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 4 },
  driverAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  driverInfoCol: { flex: 1, gap: 2 },
  driverNameLabel: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  driverCarPlate: { fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  driverRatingText: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.accent },
  carPhotoImg: { width: '100%', height: 110, borderRadius: 14 },
  promoCard: { backgroundColor: Colors.primary + '0B', borderLeftWidth: 3, borderLeftColor: Colors.primary, padding: 12, borderRadius: 8 },
  promoCardTitle: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  promoCardDesc: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 16, marginTop: 4 },
  tripControls: { flexDirection: 'row', gap: 8 },
  controlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 10 },
  controlBtnRecording: { backgroundColor: Colors.danger },
  controlBtnText: { color: Colors.white, fontSize: 11, fontFamily: 'Quicksand-Bold' },
  cancelTripBtn: { borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTripBtnText: { color: Colors.danger, fontSize: 14, fontFamily: 'Quicksand-Bold' },

  // Nuevos estilos de tracking de viaje reestructurado
  driverTrackingCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  driverPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  carPhotoTrackingImg: { width: '100%', height: 120, borderRadius: 12, resizeMode: 'cover', marginTop: 4 },
  tripControlsRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginVertical: 12 },
  controlBtnSquare: { flex: 1, height: 62, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  controlBtnLabel: { color: Colors.white, fontSize: 10, fontFamily: 'Quicksand-Bold' },

  // Estilos de pantalla dividida 62/38 para mayor visibilidad del mapa
  activeTripScreenContainer: { flex: 1, backgroundColor: Colors.white },
  topHalfMapContainer: { height: '62%', width: '100%', minHeight: 300 },
  bottomHalfContainer: { height: '38%', width: '100%', backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  bottomHalfScrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  ecosystemDrawerContainer: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16, padding: 12, backgroundColor: Colors.background, marginTop: 8 },
  ecosystemDrawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  ecosystemDrawerTitle: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  drawerHintBanner: { backgroundColor: Colors.accent + '15', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginTop: 8, alignItems: 'center' },
  drawerHintText: { color: Colors.accent, fontSize: 11, fontFamily: 'Quicksand-Bold' },
  ecosystemDrawerBody: { marginTop: 12 },

  // Barra inferior de Tabs
  footerTabs: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 70, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
    flexDirection: 'row', paddingBottom: 12, zIndex: 9,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 10, fontFamily: 'Quicksand-Medium', color: '#94A3B8' },
  tabLabelActive: { color: Colors.accent, fontFamily: 'Quicksand-Bold' },

  // Estilos para Viaje Grupal Próximo (Experiences)
  upcomingExperienceCard: {
    borderRadius: 20, overflow: 'hidden', height: 210, backgroundColor: Colors.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, elevation: 8,
    marginBottom: 10,
  },
  upcomingExperienceImg: {
    ...StyleSheet.absoluteFill, width: '100%', height: '100%',
  },
  upcomingExperienceOverlay: {
    ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10, 42, 91, 0.65)',
  },
  upcomingExperienceBody: {
    flex: 1, padding: 18, justifyContent: 'space-between',
  },
  upcomingBadge: {
    alignSelf: 'flex-start', backgroundColor: '#ff6b00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  upcomingBadgeText: {
    color: '#FFF', fontSize: 10, fontFamily: 'Quicksand-Bold', letterSpacing: 0.5,
  },
  upcomingDest: {
    color: '#FFF', fontSize: 18, fontFamily: 'Quicksand-Bold', marginTop: 4,
  },
  upcomingDates: {
    color: '#FFF', fontSize: 12, fontFamily: 'Quicksand-Medium', opacity: 0.9, marginTop: 2,
  },
  countdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 8,
  },
  countdownText: {
    color: '#FFF', fontSize: 12, fontFamily: 'Quicksand-Medium',
  },
  upcomingFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12,
  },
  coordInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  coordAvatar: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#FFF',
  },
  coordLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'Quicksand-Regular',
  },
  coordName: {
    color: '#FFF', fontSize: 11, fontFamily: 'Quicksand-Bold',
  },
  qrCheckinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ff6b00',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  qrCheckinBtnText: {
    color: '#FFF', fontSize: 12, fontFamily: 'Quicksand-Bold',
  },

  // Modal QR Boarding Pass
  qrModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  qrModalContent: {
    width: '100%', maxWidth: 340, backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, elevation: 12,
  },
  qrModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12,
  },
  qrModalTitle: {
    fontSize: 20, fontFamily: 'Quicksand-Bold', color: Colors.primary,
  },
  qrModalCloseBtn: {
    padding: 4,
  },
  qrModalSubtitle: {
    fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary, textAlign: 'center', marginBottom: 16,
  },
  qrFrame: {
    padding: 12, backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  qrCodeImg: {
    width: 180, height: 180,
  },
  qrModalTripInfo: {
    width: '100%', alignItems: 'center', gap: 4, marginBottom: 20,
  },
  qrModalTripDest: {
    fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary, textAlign: 'center',
  },
  qrModalTripDate: {
    fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary,
  },
  qrModalPassenger: {
    fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.accent, marginTop: 4,
  },
  qrModalButton: {
    width: '100%', backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  qrModalButtonText: {
    color: '#FFF', fontSize: 14, fontFamily: 'Quicksand-Bold',
  },

  // Modales
  searchingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  searchingBox: { backgroundColor: Colors.white, borderRadius: 24, padding: 24, alignItems: 'center', gap: 12, textAlign: 'center' },
  searchingTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  searchingDesc: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  cancelSearchBtn: { borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 12, paddingVertical: 12, width: '100%', alignItems: 'center', marginTop: 8 },
  cancelSearchText: { color: Colors.danger, fontSize: 13, fontFamily: 'Quicksand-Bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: Colors.white, borderRadius: 24, padding: 24, gap: 14 },
  modalTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  modalSubtitle: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, marginBottom: 8 },
  label: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  formInput: {
    backgroundColor: Colors.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: 'Quicksand-Regular', color: Colors.textPrimary,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  confirmBtn: { flex: 2, backgroundColor: Colors.accent, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.white },
  inputGroup: { gap: 6, width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  // Botón de TravelApp Experiences en Perfil (Fondo blanco, reducido y nítido)
  experienceBtnProfile: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 8,
  },

  // Tarjeta de Billetera TravelPay (Saldo a Favor)
  walletCard: {
    backgroundColor: '#0B192C',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCardTitle: {
    fontSize: 15,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
  },
  walletCardSub: {
    fontSize: 11,
    fontFamily: 'Quicksand-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  walletBalanceBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  walletBalanceValue: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
  },
  walletInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  walletInfoText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Medium',
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
    lineHeight: 15,
  },

  // Mercado Pago Wallet Connect Card (Compacta)
  mpWalletCardCompact: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#009EE330',
    marginBottom: 8,
  },
  mpWalletHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mpLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#009EE315',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpWalletTitleCompact: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: '#009EE3',
  },
  mpWalletBodyCompact: {
    gap: 6,
  },
  mpWalletDescCompact: {
    fontSize: 11,
    fontFamily: 'Quicksand-Regular',
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  mpLinkBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#009EE3',
    borderRadius: 10,
    paddingVertical: 8,
  },
  mpLinkBtnTextCompact: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
  },
  mpLinkedBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mpLinkedBadgeTextCompact: {
    fontSize: 10,
    fontFamily: 'Quicksand-Bold',
    color: Colors.success,
  },
  mpUnlinkBtnCompact: {
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  mpUnlinkBtnTextCompact: {
    color: Colors.danger,
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
  },

  // Sección Datos Registrados
  sectionFormTitle: {
    fontSize: 15,
    fontFamily: 'Quicksand-Bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  avatarEditContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 6,
  },
  avatarWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
  },
  userAvatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  cameraBadgeBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  changePhotoTextBtn: {
    paddingVertical: 2,
  },
  changePhotoText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: Colors.accent,
    textAlign: 'center',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savePhoneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePhoneBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
  },

  mpWalletCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 18, gap: 12,
    borderWidth: 1.5, borderColor: '#009EE330', marginVertical: 4,
    shadowColor: '#009EE3', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, elevation: 4,
  },
  mpWalletHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mpWalletTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: '#009EE3' },
  mpWalletBody: { gap: 10 },
  mpWalletDesc: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 18 },
  mpLinkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#009EE3', borderRadius: 12, paddingVertical: 12,
  },
  mpLinkBtnText: { color: Colors.white, fontSize: 13, fontFamily: 'Quicksand-Bold' },
  mpLinkedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.success + '10', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  mpLinkedBadgeText: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.success },
  // Estilos del Modal de Chat en Vivo
  chatModalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  chatModalHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  chatCloseBtn: { padding: 4 },
  chatHeaderName: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  chatHeaderSub: { fontSize: 11, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  concordeBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.success + '15', alignItems: 'center', justifyContent: 'center' },
  chatMessagesScroll: { flex: 1 },
  liveChatBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, gap: 2 },
  liveChatBubbleMe: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 2 },
  liveChatBubbleDriver: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 2 },
  liveChatBubbleAdmin: { alignSelf: 'center', backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', width: '90%' },
  chatSenderLabel: { fontSize: 10, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  liveChatBubbleText: { fontSize: 14, fontFamily: 'Quicksand-Regular', color: Colors.textPrimary },
  emptyChatBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyChatText: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  emptyChatSub: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  chatInputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  chatTextInput: {
    flex: 1, backgroundColor: '#F1F5F9', borderRadius: 24, paddingHorizontal: 18, height: 46,
    fontSize: 14, fontFamily: 'Quicksand-Medium', color: Colors.textPrimary,
  },
  liveChatSendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  mpUnlinkBtn: {
    borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  mpUnlinkBtnText: { color: Colors.danger, fontSize: 13, fontFamily: 'Quicksand-Bold' },

  // Pestaña Experiencias
  experienceHeader: { alignItems: 'flex-start', justifyContent: 'center', marginBottom: 2 },
  experienceHeaderDesc: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary, marginBottom: 16 },
  
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, marginBottom: 18 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white, fontFamily: 'Quicksand-Bold' },

  catalogContainer: { gap: 16 },
  catalogCard: { backgroundColor: Colors.white, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.border },
  catalogCardImg: { width: '100%', height: 160 },
  catalogCardBody: { padding: 16, gap: 8 },
  catalogCardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catalogDuration: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.accent },
  catalogPrice: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  catalogTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  catalogDesc: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 18 },
  catalogConsultBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, paddingVertical: 10, borderRadius: 10 },
  catalogConsultBtnText: { color: Colors.white, fontSize: 13, fontFamily: 'Quicksand-Bold' },

  // locked trip state
  lockedTripContainer: { alignItems: 'center', paddingVertical: 24, gap: 14 },
  lockIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.accent + '15', alignItems: 'center', justifyContent: 'center' },
  lockedTripTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  lockedTripDesc: { fontSize: 13, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 16, lineHeight: 20 },
  
  testerCard: { backgroundColor: Colors.primary + '08', borderStyle: 'dashed', borderWidth: 1.5, borderColor: Colors.primary + '40', borderRadius: 18, padding: 16, gap: 8, width: '100%' },
  testerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testerTitle: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  testerDesc: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 16 },
  testerToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  testerToggleLabel: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },

  // active trip details
  activeTripDetailContainer: { gap: 16 },
  activeTripHero: { height: 130, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  activeTripHeroImg: { ...StyleSheet.absoluteFill },
  activeTripHeroOverlay: { padding: 14, backgroundColor: 'rgba(0,0,0,0.45)', gap: 4 },
  activeTripHeroTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.white },
  activeTripHeroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  activeTripHeroBadgeText: { fontSize: 10, fontFamily: 'Quicksand-Bold', color: Colors.white },

  subTabScroll: { marginVertical: 4 },
  subTabScrollContent: { gap: 8 },
  subTabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  subTabBtnActive: { backgroundColor: Colors.accent },
  subTabBtnText: { fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  subTabBtnTextActive: { color: Colors.white, fontFamily: 'Quicksand-Bold' },

  subTabContent: { marginTop: 10, gap: 14 },
  sectionTitle: { fontSize: 16, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  sectionSubTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.primary, marginVertical: 4 },
  infoSectionCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: Colors.border, gap: 10 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceText: { fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  downloadPdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10, paddingVertical: 10, marginTop: 8 },
  downloadPdfBtnText: { color: Colors.primary, fontSize: 12, fontFamily: 'Quicksand-Bold' },

  itineraryAccordion: { gap: 8 },
  accordionItem: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  accordionItemExpanded: { borderColor: Colors.accent },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  accordionDayCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  accordionDayText: { color: Colors.white, fontSize: 11, fontFamily: 'Quicksand-Bold' },
  accordionHeaderTitle: { flex: 1, fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  accordionBody: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  accordionBodyDesc: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 18 },

  travisWidgetCard: { backgroundColor: Colors.primary + '0B', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.primary + '20' },
  travisWidgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  travisWidgetAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  travisWidgetAvatarText: { color: Colors.white, fontSize: 14, fontFamily: 'Quicksand-Bold' },
  travisWidgetTitle: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  travisWidgetSubtitle: { fontSize: 10, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary },
  travisWidgetForm: { flexDirection: 'row', gap: 8 },
  travisWidgetInput: { flex: 1, backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: 'Quicksand-Regular', borderWidth: 1, borderColor: Colors.border },
  travisWidgetBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  travisWidgetResponse: { backgroundColor: Colors.white, padding: 10, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: Colors.border },
  travisWidgetResponseTitle: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  travisWidgetResponseText: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 16 },

  paymentStatusCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: Colors.border },
  paymentCardTitle: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary, marginBottom: 8 },
  paymentProgressContainer: { gap: 10 },
  paymentProgRow: { flexDirection: 'row', justifyContent: 'space-between' },
  paymentProgLabel: { fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  paymentProgValue: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  progressBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.success },
  remainingBalanceText: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },

  excursionsList: { gap: 10 },
  excursionCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  excursionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  excursionTitle: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary, flex: 1 },
  excursionPrice: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  excursionDesc: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary, lineHeight: 16 },
  payExcursionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FF6B00', borderRadius: 10, paddingVertical: 8, marginTop: 4 },
  payExcursionBtnText: { color: Colors.white, fontSize: 12, fontFamily: 'Quicksand-Bold' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.success + '12', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  paidBadgeText: { color: Colors.success, fontSize: 11, fontFamily: 'Quicksand-Bold' },

  coordinatorCard: { flexDirection: 'row', gap: 12, backgroundColor: Colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  coordinatorAvatar: { width: 44, height: 44, borderRadius: 22 },
  coordinatorName: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  coordinatorRole: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: Colors.textSecondary },
  whatsappCoordBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  whatsappCoordText: { fontSize: 11, fontFamily: 'Quicksand-Bold', color: '#25D366' },

  passengersListRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  passengerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '0B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  passengerChipText: { fontSize: 11, fontFamily: 'Quicksand-Medium', color: Colors.primary },

  groupChatContainer: { height: 260, backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  chatScroll: { flex: 1, backgroundColor: '#F8FAFC' },
  chatBubble: { padding: 10, borderRadius: 12, maxWidth: '80%', gap: 2 },
  chatBubbleMe: { backgroundColor: Colors.accent + '15', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  chatBubbleCoord: { backgroundColor: Colors.primary + '15', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  chatBubbleOther: { backgroundColor: '#ECEFF1', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  chatSenderName: { fontSize: 9, fontFamily: 'Quicksand-Bold', color: Colors.textSecondary },
  chatBubbleText: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: Colors.textPrimary },
  chatInputRow: { flexDirection: 'row', padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  chatInput: { flex: 1, backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: 'Quicksand-Regular' },
  chatSendBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  galleryItem: { width: '47%', height: 110, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  galleryImg: { width: '100%', height: '100%' },
  downloadPhotoBtn: { position: 'absolute', bottom: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  // modal de Galicia
  galiciaModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  galiciaCheckoutCard: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  galiciaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 12 },
  galiciaLogoCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  galiciaLogoCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center' },
  galiciaLogoText: { color: Colors.white, fontSize: 12, fontFamily: 'Quicksand-Bold' },
  galiciaTitle: { fontSize: 15, fontFamily: 'Quicksand-Bold', color: Colors.primary },
  galiciaSummaryCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  galiciaSummaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  galiciaSummaryLabel: { fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary },
  galiciaSummaryVal: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  galiciaNaveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  galiciaNaveBadgeText: { color: '#0369A1', fontSize: 10, fontFamily: 'Quicksand-Bold' },
  galiciaPaymentOptions: { gap: 10, marginVertical: 4 },
  galiciaOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  galiciaOptActive: { borderColor: '#FF6B00', backgroundColor: '#FF6B00' + '05' },
  galiciaOptText: { fontSize: 12, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  galiciaConfirmBtn: { backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  galiciaConfirmText: { color: Colors.white, fontSize: 14, fontFamily: 'Quicksand-Bold' },
  galiciaCancelBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  galiciaCancelText: { color: Colors.textSecondary, fontSize: 13, fontFamily: 'Quicksand-Bold' },

  overlayBanner: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  overlayIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  overlayTitle: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overlayText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
    marginTop: 2,
  },
  suggestionsContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
  addStopBtnText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: Colors.accent,
  },
  passengerStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
  },
  topSafetyIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  topSafetyIconText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: '#EF4444',
  },
  topSupportIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modals de Soporte y Seguridad
  supportModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  supportModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  supportModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  modalIconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  supportModalTitle: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  supportModalSubtitle: { fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.textSecondary, marginTop: 2 },
  supportModalCloseBtn: { padding: 4 },

  supportOptionsList: { gap: 10 },
  supportChannelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  channelIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  channelTitle: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'Quicksand-Bold' },
  channelValue: { fontSize: 14, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary, marginTop: 1 },
  channelSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontFamily: 'Quicksand-Regular' },

  emergencySupportBtn: {
    backgroundColor: Colors.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 6,
  },
  emergencySupportText: { color: Colors.white, fontSize: 14, fontFamily: 'Quicksand-Bold' },

  safetyInfoCard: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 14 },
  safetyInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  safetyInfoTitle: { fontSize: 13, fontFamily: 'Quicksand-Bold', color: Colors.textPrimary },
  safetyInfoDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, lineHeight: 16, fontFamily: 'Quicksand-Regular' },

  // Estilos de Escaneo y Vinculación QR Pasajero
  topQrScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FDE047',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  topQrScanText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: '#0B192C',
  },
  canvaDirectQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    marginTop: 10,
  },
  canvaDirectQrBtnText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: '#0284C7',
  },
  qrPassengerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrPassengerModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  qrPassengerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrPassengerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrPassengerModalTitle: {
    fontSize: 17,
    fontFamily: 'Quicksand-Bold',
    color: '#0F172A',
  },
  qrPassengerModalSubtitle: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#64748B',
    marginTop: 2,
  },
  qrPassengerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrInstructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  qrInstructionCardText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#0369A1',
    lineHeight: 18,
  },
  qrInputLabel: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: '#475569',
    marginBottom: 6,
  },
  qrCodeTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  qrSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  qrSubmitBtnText: {
    fontSize: 15,
    fontFamily: 'Quicksand-Bold',
    color: '#FFFFFF',
  },
  qrCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  qrCancelBtnText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: '#64748B',
  },

  /* Tarjeta Hero QR Destacada en Home */
  heroQrScanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B192C',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  heroQrIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroQrCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0B192C',
  },
  heroQrScanTitle: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroQrScanBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  heroQrScanBadgeText: {
    fontSize: 9,
    fontFamily: 'Quicksand-Bold',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  heroQrScanSubtitle: {
    fontSize: 11,
    fontFamily: 'Quicksand-Medium',
    color: '#94A3B8',
    lineHeight: 15,
  },
  heroQrArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  /* Selector de Modo QR (Cámara vs Manual) */
  qrModeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    width: '100%',
  },
  qrModeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  qrModeTabBtnActive: {
    backgroundColor: '#0284C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  qrModeTabBtnText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: '#64748B',
  },
  qrModeTabBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Visor de Cámara QR */
  qrCameraContainer: {
    width: '100%',
    height: 280,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0B192C',
    position: 'relative',
    marginBottom: 10,
  },
  qrCameraWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0B192C',
  },
  qrCameraLoadingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#0B192C',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  qrCameraLoadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: '#38BDF8',
  },
  qrCameraFooterHint: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  qrCameraFooterHintText: {
    fontSize: 10,
    fontFamily: 'Quicksand-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(11, 25, 44, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
});

