import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }) as any,
  });
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function showNativeNotification(title: string, body: string, personaId: string): Promise<void> {
  try {
    const granted = await requestNativeNotificationPermission();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        badge: 1,
        data: { personaId },
      },
      trigger: null,
    });
  } catch {}
}

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('auto-messages', {
      name: 'Auto Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E91E8C',
      enableVibrate: true,
      showBadge: true,
    });
  } catch {}
}
