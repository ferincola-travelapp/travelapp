import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal, ScrollView, Linking, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, setDoc, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Colors } from '../lib/constants';
import { TravelCabLogo, TravelAppLogo } from '../components/BrandLogos';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

const SAVED_DRIVER_KEY = 'travelapp_driver_saved_credentials';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedDriver, setSavedDriver] = useState<{ email: string; pass: string; name?: string } | null>(null);

  // Cargar credenciales guardadas del conductor
  React.useEffect(() => {
    async function loadSavedDriver() {
      try {
        const raw = await AsyncStorage.getItem(SAVED_DRIVER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.email) {
            setSavedDriver(parsed);
            setEmail(parsed.email);
          }
        }
      } catch (e) {
        console.warn('Error loading saved driver credentials:', e);
      }
    }
    loadSavedDriver();
  }, []);

  const handleBiometricLogin = async () => {
    if (!savedDriver || !savedDriver.email || !savedDriver.pass) {
      Alert.alert('Acceso Biométrico', 'Iniciá sesión una primera vez con tu contraseña para activar el desbloqueo por huella o Face ID.');
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometría no disponible',
          'Tu dispositivo no tiene huella/rostro configurado. Por favor ingresá tu contraseña manualmente.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Autenticación Biométrica Conductor (${savedDriver.name || savedDriver.email.split('@')[0]})`,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        if (result.error !== 'user_cancel' && result.error !== 'app_cancel') {
          Alert.alert('Autenticación fallida', 'No se reconoció la huella o rostro. Podés ingresar tu clave manualmente.');
        }
        return;
      }
    } catch (bioErr) {
      console.log('Biometric auth error:', bioErr);
      Alert.alert('Error Biométrico', 'No se pudo verificar tu identidad biométrica. Ingresá tu clave manualmente.');
      return;
    }

    setEmail(savedDriver.email);
    handleLoginDirect(savedDriver.email, savedDriver.pass);
  };

  // Registro del Conductor - Asistente Onboarding de 4 Pasos
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [regStep, setRegStep] = useState(1);

  // Paso 1: Datos Personales, Clave y Foto de Perfil
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [supervisorReferralCode, setSupervisorReferralCode] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  // Paso 2: Dirección y Datos Fiscales / CBU
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [floorApp, setFloorApp] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [taxIdNumber, setTaxIdNumber] = useState(''); // CUIT/CUIL
  const [cbuCvu, setCbuCvu] = useState('');

  // Paso 3: Datos del Vehículo & Fotos de Documentación
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  // Fotos de Documentos Requeridos
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState<string | null>(null);
  const [driverLicenseUri, setDriverLicenseUri] = useState<string | null>(null);
  const [cedulaUri, setCedulaUri] = useState<string | null>(null);
  const [rtoUri, setRtoUri] = useState<string | null>(null);
  const [seguroUri, setSeguroUri] = useState<string | null>(null);

  // Paso 4: Mercado Pago Conexión & Split
  const [mpEmail, setMpEmail] = useState('');
  const [mpLinked, setMpLinked] = useState(false);
  const [linkingMp, setLinkingMp] = useState(false);

  const [submittingReg, setSubmittingReg] = useState(false);

  // --- Handlers de Cámara y Galería para Imagenes ---
  const handlePickImage = async (onSelected: (uri: string) => void) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        return Alert.alert('Permiso Requerido', 'Necesitamos acceso a tus fotos para seleccionar el archivo.');
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const dataUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        onSelected(dataUrl);
      }
    } catch (e) {
      console.warn('Error picking image:', e);
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const handleTakePhoto = async (onSelected: (uri: string) => void) => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        return Alert.alert('Permiso de Cámara', 'Necesitamos acceso a la cámara para tomar la fotografía.');
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const dataUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        onSelected(dataUrl);
      }
    } catch (e) {
      console.warn('Error taking photo:', e);
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const handleLoginDirect = async (targetEmail: string, targetPass: string) => {
    const trimmedEmail = targetEmail.trim().toLowerCase();
    if (!trimmedEmail || !targetPass) return Alert.alert('Campos requeridos', 'Ingresá tu email y contraseña.');
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, trimmedEmail, targetPass);

      if (userCred?.user) {
        // Guardar credenciales en AsyncStorage para sesión permanente
        try {
          await AsyncStorage.setItem(
            SAVED_DRIVER_KEY,
            JSON.stringify({
              email: trimmedEmail,
              pass: targetPass,
              name: userCred.user.displayName || 'Conductor',
            })
          );
        } catch (storageErr) {
          console.warn('Could not save driver credentials:', storageErr);
        }

        const { getDoc } = await import('firebase/firestore');
        const driverRef = doc(db, 'drivers', userCred.user.uid);
        const snap = await getDoc(driverRef);
        if (!snap.exists()) {
          const defaultFirstName = userCred.user.displayName
            ? userCred.user.displayName.trim().split(/\s+/)[0]
            : trimmedEmail.split('@')[0];
          await setDoc(driverRef, {
            id: userCred.user.uid,
            firstName: defaultFirstName,
            lastName: '',
            name: userCred.user.displayName || defaultFirstName,
            email: trimmedEmail,
            phone: userCred.user.phoneNumber || '',
            status: 'Pendiente',
            registrationType: 'direct',
            allowedServiceModes: ['mu', 'aci', 'transfers'],
            maxNegativeBalance: -10000,
            currentCommissionBalance: 0,
            rating: 5.0,
            totalTrips: 0,
            createdAt: Date.now(),
          });
        }
      }
    } catch (err: any) {
      console.warn('Driver login error:', err);
      let detail = 'Email o contraseña incorrectos. Verificá tu clave.';
      if (err.code === 'auth/user-not-found') {
        detail = 'El correo ingresado no está registrado. Si sos nuevo conductor, tocá "Solicitar Alta de Conductor" abajo.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        detail = 'Contraseña incorrecta. Si no la recordás, tocá "¿Olvidaste tu contraseña?" abajo.';
      } else if (err.code === 'auth/too-many-requests') {
        detail = 'Demasiados intentos fallidos. Intentá más tarde o restablecé tu clave.';
      } else if (err.message) {
        detail = err.message;
      }
      Alert.alert('Error de Inicio de Sesión', detail);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    handleLoginDirect(email, password);
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return Alert.alert('Email requerido', 'Ingresá tu correo electrónico para enviarte el enlace de recuperación.');
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert('Correo Enviado', `Enviamos un enlace de recuperación a ${trimmedEmail}. Revisá tu bandeja de entrada.`);
    } catch (err: any) {
      console.warn('Password reset error:', err);
      const msg = err.code === 'auth/user-not-found'
        ? `El correo ${trimmedEmail} no está registrado como conductor. Podés postularte tocando "Solicitar Alta de Conductor".`
        : (err.message || 'No pudimos enviar el correo de recuperación.');
      Alert.alert('Aviso de Autenticación', msg);
    }
  };

  const handleLinkMercadoPago = async () => {
    if (!mpEmail || !mpEmail.includes('@')) {
      return Alert.alert('Email inválido', 'Por favor ingresá un email válido de Mercado Pago.');
    }
    setLinkingMp(true);
    try {
      const authUrl = `https://auth.mercadopago.com.ar/authorization?client_id=6658945348079033&response_type=code&platform_id=mp&state=driver_${encodeURIComponent(mpEmail)}&redirect_uri=${encodeURIComponent('https://travelapp.ar/api/mp/oauth/callback')}`;
      const canOpen = await Linking.canOpenURL(authUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(authUrl);
        setMpLinked(true);
      } else {
        Alert.alert('Error', 'No se pudo abrir el navegador para autorizar Mercado Pago.');
      }
    } catch (e) {
      console.log('Error launching MP OAuth:', e);
      Alert.alert('Error', 'No se pudo iniciar la autorización con Mercado Pago.');
    } finally {
      setLinkingMp(false);
    }
  };

  const handleNextStep = () => {
    if (regStep === 1) {
      if (!firstName || !lastName || !dob || !regEmail || !regPhone || !regPassword) {
        return Alert.alert('Campos requeridos', 'Por favor completa todos tus datos personales y elegí una contraseña.');
      }
      if (!regEmail.includes('@')) {
        return Alert.alert('Email inválido', 'Por favor ingresa un email válido.');
      }
      if (regPassword.length < 6) {
        return Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      }
    } else if (regStep === 2) {
      if (!street || !streetNumber || !city || !province || !postalCode || !taxIdNumber || !cbuCvu) {
        return Alert.alert('Campos requeridos', 'Por favor completa tus datos fiscales, domicilio y CBU/CVU.');
      }
    } else if (regStep === 3) {
      if (!vehicleMake || !vehicleModel || !vehicleYear || !vehicleColor || !vehiclePlate) {
        return Alert.alert('Campos requeridos', 'Por favor completa todos los datos de tu vehículo.');
      }
      if (!vehiclePhotoUri) {
        return Alert.alert('Foto del Vehículo Requerida', 'Por favor cargá una foto real exterior de tu vehículo (donde se vea la patente) para que los pasajeros puedan identificarlo.');
      }
    }
    setRegStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setRegStep(prev => prev - 1);
  };

  const handleRegisterSubmit = async () => {
    setSubmittingReg(true);
    try {
      const cleanEmail = regEmail.trim().toLowerCase();
      let userUid = '';

      try {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
        userUid = userCred.user.uid;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // Intentar iniciar sesión para recuperar el UID legítimo
          try {
            const loggedCred = await signInWithEmailAndPassword(auth, cleanEmail, regPassword);
            userUid = loggedCred.user.uid;
          } catch (loginErr: any) {
            throw new Error('Este correo ya está registrado con otra contraseña. Por favor iniciá sesión o restablecé tu clave.');
          }
        } else {
          throw authErr;
        }
      }

      if (!userUid) {
        throw new Error('No se pudo verificar la sesión de conductor.');
      }

      const driverStatus = 'En Revisión';
      const cleanSupervisorCode = supervisorReferralCode.trim().toUpperCase();
      const registrationType = cleanSupervisorCode ? 'supervisor' : 'direct';

      // 1. Guardar en `drivers` colección de Firestore (soporta Alta Directa y Alta por Supervisor)
      await setDoc(doc(db, 'drivers', userUid), {
        id: userUid,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: cleanEmail,
        phone: regPhone.trim(),
        photoUrl: profilePhotoUri || undefined,
        vehiclePhotoUrl: vehiclePhotoUri || undefined,
        status: driverStatus,
        registrationType,
        allowedServiceModes: ['mu', 'aci', 'transfers'],
        maxNegativeBalance: -10000,
        currentCommissionBalance: 0,
        rating: 5.0,
        totalTrips: 0,
        taxIdNumber,
        cbuCvu,
        address: { street, streetNumber, floorApp, city, province, postalCode },
        activeVehicle: {
          brand: `${vehicleMake} ${vehicleModel}`.trim(),
          model: vehicleModel,
          plate: vehiclePlate.trim().toUpperCase(),
          color: vehicleColor,
          year: Number(vehicleYear) || 2024,
          photoUrl: vehiclePhotoUri || undefined,
        },
        documents: {
          vehiclePhoto: vehiclePhotoUri || undefined,
          driverLicense: driverLicenseUri || undefined,
          cedula: cedulaUri || undefined,
          rto: rtoUri || undefined,
          seguro: seguroUri || undefined,
        },
        mercadoPagoEmail: mpEmail || undefined,
        mercadoPagoLinked: mpLinked,
        supervisorCode: cleanSupervisorCode || null,
        createdAt: Date.now(),
      });

      // 2. Guardar en `partner_applications` para expediente en Concorde 360
      try {
        await addDoc(collection(db, 'partner_applications'), {
          userId: userUid,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          dob,
          email: cleanEmail,
          phone: regPhone.trim(),
          photoUrl: profilePhotoUri || undefined,
          vehiclePhotoUrl: vehiclePhotoUri || undefined,
          registrationType,
          supervisorCode: cleanSupervisorCode || null,
          address: { street, streetNumber, floorApp, city, province, postalCode },
          taxIdNumber,
          cbuCvu,
          vehicle: {
            brand: `${vehicleMake} ${vehicleModel}`.trim(),
            year: vehicleYear,
            color: vehicleColor,
            plate: vehiclePlate.trim().toUpperCase(),
            photoUrl: vehiclePhotoUri || undefined,
          },
          documents: {
            vehiclePhoto: vehiclePhotoUri || undefined,
            driverLicense: driverLicenseUri || undefined,
            cedula: cedulaUri || undefined,
            rto: rtoUri || undefined,
            seguro: seguroUri || undefined,
          },
          mercadoPagoEmail: mpEmail || undefined,
          mercadoPagoLinked: mpLinked,
          status: 'pending',
          createdAt: Timestamp.now()
        });
      } catch (appErr) {
        console.warn('partner_applications notice:', appErr);
      }

      // Guardar credenciales para acceso permanente
      try {
        await AsyncStorage.setItem(
          SAVED_DRIVER_KEY,
          JSON.stringify({
            email: cleanEmail,
            pass: regPassword,
            name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          })
        );
      } catch (storageErr) {
        console.warn('Could not save driver credentials:', storageErr);
      }

      // Reiniciar formulario
      setRegisterModalVisible(false);
      setRegStep(1);
      setFirstName(''); setLastName(''); setDob(''); setRegEmail(''); setRegPassword(''); setRegPhone('');
      setProfilePhotoUri(null); setVehiclePhotoUri(null); setStreet(''); setStreetNumber(''); setFloorApp(''); setCity('');
      setProvince(''); setPostalCode(''); setTaxIdNumber(''); setCbuCvu(''); setVehicleMake('');
      setVehicleModel(''); setVehicleYear(''); setVehicleColor(''); setVehiclePlate('');
      setDriverLicenseUri(null); setCedulaUri(null); setRtoUri(null); setSeguroUri(null);
      setMpEmail(''); setMpLinked(false);

      Alert.alert(
        '¡Registro Completado! 🚗',
        `Tu solicitud (${registrationType === 'direct' ? 'Alta Directa' : 'Vinculada a Supervisor'}) fue procesada correctamente. El equipo de Concorde 360 revisará tu documentación.`
      );
    } catch (err: any) {
      console.error('Error submitting driver onboarding:', err);
      Alert.alert('Error en el Registro', err?.message || 'No pudimos registrar tu solicitud. Intentá de nuevo.');
    } finally {
      setSubmittingReg(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <TravelCabLogo size={220} textColor="#0B192C" />
          <Text style={styles.subtitle}>Portal Oficial de Conductores</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar sesión</Text>
          <Text style={styles.cardSubtitle}>Accedé con tus credenciales de socio conductor</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="conductor@travelapp.ar"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInputFlex,
                    { color: '#0F172A', fontSize: 16 },
                    !showPassword && Platform.OS === 'android' && { fontFamily: 'sans-serif' }
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.eyeButton} 
                  onPress={() => setShowPassword(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={showPassword ? "eye" : "eye-off-outline"} 
                    size={22} 
                    color={showPassword ? Colors.primary : Colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            {/* Botón Acceso Rápido Biométrico (Huella / Face ID) */}
            {savedDriver && savedDriver.email ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#10B981', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <Ionicons name="finger-print" size={22} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>
                  Ingresar con Huella / Face ID ({savedDriver.email.split('@')[0]})
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Ingresar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleForgotPassword}
              style={{ marginTop: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Quicksand-Medium', color: Colors.primary }}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.registerLink} 
          onPress={() => setRegisterModalVisible(true)}
        >
          <Text style={styles.registerLinkText}>
            ¿No tenés cuenta de socio? <Text style={styles.registerLinkHighlight}>Registrate acá</Text>
          </Text>
        </TouchableOpacity>

        {/* Footer del Ecosistema */}
        <View style={{ alignItems: 'center', marginTop: 24, gap: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Quicksand-Bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Miembro del ecosistema
          </Text>
          <TravelAppLogo size={120} textColor="#0B192C" />
        </View>
      </View>

      {/* MODAL DE REGISTRO MULTIPASO / ONBOARDING CON CÁMARA Y ARCHIVOS */}
      <Modal
        visible={registerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setRegisterModalVisible(false); setRegStep(1); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Onboarding de Conductor</Text>
              <Text style={styles.stepIndicator}>Paso {regStep} de 4</Text>
            </View>
            
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(regStep / 4) * 100}%` }]} />
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              
              {/* PASO 1: Datos Personales, Clave & Foto de Perfil con Cámara */}
              {regStep === 1 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepTitle}>Paso 1: Foto de Perfil y Contacto</Text>

                  {/* Uploader Foto de Perfil */}
                  <View style={styles.photoUploaderBox}>
                    <View style={styles.photoAvatarContainer}>
                      {profilePhotoUri ? (
                        <Image source={{ uri: profilePhotoUri }} style={styles.photoAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={40} color="#94A3B8" />
                      )}
                    </View>
                    <Text style={styles.photoUploaderTitle}>Foto de Perfil del Conductor</Text>
                    <Text style={styles.photoUploaderSub}>Tomá una foto clara de tu rostro o cargá desde tu galería.</Text>
                    
                    <View style={styles.uploadButtonsRow}>
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => handleTakePhoto(setProfilePhotoUri)}>
                        <Ionicons name="camera" size={16} color={Colors.white} />
                        <Text style={styles.uploadBtnText}>Tomar Foto 📸</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.uploadSecondaryBtn} onPress={() => handlePickImage(setProfilePhotoUri)}>
                        <Ionicons name="image" size={16} color={Colors.primary} />
                        <Text style={styles.uploadSecondaryBtnText}>Galería 🖼️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Nombre *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. Juan"
                      placeholderTextColor={Colors.textMuted}
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Apellido *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. Pérez"
                      placeholderTextColor={Colors.textMuted}
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Fecha de Nacimiento (DD/MM/AAAA) *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. 15/08/1990"
                      placeholderTextColor={Colors.textMuted}
                      value={dob}
                      onChangeText={setDob}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Correo Electrónico *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="juan.perez@gmail.com"
                      placeholderTextColor={Colors.textMuted}
                      value={regEmail}
                      onChangeText={setRegEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Contraseña de Ingreso (mín. 6 caracteres) *</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.passwordInputFlex,
                          { color: '#0F172A', fontSize: 16 },
                          !showRegPassword && Platform.OS === 'android' && { fontFamily: 'sans-serif' }
                        ]}
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textMuted}
                        value={regPassword}
                        onChangeText={setRegPassword}
                        secureTextEntry={!showRegPassword}
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity 
                        style={styles.eyeButton} 
                        onPress={() => setShowRegPassword(prev => !prev)}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={showRegPassword ? "eye" : "eye-off-outline"} 
                          size={22} 
                          color={showRegPassword ? Colors.primary : Colors.textMuted} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Teléfono de Contacto (WhatsApp) *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="+54 9 11 1234-5678"
                      placeholderTextColor={Colors.textMuted}
                      value={regPhone}
                      onChangeText={setRegPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Modalidad de Alta (Directa o Supervisor)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Dejá vacío para Alta Directa o ingresá Código Supervisor"
                      placeholderTextColor={Colors.textMuted}
                      value={supervisorReferralCode}
                      onChangeText={(val) => setSupervisorReferralCode(val.toUpperCase())}
                      autoCapitalize="characters"
                    />
                    <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 4 }}>
                      {supervisorReferralCode.trim()
                        ? `✓ Vinculación por Supervisor (${supervisorReferralCode.trim()})`
                        : '✓ Alta Directa en Concorde 360 (no requiere código de supervisor)'}
                    </Text>
                  </View>
                </View>
              )}

              {/* PASO 2: Domicilio y Datos Fiscales */}
              {regStep === 2 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepTitle}>Paso 2: Domicilio, CUIT y CBU de Cobro</Text>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 2 }]}>
                      <Text style={styles.formLabel}>Calle *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Av. Corrientes"
                        placeholderTextColor={Colors.textMuted}
                        value={street}
                        onChangeText={setStreet}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabel}>Altura *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="1234"
                        placeholderTextColor={Colors.textMuted}
                        value={streetNumber}
                        onChangeText={setStreetNumber}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Piso / Departamento (Opcional)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="4º B"
                      placeholderTextColor={Colors.textMuted}
                      value={floorApp}
                      onChangeText={setFloorApp}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabel}>Localidad / Ciudad *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Tucumán / CABA"
                        placeholderTextColor={Colors.textMuted}
                        value={city}
                        onChangeText={setCity}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabel}>Provincia *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Tucumán"
                        placeholderTextColor={Colors.textMuted}
                        value={province}
                        onChangeText={setProvince}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabel}>Código Postal *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="4000"
                        placeholderTextColor={Colors.textMuted}
                        value={postalCode}
                        onChangeText={setPostalCode}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabel}>CUIT / CUIL *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="20-34567890-9"
                        placeholderTextColor={Colors.textMuted}
                        value={taxIdNumber}
                        onChangeText={setTaxIdNumber}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>CBU / CVU / Alias de Cobro *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="0000003100012345678901 o chofer.travelapp"
                      placeholderTextColor={Colors.textMuted}
                      value={cbuCvu}
                      onChangeText={setCbuCvu}
                    />
                  </View>
                </View>
              )}

              {/* PASO 3: Vehículo y Captura de Documentos */}
              {regStep === 3 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepTitle}>Paso 3: Vehículo y Carga de Documentación</Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Marca *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. Fiat / Volkswagen / Toyota"
                      placeholderTextColor={Colors.textMuted}
                      value={vehicleMake}
                      onChangeText={setVehicleMake}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Modelo *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. Cronos / Gol Trend / Corolla"
                      placeholderTextColor={Colors.textMuted}
                      value={vehicleModel}
                      onChangeText={setVehicleModel}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabel}>Año *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="2024"
                        placeholderTextColor={Colors.textMuted}
                        value={vehicleYear}
                        onChangeText={setVehicleYear}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabel}>Color *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Gris / Blanco"
                        placeholderTextColor={Colors.textMuted}
                        value={vehicleColor}
                        onChangeText={setVehicleColor}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Patente / Dominio *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej. AF 123 JK"
                      placeholderTextColor={Colors.textMuted}
                      value={vehiclePlate}
                      onChangeText={setVehiclePlate}
                      autoCapitalize="characters"
                    />
                  </View>

                  {/* Sección de Carga de Documentación con Cámara/Galería */}
                  <View style={styles.docsSectionBox}>
                    <Text style={styles.docsSectionTitle}>📸 Foto Real del Vehículo y Documentación</Text>

                    {/* Item 0: Foto Real del Vehículo (Visible al Pasajero) */}
                    <View style={styles.docItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docItemTitle}>Foto Real del Auto (Exterior con Patente) *</Text>
                        <Text style={styles.docItemStatus}>
                          {vehiclePhotoUri ? '✓ Foto real del vehículo cargada' : 'Obligatoria: se mostrará al pasajero'}
                        </Text>
                      </View>
                      <View style={styles.docBtnRow}>
                        <TouchableOpacity style={styles.docMiniBtn} onPress={() => handleTakePhoto(setVehiclePhotoUri)}>
                          <Ionicons name="camera" size={14} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.docMiniSecBtn} onPress={() => handlePickImage(setVehiclePhotoUri)}>
                          <Ionicons name="image" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Item 1: Licencia de Conducir */}
                    <View style={styles.docItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docItemTitle}>Licencia de Conducir (Frente/Dorso)</Text>
                        <Text style={styles.docItemStatus}>
                          {driverLicenseUri ? '✓ Imagen de Licencia cargada' : 'Cargá foto de tu registro'}
                        </Text>
                      </View>
                      <View style={styles.docBtnRow}>
                        <TouchableOpacity style={styles.docMiniBtn} onPress={() => handleTakePhoto(setDriverLicenseUri)}>
                          <Ionicons name="camera" size={14} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.docMiniSecBtn} onPress={() => handlePickImage(setDriverLicenseUri)}>
                          <Ionicons name="image" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Item 2: Cédula Verde/Azul */}
                    <View style={styles.docItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docItemTitle}>Cédula Verde / Azul</Text>
                        <Text style={styles.docItemStatus}>
                          {cedulaUri ? '✓ Imagen de Cédula cargada' : 'Cargá foto de la cédula del auto'}
                        </Text>
                      </View>
                      <View style={styles.docBtnRow}>
                        <TouchableOpacity style={styles.docMiniBtn} onPress={() => handleTakePhoto(setCedulaUri)}>
                          <Ionicons name="camera" size={14} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.docMiniSecBtn} onPress={() => handlePickImage(setCedulaUri)}>
                          <Ionicons name="image" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Item 3: VTV / RTO */}
                    <View style={styles.docItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docItemTitle}>VTV / RTO Obligatoria</Text>
                        <Text style={styles.docItemStatus}>
                          {rtoUri ? '✓ Comprobante VTV cargado' : 'Cargá foto de la oblea o certificado VTV'}
                        </Text>
                      </View>
                      <View style={styles.docBtnRow}>
                        <TouchableOpacity style={styles.docMiniBtn} onPress={() => handleTakePhoto(setRtoUri)}>
                          <Ionicons name="camera" size={14} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.docMiniSecBtn} onPress={() => handlePickImage(setRtoUri)}>
                          <Ionicons name="image" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Item 4: Póliza de Seguro */}
                    <View style={styles.docItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docItemTitle}>Póliza de Seguro de Transporte</Text>
                        <Text style={styles.docItemStatus}>
                          {seguroUri ? '✓ Póliza de seguro cargada' : 'Cargá comprobante de seguro vigente'}
                        </Text>
                      </View>
                      <View style={styles.docBtnRow}>
                        <TouchableOpacity style={styles.docMiniBtn} onPress={() => handleTakePhoto(setSeguroUri)}>
                          <Ionicons name="camera" size={14} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.docMiniSecBtn} onPress={() => handlePickImage(setSeguroUri)}>
                          <Ionicons name="image" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* PASO 4: Vinculación Mercado Pago */}
              {regStep === 4 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepTitle}>Paso 4: Conexión de Cobros Mercado Pago</Text>
                  
                  <Text style={styles.stepSubtitle}>
                    Para procesar las tarifas con cobro digital y acreditación neta directa, conectá tu cuenta de Mercado Pago.
                  </Text>

                  <View style={styles.mpConnectCard}>
                    <View style={styles.mpBadgeRow}>
                      <Ionicons name="card" size={24} color="#009EE3" />
                      <Text style={styles.mpConnectTitle}>Mercado Pago Split</Text>
                    </View>

                    {mpLinked ? (
                      <View style={styles.mpSuccessBox}>
                        <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mpSuccessTitle}>Cuenta Conectada</Text>
                          <Text style={styles.mpSuccessSub}>{mpEmail}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setMpLinked(false)}>
                          <Text style={styles.mpChangeLink}>Cambiar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ width: '100%', gap: 10 }}>
                        <TextInput
                          style={styles.formInput}
                          placeholder="Tu email en Mercado Pago"
                          placeholderTextColor={Colors.textMuted}
                          value={mpEmail}
                          onChangeText={setMpEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />

                        <TouchableOpacity 
                          style={styles.mpConnectBtn} 
                          onPress={handleLinkMercadoPago}
                          disabled={linkingMp}
                        >
                          {linkingMp ? (
                            <ActivityIndicator color={Colors.white} />
                          ) : (
                            <>
                              <Ionicons name="link" size={18} color={Colors.white} />
                              <Text style={styles.mpConnectBtnText}>Autorizar Mercado Pago OAuth</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}

            </ScrollView>

            {/* Controles de Navegación del Modal */}
            <View style={styles.modalFooter}>
              {regStep > 1 && (
                <TouchableOpacity style={styles.prevBtn} onPress={handlePrevStep}>
                  <Text style={styles.prevBtnText}>Anterior</Text>
                </TouchableOpacity>
              )}

              {regStep < 4 ? (
                <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep}>
                  <Text style={styles.nextBtnText}>Siguiente ➔</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.submitBtn, submittingReg && { opacity: 0.6 }]} 
                  onPress={handleRegisterSubmit}
                  disabled={submittingReg}
                >
                  {submittingReg ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.submitBtnText}>Finalizar Onboarding 🚀</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Bold',
    color: Colors.primary,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Quicksand-Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textDark,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textDark,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: 'Quicksand-Bold',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#475569',
    fontSize: 13,
    fontFamily: 'Quicksand-Medium',
  },
  registerLinkHighlight: {
    fontFamily: 'Quicksand-Bold',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textDark,
  },
  stepIndicator: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: Colors.primary,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0F4C35',
  },
  formScroll: {
    maxHeight: 450,
  },
  stepContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
    lineHeight: 18,
  },
  photoUploaderBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  photoAvatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  photoUploaderTitle: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textDark,
  },
  photoUploaderSub: {
    fontSize: 11,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  uploadBtn: {
    backgroundColor: '#0F4C35',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
  },
  uploadSecondaryBtn: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  uploadSecondaryBtnText: {
    color: Colors.primary,
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
  },
  docsSectionBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginTop: 10,
  },
  docsSectionTitle: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textDark,
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  docItemTitle: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textDark,
  },
  docItemStatus: {
    fontSize: 10,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
    marginTop: 2,
  },
  docBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  docMiniBtn: {
    backgroundColor: '#0F4C35',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docMiniSecBtn: {
    backgroundColor: '#E8F5E9',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textDark,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textDark,
  },
  mpConnectCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  mpBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mpConnectTitle: {
    fontSize: 15,
    fontFamily: 'Quicksand-Bold',
    color: '#0369A1',
  },
  mpConnectBtn: {
    backgroundColor: '#009EE3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  mpConnectBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
  },
  mpSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success,
    width: '100%',
  },
  mpSuccessTitle: {
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
    color: Colors.textDark,
  },
  mpSuccessSub: {
    fontSize: 11,
    fontFamily: 'Quicksand-Medium',
    color: Colors.textMuted,
  },
  mpChangeLink: {
    fontSize: 11,
    fontFamily: 'Quicksand-Bold',
    color: Colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  prevBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  prevBtnText: {
    color: Colors.textDark,
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
  },
  nextBtn: {
    flex: 1,
    backgroundColor: '#0F4C35',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#0F4C35',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: 'Quicksand-Bold',
  },

  // Contenedor de contraseña con botón de ojo (Show/Hide Password)
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingRight: 12,
  },
  passwordInputFlex: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textDark,
  },
  eyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
