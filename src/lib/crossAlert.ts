import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert is a complete no-op (see node_modules/react-native-web/dist/
// exports/Alert/index.js — `static alert() {}`), so any call built on it silently does nothing
// on web: no dialog appears, and a confirm-then-act flow (like the Queue screen's "Complete"
// button) never fires its action because the button the user would tap doesn't exist. These two
// helpers are the one place that decides how to surface a message per platform, so nothing else
// in the app needs to special-case web.

// Notification — replaces a bare Alert.alert(title, message) call, or a single-button
// Alert.alert(title, message, [{ text: 'OK', onPress }]) where the "OK" press has a side effect
// (e.g. locking the screen). onAcknowledge always fires immediately after the message is shown.
export function notify(title: string, message?: string, onAcknowledge?: () => void): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onAcknowledge?.();
    return;
  }
  Alert.alert(title, message, onAcknowledge ? [{ text: 'OK', onPress: onAcknowledge }] : undefined);
}

// Confirm-then-act — replaces an Alert.alert(title, message, [Cancel, {text, onPress}]) gate.
// Resolves true only if the user confirmed.
export function confirmAsync(title: string, message?: string, confirmText = 'OK'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, onPress: () => resolve(true) },
    ]);
  });
}
