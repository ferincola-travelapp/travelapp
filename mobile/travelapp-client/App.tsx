import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet, Text, Animated, ImageBackground } from 'react-native';
import * as Updates from 'expo-updates';
import { useFonts, Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import { Ionicons } from '@expo/vector-icons';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors, Fonts } from './src/lib/constants';
import { TravelCabLogo, TravelAppLogo } from './src/components/BrandLogos';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    'Quicksand-Regular': Quicksand_400Regular,
    'Quicksand-Medium': Quicksand_500Medium,
    'Quicksand-SemiBold': Quicksand_600SemiBold,
    'Quicksand-Bold': Quicksand_700Bold,
  });

  useEffect(() => {
    async function checkOTA() {
      try {
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        }
      } catch (e) {
        // Silencioso en caso de red inestable
      }
    }
    checkOTA();
  }, []);

  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const [activeIcon, setActiveIcon] = useState<'car' | 'airplane' | 'bed' | 'compass' | 'briefcase' | 'logo'>('car');
  const iconAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Secuencia animada de iconos (movilidad, aviones, hoteles, excursiones, maletas, logo final)
    const t1 = setTimeout(() => setActiveIcon('airplane'), 700);
    const t2 = setTimeout(() => setActiveIcon('bed'), 1400);
    const t3 = setTimeout(() => setActiveIcon('compass'), 2100);
    const t4 = setTimeout(() => setActiveIcon('briefcase'), 2800);
    const t5 = setTimeout(() => setActiveIcon('logo'), 3500);

    // Desvanecer splash a los 5200ms
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 5200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    // Animación de pulso/rebote al cambiar de icono
    iconAnim.setValue(0.2);
    Animated.spring(iconAnim, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [activeIcon]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <RootNavigator />

        {showSplash && (
          <Animated.View style={[styles.splashOverlay, { opacity: splashOpacity }]}>
            <ImageBackground
              source={require('./assets/splash-bg.jpg')}
              style={styles.backgroundImage}
              resizeMode="cover"
            >
              <View style={styles.darkMask}>
                {/* Logo Central o Icono Animado */}
                <View style={styles.centerContainer}>
                  <Animated.View style={[styles.iconBox, { transform: [{ scale: iconAnim }] }]}>
                    {activeIcon === 'car' && (
                      <Ionicons name="car-outline" size={90} color={Colors.white} />
                    )}
                    {activeIcon === 'airplane' && (
                      <Ionicons name="airplane-outline" size={90} color={Colors.white} />
                    )}
                    {activeIcon === 'bed' && (
                      <Ionicons name="bed-outline" size={90} color={Colors.white} />
                    )}
                    {activeIcon === 'compass' && (
                      <Ionicons name="compass-outline" size={90} color={Colors.white} />
                    )}
                    {activeIcon === 'briefcase' && (
                      <Ionicons name="briefcase-outline" size={90} color={Colors.white} />
                    )}
                    {activeIcon === 'logo' && (
                      <View style={styles.logoRevealBox}>
                        <TravelCabLogo size={220} textColor={Colors.white} isAccentColor={true} />
                      </View>
                    )}
                  </Animated.View>
                </View>

                {/* Footer del Splash */}
                <View style={styles.footerContainer}>
                  <Text style={styles.ecosystemText}>Miembro del ecosistema</Text>
                  <View style={styles.appLogoRow}>
                    <TravelAppLogo size={130} textColor={Colors.white} isAccentColor={true} />
                  </View>
                </View>
              </View>
            </ImageBackground>
          </Animated.View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 99999,
    backgroundColor: '#0B192C',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  darkMask: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(11, 25, 44, 0.25)', // Tinte suave traslúcido para ver claramente la imagen de la pareja
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoRevealBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerContainer: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 20,
  },
  ecosystemText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  appLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});

