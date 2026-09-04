import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { QUICK_CASH } from './data';
import { peso, peso0, nextDailyOrderNo, formatOrderNo } from './format';
import { supabase } from './lib/supabase';
import { logActivity } from './lib/activityLog';
import { closeShift as closeShiftApi, getOpenShift, openShift as openShiftApi, shiftRlsMessage } from './lib/cashDrawer';
import { clearPinHash, readMenuCache, readValidPinHash, writeMenuCache, writePinHash } from './lib/deviceCache';
import { requirePosSession, SESSION_MISSING_MESSAGE } from './lib/posSession';
import { success as successHaptic, error as errorHaptic } from './lib/haptics';
import { notify } from './lib/crossAlert';
import { APP_VERSION, isNewerVersion } from './lib/appUpdate';
import {
  PaymentSplitComponent,
  PosOrderData,
  PosOrderItem,
  RecipeRow,
  addItemsToExistingOrder,
  buildRecipesByItem,
  computeDiscountAmount,
  computeOrderTotalsMultiRate,
  getMaxAddableQty,
  isOutOfStock,
  modsDisplayString,
  restoreStockForOrderItems,
} from './lib/posOrder';
import { REASON_CODE_LABELS, ReasonCode } from './lib/reasonCodes';
import { playNewOrderChime } from './lib/sound';
import { cacheManagerPinOnVerify, tryOfflineManagerPin } from './lib/managerPinCache';
import { applyLoyaltyPoints, createCustomer, lookupCustomerByPhone, lookupCustomerByCardCode } from './lib/customers';
import { checkGiftCardBalance, redeemGiftCard } from './lib/giftCards';
import { sendReceiptEmail } from './lib/receiptEmail';
import {
  OutboxEntry,
  deleteOutboxEntry as deleteOutboxEntryApi,
  getOutboxCount,
  getOutboxOrders,
  isOnline,
  queueAction,
  retryOutboxEntry as retryOutboxEntryApi,
  submitOrder,
  syncActionOutbox,
  syncOutbox,
} from './lib/syncEngine';
import { clockIn, clockOut } from './lib/timeClock';
import {
  CartItem,
  Customer,
  Discount,
  ModGroupDef,
  ModOptionDef,
  OrderType,
  orderTypeLabel as toOrderTypeLabel,
  PayMethod,
  PopupContext,
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
  loyaltyEnabled: boolean;
  loyaltyPhpPerPoint: number;
  loyaltyPointValuePhp: number;
  appUpdateUrl: string | null;
  appUpdateVersion: string | null;
  // Checkout customization (manager's Feature Toggles page, cafe-web-dashboard). Cash/GCash/Gift
  // Card + Split cover every payment method this app actually offers — Maya/Card are web-dashboard
  // (stationary terminal) only options, so this app has no toggle for them.
  checkoutAllowCash: boolean;
  checkoutAllowGcash: boolean;
  checkoutAllowGiftCard: boolean;
  checkoutAllowSplitPayment: boolean;
  checkoutAllowDineIn: boolean;
  checkoutAllowTakeout: boolean;
  checkoutAllowDelivery: boolean;
  checkoutRequireCustomerName: boolean;
  checkoutAllowDiscounts: boolean;
  checkoutAllowLoyaltyRedemption: boolean;
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
  loyaltyEnabled: false,
  loyaltyPhpPerPoint: 20,
  loyaltyPointValuePhp: 0.5,
  appUpdateUrl: null,
  appUpdateVersion: null,
  checkoutAllowCash: true,
  checkoutAllowGcash: true,
  checkoutAllowGiftCard: true,
  checkoutAllowSplitPayment: true,
  checkoutAllowDineIn: true,
  checkoutAllowTakeout: true,
  checkoutAllowDelivery: true,
  checkoutRequireCustomerName: false,
  checkoutAllowDiscounts: true,
  checkoutAllowLoyaltyRedemption: true,
};

// Below this many sellable units left, the menu grid flags the item as low
// stock instead of waiting for it to hit zero.
const LOW_STOCK_THRESHOLD = 5;

// `menu_categories` is the manager-ordered tab list; items also carry a denormalized
// `category` string. If the table is empty or missing a name that's still on products
// (Hot Coffee / Cold Drinks), union them so the chip row isn't just "All".
function mergeMenuCategories(tableNames: string[], itemCategories: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string | null | undefined) => {
    const name = (raw ?? '').trim();
    if (!name || name.toLowerCase() === 'all' || seen.has(name)) return;
    seen.add(name);
    out.push(name);
  };
  tableNames.forEach(push);
  itemCategories.forEach(push);
  return ['All', ...out];
}

// Deliberately NOT the get_cash_drawer_reconciliation() reconciliation (cash_sales/
// expected_ending_cash/variance/gcash_sales) — this is just a receipt of what the barista
// themselves already knew (their starting float, and the ending count they just entered), shown
// right before logout. Keeping the barista blind to the expected/GCash figures is the point: they
// have to actually count the drawer instead of typing back a number the app hands them. The real
// reconciliation stays manager-only, reviewed on cafe-web-dashboard's Staff page.
export interface ShiftCloseSummary {
  startingCash: number;
  actualEndingCash: number;
}

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
  showOutbox: boolean;
  outboxCount: number;
  /** Set briefly when a NEW order lands in the queue that this terminal's barista didn't place. */
  newOrderAlert: { orderNo: string } | null;
  orderType: OrderType;
  /** Required only when orderType === 'delivery' — see deliveryAddressMissing gate in PosApp.tsx. */
  deliveryAddress: string;
  selCat: string;
  search: string;
  selItemId: string | null;
  /** When set, the customize sheet is editing this cart line instead of adding a new one. */
  editingCartId: string | null;
  selMods: SelectedMods;
  qty: number;
  note: string;
  payMethod: PayMethod;
  tendered: string;
  /** True when the customer is paying with two methods (cash + GCash) on one order. */
  splitEnabled: boolean;
  splitCashAmount: string;
  splitGcashAmount: string;
  /** Gift card leg of a split payment — a THIRD leg alongside cash/GCash above, not the exclusive
   *  gift-card payMethod path (giftCardCode/giftCardBalance/etc. below stay that one's own state). */
  splitGiftCardAmount: string;
  splitGiftCardCode: string;
  splitGiftCardBalance: number | null;
  splitGiftCardChecking: boolean;
  splitGiftCardError: string | null;
  discountName: string;
  customerName: string;
  /** Phone number typed into the checkout customer-lookup field — not yet confirmed against the customers table. */
  customerPhone: string;
  customerLookupStatus: 'idle' | 'searching' | 'found' | 'not_found';
  /** Which lookup method the barista currently has selected — phone (default) or loyalty card code. */
  customerLookupMode: 'phone' | 'card';
  /** Loyalty card code typed into the checkout customer-lookup field, used when customerLookupMode === 'card'. */
  customerCardCode: string;
  /** Card-mode-only not-found/revoked explanation — phone mode keeps its own hardcoded message in CheckoutShared.tsx. */
  customerLookupMessage: string | null;
  selectedCustomer: Customer | null;
  newCustomerName: string;
  customerCreating: boolean;
  /** Loyalty points the barista has typed in to redeem on this order — a string so the input can be empty, clamped at checkout time. */
  redeemPoints: string;
  giftCardCode: string;
  giftCardBalance: number | null;
  giftCardChecking: boolean;
  giftCardError: string | null;
  /** Optional email to send this order's receipt to — captured at checkout, not required. */
  receiptEmail: string;
  cart: CartItem[];
  nextId: number;
  success: SuccessInfo | null;
  queue: QueueEntry[];
  /** Count of orders placed today, server-side — used to show the upcoming ticket number before checkout. */
  todayOrderCount: number;
  showGcashQr: boolean;
  /** Camera QR-scanner overlay, shared between loyalty-card and gift-card lookup — see
   *  openQrScanner()/handleQrScanned(). Which flow it's currently serving is qrScanTarget. */
  showQrScanner: boolean;
  qrScanTarget: 'loyalty' | 'gift_card' | null;
  /** Dismissing the "Update available" banner only silences it for this login session — it
   *  resets to false (and can reappear) on every fresh login/lockPos, not persisted to disk. */
  updateDismissed: boolean;
  /** GCash reference/transaction number typed in by the barista, required to confirm a GCash payment. */
  gcashReference: string;
  /** Barista's explicit attestation that the customer's GCash payment went through. */
  gcashConfirmed: boolean;
  showGcashProofCamera: boolean;
  /** Local file uri of a barista-captured photo of the customer's payment-confirmation screen —
   *  kept even after upload succeeds so the thumbnail renders instantly. Optional/best-effort,
   *  same contract as gcashReference: never blocks checkout. */
  gcashProofUri: string | null;
  /** Public Supabase Storage URL once upload succeeds — this, not gcashProofUri, is what reaches
   *  the order. Null while never captured, still uploading, or failed. */
  gcashProofUrl: string | null;
  gcashProofUploading: boolean;
  /** Set while the cart being built is meant to top up an already-queued order rather than create a new one. */
  appendTargetOrderId: string | null;
  appendTargetOrderNo: string | null;
  upcomingShifts: ShiftScheduleEntry[];

  // auth / shift
  currentUser: UserProfile | null;
  authLoading: boolean;
  shift: Shift | null;
  shiftLoading: boolean;
  shiftCloseSummary: ShiftCloseSummary | null;
  isOffline: boolean;
  checkoutBusy: boolean;
  checkoutError: string | null;
  avatarUploading: boolean;

  // live backend data
  menuItems: { id: string; name: string; price: number; category: string; tax_rate_id: string | null; is_active: boolean }[];
  categories: string[];
  discountsList: Discount[];
  modifierGroupsByItem: Record<string, ModGroupDef[]>;
  recipesByItem: Record<string, RecipeRow[]>;
  recipesByModifier: Record<string, RecipeRow[]>;
  ingredientStock: Record<string, number>;
  ingredientsList: { id: string; name: string; unit: string; current_stock: number }[];
  /** Non-default tax rates a menu item can be explicitly assigned via tax_rate_id — a menu item
   *  left unassigned always resolves to storeSettings.taxRatePct, never a row from here. */
  taxRateById: Record<string, number>;
  storeSettings: StoreSettings;
  /** This barista's active popup_staff assignment, resolved once at login (see
   *  fetchMenuDataFromNetwork). Null when they have no active assignment — full main-store menu. */
  popupContext: PopupContext | null;
}

const initialState: PosState = {
  screen: 'orderType',
  showQueue: false,
  showAccount: false,
  showOutbox: false,
  outboxCount: 0,
  newOrderAlert: null,
  orderType: 'dine-in',
  deliveryAddress: '',
  selCat: 'All',
  search: '',
  selItemId: null,
  editingCartId: null,
  selMods: {},
  qty: 1,
  note: '',
  payMethod: 'cash',
  tendered: '',
  splitEnabled: false,
  splitCashAmount: '',
  splitGcashAmount: '',
  splitGiftCardAmount: '',
  splitGiftCardCode: '',
  splitGiftCardBalance: null,
  splitGiftCardChecking: false,
  splitGiftCardError: null,
  discountName: 'None',
  customerName: '',
  customerPhone: '',
  customerLookupStatus: 'idle',
  customerLookupMode: 'phone',
  customerCardCode: '',
  customerLookupMessage: null,
  selectedCustomer: null,
  newCustomerName: '',
  customerCreating: false,
  redeemPoints: '',
  giftCardCode: '',
  giftCardBalance: null,
  giftCardChecking: false,
  giftCardError: null,
  receiptEmail: '',
  cart: [],
  nextId: 1,
  success: null,
  queue: [],
  todayOrderCount: 0,
  showGcashQr: false,
  showQrScanner: false,
  qrScanTarget: null,
  updateDismissed: false,
  gcashReference: '',
  gcashConfirmed: false,
  showGcashProofCamera: false,
  gcashProofUri: null,
  gcashProofUrl: null,
  gcashProofUploading: false,
  appendTargetOrderId: null,
  appendTargetOrderNo: null,
  upcomingShifts: [],

  currentUser: null,
  authLoading: true,
  shift: null,
  shiftLoading: true,
  shiftCloseSummary: null,
  isOffline: false,
  checkoutBusy: false,
  checkoutError: null,
  avatarUploading: false,

  menuItems: [],
  categories: ['All'],
  discountsList: [{ id: null, n: 'None', p: 0, type: 'percent', fixedAmount: null, minSpend: null, validFromHour: null, validToHour: null }],
  modifierGroupsByItem: {},
  recipesByItem: {},
  recipesByModifier: {},
  ingredientStock: {},
  ingredientsList: [],
  taxRateById: {},
  storeSettings: DEFAULT_STORE_SETTINGS,
  popupContext: null,
};

function modTotal(sel: SelectedMods): number {
  return Object.values(sel)
    .flat()
    .reduce((s, o) => s + o.p, 0);
}

/** Rebuild group-keyed selMods from a cart line's flat modifiers list so the customize sheet can re-open with the same picks. */
function selModsFromCartModifiers(
  modifiers: { name: string; price: number }[],
  groups: ModGroupDef[]
): SelectedMods {
  const sel: SelectedMods = {};
  for (const g of groups) {
    const picked: SelectedMod[] = [];
    for (const [optId, optName, optPrice] of g.options) {
      const match = modifiers.find((m) => m.name === optName);
      if (match) picked.push({ id: optId, name: optName, p: match.price ?? optPrice });
    }
    if (picked.length) sel[g.id] = picked;
  }
  return sel;
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
  // Tracks which order ids fetchQueue has already seen, so a newly-arrived order (placed by a
  // DIFFERENT barista/terminal) can trigger the new-order alert exactly once. Starts null so the
  // very first load — which is the whole existing queue, not "new" orders — never fires it.
  const seenOrderIdsRef = useRef<Set<string> | null>(null);
  // Mirrors state.currentUser?.id for fetchQueue's stable (deps: []) closure to read without
  // becoming stale — an order this same barista just placed themselves must never trigger their
  // own new-order alert.
  const currentUserIdRef = useRef<string | null>(null);

  // Undo-window for the cart trash button (see UndoToast.tsx) — deliberately separate from the
  // main `state` object rather than folded into it, since this is ephemeral UI feedback about a
  // removal, not persisted order data.
  const [pendingUndo, setPendingUndo] = useState<{ item: CartItem; index: number } | null>(null);
  const pendingUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPendingUndo = useCallback(() => {
    if (pendingUndoTimerRef.current) clearTimeout(pendingUndoTimerRef.current);
    pendingUndoTimerRef.current = null;
    setPendingUndo(null);
  }, []);

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
    // 1. FAST PATH: optimistic local validation against a SHA-256 hash of the PIN cached after
    // a previous successful online login — never the raw PIN itself, so there's nothing to leak
    // from this cache. Only available once this device has logged this profile in online at
    // least once, and only within PIN_HASH_TTL (see deviceCache.ts); otherwise falls through
    // to the slow/online path below.
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

        const cachedHash = await readValidPinHash(profileId);
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
              if (opts.pin) {
                const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${profileId}:${opts.pin}`);
                await writePinHash(profileId, hash);
              }
            } else {
              // Online but the real session/clock-in never happened (e.g. PIN changed or
              // profile deactivated since this device last cached it). Drop the local hash
              // so the next attempt must re-auth online instead of unlocking on a stale PIN.
              await clearPinHash(profileId);
              console.warn('Background auth did not return a session:', error);
              notify(
                'Session Expired',
                "Your login couldn't be verified online. Please log in again to keep taking orders safely.",
                () => { lockPos(); }
              );
            }
          } catch (e) {
            if (loginSeqRef.current !== seq) return;
            console.warn('Background auth failed:', e);
            notify(
              'Connection Issue',
              "Couldn't verify your login with the server. Please log in again once you have a connection.",
              () => { lockPos(); }
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

    // 2. SLOW PATH: no usable local cache (first login on this device, expired PIN hash, or
    // no cached PIN hash yet) — requires connectivity, goes through pin-login directly.
    const online = await isOnline();
    if (!online) return { error: cachedProfile ? 'PIN cache expired. Connect to the internet to log in.' : 'Offline and no cached profile available' };

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
      .select('id, full_name, role, avatar_url, is_senior_barista, self_void_threshold_php')
      .eq('id', profileId)
      .single();
    if (!profile) return { error: 'Profile not found' };

    if (opts.pin) {
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${profileId}:${opts.pin}`);
      await writePinHash(profileId, hash);
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

    patch({ avatarUploading: true });
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
      notify('Upload Failed', 'Could not upload avatar: ' + e.message);
    } finally {
      patch({ avatarUploading: false });
    }
  }, [state.currentUser, patch]);

  // Optional/best-effort, same contract as gcashReference — never surfaces a blocking alert on
  // failure, since checkout must still be able to proceed without this photo. Uses photo.format
  // rather than parsing an extension off the uri (unlike uploadAvatar) because on web
  // CameraCapturedPicture.uri is a data: URI with no trailing '.ext' token to parse.
  const handleGcashProofCaptured = useCallback(async (uri: string, format: 'jpg' | 'png') => {
    if (!state.currentUser) return;
    patch({ gcashProofUri: uri, gcashProofUrl: null, gcashProofUploading: true });
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      const filename = `${state.currentUser.id}-${Date.now()}.${format}`;
      const { error } = await supabase.storage.from('gcash-proofs').upload(filename, blob, { upsert: true });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('gcash-proofs').getPublicUrl(filename);
      // Guard against a stale upload's completion clobbering a photo the barista already retook
      // while this one was still in flight.
      setState((s) => (s.gcashProofUri === uri ? { ...s, gcashProofUrl: publicUrlData.publicUrl, gcashProofUploading: false } : s));
    } catch (e: any) {
      console.warn('GCash proof upload failed:', e.message);
      setState((s) => (s.gcashProofUri === uri ? { ...s, gcashProofUploading: false } : s));
    }
  }, [state.currentUser, patch]);

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
      return shiftRlsMessage(e);
    }
  }, [state.currentUser, patch]);

  const closeShiftAction = useCallback(async (endingCash: number): Promise<string | void> => {
    if (!state.shift) return 'No open shift';
    if (!(await isOnline())) return 'Closing the cash drawer requires an internet connection. Please reconnect and try again.';
    if (authSyncRef.current) await authSyncRef.current;
    try {
      await closeShiftApi(state.shift.id, endingCash);
      patch({ shiftCloseSummary: { startingCash: state.shift.startingCash, actualEndingCash: endingCash } });
    } catch (e: any) {
      return shiftRlsMessage(e);
    }
  }, [state.shift, patch]);

  // Called once the barista dismisses the post-close reconciliation summary — logs the shift
  // close (deferred from closeShiftAction so the summary has time to be seen) and logs out.
  const dismissShiftCloseSummary = useCallback(async () => {
    if (state.currentUser && state.shift) {
      logActivity(state.currentUser.id, 'shift_closed', `Closed shift with ₱${(state.shiftCloseSummary?.actualEndingCash ?? 0).toFixed(2)} ending cash`);
    }
    patch({ shiftCloseSummary: null });
    await logout();
  }, [state.currentUser, state.shift, state.shiftCloseSummary, logout, patch]);

  // ─────────────────────────────────────────────
  // MENU / MODS / DISCOUNTS / STORE SETTINGS
  // Mirrors cafe-web-dashboard/app/manager/pos/page.tsx's fetchAll query set —
  // same tables/columns, so menu changes made from the web dashboard show up
  // here too.
  // ─────────────────────────────────────────────
  const fetchMenuData = useCallback(async (baristaId: string) => {
    // Same race the shift-fetch effect guards against: this fires the instant currentUser is
    // set on a fast-path login, which can be before the background real-session swap lands.
    // Under a stale/anon session, store_settings' RLS (authenticated-only) silently returns no
    // row while menu_items/ingredients (open to anon) still succeed — so without this wait,
    // a barista who just switched profiles gets a fully-loaded menu but storeSettings quietly
    // resets to defaults (gcashQrUrl: null, tax rate, service charge, rush mode all wrong).
    if (authSyncRef.current) await authSyncRef.current;
    const seq = ++menuFetchSeq.current;
    try {
      await fetchMenuDataFromNetwork(seq, baristaId);
    } catch (e) {
      console.warn('Menu data fetch failed — falling back to cached data if available:', e);
      await hydrateMenuDataFromCache(seq);
    }
  }, []);

  const fetchMenuDataFromNetwork = useCallback(async (seq: number, baristaId: string) => {
    const [
      { data: items, error: itemsError },
      { data: cats },
      { data: groups },
      { data: options },
      { data: itemMods },
      { data: recipes },
      { data: modRecipes },
      { data: ingredients },
      { data: discountsData },
      { data: settings },
      { data: taxRatesData },
    ] = await Promise.all([
      supabase.from('menu_items').select('*'),
      supabase.from('menu_categories').select('name').order('sort_order', { ascending: true }),
      supabase.from('modifier_groups').select('*').order('sort_order', { ascending: true }),
      supabase.from('modifier_options').select('*').order('sort_order', { ascending: true }),
      supabase.from('menu_item_modifiers').select('menu_item_id, modifier_group_id'),
      supabase.from('recipe_costing').select('menu_item_id, ingredient_id, recipe_qty'),
      supabase.from('modifier_recipes').select('modifier_option_id, ingredient_id, qty'),
      supabase.from('ingredients').select('id, name, unit, current_stock'),
      supabase.from('discounts').select('*').order('percentage', { ascending: false }),
      supabase.from('store_settings').select('tax_rate, is_tax_inclusive, service_charge_pct, rush_mode_enabled, gcash_qr_url, store_name, tagline, address, phone, tin, receipt_footer, loyalty_enabled, loyalty_php_per_point, loyalty_point_value_php, app_update_url, app_update_version, checkout_allow_cash, checkout_allow_gcash, checkout_allow_gift_card, checkout_allow_split_payment, checkout_allow_dine_in, checkout_allow_takeout, checkout_allow_delivery, checkout_require_customer_name, checkout_allow_discounts, checkout_allow_loyalty_redemption').eq('id', 1).maybeSingle(),
      supabase.from('tax_rates').select('id, rate, is_default'),
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
      options: (optionsByGroup[g.id] ?? []).map((o: any) => [o.id, o.name, Number(o.price_adjustment)] as ModOptionDef),
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
      tax_rate_id: mi.tax_rate_id ?? null,
      is_active: mi.is_active !== false,
    }));

    // POP-UP SCOPING (login-time only — see PopupContext's doc comment in types.ts). A barista
    // with an active popup_staff row for this whole session sees only that pop-up's offered
    // items (via popup_menu_items), at its price override where set, and checkout stamps
    // popup_id on every order (see checkout() below). No active assignment => finalMenuItems is
    // just menuItems, byte-identical to before this feature shipped. Can't join the Promise.all
    // above since it depends on baristaId.
    const { data: assignment } = await supabase
      .from('popup_staff')
      .select('popups(id, name, is_active, cogs_tracking_enabled)')
      .eq('barista_id', baristaId)
      .eq('is_active', true)
      .maybeSingle();
    // The client has no generated Database type, so postgrest-js's select() type inference can't
    // know popup_staff.popup_id -> popups.id is a to-one FK and defaults nested embeds to an
    // array shape. At runtime PostgREST still returns a single object for a to-one embed (same
    // as every other untyped .select() call in this file) — cast through unknown to bridge that.
    const assignedPopup = assignment?.popups as unknown as { id: string; name: string; is_active: boolean; cogs_tracking_enabled: boolean } | null;
    const popupContext: PopupContext | null = assignedPopup?.is_active
      ? { id: assignedPopup.id, name: assignedPopup.name, cogsTrackingEnabled: assignedPopup.cogs_tracking_enabled }
      : null;

    // popup_menu_items is a linking/override table, not a data copy — is_active=false or a
    // missing row means "not offered at this popup"; price_override null means "use the base
    // menu_items.price". Deliberately doesn't narrow modifierGroupsByItem/recipesByItem/
    // recipesByModifier/ingredientStock below — those stay keyed off the full item set since
    // they're only ever looked up for items that end up visible.
    let finalMenuItems = menuItems;
    if (popupContext) {
      const { data: pmiRows } = await supabase
        .from('popup_menu_items')
        .select('menu_item_id, is_active, price_override')
        .eq('popup_id', popupContext.id);
      const pmiById = new Map((pmiRows ?? []).map((r: any) => [r.menu_item_id, r]));
      finalMenuItems = menuItems
        .filter((mi) => { const pmi = pmiById.get(mi.id); return pmi && pmi.is_active !== false; })
        .map((mi) => { const pmi = pmiById.get(mi.id)!; return pmi.price_override != null ? { ...mi, price: Number(pmi.price_override) } : mi; });
    }

    // Multi-tax-rate: store_settings.tax_rate stays the ONE authoritative "default rate" — same
    // field Settings has always edited — so there's no second place a manager needs to update
    // it and no drift risk between two sources of truth. tax_rates only supplies ADDITIONAL,
    // non-default rates that a menu item can be explicitly assigned via tax_rate_id; a menu item
    // with tax_rate_id left null always resolves to the store default below, never to whatever
    // row happens to be flagged is_default in this table.
    const taxRateById: Record<string, number> = {};
    (taxRatesData ?? []).forEach((r: any) => { taxRateById[r.id] = Number(r.rate); });

    const categories = mergeMenuCategories(
      (cats ?? []).map((c: any) => c.name),
      finalMenuItems.map((m) => m.category),
    );

    // Always keep a synthetic 0% "None" entry first regardless of what's in
    // the real table, so the discount row always has a "No Discount" chip.
    const discountsList: Discount[] = [
      { id: null, n: 'None', p: 0, type: 'percent', fixedAmount: null, minSpend: null, validFromHour: null, validToHour: null },
      ...(discountsData ?? []).map((d: any) => ({
        id: d.id,
        n: d.name,
        p: Number(d.percentage),
        type: (d.discount_type ?? 'percent') as Discount['type'],
        fixedAmount: d.fixed_amount != null ? Number(d.fixed_amount) : null,
        minSpend: d.min_spend != null ? Number(d.min_spend) : null,
        validFromHour: d.valid_from_hour != null ? Number(d.valid_from_hour) : null,
        validToHour: d.valid_to_hour != null ? Number(d.valid_to_hour) : null,
      })),
    ];

    const ingredientStock: Record<string, number> = {};
    (ingredients ?? []).forEach((i: any) => {
      ingredientStock[i.id] = Number(i.current_stock);
    });
    // Named/unit'd list for the manual stock-adjustment picker (AccountSheet's "Adjust Stock"
    // row) — ingredientStock above stays a bare id->qty map since every other consumer of it
    // (getMaxAddableQty, isOutOfStock) only ever needs the number.
    const ingredientsList = (ingredients ?? []).map((i: any) => ({
      id: i.id,
      name: i.name as string,
      unit: i.unit as string,
      current_stock: Number(i.current_stock),
    }));

    const recipesByItem = buildRecipesByItem((recipes ?? []) as RecipeRow[]);
    const recipesByModifier = buildRecipesByItem(
      ((modRecipes ?? []) as any[]).map((r) => ({ menu_item_id: r.modifier_option_id, ingredient_id: r.ingredient_id, recipe_qty: Number(r.qty) }))
    );

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
          loyaltyEnabled: settings.loyalty_enabled ?? DEFAULT_STORE_SETTINGS.loyaltyEnabled,
          loyaltyPhpPerPoint: Number(settings.loyalty_php_per_point ?? DEFAULT_STORE_SETTINGS.loyaltyPhpPerPoint),
          loyaltyPointValuePhp: Number(settings.loyalty_point_value_php ?? DEFAULT_STORE_SETTINGS.loyaltyPointValuePhp),
          appUpdateUrl: settings.app_update_url ?? null,
          appUpdateVersion: settings.app_update_version ?? null,
          checkoutAllowCash: settings.checkout_allow_cash ?? DEFAULT_STORE_SETTINGS.checkoutAllowCash,
          checkoutAllowGcash: settings.checkout_allow_gcash ?? DEFAULT_STORE_SETTINGS.checkoutAllowGcash,
          checkoutAllowGiftCard: settings.checkout_allow_gift_card ?? DEFAULT_STORE_SETTINGS.checkoutAllowGiftCard,
          checkoutAllowSplitPayment: settings.checkout_allow_split_payment ?? DEFAULT_STORE_SETTINGS.checkoutAllowSplitPayment,
          checkoutAllowDineIn: settings.checkout_allow_dine_in ?? DEFAULT_STORE_SETTINGS.checkoutAllowDineIn,
          checkoutAllowTakeout: settings.checkout_allow_takeout ?? DEFAULT_STORE_SETTINGS.checkoutAllowTakeout,
          checkoutAllowDelivery: settings.checkout_allow_delivery ?? DEFAULT_STORE_SETTINGS.checkoutAllowDelivery,
          checkoutRequireCustomerName: settings.checkout_require_customer_name ?? DEFAULT_STORE_SETTINGS.checkoutRequireCustomerName,
          checkoutAllowDiscounts: settings.checkout_allow_discounts ?? DEFAULT_STORE_SETTINGS.checkoutAllowDiscounts,
          checkoutAllowLoyaltyRedemption: settings.checkout_allow_loyalty_redemption ?? DEFAULT_STORE_SETTINGS.checkoutAllowLoyaltyRedemption,
        }
      : undefined;

    // A newer fetch (triggered by one of the 3 realtime listeners firing again while this one
    // was still in flight) has already started — let it own the final state, skip committing
    // this now-stale response.
    if (seq !== menuFetchSeq.current) return;

    // Refresh the offline cache on every successful fetch (fire-and-forget —
    // a cache write failing shouldn't block the live UI update below).
    writeMenuCache({
      menuItems: finalMenuItems,
      categories,
      discountsList,
      modifierGroupsByItem,
      recipesByItem,
      recipesByModifier,
      ingredientStock,
      ingredientsList,
      taxRateById,
      storeSettings: resolvedStoreSettings ?? DEFAULT_STORE_SETTINGS,
      popupContext,
    }).catch(() => {});

    setState((s) => {
      const rs = resolvedStoreSettings ?? s.storeSettings;

      // Keep the in-progress order valid whenever this fetch (initial load, or a Feature
      // Toggles change coming in over the store_settings realtime listener) narrows what's
      // offered — e.g. falls back off Cash the moment a manager disables it mid-shift.
      let payMethod = s.payMethod;
      const payAllowed = payMethod === 'cash' ? rs.checkoutAllowCash
        : payMethod === 'gcash' ? rs.checkoutAllowGcash
        : payMethod === 'gift_card' ? rs.checkoutAllowGiftCard
        : true; // 'split' is a historical-record-only PayMethod value, never a live selection here
      if (!payAllowed) {
        payMethod = rs.checkoutAllowCash ? 'cash' : rs.checkoutAllowGcash ? 'gcash' : rs.checkoutAllowGiftCard ? 'gift_card' : 'cash';
      }

      let orderType = s.orderType;
      const orderTypeAllowed = orderType === 'dine-in' ? rs.checkoutAllowDineIn
        : orderType === 'takeout' ? rs.checkoutAllowTakeout
        : rs.checkoutAllowDelivery;
      if (!orderTypeAllowed) {
        orderType = rs.checkoutAllowDineIn ? 'dine-in' : rs.checkoutAllowTakeout ? 'takeout' : rs.checkoutAllowDelivery ? 'delivery' : 'dine-in';
      }

      return {
        ...s,
        menuItems: finalMenuItems,
        categories,
        discountsList,
        modifierGroupsByItem,
        recipesByItem,
        recipesByModifier,
        ingredientStock,
        ingredientsList,
        taxRateById,
        storeSettings: rs,
        payMethod,
        orderType,
        splitEnabled: rs.checkoutAllowSplitPayment ? s.splitEnabled : false,
        discountName: rs.checkoutAllowDiscounts ? s.discountName : 'None',
        redeemPoints: rs.checkoutAllowLoyaltyRedemption ? s.redeemPoints : '',
        popupContext,
      };
    });
  }, []);

  const hydrateMenuDataFromCache = useCallback(async (seq: number) => {
    try {
      const cached = await readMenuCache();
      if (!cached) return;
      if (seq !== menuFetchSeq.current) return;
      setState((s) => ({
        ...s,
        menuItems: cached.menuItems ?? s.menuItems,
        categories: mergeMenuCategories(
          cached.categories ?? s.categories,
          (cached.menuItems ?? s.menuItems).map((m: { category: string }) => m.category),
        ),
        discountsList: cached.discountsList ?? s.discountsList,
        modifierGroupsByItem: cached.modifierGroupsByItem ?? s.modifierGroupsByItem,
        recipesByItem: cached.recipesByItem ?? s.recipesByItem,
        recipesByModifier: cached.recipesByModifier ?? s.recipesByModifier,
        ingredientStock: cached.ingredientStock ?? s.ingredientStock,
        ingredientsList: cached.ingredientsList ?? s.ingredientsList,
        taxRateById: cached.taxRateById ?? s.taxRateById,
        popupContext: cached.popupContext ?? s.popupContext,
        // Spread onto DEFAULT_STORE_SETTINGS, not just `?? s.storeSettings` — a cache written
        // by an older app version (before a new StoreSettings field existed) would otherwise
        // resolve that field to undefined/falsy instead of its real default.
        storeSettings: cached.storeSettings ? { ...DEFAULT_STORE_SETTINGS, ...cached.storeSettings } : s.storeSettings,
      }));
    } catch (e) {
      console.warn('Failed to read cached menu data:', e);
    }
  }, []);

  useEffect(() => {
    if (!state.currentUser) return;
    const baristaId = state.currentUser.id;
    fetchMenuData(baristaId);
    const channel = supabase
      .channel('crema_pos_menu_ingredients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchMenuData(baristaId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenuData(baristaId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => fetchMenuData(baristaId))
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
      no: formatOrderNo(o.receipt_number ?? o.id.slice(0, 8).toUpperCase()),
      type: toOrderTypeLabel(o.order_type),
      mins: elapsedMinutes(o.created_at),
      items: (o.order_items ?? []).map((oi: any) => ({
        id: oi.id,
        name: oi.menu_items?.name ?? 'Item',
        qty: oi.qty,
        mods: modsDisplayString(oi.modifiers_json, oi.special_note),
        prepStatus: oi.prep_status ?? 'pending',
      })),
      total: Number(o.total ?? o.total_amount ?? 0),
      restoreItems: (o.order_items ?? []).map((oi: any) => ({ menu_item_id: oi.menu_item_id, qty: oi.qty, modifiers_json: oi.modifiers_json })),
      customerName: o.customer_name ?? null,
      barista_id: o.barista_id,
    }));

  const buildQueueFromOutbox = (entries: OutboxEntry[]): QueueEntry[] =>
    entries.map((e) => ({
      id: e.id,
      no: formatOrderNo(e.orderData.receipt_number),
      type: toOrderTypeLabel(e.orderData.order_type),
      mins: elapsedMinutes(e.timestamp),
      items: e.displayItems.map((d) => ({ name: d.name, qty: d.qty, mods: d.mods })),
      total: e.orderData.total,
      restoreItems: [],
      pendingSync: true,
      customerName: e.orderData.customer_name ?? null,
      barista_id: e.orderData.barista_id,
    }));

  useEffect(() => {
    currentUserIdRef.current = state.currentUser?.id ?? null;
  }, [state.currentUser?.id]);

  const fetchQueue = useCallback(async () => {
    // Same stale/anon-session race as fetchMenuData above — orders is authenticated-only, so
    // firing this before the fast-path login's background session swap lands would silently
    // return an empty queue right after a profile switch instead of the real pending tickets.
    if (authSyncRef.current) await authSyncRef.current;
    const [{ data }, outboxEntries] = await Promise.all([
      supabase
        .from('orders')
        .select(
          'id, receipt_number, created_at, total, total_amount, order_type, customer_name, barista_id, order_items(id, qty, menu_item_id, modifiers_json, special_note, prep_status, menu_items(name))'
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      getOutboxOrders(),
    ]);

    const real = buildQueueFromOrders(data ?? []);
    // De-dupe by receipt number — the same client-generated receipt briefly
    // exists on both the outbox stand-in and the real row during the handoff.
    const outboxTickets = buildQueueFromOutbox(outboxEntries).filter((o) => !real.some((r) => r.no === o.no));

    // New-order alert: fires when an order this barista didn't just place appears in the queue
    // for the first time — covers another terminal/barista firing a ticket while this one isn't
    // being watched. Skipped on the very first load (seenOrderIdsRef starts null) so the
    // existing queue on login/screen-open never triggers it.
    let alert: { orderNo: string } | null = null;
    if (seenOrderIdsRef.current) {
      const newlyArrived = real.filter((r) => !seenOrderIdsRef.current!.has(r.id) && r.barista_id !== currentUserIdRef.current);
      if (newlyArrived.length > 0) {
        alert = { orderNo: newlyArrived[0].no };
        playNewOrderChime();
      }
    }
    seenOrderIdsRef.current = new Set(real.map((r) => r.id));

    setState((s) => ({ ...s, queue: [...real, ...outboxTickets], ...(alert ? { newOrderAlert: alert } : {}) }));
  }, []);

  // ─────────────────────────────────────────────
  // OUTBOX INSPECT / RETRY / DELETE — manual visibility into the offline order outbox
  // ─────────────────────────────────────────────
  const [outboxOrderEntries, setOutboxOrderEntries] = useState<OutboxEntry[]>([]);

  const openOutbox = useCallback(async () => {
    const entries = await getOutboxOrders();
    setOutboxOrderEntries(entries);
    patch({ showOutbox: true });
  }, [patch]);

  const closeOutbox = useCallback(() => patch({ showOutbox: false }), [patch]);

  const retryOutboxEntry = useCallback(async (id: string): Promise<{ error?: string }> => {
    const res = await retryOutboxEntryApi(id);
    const entries = await getOutboxOrders();
    setOutboxOrderEntries(entries);
    patch({ outboxCount: entries.length });
    if (!res.error) fetchQueue();
    return res;
  }, [patch, fetchQueue]);

  const deleteOutboxEntry = useCallback(async (id: string): Promise<void> => {
    await deleteOutboxEntryApi(id);
    const entries = await getOutboxOrders();
    setOutboxOrderEntries(entries);
    patch({ outboxCount: entries.length });
    fetchQueue();
  }, [patch, fetchQueue]);

  const fetchTodayOrderCount = useCallback(async () => {
    if (authSyncRef.current) await authSyncRef.current;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());
    if (count !== null) setState((s) => ({ ...s, todayOrderCount: Math.max(s.todayOrderCount, count) }));
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
      if (online) { await syncOutbox(); await syncActionOutbox(); }
      fetchQueue();
      fetchTodayOrderCount();
      fetchUpcomingShifts();
      getOutboxCount().then((n) => patch({ outboxCount: n }));
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
          notify('Could Not Complete Order', error.message || 'The order is still pending — check your connection and try again.');
        }
      });
  }, [fetchQueue]);

  const PREP_STATUS_CYCLE: Record<'pending' | 'in_progress' | 'ready', 'pending' | 'in_progress' | 'ready'> = {
    pending: 'in_progress',
    in_progress: 'ready',
    ready: 'pending',
  };

  // Cycles a single line item's kitchen state (pending -> in_progress -> ready -> pending).
  // Optimistic locally, falls back to a full requery on failure rather than leaving the UI
  // showing a state the server never actually saved.
  const advanceItemPrepStatus = useCallback((orderItemId: string) => {
    let nextStatus: 'pending' | 'in_progress' | 'ready' = 'pending';
    setState((s) => ({
      ...s,
      queue: s.queue.map((ticket) => ({
        ...ticket,
        items: ticket.items.map((item) => {
          if (item.id !== orderItemId) return item;
          nextStatus = PREP_STATUS_CYCLE[item.prepStatus ?? 'pending'];
          return { ...item, prepStatus: nextStatus };
        }),
      })),
    }));
    supabase
      .from('order_items')
      .update({ prep_status: nextStatus })
      .eq('id', orderItemId)
      .then(({ error }) => {
        if (error) fetchQueue();
      });
  }, [fetchQueue]);

  // Flag-for-manager-review needs no PIN, so it's safe to queue offline — unlike managerVoidOrder
  // below, there's no live authorization check being deferred here.
  const flagVoidOrder = useCallback(async (orderId: string, reasonCode: string, detail: string): Promise<{ error?: string }> => {
    const finalReason = detail.trim() || REASON_CODE_LABELS[reasonCode as ReasonCode] || reasonCode;
    const ticket = state.queue.find((q) => q.id === orderId);
    const actorId = ticket?.barista_id ?? state.currentUser?.id;

    if (!(await isOnline())) {
      if (!actorId) return { error: 'Not logged in' };
      await queueAction({ kind: 'flag_void', orderId, orderNo: ticket?.no ?? orderId.slice(0, 8).toUpperCase(), reasonCode, detail, baristaId: actorId });
      setState((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== orderId) }));
      return {};
    }

    const { error } = await supabase.from('orders').update({ status: 'void_requested', void_reason: finalReason, void_reason_code: reasonCode }).eq('id', orderId);
    if (error) return { error: error.message };
    if (actorId) logActivity(actorId, 'void_requested', `Void requested for order ${ticket?.no ?? orderId.slice(0, 8).toUpperCase()} — ${finalReason}`);
    await fetchQueue();
    return {};
  }, [fetchQueue, state.queue, state.currentUser]);

  const managerVoidOrder = useCallback(async (orderId: string, reasonCode: string, detail: string, pin: string): Promise<{ error?: string }> => {
    const ticket = state.queue.find((q) => q.id === orderId);
    const finalReason = detail.trim() || REASON_CODE_LABELS[reasonCode as ReasonCode] || reasonCode;

    if (!(await isOnline())) {
      if (!state.currentUser) return { error: 'Not logged in' };
      const offline = await tryOfflineManagerPin(state.currentUser.id, pin);
      if (!offline.ok) return { error: offline.error };
      await queueAction({
        kind: 'manager_void',
        orderId,
        orderNo: ticket?.no ?? orderId.slice(0, 8).toUpperCase(),
        reasonCode,
        detail,
        managerId: offline.managerId,
        managerName: offline.managerName,
        restoreItems: ticket?.restoreItems ?? [],
      });
      setState((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== orderId) }));
      return {};
    }

    if (authSyncRef.current) await authSyncRef.current;
    try { await requirePosSession(); } catch { return { error: SESSION_MISSING_MESSAGE }; }

    // verify_manager_pin runs server-side (never exposes pin_code to the client) and applies
    // the same 5-attempt/15-minute lockout as login, keyed off this barista's own session.
    const { data: managers, error: pinErr } = await supabase.rpc('verify_manager_pin', { p_pin: pin });
    // Distinguish a genuine RPC/network failure from a real wrong-PIN attempt — collapsing
    // both into "Invalid manager PIN" was actively misleading (e.g. a dropped connection
    // looked identical to entering the wrong PIN).
    if (pinErr) return { error: pinErr.message || 'Could not verify manager PIN. Check your connection and try again.' };
    const manager = managers?.[0];
    if (!manager) return { error: 'Invalid manager PIN' };
    cacheManagerPinOnVerify(manager.id, manager.full_name, pin);

    const { error: voidErr } = await supabase
      .from('orders')
      .update({ status: 'voided', void_reason: finalReason, void_reason_code: reasonCode, voided_by: manager.id })
      .eq('id', orderId);
    if (voidErr) return { error: voidErr.message };

    // Keeps the `sales` analytics mirror row from overstating revenue for a reversed order —
    // best-effort, never blocks the void itself on failure.
    supabase.rpc('adjust_sales_for_order', { p_order_id: orderId }).then(({ error }) => {
      if (error) console.warn('adjust_sales_for_order failed:', error.message);
    });
    logActivity(ticket?.barista_id ?? manager.id, 'void_approved', `Order ${ticket?.no ?? orderId.slice(0, 8).toUpperCase()} voided by manager ${manager.full_name} — ${finalReason}`);

    if (ticket && ticket.restoreItems.length > 0) await restoreStockForOrderItems(ticket.restoreItems);
    await fetchQueue();
    return {};
  }, [state.queue, state.currentUser, fetchQueue]);

  // Worked example of a granular permission: a senior barista (or manager) may void a still-
  // pending order under their own self_void_threshold_php without a manager PIN. The real
  // authorization check lives server-side in self_void_order() — this function just calls it and
  // does the same post-void housekeeping (stock restore, sales adjustment, activity log) that
  // managerVoidOrder does.
  const selfVoidOrder = useCallback(async (orderId: string, reasonCode: string, detail: string): Promise<{ error?: string }> => {
    if (!state.currentUser) return { error: 'Not logged in' };
    if (!(await isOnline())) return { error: 'Voiding an order requires an internet connection' };
    if (authSyncRef.current) await authSyncRef.current;
    try { await requirePosSession(); } catch { return { error: SESSION_MISSING_MESSAGE }; }

    const finalReason = detail.trim() || REASON_CODE_LABELS[reasonCode as ReasonCode] || reasonCode;
    const { error: voidErr } = await supabase.rpc('self_void_order', {
      p_order_id: orderId,
      p_reason: finalReason,
      p_reason_code: reasonCode,
    });
    if (voidErr) return { error: voidErr.message };

    const ticket = state.queue.find((q) => q.id === orderId);
    supabase.rpc('adjust_sales_for_order', { p_order_id: orderId }).then(({ error }) => {
      if (error) console.warn('adjust_sales_for_order failed:', error.message);
    });
    logActivity(ticket?.barista_id ?? state.currentUser.id, 'void_approved', `Order ${ticket?.no ?? orderId.slice(0, 8).toUpperCase()} self-voided by ${state.currentUser.full_name} — ${finalReason}`);

    if (ticket && ticket.restoreItems.length > 0) await restoreStockForOrderItems(ticket.restoreItems);
    await fetchQueue();
    return {};
  }, [state.queue, state.currentUser, fetchQueue]);

  // Mirrors cafe-web-dashboard's manager Transactions page refund flow exactly (same
  // refund_amount/refunded_at/refund_reason/refunded_by columns, same MVP scope: an arbitrary
  // amount against the order total rather than per-line-item selection; a full refund — amount
  // equals the total — restores ingredient stock like a void, a partial refund doesn't, since
  // there's no reliable amount-to-ingredient mapping for less than the whole order). Gated by
  // the same manager-PIN check as managerVoidOrder since, unlike the web dashboard, this runs on
  // a shared kiosk device with no per-manager login.
  const managerRefundOrder = useCallback(async (orderId: string, amount: number, reasonCode: string, detail: string, pin: string): Promise<{ error?: string }> => {
    const online = await isOnline();
    if (!online) return { error: 'Manager PIN verification requires an internet connection' };
    if (authSyncRef.current) await authSyncRef.current;
    try { await requirePosSession(); } catch { return { error: SESSION_MISSING_MESSAGE }; }
    if (!reasonCode) return { error: 'Select a refund reason' };
    if (reasonCode === 'other' && !detail.trim()) return { error: 'Add a detail for "Other"' };

    const { data: managers, error: pinErr } = await supabase.rpc('verify_manager_pin', { p_pin: pin });
    if (pinErr) return { error: pinErr.message || 'Could not verify manager PIN. Check your connection and try again.' };
    const manager = managers?.[0];
    if (!manager) return { error: 'Invalid manager PIN' };

    // Re-fetch the order fresh rather than trusting whatever total/items History last loaded —
    // it could be stale if another device modified the order in the meantime.
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('total, total_amount, receipt_number, barista_id, order_items(menu_item_id, qty, modifiers_json)')
      .eq('id', orderId)
      .single();
    if (fetchErr || !order) return { error: fetchErr?.message || 'Could not load the order to refund.' };

    const total = Number(order.total ?? order.total_amount ?? 0);
    if (!(amount > 0) || amount > total) {
      return { error: `Refund amount must be between ₱0.01 and ${peso0(total)}.` };
    }

    const finalReason = detail.trim() || REASON_CODE_LABELS[reasonCode as ReasonCode] || reasonCode;
    const isFull = amount === total;
    const { error: refundErr } = await supabase
      .from('orders')
      .update({
        status: isFull ? 'refunded' : 'partially_refunded',
        refund_amount: amount,
        refunded_at: new Date().toISOString(),
        refund_reason: finalReason,
        refund_reason_code: reasonCode,
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
      `₱${amount.toFixed(2)} refunded for order ${order.receipt_number ?? orderId.slice(0, 8).toUpperCase()} by manager ${manager.full_name} — ${finalReason}`
    );

    if (isFull) {
      const restoreItems = (order.order_items ?? []).map((oi: any) => ({ menu_item_id: oi.menu_item_id, qty: oi.qty, modifiers_json: oi.modifiers_json }));
      if (restoreItems.length > 0) await restoreStockForOrderItems(restoreItems);
    }
    return {};
  }, []);

  // Manual stock correction (miscount/spoilage) from the mobile register — the only other paths
  // that move ingredients.current_stock are checkout deduction and void/refund restoration.
  // Manager-PIN-gated like refund, and deliberately kept online-only (an occasional correction,
  // not a floor-operations blocker the way void/refund/append are).
  const adjustStockManual = useCallback(async (
    ingredientId: string,
    delta: number,
    reason: string,
    pin: string
  ): Promise<{ error?: string }> => {
    if (!reason.trim()) return { error: 'A reason is required' };
    if (!(await isOnline())) return { error: 'Adjusting stock requires an internet connection' };
    if (authSyncRef.current) await authSyncRef.current;
    try { await requirePosSession(); } catch { return { error: SESSION_MISSING_MESSAGE }; }

    const { data: managers, error: pinErr } = await supabase.rpc('verify_manager_pin', { p_pin: pin });
    if (pinErr) return { error: pinErr.message || 'Could not verify manager PIN. Check your connection and try again.' };
    const manager = managers?.[0];
    if (!manager) return { error: 'Invalid manager PIN' };

    const rpcName = delta >= 0 ? 'restore_ingredient_stock' : 'decrement_ingredient_stock';
    const { error: adjustErr } = await supabase.rpc(rpcName, { p_ingredient_id: ingredientId, p_amount: Math.abs(delta) });
    if (adjustErr) return { error: adjustErr.message };

    await supabase.from('inventory_adjustments').insert({
      ingredient_id: ingredientId,
      delta,
      reason: reason.trim(),
      adjusted_by: manager.id,
    });
    const ingredientName = state.ingredientsList.find((i) => i.id === ingredientId)?.name ?? ingredientId.slice(0, 8);
    logActivity(manager.id, 'stock_adjusted', `${delta > 0 ? '+' : ''}${delta} ${ingredientName} adjusted by manager ${manager.full_name} — ${reason.trim()}`);

    if (state.currentUser) await fetchMenuData(state.currentUser.id);
    return {};
  }, [state.ingredientsList, state.currentUser, fetchMenuData]);

  // Puts the register into "add to an already-queued order" mode instead of building a new
  // order — for something like "customer adds one more cookie" after the ticket's already
  // fired, without forcing a full void + re-ring of everything already sent to the kitchen.
  const startAddToOrder = useCallback((ticket: QueueEntry) => {
    clearPendingUndo();
    setState((s) => ({
      ...s,
      appendTargetOrderId: ticket.id,
      appendTargetOrderNo: ticket.no,
      orderType: ticket.type === 'Takeout' ? 'takeout' : ticket.type === 'Delivery' ? 'delivery' : 'dine-in',
      deliveryAddress: '',
      cart: [],
      selMods: {},
      qty: 1,
      note: '',
      discountName: 'None',
      payMethod: 'cash',
      tendered: '',
      splitEnabled: false,
      splitCashAmount: '',
      splitGcashAmount: '',
      splitGiftCardAmount: '',
      splitGiftCardCode: '',
      splitGiftCardBalance: null,
      splitGiftCardChecking: false,
      splitGiftCardError: null,
      gcashReference: '',
      gcashConfirmed: false,
      gcashProofUri: null,
      gcashProofUrl: null,
      gcashProofUploading: false,
      customerName: '',
      customerPhone: '',
      customerLookupStatus: 'idle',
      customerLookupMode: 'phone',
      customerCardCode: '',
      customerLookupMessage: null,
      selectedCustomer: null,
      newCustomerName: '',
      redeemPoints: '',
      giftCardCode: '',
      giftCardBalance: null,
      giftCardError: null,
      receiptEmail: '',
      showQueue: false,
      selItemId: null,
      editingCartId: null,
      screen: 'menu',
    }));
  }, [clearPendingUndo]);

  const cancelAddToOrder = useCallback(() => {
    clearPendingUndo();
    setState((s) => ({ ...s, appendTargetOrderId: null, appendTargetOrderNo: null, cart: [], editingCartId: null, selItemId: null, screen: 'menu' }));
  }, [clearPendingUndo]);

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
    patch({ selItemId: menuId, editingCartId: null, selMods: {}, qty: 1, note: '' });
  }, [patch]);

  const editCartItem = useCallback((cartId: string) => {
    setState((s) => {
      const item = s.cart.find((c) => c.cartId === cartId);
      if (!item) return s;
      const groups = s.modifierGroupsByItem[item.menuId] ?? [];
      return {
        ...s,
        selItemId: item.menuId,
        editingCartId: cartId,
        selMods: selModsFromCartModifiers(item.modifiers, groups),
        qty: item.qty,
        note: item.note || '',
      };
    });
  }, []);

  const closeItem = useCallback(() => patch({ selItemId: null, editingCartId: null }), [patch]);

  const toggleMod = useCallback((g: ModGroupDef, opt: SelectedMod) => {
    setState((s) => {
      const cur = s.selMods[g.id] || [];
      const exists = cur.some((o) => o.name === opt.name);
      // Allow removing an already-selected out-of-stock option, just not adding a new one.
      if (!exists && opt.id && isOutOfStock(opt.id, s.recipesByModifier, s.ingredientStock, s.storeSettings.rushModeEnabled)) {
        return s;
      }
      let next: SelectedMod[];
      if (g.multi) {
        next = exists ? cur.filter((o) => o.name !== opt.name) : [...cur, opt];
      } else {
        next = exists ? [] : [opt];
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
      const modifiers = mods.map((m) => ({ id: m.id, name: m.name, price: m.p }));
      const unit = si.price + modTotal(s.selMods);
      const nextLine = {
        menuId: si.id,
        name: si.name,
        unit,
        qty: s.qty,
        mods: modNames,
        modifiers,
        note: s.note,
      };

      if (s.editingCartId) {
        return {
          ...s,
          cart: s.cart.map((c) => (c.cartId === s.editingCartId ? { ...c, ...nextLine } : c)),
          selItemId: null,
          editingCartId: null,
        };
      }

      return {
        ...s,
        cart: [
          ...s.cart,
          { cartId: 'c' + s.nextId, ...nextLine },
        ],
        nextId: s.nextId + 1,
        selItemId: null,
        editingCartId: null,
      };
    });
  }, []);

  const changeQty = useCallback((cartId: string, d: number) => {
    setState((s) => ({
      ...s,
      cart: s.cart.map((c) => (c.cartId === cartId ? { ...c, qty: c.qty + d } : c)).filter((c) => c.qty > 0),
    }));
  }, []);

  // Removal is instant (no confirmation dialog, no slowdown to the common "fix a mistake while
  // building the order" case) — the safety net is UndoToast, not friction on the way in. Only
  // the most recent removal stays undo-able; a second removal while a toast is still showing
  // overwrites it rather than stacking multiple pending undos with ambiguous "which one"
  // semantics. cartId comes from a monotonic counter that's never reused (see addToCart), so
  // reinserting this exact same item object on undo is always collision-safe.
  const removeFromCart = useCallback((cartId: string) => {
    const idx = state.cart.findIndex((c) => c.cartId === cartId);
    if (idx === -1) return;
    const removed = state.cart[idx];
    setState((s) => ({ ...s, cart: s.cart.filter((c) => c.cartId !== cartId) }));
    if (pendingUndoTimerRef.current) clearTimeout(pendingUndoTimerRef.current);
    setPendingUndo({ item: removed, index: idx });
    pendingUndoTimerRef.current = setTimeout(() => setPendingUndo(null), 4000);
  }, [state.cart]);

  const undoRemove = useCallback(() => {
    if (!pendingUndo) return;
    const { item, index } = pendingUndo;
    setState((s) => {
      const cart = [...s.cart];
      cart.splice(Math.min(index, cart.length), 0, item);
      return { ...s, cart };
    });
    clearPendingUndo();
  }, [pendingUndo, clearPendingUndo]);

  // Raw pre-discount subtotal, needed both to size a 'fixed'/'bogo' discount (capped so it can
  // never exceed the order) and to convert whichever discount type is active into an equivalent
  // percentage for computeOrderTotalsMultiRate below — that function only knows one discount
  // shape (a pct of subtotal), so 'fixed'/'bogo' are expressed as subtotal-relative fractions
  // rather than teaching it a second discount model.
  const subtotalRaw = useMemo(() => state.cart.reduce((s, c) => s + c.unit * c.qty, 0), [state.cart]);

  const selectedDiscount = useMemo(
    () => state.discountsList.find((d) => d.n === state.discountName) ?? state.discountsList[0],
    [state.discountsList, state.discountName]
  );

  const discountAmountRaw = useMemo(() => {
    const d = selectedDiscount;
    if (!d || d.n === 'None') return 0;
    // Every cart line's `unit` already prices in its own modifiers, so the cheapest line's unit
    // price is the cheapest actual unit sold — exactly what a 'bogo' discount needs.
    return computeDiscountAmount({ type: d.type, percentPct: d.p, fixedAmount: d.fixedAmount }, subtotalRaw, state.cart.map((c) => c.unit));
  }, [selectedDiscount, subtotalRaw, state.cart]);

  // For a 'percent' discount this is exactly d.p (subtotalRaw * d.p / subtotalRaw), so every
  // existing percent-only store sees zero change in this value versus before this feature shipped.
  const discountPct = subtotalRaw > 0 ? discountAmountRaw / subtotalRaw : 0;

  const discountLabel = useMemo(() => {
    const d = selectedDiscount;
    if (!d || d.n === 'None' || d.type === 'percent') return undefined; // percent keeps SummaryCard's default "X% off" phrasing
    return d.type === 'fixed' ? `Discount (${d.n})` : `Discount (${d.n} · BOGO)`;
  }, [selectedDiscount]);

  // A discount chip is only offered while its min-spend is met and (if set) the current
  // store-local hour falls inside its valid window — "None" is always offered.
  const eligibleDiscounts = useMemo(() => {
    const hour = new Date().getHours();
    return state.discountsList.filter((d) => {
      if (d.n === 'None') return true;
      if (d.minSpend != null && subtotalRaw < d.minSpend) return false;
      if (d.validFromHour != null && d.validToHour != null && (hour < d.validFromHour || hour >= d.validToHour)) return false;
      return true;
    });
  }, [state.discountsList, subtotalRaw]);

  // If the cart shrinks below a min-spend or the clock rolls past a discount's valid window
  // mid-checkout, the now-ineligible selection silently falls back to "None" instead of letting
  // a stale discount keep applying.
  useEffect(() => {
    if (state.discountName !== 'None' && !eligibleDiscounts.some((d) => d.n === state.discountName)) {
      patch({ discountName: 'None' });
    }
  }, [eligibleDiscounts, state.discountName, patch]);

  const totals = useMemo(() => {
    // Each cart line resolves its own tax rate: the menu item's assigned tax_rate_id if it has
    // one, otherwise the store default — see computeOrderTotalsMultiRate's own comment for why
    // this reduces to the exact same math as the old flat-rate computeOrderTotals when nothing
    // has been assigned a non-default rate (i.e. every existing store, unchanged).
    const items = state.cart.map((c) => {
      const mi = state.menuItems.find((m) => m.id === c.menuId);
      const taxRatePct = mi?.tax_rate_id ? (state.taxRateById[mi.tax_rate_id] ?? state.storeSettings.taxRatePct) : state.storeSettings.taxRatePct;
      return { lineTotal: c.unit * c.qty, taxRatePct };
    });
    const t = computeOrderTotalsMultiRate({
      items,
      discountPct,
      orderType: state.orderType,
      isTaxInclusive: state.storeSettings.isTaxInclusive,
      serviceChargePct: state.storeSettings.serviceChargePct,
      defaultTaxRatePct: state.storeSettings.taxRatePct,
    });
    return { sub: t.subtotal, disc: t.discountAmount, service: t.serviceChargeAmount, tax: t.taxAmount, total: t.total };
  }, [state.cart, state.menuItems, state.taxRateById, discountPct, state.orderType, state.storeSettings]);

  // ─────────────────────────────────────────────
  // LOYALTY — a redemption is a straight peso reduction applied to the already-fully-computed
  // total (not re-plumbed through computeOrderTotalsMultiRate's pre-tax discount), so it can
  // never change how tax/service charge were computed — it behaves like a gift-certificate-style
  // payment-side deduction. Mutually exclusive with a % discount for v1: the UI resets whichever
  // of the two the barista isn't actively using (see PosApp.tsx's onSelectDiscount/
  // onChangeRedeemPoints), so in practice only one of discountPct/redeemPoints is ever nonzero.
  const redeemPointsNum = Number(state.redeemPoints) || 0;
  const pointValuePhp = state.storeSettings.loyaltyPointValuePhp;
  const phpPerPoint = state.storeSettings.loyaltyPhpPerPoint;

  const maxRedeemablePoints = useMemo(() => {
    if (!state.selectedCustomer || pointValuePhp <= 0) return 0;
    const byOrderValue = Math.floor(totals.total / pointValuePhp);
    return Math.max(0, Math.min(state.selectedCustomer.loyaltyPoints, byOrderValue));
  }, [state.selectedCustomer, pointValuePhp, totals.total]);

  const loyaltyRedemptionAmount = Math.min(redeemPointsNum, maxRedeemablePoints) * pointValuePhp;
  const amountDue = Math.max(0, totals.total - loyaltyRedemptionAmount);

  const pointsToEarnPreview = useMemo(() => {
    if (!state.storeSettings.loyaltyEnabled || !state.selectedCustomer || phpPerPoint <= 0) return 0;
    return Math.floor(amountDue / phpPerPoint);
  }, [state.storeSettings.loyaltyEnabled, state.selectedCustomer, phpPerPoint, amountDue]);

  // ─────────────────────────────────────────────
  // CUSTOMER LOOKUP / CREATE
  // ─────────────────────────────────────────────
  const lookupCustomer = useCallback(async (overrideCardCode?: string) => {
    if (state.customerLookupMode === 'card') {
      const code = (overrideCardCode ?? state.customerCardCode).trim();
      if (!code) return;
      patch({ customerLookupStatus: 'searching' });
      try {
        const result = await lookupCustomerByCardCode(code);
        if (result.status === 'found') {
          patch({ selectedCustomer: result.customer, customerLookupStatus: 'found', customerLookupMessage: null });
        } else if (result.status === 'revoked') {
          patch({ selectedCustomer: null, customerLookupStatus: 'not_found', customerLookupMessage: 'This card has been revoked. Ask for a replacement card or look up by phone.' });
        } else {
          patch({ selectedCustomer: null, customerLookupStatus: 'not_found', customerLookupMessage: 'No customer found for this card code.' });
        }
      } catch {
        patch({ customerLookupStatus: 'not_found', customerLookupMessage: 'No customer found for this card code.' });
      }
      return;
    }

    const phone = state.customerPhone.trim();
    if (!phone) return;
    patch({ customerLookupStatus: 'searching' });
    try {
      const found = await lookupCustomerByPhone(phone);
      if (found) {
        patch({ selectedCustomer: found, customerLookupStatus: 'found' });
      } else {
        patch({ selectedCustomer: null, customerLookupStatus: 'not_found', newCustomerName: '' });
      }
    } catch {
      patch({ customerLookupStatus: 'not_found' });
    }
  }, [state.customerLookupMode, state.customerCardCode, state.customerPhone, patch]);

  const changeCustomerLookupMode = useCallback((mode: 'phone' | 'card') => {
    patch({ customerLookupMode: mode, customerLookupStatus: 'idle', customerLookupMessage: null, selectedCustomer: null });
  }, [patch]);

  // A scanned loyalty card QR always encodes "cremapos-loyalty:<code>" (see the loyalty_cards
  // migration's qr_payload generated column) — reject anything else outright rather than trying
  // it as a code, since an unrelated QR (a menu poster, a different app's code) would otherwise
  // just silently produce a confusing "no customer found".
  const scanLoyaltyCardCode = useCallback((payload: string) => {
    const prefix = 'cremapos-loyalty:';
    if (!payload.startsWith(prefix)) {
      patch({ showQrScanner: false, checkoutError: 'That QR code is not a Crema loyalty card.' });
      return;
    }
    const code = payload.slice(prefix.length);
    patch({ showQrScanner: false, customerLookupMode: 'card', customerCardCode: code });
    lookupCustomer(code);
  }, [patch, lookupCustomer]);

  const openQrScanner = useCallback((target: 'loyalty' | 'gift_card') => {
    patch({ showQrScanner: true, qrScanTarget: target });
  }, [patch]);

  const createCustomerInline = useCallback(async () => {
    const phone = state.customerPhone.trim();
    if (!phone || !state.newCustomerName.trim()) return;
    patch({ customerCreating: true });
    try {
      const created = await createCustomer(phone, state.newCustomerName);
      patch({ selectedCustomer: created, customerLookupStatus: 'found', customerCreating: false });
    } catch (e: any) {
      patch({ customerCreating: false, checkoutError: e?.message || 'Could not save new customer.' });
    }
  }, [state.customerPhone, state.newCustomerName, patch]);

  const clearSelectedCustomer = useCallback(() => {
    patch({ customerPhone: '', customerCardCode: '', customerLookupMessage: null, selectedCustomer: null, customerLookupStatus: 'idle', newCustomerName: '', redeemPoints: '' });
  }, [patch]);

  // ─────────────────────────────────────────────
  // GIFT CARD BALANCE CHECK
  // ─────────────────────────────────────────────
  const checkGiftCardBalanceAction = useCallback(async (overrideCode?: string) => {
    const code = (overrideCode ?? state.giftCardCode).trim();
    if (!code) return;
    patch({ giftCardChecking: true, giftCardError: null });
    const result = await checkGiftCardBalance(code);
    if (!result || !result.isActive) {
      patch({ giftCardChecking: false, giftCardBalance: null, giftCardError: 'Gift card not found or inactive.' });
    } else {
      patch({ giftCardChecking: false, giftCardBalance: result.balance, giftCardError: null });
    }
  }, [state.giftCardCode, patch]);

  // Same balance check as above, for the gift-card LEG of a split payment (Cash + GCash + Gift
  // Card) — a separate code/balance/checking/error slice of state (splitGiftCard*) since a split
  // order's gift card is independent of the exclusive gift-card payMethod path.
  const checkSplitGiftCardBalanceAction = useCallback(async () => {
    const code = state.splitGiftCardCode.trim();
    if (!code) return;
    patch({ splitGiftCardChecking: true, splitGiftCardError: null });
    const result = await checkGiftCardBalance(code);
    if (!result || !result.isActive) {
      patch({ splitGiftCardChecking: false, splitGiftCardBalance: null, splitGiftCardError: 'Gift card not found or inactive.' });
    } else {
      patch({ splitGiftCardChecking: false, splitGiftCardBalance: result.balance, splitGiftCardError: null });
    }
  }, [state.splitGiftCardCode, patch]);

  // Unlike a loyalty card, a gift card's QR encodes the bare code with no prefix (see the
  // Share modal in cafe-web-dashboard's gift-cards page) — there's no format to validate beyond
  // "did the camera decode something at all".
  const scanGiftCardCode = useCallback((payload: string) => {
    const code = payload.trim().toUpperCase();
    if (!code) {
      patch({ showQrScanner: false, checkoutError: 'That QR code could not be read as a gift card.' });
      return;
    }
    patch({ showQrScanner: false, giftCardCode: code, giftCardBalance: null, giftCardError: null });
    checkGiftCardBalanceAction(code);
  }, [patch, checkGiftCardBalanceAction]);

  // Single entry point the QrScannerModal calls — routes the decoded payload to whichever flow
  // opened the scanner (see openQrScanner()).
  const handleQrScanned = useCallback((payload: string) => {
    if (state.qrScanTarget === 'gift_card') {
      scanGiftCardCode(payload);
    } else {
      scanLoyaltyCardCode(payload);
    }
  }, [state.qrScanTarget, scanGiftCardCode, scanLoyaltyCardCode]);

  // ─────────────────────────────────────────────
  // CHECKOUT
  // ─────────────────────────────────────────────
  const checkout = useCallback(async () => {
    if (!state.currentUser || state.cart.length === 0 || state.checkoutBusy) return;
    patch({ checkoutBusy: true, checkoutError: null });
    if (authSyncRef.current) await authSyncRef.current;

    const online = await isOnline();
    // Online checkout/append/gift-card must run under a real pin-login JWT. Offline new
    // orders still go to the outbox without a session — that's the till-must-keep-selling path.
    if (online) {
      try {
        await requirePosSession();
      } catch (e: any) {
        patch({ checkoutBusy: false, checkoutError: e?.message || SESSION_MISSING_MESSAGE });
        return;
      }
    }

    const isAppend = !!state.appendTargetOrderId;
    // Appending to an existing order has no offline outbox path of its own (unlike a brand-new
    // order) — merging into a possibly-already-synced parent row safely needs a live round trip.
    if (isAppend && !online) {
      patch({ checkoutBusy: false, checkoutError: 'Adding items to an existing order requires an internet connection. Please reconnect and try again.' });
      return;
    }

    // Defense-in-depth behind the canPay gate in PosApp.tsx (customerNameMissing) — an append
    // has no Name-for-Order field of its own, so this only ever applies to a fresh order.
    if (!isAppend && state.storeSettings.checkoutRequireCustomerName
      && !state.customerName.trim() && !state.selectedCustomer?.fullName) {
      patch({ checkoutBusy: false, checkoutError: 'Customer name is required to check out.' });
      return;
    }

    // Defense-in-depth behind the canPay gate in PosApp.tsx (deliveryAddressMissing) — same
    // append carve-out as the customer-name check above.
    if (!isAppend && state.orderType === 'delivery' && !state.deliveryAddress.trim()) {
      patch({ checkoutBusy: false, checkoutError: 'Delivery address is required to check out.' });
      return;
    }

    // Split payment isn't offered on an append/top-up — keeping that flow to a single method
    // avoids compounding two deliberately-scoped-down features (append + split) at once.
    const isSplit = state.splitEnabled && !isAppend;
    const splitCashAmt = isSplit ? Number(state.splitCashAmount) || 0 : 0;
    const splitGcashAmt = isSplit ? Number(state.splitGcashAmount) || 0 : 0;
    // Gift card is a THIRD leg of split payment alongside cash/GCash — see splitGiftCardAmount's
    // doc comment in PosState above.
    const splitGiftCardAmt = isSplit ? Number(state.splitGiftCardAmount) || 0 : 0;
    if (isSplit && Math.abs(splitCashAmt + splitGcashAmt + splitGiftCardAmt - totals.total) > 0.01) {
      patch({ checkoutBusy: false, checkoutError: `Split amounts must add up to ${peso(totals.total)}.` });
      return;
    }

    const isGcash = !isSplit && state.payMethod === 'gcash';
    const gcashInvolved = isGcash || (isSplit && splitGcashAmt > 0);
    // Defense-in-depth behind the canPay gate in PosApp.tsx — GCash has no merchant API to
    // verify against, so the barista's checkbox attestation IS the record that the payment
    // happened; the reference number is optional supplementary detail on top of that, not a
    // second requirement. Applies whether GCash is the sole method or one leg of a split.
    if (gcashInvolved && !state.gcashConfirmed) {
      patch({ checkoutBusy: false, checkoutError: 'Confirm the GCash payment before charging.' });
      return;
    }

    // Gift cards are exclusive-payment-method-only for v1 (see redeem_gift_card() migration
    // comment) — not offered on an append/top-up, but now also reachable as a split leg
    // (splitGiftCardAmt above). Either path debits via the same redeem_gift_card() RPC, which
    // has no offline-outbox fallback, so both are required up front, same as append above.
    const isGiftCard = !isAppend && !isSplit && state.payMethod === 'gift_card';
    const giftCardRpcInvolved = isGiftCard || (isSplit && splitGiftCardAmt > 0);
    if (giftCardRpcInvolved && !online) {
      patch({ checkoutBusy: false, checkoutError: 'Paying with a gift card requires an internet connection. Please reconnect and try again.' });
      return;
    }

    // Same daily ticket the Order Type screen already previewed ("New Order · #0004") —
    // not a REC-… hash. Bumped locally so the next preview stays in sync even offline.
    const receiptNumber = nextDailyOrderNo(state.todayOrderCount);
    const nextTodayCount = state.todayOrderCount + 1;
    const tenderNum = state.tendered !== '' && !isNaN(Number(state.tendered)) ? Number(state.tendered) : null;
    const isCash = !isSplit && state.payMethod === 'cash';
    // Loyalty-point redemption isn't offered on an append or a split order (see redeemPoints'
    // mutual-exclusion in PosApp.tsx), so amountDue === totals.total for those two flows — cash
    // change and the split-mismatch check above behave exactly as before this feature shipped.
    const chargeAmount = isAppend ? totals.total : amountDue;
    const change = isCash && tenderNum !== null ? tenderNum - chargeAmount : 0;
    const gcashReference = gcashInvolved ? (state.gcashReference.trim() || null) : null;
    const gcashProofUrl = gcashInvolved ? (state.gcashProofUrl || null) : null;
    const effectivePayMethod: PayMethod = isSplit ? 'split' : state.payMethod;
    const customerId = isAppend ? null : state.selectedCustomer?.id ?? null;
    const pointsRedeemed = isAppend ? 0 : Math.min(redeemPointsNum, maxRedeemablePoints);
    const pointsEarned = isAppend || !state.storeSettings.loyaltyEnabled || !customerId || phpPerPoint <= 0
      ? 0
      : Math.floor(chargeAmount / phpPerPoint);
    const giftCardCode = isGiftCard ? state.giftCardCode.trim() : null;
    // Split leg's own code — independent of giftCardCode above (the exclusive-payMethod path).
    const splitGiftCardCodeFinal = isSplit && splitGiftCardAmt > 0 ? state.splitGiftCardCode.trim() : null;
    const receiptEmail = state.receiptEmail.trim() || null;

    const orderData: PosOrderData = {
      total: chargeAmount,
      total_amount: chargeAmount,
      payment_method: effectivePayMethod,
      receipt_number: receiptNumber,
      barista_id: state.currentUser.id,
      status: 'pending',
      order_type: state.orderType,
      delivery_address: !isAppend && state.orderType === 'delivery' ? state.deliveryAddress.trim() : null,
      customer_name: state.customerName.trim() || state.selectedCustomer?.fullName || null,
      discount_name: state.discountName !== 'None' ? state.discountName : null,
      discount_id: state.discountsList.find((d) => d.n === state.discountName)?.id ?? null,
      subtotal: totals.sub,
      discount_amount: totals.disc,
      tax_amount: totals.tax,
      service_charge_amount: totals.service,
      is_tax_inclusive: state.storeSettings.isTaxInclusive,
      rush_mode: state.storeSettings.rushModeEnabled,
      gcash_reference: gcashReference,
      gcash_proof_url: gcashProofUrl,
      customer_id: customerId,
      loyalty_points_earned: pointsEarned,
      loyalty_points_redeemed: pointsRedeemed,
      // Falls back to the split leg's code when there's no exclusive gift-card payment, so a
      // split order's redemption still shows up on the order row (matching cafe-web-dashboard).
      gift_card_code: giftCardCode ?? splitGiftCardCodeFinal,
      receipt_email: receiptEmail,
      popup_id: state.popupContext?.id ?? null,
    };
    const paymentSplit: PaymentSplitComponent[] | undefined = isSplit
      ? [
          ...(splitCashAmt > 0 ? [{ method: 'cash' as PayMethod, amount: splitCashAmt }] : []),
          ...(splitGcashAmt > 0 ? [{ method: 'gcash' as PayMethod, amount: splitGcashAmt }] : []),
          ...(splitGiftCardAmt > 0 ? [{ method: 'gift_card' as PayMethod, amount: splitGiftCardAmt }] : []),
        ]
      : undefined;
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

    // Debited BEFORE the order is created — an order must never be rung up against a card that
    // can't actually cover it. If the order insert below fails after this succeeds, the debit
    // still stands (a rare crash/session-loss window, not a network hiccup — submitOrder's own
    // outbox fallback still carries gift_card_code/total through to the eventually-synced order,
    // so no double-debit and no silently lost sale) — an accepted, documented tradeoff rather
    // than a client-side two-phase commit this app has no way to implement.
    if (isGiftCard && giftCardCode) {
      try {
        await redeemGiftCard(giftCardCode, chargeAmount);
      } catch (e: any) {
        patch({ checkoutBusy: false, checkoutError: e?.message || 'Gift card redemption failed.' });
        return;
      }
    }
    // Split gift-card leg — debited alongside (never instead of) the exclusive debit above; the
    // two are mutually exclusive in practice (isGiftCard implies !isSplit) but each is its own
    // guarded RPC call, same non-double-debit tradeoff documented above.
    if (splitGiftCardCodeFinal) {
      try {
        await redeemGiftCard(splitGiftCardCodeFinal, splitGiftCardAmt);
      } catch (e: any) {
        patch({ checkoutBusy: false, checkoutError: e?.message || 'Gift card redemption failed.' });
        return;
      }
    }

    try {
      if (isAppend) {
        await addItemsToExistingOrder(state.appendTargetOrderId!, orderItems, state.payMethod, {
          subtotal: totals.sub,
          discount_amount: totals.disc,
          tax_amount: totals.tax,
          service_charge_amount: totals.service,
          total: totals.total,
        }, gcashReference, gcashProofUrl);
      } else {
        await submitOrder(orderData, orderItems, displayItems, paymentSplit);
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
      total: chargeAmount,
      method: isSplit
        ? `Split (Cash ${peso0(splitCashAmt)} + GCash ${peso0(splitGcashAmt)}${splitGiftCardAmt > 0 ? ` + Gift Card ${peso0(splitGiftCardAmt)}` : ''})`
        : isGiftCard ? 'Gift Card' : isCash ? 'Cash' : 'GCash',
      items,
      showChange: isCash && change >= 0,
      change,
      customerName: isAppend ? null : orderData.customer_name,
      gcashReference,
      giftCardCode,
      loyaltyPointsEarned: pointsEarned,
      loyaltyPointsRedeemed: pointsRedeemed,
      loyaltyRedemptionAmount: isAppend ? 0 : loyaltyRedemptionAmount,
      receiptEmail,
    };

    // Best-effort, mirrors the non-fatal stock-deduction/low-stock-alert convention in
    // posOrder.ts — the sale itself already succeeded above; a points/email hiccup shouldn't
    // block the barista from moving on to the next customer.
    if (customerId && (pointsEarned > 0 || pointsRedeemed > 0)) {
      applyLoyaltyPoints(customerId, pointsEarned, pointsRedeemed).catch((e) => console.error('Failed to apply loyalty points:', e));
    }
    if (receiptEmail) {
      const orderTypeLabel = toOrderTypeLabel(state.orderType);
      const store = state.storeSettings;
      sendReceiptEmail(receiptEmail, success, orderTypeLabel, {
        storeName: store.storeName,
        tagline: store.tagline,
        address: store.address,
        phone: store.phone,
        tin: store.tin,
        receiptFooter: store.receiptFooter,
      }).catch((e) => console.error('Failed to send receipt email:', e));
    }

    patch({ success, screen: 'success', checkoutBusy: false, checkoutError: null, todayOrderCount: isAppend ? state.todayOrderCount : nextTodayCount });
    fetchQueue();
  }, [state.currentUser, state.cart, state.tendered, state.payMethod, state.splitEnabled, state.splitCashAmount, state.splitGcashAmount, state.splitGiftCardAmount, state.splitGiftCardCode, state.gcashReference, state.gcashConfirmed, state.gcashProofUrl, state.orderType, state.deliveryAddress, state.storeSettings, state.customerName, state.checkoutBusy, state.appendTargetOrderId, state.appendTargetOrderNo, state.selectedCustomer, state.giftCardCode, state.receiptEmail, state.discountName, state.discountsList, state.todayOrderCount, state.popupContext, redeemPointsNum, maxRedeemablePoints, phpPerPoint, amountDue, totals, patch, fetchQueue]);

  const done = useCallback(() => {
    clearPendingUndo();
    setState((s) => ({
      ...s,
      screen: 'orderType',
      cart: [],
      selMods: {},
      qty: 1,
      note: '',
      tendered: '',
      splitEnabled: false,
      splitCashAmount: '',
      splitGcashAmount: '',
      splitGiftCardAmount: '',
      splitGiftCardCode: '',
      splitGiftCardBalance: null,
      splitGiftCardChecking: false,
      splitGiftCardError: null,
      discountName: 'None',
      customerName: '',
      deliveryAddress: '',
      payMethod: 'cash',
      success: null,
      selCat: 'All',
      search: '',
      selItemId: null,
      editingCartId: null,
      showGcashQr: false,
      showQrScanner: false,
      qrScanTarget: null,
      showGcashProofCamera: false,
      gcashReference: '',
      gcashConfirmed: false,
      gcashProofUri: null,
      gcashProofUrl: null,
      gcashProofUploading: false,
      appendTargetOrderId: null,
      appendTargetOrderNo: null,
      customerPhone: '',
      customerLookupStatus: 'idle',
      customerLookupMode: 'phone',
      customerCardCode: '',
      customerLookupMessage: null,
      selectedCustomer: null,
      newCustomerName: '',
      redeemPoints: '',
      giftCardCode: '',
      giftCardBalance: null,
      giftCardError: null,
      receiptEmail: '',
    }));
  }, [clearPendingUndo]);

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
      if (m.is_active === false) {
        map[m.id] = { unavailable: true, qty: 0, low: false };
        return;
      }
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

  // Category chip always scopes the grid. Search is an extra name filter on top of that —
  // tap All to search the whole menu, or tap Hot Coffee / Cold Drinks to see only that group.
  const filteredItems = useMemo(() => {
    const q = state.search.toLowerCase();
    return state.menuItems.filter(
      (m) => (state.selCat === 'All' || m.category === state.selCat) && m.name.toLowerCase().includes(q)
    );
  }, [state.search, state.selCat, state.menuItems]);

  const selectedItem = useMemo(() => state.menuItems.find((m) => m.id === state.selItemId) || null, [state.selItemId, state.menuItems]);

  const selectedItemGroups = useMemo(
    () => (selectedItem ? state.modifierGroupsByItem[selectedItem.id] ?? [] : []),
    [selectedItem, state.modifierGroupsByItem]
  );

  // Modifier options (e.g. "Oat Milk") linked to a depleted ingredient via modifier_recipes —
  // same isOutOfStock check menu items use, just keyed by option id instead of menu item id.
  const outOfStockModifierIds = useMemo(() => {
    const ids = new Set<string>();
    Object.keys(state.recipesByModifier).forEach((optionId) => {
      if (isOutOfStock(optionId, state.recipesByModifier, state.ingredientStock, state.storeSettings.rushModeEnabled)) ids.add(optionId);
    });
    return ids;
  }, [state.recipesByModifier, state.ingredientStock, state.storeSettings.rushModeEnabled]);

  const addValid = useMemo(() => {
    const modsOk = !selectedItemGroups.some((g) => g.required && !(state.selMods[g.id] || []).length);
    if (!modsOk) return false;
    if (selectedItem && selectedItem.is_active === false) return false;
    if (selectedItem && isOutOfStock(selectedItem.id, state.recipesByItem, state.ingredientStock, state.storeSettings.rushModeEnabled)) return false;
    const selectedModsOutOfStock = Object.values(state.selMods).flat().some((o) => o.id && outOfStockModifierIds.has(o.id));
    if (selectedModsOutOfStock) return false;
    return true;
  }, [selectedItemGroups, state.selMods, selectedItem, state.recipesByItem, state.ingredientStock, state.storeSettings.rushModeEnabled, outOfStockModifierIds]);

  const addUnitTotal = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedItem.price + modTotal(state.selMods);
  }, [selectedItem, state.selMods]);

  const maxAddableForSelected = useMemo(() => {
    if (!selectedItem) return Infinity;
    // When editing an existing line, don't double-count its own qty against stock.
    const cartForStock = state.editingCartId
      ? state.cart.filter((c) => c.cartId !== state.editingCartId)
      : state.cart;
    return getMaxAddableQty(
      selectedItem.id,
      cartForStock.map((c) => ({ menuId: c.menuId, qty: c.qty })),
      state.recipesByItem,
      state.ingredientStock,
      state.storeSettings.rushModeEnabled
    );
  }, [selectedItem, state.cart, state.editingCartId, state.recipesByItem, state.ingredientStock, state.storeSettings.rushModeEnabled]);

  const tenderNum = useMemo(
    () => (state.tendered !== '' && !isNaN(Number(state.tendered)) ? Number(state.tendered) : null),
    [state.tendered]
  );
  // Split stays pinned to totals.total (redeeming loyalty points is mutually exclusive with a
  // split payment — see PosApp.tsx), so amountDue === totals.total whenever splitEnabled.
  const change = tenderNum !== null ? tenderNum - amountDue : null;
  const shortfall = !state.splitEnabled && state.payMethod === 'cash' && tenderNum !== null && tenderNum < amountDue;
  const splitGiftCardAmt = state.splitEnabled ? (Number(state.splitGiftCardAmount) || 0) : 0;
  const splitAmountMismatch = state.splitEnabled
    && Math.abs((Number(state.splitCashAmount) || 0) + (Number(state.splitGcashAmount) || 0) + splitGiftCardAmt - totals.total) > 0.01;
  const gcashUnconfirmed = (state.splitEnabled ? (Number(state.splitGcashAmount) || 0) > 0 : state.payMethod === 'gcash')
    && !state.gcashConfirmed;
  const giftCardInsufficient = !state.splitEnabled && state.payMethod === 'gift_card'
    && (state.giftCardBalance === null || state.giftCardBalance < amountDue);
  // Split leg's own sufficiency check — independent of giftCardInsufficient above (the exclusive
  // payMethod path). False (i.e. "fine") whenever the leg amount is 0, so it never blocks
  // checkout for an order that isn't using a gift card leg at all.
  const splitGiftCardInsufficient = splitGiftCardAmt > 0
    && (!state.splitGiftCardCode.trim() || state.splitGiftCardBalance === null || state.splitGiftCardBalance < splitGiftCardAmt);
  // An append/top-up has no Order Type section of its own (see AppendOrderBanner), so this only
  // ever applies to a fresh order — same carve-out customerNameMissing uses in PosApp.tsx.
  const deliveryAddressMissing = !state.appendTargetOrderId && state.orderType === 'delivery' && !state.deliveryAddress.trim();
  const cartCount = state.cart.reduce((s, c) => s + c.qty, 0);

  const { appUpdateUrl, appUpdateVersion } = state.storeSettings;
  const updateAvailable = Platform.OS === 'android' && !state.updateDismissed && appUpdateUrl && appUpdateVersion
      && isNewerVersion(appUpdateVersion, APP_VERSION)
    ? { url: appUpdateUrl, version: appUpdateVersion }
    : null;
  const dismissUpdate = useCallback(() => patch({ updateDismissed: true }), [patch]);

  return {
    state,
    patch,
    selectType,
    openItem,
    editCartItem,
    closeItem,
    toggleMod,
    addToCart,
    changeQty,
    removeFromCart,
    pendingUndo,
    undoRemove,
    checkout,
    done,
    completeQueueTicket,
    advanceItemPrepStatus,
    flagVoidOrder,
    managerVoidOrder,
    selfVoidOrder,
    managerRefundOrder,
    adjustStockManual,
    startAddToOrder,
    cancelAddToOrder,
    totals,
    discountPct,
    discountLabel,
    eligibleDiscounts,
    amountDue,
    loyaltyRedemptionAmount,
    maxRedeemablePoints,
    pointsToEarnPreview,
    lookupCustomer,
    changeCustomerLookupMode,
    openQrScanner,
    handleQrScanned,
    createCustomerInline,
    clearSelectedCustomer,
    checkGiftCardBalanceAction,
    giftCardInsufficient,
    checkSplitGiftCardBalanceAction,
    splitGiftCardInsufficient,
    cartQtyByMenuId,
    stockByMenuId,
    filteredItems,
    selectedItem,
    selectedItemGroups,
    outOfStockModifierIds,
    addValid,
    addUnitTotal,
    maxAddableForSelected,
    tenderNum,
    change,
    shortfall,
    gcashUnconfirmed,
    splitAmountMismatch,
    deliveryAddressMissing,
    cartCount,
    categories: state.categories,
    discounts: state.discountsList,
    quickCash: QUICK_CASH,
    updateAvailable,
    dismissUpdate,

    // auth / shift
    login,
    logout,
    lockPos,
    uploadAvatar,
    handleGcashProofCaptured,
    openShiftAction,
    closeShiftAction,
    dismissShiftCloseSummary,

    // offline outbox inspect/retry/delete
    outboxEntries: outboxOrderEntries,
    openOutbox,
    closeOutbox,
    retryOutboxEntry,
    deleteOutboxEntry,
  };
}

export type CremaPos = ReturnType<typeof useCremaPos>;
export { peso, peso0 };
