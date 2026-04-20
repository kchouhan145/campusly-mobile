import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';

async function requestIosNotificationPermission() {
  if (Platform.OS !== 'ios') {
    return true;
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

async function requestAndroidNotificationPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function registerForPushNotificationsAsync() {
  const iosPermissionGranted = await requestIosNotificationPermission();
  const androidPermissionGranted = await requestAndroidNotificationPermission();
  if (!iosPermissionGranted || !androidPermissionGranted) {
    return null;
  }

  await messaging().setAutoInitEnabled(true);
  await messaging().registerDeviceForRemoteMessages();
  const token = await messaging().getToken();
  return token || null;
}

export function subscribeToTokenRefresh(handler) {
  return messaging().onTokenRefresh(handler);
}
