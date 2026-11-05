import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, addDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Colors } from '../lib/constants';

const DEFAULT_SERVICES = [
  { 
    id: 'travelcab', 
    label: 'TravelCab Standard', 
    icon: 'car', 
    desc: 'Auto ágil y económico', 
    basePrice: 800,
    eta: '3 min',
    capacity: '4 pers',
    badge: 'Más rápido'
  },
  { 
    id: 'travelcab_plus', 
    label: 'TravelCab Plus', 
    icon: 'car-sport', 
    desc: 'Mayor confort y modelos recientes', 
    basePrice: 1200,
    eta: '5 min',
    capacity: '4 pers',
    badge: 'Recomendado'
  },
  { 
    id: 'travelcab_xl', 
    label: 'TravelCab XL', 
    icon: 'bus', 
    desc: 'Espacio para grupos y equipaje', 
    basePrice: 1500,
    eta: '8 min',
    capacity: '6 pers',
    badge: 'Equipaje Extra'
  },
];

export default function RequestTripScreen() {
  const navigation = useNavigation<any>();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedService, setSelectedService] = useState('travelcab');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState(DEFAULT_SERVICES);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tariffs'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(t => t.isActive !== false && !t.isFreeTripOnly);
      if (list.length > 0) {
        const std = list.find(t => t.category?.toLowerCase().includes('standard') || t.name?.toLowerCase().includes('standard')) || list[0];
        const plus = list.find(t => t.category?.toLowerCase().includes('plus') || t.name?.toLowerCase().includes('plus') || t.category?.toLowerCase().includes('ejecutivo'));
        const xl = list.find(t => t.category?.toLowerCase().includes('xl') || t.name?.toLowerCase().includes('xl') || t.category?.toLowerCase().includes('combi'));
        setServices(prev => prev.map(s => {
          if (s.id === 'travelcab' && std?.baseFare) return { ...s, basePrice: Number(std.baseFare) };
          if (s.id === 'travelcab_plus' && plus?.baseFare) return { ...s, basePrice: Number(plus.baseFare) };
          if (s.id === 'travelcab_xl' && xl?.baseFare) return { ...s, basePrice: Number(xl.baseFare) };
          return s;
        }));
      }
    }, () => {});
    return () => unsub();
  }, []);

  // Preferencias del viaje
  const [petFriendly, setPetFriendly] = useState(false);
  const [largeTrunk, setLargeTrunk] = useState(false);
  const [quietTrip, setQuietTrip] = useState(false);
  const [ac, setAc] = useState(true);

  const selected = services.find(s => s.id === selectedService) || services[0];

  const handleRequest = async () => {
    if (!origin || !destination) {
      return Alert.alert('Campos requeridos', 'Ingresá origen y destino.');
    }
    setLoading(true);
    try {
      const user = auth.currentUser!;
      const docRef = await addDoc(collection(db, 'trips'), {
        passengerId: user.uid,
        passengerName: user.displayName || user.email,
        userId: user.uid,
        userName: user.displayName || user.email,
        origin,
        destination,
        serviceType: selectedService,
        estimatedPrice: selected.basePrice,
        status: 'searching',
        channel: 'app_client',
        tripPreferences: {
          petFriendly,
          largeTrunk,
          quietTrip,
          ac,
        },
        createdAt: Timestamp.now(),
      });
      navigation.navigate('TripTracking', { tripId: docRef.id });
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear el viaje. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar viaje</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Origen / Destino */}
        <View style={styles.card}>
          <View style={styles.locationRow}>
            <View style={styles.dotGreen} />
            <TextInput
              style={styles.locationInput}
              placeholder="Desde... (tu ubicación actual)"
              placeholderTextColor={Colors.textMuted}
              value={origin}
              onChangeText={setOrigin}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.locationRow}>
            <View style={styles.dotRed} />
            <TextInput
              style={styles.locationInput}
              placeholder="¿A dónde vas?"
              placeholderTextColor={Colors.textMuted}
              value={destination}
              onChangeText={setDestination}
            />
          </View>
        </View>

        {/* Tipo de servicio */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehículos disponibles</Text>
          <Text style={styles.sectionSub}>Precios transparentes con ETA estimado</Text>
        </View>

        {services.map(service => {
          const isSelected = selectedService === service.id;
          return (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
              onPress={() => setSelectedService(service.id)}>
              <View style={[styles.serviceIcon, { backgroundColor: isSelected ? Colors.primary : Colors.background }]}>
                <Ionicons name={service.icon as any} size={24} color={isSelected ? Colors.white : Colors.textSecondary} />
              </View>
              <View style={styles.serviceInfo}>
                <View style={styles.serviceHeaderRow}>
                  <Text style={[styles.serviceLabel, isSelected && styles.serviceTextActive]}>
                    {service.label}
                  </Text>
                  {service.badge && (
                    <View style={[styles.badge, isSelected && styles.badgeActive]}>
                      <Text style={[styles.badgeText, isSelected && styles.badgeTextActive]}>
                        {service.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.serviceDesc}>{service.desc}</Text>
                
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{service.eta}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{service.capacity}</Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.servicePrice, isSelected && styles.serviceTextActive]}>
                ${service.basePrice}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Opciones / Preferencias del Viaje */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Preferencias del viaje</Text>
          <Text style={styles.sectionSub}>Personalizá tu viaje sin costo extra</Text>
        </View>

        <View style={styles.preferencesGrid}>
          <TouchableOpacity
            style={[styles.prefChip, petFriendly && styles.prefChipActive]}
            onPress={() => setPetFriendly(!petFriendly)}>
            <Ionicons name="paw" size={16} color={petFriendly ? Colors.white : Colors.textPrimary} />
            <Text style={[styles.prefChipText, petFriendly && styles.prefChipTextActive]}>Con Mascota</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.prefChip, largeTrunk && styles.prefChipActive]}
            onPress={() => setLargeTrunk(!largeTrunk)}>
            <Ionicons name="briefcase" size={16} color={largeTrunk ? Colors.white : Colors.textPrimary} />
            <Text style={[styles.prefChipText, largeTrunk && styles.prefChipTextActive]}>Baúl Amplio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.prefChip, quietTrip && styles.prefChipActive]}
            onPress={() => setQuietTrip(!quietTrip)}>
            <Ionicons name="volume-mute" size={16} color={quietTrip ? Colors.white : Colors.textPrimary} />
            <Text style={[styles.prefChipText, quietTrip && styles.prefChipTextActive]}>En Silencio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.prefChip, ac && styles.prefChipActive]}
            onPress={() => setAc(!ac)}>
            <Ionicons name="snow" size={16} color={ac ? Colors.white : Colors.textPrimary} />
            <Text style={[styles.prefChipText, ac && styles.prefChipTextActive]}>Aire Acond.</Text>
          </TouchableOpacity>
        </View>

        {/* Resumen */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Servicio seleccionado</Text>
            <Text style={styles.summaryValue}>{selected.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tiempo estimado de llegada</Text>
            <Text style={[styles.summaryValue, { color: Colors.success, fontWeight: '700' }]}>~ {selected.eta}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Precio total estimado</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary, fontWeight: '800', fontSize: 16 }]}>
              ${selected.basePrice} ARS
            </Text>
          </View>
          <Text style={styles.summaryNote}>* El precio puede variar según la distancia y demanda en vivo</Text>
        </View>

        {/* Botón */}
        <TouchableOpacity style={styles.button} onPress={handleRequest} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="car" size={20} color={Colors.white} />
              <Text style={styles.buttonText}>Buscar conductor</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 2,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success },
  dotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.danger },
  locationInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 24 },
  sectionHeader: { marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: Colors.border,
  },
  serviceCardSelected: { borderColor: Colors.primary, backgroundColor: '#F4F8FF' },
  serviceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1 },
  serviceHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  serviceDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  servicePrice: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  serviceTextActive: { color: Colors.primary },
  badge: {
    backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  badgeActive: { backgroundColor: Colors.primary + '18' },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  badgeTextActive: { color: Colors.primary },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  preferencesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  prefChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  prefChipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  prefChipTextActive: { color: Colors.white },
  summaryCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 2,
    gap: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: Colors.textSecondary, fontSize: 13 },
  summaryValue: { fontSize: 13, color: Colors.textPrimary },
  summaryNote: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  button: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 8,
  },
  buttonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
});

