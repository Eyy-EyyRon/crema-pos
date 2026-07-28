import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BagIcon } from '../icons';
import { CartRow } from '../components/CartRow';
import {
  CashTenderBlock,
  DiscountRow,
  OrderTypeRow,
  PaymentMethodRow,
  ProcessPaymentButton,
  SectionLabel,
  SummaryCard,
} from '../components/CheckoutShared';
import { peso } from '../format';
import { colors, fonts } from '../theme';
import { CartItem, Discount, OrderType, PayMethod } from '../types';

interface OrderDockProps {
  cart: CartItem[];
  cartCount: number;
  onInc: (cartId: string) => void;
  onDec: (cartId: string) => void;
  onRemove: (cartId: string) => void;
  orderType: OrderType;
  onSelectDineIn: () => void;
  onSelectTakeout: () => void;
  discounts: Discount[];
  discountName: string;
  discountPct: number;
  onSelectDiscount: (name: string) => void;
  payMethod: PayMethod;
  onSelectCash: () => void;
  onSelectGcash: () => void;
  tendered: string;
  onChangeTendered: (v: string) => void;
  quickCash: number[];
  onQuickCash: (v: number) => void;
  tenderNum: number | null;
  change: number | null;
  shortfall: boolean;
  subtotal: number;
  discount: number;
  service: number;
  tax: number;
  total: number;
  canPay: boolean;
  onPay: () => void;
}

export function OrderDock(props: OrderDockProps) {
  const {
    cart,
    cartCount,
    onInc,
    onDec,
    onRemove,
    orderType,
    onSelectDineIn,
    onSelectTakeout,
    discounts,
    discountName,
    discountPct,
    onSelectDiscount,
    payMethod,
    onSelectCash,
    onSelectGcash,
    tendered,
    onChangeTendered,
    quickCash,
    onQuickCash,
    tenderNum,
    change,
    shortfall,
    subtotal,
    discount,
    service,
    tax,
    total,
    canPay,
    onPay,
  } = props;

  const isEmpty = cartCount === 0;

  return (
    <View style={styles.dock}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Current Order</Text>
        {!isEmpty && <Text style={styles.headerCount}>{cartCount + (cartCount === 1 ? ' item' : ' items')}</Text>}
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <BagIcon size={32} color={colors.gold} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No items yet</Text>
          <Text style={styles.emptySub}>Tap a product to start building{'\n'}this order.</Text>
        </View>
      ) : (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
            {cart.map((c) => (
              <CartRow key={c.cartId} item={c} shotSize={42} onInc={() => onInc(c.cartId)} onDec={() => onDec(c.cartId)} onRemove={() => onRemove(c.cartId)} />
            ))}

            <SectionLabel style={styles.sectionSpacing}>Order Type</SectionLabel>
            <OrderTypeRow orderType={orderType} onSelectDineIn={onSelectDineIn} onSelectTakeout={onSelectTakeout} gap={9} />

            <SectionLabel style={styles.sectionSpacing}>Discount</SectionLabel>
            <DiscountRow discounts={discounts} activeName={discountName} onSelect={onSelectDiscount} />

            <SectionLabel style={styles.sectionSpacing}>Payment Method</SectionLabel>
            <PaymentMethodRow payMethod={payMethod} onSelectCash={onSelectCash} onSelectGcash={onSelectGcash} gap={9} />

            {payMethod === 'cash' && (
              <>
                <SectionLabel style={styles.sectionSpacing}>Cash Tendered</SectionLabel>
                <CashTenderBlock
                  tendered={tendered}
                  onChangeTendered={onChangeTendered}
                  quickCash={quickCash}
                  onQuickCash={onQuickCash}
                  tenderNum={tenderNum}
                  change={change}
                  shortfall={shortfall}
                />
              </>
            )}

            <SectionLabel style={styles.sectionSpacing}>Summary</SectionLabel>
            <SummaryCard subtotal={subtotal} discount={discount} discountPct={discountPct} service={service} tax={tax} total={total} dense />
          </ScrollView>
          <View style={styles.footer}>
            <ProcessPaymentButton totalStr={peso(total)} disabled={!canPay} onPress={onPay} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    width: 384,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderGold12,
    backgroundColor: colors.dockBg,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184,147,90,0.1)',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
  },
  headerCount: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    color: colors.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(184,147,90,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(184,147,90,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  sectionSpacing: {
    marginTop: 16,
    marginBottom: 9,
  },
  footer: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(184,147,90,0.1)',
  },
});
