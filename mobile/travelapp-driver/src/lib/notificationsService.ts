import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

let handlerConfigured = false;

export function configureDriverNotificationsBehavior() {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function setupDriverNotificationChannels() {
  configureDriverNotificationsBehavior();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('driver_alerts', {
      name: 'Solicitudes de Viaje',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FF6B00',
    });

    await Notifications.setNotificationChannelAsync('trip_updates', {
      name: 'Actualizaciones de Viaje',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A2A5B',
    });

    await Notifications.setNotificationChannelAsync('safety_alerts', {
      name: 'Seguridad y Desvíos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#EF4444',
    });

    await Notifications.setNotificationChannelAsync('promos', {
      name: 'Comunicados de Flota',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#10B981',
    });
  }
}

export async function registerDriverForPushNotificationsAsync(uid: string): Promise<string | null> {
  try {
    await setupDriverNotificationChannels();

    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      '907a480e-16a9-4115-97c2-b921d41de0d4';

    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenRes.data;

    if (token && uid) {
      await setDoc(
        doc(db, 'drivers', uid),
        {
          expoPushToken: token,
          pushToken: token,
          pushUpdatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    return token || null;
  } catch (err) {
    console.warn('[Driver Notifications] Error registering push token:', err);
    return null;
  }
}

export async function presentDriverLocalNotification({
  title,
  body,
  data = {},
  channelId = 'driver_alerts',
}: {
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: 'driver_alerts' | 'trip_updates' | 'safety_alerts' | 'promos';
}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      } as Notifications.NotificationContentInput,
      trigger: null,
    });
  } catch (err) {
    console.warn('[Driver Notifications] Error presenting local notification:', err);
  }
}
