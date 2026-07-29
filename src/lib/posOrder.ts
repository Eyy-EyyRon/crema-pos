import { supabase } from './supabase';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type RecipeRow = { menu_item_id: string; ingredient_id: string; recipe_qty: number };

export type ModifierOption = {
  id: string;
  modifier_group_id: string;
  name: string;
  price_adjustment: number;
  sort_order: number;
};

export type ModifierGroup = {
  id: string;
  name: string;
  is_required: boolean;
  multi_select: boolean;
  sort_order: number;
  options: ModifierOption[];
};

export type Modifier = { name: string; price: number };

export type PayMethod = 'cash' | 'gcash' | 'maya' | 'card';
export type OrderType = 'dine-in' | 'takeout';

// ─────────────────────────────────────────────
// STOCK HELPERS (ported from cafe-web-dashboard/lib/posOrder.ts, itself
// ported from CafePOS app/pos/index.tsx)
// ─────────────────────────────────────────────

export function buildRecipesByItem(recipes: RecipeRow[]): Record<string, RecipeRow[]> {
  const map: Record<string, RecipeRow[]> = {};
  recipes.forEach((r) => {
    if (!map[r.menu_item_id]) map[r.menu_item_id] = [];
    map[r.menu_item_id].push(r);
  });
  return map;
}

export function isOutOfStock(
  itemId: string,
  recipesByItem: Record<string, RecipeRow[]>,
  stockByIngredient: Record<string, number>,
  rushModeEnabled: boolean = false
): boolean {
  if (rushModeEnabled) return false; // Rush Mode: ignore ingredient stock entirely
  const itemRecipes = recipesByItem[itemId];
  if (!itemRecipes?.length) return false; // no recipe rows => can't assess => treated as in-stock
  return itemRecipes.some((r) => (stockByIngredient[r.ingredient_id] ?? 0) < Number(r.recipe_qty));
}

export function getIngredientReservations(
  cart: { menuId: string; qty: number }[],
  recipesByItem: Record<string, RecipeRow[]>
): Record<string, number> {
  const reserved: Record<string, number> = {};
  cart.forEach((ci) => {
    const recipe = recipesByItem[ci.menuId];
    if (!recipe) return;
    recipe.forEach((r) => {
      reserved[r.ingredient_id] = (reserved[r.ingredient_id] ?? 0) + Number(r.recipe_qty) * ci.qty;
    });
  });
  return reserved;
}

export function getMaxAddableQty(
  itemId: string,
  cart: { menuId: string; qty: number }[],
  recipesByItem: Record<string, RecipeRow[]>,
  ingredientStock: Record<string, number>,
  rushModeEnabled: boolean = false
): number {
  if (rushModeEnabled) return Infinity; // Rush Mode: ignore ingredient stock entirely
  const recipe = recipesByItem[itemId];
  if (!recipe?.length) return Infinity;

  const reserved = getIngredientReservations(cart, recipesByItem);
  let max = Infinity;
  recipe.forEach((r) => {
    const available = (ingredientStock[r.ingredient_id] ?? 0) - (reserved[r.ingredient_id] ?? 0);
    const maxFromThis = Math.floor(available / Number(r.recipe_qty));
    if (maxFromThis < max) max = maxFromThis;
  });
  return Math.max(0, max);
}

// ─────────────────────────────────────────────
// ORDER TOTALS (tax + service charge)
// ─────────────────────────────────────────────
// Mirrors cafe-web-dashboard/lib/posOrder.ts::computeOrderTotals exactly, so a
// receipt reads the same regardless of which terminal rang it up. Policy:
// service charge only applies to dine-in orders, and is itself taxable in
// tax-exclusive mode (tax applies to the full billed amount).
export type OrderTotals = {
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  serviceChargeAmount: number;
  taxAmount: number;
  total: number;
};

export function computeOrderTotals(params: {
  subtotal: number;
  discountPct: number; // e.g. 0.2 for 20% off
  orderType: OrderType;
  taxRatePct: number; // e.g. 12 for 12%
  isTaxInclusive: boolean;
  serviceChargePct: number; // e.g. 5 for 5%
}): OrderTotals {
  const { subtotal, discountPct, orderType, taxRatePct, isTaxInclusive, serviceChargePct } = params;
  const rate = taxRatePct / 100;
  const scRate = serviceChargePct / 100;

  const discountAmount = subtotal * discountPct;
  const discountedSubtotal = subtotal - discountAmount;
  const serviceChargeAmount = orderType === 'dine-in' ? discountedSubtotal * scRate : 0;

  let taxAmount: number;
  let total: number;
  if (isTaxInclusive) {
    taxAmount = discountedSubtotal - discountedSubtotal / (1 + rate);
    total = discountedSubtotal + serviceChargeAmount;
  } else {
    taxAmount = (discountedSubtotal + serviceChargeAmount) * rate;
    total = discountedSubtotal + serviceChargeAmount + taxAmount;
  }

  return { subtotal, discountAmount, discountedSubtotal, serviceChargeAmount, taxAmount, total };
}

// ─────────────────────────────────────────────
// ORDER SUBMISSION (ported from cafe-web-dashboard/lib/posOrder.ts, which
// itself was ported from CafePOS .vscode/lib/syncEngine.ts::pushOrderToSupabase
// — this version keeps the atomic decrement_ingredient_stock/RPC path rather
// than CafePOS's own read-then-write loop, so two concurrent checkouts
// against the same ingredient can't lose an update)
// ─────────────────────────────────────────────

export type PosOrderData = {
  total: number;
  total_amount: number;
  payment_method: PayMethod;
  receipt_number: string;
  barista_id: string;
  status: 'pending';
  order_type: OrderType;
  customer_name?: string | null;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  service_charge_amount?: number;
  is_tax_inclusive?: boolean;
  rush_mode?: boolean;
};

export type PosOrderItem = {
  menu_item_id: string;
  qty: number;
  unit_price: number;
  modifiers_json: string;
  special_note: string | null;
};

export async function submitPosOrder(orderData: PosOrderData, orderItems: PosOrderItem[]): Promise<string> {
  const { data: order, error: orderErr } = await supabase.from('orders').insert(orderData).select('id').single();
  if (orderErr) throw orderErr;

  const itemsToInsert = orderItems.map((item) => ({ ...item, order_id: order.id }));
  const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
  if (itemsErr) throw itemsErr;

  // Analytics mirror row (non-fatal if it fails) — Analytics' Payment Methods
  // panel (cafe-web-dashboard) reads from `sales`. No `sale_items` write here:
  // that table's product_id FK points at a `products` table that predates
  // menu_items and has never had rows, so every insert fails a foreign-key
  // violation — product-level reporting is already covered by order_items.
  try {
    await supabase.from('sales').insert({
      barista_id: orderData.barista_id,
      total_amount: orderData.total,
      payment_method: orderData.payment_method,
      order_type: orderData.order_type,
      tax_amount: orderData.tax_amount ?? 0,
      service_charge_amount: orderData.service_charge_amount ?? 0,
    });
  } catch (e) {
    console.error('Failed to record sale for analytics:', e);
  }

  // Deduct inventory based on recipe & trigger low-stock alerts (non-fatal if it fails)
  try {
    const menuIds = [...new Set(orderItems.map((i) => i.menu_item_id))];
    const { data: recipes } = await supabase
      .from('recipe_costing')
      .select('menu_item_id, ingredient_id, recipe_qty')
      .in('menu_item_id', menuIds);

    if (recipes && recipes.length > 0) {
      const deductions: Record<string, number> = {};
      orderItems.forEach((item) => {
        recipes
          .filter((r: RecipeRow) => r.menu_item_id === item.menu_item_id)
          .forEach((recipe: RecipeRow) => {
            const qtyToDeduct = Number(recipe.recipe_qty) * Number(item.qty);
            deductions[recipe.ingredient_id] = (deductions[recipe.ingredient_id] || 0) + qtyToDeduct;
          });
      });

      for (const [ingredientId, amount] of Object.entries(deductions)) {
        const { data: rpcData, error: rpcErr } = await supabase
          .rpc('decrement_ingredient_stock', { p_ingredient_id: ingredientId, p_amount: amount })
          .single();

        if (!rpcErr && rpcData) {
          const oldStock = Number((rpcData as any).old_stock);
          const newStock = Number((rpcData as any).new_stock);
          const parLevel = Number((rpcData as any).par_level);
          const ingredientName = (rpcData as any).ingredient_name as string;

          if (oldStock >= parLevel && newStock < parLevel) {
            const { data: settings } = await supabase
              .from('store_settings')
              .select('alert_email, alert_low_stock')
              .eq('id', 1)
              .single();

            if (settings && settings.alert_low_stock && settings.alert_email) {
              await supabase.functions.invoke('send-alert', {
                body: {
                  email: settings.alert_email,
                  ingredientName,
                  currentStock: newStock,
                  parLevel,
                },
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to deduct inventory or send alert:', e);
  }

  return order.id;
}

// Gives back the ingredient stock an order reserved at checkout — used on
// void/refund from the queue or history screens. Shares the atomic RPC with
// the deduct path above so a void can't race a concurrent checkout either.
export async function restoreStockForOrderItems(orderItems: { menu_item_id: string; qty: number }[]) {
  const menuIds = [...new Set(orderItems.map((i) => i.menu_item_id).filter(Boolean))];
  if (menuIds.length === 0) return;

  const { data: recipes } = await supabase
    .from('recipe_costing')
    .select('menu_item_id, ingredient_id, recipe_qty')
    .in('menu_item_id', menuIds);
  if (!recipes || recipes.length === 0) return;

  const restorations: Record<string, number> = {};
  orderItems.forEach((item) => {
    (recipes as RecipeRow[])
      .filter((r) => r.menu_item_id === item.menu_item_id)
      .forEach((recipe) => {
        const qtyToRestore = Number(recipe.recipe_qty) * Number(item.qty);
        restorations[recipe.ingredient_id] = (restorations[recipe.ingredient_id] || 0) + qtyToRestore;
      });
  });

  for (const [ingredientId, amount] of Object.entries(restorations)) {
    await supabase.rpc('restore_ingredient_stock', { p_ingredient_id: ingredientId, p_amount: amount });
  }
}
