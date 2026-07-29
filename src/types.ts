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
  n: string;
  p: number;
}

export interface QueueEntry {
  id: string;
  no: string;
  type: 'Dine-In' | 'Takeout';
  mins: number;
  items: [string, number][];
  total: number;
  /** Line items keyed for stock-restore on void — not rendered by QueueCard. */
  restoreItems: { menu_item_id: string; qty: number }[];
  /** True for an order still sitting in the local offline outbox — not yet a real Supabase row. */
  pendingSync?: boolean;
}

export interface SuccessInfo {
  no: string;
  total: number;
  method: 'Cash' | 'GCash';
  items: { qtyName: string; lineStr: string }[];
  showChange: boolean;
  change: number;
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
