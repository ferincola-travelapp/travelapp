import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet, Text, Animated } from 'react-native';
import { useFonts, Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import * as Updates from 'expo-updates';
import RootNavigator from './src/navigation/RootNavigator';
import { SupervisorPanicOverlay } from './src/components/SupervisorPanicOverlay';
import { Colors } from './src/lib/constants';
import { TravelAppLogo } from './src/components/BrandLogos';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Quicksand-Regular': Quicksand_400Regular,
    'Quicksand-Medium': Quicksand_500Medium,
    'Quicksand-SemiBold': Quicksand_600SemiBold,
    'Quicksand-Bold': Quicksand_700Bold,
  });

  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // Comprobar y aplicar actualizaciones OTA automáticamente
  useEffect(() => {
    async function checkOTAUpdates() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (err) {
        console.log('OTA update check error:', err);
      }
    }
    checkOTAUpdates();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Mostrar splash durante 3 segundos, luego desvanecer en 500ms
      const timer = setTimeout(() => {
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: '#0F172A' }]}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <RootNavigator />
        <SupervisorPanicOverlay />

        {showSplash && (
          <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
            {/* Logo Central */}
            <View style={styles.centerContainer}>
              <TravelAppLogo size={200} textColor="#FFFFFF" />
              <Text style={{ color: '#38BDF8', fontSize: 18, fontFamily: 'Quicksand-Bold', marginTop: 16, letterSpacing: 0.5 }}>SUPERVISOR DE FLOTA</Text>
            </View>

            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerTextMuted}>Centro de Control Operativo</Text>
              <Text style={styles.copyrightText}>
                Todos los derechos reservados TravelApp s.a.s. - versión 1.1
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    zIndex: 99999,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerContainer: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  footerTextMuted: {
    fontSize: 13,
    fontFamily: 'Quicksand-Medium',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  copyrightText: {
    fontSize: 10,
    fontFamily: 'Quicksand-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
});
