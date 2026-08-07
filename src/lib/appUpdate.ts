import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

// Bump this alongside app.json's expo.version on every native release — this is what a
// pasted store_settings.app_update_version is compared against to decide whether a tablet
// is actually behind, so the two must move together.
export const APP_VERSION = '1.0.0';

export function isNewerVersion(remote: string, current: string): boolean {
  const r = remote.trim().split('.').map(Number);
  const c = current.trim().split('.').map(Number);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rPart = r[i] ?? 0;
    const cPart = c[i] ?? 0;
    if (Number.isNaN(rPart) || Number.isNaN(cPart)) return remote.trim() !== current.trim();
    if (rPart !== cPart) return rPart > cPart;
  }
  return false;
}

// Android-only: no equivalent exists on iOS, which blocks silent sideloading entirely outside
// TestFlight/the App Store. Downloads the APK to cache, then hands it to the system package
// installer via a content:// URI (required since Android 7 — a raw file:// URI is rejected).
export async function downloadAndInstallApk(url: string, onProgress: (pct: number) => void): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('App updates can only be installed on Android.');
  }

  const destination = new File(Paths.cache, 'crema-pos-update.apk');
  if (destination.exists) destination.delete();

  const task = File.createDownloadTask(url, destination, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) onProgress(bytesWritten / totalBytes);
    },
  });
  const file = await task.downloadAsync();
  if (!file) throw new Error('Download did not complete.');

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: file.contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}
