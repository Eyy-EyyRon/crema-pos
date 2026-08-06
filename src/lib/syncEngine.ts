import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { logActivity } from './activityLog';
import { PaymentSplitComponent, PosOrderData, PosOrderItem, restoreStockForOrderItems, submitPosOrder } from './posOrder';
import { REASON_CODE_LABELS, ReasonCode } from './reasonCodes';
import { supabase } from './supabase';

// Offline outbox for checkout — ported from CafePOS's .vscode/lib/syncEngine.ts,
// rewired to push through posOrder.ts's submitPosOrder (atomic stock RPCs)
// instead of CafePOS's own read-then-write deduction loop.

const OUTBOX_KEY = '@crema_order_outbox';

export type OutboxEntry = {
  id: string; // temp local id, not a real order id
  orderData: PosOrderData;
  orderItems: PosOrderItem[];
  // Item names/qtys/mods for offline-queue display only — order_items has no
  // name column (normally resolved via a menu_items join on fetch), but a
  // synthetic outbox ticket has nothing to join against yet.
  displayItems: { name: string; qty: number; mods?: string }[];
  timestamp: string;
  paymentSplit?: PaymentSplitComponent[];
};

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return !!(state.isConnected && state.isInternetReachable);
}

export async function submitOrder(
  orderData: PosOrderData,
  orderItems: PosOrderItem[],
  displayItems: { name: string; qty: number; mods?: string }[],
  paymentSplit?: PaymentSplitComponent[]
): Promise<string> {
  const online = await isOnline();

  if (online) {
    // A network connection existing doesn't mean we have a real authenticated
    // session — the fast-path login's background auth can fail (see login()
    // in useCremaPos.ts). Queuing that case into the outbox would retry the
    // same doomed insert every 10s forever with zero indication anything's
    // wrong, silently stranding real sales. Failing loudly here instead lets
    // the caller's checkoutError banner tell the barista to re-login.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Your session isn't active. Please lock the POS and log back in, then try again.");
    }
    try {
      return await submitPosOrder(orderData, orderItems, paymentSplit);
    } catch (e) {
      console.log('Checkout failed while online, routing to outbox...', e);
      // fall through — connection may have dropped exactly during submission
    }
  }

  const entry: OutboxEntry = {
    id: 'outbox-' + orderData.receipt_number,
    orderData,
    orderItems,
    displayItems,
    timestamp: new Date().toISOString(),
    paymentSplit,
  };

  const outboxStr = await AsyncStorage.getItem(OUTBOX_KEY);
  const outbox: OutboxEntry[] = outboxStr ? JSON.parse(outboxStr) : [];
  outbox.push(entry);
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));

  return entry.id;
}

export async function syncOutbox(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  const outboxStr = await AsyncStorage.getItem(OUTBOX_KEY);
  if (!outboxStr) return;

  const outbox: OutboxEntry[] = JSON.parse(outboxStr);
  if (outbox.length === 0) return;

  const failed: OutboxEntry[] = [];
  for (const pending of outbox) {
    try {
      await submitPosOrder(pending.orderData, pending.orderItems, pending.paymentSplit);
    } catch (e) {
      console.error('Failed to sync an offline order, keeping in outbox', e);
      failed.push(pending); // keep it if it fails so we don't lose the sale
    }
  }

  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(failed));
}

export async function getOutboxCount(): Promise<number> {
  try {
    const outboxStr = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!outboxStr) return 0;
    const outbox = JSON.parse(outboxStr);
    return Array.isArray(outbox) ? outbox.length : 0;
  } catch {
    return 0;
  }
}

export async function getOutboxOrders(): Promise<OutboxEntry[]> {
  try {
    const outboxStr = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!outboxStr) return [];
    const outbox = JSON.parse(outboxStr);
    return Array.isArray(outbox) ? outbox : [];
  } catch {
    return [];
  }
}

// Manual retry/delete for the order outbox — surfaced in AccountSheet's "Sync Status" row so a
// stuck failed entry has a visible remediation path instead of retrying silently forever.
export async function retryOutboxEntry(id: string): Promise<{ error?: string }> {
  const outbox = await getOutboxOrders();
  const entry = outbox.find((o) => o.id === id);
  if (!entry) return { error: 'That order is no longer in the outbox.' };
  try {
    await submitPosOrder(entry.orderData, entry.orderItems, entry.paymentSplit);
  } catch (e: any) {
    return { error: e?.message || 'Retry failed. Check your connection and try again.' };
  }
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.filter((o) => o.id !== id)));
  return {};
}

export async function deleteOutboxEntry(id: string): Promise<void> {
  const outbox = await getOutboxOrders();
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.filter((o) => o.id !== id)));
}

// ─────────────────────────────────────────────
// ACTION OUTBOX — a SEPARATE outbox for mutations against an already-existing order (void
// requests, manager-PIN-authorized voids) rather than new-order creation above. Kept distinct
// from OUTBOX_KEY because these entries reference a real order_id that already exists server-
// side, unlike a brand-new order which doesn't exist anywhere until it syncs.
// ─────────────────────────────────────────────

const ACTION_OUTBOX_KEY = '@crema_action_outbox';

export type ActionOutboxEntry =
  | {
      id: string;
      kind: 'flag_void';
      orderId: string;
      orderNo: string;
      reasonCode: string;
      detail: string;
      baristaId: string;
      timestamp: string;
    }
  | {
      id: string;
      kind: 'manager_void';
      orderId: string;
      orderNo: string;
      reasonCode: string;
      detail: string;
      managerId: string;
      managerName: string;
      restoreItems: { menu_item_id: string; qty: number }[];
      timestamp: string;
    };

// Plain Omit collapses a discriminated union down to its shared keys only, which would strip
// baristaId/managerId/managerName/restoreItems from the parameter type below — distribute it
// over each union member instead so queueAction still requires the right fields per `kind`.
type NewActionEntry = ActionOutboxEntry extends infer T
  ? T extends any ? Omit<T, 'id' | 'timestamp'> : never
  : never;

export async function queueAction(entry: NewActionEntry): Promise<ActionOutboxEntry> {
  const full = {
    ...entry,
    id: 'action-' + Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
    timestamp: new Date().toISOString(),
  } as ActionOutboxEntry;
  const str = await AsyncStorage.getItem(ACTION_OUTBOX_KEY);
  const outbox: ActionOutboxEntry[] = str ? JSON.parse(str) : [];
  outbox.push(full);
  await AsyncStorage.setItem(ACTION_OUTBOX_KEY, JSON.stringify(outbox));
  return full;
}

export async function getActionOutbox(): Promise<ActionOutboxEntry[]> {
  try {
    const str = await AsyncStorage.getItem(ACTION_OUTBOX_KEY);
    if (!str) return [];
    const outbox = JSON.parse(str);
    return Array.isArray(outbox) ? outbox : [];
  } catch {
    return [];
  }
}

export async function syncActionOutbox(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  const outbox = await getActionOutbox();
  if (outbox.length === 0) return;

  const failed: ActionOutboxEntry[] = [];
  for (const action of outbox) {
    try {
      const finalReason = action.detail.trim() || REASON_CODE_LABELS[action.reasonCode as ReasonCode] || action.reasonCode;
      if (action.kind === 'flag_void') {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'void_requested', void_reason: finalReason, void_reason_code: action.reasonCode })
          .eq('id', action.orderId);
        if (error) throw error;
        logActivity(action.baristaId, 'void_requested', `Void requested for order ${action.orderNo} — ${finalReason}`);
      } else {
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'voided',
            void_reason: finalReason,
            void_reason_code: action.reasonCode,
            voided_by: action.managerId,
            void_offline_approved: true,
          })
          .eq('id', action.orderId);
        if (error) throw error;
        supabase.rpc('adjust_sales_for_order', { p_order_id: action.orderId }).then(({ error: adjErr }) => {
          if (adjErr) console.warn('adjust_sales_for_order failed:', adjErr.message);
        });
        logActivity(action.managerId, 'void_approved', `Order ${action.orderNo} voided by manager ${action.managerName} (offline-approved) — ${finalReason}`);
        if (action.restoreItems.length > 0) await restoreStockForOrderItems(action.restoreItems);
      }
    } catch (e) {
      console.error('Failed to sync a queued action, keeping in outbox', e);
      failed.push(action);
    }
  }

  await AsyncStorage.setItem(ACTION_OUTBOX_KEY, JSON.stringify(failed));
}
