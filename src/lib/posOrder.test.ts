import {
  computeOrderTotals,
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
