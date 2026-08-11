import { Platform } from 'react-native';

// Native (iOS/Android) implementation — Metro picks apkInstaller.web.ts instead when bundling
// for web, since expo-file-system/expo-intent-launcher ship no web build at all and would break
// web bundling entirely if imported from a file reachable on that platform (see apkInstaller.web.ts).
//
// expo-file-system/expo-intent-launcher are required lazily, inside the function, rather than as
// static top-level imports. Both call requireNativeModule(...) at import time, which throws
// synchronously if the native module isn't resolvable — and since this file is reachable from
// PosApp.tsx's always-mounted UpdateBanner, a static import would let a self-update-only problem
// crash the entire app before React even renders. A lazy require confines that failure to this
// function, where the caller (UpdateBanner.handleUpdate) already catches and surfaces it.
//
// Android-only at runtime too: no equivalent exists on iOS, which blocks silent sideloading
// entirely outside TestFlight/the App Store. Downloads the APK to cache, then hands it to the
// system package installer via a content:// URI (required since Android 7 — a raw file:// URI
// is rejected).
export async function downloadAndInstallApk(url: string, onProgress: (pct: number) => void): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('App updates can only be installed on Android.');
  }

  const { File, Paths } = require('expo-file-system');
  const IntentLauncher = require('expo-intent-launcher');

  const destination = new File(Paths.cache, 'crema-pos-update.apk');
  if (destination.exists) destination.delete();

  const task = File.createDownloadTask(url, destination, {
    onProgress: ({ bytesWritten, totalBytes }: { bytesWritten: number; totalBytes: number }) => {
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
