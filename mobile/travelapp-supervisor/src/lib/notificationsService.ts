import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

let configured = false;

export function configureSupervisorNotifications() {
  if (configured) return;
  configured = true;
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

export async function registerSupervisorForPushNotificationsAsync(uid: string): Promise<string | null> {
  try {
    configureSupervisorNotifications();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('safety_alerts', {
        name: 'Emergencias y Pánico SOS',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 200, 600, 200, 600],
        lightColor: '#EF4444',
      });
    }

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
      '6b13d12b-552d-4098-84ac-4bd3c44f92cc';

    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenRes.data;

    if (token && uid) {
      await Promise.all([
        setDoc(
          doc(db, 'supervisors', uid),
          { expoPushToken: token, pushToken: token, pushUpdatedAt: Date.now() },
          { merge: true }
        ).catch(() => {}),
        setDoc(
          doc(db, 'users', uid),
          { expoPushToken: token, pushToken: token, pushUpdatedAt: Date.now() },
          { merge: true }
        ).catch(() => {}),
      ]);
    }

    return token || null;
  } catch (err) {
    console.warn('[Supervisor Notifications] Error registering push token:', err);
    return null;
  }
}

export async function presentSupervisorSafetyNotification({
  title,
  body,
  data = {},
}: {
  title: string;
  body: string;
  data?: Record<string, any>;
}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data,
        ...(Platform.OS === 'android' ? { channelId: 'safety_alerts' } : {}),
      } as Notifications.NotificationContentInput,
      trigger: null,
    });
  } catch (err) {
    console.warn('[Supervisor Notifications] Error presenting safety push:', err);
  }
}
