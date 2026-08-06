import {
  computeDiscountAmount,
  computeOrderTotals,
  computeOrderTotalsMultiRate,
  getIngredientReservations,
  getMaxAddableQty,
  isOutOfStock,
  modsDisplayString,
  RecipeRow,
} from './posOrder';

describe('computeOrderTotals', () => {
  it('applies discount, service charge, and inclusive tax for a dine-in order', () => {
    const t = computeOrderTotals({
      subtotal: 1000,
      discountPct: 0.1,
      orderType: 'dine-in',
      taxRatePct: 12,
      isTaxInclusive: true,
      serviceChargePct: 5,
    });
    expect(t.discountAmount).toBeCloseTo(100);
    expect(t.discountedSubtotal).toBeCloseTo(900);
    expect(t.serviceChargeAmount).toBeCloseTo(45);
    expect(t.taxAmount).toBeCloseTo(900 - 900 / 1.12);
    expect(t.total).toBeCloseTo(945);
  });

  it('skips service charge for takeout and computes exclusive tax on top of the total', () => {
    const t = computeOrderTotals({
      subtotal: 500,
      discountPct: 0,
      orderType: 'takeout',
      taxRatePct: 12,
      isTaxInclusive: false,
      serviceChargePct: 5,
    });
    expect(t.serviceChargeAmount).toBe(0);
    expect(t.taxAmount).toBeCloseTo(60);
    expect(t.total).toBeCloseTo(560);
  });

  it('never charges service on takeout even if the caller passes a nonzero rate', () => {
    const t = computeOrderTotals({
      subtotal: 200,
      discountPct: 0,
      orderType: 'takeout',
      taxRatePct: 0,
      isTaxInclusive: true,
      serviceChargePct: 20,
    });
    expect(t.serviceChargeAmount).toBe(0);
    expect(t.total).toBe(200);
  });
});

describe('computeOrderTotalsMultiRate', () => {
  it('matches computeOrderTotals exactly when every line shares the same rate (inclusive, dine-in)', () => {
    const single = computeOrderTotals({
      subtotal: 1000, discountPct: 0.1, orderType: 'dine-in', taxRatePct: 12, isTaxInclusive: true, serviceChargePct: 5,
    });
    const multi = computeOrderTotalsMultiRate({
      items: [{ lineTotal: 600, taxRatePct: 12 }, { lineTotal: 400, taxRatePct: 12 }],
      discountPct: 0.1, orderType: 'dine-in', isTaxInclusive: true, serviceChargePct: 5, defaultTaxRatePct: 12,
    });
    expect(multi.discountAmount).toBeCloseTo(single.discountAmount);
    expect(multi.discountedSubtotal).toBeCloseTo(single.discountedSubtotal);
    expect(multi.serviceChargeAmount).toBeCloseTo(single.serviceChargeAmount);
    expect(multi.taxAmount).toBeCloseTo(single.taxAmount);
    expect(multi.total).toBeCloseTo(single.total);
  });

  it('matches computeOrderTotals exactly when every line shares the same rate (exclusive, takeout)', () => {
    const single = computeOrderTotals({
      subtotal: 500, discountPct: 0, orderType: 'takeout', taxRatePct: 12, isTaxInclusive: false, serviceChargePct: 5,
    });
    const multi = computeOrderTotalsMultiRate({
      items: [{ lineTotal: 500, taxRatePct: 12 }],
      discountPct: 0, orderType: 'takeout', isTaxInclusive: false, serviceChargePct: 5, defaultTaxRatePct: 12,
    });
    expect(multi.serviceChargeAmount).toBe(single.serviceChargeAmount);
    expect(multi.taxAmount).toBeCloseTo(single.taxAmount);
    expect(multi.total).toBeCloseTo(single.total);
  });

  it('taxes each line at its own rate and the service charge at the store default rate (exclusive)', () => {
    // ₱600 at 12% + ₱400 tax-exempt (0%), 5% service charge on the ₱1000 subtotal (dine-in),
    // service charge itself taxed at the 12% default rate since it isn't tied to one item.
    const t = computeOrderTotalsMultiRate({
      items: [{ lineTotal: 600, taxRatePct: 12 }, { lineTotal: 400, taxRatePct: 0 }],
      discountPct: 0, orderType: 'dine-in', isTaxInclusive: false, serviceChargePct: 5, defaultTaxRatePct: 12,
    });
    expect(t.serviceChargeAmount).toBeCloseTo(50);
    expect(t.taxAmount).toBeCloseTo(72 + 6); // 600*12% item tax + 50*12% service-charge tax
    expect(t.total).toBeCloseTo(1128);
  });

  it('taxes each line at its own rate with no addition for the inclusive service charge', () => {
    const t = computeOrderTotalsMultiRate({
      items: [{ lineTotal: 600, taxRatePct: 12 }, { lineTotal: 400, taxRatePct: 0 }],
      discountPct: 0, orderType: 'dine-in', isTaxInclusive: true, serviceChargePct: 5, defaultTaxRatePct: 12,
    });
    expect(t.serviceChargeAmount).toBeCloseTo(50);
    expect(t.taxAmount).toBeCloseTo(600 - 600 / 1.12);
    expect(t.total).toBeCloseTo(1050);
  });

  it('apportions a whole-order discount across lines proportionally before taxing each one', () => {
    const t = computeOrderTotalsMultiRate({
      items: [{ lineTotal: 600, taxRatePct: 12 }, { lineTotal: 400, taxRatePct: 0 }],
      discountPct: 0.1, orderType: 'takeout', isTaxInclusive: false, serviceChargePct: 5, defaultTaxRatePct: 12,
    });
    // 10% off each line: 540 @ 12% => 64.8 tax; 360 @ 0% => 0 tax. No service charge on takeout.
    expect(t.discountAmount).toBeCloseTo(100);
    expect(t.serviceChargeAmount).toBe(0);
    expect(t.taxAmount).toBeCloseTo(64.8);
    expect(t.total).toBeCloseTo(900 + 64.8);
  });
});

describe('computeDiscountAmount', () => {
  it('returns null-safe zero when no discount is selected', () => {
    expect(computeDiscountAmount(null, 1000, [100, 200])).toBe(0);
  });

  it('matches subtotal * percentPct for a percent discount — identical to the pre-feature formula', () => {
    const amt = computeDiscountAmount({ type: 'percent', percentPct: 0.2, fixedAmount: null }, 1000, [100, 200]);
    expect(amt).toBeCloseTo(200);
  });

  it('deducts the flat fixed amount, uncapped when it fits under the subtotal', () => {
    const amt = computeDiscountAmount({ type: 'fixed', percentPct: 0, fixedAmount: 150 }, 1000, [100, 200]);
    expect(amt).toBeCloseTo(150);
  });

  it('caps a fixed discount at the subtotal so it can never make the order negative', () => {
    const amt = computeDiscountAmount({ type: 'fixed', percentPct: 0, fixedAmount: 999 }, 500, [100, 200]);
    expect(amt).toBeCloseTo(500);
  });

  it('deducts the cheapest cart unit price for a bogo discount', () => {
    const amt = computeDiscountAmount({ type: 'bogo', percentPct: 0, fixedAmount: null }, 1000, [150, 80, 300]);
    expect(amt).toBeCloseTo(80);
  });

  it('caps a bogo discount at the subtotal for a single cheap item cart', () => {
    const amt = computeDiscountAmount({ type: 'bogo', percentPct: 0, fixedAmount: null }, 50, [80]);
    expect(amt).toBeCloseTo(50);
  });

  it('treats an empty cart as a zero-value bogo discount', () => {
    const amt = computeDiscountAmount({ type: 'bogo', percentPct: 0, fixedAmount: null }, 0, []);
    expect(amt).toBe(0);
  });
});

describe('isOutOfStock', () => {
  const recipesByItem: Record<string, RecipeRow[]> = {
    latte: [{ menu_item_id: 'latte', ingredient_id: 'milk', recipe_qty: 2 }],
  };

  it('is never out of stock in rush mode, regardless of ingredient levels', () => {
    expect(isOutOfStock('latte', recipesByItem, { milk: 0 }, true)).toBe(false);
  });

  it('treats items with no recipe rows as always in stock (untracked)', () => {
    expect(isOutOfStock('mystery-item', recipesByItem, { milk: 0 }, false)).toBe(false);
  });

  it('is out of stock when an ingredient is below the recipe requirement', () => {
    expect(isOutOfStock('latte', recipesByItem, { milk: 1 }, false)).toBe(true);
  });

  it('is in stock when every ingredient meets the recipe requirement', () => {
    expect(isOutOfStock('latte', recipesByItem, { milk: 2 }, false)).toBe(false);
  });
});

describe('getIngredientReservations', () => {
  const recipesByItem: Record<string, RecipeRow[]> = {
    latte: [{ menu_item_id: 'latte', ingredient_id: 'milk', recipe_qty: 2 }],
    cappuccino: [{ menu_item_id: 'cappuccino', ingredient_id: 'milk', recipe_qty: 1.5 }],
  };

  it('sums reservations across cart lines that share an ingredient', () => {
    const reserved = getIngredientReservations(
      [{ menuId: 'latte', qty: 2 }, { menuId: 'cappuccino', qty: 1 }],
      recipesByItem
    );
    expect(reserved.milk).toBeCloseTo(2 * 2 + 1.5 * 1);
  });

  it('ignores cart lines for items with no tracked recipe', () => {
    const reserved = getIngredientReservations([{ menuId: 'untracked', qty: 5 }], recipesByItem);
    expect(reserved.milk).toBeUndefined();
  });
});

describe('getMaxAddableQty', () => {
  const recipesByItem: Record<string, RecipeRow[]> = {
    latte: [{ menu_item_id: 'latte', ingredient_id: 'milk', recipe_qty: 2 }],
  };

  it('returns Infinity in rush mode', () => {
    expect(getMaxAddableQty('latte', [], recipesByItem, { milk: 0 }, true)).toBe(Infinity);
  });

  it('returns Infinity for items with no recipe rows', () => {
    expect(getMaxAddableQty('untracked', [], recipesByItem, {}, false)).toBe(Infinity);
  });

  it('floors to the ingredient-limited quantity, net of what the cart already reserves', () => {
    // 10 units of milk, recipe needs 2 per latte, 2 already reserved by another cart line
    // for the same item => 8 remaining / 2 per unit = 4 more addable.
    expect(getMaxAddableQty('latte', [{ menuId: 'latte', qty: 1 }], recipesByItem, { milk: 10 }, false)).toBe(4);
  });

  it('never returns a negative max when reservations already exceed stock', () => {
    expect(getMaxAddableQty('latte', [{ menuId: 'latte', qty: 100 }], recipesByItem, { milk: 10 }, false)).toBe(0);
  });
});

describe('modsDisplayString', () => {
  it('returns undefined when there are no modifiers and no note', () => {
    expect(modsDisplayString(null, null)).toBeUndefined();
    expect(modsDisplayString(undefined, undefined)).toBeUndefined();
  });

  it('joins modifier names and appends the special note', () => {
    const json = JSON.stringify([{ name: 'Oat Milk', price: 20 }, { name: 'Extra Shot', price: 30 }]);
    expect(modsDisplayString(json, 'No sugar')).toBe('Oat Milk, Extra Shot, Note: No sugar');
  });

  it('falls back gracefully on malformed JSON instead of throwing', () => {
    expect(() => modsDisplayString('{not valid json', null)).not.toThrow();
    expect(modsDisplayString('{not valid json', 'Extra hot')).toBe('Note: Extra hot');
  });
});
