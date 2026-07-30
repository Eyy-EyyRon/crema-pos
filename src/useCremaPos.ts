import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { QUICK_CASH } from './data';
import { peso, peso0 } from './format';
import { supabase } from './lib/supabase';
import { closeShift as closeShiftApi, getOpenShift, openShift as openShiftApi } from './lib/cashDrawer';
import { success as successHaptic, error as errorHaptic } from './lib/haptics';
import {
  PosOrderData,
  PosOrderItem,
  RecipeRow,
  buildRecipesByItem,
  computeOrderTotals,
  getMaxAddableQty,
  isOutOfStock,
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
  cart: CartItem[];
  nextId: number;
  success: SuccessInfo | null;
  queue: QueueEntry[];
  /** Count of orders placed today, server-side — used to show the upcoming ticket number before checkout. */
  todayOrderCount: number;
  showGcashQr: boolean;

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
  cart: [],
  nextId: 1,
  success: null,
  queue: [],
  todayOrderCount: 0,
  showGcashQr: false,

  currentUser: null,
  authLoading: true,
  shift: null,
  shiftLoading: true,
  isOffline: false,
  checkoutBusy: false,
  checkoutError: null,

  menuItems: [],
  categories: ['All'],
  discountsList: [{ n: 'None', p: 0 }],
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
        const cachedHash = await AsyncStorage.getItem(pinHashKey);
        if (cachedHash) {
          const candidateHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            `${profileId}:${opts.pin}`
          );
          if (candidateHash !== cachedHash) return { error: 'Invalid PIN' };
          fastPathOk = true;
        }
      }

      if (fastPathOk) {
        // Instantly log the user in visually so the POS is immediately ready
        setState((s) => ({ ...s, currentUser: cachedProfile }));

        // Perform the actual network auth and time-clock punch in the background. Stored in
        // authSyncRef (not fire-and-forget) so writes that need a real session — most
        // urgently opening the cash drawer, which happens immediately after login — can await
        // it first instead of running under a stale/anon session and failing RLS.
        authSyncRef.current = (async () => {
          const online = await isOnline();
          if (!online) {
            patch({ isOffline: true });
            return;
          }
          try {
            const body = opts.biometric ? { profile_id: profileId, biometric: true } : { profile_id: profileId, pin: opts.pin };
            const { data, error } = await supabase.functions.invoke('pin-login', { body });
            if (!error && data?.access_token) {
              await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
              await clockIn(profileId);
            } else {
              // Online but the real session/clock-in never happened (e.g. PIN changed or
              // profile deactivated since this device last cached it) — the visible
              // fast-path login can't be un-shown safely, but this is not silent: any
              // subsequent write (checkout, etc.) will now correctly fail under RLS since
              // there's no real authenticated session, surfacing via checkoutError.
              console.warn('Background auth did not return a session:', error);
            }
          } catch (e) {
            console.warn('Background auth failed:', e);
          } finally {
            authSyncRef.current = null;
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
    if (authSyncRef.current) await authSyncRef.current;
    try {
      const s = await openShiftApi(state.currentUser.id, startingCash);
      patch({ shift: s });
    } catch (e: any) {
      return e.message || 'Could not open shift';
    }
  }, [state.currentUser, patch]);

  const closeShiftAction = useCallback(async (endingCash: number): Promise<string | void> => {
    if (!state.shift) return 'No open shift';
    try {
      await closeShiftApi(state.shift.id, endingCash);
      await logout();
    } catch (e: any) {
      return e.message || 'Could not close shift';
    }
  }, [state.shift, logout]);

  // ─────────────────────────────────────────────
  // MENU / MODS / DISCOUNTS / STORE SETTINGS
  // Mirrors cafe-web-dashboard/app/manager/pos/page.tsx's fetchAll query set —
  // same tables/columns, so menu changes made from the web dashboard show up
  // here too.
  // ─────────────────────────────────────────────
  const fetchMenuData = useCallback(async () => {
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
      { n: 'None', p: 0 },
      ...(discountsData ?? []).map((d: any) => ({ n: d.name, p: Number(d.percentage) })),
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
      items: (o.order_items ?? []).map((oi: any) => [oi.menu_items?.name ?? 'Item', oi.qty] as [string, number]),
      total: Number(o.total ?? o.total_amount ?? 0),
      restoreItems: (o.order_items ?? []).map((oi: any) => ({ menu_item_id: oi.menu_item_id, qty: oi.qty })),
    }));

  const buildQueueFromOutbox = (entries: OutboxEntry[]): QueueEntry[] =>
    entries.map((e) => ({
      id: e.id,
      no: e.orderData.receipt_number,
      type: e.orderData.order_type === 'takeout' ? 'Takeout' : 'Dine-In',
      mins: elapsedMinutes(e.timestamp),
      items: e.displayItems.map((d) => [d.name, d.qty] as [string, number]),
      total: e.orderData.total,
      restoreItems: [],
      pendingSync: true,
    }));

  const fetchQueue = useCallback(async () => {
    const [{ data }, outboxEntries] = await Promise.all([
      supabase
        .from('orders')
        .select(
          'id, receipt_number, created_at, total, total_amount, order_type, order_items(qty, menu_item_id, menu_items(name))'
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());
    if (count !== null) setState((s) => ({ ...s, todayOrderCount: count }));
  }, []);

  useEffect(() => {
    if (!state.currentUser) return;
    fetchQueue();
    fetchTodayOrderCount();
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
    }, 10000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id, fetchQueue, fetchTodayOrderCount]);

  const completeQueueTicket = useCallback((id: string) => {
    setState((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== id) }));
    if (id.startsWith('outbox-')) return;
    supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', id)
      .then(({ error }) => {
        if (error) fetchQueue();
      });
  }, [fetchQueue]);

  const flagVoidOrder = useCallback(async (orderId: string, reason: string): Promise<{ error?: string }> => {
    const { error } = await supabase.from('orders').update({ status: 'void_requested', void_reason: reason }).eq('id', orderId);
    if (error) return { error: error.message };
    await fetchQueue();
    return {};
  }, [fetchQueue]);

  const managerVoidOrder = useCallback(async (orderId: string, reason: string, pin: string): Promise<{ error?: string }> => {
    // verify_manager_pin runs server-side (never exposes pin_code to the client) and applies
    // the same 5-attempt/15-minute lockout as login, keyed off this barista's own session.
    const { data: managers, error: pinErr } = await supabase.rpc('verify_manager_pin', { p_pin: pin });
    const manager = managers?.[0];
    if (pinErr || !manager) return { error: 'Invalid manager PIN' };

    const ticket = state.queue.find((q) => q.id === orderId);
    const { error: voidErr } = await supabase
      .from('orders')
      .update({ status: 'voided', void_reason: reason, voided_by: manager.id })
      .eq('id', orderId);
    if (voidErr) return { error: voidErr.message };

    if (ticket && ticket.restoreItems.length > 0) await restoreStockForOrderItems(ticket.restoreItems);
    await fetchQueue();
    return {};
  }, [state.queue, fetchQueue]);

  // ─────────────────────────────────────────────
  // CART / CUSTOMIZE
  // ─────────────────────────────────────────────
  const selectType = useCallback((v: OrderType) => {
    setState((s) => ({ ...s, orderType: v, screen: s.screen === 'orderType' ? 'menu' : s.screen }));
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
    const displayItems = state.cart.map((c) => ({ name: c.name, qty: c.qty }));

    try {
      await submitOrder(orderData, orderItems, displayItems);
    } catch (e: any) {
      errorHaptic();
      patch({ checkoutBusy: false, checkoutError: e?.message || 'Checkout failed. Please try again.' });
      return;
    }
    successHaptic();

    const items = state.cart.map((c) => ({ qtyName: `${c.qty}× ${c.name}`, lineStr: peso0(c.unit * c.qty) }));
    const success: SuccessInfo = {
      no: receiptNumber,
      total: totals.total,
      method: isCash ? 'Cash' : 'GCash',
      items,
      showChange: isCash && change >= 0,
      change,
    };
    patch({ success, screen: 'success', checkoutBusy: false, checkoutError: null });
    fetchQueue();
  }, [state.currentUser, state.cart, state.tendered, state.payMethod, state.orderType, state.storeSettings, state.checkoutBusy, totals, patch, fetchQueue]);

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
      payMethod: 'cash',
      success: null,
      selCat: 'All',
      search: '',
      showGcashQr: false,
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
