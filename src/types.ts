export type OrderType = 'dine-in' | 'takeout';
export type PayMethod = 'cash' | 'gcash';
export type Screen = 'orderType' | 'menu' | 'checkout' | 'success' | 'queue' | 'history';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string | null;
}

export type ModOptionDef = [name: string, price: number];

export interface ModGroupDef {
  id: string;
  name: string;
  required: boolean;
  multi: boolean;
  options: ModOptionDef[];
}

export interface SelectedMod {
  name: string;
  p: number;
}

export type SelectedMods = Record<string, SelectedMod[]>;

export interface CartItem {
  cartId: string;
  menuId: string;
  name: string;
  unit: number;
  qty: number;
  mods: string[];
  note: string;
  /** Structured {name, price} pairs for the real order_items.modifiers_json payload — `mods` above is the display-string version CartRow renders. */
  modifiers: { name: string; price: number }[];
}

export interface Discount {
  id: string | null;
  n: string;
  p: number;
}

export interface QueueItemLine {
  name: string;
  qty: number;
  /** Modifiers + special note, joined into one display string (e.g. "Oat Milk · No Sugar · Note: extra hot"). */
  mods?: string;
}

export interface QueueEntry {
  id: string;
  no: string;
  type: 'Dine-In' | 'Takeout';
  mins: number;
  items: QueueItemLine[];
  total: number;
  /** Line items keyed for stock-restore on void — not rendered by QueueCard. */
  restoreItems: { menu_item_id: string; qty: number }[];
  /** True for an order still sitting in the local offline outbox — not yet a real Supabase row. */
  pendingSync?: boolean;
  /** Optional name given for the order (e.g. for takeout pickup calls) — not always present. */
  customerName?: string | null;
  /** The order's original barista — used to attribute pos_activity_logs rows correctly even when a different barista is on-shift now. */
  barista_id: string;
}

export interface SuccessInfo {
  no: string;
  total: number;
  method: 'Cash' | 'GCash';
  items: { qtyName: string; lineStr: string; modsStr?: string }[];
  showChange: boolean;
  change: number;
  customerName?: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'manager' | 'barista';
  avatar_url?: string | null;
}

export interface Shift {
  id: string;
  startingCash: number;
  openedAt: string;
}

// A planned future shift a manager assigned via the web dashboard's Staff page — read-only on
// mobile, since scheduling/editing stays a manager-only web feature by design.
export interface ShiftScheduleEntry {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  notes: string | null;
}
