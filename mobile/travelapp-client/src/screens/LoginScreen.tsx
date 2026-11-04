import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView, Image, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Colors, Fonts } from '../lib/constants';
import { TravelCabLogo, TravelAppLogo } from '../components/BrandLogos';
import * as LocalAuthentication from 'expo-local-authentication';

const SAVED_USER_KEY = 'travelapp_saved_user_credentials';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Campos de inicio de sesión / registro
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedUser, setSavedUser] = useState<{ email: string; pass?: string; name?: string } | null>(null);

  // Cargar usuario recordado (sin exponer la contraseña en el campo de texto)
  React.useEffect(() => {
    async function loadSavedCredentials() {
      try {
        const raw = await AsyncStorage.getItem(SAVED_USER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.email) {
            setSavedUser(parsed);
            setEmailOrPhone(parsed.email);
          }
        }
      } catch (e) {
        console.warn('Error loading saved credentials:', e);
      }
    }
    loadSavedCredentials();
  }, []);

  const handleBiometricQuickLogin = async () => {
    if (!savedUser || !savedUser.email || !savedUser.pass) {
      Alert.alert('Acceso Biométrico', 'Iniciá sesión una primera vez con tu contraseña para activar el desbloqueo por huella o Face ID.');
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometría no disponible',
          'Tu dispositivo no tiene huella digital o Face ID configurado. Por favor ingresá tu contraseña manualmente.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Autenticación Biométrica TravelApp (${savedUser.name || savedUser.email.split('@')[0]})`,
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
      console.warn('Biometric auth error:', bioErr);
      Alert.alert('Error Biométrico', 'No se pudo verificar tu identidad biométrica. Ingresá con tu contraseña.');
      return;
    }

    handleAuthWithCredentials(savedUser.email, savedUser.pass);
  };

  const handleGoogleSignIn = () => {
    if (savedUser?.email && savedUser?.pass) {
      handleBiometricQuickLogin();
      return;
    }
    Alert.alert(
      'Ingreso con cuenta Gmail',
      'Ingresá tu correo @gmail.com y elegí una contraseña para vincular tu cuenta de forma segura.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear / Vincular Cuenta',
          onPress: () => {
            setIsForgot(false);
            setIsLogin(false);
          },
        },
      ]
    );
  };

  const handleAuthWithCredentials = async (targetEmail: string, targetPass: string) => {
    const trimmedEmail = targetEmail.trim().toLowerCase();
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, trimmedEmail, targetPass);

      if (userCred?.user) {
        try {
          await AsyncStorage.setItem(
            SAVED_USER_KEY,
            JSON.stringify({
              email: trimmedEmail,
              pass: targetPass,
              name: userCred.user.displayName || 'Pasajero',
            })
          );
        } catch (storageErr) {
          console.warn('Could not save credentials:', storageErr);
        }

        const userRef = doc(db, 'users', userCred.user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          let welcomeBonus = 0;
          try {
            const configSnap = await getDoc(doc(db, 'rewards_config', 'global'));
            if (configSnap.exists() && typeof configSnap.data().welcomePointsBonus === 'number') {
              welcomeBonus = Number(configSnap.data().welcomePointsBonus);
            }
          } catch (e) {
            console.warn('Could not read welcome bonus from rewards_config/global:', e);
          }

          await setDoc(userRef, {
            customerName: userCred.user.displayName || 'Pasajero TravelCab',
            email: trimmedEmail,
            phone: '',
            customerLevel: 1,
            customerStatus: 'Cliente',
            rewardsPoints: welcomeBonus,
            walletBalance: 0,
            hasPurchasedOrganizedTrip: false,
            role: 'passenger',
            createdAt: Timestamp.now()
          });
        }
      }
    } catch (err: any) {
      console.warn('Quick auth error:', err);
      Alert.alert('Error de Autenticación', 'No se pudo iniciar sesión con las credenciales guardadas.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    const inputVal = emailOrPhone.trim();

    if (isForgot) {
      if (!inputVal || !inputVal.includes('@')) {
        return Alert.alert('Campo requerido', 'Ingresá tu correo electrónico para restablecer la contraseña.');
      }
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, inputVal.toLowerCase());
        Alert.alert('Correo enviado', 'Te enviamos las instrucciones para restablecer tu contraseña a tu email.');
        setIsForgot(false);
        setIsLogin(true);
      } catch (err: any) {
        console.warn('Password reset error:', err);
        const msg = err.code === 'auth/user-not-found'
          ? `El correo ${inputVal} aún no está registrado. Podés crear tu cuenta tocando "Crear cuenta".`
          : 'No se pudo enviar el correo de recuperación. Verificá los datos.';
        Alert.alert('Aviso', msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!inputVal || !password) {
      return Alert.alert('Campos requeridos', 'Completá tu correo o teléfono y la contraseña.');
    }

    let finalEmail = inputVal.toLowerCase();
    if (!finalEmail.includes('@')) {
      const cleanDigits = inputVal.replace(/\D/g, '');
      finalEmail = `${cleanDigits}@pasajero.travelapp.ar`;
    }

    setLoading(true);
    try {
      let userCred;

      if (isLogin) {
        userCred = await signInWithEmailAndPassword(auth, finalEmail, password);
      } else {
        if (!name.trim()) {
          setLoading(false);
          return Alert.alert('Campo requerido', 'Ingresá tu nombre completo.');
        }
        if (!phone.trim() && !inputVal) {
          setLoading(false);
          return Alert.alert('Campo requerido', 'Ingresá tu número de teléfono.');
        }
        userCred = await createUserWithEmailAndPassword(auth, finalEmail, password);
        if (userCred.user) {
          await updateProfile(userCred.user, { displayName: name.trim() });
        }
      }

      if (userCred?.user) {
        try {
          await AsyncStorage.setItem(
            SAVED_USER_KEY,
            JSON.stringify({
              email: finalEmail,
              pass: password,
              name: name.trim() || userCred.user.displayName || 'Pasajero',
            })
          );
        } catch (storageErr) {
          console.warn('Could not save credentials:', storageErr);
        }

        const userRef = doc(db, 'users', userCred.user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          let welcomeBonus = 0;
          try {
            const configSnap = await getDoc(doc(db, 'rewards_config', 'global'));
            if (configSnap.exists() && typeof configSnap.data().welcomePointsBonus === 'number') {
              welcomeBonus = Number(configSnap.data().welcomePointsBonus);
            }
          } catch (e) {
            console.warn('Could not read welcome bonus from rewards_config/global:', e);
          }

          await setDoc(userRef, {
            customerName: name.trim() || userCred.user.displayName || 'Pasajero TravelCab',
            email: finalEmail,
            phone: phone.trim() || inputVal,
            customerLevel: 1,
            customerStatus: 'Cliente',
            rewardsPoints: welcomeBonus,
            walletBalance: 0,
            hasPurchasedOrganizedTrip: false,
            role: 'passenger',
            createdAt: Timestamp.now()
          });
        }
      }
    } catch (err: any) {
      console.warn('Client Login error:', err);
      let msg = 'Credenciales incorrectas.';
      if (err.code === 'auth/user-not-found') {
        msg = 'El usuario no está registrado. Tocá "Crear cuenta" para registrarte.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Contraseña incorrecta. Verificá tu clave o presioná "¿Olvidé mi contraseña?".';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este usuario ya está registrado. Intentá iniciar sesión con tu contraseña.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.message) {
        msg = err.message;
      }
      Alert.alert('Error de Autenticación', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          
          {/* Logo Superior Central TravelCab */}
          <View style={styles.logoHeader}>
            <TravelCabLogo size={200} textColor={Colors.white} isAccentColor={true} />
          </View>

          {/* Bienvenida y Avatar de Travis en primer plano */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Bienvenidos, coloca tus credenciales</Text>
            <View style={styles.travisAvatarBorder}>
              <Image
                source={require('../../assets/travis_primer_plano.png')}
                style={styles.travisImg}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Tarjeta Flotante Blanca */}
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>
              {isForgot ? 'Recuperar Contraseña' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Text>

            <View style={styles.formGroup}>
              {!isLogin && !isForgot && (
                <>
                  <View style={styles.inputBox}>
                    <Text style={styles.label}>Nombre completo *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Juan Pérez"
                      placeholderTextColor={Colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputBox}>
                    <Text style={styles.label}>Número de teléfono (WhatsApp) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+54 9 11 1234 5678"
                      placeholderTextColor={Colors.textMuted}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </>
              )}

              <View style={styles.inputBox}>
                <Text style={styles.label}>
                  {isLogin ? 'Correo Electrónico o Teléfono *' : 'Correo Electrónico (Opcional si usás teléfono) *'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={isLogin ? "ejemplo@email.com o +549..." : "ejemplo@email.com"}
                  placeholderTextColor={Colors.textMuted}
                  value={emailOrPhone}
                  onChangeText={setEmailOrPhone}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {!isForgot && (
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Contraseña *</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeIconBtn}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color={Colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {isLogin && !isForgot && (
                <TouchableOpacity
                  onPress={() => { setIsForgot(true); setIsLogin(false); }}
                  style={styles.forgotBtn}
                >
                  <Text style={styles.forgotText}>¿Olvidé mi contraseña?</Text>
                </TouchableOpacity>
              )}

              {/* Botón Acceso Rápido Biométrico (Huella / Face ID) */}
              {isLogin && !isForgot && savedUser && savedUser.email ? (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#10B981', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
                  onPress={handleBiometricQuickLogin}
                  disabled={loading}
                >
                  <Ionicons name="finger-print" size={22} color={Colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>
                    Ingresar con Huella / Face ID ({savedUser.email.split('@')[0]})
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* Botón Ingresar / Registro */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isForgot ? 'Enviar enlace de recuperación' : isLogin ? 'Ingresar' : 'Crear mi Cuenta'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Botón Ingresar con Google */}
              {isLogin && !isForgot && (
                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={styles.googleButtonText}>Ingresar con Google</Text>
                </TouchableOpacity>
              )}

              {/* Alternar Crear Cuenta / Iniciar Sesión */}
              <View style={styles.switchAuthRow}>
                {isForgot ? (
                  <TouchableOpacity onPress={() => { setIsForgot(false); setIsLogin(true); }}>
                    <Text style={styles.switchAuthText}>Volver a Iniciar Sesión</Text>
                  </TouchableOpacity>
                ) : isLogin ? (
                  <TouchableOpacity onPress={() => setIsLogin(false)}>
                    <Text style={styles.switchAuthText}>
                      ¿No tenés cuenta? <Text style={styles.switchAuthBold}>Crear cuenta</Text>
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setIsLogin(true)}>
                    <Text style={styles.switchAuthText}>
                      ¿Ya tenés cuenta? <Text style={styles.switchAuthBold}>Iniciá sesión</Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Contacto a soporte */}
              <View style={styles.supportBox}>
                <Text style={styles.supportLabel}>
                  ¿Tenés dudas o problemas de acceso?{' '}
                  <Text
                    style={styles.supportLink}
                    onPress={() => Linking.openURL('mailto:soporte@travelapp.ar')}
                  >
                    contactar a soporte@travelapp.ar
                  </Text>
                </Text>
              </View>

            </View>
          </View>

          {/* Footer de Login Sutil */}
          <View style={styles.footerSection}>
            <Text style={styles.copyrightText}>Todos los derechos reservados</Text>
            <View style={styles.footerLogoRow}>
              <TravelAppLogo size={110} textColor={Colors.white} isAccentColor={true} />
            </View>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.techBlueBg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  inner: {
    paddingHorizontal: 24,
    gap: 18,
    alignItems: 'center',
  },
  logoHeader: {
    alignItems: 'center',
    marginTop: 10,
  },

  // Sección de bienvenida y Travis avatar
  welcomeSection: {
    alignItems: 'center',
    gap: 12,
  },
  welcomeTitle: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  travisAvatarBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    padding: 3,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  travisImg: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },

  // Tarjeta Flotante Blanca
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 12,
  },
  cardHeaderTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    marginBottom: 18,
    textAlign: 'center',
  },
  formGroup: {
    gap: 14,
  },
  inputBox: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
  },
  eyeIconBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.accent,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
    marginTop: 2,
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
  switchAuthRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  switchAuthText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  switchAuthBold: {
    color: Colors.accent,
    fontFamily: Fonts.bold,
  },
  supportBox: {
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  supportLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  supportLink: {
    color: Colors.primary,
    fontFamily: Fonts.semiBold,
    textDecorationLine: 'underline',
  },

  // Footer Sección
  footerSection: {
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  copyrightText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.5,
  },
  footerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
