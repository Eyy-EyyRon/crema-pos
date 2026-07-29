import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CartRow } from '../components/CartRow';
import {
  CashTenderBlock,
  CheckoutErrorBanner,
  DiscountRow,
  OrderTypeRow,
  PaymentMethodRow,
  ProcessPaymentButton,
  SectionLabel,
  SummaryCard,
} from '../components/CheckoutShared';
import { BackHeader } from '../components/Header';
import { peso } from '../format';
import { colors } from '../theme';
import { CartItem, Discount, OrderType, PayMethod } from '../types';

interface CheckoutScreenProps {
  cart: CartItem[];
  onInc: (cartId: string) => void;
  onDec: (cartId: string) => void;
  onRemove: (cartId: string) => void;
  onBack: () => void;
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
  taxRatePct: number;
  isTaxInclusive: boolean;
  serviceChargePct: number;
  canPay: boolean;
  onPay: () => void;
  checkoutBusy: boolean;
  checkoutError: string | null;
}

export function CheckoutScreen(props: CheckoutScreenProps) {
  const {
    cart,
    onInc,
    onDec,
    onRemove,
    onBack,
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
    taxRatePct,
    isTaxInclusive,
    serviceChargePct,
    canPay,
    onPay,
    checkoutBusy,
    checkoutError,
  } = props;

  return (
    <View style={styles.screen}>
      <BackHeader title="Your Order" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel style={{ marginBottom: 10 }}>Items</SectionLabel>
        {cart.map((c) => (
          <CartRow key={c.cartId} item={c} onInc={() => onInc(c.cartId)} onDec={() => onDec(c.cartId)} onRemove={() => onRemove(c.cartId)} />
        ))}

        <SectionLabel style={styles.sectionSpacing}>Order Type</SectionLabel>
        <OrderTypeRow orderType={orderType} onSelectDineIn={onSelectDineIn} onSelectTakeout={onSelectTakeout} />

        <SectionLabel style={styles.sectionSpacing}>Discount</SectionLabel>
        <DiscountRow discounts={discounts} activeName={discountName} onSelect={onSelectDiscount} />

        <SectionLabel style={styles.sectionSpacing}>Payment Method</SectionLabel>
        <PaymentMethodRow payMethod={payMethod} onSelectCash={onSelectCash} onSelectGcash={onSelectGcash} />

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
        <SummaryCard
          subtotal={subtotal} discount={discount} discountPct={discountPct} service={service} tax={tax} total={total}
          taxRatePct={taxRatePct} isTaxInclusive={isTaxInclusive} serviceChargePct={serviceChargePct}
        />
      </ScrollView>
      <View style={styles.footer}>
        {!!checkoutError && <CheckoutErrorBanner message={checkoutError} />}
        <ProcessPaymentButton totalStr={peso(total)} disabled={!canPay} busy={checkoutBusy} onPress={onPay} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  content: {
    padding: 16,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  sectionSpacing: {
    marginTop: 20,
    marginBottom: 10,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 20,
    backgroundColor: colors.screenBg,
  },
});
