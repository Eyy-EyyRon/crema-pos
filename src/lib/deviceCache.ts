import AsyncStorage from '@react-native-async-storage/async-storage';
import { Discount, ModGroupDef, UserProfile } from '../types';
import { RecipeRow } from './posOrder';

// Device-local caches for a staffed register. Versioned blobs so a schema change cannot
// hydrate garbage; TTLs so PIN hashes and a week-old menu snapshot don't live forever.

const MENU_DATA_CACHE_KEY = 'crema_menu_data_cache';
const PROFILES_CACHE_KEY = 'crema_profiles_cache';
const PIN_HASH_KEY_PREFIX = 'crema_pin_hash_';

const MENU_CACHE_VERSION = 2;
const MENU_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const PIN_HASH_TTL_MS = 12 * 60 * 60_000;
const PROFILES_CACHE_TTL_MS = 24 * 60 * 60_000;

export type CachedMenuData = {
  menuItems: { id: string; name: string; price: number; category: string; tax_rate_id: string | null }[];
  categories: string[];
  discountsList: Discount[];
  modifierGroupsByItem: Record<string, ModGroupDef[]>;
  recipesByItem: Record<string, RecipeRow[]>;
  ingredientStock: Record<string, number>;
  ingredientsList: { id: string; name: string; unit: string; current_stock: number }[];
  taxRateById: Record<string, number>;
  storeSettings: Record<string, unknown>;
};

type Envelope<T> = { v: number; cachedAt: number; payload: T };

function pinHashKey(profileId: string) {
  return `${PIN_HASH_KEY_PREFIX}${profileId}`;
}

function parseEnvelope<T>(raw: string | null, version: number, maxAgeMs: number): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== version || typeof parsed.cachedAt !== 'number' || parsed.payload == null) {
      return null;
    }
    if (Date.now() - parsed.cachedAt > maxAgeMs) return null;
    return parsed.payload as T;
  } catch {
    return null;
  }
}

export async function writeMenuCache(payload: CachedMenuData): Promise<void> {
  const envelope: Envelope<CachedMenuData> = { v: MENU_CACHE_VERSION, cachedAt: Date.now(), payload };
  await AsyncStorage.setItem(MENU_DATA_CACHE_KEY, JSON.stringify(envelope));
}

export async function readMenuCache(): Promise<CachedMenuData | null> {
  try {
    const raw = await AsyncStorage.getItem(MENU_DATA_CACHE_KEY);
    return parseEnvelope<CachedMenuData>(raw, MENU_CACHE_VERSION, MENU_CACHE_MAX_AGE_MS);
  } catch {
    return null;
  }
}

export async function writePinHash(profileId: string, hash: string): Promise<void> {
  const envelope: Envelope<string> = { v: 1, cachedAt: Date.now(), payload: hash };
  await AsyncStorage.setItem(pinHashKey(profileId), JSON.stringify(envelope));
}

export async function readValidPinHash(profileId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(pinHashKey(profileId));
    // Legacy value was a bare SHA-256 hex string with no TTL — treat as expired so this
    // device re-auths online once after the upgrade instead of keeping a forever-hash.
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed[0] !== '{') {
      await AsyncStorage.removeItem(pinHashKey(profileId));
      return null;
    }
    return parseEnvelope<string>(raw, 1, PIN_HASH_TTL_MS);
  } catch {
    return null;
  }
}

export async function clearPinHash(profileId: string): Promise<void> {
  await AsyncStorage.removeItem(pinHashKey(profileId)).catch(() => {});
}

export async function writeProfilesCache(profiles: UserProfile[]): Promise<void> {
  const envelope: Envelope<UserProfile[]> = { v: 1, cachedAt: Date.now(), payload: profiles };
  await AsyncStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(envelope));
}

export async function readProfilesCache(): Promise<UserProfile[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_CACHE_KEY);
    const fromEnvelope = parseEnvelope<UserProfile[]>(raw, 1, PROFILES_CACHE_TTL_MS);
    if (fromEnvelope) return fromEnvelope;
    // Legacy was a raw array — drop it so we don't keep an unbounded staff list.
    if (raw) await AsyncStorage.removeItem(PROFILES_CACHE_KEY).catch(() => {});
    return null;
  } catch {
    return null;
  }
}
