import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Lets a manager void an order offline by opportunistically caching a hash of their PIN the
// moment it's next verified live (see managerVoidOrder in useCremaPos.ts). This is a real
// security tradeoff, made deliberately and documented here rather than silently:
//
// - Unlike the barista fast-path PIN cache (useCremaPos.ts), which only ever puts ONE barista's
//   hash on the ONE device that barista personally uses, this cache accumulates onto EVERY
//   shared terminal a manager ever approves a void from.
// - SHA-256(managerId:pin) over a 4-digit PIN (10,000 possibilities) is trivially brute-forceable
//   offline if the hash is ever extracted from a rooted/jailbroken device — the 5-attempt/
//   15-minute lockout below only throttles typing PINs into the live app UI, not cracking an
//   exfiltrated hash on another machine.
// - A short TTL (12h) bounds the exposure window to "today," not "forever," and is why this is
//   scoped to VOID ONLY, not refund — a refund moves real cash out of the drawer at the moment
//   it's authorized, which is exactly the class of loss get_cash_drawer_reconciliation exists to
//   catch; void doesn't move money and is the safer place to accept this tradeoff.
const MANAGER_PIN_CACHE_KEY = 'crema_manager_pin_cache';
const MANAGER_PIN_TTL_MS = 12 * 60 * 60_000;
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60_000;

type CacheEntry = { hash: string; cachedAt: number; managerName: string };
type Cache = Record<string, CacheEntry>; // managerId -> entry

async function readCache(): Promise<Cache> {
  try {
    const str = await AsyncStorage.getItem(MANAGER_PIN_CACHE_KEY);
    return str ? JSON.parse(str) : {};
  } catch {
    return {};
  }
}

// Called from managerVoidOrder's existing ONLINE success path, right after verify_manager_pin
// confirms a match — never stores the raw PIN, only a hash, same as the barista fast-path cache.
// managerName is cached alongside it purely for the activity-log description an offline void
// writes later; it carries no authorization weight.
export async function cacheManagerPinOnVerify(managerId: string, managerName: string, pin: string): Promise<void> {
  try {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${managerId}:${pin}`);
    const cache = await readCache();
    cache[managerId] = { hash, cachedAt: Date.now(), managerName };
    await AsyncStorage.setItem(MANAGER_PIN_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // never let caching failure break the online void it's piggybacking on
  }
}

function lockoutKey(callerBaristaId: string): string {
  return `crema_manager_pin_offline_lockout_${callerBaristaId}`;
}

// Tries an offline manager PIN against every non-expired cached entry (there are only ever 1-2
// managers at a single café). Same 5-attempt/15-minute lockout convention as every other PIN
// check in this app, keyed by the CALLING BARISTA's own profile id — mirrors how the server's
// own verify_manager_pin keys its throttle off auth.uid(), not off a target manager.
export async function tryOfflineManagerPin(
  callerBaristaId: string,
  pin: string
): Promise<{ ok: true; managerId: string; managerName: string } | { ok: false; error: string }> {
  const lkKey = lockoutKey(callerBaristaId);
  const lockoutStr = await AsyncStorage.getItem(lkKey);
  const lockout: { count: number; lockedUntil: number } = lockoutStr ? JSON.parse(lockoutStr) : { count: 0, lockedUntil: 0 };
  if (lockout.lockedUntil && Date.now() < lockout.lockedUntil) {
    const mins = Math.ceil((lockout.lockedUntil - Date.now()) / 60000);
    return { ok: false, error: `Too many wrong PIN attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` };
  }

  const cache = await readCache();
  const now = Date.now();
  for (const [managerId, entry] of Object.entries(cache)) {
    if (now - entry.cachedAt > MANAGER_PIN_TTL_MS) continue;
    const candidateHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${managerId}:${pin}`);
    if (candidateHash === entry.hash) {
      if (lockout.count) await AsyncStorage.removeItem(lkKey);
      return { ok: true, managerId, managerName: entry.managerName };
    }
  }

  const nextCount = (lockout.count ?? 0) + 1;
  const locked = nextCount >= LOCKOUT_MAX_ATTEMPTS;
  await AsyncStorage.setItem(
    lkKey,
    JSON.stringify({ count: locked ? 0 : nextCount, lockedUntil: locked ? Date.now() + LOCKOUT_DURATION_MS : 0 })
  );
  return { ok: false, error: locked ? 'Too many wrong PIN attempts. Try again in 15 minutes.' : 'Invalid manager PIN' };
}
