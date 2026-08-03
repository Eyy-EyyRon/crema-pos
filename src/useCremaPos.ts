import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { QUICK_CASH } from './data';
import { peso, peso0 } from './format';
import { supabase } from './lib/supabase';
import { logActivity } from './lib/activityLog';
import { closeShift as closeShiftApi, getOpenShift, openShift as openShiftApi } from './lib/cashDrawer';
import { success as successHaptic, error as errorHaptic } from './lib/haptics';
import {
  PosOrderData,
  PosOrderItem,
  RecipeRow,
  addItemsToExistingOrder,
  buildRecipesByItem,
  computeOrderTotals,
  getMaxAddableQty,
  isOutOfStock,
  modsDisplayString,
  restoreStockForOrderItems,
} from './lib/posOrder';
import { OutboxEntry, getOutboxOrders, isOnline, submitOrder, syncOutbox } from './lib/syncEngine';
import { clockIn, clockOut } from './lib/timeClock';
import {
  CartItem,
  Discount,
  ModGroupDef,
  ModOptionDef,
  OrderType,
  PayMethod,
  QueueEntry,
  Screen,
  SelectedMod,
  SelectedMods,
  Shift,
  ShiftScheduleEntry,
  SuccessInfo,
  UserProfile,
} from './types';

interface StoreSettings {
  taxRatePct: number;
  isTaxInclusive: boolean;
  serviceChargePct: number;
  rushModeEnabled: boolean;
  gcashQrUrl: string | null;
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  tin: string;
  receiptFooter: string;
}

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  taxRatePct: 12,
  isTaxInclusive: true,
  serviceChargePct: 5,
  rushModeEnabled: false,
  gcashQrUrl: null,
  storeName: 'Crema',
  tagline: 'Coffee & Ice Cream',
  address: '',
  phone: '',
  tin: '',
  receiptFooter: 'Thank you for visiting Crema!',
};

// Below this many sellable units left, the menu grid flags the item as low
// stock instead of waiting for it to hit zero.
const LOW_STOCK_THRESHOLD = 5;

// Last-known-good menu/ingredient/settings snapshot — read-through cache so
// the register can still take orders (menu, prices, stock badges, mods,
// discounts) if the tablet loses connectivity after the first successful load.
const MENU_DATA_CACHE_KEY = 'crema_menu_data_cache';

export interface MenuItemStock {
  unavailable: boolean;
  /** Sellable units left for recipe-tracked items; null when the item has no recipe (untracked/unlimited). */
  qty: number | null;
  low: boolean;
}

interface PosState {
  screen: Screen;
  showQueue: boolean;
  showAccount: boolean;
  orderType: OrderType;
  selCat: string;
  search: string;
  selItemId: string | null;
  selMods: SelectedMods;
  qty: number;
  note: string;
  payMethod: PayMethod;
  tendered: string;
  discountName: string;
  customerName: string;
  cart: CartItem[];
  nextId: number;
  success: SuccessInfo | null;
  queue: QueueEntry[];
  /** Count of orders placed today, server-side — used to show the upcoming ticket number before checkout. */
  todayOrderCount: number;
  showGcashQr: boolean;
  /** Set while the cart being built is meant to top up an already-queued order rather than create a new one. */
  appendTargetOrderId: string | null;
  appendTargetOrderNo: string | null;
  upcomingShifts: ShiftScheduleEntry[];

  // auth / shift
  currentUser: UserProfile | null;
  authLoading: boolean;
  shift: Shift | null;
  shiftLoading: boolean;
  isOffline: boolean;
  checkoutBusy: boolean;
  checkoutError: string | null;

  // live backend data
  menuItems: { id: string; name: string; price: number; category: string }[];
  categories: string[];
  discountsList: Discount[];
  modifierGroupsByItem: Record<string, ModGroupDef[]>;
  recipesByItem: Record<string, RecipeRow[]>;
  ingredientStock: Record<string, number>;
  storeSettings: StoreSettings;
}

const initialState: PosState = {
  screen: 'orderType',
  showQueue: false,
  showAccount: false,
  orderType: 'dine-in',
  selCat: 'All',
  search: '',
  selItemId: null,
  selMods: {},
  qty: 1,
  note: '',
  payMethod: 'cash',
  tendered: '',
  discountName: 'None',
  customerName: '',
  cart: [],
  nextId: 1,
  success: null,
  queue: [],
  todayOrderCount: 0,
  showGcashQr: false,
  appendTargetOrderId: null,
  appendTargetOrderNo: null,
  upcomingShifts: [],

  currentUser: null,
  authLoading: true,
  shift: null,
  shiftLoading: true,
  isOffline: false,
  checkoutBusy: false,
  checkoutError: null,

  menuItems: [],
  categories: ['All'],
  discountsList: [{ id: null, n: 'None', p: 0 }],
  modifierGroupsByItem: {},
  recipesByItem: {},
  ingredientStock: {},
  storeSettings: DEFAULT_STORE_SETTINGS,
};

function modTotal(sel: SelectedMods): number {
  return Object.values(sel)
    .flat()
    .reduce((s, o) => s + o.p, 0);
}

function elapsedMinutes(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function extractFunctionError(error: any): string | null {
  if (!error) return null;
  return error.message || 'Request failed';
}

function pinLockoutKey(profileId: string): string {
  return `crema_pin_lockout_${profileId}`;
}
const PIN_LOCKOUT_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_DURATION_MS = 15 * 60_000;

export function useCremaPos() {
  const [state, setState] = useState<PosState>(initialState);
  // Bumped on every fetchMenuData() call so a slower, now-stale response (the 3 realtime
  // listeners below can each trigger a fetch in quick succession) can detect it's no longer
  // the latest and skip committing its result — otherwise it could overwrite fresher state.
  const menuFetchSeq = useRef(0);
  // Tracks the fast-path login's background real-auth attempt (see login() below) so any
  // write that needs a real Supabase session — opening the cash drawer, checkout — can wait
  // for it instead of racing ahead under a stale/anon session and failing RLS.
  const authSyncRef = useRef<Promise<void> | null>(null);
  // Bumped on every fast-path login attempt. If a barista switches away (locks the POS) before
  // their own background auth settles, that task keeps running unattended — nothing else
  // cancels it. Without this guard, a stale task finishing late calls setSession()/clockIn() for
  // whoever it was started for, silently swapping the ACTIVE session out from under a different
  // barista who has since logged in — which then makes RLS reject that barista's own already-open
  // cash_drawer_shifts row (barista_id = current_profile_id() no longer matches) and wrongly
  // re-prompts them to open a new shift. Same staleness pattern as menuFetchSeq above.
  const loginSeqRef = useRef(0);

  const patch = useCallback((p: Partial<PosState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  // ─────────────────────────────────────────────
  // BOOT — restore an existing Supabase session if one survived a relaunch
  // ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // In a shared POS environment, we intentionally drop the old session
      // on boot so that the next user is always prompted for their PIN.
      await supabase.auth.signOut();
      setState((s) => ({ ...s, authLoading: false }));
    })();
  }, []);

  // ─────────────────────────────────────────────
  // AUTH — PIN / biometric login via the shared pin-login Edge Function
  // ─────────────────────────────────────────────
  const login = useCallback(async (profileId: string, opts: { pin?: string; biometric?: boolean }, cachedProfile?: UserProfile): Promise<{ error?: string }> => {
    const pinHashKey = `crema_pin_hash_${profileId}`;

    // 1. FAST PATH: optimistic local validation against a SHA-256 hash of the PIN cached after
    // a previous successful online login — never the raw PIN itself, so there's nothing to leak
    // from this cache. Only available once this device has logged this profile in online at
    // least once; otherwise falls through to the slow/online path below.
    if (cachedProfile) {
      let fastPathOk = opts.biometric === true;
      if (!fastPathOk && opts.pin) {
        // Same 5-attempt/15-minute lockout convention as the server-side manager-PIN check
        // (see managerVoidOrder below) — this offline comparison never touches the server, so
        // without a local guard a lost/unattended device would let someone brute-force a
        // 4-digit PIN with no rate limit at all.
        const lockoutKey = pinLockoutKey(profileId);
        const lockoutStr = await AsyncStorage.getItem(lockoutKey);
        const lockout: { count: number; lockedUntil: number } = lockoutStr ? JSON.parse(lockoutStr) : { count: 0, lockedUntil: 0 };
        if (lockout.lockedUntil && Date.now() < lockout.lockedUntil) {
          const mins = Math.ceil((lockout.lockedUntil - Date.now()) / 60000);
          return { error: `Too many wrong PIN attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` };
        }

        const cachedHash = await AsyncStorage.getItem(pinHashKey);
        if (cachedHash) {
          const candidateHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            `${profileId}:${opts.pin}`
          );
          if (candidateHash !== cachedHash) {
            const nextCount = (lockout.count ?? 0) + 1;
            const locked = nextCount >= PIN_LOCKOUT_MAX_ATTEMPTS;
            await AsyncStorage.setItem(
              lockoutKey,
              JSON.stringify({ count: locked ? 0 : nextCount, lockedUntil: locked ? Date.now() + PIN_LOCKOUT_DURATION_MS : 0 })
            );
            return { error: locked ? 'Too many wrong PIN attempts. Try again in 15 minutes.' : 'Invalid PIN' };
          }
          fastPathOk = true;
          if (lockout.count) await AsyncStorage.removeItem(lockoutKey);
        }
      }

      if (fastPathOk) {
        // Instantly log the user in visually so the POS is immediately ready
        setState((s) => ({ ...s, currentUser: cachedProfile }));

        // Perform the actual network auth and time-clock punch in the background. Stored in
        // authSyncRef (not fire-and-forget) so writes that need a real session — most
        // urgently opening the cash drawer, which happens immediately after login — can await
        // it first instead of running under a stale/anon session and failing RLS.
        const seq = ++loginSeqRef.current;
        authSyncRef.current = (async () => {
          const online = await isOnline();
          if (!online) {
            if (loginSeqRef.current === seq) patch({ isOffline: true });
            return;
          }
          try {
            const body = opts.biometric ? { profile_id: profileId, biometric: true } : { profile_id: profileId, pin: opts.pin };
            const { data, error } = await supabase.functions.invoke('pin-login', { body });
            // A newer login has since started (this barista switched away before this one
            // finished) — don't let an abandoned attempt activate its session over the current
            // user's, and don't clock in a profile that's no longer the one in front of the POS.
            if (loginSeqRef.current !== seq) return;
            if (!error && data?.access_token) {
              await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
              await clockIn(profileId);
            } else {
              // Online but the real session/clock-in never happened (e.g. PIN changed or
              // profile deactivated since this device last cached it). There's no retry for
              // this — silently continuing would let checkout run under a stale/anon session,
              // which submitOrder now refuses to queue into the outbox (it would just fail
              // forever). Forcing a re-login here is disruptive but bounded — much safer than
              // an entire shift's sales silently piling up unsynced with no explanation.
              console.warn('Background auth did not return a session:', error);
              Alert.alert(
                'Session Expired',
                "Your login couldn't be verified online. Please log in again to keep taking orders safely.",
                [{ text: 'OK', onPress: () => { lockPos(); } }]
              );
            }
          } catch (e) {
            if (loginSeqRef.current !== seq) return;
            console.warn('Background auth failed:', e);
            Alert.alert(
              'Connection Issue',
              "Couldn't verify your login with the server. Please log in again once you have a connection.",
              [{ text: 'OK', onPress: () => { lockPos(); } }]
            );
          } finally {
            // Only clear the ref if it's still ours — a newer login's own in-flight ref must
            // not be nulled out by an older, unrelated attempt finishing later.
            if (loginSeqRef.current === seq) authSyncRef.current = null;
          }
        })();

        return {};
      }
    }

    // 2. SLOW PATH: no usable local cache (first login on this device, or no cached PIN hash
    // yet) — requires connectivity, goes through pin-login directly.
    const online = await isOnline();
    if (!online) return { error: 'Offline and no cached profile available' };

    const body = opts.biometric ? { profile_id: profileId, biometric: true } : { profile_id: profileId, pin: opts.pin };
    const { data, error } = await supabase.functions.invoke('pin-login', { body });

    if (error || !data?.access_token) {
      let message = extractFunctionError(error) || (data as any)?.error || 'Login failed';
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const body2 = await ctx.json();
          if (body2?.error) message = body2.error;
        } catch {}
      }
      return { error: message };
    }

    const { error: sessErr } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessErr) return { error: sessErr.message };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .eq('id', profileId)
      .single();
    if (!profile) return { error: 'Profile not found' };

    if (opts.pin) {
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${profileId}:${opts.pin}`);
      await AsyncStorage.setItem(pinHashKey, hash);
    }

    await clockIn(profile.id);
    setState((s) => ({ ...s, currentUser: profile as UserProfile }));
    return {};
  }, [patch]);

  const logout = useCallback(async () => {
    if (state.currentUser) await clockOut(state.currentUser.id);
    await supabase.auth.signOut();
    // Deliberately leave shiftLoading at initialState's `true` (not forced to
    // false) — otherwise the next login renders one frame with currentUser
    // set, shiftLoading false, and shift still null, which incorrectly flashes
    // the Open Cash Drawer modal before the shift-fetch effect below catches
    // up and confirms whether that barista actually has an open shift.
    setState(() => ({ ...initialState, authLoading: false }));
  }, [state.currentUser]);

  const lockPos = useCallback(async () => {
    await supabase.auth.signOut();
    setState(() => ({ ...initialState, authLoading: false }));
  }, []);

  const uploadAvatar = useCallback(async () => {
    if (!state.currentUser) return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() || 'jpg';
    
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      
      const filename = `${state.currentUser.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(filename, blob, {
        upsert: true,
      });
      
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filename);
      const publicUrl = publicUrlData.publicUrl;
      
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', state.currentUser.id);
      
      setState(s => ({
        ...s,
        currentUser: s.currentUser ? { ...s.currentUser, avatar_url: publicUrl } : null
      }));
    } catch (e: any) {
      console.warn('Avatar upload failed:', e.message);
      Alert.alert('Upload Failed', 'Could not upload avatar: ' + e.message);
    }
  }, [state.currentUser]);

  // ─────────────────────────────────────────────
  // CASH DRAWER SHIFT
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!state.currentUser) return;
    let cancelled = false;
    (async () => {
      patch({ shiftLoading: true });
      // Same race as openShiftAction/checkout: this fetch fires the instant
      // currentUser is set, which can be before the fast-path login's
      // background real-session swap lands. Under a stale/anon session, RLS
      // silently returns zero rows even if this barista genuinely has an
      // open shift, wrongly re-triggering the Open Cash Drawer modal.
      if (authSyncRef.current) await authSyncRef.current;
      if (cancelled) return;
      const s = await getOpenShift(state.currentUser!.id);
      if (!cancelled) setState((st) => ({ ...st, shift: s, shiftLoading: false }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id]);

  const openShiftAction = useCallback(async (startingCash: number): Promise<string | void> => {
    if (!state.currentUser) return 'Not logged in';
    if (!(await isOnline())) return 'Opening the cash drawer requires an internet connection. Please reconnect and try again.';
    if (authSyncRef.current) await authSyncRef.current;
    try {
      const s = await openShiftApi(state.currentUser.id, startingCash);
      patch({ shift: s });
      logActivity(state.currentUser.id, 'shift_opened', `Opened shift with ₱${startingCash.toFixed(2)} starting cash`);
    } catch (e: any) {
      return e.message || 'Could not open shift. Check your connection and try again.';
    }
  }, [state.currentUser, patch]);

  const closeShiftAction = useCallback(async (endingCash: number): Promise<string | void> => {
    if (!state.shift) return 'No open shift';
    if (!(await isOnline())) return 'Closing the cash drawer requires an internet connection. Please reconnect and try again.';
    try {
      await closeShiftApi(state.shift.id, endingCash);
      // Read the barista id before logout() clears state.currentUser.
      if (state.currentUser) logActivity(state.currentUser.id, 'shift_closed', `Closed shift with ₱${endingCash.toFixed(2)} ending cash`);
      await logout();
    } catch (e: any) {
      return e.message || 'Could not close shift. Check your connection and try again.';
    }
  }, [state.shift, state.currentUser, logout]);

  // ─────────────────────────────────────────────
  // MENU / MODS / DISCOUNTS / STORE SETTINGS
  // Mirrors cafe-web-dashboard/app/manager/pos/page.tsx's fetchAll query set —
  // same tables/columns, so menu changes made from the web dashboard show up
  // here too.
  // ─────────────────────────────────────────────
  const fetchMenuData = useCallback(async () => {
    // Same race the shift-fetch effect guards against: this fires the instant currentUser is
    // set on a fast-path login, which can be before the background real-session swap lands.
    // Under a stale/anon session, store_settings' RLS (authenticated-only) silently returns no
    // row while menu_items/ingredients (open to anon) still succeed — so without this wait,
    // a barista who just switched profiles gets a fully-loaded menu but storeSettings quietly
    // resets to defaults (gcashQrUrl: null, tax rate, service charge, rush mode all wrong).
    if (authSyncRef.current) await authSyncRef.current;
    const seq = ++menuFetchSeq.current;
    try {
      await fetchMenuDataFromNetwork(seq);
    } catch (e) {
      console.warn('Menu data fetch failed — falling back to cached data if available:', e);
      await hydrateMenuDataFromCache(seq);
    }
  }, []);

  const fetchMenuDataFromNetwork = useCallback(async (seq: number) => {
    const [
      { data: items, error: itemsError },
      { data: cats },
      { data: groups },
      { data: options },
      { data: itemMods },
      { data: recipes },
      { data: ingredients },
      { data: discountsData },
      { data: settings },
    ] = await Promise.all([
      supabase.from('menu_items').select('*').neq('is_active', false),
      supabase.from('menu_categories').select('name').order('sort_order', { ascending: true }),
      supabase.from('modifier_groups').select('*').order('sort_order', { ascending: true }),
      supabase.from('modifier_options').select('*').order('sort_order', { ascending: true }),
      supabase.from('menu_item_modifiers').select('menu_item_id, modifier_group_id'),
      supabase.from('recipe_costing').select('menu_item_id, ingredient_id, recipe_qty'),
      supabase.from('ingredients').select('id, current_stock'),
      supabase.from('discounts').select('*').order('percentage', { ascending: false }),
      supabase.from('store_settings').select('tax_rate, is_tax_inclusive, service_charge_pct, rush_mode_enabled, gcash_qr_url, store_name, tagline, address, phone, tin, receipt_footer').eq('id', 1).maybeSingle(),
    ]);
    if (itemsError) throw itemsError;

    const optionsByGroup: Record<string, any[]> = {};
    (options ?? []).forEach((o: any) => {
      (optionsByGroup[o.modifier_group_id] ??= []).push(o);
    });

    const allGroupDefs: ModGroupDef[] = (groups ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      required: !!g.is_required,
      multi: !!g.multi_select,
      options: (optionsByGroup[g.id] ?? []).map((o: any) => [o.name, Number(o.price_adjustment)] as ModOptionDef),
    }));
    const groupsById: Record<string, ModGroupDef> = Object.fromEntries(allGroupDefs.map((g) => [g.id, g]));

    const itemGroupIds: Record<string, string[]> = {};
    (itemMods ?? []).forEach((im: any) => {
      (itemGroupIds[im.menu_item_id] ??= []).push(im.modifier_group_id);
    });

    // A menu item with no menu_item_modifiers rows gets every group — same
    // rule cafe-web-dashboard's POS page uses.
    const modifierGroupsByItem: Record<string, ModGroupDef[]> = {};
    (items ?? []).forEach((mi: any) => {
      const ids = itemGroupIds[mi.id];
      modifierGroupsByItem[mi.id] = ids && ids.length > 0 ? ids.map((id) => groupsById[id]).filter(Boolean) : allGroupDefs;
    });

    const menuItems = (items ?? []).map((mi: any) => ({
      id: mi.id,
      name: mi.name,
      price: Number(mi.price),
      category: mi.category,
      image_url: mi.image_url,
    }));

    const categories = ['All', ...(cats ?? []).map((c: any) => c.name)];

    // Always keep a synthetic 0% "None" entry first regardless of what's in
    // the real table, so the discount row always has a "No Discount" chip.
    const discountsList: Discount[] = [
      { id: null, n: 'None', p: 0 },
      ...(discountsData ?? []).map((d: any) => ({ id: d.id, n: d.name, p: Number(d.percentage) })),
    ];

    const ingredientStock: Record<string, number> = {};
    (ingredients ?? []).forEach((i: any) => {
      ingredientStock[i.id] = Number(i.current_stock);
    });

    const recipesByItem = buildRecipesByItem((recipes ?? []) as RecipeRow[]);

    const resolvedStoreSettings = settings
      ? {
          taxRatePct: Number(settings.tax_rate ?? DEFAULT_STORE_SETTINGS.taxRatePct),
          isTaxInclusive: settings.is_tax_inclusive ?? DEFAULT_STORE_SETTINGS.isTaxInclusive,
          serviceChargePct: Number(settings.service_charge_pct ?? DEFAULT_STORE_SETTINGS.serviceChargePct),
          rushModeEnabled: settings.rush_mode_enabled ?? DEFAULT_STORE_SETTINGS.rushModeEnabled,
          gcashQrUrl: settings.gcash_qr_url ?? null,
          storeName: settings.store_name || DEFAULT_STORE_SETTINGS.storeName,
          tagline: settings.tagline || DEFAULT_STORE_SETTINGS.tagline,
          address: settings.address || '',
          phone: settings.phone || '',
          tin: settings.tin || '',
          receiptFooter: settings.receipt_footer || DEFAULT_STORE_SETTINGS.receiptFooter,
        }
      : undefined;

    // A newer fetch (triggered by one of the 3 realtime listeners firing again while this one
    // was still in flight) has already started — let it own the final state, skip committing
    // this now-stale response.
    if (seq !== menuFetchSeq.current) return;

    // Refresh the offline cache on every successful fetch (fire-and-forget —
    // a cache write failing shouldn't block the live UI update below).
    AsyncStorage.setItem(
      MENU_DATA_CACHE_KEY,
      JSON.stringify({
        menuItems,
        categories,
        discountsList,
        modifierGroupsByItem,
        recipesByItem,
        ingredientStock,
        storeSettings: resolvedStoreSettings ?? DEFAULT_STORE_SETTINGS,
      })
    ).catch(() => {});

    setState((s) => ({
      ...s,
      menuItems,
      categories,
      discountsList,
      modifierGroupsByItem,
      recipesByItem,
      ingredientStock,
      storeSettings: resolvedStoreSettings ?? s.storeSettings,
    }));
  }, []);

  const hydrateMenuDataFromCache = useCallback(async (seq: number) => {
    try {
      const cachedStr = await AsyncStorage.getItem(MENU_DATA_CACHE_KEY);
      if (!cachedStr) return;
      if (seq !== menuFetchSeq.current) return;
      const cached = JSON.parse(cachedStr);
      setState((s) => ({
        ...s,
        menuItems: cached.menuItems ?? s.menuItems,
        categories: cached.categories ?? s.categories,
        discountsList: cached.discountsList ?? s.discountsList,
        modifierGroupsByItem: cached.modifierGroupsByItem ?? s.modifierGroupsByItem,
        recipesByItem: cached.recipesByItem ?? s.recipesByItem,
        ingredientStock: cached.ingredientStock ?? s.ingredientStock,
        storeSettings: cached.storeSettings ?? s.storeSettings,
      }));
    } catch (e) {
      console.warn('Failed to read cached menu data:', e);
    }
  }, []);

  useEffect(() => {
    if (!state.currentUser) return;
    fetchMenuData();
    const channel = supabase
      .channel('crema_pos_menu_ingredients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, fetchMenuData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, fetchMenuData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, fetchMenuData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id, fetchMenuData]);

  // ─────────────────────────────────────────────
  // QUEUE — real `orders` where status='pending', merged with anything still
  // sitting in the local offline outbox
  // ─────────────────────────────────────────────
  const buildQueueFromOrders = (rows: any[]): QueueEntry[] =>
    rows.map((o) => ({
      id: o.id,
      no: o.receipt_number ?? o.id.slice(0, 8).toUpperCase(),
      type: o.order_type === 'takeout' ? 'Takeout' : 'Dine-In',
      mins: elapsedMinutes(o.created_at),
      items: (o.order_items ?? []).map((oi: any) => ({
        name: oi.menu_items?.name ?? 'Item',
        qty: oi.qty,
        mods: modsDisplayString(oi.modifiers_json, oi.special_note),
      })),
      total: Number(o.total ?? o.total_amount ?? 0),
      restoreItems: (o.order_items ?? []).map((oi: any) => ({ menu_item_id: oi.menu_item_id, qty: oi.qty })),
      customerName: o.customer_name ?? null,
      barista_id: o.barista_id,
    }));

  const buildQueueFromOutbox = (entries: OutboxEntry[]): QueueEntry[] =>
    entries.map((e) => ({
      id: e.id,
      no: e.orderData.receipt_number,
      type: e.orderData.order_type === 'takeout' ? 'Takeout' : 'Dine-In',
      mins: elapsedMinutes(e.timestamp),
      items: e.displayItems.map((d) => ({ name: d.name, qty: d.qty, mods: d.mods })),
      total: e.orderData.total,
      restoreItems: [],
      pendingSync: true,
      customerName: e.orderData.customer_name ?? null,
      barista_id: e.orderData.barista_id,
    }));

  const fetchQueue = useCallback(async () => {
    // Same stale/anon-session race as fetchMenuData above — orders is authenticated-only, so
    // firing this before the fast-path login's background session swap lands would silently
    // return an empty queue right after a profile switch instead of the real pending tickets.
    if (authSyncRef.current) await authSyncRef.current;
    const [{ data }, outboxEntries] = await Promise.all([
      supabase
        .from('orders')
        .select(
          'id, receipt_number, created_at, total, total_amount, order_type, customer_name, barista_id, order_items(qty, menu_item_id, modifiers_json, special_note, menu_items(name))'
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      getOutboxOrders(),
    ]);

    const real = buildQueueFromOrders(data ?? []);
    // De-dupe by receipt number — the same client-generated receipt briefly
    // exists on both the outbox stand-in and the real row during the handoff.
    const outboxTickets = buildQueueFromOutbox(outboxEntries).filter((o) => !real.some((r) => r.no === o.no));
    setState((s) => ({ ...s, queue: [...real, ...outboxTickets] }));
  }, []);

  const fetchTodayOrderCount = useCallback(async () => {
    if (authSyncRef.current) await authSyncRef.current;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());
    if (count !== null) setState((s) => ({ ...s, todayOrderCount: count }));
  }, []);

  // Read-only visibility into shifts a manager assigned via the web dashboard's Staff page —
  // baristas previously had no way to see their own upcoming schedule anywhere.
  const fetchUpcomingShifts = useCallback(async () => {
    if (!state.currentUser) return;
    if (authSyncRef.current) await authSyncRef.current;
    const { data } = await supabase
      .from('shift_schedules')
      .select('id, scheduled_start, scheduled_end, notes')
      .eq('barista_id', state.currentUser.id)
      .gte('scheduled_start', new Date().toISOString())
      .order('scheduled_start', { ascending: true })
      .limit(10);
    setState((s) => ({ ...s, upcomingShifts: (data ?? []) as ShiftScheduleEntry[] }));
  }, [state.currentUser]);

  useEffect(() => {
    if (!state.currentUser) return;
    fetchQueue();
    fetchTodayOrderCount();
    fetchUpcomingShifts();
    const channel = supabase
      .channel('crema_pos_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchQueue();
        fetchTodayOrderCount();
      })
      .subscribe();
    const iv = setInterval(async () => {
      const online = await isOnline();
      patch({ isOffline: !online });
      if (online) await syncOutbox();
      fetchQueue();
      fetchTodayOrderCount();
      fetchUpcomingShifts();
    }, 10000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id, fetchQueue, fetchTodayOrderCount, fetchUpcomingShifts]);

  const completeQueueTicket = useCallback((id: string) => {
    setState((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== id) }));
    if (id.startsWith('outbox-')) return;
    supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          // Ticket was optimistically removed above — put it back and say why,
          // instead of it silently reappearing a moment later with no explanation.
          fetchQueue();
          Alert.alert('Could Not Complete Order', error.message || 'The order is still pending — check your connection and try again.');
        }
      });
  }, [fetchQueue]);

  const flagVoidOrder = useCallback(async (orderId: string, reason: string): Promise<{ error?: string }> => {
    const { error } = await supabase.from('orders').update({ status: 'void_requested', void_reason: reason }).eq('id', orderId);
    if (error) return { error: error.message };
    const ticket = state.queue.find((q) => q.id === orderId);
    const actorId = ticket?.barista_id ?? state.currentUser?.id;
    if (actorId) logActivity(actorId, 'void_requested', `Void requested for order ${ticket?.no ?? orderId.slice(0, 8).toUpperCase()} — ${reason}`);
    await fetchQueue();
    return {};
  }, [fetchQueue, state.queue, state.currentUser]);

  const managerVoidOrder = useCallback(async (orderId: string, reason: string, pin: string): Promise<{ error?: string }> => {
    const online = await isOnline();
    if (!online) return { error: 'Manager PIN verification requires an internet connection' };

    // verify_manager_pin runs server-side (never exposes pin_code to the client) and applies
    // the same 5-attempt/15-minute lockout as login, keyed off this barista's own session.
    const { data: managers, error: pinErr } = await supabase.rpc('verify_manager_pin', { p_pin: pin });
    // Distinguish a genuine RPC/network failure from a real wrong-PIN attempt — collapsing
    // both into "Invalid manager PIN" was actively misleading (e.g. a dropped connection
    // looked identical to entering the wrong PIN).
    if (pinErr) return { error: pinErr.message || 'Could not verify manager PIN. Check your connection and try again.' };
    const manager = managers?.[0];
    if (!manager) return { error: 'Invalid manager PIN' };

    const ticket = state.queue.find((q) => q.id === orderId);
    const { error: voidErr } = await supabase
      .from('orders')
      .update({ status: 'voided', void_reason: reason, voided_by: manager.id })
      .eq('id', orderId);
    if (voidErr) return { error: voidErr.message };

    // Keeps the `sales` analytics mirror row from overstating revenue for a reversed order —
    // best-effort, never blocks the void itself on failure.
    supabase.rpc('adjust_sales_for_order', { p_order_id: orderId }).then(({ error }) => {
      if (error) console.warn('adjust_sales_for_order failed:', error.message);
    });
    logActivity(ticket?.barista_id ?? manager.id, 'void_approved', `Order ${ticket?.no ?? orderId.slice(0, 8).toUpperCase()} voided by manager ${manager.full_name} — ${reason}`);

    if (ticket && ticket.restoreItems.length > 0) await restoreStockForOrderItems(ticket.restoreItems);
    await fetchQueue();
    return {};
  }, [state.queue, fetchQueue]);

  // Mirrors cafe-web-dashboard's manager Transactions page refund flow exactly (same
  // refund_amount/refunded_at/refund_reason/refunded_by columns, same MVP scope: an arbitrary
  // amount against the order total rather than per-line-item selection; a full refund — amount
  // equals the total — restores ingredient stock like a void, a partial refund doesn't, since
  // there's no reliable amount-to-ingredient mapping for less than the whole order). Gated by
  // the same manager-PIN check as managerVoidOrder since, unlike the web dashboard, this runs on
  // a shared kiosk device with no per-manager login.
  const managerRefundOrder = useCallback(async (orderId: string, amount: number, reason: string, pin: string): Promise<{ error?: string }> => {
    const online = await isOnline();
    if (!online) return { error: 'Manager PIN verification requires an internet connection' };
    if (!reason.trim()) return { error: 'A refund reason is required' };

    const { data: managers, error: pinErr } = await supabase.rpc('verify_manager_pin', { p_pin: pin });
    if (pinErr) return { error: pinErr.message || 'Could not verify manager PIN. Check your connection and try again.' };
    const manager = managers?.[0];
    if (!manager) return { error: 'Invalid manager PIN' };

    // Re-fetch the order fresh rather than trusting whatever total/items History last loaded —
    // it could be stale if another device modified the order in the meantime.
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('total, total_amount, receipt_number, barista_id, order_items(menu_item_id, qty)')
      .eq('id', orderId)
      .single();
    if (fetchErr || !order) return { error: fetchErr?.message || 'Could not load the order to refund.' };

    const total = Number(order.total ?? order.total_amount ?? 0);
    if (!(amount > 0) || amount > total) {
      return { error: `Refund amount must be between ₱0.01 and ${peso0(total)}.` };
    }

    const isFull = amount === total;
    const { error: refundErr } = await supabase
      .from('orders')
      .update({
        status: isFull ? 'refunded' : 'partially_refunded',
        refund_amount: amount,
        refunded_at: new Date().toISOString(),
        refund_reason: reason.trim(),
        refunded_by: manager.id,
      })
      .eq('id', orderId);
    if (refundErr) return { error: refundErr.message };

    supabase.rpc('adjust_sales_for_order', { p_order_id: orderId }).then(({ error }) => {
      if (error) console.warn('adjust_sales_for_order failed:', error.message);
    });
    logActivity(
      order.barista_id ?? manager.id,
      'refund_issued',
      `₱${amount.toFixed(2)} refunded for order ${order.receipt_number ?? orderId.slice(0, 8).toUpperCase()} by manager ${manager.full_name} — ${reason.trim()}`
    );

    if (isFull) {
      const restoreItems = (order.order_items ?? []).map((oi: any) => ({ menu_item_id: oi.menu_item_id, qty: oi.qty }));
      if (restoreItems.length > 0) await restoreStockForOrderItems(restoreItems);
    }
    return {};
  }, []);

  // Puts the register into "add to an already-queued order" mode instead of building a new
  // order — for something like "customer adds one more cookie" after the ticket's already
  // fired, without forcing a full void + re-ring of everything already sent to the kitchen.
  const startAddToOrder = useCallback((ticket: QueueEntry) => {
    setState((s) => ({
      ...s,
      appendTargetOrderId: ticket.id,
      appendTargetOrderNo: ticket.no,
      orderType: ticket.type === 'Takeout' ? 'takeout' : 'dine-in',
      cart: [],
      selMods: {},
      qty: 1,
      note: '',
      discountName: 'None',
      payMethod: 'cash',
      tendered: '',
      customerName: '',
      showQueue: false,
      screen: 'menu',
    }));
  }, []);

  const cancelAddToOrder = useCallback(() => {
    setState((s) => ({ ...s, appendTargetOrderId: null, appendTargetOrderNo: null, cart: [], screen: 'menu' }));
  }, []);

  // ─────────────────────────────────────────────
  // CART / CUSTOMIZE
  // ─────────────────────────────────────────────
  const selectType = useCallback((v: OrderType) => {
    setState((s) => {
      const fromOrderTypeScreen = s.screen === 'orderType';
      // The OrderType screen is only reachable via "Change Type" or after done() resets things
      // for the next customer — if an add-to-order was left mid-flow, picking a type here is an
      // unambiguous signal the barista is starting something fresh, not continuing the top-up.
      const wasAppending = fromOrderTypeScreen && !!s.appendTargetOrderId;
      return {
        ...s,
        orderType: v,
        screen: fromOrderTypeScreen ? 'menu' : s.screen,
        // On tablet this is the moment OrderDock (and its checkout error banner)
        // becomes visible again — clear a stale error from a previous failed
        // attempt so it doesn't reappear before a new payment attempt.
        checkoutError: fromOrderTypeScreen ? null : s.checkoutError,
        appendTargetOrderId: wasAppending ? null : s.appendTargetOrderId,
        appendTargetOrderNo: wasAppending ? null : s.appendTargetOrderNo,
        cart: wasAppending ? [] : s.cart,
      };
    });
  }, []);

  const openItem = useCallback((menuId: string) => {
    patch({ selItemId: menuId, selMods: {}, qty: 1, note: '' });
  }, [patch]);

  const closeItem = useCallback(() => patch({ selItemId: null }), [patch]);

  const toggleMod = useCallback((g: ModGroupDef, opt: SelectedMod) => {
    setState((s) => {
      const cur = s.selMods[g.id] || [];
      let next: SelectedMod[];
      if (g.multi) {
        next = cur.some((o) => o.name === opt.name) ? cur.filter((o) => o.name !== opt.name) : [...cur, opt];
      } else {
        next = cur.some((o) => o.name === opt.name) ? [] : [opt];
      }
      return { ...s, selMods: { ...s.selMods, [g.id]: next } };
    });
  }, []);

  const addToCart = useCallback(() => {
    setState((s) => {
      const si = s.menuItems.find((m) => m.id === s.selItemId);
      if (!si) return s;
      const groups = s.modifierGroupsByItem[si.id] ?? [];
      const requiredGroups = groups.filter((g) => g.required);
      const valid = requiredGroups.every((g) => (s.selMods[g.id] || []).length > 0);
      if (!valid) return s;
      const mods = Object.values(s.selMods).flat();
      const modNames = mods.map((m) => (m.p ? `${m.name} +₱${m.p}` : m.name));
      const modifiers = mods.map((m) => ({ name: m.name, price: m.p }));
      const unit = si.price + modTotal(s.selMods);
      return {
        ...s,
        cart: [
          ...s.cart,
          { cartId: 'c' + s.nextId, menuId: si.id, name: si.name, unit, qty: s.qty, mods: modNames, modifiers, note: s.note },
        ],
        nextId: s.nextId + 1,
        selItemId: null,
      };
    });
  }, []);

  const changeQty = useCallback((cartId: string, d: number) => {
    setState((s) => ({
      ...s,
      cart: s.cart.map((c) => (c.cartId === cartId ? { ...c, qty: c.qty + d } : c)).filter((c) => c.qty > 0),
    }));
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setState((s) => ({ ...s, cart: s.cart.filter((c) => c.cartId !== cartId) }));
  }, []);

  const discountPct = useMemo(
    () => state.discountsList.find((d) => d.n === state.discountName)?.p ?? 0,
    [state.discountsList, state.discountName]
  );

  const totals = useMemo(() => {
    const subtotal = state.cart.reduce((sum, c) => sum + c.unit * c.qty, 0);
    const t = computeOrderTotals({
      subtotal,
      discountPct,
      orderType: state.orderType,
      taxRatePct: state.storeSettings.taxRatePct,
      isTaxInclusive: state.storeSettings.isTaxInclusive,
      serviceChargePct: state.storeSettings.serviceChargePct,
    });
    return { sub: t.subtotal, disc: t.discountAmount, service: t.serviceChargeAmount, tax: t.taxAmount, total: t.total };
  }, [state.cart, discountPct, state.orderType, state.storeSettings]);

  // ─────────────────────────────────────────────
  // CHECKOUT
  // ─────────────────────────────────────────────
  const checkout = useCallback(async () => {
    if (!state.currentUser || state.cart.length === 0 || state.checkoutBusy) return;
    patch({ checkoutBusy: true, checkoutError: null });
    if (authSyncRef.current) await authSyncRef.current;

    const isAppend = !!state.appendTargetOrderId;
    // Appending to an existing order has no offline outbox path of its own (unlike a brand-new
    // order) — merging into a possibly-already-synced parent row safely needs a live round trip.
    if (isAppend && !(await isOnline())) {
      patch({ checkoutBusy: false, checkoutError: 'Adding items to an existing order requires an internet connection. Please reconnect and try again.' });
      return;
    }

    const receiptNumber = 'REC-' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(2, 5).toUpperCase();
    const tenderNum = state.tendered !== '' && !isNaN(Number(state.tendered)) ? Number(state.tendered) : null;
    const isCash = state.payMethod === 'cash';
    const change = isCash && tenderNum !== null ? tenderNum - totals.total : 0;

    const orderData: PosOrderData = {
      total: totals.total,
      total_amount: totals.total,
      payment_method: state.payMethod,
      receipt_number: receiptNumber,
      barista_id: state.currentUser.id,
      status: 'pending',
      order_type: state.orderType,
      customer_name: state.customerName.trim() || null,
      discount_name: state.discountName !== 'None' ? state.discountName : null,
      discount_id: state.discountsList.find((d) => d.n === state.discountName)?.id ?? null,
      subtotal: totals.sub,
      discount_amount: totals.disc,
      tax_amount: totals.tax,
      service_charge_amount: totals.service,
      is_tax_inclusive: state.storeSettings.isTaxInclusive,
      rush_mode: state.storeSettings.rushModeEnabled,
    };
    const orderItems: PosOrderItem[] = state.cart.map((c) => ({
      menu_item_id: c.menuId,
      qty: c.qty,
      unit_price: c.unit,
      modifiers_json: JSON.stringify(c.modifiers),
      special_note: c.note || null,
    }));
    const cartModsStr = (c: CartItem) => {
      const parts = [...c.mods];
      if (c.note) parts.push(`Note: ${c.note}`);
      return parts.length > 0 ? parts.join(', ') : undefined;
    };
    const displayItems = state.cart.map((c) => ({ name: c.name, qty: c.qty, mods: cartModsStr(c) }));

    try {
      if (isAppend) {
        await addItemsToExistingOrder(state.appendTargetOrderId!, orderItems, state.payMethod, {
          subtotal: totals.sub,
          discount_amount: totals.disc,
          tax_amount: totals.tax,
          service_charge_amount: totals.service,
          total: totals.total,
        });
      } else {
        await submitOrder(orderData, orderItems, displayItems);
      }
    } catch (e: any) {
      errorHaptic();
      patch({ checkoutBusy: false, checkoutError: e?.message || 'Checkout failed. Please try again.' });
      return;
    }
    successHaptic();

    const items = state.cart.map((c) => ({ qtyName: `${c.qty}× ${c.name}`, lineStr: peso0(c.unit * c.qty), modsStr: cartModsStr(c) }));
    const success: SuccessInfo = {
      no: isAppend ? state.appendTargetOrderNo! : receiptNumber,
      total: totals.total,
      method: isCash ? 'Cash' : 'GCash',
      items,
      showChange: isCash && change >= 0,
      change,
      customerName: isAppend ? null : orderData.customer_name,
    };
    patch({ success, screen: 'success', checkoutBusy: false, checkoutError: null });
    fetchQueue();
  }, [state.currentUser, state.cart, state.tendered, state.payMethod, state.orderType, state.storeSettings, state.customerName, state.checkoutBusy, state.appendTargetOrderId, state.appendTargetOrderNo, totals, patch, fetchQueue]);

  const done = useCallback(() => {
    setState((s) => ({
      ...s,
      screen: 'orderType',
      cart: [],
      selMods: {},
      qty: 1,
      note: '',
      tendered: '',
      discountName: 'None',
      customerName: '',
      payMethod: 'cash',
      success: null,
      selCat: 'All',
      search: '',
      showGcashQr: false,
      appendTargetOrderId: null,
      appendTargetOrderNo: null,
    }));
  }, []);

  const cartQtyByMenuId = useMemo(() => {
    const map: Record<string, number> = {};
    state.cart.forEach((c) => {
      map[c.menuId] = (map[c.menuId] || 0) + c.qty;
    });
    return map;
  }, [state.cart]);

  // Live stock status per menu item, from the same master-stock ingredient
  // data the web dashboard's "Master Stock" tab reads — so the grid reflects
  // real-time availability instead of only gating at checkout.
  const stockByMenuId = useMemo(() => {
    const cartArr = state.cart.map((c) => ({ menuId: c.menuId, qty: c.qty }));
    const map: Record<string, MenuItemStock> = {};
    state.menuItems.forEach((m) => {
      const hasRecipe = (state.recipesByItem[m.id]?.length ?? 0) > 0;
      if (!hasRecipe) {
        map[m.id] = { unavailable: false, qty: null, low: false };
        return;
      }
      const maxQty = getMaxAddableQty(m.id, cartArr, state.recipesByItem, state.ingredientStock, state.storeSettings.rushModeEnabled);
      map[m.id] = {
        unavailable: maxQty <= 0,
        qty: maxQty,
        low: maxQty > 0 && maxQty <= LOW_STOCK_THRESHOLD,
      };
    });
    return map;
  }, [state.menuItems, state.cart, state.recipesByItem, state.ingredientStock, state.storeSettings.rushModeEnabled]);

  // Deliberate: once the barista is actively typing a search, it matches across every
  // category, not just the currently-selected tab. Scoping to the active tab would silently
  // return zero results for an item that exists but sits under a different tab than whatever
  // was last selected — worse than the reverse for a fast-moving register.
  const filteredItems = useMemo(() => {
    const q = state.search.toLowerCase();
    return state.menuItems.filter(
      (m) => (state.search.trim() || state.selCat === 'All' || m.category === state.selCat) && m.name.toLowerCase().includes(q)
    );
  }, [state.search, state.selCat, state.menuItems]);

  const selectedItem = useMemo(() => state.menuItems.find((m) => m.id === state.selItemId) || null, [state.selItemId, state.menuItems]);

  const selectedItemGroups = useMemo(
    () => (selectedItem ? state.modifierGroupsByItem[selectedItem.id] ?? [] : []),
    [selectedItem, state.modifierGroupsByItem]
  );

  const addValid = useMemo(() => {
    const modsOk = !selectedItemGroups.some((g) => g.required && !(state.selMods[g.id] || []).length);
    if (!modsOk) return false;
    if (selectedItem && isOutOfStock(selectedItem.id, state.recipesByItem, state.ingredientStock, state.storeSettings.rushModeEnabled)) return false;
    return true;
  }, [selectedItemGroups, state.selMods, selectedItem, state.recipesByItem, state.ingredientStock, state.storeSettings.rushModeEnabled]);

  const addUnitTotal = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedItem.price + modTotal(state.selMods);
  }, [selectedItem, state.selMods]);

  const maxAddableForSelected = useMemo(() => {
    if (!selectedItem) return Infinity;
    return getMaxAddableQty(
      selectedItem.id,
      state.cart.map((c) => ({ menuId: c.menuId, qty: c.qty })),
      state.recipesByItem,
      state.ingredientStock,
      state.storeSettings.rushModeEnabled
    );
  }, [selectedItem, state.cart, state.recipesByItem, state.ingredientStock, state.storeSettings.rushModeEnabled]);

  const tenderNum = useMemo(
    () => (state.tendered !== '' && !isNaN(Number(state.tendered)) ? Number(state.tendered) : null),
    [state.tendered]
  );
  const change = tenderNum !== null ? tenderNum - totals.total : null;
  const shortfall = state.payMethod === 'cash' && tenderNum !== null && tenderNum < totals.total;
  const cartCount = state.cart.reduce((s, c) => s + c.qty, 0);

  return {
    state,
    patch,
    selectType,
    openItem,
    closeItem,
    toggleMod,
    addToCart,
    changeQty,
    removeFromCart,
    checkout,
    done,
    completeQueueTicket,
    flagVoidOrder,
    managerVoidOrder,
    managerRefundOrder,
    startAddToOrder,
    cancelAddToOrder,
    totals,
    discountPct,
    cartQtyByMenuId,
    stockByMenuId,
    filteredItems,
    selectedItem,
    selectedItemGroups,
    addValid,
    addUnitTotal,
    maxAddableForSelected,
    tenderNum,
    change,
    shortfall,
    cartCount,
    categories: state.categories,
    discounts: state.discountsList,
    quickCash: QUICK_CASH,

    // auth / shift
    login,
    logout,
    lockPos,
    uploadAvatar,
    openShiftAction,
    closeShiftAction,
  };
}

export type CremaPos = ReturnType<typeof useCremaPos>;
export { peso, peso0 };
