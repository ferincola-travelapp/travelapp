import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const ROUTE_DEVIATION_CATEGORY = 'ROUTE_DEVIATION';
export const ACTION_CONFIRM_OK = 'CONFIRM_OK';
export const ACTION_REQUEST_HELP = 'REQUEST_HELP';

let handlerConfigured = false;

export function configureNotificationsBehavior() {
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

export async function setupNotificationChannelsAndCategories() {
  configureNotificationsBehavior();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('trip_updates', {
      name: 'Actualizaciones de Viaje',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A2A5B',
    });

    await Notifications.setNotificationChannelAsync('promos', {
      name: 'Promociones y Beneficios',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#FF6B00',
    });

    await Notifications.setNotificationChannelAsync('safety_alerts', {
      name: 'Alertas de Seguridad en Ruta',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#EF4444',
    });
  }

  await Notifications.setNotificationCategoryAsync(ROUTE_DEVIATION_CATEGORY, [
    {
      identifier: ACTION_CONFIRM_OK,
      buttonTitle: '✅ Estoy bien',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_REQUEST_HELP,
      buttonTitle: '🚨 Necesito ayuda',
      options: { isDestructive: true, opensAppToForeground: true },
    },
  ]);
}

export async function registerForPushNotificationsAsync(uid: string): Promise<string | null> {
  try {
    await setupNotificationChannelsAndCategories();

    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      '41b1761b-a174-45b7-841f-9fcb629b9169';

    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenRes.data;

    if (token && uid) {
      await setDoc(
        doc(db, 'users', uid),
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
    console.warn('[Notifications] Error registering push token:', err);
    return null;
  }
}

export async function presentLocalNotification({
  title,
  body,
  data = {},
  channelId = 'trip_updates',
  categoryIdentifier,
  imageUrl,
}: {
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: 'trip_updates' | 'promos' | 'safety_alerts';
  categoryIdentifier?: string;
  imageUrl?: string;
}) {
  try {
    const validHttpsImage =
      typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl) ? imageUrl : undefined;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: {
          ...data,
          ...(validHttpsImage ? { imageUrl: validHttpsImage } : {}),
        },
        ...(categoryIdentifier ? { categoryIdentifier } : {}),
        ...(Platform.OS === 'android' ? { channelId } : {}),
        ...(Platform.OS === 'ios' && validHttpsImage
          ? {
              attachments: [
                {
                  identifier: 'notification-photo',
                  url: validHttpsImage,
                  type: 'public.jpeg',
                  typeHint: 'public.jpeg',
                  thumbnailHidden: false,
                } as any,
              ],
            }
          : {}),
      } as Notifications.NotificationContentInput,
      trigger: null,
    });
  } catch (err) {
    console.warn('[Notifications] Error presenting local notification:', err);
  }
}
