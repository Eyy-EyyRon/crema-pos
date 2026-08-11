import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert is a complete no-op (see node_modules/react-native-web/dist/
// exports/Alert/index.js — `static alert() {}`), so any call built on it silently does nothing
// on web: no dialog appears, and a confirm-then-act flow (like the Queue screen's "Complete"
// button) never fires its action because the button the user would tap doesn't exist. These two
// helpers are the one place that decides how to surface a message per platform, so nothing else
// in the app needs to special-case web.
//
// On web, rather than the browser's own unstyled window.alert/window.confirm (which look like a
// bare OS dialog stamped with the page's URL — jarring next to the rest of this app's UI), these
// hand off to CrossAlertHost, a single branded modal mounted once near the app root. This module
// only holds the pending request; _registerCrossAlertListener is how that host subscribes to it.

export type PendingCrossAlert =
  | { kind: 'notify'; title: string; message?: string; resolve: () => void }
  | { kind: 'confirm'; title: string; message?: string; confirmText: string; resolve: (confirmed: boolean) => void };

let listener: ((req: PendingCrossAlert) => void) | null = null;

// Internal — called only by CrossAlertHost to subscribe/unsubscribe itself. Not for general use.
export function _registerCrossAlertListener(fn: ((req: PendingCrossAlert) => void) | null): void {
  listener = fn;
}

// Notification — replaces a bare Alert.alert(title, message) call, or a single-button
// Alert.alert(title, message, [{ text: 'OK', onPress }]) where the "OK" press has a side effect
// (e.g. locking the screen). onAcknowledge always fires immediately after the message is shown.
export function notify(title: string, message?: string, onAcknowledge?: () => void): void {
  if (Platform.OS === 'web') {
    const resolve = () => onAcknowledge?.();
    if (listener) { listener({ kind: 'notify', title, message, resolve }); return; }
    window.alert(message ? `${title}\n\n${message}` : title); // host not mounted — last-resort fallback
    resolve();
    return;
  }
  Alert.alert(title, message, onAcknowledge ? [{ text: 'OK', onPress: onAcknowledge }] : undefined);
}

// Confirm-then-act — replaces an Alert.alert(title, message, [Cancel, {text, onPress}]) gate.
// Resolves true only if the user confirmed.
export function confirmAsync(title: string, message?: string, confirmText = 'OK'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (listener) { listener({ kind: 'confirm', title, message, confirmText, resolve }); return; }
      resolve(window.confirm(message ? `${title}\n\n${message}` : title)); // last-resort fallback
    });
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, onPress: () => resolve(true) },
    ]);
  });
}
