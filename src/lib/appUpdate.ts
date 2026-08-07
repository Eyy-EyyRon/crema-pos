// Bump this alongside app.json's expo.version on every native release — this is what a
// pasted store_settings.app_update_version is compared against to decide whether a tablet
// is actually behind, so the two must move together.
export const APP_VERSION = '1.1.0';

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
