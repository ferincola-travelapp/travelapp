import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking, RefreshControl, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, runTransaction, Timestamp, orderBy } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../lib/firebase';
import { Colors } from '../lib/constants';
import { playTripRequestAlertSound, stopTripRequestAlertSound, playCustomVoiceNotification } from '../lib/audioService';

interface ScheduledTrip {
  id: string;
  passengerId?: string;
  userName?: string;
  passengerName?: string;
  passengerPhone?: string;
  origin: string;
  destination: string;
  serviceCategory?: 'MU' | 'TRANSFER' | 'ARC';
  serviceType?: string;
  isScheduled?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledDateTime?: any;
  flightNumber?: string;
  luggageCount?: number;
  passengersCount?: number;
  estimatedPrice?: number;
  finalPrice?: number;
  paymentMethod?: string;
  status: string;
  driverId?: string;
  driverName?: string;
  securityPin?: string;
  createdAt?: any;
}

export default function ScheduleScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [activeTab, setActiveTab] = useState<'my_trips' | 'pool'>('my_trips');
  const [myTrips, setMyTrips] = useState<ScheduledTrip[]>([]);
  const [poolTrips, setPoolTrips] = useState<ScheduledTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Control de Alarmas ya disparadas (para evitar duplicados)
  const reminded45Min = useRef<Set<string>>(new Set());
  const reminded15Min = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // 1. Escuchar Mis Viajes Agendados
    const qMyTrips = query(
      collection(db, 'trips'),
      where('driverId', '==', user.uid)
    );

    const unsubMyTrips = onSnapshot(qMyTrips, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduledTrip));
      // Filtrar solo los viajes programados o activos
      const scheduledList = list.filter(t => 
        (t.isScheduled === true || Boolean(t.scheduledDate || t.scheduledTime || t.scheduledDateTime)) &&
        t.status !== 'completed' && t.status !== 'cancelled'
      );
      setMyTrips(scheduledList);
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.warn("Error fetching my scheduled trips:", err);
      setLoading(false);
      setRefreshing(false);
    });

    // 2. Escuchar Bolsa de Viajes Disponibles para Agendar
    const qPool = query(
      collection(db, 'trips'),
      where('status', '==', 'searching')
    );

    const unsubPool = onSnapshot(qPool, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduledTrip));
      const scheduledPool = list.filter(t => 
        (t.isScheduled === true || Boolean(t.scheduledDate || t.scheduledTime || t.scheduledDateTime) || t.serviceCategory === 'TRANSFER' || t.serviceCategory === 'ARC') &&
        !t.driverId
      );
      setPoolTrips(scheduledPool);
    }, (err) => {
      console.warn("Error fetching pool trips:", err);
    });

    return () => {
      unsubMyTrips();
      unsubPool();
    };
  }, [user?.uid]);

  // Monitoreo periódico de alarmas (cada 30 seg)
  useEffect(() => {
    const alarmCheckInterval = setInterval(() => {
      const now = Date.now();

      myTrips.forEach(trip => {
        let tripTimeMs = 0;
        if (trip.scheduledDate && trip.scheduledTime) {
          tripTimeMs = new Date(`${trip.scheduledDate}T${trip.scheduledTime}:00`).getTime();
        } else if (trip.scheduledDateTime) {
          tripTimeMs = trip.scheduledDateTime.toDate ? trip.scheduledDateTime.toDate().getTime() : new Date(trip.scheduledDateTime).getTime();
        }

        if (!tripTimeMs || isNaN(tripTimeMs)) return;

        const diffMinutes = Math.round((tripTimeMs - now) / 60000);

        // Alarma 45 Minutos antes
        if (diffMinutes <= 45 && diffMinutes > 15 && !reminded45Min.current.has(trip.id)) {
          reminded45Min.current.add(trip.id);
          playCustomVoiceNotification(`Recordatorio de viaje: En ${diffMinutes} minutos tenés un viaje agendado hacia ${trip.destination.split(',')[0]}.`);
          Alert.alert(
            '⏰ Recordatorio de Viaje Agendado',
            `Faltan ${diffMinutes} minutos para tu viaje programado hacia ${trip.destination}.`
          );
        }

        // Alarma 15 Minutos antes (Crítica / Sonido Fuerte)
        if (diffMinutes <= 15 && diffMinutes >= 0 && !reminded15Min.current.has(trip.id)) {
          reminded15Min.current.add(trip.id);
          playTripRequestAlertSound();
          playCustomVoiceNotification(`Alerta de salida: Es momento de iniciar tu recorrido hacia el punto de recogida.`);
          Alert.alert(
            '🚨 ¡Hora de Salir!',
            `El viaje hacia ${trip.destination} está programado para dentro de ${diffMinutes} minutos. Tocá "Iniciar Salida" para guiarte con el mapa.`,
            [
              { text: 'Entendido', onPress: () => stopTripRequestAlertSound() },
              {
                text: 'Iniciar Salida',
                style: 'default',
                onPress: () => {
                  stopTripRequestAlertSound();
                  handleStartDeparture(trip);
                },
              }
            ]
          );
        }
      });
    }, 30000);

    return () => clearInterval(alarmCheckInterval);
  }, [myTrips]);

  // Aceptar viaje de la bolsa
  const handleAcceptPoolTrip = async (trip: ScheduledTrip) => {
    if (!user) return;
    try {
      const driverRef = doc(db, 'drivers', user.uid);
      const driverSnap = await getDoc(driverRef);
      const driverData = driverSnap.data();

      const rawName = driverData?.firstName || driverData?.name || user.displayName || 'Conductor';
      const driverName = String(rawName).trim().split(/\s+/)[0] || 'Conductor';
      const driverPhone = driverData?.phone || user.phoneNumber || '';
      const driverRating = Number(driverData?.rating || 5.0);
      const driverTotalTrips = Number(driverData?.totalTrips || 0);
      const vehicleModel = driverData?.activeVehicle?.brand || driverData?.vehicleModel || 'Vehículo Asignado';
      const vehiclePlate = String(driverData?.activeVehicle?.plate || driverData?.vehiclePlate || '').trim().toUpperCase();
      const driverProfilePhoto = driverData?.photoUrl || driverData?.profilePhotoUrl || user.photoURL || '';
      const driverCarPhoto = driverData?.activeVehicle?.photoUrl || driverData?.vehiclePhotoUrl || '';

      const tripRef = doc(db, 'trips', trip.id);
      await runTransaction(db, async (tx) => {
        const latestSnap = await tx.get(tripRef);
        if (!latestSnap.exists()) {
          throw new Error('TRIP_NOT_FOUND');
        }
        const currentData = latestSnap.data();
        if (currentData?.status !== 'searching' || currentData?.driverId) {
          throw new Error('TRIP_ALREADY_TAKEN');
        }
        tx.update(tripRef, {
          status: 'accepted',
          driverId: user.uid,
          driverName,
          driverPhone,
          driverRating,
          driverTotalTrips,
          vehicleModel,
          vehiclePlate,
          driverProfilePhoto,
          driverCarPhoto,
          assignedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });

      playCustomVoiceNotification("¡Viaje agendado con éxito a tu jornada!");
      Alert.alert('¡Viaje Agendado! 🎉', `Agendaste el traslado hacia ${trip.destination}. Te notificaremos antes del horario de salida.`);
      setActiveTab('my_trips');
    } catch (err) {
      console.error("Error accepting pool trip:", err);
      Alert.alert('Error', 'No se pudo tomar el viaje. Puede haber sido tomado por otro conductor.');
    }
  };

  // Iniciar salida hacia el pasajero
  const handleStartDeparture = async (trip: ScheduledTrip) => {
    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        status: 'on_way',
        startedDepartureAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      navigation.navigate('ActiveTrip', { tripId: trip.id });
    } catch (e) {
      console.warn("Error starting departure:", e);
      navigation.navigate('ActiveTrip', { tripId: trip.id });
    }
  };

  // Liberar viaje a la bolsa
  const handleReleaseTrip = async (tripId: string) => {
    Alert.alert(
      'Liberar Viaje',
      '¿Seguro que deseas liberar este viaje? Volverá a la bolsa para que otro chofer lo realice.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Liberar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'trips', tripId), {
                driverId: null,
                driverName: null,
                driverPhone: null,
                status: 'searching',
                updatedAt: Timestamp.now()
              });
              Alert.alert('Viaje Liberado', 'El viaje fue devuelto a la bolsa de traslados.');
            } catch (err) {
              console.error("Error releasing trip:", err);
            }
          }
        }
      ]
    );
  };

  // Formateador de texto de fecha y hora
  const formatDateTimeText = (trip: ScheduledTrip) => {
    if (trip.scheduledDate && trip.scheduledTime) {
      return `${trip.scheduledDate} · ${trip.scheduledTime} hs`;
    }
    if (trip.scheduledDateTime) {
      try {
        const d = trip.scheduledDateTime.toDate ? trip.scheduledDateTime.toDate() : new Date(trip.scheduledDateTime);
        return d.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
      } catch {
        return 'Horario programado';
      }
    }
    return 'Horario a confirmar';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mi Agenda de Traslados</Text>
          <Text style={styles.headerSub}>Viajes programados y bolsa de traslados</Text>
        </View>
        <View style={styles.alarmBadge}>
          <Ionicons name="alarm" size={16} color="#D97706" />
          <Text style={styles.alarmBadgeText}>Alarma ON</Text>
        </View>
      </View>

      {/* Tabs Superiores */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'my_trips' && styles.tabBtnActive]}
          onPress={() => setActiveTab('my_trips')}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={activeTab === 'my_trips' ? Colors.white : Colors.textMuted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'my_trips' && styles.tabBtnTextActive]}>
            Mis Agendados ({myTrips.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pool' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pool')}
        >
          <Ionicons
            name="cube"
            size={18}
            color={activeTab === 'pool' ? Colors.white : Colors.textMuted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'pool' && styles.tabBtnTextActive]}>
            Bolsa Disponibles ({poolTrips.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido Principal */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />
        }
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando agenda en tiempo real...</Text>
          </View>
        ) : activeTab === 'my_trips' ? (
          /* TAB 1: MIS VIAJES AGENDADOS */
          myTrips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={54} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No tenés viajes agendados</Text>
              <Text style={styles.emptySub}>
                Revisá la pestaña "Bolsa Disponibles" para tomar traslados futuros y organizar tu semana con anticipación.
              </Text>
              <TouchableOpacity style={styles.emptyActionBtn} onPress={() => setActiveTab('pool')}>
                <Text style={styles.emptyActionText}>Ver Bolsa de Disponibles</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {myTrips.map(trip => {
                const cat = trip.serviceCategory || (trip.serviceType?.toLowerCase().includes('transfer') ? 'TRANSFER' : 'MU');
                const isTransfer = cat === 'TRANSFER';
                const isArc = cat === 'ARC';

                return (
                  <View key={trip.id} style={styles.tripCard}>
                    {/* Encabezado con Categoría y Precio */}
                    <View style={styles.cardHeader}>
                      <View style={[styles.serviceBadge, 
                        isTransfer ? styles.badgeTransfer : isArc ? styles.badgeArc : styles.badgeMu
                      ]}>
                        <Ionicons 
                          name={isTransfer ? 'airplane' : isArc ? 'bus' : 'car'} 
                          size={13} 
                          color={isTransfer ? '#9333EA' : isArc ? '#D97706' : '#2563EB'} 
                        />
                        <Text style={[styles.serviceBadgeText,
                          isTransfer ? { color: '#9333EA' } : isArc ? { color: '#D97706' } : { color: '#2563EB' }
                        ]}>
                          {isTransfer ? 'TRANSFER AEROPUERTO' : isArc ? 'MEDIA DISTANCIA' : 'MOVILIDAD URBANA'}
                        </Text>
                      </View>

                      <Text style={styles.cardPrice}>
                        ${trip.estimatedPrice || trip.finalPrice || 0} ARS
                      </Text>
                    </View>

                    {/* Horario y Fecha Destacados con Alarma */}
                    <View style={styles.scheduleBox}>
                      <Ionicons name="time" size={18} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scheduleTimeText}>{formatDateTimeText(trip)}</Text>
                        <Text style={styles.scheduleSubText}>Alarma sonora configurada para 45 y 15 min antes</Text>
                      </View>
                      {trip.securityPin && (
                        <View style={styles.pinPill}>
                          <Text style={styles.pinPillText}>PIN: {trip.securityPin}</Text>
                        </View>
                      )}
                    </View>

                    {/* Ruta Origen ➡️ Destino */}
                    <View style={styles.routeBox}>
                      <View style={styles.routeRow}>
                        <View style={styles.dotGreen} />
                        <Text style={styles.routeText} numberOfLines={1}>{trip.origin}</Text>
                      </View>
                      <View style={styles.routeDivider} />
                      <View style={styles.routeRow}>
                        <View style={styles.dotRed} />
                        <Text style={styles.routeText} numberOfLines={1}>{trip.destination}</Text>
                      </View>
                    </View>

                    {/* Datos del Pasajero */}
                    <View style={styles.passengerRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.passengerLabel}>Pasajero:</Text>
                        <Text style={styles.passengerName}>{trip.passengerName || trip.userName || 'Pasajero TravelCab'}</Text>
                      </View>

                      {trip.passengerPhone ? (
                        <View style={styles.passengerActions}>
                          <TouchableOpacity
                            style={styles.callBtn}
                            onPress={() => Linking.openURL(`tel:${trip.passengerPhone}`)}
                          >
                            <Ionicons name="call" size={16} color={Colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.waBtn}
                            onPress={() => Linking.openURL(`https://wa.me/${trip.passengerPhone?.replace(/\D/g, '')}?text=Hola!%20Soy%20tu%20conductor%20de%20TravelCab%20para%20el%20viaje%20programado.`)}
                          >
                            <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>

                    {/* Botones de Acción */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.releaseBtn}
                        onPress={() => handleReleaseTrip(trip.id)}
                      >
                        <Text style={styles.releaseBtnText}>Liberar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.startDepartureBtn}
                        onPress={() => handleStartDeparture(trip)}
                      >
                        <Ionicons name="navigate" size={18} color={Colors.white} style={{ marginRight: 6 }} />
                        <Text style={styles.startDepartureText}>Iniciar Salida</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          /* TAB 2: BOLSA DE VIAJES DISPONIBLES */
          poolTrips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={54} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Bolsa al día</Text>
              <Text style={styles.emptySub}>
                En este momento no hay viajes programados pendientes de asignación. Se actualizarán automáticamente cuando un cliente solicite un traslado.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {poolTrips.map(trip => {
                const cat = trip.serviceCategory || (trip.serviceType?.toLowerCase().includes('transfer') ? 'TRANSFER' : 'MU');
                const isTransfer = cat === 'TRANSFER';
                const isArc = cat === 'ARC';

                return (
                  <View key={trip.id} style={[styles.tripCard, { borderColor: '#F59E0B' }]}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.serviceBadge, 
                        isTransfer ? styles.badgeTransfer : isArc ? styles.badgeArc : styles.badgeMu
                      ]}>
                        <Ionicons 
                          name={isTransfer ? 'airplane' : isArc ? 'bus' : 'car'} 
                          size={13} 
                          color={isTransfer ? '#9333EA' : isArc ? '#D97706' : '#2563EB'} 
                        />
                        <Text style={[styles.serviceBadgeText,
                          isTransfer ? { color: '#9333EA' } : isArc ? { color: '#D97706' } : { color: '#2563EB' }
                        ]}>
                          {isTransfer ? 'TRANSFER' : isArc ? 'MEDIA DIST.' : 'URBANA (MU)'}
                        </Text>
                      </View>

                      <Text style={[styles.cardPrice, { color: Colors.success, fontSize: 18 }]}>
                        ${trip.estimatedPrice || 0} ARS
                      </Text>
                    </View>

                    {/* Horario */}
                    <View style={[styles.scheduleBox, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="calendar" size={18} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.scheduleTimeText, { color: '#92400E' }]}>
                          {formatDateTimeText(trip)}
                        </Text>
                        <Text style={[styles.scheduleSubText, { color: '#B45309' }]}>
                          Disponible para cualquier chofer verificado
                        </Text>
                      </View>
                    </View>

                    {/* Ruta */}
                    <View style={styles.routeBox}>
                      <View style={styles.routeRow}>
                        <View style={styles.dotGreen} />
                        <Text style={styles.routeText} numberOfLines={1}>{trip.origin}</Text>
                      </View>
                      <View style={styles.routeDivider} />
                      <View style={styles.routeRow}>
                        <View style={styles.dotRed} />
                        <Text style={styles.routeText} numberOfLines={1}>{trip.destination}</Text>
                      </View>
                    </View>

                    {/* Botón Tomar y Agendar */}
                    <TouchableOpacity
                      style={styles.acceptPoolBtn}
                      onPress={() => handleAcceptPoolTrip(trip)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color={Colors.white} style={{ marginRight: 6 }} />
                      <Text style={styles.acceptPoolBtnText}>Aceptar y Agendar a mi Jornada</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
  },
  alarmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alarmBadgeText: {
    fontSize: 10,
    fontFamily: 'Quicksand-Bold',
    color: '#B45309',
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.white,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textMuted,
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  emptyActionText: {
    color: Colors.white,
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
  },
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeMu: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  badgeTransfer: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
  },
  badgeArc: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  serviceBadgeText: {
    fontSize: 10,
    fontFamily: 'Quicksand-Bold',
  },
  cardPrice: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: '#15803D',
  },
  scheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  scheduleTimeText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: '#B45309',
  },
  scheduleSubText: {
    fontSize: 10,
    fontFamily: 'Quicksand-Medium',
    color: '#D97706',
  },
  pinPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pinPillText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
  },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  dotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  routeDivider: {
    width: 2,
    height: 12,
    backgroundColor: '#CBD5E1',
    marginLeft: 3,
    marginVertical: 2,
  },
  routeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Quicksand-SemiBold',
    color: Colors.textPrimary,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 12,
  },
  passengerLabel: {
    fontSize: 10,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
  },
  passengerName: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textPrimary,
  },
  passengerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  waBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  releaseBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  releaseBtnText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: '#DC2626',
  },
  startDepartureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startDepartureText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
  },
  acceptPoolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  acceptPoolBtnText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.white,
  },
});
