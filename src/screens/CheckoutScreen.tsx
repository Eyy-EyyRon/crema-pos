import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartRow } from '../components/CartRow';
import {
  AppendOrderBanner,
  CashTenderBlock,
  CheckoutErrorBanner,
  CustomerNameField,
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
  customerName: string;
  onChangeCustomerName: (v: string) => void;
  discounts: Discount[];
  discountName: string;
  discountPct: number;
  onSelectDiscount: (name: string) => void;
  payMethod: PayMethod;
  onSelectCash: () => void;
  onSelectGcash: () => void;
  onViewGcashQr: () => void;
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
  appendTargetOrderNo: string | null;
  onCancelAppend: () => void;
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
    customerName,
    onChangeCustomerName,
    discounts,
    discountName,
    discountPct,
    onSelectDiscount,
    payMethod,
    onSelectCash,
    onSelectGcash,
    onViewGcashQr,
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
    appendTargetOrderNo,
    onCancelAppend,
  } = props;
  const insets = useSafeAreaInsets();
  const isAppend = !!appendTargetOrderNo;

  return (
    <View style={styles.screen}>
      <BackHeader title={isAppend ? 'Add to Order' : 'Your Order'} onBack={onBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel style={{ marginBottom: 10 }}>Items</SectionLabel>
        {cart.map((c) => (
          <CartRow key={c.cartId} item={c} onInc={() => onInc(c.cartId)} onDec={() => onDec(c.cartId)} onRemove={() => onRemove(c.cartId)} />
        ))}

        {isAppend ? (
          <View style={styles.sectionSpacing}>
            <AppendOrderBanner orderNo={appendTargetOrderNo!} onCancel={onCancelAppend} />
          </View>
        ) : (
          <>
            <SectionLabel style={styles.sectionSpacing}>Order Type</SectionLabel>
            <OrderTypeRow orderType={orderType} onSelectDineIn={onSelectDineIn} onSelectTakeout={onSelectTakeout} />

            <SectionLabel style={styles.sectionSpacing}>Name for Order</SectionLabel>
            <CustomerNameField value={customerName} onChangeText={onChangeCustomerName} />
          </>
        )}

        <SectionLabel style={styles.sectionSpacing}>Discount</SectionLabel>
        <DiscountRow discounts={discounts} activeName={discountName} onSelect={onSelectDiscount} />

        <SectionLabel style={styles.sectionSpacing}>Payment Method</SectionLabel>
        <PaymentMethodRow payMethod={payMethod} onSelectCash={onSelectCash} onSelectGcash={onSelectGcash} onViewGcashQr={onViewGcashQr} />

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
      <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
        {!!checkoutError && <CheckoutErrorBanner message={checkoutError} />}
        <ProcessPaymentButton
          totalStr={peso(total)}
          disabled={!canPay}
          busy={checkoutBusy}
          onPress={onPay}
          label={isAppend ? 'Add to Order' : 'Process Payment'}
        />
      </View>
      </KeyboardAvoidingView>
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
    backgroundColor: colors.screenBg,
  },
});
