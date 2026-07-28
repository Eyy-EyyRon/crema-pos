import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { PosOrderData, PosOrderItem, submitPosOrder } from './posOrder';

// Offline outbox for checkout — ported from CafePOS's .vscode/lib/syncEngine.ts,
// rewired to push through posOrder.ts's submitPosOrder (atomic stock RPCs)
// instead of CafePOS's own read-then-write deduction loop.

const OUTBOX_KEY = '@crema_order_outbox';

export type OutboxEntry = {
  id: string; // temp local id, not a real order id
  orderData: PosOrderData;
  orderItems: PosOrderItem[];
  // Item names/qtys for offline-queue display only — order_items has no name
  // column (normally resolved via a menu_items join on fetch), but a
  // synthetic outbox ticket has nothing to join against yet.
  displayItems: { name: string; qty: number }[];
  timestamp: string;
};

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return !!(state.isConnected && state.isInternetReachable);
}

export async function submitOrder(
  orderData: PosOrderData,
  orderItems: PosOrderItem[],
  displayItems: { name: string; qty: number }[]
): Promise<string> {
  const online = await isOnline();

  if (online) {
    try {
      return await submitPosOrder(orderData, orderItems);
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
      await submitPosOrder(pending.orderData, pending.orderItems);
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
