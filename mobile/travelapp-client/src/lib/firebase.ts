import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence as _getReactNativePersistence } from 'firebase/auth/react-native';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBouuxeZhMl3LNyRQOe6BxUnnYc0hVbjIo',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mvp-travelapp.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'mvp-travelapp',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mvp-travelapp.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '596622732697',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:596622732697:web:6765f2beee41420c3db708',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createReactNativePersistence(storage: any) {
  const PersistenceClass = class {
    type = 'LOCAL';
    async _isAvailable() {
      try {
        if (!storage) return false;
        await storage.setItem('__firebase_test__', '1');
        await storage.removeItem('__firebase_test__');
        return true;
      } catch {
        return false;
      }
    }
    _set(key: string, value: any) {
      return storage.setItem(key, JSON.stringify(value));
    }
    async _get(key: string) {
      const json = await storage.getItem(key);
      return json ? JSON.parse(json) : null;
    }
    _remove(key: string) {
      return storage.removeItem(key);
    }
    _addListener() {}
    _removeListener() {}
  };
  (PersistenceClass as any).type = 'LOCAL';
  return PersistenceClass;
}

let authInstance;
try {
  const persistenceClass = typeof _getReactNativePersistence === 'function'
    ? _getReactNativePersistence(AsyncStorage)
    : createReactNativePersistence(AsyncStorage);

  authInstance = initializeAuth(app, {
    persistence: persistenceClass as any,
  });
} catch (_err) {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
export default app;
