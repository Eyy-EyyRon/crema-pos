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

export type PayMethod = 'cash' | 'gcash' | 'maya' | 'card' | 'split' | 'gift_card';
export type OrderType = 'dine-in' | 'takeout';

// ─────────────────────────────────────────────
// STOCK HELPERS (ported from cafe-web-dashboard/lib/posOrder.ts, itself
// ported from CafePOS app/pos/index.tsx)
// ─────────────────────────────────────────────

// Turns an order_item's modifiers_json + special_note into one display line for the
// queue/history/receipt — e.g. "Oat Milk, Extra Shot, Note: no sugar".
export function modsDisplayString(modifiersJson: string | null | undefined, specialNote: string | null | undefined): string | undefined {
  let modNames: string[] = [];
  if (modifiersJson) {
    try {
      const parsed = JSON.parse(modifiersJson);
      if (Array.isArray(parsed)) modNames = parsed.map((m: any) => m?.name).filter(Boolean);
    } catch {}
  }
  const parts = [...modNames];
  if (specialNote) parts.push(`Note: ${specialNote}`);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

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

// Multi-tax-rate variant — each cart line carries its own tax rate (a menu item's assigned
// tax_rate_id, or the store default when unset). The service charge itself is taxed at the
// store's DEFAULT rate in tax-exclusive mode, not any individual item's rate — a service charge
// is a whole-order line, not tied to one item, and there's no natural per-item rate to apply to
// it. This is a deliberate, documented choice, not a resolved product decision — if a café
// genuinely needs the service charge taxed differently, that needs an explicit answer from the
// owner, not a guess baked into this formula.
//
// When every line shares the same rate (the case for any store that hasn't touched this
// feature), this reduces algebraically to the exact same result as computeOrderTotals above:
// summing each line's proportional share of the discount and tax is equivalent to computing
// once over the whole discounted subtotal. Covered by the "uniform rate" test in
// posOrder.test.ts — this file's own single-rate computeOrderTotals is untouched by this
// addition, so nothing that already worked can regress.
export function computeOrderTotalsMultiRate(params: {
  items: { lineTotal: number; taxRatePct: number }[]; // lineTotal = qty × unit price incl. mods, pre-discount
  discountPct: number;
  orderType: OrderType;
  isTaxInclusive: boolean;
  serviceChargePct: number;
  defaultTaxRatePct: number;
}): OrderTotals {
  const { items, discountPct, orderType, isTaxInclusive, serviceChargePct, defaultTaxRatePct } = params;
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const discountAmount = subtotal * discountPct;
  const discountedSubtotal = subtotal - discountAmount;
  const scRate = serviceChargePct / 100;
  const serviceChargeAmount = orderType === 'dine-in' ? discountedSubtotal * scRate : 0;

  let taxAmount = 0;
  items.forEach((item) => {
    const share = subtotal > 0 ? item.lineTotal / subtotal : 0;
    const lineDiscounted = item.lineTotal - discountAmount * share;
    const rate = item.taxRatePct / 100;
    if (isTaxInclusive) {
      taxAmount += lineDiscounted - lineDiscounted / (1 + rate);
    } else {
      taxAmount += lineDiscounted * rate;
    }
  });
  if (!isTaxInclusive) {
    taxAmount += serviceChargeAmount * (defaultTaxRatePct / 100);
  }

  const total = isTaxInclusive
    ? discountedSubtotal + serviceChargeAmount
    : discountedSubtotal + serviceChargeAmount + taxAmount;

  return { subtotal, discountAmount, discountedSubtotal, serviceChargeAmount, taxAmount, total };
}

// ─────────────────────────────────────────────
// PROMOTIONS BEYOND FLAT % — 'fixed' and 'bogo' discounts
// ─────────────────────────────────────────────
// Converts whichever discount type is active into a peso amount, capped so it can never exceed
// the order. Callers then divide by subtotal to get an equivalent discountPct for
// computeOrderTotalsMultiRate above — that function only knows one discount shape (a pct of
// subtotal), so this keeps it untouched rather than teaching it a second discount model. For a
// 'percent' discount this returns exactly subtotal * percentPct, so every store that never
// touches this feature sees byte-identical behavior to before it shipped.
export type DiscountConfig = {
  type: 'percent' | 'fixed' | 'bogo';
  percentPct: number; // e.g. 0.2 for 20% off — meaningful only when type === 'percent'
  fixedAmount: number | null; // peso amount off — meaningful only when type === 'fixed'
};

export function computeDiscountAmount(
  discount: DiscountConfig | null,
  subtotal: number,
  cartUnitPrices: number[]
): number {
  if (!discount) return 0;
  if (discount.type === 'fixed') return Math.min(discount.fixedAmount ?? 0, subtotal);
  if (discount.type === 'bogo') {
    // Approximated as "the cheapest single unit in the cart is free," not a real per-item line
    // engine (see AGENTS.md roadmap note).
    const cheapest = cartUnitPrices.length > 0 ? Math.min(...cartUnitPrices) : 0;
    return Math.min(cheapest, subtotal);
  }
  return subtotal * (discount.percentPct ?? 0);
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
  discount_name?: string | null;
  discount_id?: string | null;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  service_charge_amount?: number;
  is_tax_inclusive?: boolean;
  rush_mode?: boolean;
  gcash_reference?: string | null;
  customer_id?: string | null;
  loyalty_points_earned?: number;
  loyalty_points_redeemed?: number;
  gift_card_code?: string | null;
  receipt_email?: string | null;
  receipt_phone?: string | null;
};

export type PosOrderItem = {
  menu_item_id: string;
  qty: number;
  unit_price: number;
  modifiers_json: string;
  special_note: string | null;
};

// An order paid with 2+ methods (e.g. part cash, part GCash) — orderData.payment_method must
// already be 'split' when this is passed. Component amounts must sum to orderData.total.
export type PaymentSplitComponent = { method: PayMethod; amount: number };

export async function submitPosOrder(
  orderData: PosOrderData,
  orderItems: PosOrderItem[],
  paymentSplit?: PaymentSplitComponent[]
): Promise<string> {
  const { data: order, error: orderErr } = await supabase.from('orders').insert(orderData).select('id').single();
  if (orderErr) throw orderErr;

  const itemsToInsert = orderItems.map((item) => ({ ...item, order_id: order.id }));
  const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
  if (itemsErr) throw itemsErr;

  // Analytics mirror row(s) (non-fatal if it fails) — Analytics' Payment Methods panel
  // (cafe-web-dashboard) reads from `sales`. No `sale_items` write here: that table's product_id
  // FK points at a `products` table that predates menu_items and has never had rows, so every
  // insert fails a foreign-key violation — product-level reporting is already covered by
  // order_items. A split order writes one `sales` row PER PAYMENT COMPONENT (tax/service charge
  // apportioned by each component's share of the total) so the Payment Methods panel's per-method
  // breakdown stays accurate instead of attributing the whole order to a single method.
  try {
    if (paymentSplit && paymentSplit.length > 0) {
      const total = orderData.total || 1;
      await supabase.from('order_payments').insert(
        paymentSplit.map((c) => ({ order_id: order.id, method: c.method, amount: c.amount }))
      );
      await supabase.from('sales').insert(
        paymentSplit.map((c) => {
          const ratio = c.amount / total;
          return {
            order_id: order.id,
            barista_id: orderData.barista_id,
            total_amount: c.amount,
            payment_method: c.method,
            order_type: orderData.order_type,
            tax_amount: (orderData.tax_amount ?? 0) * ratio,
            service_charge_amount: (orderData.service_charge_amount ?? 0) * ratio,
          };
        })
      );
    } else {
      await supabase.from('sales').insert({
        order_id: order.id,
        barista_id: orderData.barista_id,
        total_amount: orderData.total,
        payment_method: orderData.payment_method,
        order_type: orderData.order_type,
        tax_amount: orderData.tax_amount ?? 0,
        service_charge_amount: orderData.service_charge_amount ?? 0,
      });
    }
  } catch (e) {
    console.error('Failed to record sale for analytics:', e);
  }

  await deductStockForOrderItems(orderItems);

  return order.id;
}

// Deduct inventory based on recipe & trigger low-stock alerts (non-fatal if it fails). Shared
// by submitPosOrder above and addItemsToExistingOrder below, since adding items to an
// already-queued order needs the exact same deduction/alert behavior a brand-new order gets.
export async function deductStockForOrderItems(orderItems: PosOrderItem[]): Promise<void> {
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

      // Crossings accumulate here instead of emailing per-ingredient — a single order that
      // depletes five ingredients at once sends one digest, not five separate emails.
      const lowStockCrossings: { ingredientName: string; currentStock: number; parLevel: number }[] = [];
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
            lowStockCrossings.push({ ingredientName, currentStock: newStock, parLevel });
          }
        }
      }

      if (lowStockCrossings.length > 0) {
        const { data: settings } = await supabase
          .from('store_settings')
          .select('alert_email, alert_low_stock')
          .eq('id', 1)
          .single();

        if (settings && settings.alert_low_stock && settings.alert_email) {
          await supabase.functions.invoke('send-alert', {
            body: { email: settings.alert_email, ingredients: lowStockCrossings },
          });
        }
      }
    }
  } catch (e) {
    console.error('Failed to deduct inventory or send alert:', e);
  }
}

// Appends items to an order that's already been submitted (still sitting in the kitchen queue)
// instead of forcing a full void + re-ring for something like "customer adds one more cookie".
// The added items are treated as their own mini-checkout — own discount/tax/service-charge
// totals and payment method — then merged into the parent order's stored totals, so a barista
// can top up an in-flight ticket with a fresh payment for just the delta.
export async function addItemsToExistingOrder(
  orderId: string,
  orderItems: PosOrderItem[],
  incrementalPaymentMethod: PayMethod,
  incrementalAmounts: { subtotal: number; discount_amount: number; tax_amount: number; service_charge_amount: number; total: number },
  gcashReference?: string | null
): Promise<void> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('subtotal, discount_amount, tax_amount, service_charge_amount, total, total_amount, barista_id, order_type, gcash_reference')
    .eq('id', orderId)
    .single();
  if (orderErr) throw orderErr;

  const itemsToInsert = orderItems.map((item) => ({ ...item, order_id: orderId }));
  const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
  if (itemsErr) throw itemsErr;

  const newTotal = Number(order.total ?? order.total_amount ?? 0) + incrementalAmounts.total;
  // A top-up can itself be a second GCash payment on an order whose original payment was also
  // GCash — append (don't clobber) so both reference numbers survive for later cross-checking.
  const mergedGcashReference = gcashReference
    ? (order.gcash_reference ? `${order.gcash_reference}; ${gcashReference}` : gcashReference)
    : order.gcash_reference;
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      total: newTotal,
      total_amount: newTotal,
      subtotal: Number(order.subtotal ?? 0) + incrementalAmounts.subtotal,
      discount_amount: Number(order.discount_amount ?? 0) + incrementalAmounts.discount_amount,
      tax_amount: Number(order.tax_amount ?? 0) + incrementalAmounts.tax_amount,
      service_charge_amount: Number(order.service_charge_amount ?? 0) + incrementalAmounts.service_charge_amount,
      gcash_reference: mergedGcashReference,
    })
    .eq('id', orderId);
  if (updateErr) throw updateErr;

  // Analytics mirror row for just the incremental amount, same non-fatal treatment as
  // submitPosOrder — the top-up may have been paid a different way than the original order
  // (e.g. original was cash, the extra cookie was GCash), so it's recorded as its own sale.
  try {
    await supabase.from('sales').insert({
      order_id: orderId,
      barista_id: order.barista_id,
      total_amount: incrementalAmounts.total,
      payment_method: incrementalPaymentMethod,
      order_type: order.order_type,
      tax_amount: incrementalAmounts.tax_amount,
      service_charge_amount: incrementalAmounts.service_charge_amount,
    });
  } catch (e) {
    console.error('Failed to record sale for analytics:', e);
  }

  await deductStockForOrderItems(orderItems);
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
