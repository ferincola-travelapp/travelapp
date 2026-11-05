import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Switch, Modal, TextInput, Linking, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc, Timestamp, collection, query, orderBy, addDoc, deleteDoc, increment } from 'firebase/firestore';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, auth } from '../lib/firebase';
import { Colors, GOOGLE_MAPS_KEY } from '../lib/constants';
import { InteractiveMapView } from '../components/InteractiveMapView';
import { playSeatbeltSafetyPrompt, playCustomVoiceNotification } from '../lib/audioService';
import { decodePolyline } from '../lib/geoUtils';

const STEPS = [
  { status: 'on_way', label: 'En camino al pasajero', action: 'Llegué al punto de encuentro', next: 'arrived' },
  { status: 'arrived', label: 'En punto de encuentro', action: 'Iniciar viaje', next: 'in_progress' },
  { status: 'in_progress', label: 'Viaje en curso', action: 'Completar viaje', next: 'completed' },
];

const QUICK_REPLIES_DRIVER = [
  '¡Hola! Ya salgo para tu ubicación 🚗',
  'Estoy llegando en 2 minutos 📍',
  'Ya estoy en el punto de encuentro ✅',
  'Hay un poco de tránsito, ya llego 🙏',
];

export default function ActiveTripScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId } = route.params;
  const [trip, setTrip] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Switch de PIN Opcional (a elección del conductor)
  const [requirePin, setRequirePin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [inputPin, setInputPin] = useState('');

  // Chat en Vivo con el Pasajero (habilitado tras aceptar el viaje)
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveRouteCoords, setLiveRouteCoords] = useState<any[] | null>(null);
  const [trafficAlertBanner, setTrafficAlertBanner] = useState<string | null>(null);
  const [hasSpokenTrafficAlert, setHasSpokenTrafficAlert] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'trips', tripId), snap => {
      if (!snap.exists()) return;
      const data: any = { id: snap.id, ...snap.data() };
      setTrip(data);
      // Si recién fue aceptado, pasarlo automáticamente a on_way sin pisar arrived o in_progress
      if (data.status === 'accepted') {
        updateDoc(doc(db, 'trips', tripId), { status: 'on_way', updatedAt: Timestamp.now() }).catch(() => {});
      }
      if (data.status === 'cancelled' && data.cancelledBy !== 'driver') {
        Alert.alert('Viaje cancelado', 'El pasajero o la central canceló el viaje.', [
          { text: 'Volver al Panel', onPress: () => navigation.navigate('Dashboard') },
        ]);
      }
    });

    // Suscripción en tiempo real a los mensajes del viaje
    const qMsgs = query(collection(db, 'trips', tripId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(qMsgs, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChatMessages(list);
      const passengerMsgs = list.filter((m: any) => m.senderRole === 'passenger' && !m.readByDriver);
      setUnreadCount(passengerMsgs.length);
    });

    // Tracking de ubicación
    const trackLocation = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setDriverLocation(coords);
        await updateDoc(doc(db, 'trips', tripId), { driverLocation: coords });
      } catch {}
    };
    trackLocation();
    const interval = setInterval(trackLocation, 8000);

    return () => { unsub(); unsubMsgs(); clearInterval(interval); };
  }, [tripId]);

  // Cálculo de ruta y alerta de tránsito en tiempo real con Google Directions API
  useEffect(() => {
    const fetchTrafficRoute = async () => {
      if (!trip) return;
      const fromCoords = driverLocation || trip?.originCoords;
      const toCoords =
        trip.status === 'on_way' || trip.status === 'accepted'
          ? trip?.originCoords
          : trip?.destinationCoords;

      const oLat = fromCoords?.latitude ?? fromCoords?.lat;
      const oLng = fromCoords?.longitude ?? fromCoords?.lng;
      const dLat = toCoords?.latitude ?? toCoords?.lat;
      const dLng = toCoords?.longitude ?? toCoords?.lng;
      if (!oLat || !oLng || !dLat || !dLng) return;

      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${oLat},${oLng}&destination=${dLat},${dLng}&departure_time=now&traffic_model=best_guess&language=es&key=${GOOGLE_MAPS_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.routes && json.routes.length > 0) {
          const routeObj = json.routes[0];
          if (routeObj.overview_polyline?.points) {
            setLiveRouteCoords(decodePolyline(routeObj.overview_polyline.points));
          }
          const leg = routeObj.legs?.[0];
          if (leg?.duration?.value && leg?.duration_in_traffic?.value) {
            const normalSec = leg.duration.value;
            const trafficSec = leg.duration_in_traffic.value;
            const extraMin = Math.round((trafficSec - normalSec) / 60);
            if (extraMin >= 3 || trafficSec > normalSec * 1.25) {
              const msg = `Congestión en ruta (${routeObj.summary || 'vía principal'}): +${Math.max(extraMin, 2)} min de demora por tránsito.`;
              setTrafficAlertBanner(msg);
              if (!hasSpokenTrafficAlert) {
                setHasSpokenTrafficAlert(true);
                playCustomVoiceNotification('Atención conductor', msg);
              }
            } else {
              setTrafficAlertBanner(null);
            }
          }
        }
      } catch {}
    };
    fetchTrafficRoute();
  }, [trip?.status, driverLocation?.latitude, driverLocation?.longitude]);

  const isChatAllowed = ['accepted', 'on_way', 'arrived', 'in_progress'].includes(trip?.status);

  const handleOpenChat = async () => {
    if (!isChatAllowed) {
      Alert.alert('Chat no disponible', 'El chat solo está habilitado una vez que aceptaste el viaje.');
      return;
    }
    setShowChatModal(true);
    setUnreadCount(0);
    // Marcar mensajes del pasajero como leídos por el conductor
    chatMessages.forEach((m: any) => {
      if (m.senderRole === 'passenger' && !m.readByDriver) {
        updateDoc(doc(db, 'trips', tripId, 'messages', m.id), { readByDriver: true }).catch(() => {});
      }
    });
  };

  const handleSendDriverMessage = async (presetText?: string) => {
    const textToSend = (presetText !== undefined ? presetText : chatInput).trim();
    if (!textToSend || !isChatAllowed) return;
    try {
      if (editingMessageId) {
        await updateDoc(doc(db, 'trips', tripId, 'messages', editingMessageId), {
          text: textToSend,
          edited: true,
          editedAt: Timestamp.now(),
        });
        setEditingMessageId(null);
        setChatInput('');
        return;
      }
      if (presetText === undefined) setChatInput('');
      await addDoc(collection(db, 'trips', tripId, 'messages'), {
        text: textToSend,
        senderId: auth.currentUser?.uid || 'driver',
        senderName: trip?.driverName || 'Conductor',
        senderRole: 'driver',
        readByDriver: true,
        readByPassenger: false,
        createdAt: Timestamp.now(),
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    }
  };

  const handleEditDriverMessage = (msg: any) => {
    setEditingMessageId(msg.id);
    setChatInput(msg.text || '');
  };

  const handleDeleteDriverMessage = (msgId: string) => {
    Alert.alert('Eliminar mensaje', '¿Querés eliminar este mensaje del chat con el pasajero?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'trips', tripId, 'messages', msgId));
            if (editingMessageId === msgId) {
              setEditingMessageId(null);
              setChatInput('');
            }
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el mensaje.');
          }
        },
      },
    ]);
  };

  const advanceStep = async () => {
    const currentStep = STEPS.find(s => s.status === trip?.status);
    if (!currentStep) return;

    // Si estamos en punto de encuentro e ir a in_progress con PIN activado por el conductor
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
    const lat = trip?.destinationLat || trip?.destinationCoords?.latitude || -26.8326;
    const lng = trip?.destinationLng || trip?.destinationCoords?.longitude || -65.2038;
    const url = `waze://?ll=${lat},${lng}&navigate=yes`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Waze no instalado', 'Abriendo en navegador web...');
      Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
    });
  };

  const handleOpenGoogleMaps = () => {
    const lat = trip?.destinationLat || trip?.destinationCoords?.latitude || -26.8326;
    const lng = trip?.destinationLng || trip?.destinationCoords?.longitude || -65.2038;
    const url = `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    });
  };

  const executeStepAdvance = async (nextStatus: string) => {
    setLoading(true);
    try {
      const update: any = { status: nextStatus, updatedAt: Timestamp.now() };
      if (nextStatus === 'arrived') {
        update.arrivedAt = Timestamp.now();
      } else if (nextStatus === 'in_progress') {
        update.startedAt = Timestamp.now();
      } else if (nextStatus === 'completed') {
        const finalPrice = Number(trip.estimatedPrice || trip.price || 0);
        update.completedAt = Timestamp.now();
        update.finalPrice = finalPrice;
        await updateDoc(doc(db, 'trips', tripId), update);

        // Registrar movimiento contable en Billetera del Conductor y actualizar métricas
        const driverUid = auth.currentUser?.uid || trip?.driverId;
        if (driverUid) {
          const isCash = !trip?.paymentMethod || trip?.paymentMethod === 'Efectivo';
          const commissionFee = Math.round(finalPrice * 0.15);
          try {
            await addDoc(collection(db, 'drivers', driverUid, 'transactions'), {
              tripId,
              amount: finalPrice,
              commissionFee,
              netAmount: finalPrice - commissionFee,
              type: isCash ? 'trip_cash' : 'trip_digital',
              paymentMethod: trip?.paymentMethod || 'Efectivo',
              description: `Viaje a ${trip?.destination || 'Destino'}`,
              createdAt: Timestamp.now(),
            });
            await updateDoc(doc(db, 'drivers', driverUid), {
              totalTrips: increment(1),
              ...(isCash
                ? { currentCommissionBalance: increment(-commissionFee) }
                : { currentCommissionBalance: increment(finalPrice - commissionFee) }),
            });
          } catch (walletErr) {
            console.warn('Error updating driver wallet/transactions:', walletErr);
          }
        }

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

  const handleDriverCancelTrip = () => {
    Alert.alert(
      'Cancelar Viaje',
      '¿Estás seguro de que querés cancelar este viaje asignado?',
      [
        { text: 'No, continuar', style: 'cancel' },
        {
          text: 'Sí, cancelar viaje',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await updateDoc(doc(db, 'trips', tripId), {
                status: 'cancelled',
                cancelledBy: 'driver',
                cancelledAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
              navigation.navigate('Dashboard');
            } catch {
              Alert.alert('Error', 'No se pudo cancelar el viaje.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
    const expectedPin = String(trip?.securityPin || trip?.pin || '').trim();
    if (!expectedPin || inputPin.trim() === expectedPin) {
      executeStepAdvance('in_progress');
    } else {
      Alert.alert('PIN Incorrecto', 'El PIN de seguridad ingresado no coincide con el del pasajero. Verificalo o iniciá sin PIN si ya validaste su identidad.');
    }
  };

  if (!trip) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  const currentStep = STEPS.find(s => s.status === trip.status) || (trip.status === 'accepted' ? STEPS[0] : undefined);
  const passengerDisplayName = trip.passengerName || trip.userName || 'Pasajero';
  const passengerPhone = trip.passengerPhone || trip.userPhone || '';

  return (
    <View style={styles.container}>
      <InteractiveMapView
        style={styles.map}
        originCoords={driverLocation || trip?.originCoords || { latitude: -26.8326, longitude: -65.2038 }}
        destinationCoords={
          (trip?.status === 'on_way' || trip?.status === 'accepted'
            ? trip?.originCoords
            : trip?.destinationCoords) || null
        }
        routeCoordinates={liveRouteCoords || (trip?.routePolyline ? decodePolyline(trip.routePolyline) : null)}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 40 }]}>
        <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
        <Text style={styles.headerTitle}>{currentStep?.label || 'Viaje activo'}</Text>
      </View>

      {trafficAlertBanner && (
        <View style={{
          position: 'absolute',
          top: insets.top > 0 ? insets.top + 56 : 86,
          left: 16,
          right: 16,
          backgroundColor: '#DC2626',
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          elevation: 6,
        }}>
          <Ionicons name="warning" size={20} color="#FEF08A" />
          <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
            🚦 {trafficAlertBanner}
          </Text>
        </View>
      )}

      {/* Panel inferior */}
      <View style={styles.panel}>
        {/* Pasajero, Chat y Llamada */}
        <View style={styles.passengerRow}>
          <View style={styles.passengerAvatar}>
            <Ionicons name="person" size={22} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.passengerName}>{passengerDisplayName}</Text>
            <Text style={styles.passengerDest} numberOfLines={1}>📍 {trip.destination}</Text>
          </View>
          {isChatAllowed && (
            <TouchableOpacity style={styles.chatBtn} onPress={handleOpenChat}>
              <Ionicons name="chatbubble-ellipses" size={20} color={Colors.primary} />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => {
              if (!passengerPhone) {
                Alert.alert('Teléfono no disponible', 'Podés escribirle al pasajero por el chat del viaje.');
                return;
              }
              Linking.openURL(`tel:${passengerPhone}`);
            }}
          >
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
            const currentIdx = STEPS.indexOf(STEPS.find(s => s.status === trip.status)!);
            const isDone = currentIdx > i;
            const isCurrent = step.status === trip.status || (trip.status === 'accepted' && i === 0);
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

        {/* Switch de PIN Opcional (Configurable por el conductor antes de iniciar) */}
        {(trip.status === 'arrived' || trip.status === 'on_way' || trip.status === 'accepted') && (
          <View style={styles.pinSwitchContainer}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.pinSwitchTitle}>🔒 Solicitar PIN de seguridad (Opcional)</Text>
              <Text style={styles.pinSwitchSub}>Activá esta opción si deseás pedirle el PIN de 4 dígitos al pasajero al abordar</Text>
            </View>
            <Switch
              value={requirePin}
              onValueChange={setRequirePin}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>
        )}

        {/* Ganancia y Método de Pago */}
        <View style={styles.earningsRow}>
          <View>
            <Text style={styles.earningsLabel}>Ganancia del viaje</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: trip.paymentMethod === 'Rewards' ? '#D97706' : Colors.textSecondary }}>
              Pago: {trip.paymentMethod === 'Rewards' ? '✨ Puntos Rewards' : (trip.paymentMethod || 'Efectivo')}
            </Text>
          </View>
          <Text style={styles.earnings}>${trip.estimatedPrice || trip.price || 0} ARS</Text>
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

        {/* Opción para que el conductor cancele antes de iniciar el viaje */}
        {['accepted', 'on_way', 'arrived'].includes(trip.status) && (
          <TouchableOpacity
            style={{ marginTop: 10, paddingVertical: 10, alignItems: 'center' }}
            onPress={handleDriverCancelTrip}
            disabled={loading}
          >
            <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>
              Cancelar viaje asignado
            </Text>
          </TouchableOpacity>
        )}

        {/* Modal de Verificación de PIN Opcional */}
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
                placeholder="••••"
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

              <TouchableOpacity
                style={{ marginTop: 8, paddingVertical: 6 }}
                onPress={() => executeStepAdvance('in_progress')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textDecorationLine: 'underline' }}>
                  Iniciar viaje sin PIN (Opcional)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal de Chat en Vivo (Gestionar, Editar y Eliminar Mensajes) */}
        <Modal visible={showChatModal} transparent animationType="slide" onRequestClose={() => setShowChatModal(false)}>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.modalContent, { maxHeight: '85%', padding: 18, alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.passengerAvatar}>
                    <Ionicons name="person" size={18} color={Colors.white} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.textPrimary }}>{passengerDisplayName}</Text>
                    <Text style={{ fontSize: 11, color: Colors.success, fontWeight: '600' }}>● Chat del viaje activo • Podés editar o borrar tus mensajes</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { setShowChatModal(false); setEditingMessageId(null); setChatInput(''); }}>
                  <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Respuestas rápidas del conductor */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginVertical: 6 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
                {QUICK_REPLIES_DRIVER.map(reply => (
                  <TouchableOpacity
                    key={reply}
                    style={styles.quickReplyChip}
                    onPress={() => handleSendDriverMessage(reply)}
                  >
                    <Text style={styles.quickReplyText}>{reply}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Lista de mensajes */}
              <ScrollView style={{ maxHeight: 300, marginVertical: 6 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
                {chatMessages.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: Colors.textMuted, fontSize: 13, marginVertical: 24 }}>
                    Aún no hay mensajes. Usá una respuesta rápida o escribile a {passengerDisplayName}.
                  </Text>
                ) : (
                  chatMessages.map((msg: any) => {
                    const isMe = msg.senderRole === 'driver' || msg.senderId === auth.currentUser?.uid;
                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.msgBubble,
                          isMe ? styles.msgBubbleMe : styles.msgBubbleOther,
                        ]}
                      >
                        <Text style={[styles.msgText, isMe && { color: Colors.white }]}>{msg.text}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                          {msg.edited && (
                            <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.75)' : Colors.textMuted }}>
                              (editado)
                            </Text>
                          )}
                          {isMe && (
                            <>
                              <TouchableOpacity onPress={() => handleEditDriverMessage(msg)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="pencil" size={13} color="rgba(255,255,255,0.9)" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteDriverMessage(msg.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="trash" size={13} color="rgba(255,255,255,0.9)" />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {editingMessageId && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>✏️ Editando mensaje...</Text>
                  <TouchableOpacity onPress={() => { setEditingMessageId(null); setChatInput(''); }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <TextInput
                  style={styles.chatInputBox}
                  placeholder={editingMessageId ? 'Editar tu mensaje...' : 'Escribir mensaje al pasajero...'}
                  placeholderTextColor={Colors.textMuted}
                  value={chatInput}
                  onChangeText={setChatInput}
                />
                <TouchableOpacity style={styles.chatSendBtn} onPress={() => handleSendDriverMessage()}>
                  <Ionicons name={editingMessageId ? 'checkmark' : 'send'} size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal de Calificación al Pasajero Post-Viaje */}
        <Modal visible={showPassengerRatingModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Ionicons name="star" size={54} color="#F59E0B" />
              <Text style={styles.modalTitle}>¿Qué tal fue el pasajero?</Text>
              <Text style={styles.modalSub}>Calificá tu experiencia con {passengerDisplayName}:</Text>

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
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passengerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  passengerName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  passengerDest: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  chatBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  unreadBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  quickReplyChip: {
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  quickReplyText: { fontSize: 12, fontWeight: '600', color: '#1D4ED8' },
  msgBubble: {
    maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
  },
  msgBubbleMe: {
    alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 14, color: Colors.textPrimary },
  chatInputBox: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border,
  },
  chatSendBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
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


