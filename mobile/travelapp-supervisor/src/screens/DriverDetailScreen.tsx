import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverItem, updateDriverComplianceAndDocs } from '../lib/supervisorService';

export default function DriverDetailScreen({ route, navigation }: any) {
  const initialDriver: DriverItem | null = route.params?.driver || null;
  const [driver, setDriver] = useState<DriverItem | null>(initialDriver);
  const [insuranceExpiry, setInsuranceExpiry] = useState(initialDriver?.insuranceExpiry || '');
  const [licenseExpiry, setLicenseExpiry] = useState(initialDriver?.licenseExpiry || '');
  const [rtoExpiry, setRtoExpiry] = useState(initialDriver?.rtoExpiry || '');
  const [savingDocs, setSavingDocs] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  if (!driver) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 12 }}>
          Conductor no encontrado
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver a la lista</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleWhatsApp = () => {
    if (!driver.phone) return;
    const cleanPhone = driver.phone.replace(/[^0-9]/g, '');
    Linking.openURL(
      `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(
        driver.name
      )},%20te%20contacto%20desde%20Supervisión%20TravelApp.`
    );
  };

  const handleCall = () => {
    if (!driver.phone) return;
    Linking.openURL(`tel:${driver.phone}`);
  };

  const handleSaveDocs = async () => {
    const cleanIns = insuranceExpiry.trim();
    const cleanLic = licenseExpiry.trim();
    const cleanRto = rtoExpiry.trim();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    const isValidDateString = (val: string) => {
      if (!val) return true;
      if (!dateRegex.test(val)) return false;
      const d = new Date(`${val}T00:00:00`);
      return !isNaN(d.getTime());
    };

    if (!isValidDateString(cleanIns) || !isValidDateString(cleanLic) || !isValidDateString(cleanRto)) {
      return Alert.alert(
        'Formato de Fecha Inválido',
        'Ingresá las fechas de vencimiento en formato AAAA-MM-DD válido (ejemplo: 2026-12-31).'
      );
    }

    setSavingDocs(true);
    try {
      await updateDriverComplianceAndDocs(driver.id, {
        insuranceExpiry: cleanIns,
        licenseExpiry: cleanLic,
        rtoExpiry: cleanRto,
      });
      setDriver({
        ...driver,
        insuranceExpiry: cleanIns,
        licenseExpiry: cleanLic,
        rtoExpiry: cleanRto,
      });
      Alert.alert(
        'Vencimientos Actualizados',
        'Las fechas de Seguro, Licencia y RTO quedaron guardadas y sincronizadas con el Semáforo de Flota.'
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudieron actualizar los vencimientos.');
    } finally {
      setSavingDocs(false);
    }
  };

  const handleToggleSuspend = async () => {
    const nextSuspended = !driver.isSuspended;
    Alert.alert(
      nextSuspended ? 'Suspender Móvil Preventivamente' : 'Reactivar Móvil en Flota',
      nextSuspended
        ? `¿Deseás suspender temporalmente a ${driver.name}? El chofer pasará a estado desconectado hasta regularizar su situación.`
        : `¿Deseás rehabilitar a ${driver.name} para operar normalmente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: nextSuspended ? 'Suspender' : 'Rehabilitar',
          style: nextSuspended ? 'destructive' : 'default',
          onPress: async () => {
            setTogglingStatus(true);
            try {
              await updateDriverComplianceAndDocs(driver.id, {
                isSuspended: nextSuspended,
                isApproved: !nextSuspended,
              });
              setDriver({
                ...driver,
                isSuspended: nextSuspended,
                isApproved: !nextSuspended,
                isOnline: nextSuspended ? false : driver.isOnline,
                status: nextSuspended ? 'Inactivo' : driver.status,
              });
            } catch (e) {
              Alert.alert('Error', 'No se pudo cambiar el estado operativo del conductor.');
            } finally {
              setTogglingStatus(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.profileHeader}>
        {driver.profilePhotoUrl ? (
          <Image
            source={{ uri: driver.profilePhotoUrl }}
            style={{ width: 68, height: 68, borderRadius: 34, marginBottom: 10, borderWidth: 2, borderColor: '#F59E0B' }}
          />
        ) : (
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#F59E0B" />
          </View>
        )}
        <Text style={styles.name}>{driver.name}</Text>
        <Text style={styles.sub}>
          {driver.id.slice(0, 8)} · {driver.vehicle} · ⭐ {(driver.rating || 5.0).toFixed(1)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  driver.status === 'Inactivo'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : driver.status === 'En Ruta'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                {
                  color:
                    driver.status === 'Inactivo'
                      ? '#EF4444'
                      : driver.status === 'En Ruta'
                      ? '#F59E0B'
                      : '#10B981',
                },
              ]}
            >
              ● {driver.status}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  driver.registrationType === 'direct'
                    ? 'rgba(56, 189, 248, 0.15)'
                    : 'rgba(168, 85, 247, 0.15)',
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: driver.registrationType === 'direct' ? '#38BDF8' : '#A855F7' },
              ]}
            >
              {driver.registrationType === 'direct'
                ? 'Alta Directa'
                : `Vinculado (${driver.supervisorCode || 'Supervisor'})`}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.wsBtn, { opacity: driver.phone ? 1 : 0.4 }]}
          onPress={handleWhatsApp}
          disabled={!driver.phone}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.wsBtnText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.callBtn, { opacity: driver.phone ? 1 : 0.4 }]}
          onPress={handleCall}
          disabled={!driver.phone}
        >
          <Ionicons name="call-outline" size={18} color="#FFFFFF" />
          <Text style={styles.callBtnText}>Llamar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('FleetMap', { driverId: driver.id })}
        >
          <Ionicons name="map-outline" size={18} color="#0F172A" />
          <Text style={styles.mapBtnText}>Ver en Mapa</Text>
        </TouchableOpacity>
      </View>

      {/* Foto Real del Vehículo */}
      {driver.vehiclePhotoUrl ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fotografía Real de la Unidad ({driver.plate})</Text>
          <Image
            source={{ uri: driver.vehiclePhotoUrl }}
            style={{ width: '100%', height: 170, borderRadius: 12, backgroundColor: '#0F172A' }}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Financial Overview (Real) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Estado Financiero del Chofer</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Saldo Recaudación / Billetera:</Text>
          <Text style={styles.rowValue}>${(driver.cashBalance || 0).toLocaleString('es-AR')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Viajes Concretados (Mes):</Text>
          <Text style={styles.rowValue}>{driver.tripsMonth || 0} viajes</Text>
        </View>
      </View>

      {/* Vehicle Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Vehículo & Registro</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Móvil Registrado:</Text>
          <Text style={styles.rowValue}>{driver.vehicle}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Dominio / Patente:</Text>
          <Text style={styles.rowValue}>{driver.plate || 'No especificada'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Modalidad de Alta:</Text>
          <Text style={styles.rowValue}>
            {driver.registrationType === 'direct'
              ? 'Alta Directa'
              : `Supervisor (${driver.supervisorCode || 'Asignado'})`}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Teléfono:</Text>
          <Text style={styles.rowValue}>{driver.phone || 'No registrado'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Conexión en Vivo:</Text>
          <Text style={[styles.rowValue, { color: driver.isOnline ? '#10B981' : '#64748B' }]}>
            {driver.isOnline ? 'Conectado / En Línea' : 'Desconectado'}
          </Text>
        </View>
      </View>

      {/* Semáforo Documental: Gestión de Vencimientos */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Vencimientos Documentales (Formato AAAA-MM-DD)</Text>

        <Text style={styles.inputLabel}>Seguro Comercial Automotor</Text>
        <TextInput
          style={styles.docInput}
          placeholder="Ej: 2026-12-31"
          placeholderTextColor="#64748B"
          value={insuranceExpiry}
          onChangeText={setInsuranceExpiry}
        />

        <Text style={styles.inputLabel}>Licencia Profesional de Conducir</Text>
        <TextInput
          style={styles.docInput}
          placeholder="Ej: 2027-05-15"
          placeholderTextColor="#64748B"
          value={licenseExpiry}
          onChangeText={setLicenseExpiry}
        />

        <Text style={styles.inputLabel}>Revisión Técnica Obligatoria (RTO / VTV)</Text>
        <TextInput
          style={styles.docInput}
          placeholder="Ej: 2026-11-20"
          placeholderTextColor="#64748B"
          value={rtoExpiry}
          onChangeText={setRtoExpiry}
        />

        <TouchableOpacity
          style={styles.saveDocsBtn}
          onPress={handleSaveDocs}
          disabled={savingDocs}
          activeOpacity={0.85}
        >
          {savingDocs ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={16} color="#FFFFFF" />
              <Text style={styles.saveDocsBtnText}>Guardar Vencimientos en Semáforo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Control Operativo de Guardia */}
      <TouchableOpacity
        style={[
          styles.suspendBtn,
          { backgroundColor: driver.isSuspended ? '#10B981' : 'rgba(239, 68, 68, 0.15)', borderColor: driver.isSuspended ? '#10B981' : '#EF4444' },
        ]}
        onPress={handleToggleSuspend}
        disabled={togglingStatus}
        activeOpacity={0.85}
      >
        {togglingStatus ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name={driver.isSuspended ? 'checkmark-circle-outline' : 'ban-outline'}
              size={18}
              color={driver.isSuspended ? '#FFFFFF' : '#EF4444'}
            />
            <Text style={[styles.suspendBtnText, { color: driver.isSuspended ? '#FFFFFF' : '#EF4444' }]}>
              {driver.isSuspended ? 'Rehabilitar Unidad en Flota' : 'Suspender Preventivamente Unidad'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  sub: { color: '#94A3B8', fontSize: 12, marginTop: 2, marginBottom: 8 },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  wsBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  wsBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  callBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  callBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  mapBtn: {
    flex: 1.2,
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  mapBtnText: { color: '#0F172A', fontWeight: '800', fontSize: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  sectionTitle: { color: '#F59E0B', fontSize: 13, fontWeight: '800', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  rowLabel: { color: '#94A3B8', fontSize: 12 },
  rowValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  inputLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  docInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 13,
  },
  saveDocsBtn: {
    marginTop: 14,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveDocsBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  suspendBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  suspendBtnText: { fontSize: 13, fontWeight: '800' },
});
