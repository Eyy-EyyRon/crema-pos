// Web stub — Metro picks this file over apkInstaller.ts when bundling for web, so
// expo-file-system/expo-intent-launcher (no web build) never enter the web bundle graph.
// The update banner itself is gated to Android only (see useCremaPos.ts's updateAvailable), so
// this should be unreachable in practice; it exists only so the shared import specifier resolves.
export async function downloadAndInstallApk(_url: string, _onProgress: (pct: number) => void): Promise<void> {
  throw new Error('App updates can only be installed on Android.');
}
