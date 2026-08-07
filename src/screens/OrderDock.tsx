import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BagIcon } from '../icons';
import { CartRow } from '../components/CartRow';
import {
  AppendOrderBanner,
  CashTenderBlock,
  CheckoutErrorBanner,
  CustomerNameField,
  DiscountRow,
  GcashConfirmBlock,
  GiftCardPaymentBlock,
  OrderTypeRow,
  PaymentMethodRow,
  ProcessPaymentButton,
  SectionLabel,
  SplitPaymentBlock,
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
  customerName: string;
  onChangeCustomerName: (v: string) => void;
  discounts: Discount[];
  discountName: string;
  discountPct: number;
  onSelectDiscount: (name: string) => void;
  payMethod: PayMethod;
  onSelectCash: () => void;
  onSelectGcash: () => void;
  onSelectGiftCard: () => void;
  onViewGcashQr: () => void;
  gcashReference: string;
  onChangeGcashReference: (v: string) => void;
  gcashConfirmed: boolean;
  onToggleGcashConfirmed: () => void;
  giftCardCode: string;
  onChangeGiftCardCode: (v: string) => void;
  onCheckGiftCardBalance: () => void;
  giftCardChecking: boolean;
  giftCardBalance: number | null;
  giftCardError: string | null;
  onOpenGiftCardScanner: () => void;
  splitEnabled: boolean;
  onToggleSplit: () => void;
  splitCashAmount: string;
  onChangeSplitCashAmount: (v: string) => void;
  splitGcashAmount: string;
  onChangeSplitGcashAmount: (v: string) => void;
  splitAmountMismatch: boolean;
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
    customerName,
    onChangeCustomerName,
    discounts,
    discountName,
    discountPct,
    onSelectDiscount,
    payMethod,
    onSelectCash,
    onSelectGcash,
    onSelectGiftCard,
    onViewGcashQr,
    gcashReference,
    onChangeGcashReference,
    gcashConfirmed,
    onToggleGcashConfirmed,
    giftCardCode,
    onChangeGiftCardCode,
    onCheckGiftCardBalance,
    giftCardChecking,
    giftCardBalance,
    giftCardError,
    onOpenGiftCardScanner,
    splitEnabled,
    onToggleSplit,
    splitCashAmount,
    onChangeSplitCashAmount,
    splitGcashAmount,
    onChangeSplitGcashAmount,
    splitAmountMismatch,
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

  const isEmpty = cartCount === 0;

  return (
    <View style={styles.dock}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isAppend ? 'Add to Order' : 'Current Order'}</Text>
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
            {cart.map((c) => (
              <CartRow key={c.cartId} item={c} shotSize={42} onInc={() => onInc(c.cartId)} onDec={() => onDec(c.cartId)} onRemove={() => onRemove(c.cartId)} />
            ))}

            {isAppend ? (
              <View style={styles.sectionSpacing}>
                <AppendOrderBanner orderNo={appendTargetOrderNo!} onCancel={onCancelAppend} />
              </View>
            ) : (
              <>
                <SectionLabel style={styles.sectionSpacing}>Order Type</SectionLabel>
                <OrderTypeRow orderType={orderType} onSelectDineIn={onSelectDineIn} onSelectTakeout={onSelectTakeout} gap={9} />

                <SectionLabel style={styles.sectionSpacing}>Name for Order</SectionLabel>
                <CustomerNameField value={customerName} onChangeText={onChangeCustomerName} />
              </>
            )}

            <SectionLabel style={styles.sectionSpacing}>Discount</SectionLabel>
            <DiscountRow discounts={discounts} activeName={discountName} onSelect={onSelectDiscount} />

            <SectionLabel style={styles.sectionSpacing}>Payment Method</SectionLabel>
            <PaymentMethodRow
              payMethod={payMethod}
              onSelectCash={onSelectCash}
              onSelectGcash={onSelectGcash}
              onSelectGiftCard={isAppend ? undefined : onSelectGiftCard}
              onViewGcashQr={onViewGcashQr}
              gap={9}
              splitEnabled={isAppend ? undefined : splitEnabled}
              onToggleSplit={isAppend ? undefined : onToggleSplit}
              compact
            />

            {splitEnabled && !isAppend ? (
              <>
                <SectionLabel style={styles.sectionSpacing}>Split Payment</SectionLabel>
                <SplitPaymentBlock
                  total={total}
                  cashAmount={splitCashAmount}
                  onChangeCashAmount={onChangeSplitCashAmount}
                  gcashAmount={splitGcashAmount}
                  onChangeGcashAmount={onChangeSplitGcashAmount}
                  mismatch={splitAmountMismatch}
                />
                {Number(splitGcashAmount) > 0 && (
                  <>
                    <SectionLabel style={styles.sectionSpacing}>Confirm GCash Payment</SectionLabel>
                    <GcashConfirmBlock
                      reference={gcashReference}
                      onChangeReference={onChangeGcashReference}
                      confirmed={gcashConfirmed}
                      onToggleConfirmed={onToggleGcashConfirmed}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {payMethod === 'gcash' && (
                  <>
                    <SectionLabel style={styles.sectionSpacing}>Confirm GCash Payment</SectionLabel>
                    <GcashConfirmBlock
                      reference={gcashReference}
                      onChangeReference={onChangeGcashReference}
                      confirmed={gcashConfirmed}
                      onToggleConfirmed={onToggleGcashConfirmed}
                    />
                  </>
                )}

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

                {payMethod === 'gift_card' && (
                  <>
                    <SectionLabel style={styles.sectionSpacing}>Gift Card</SectionLabel>
                    <GiftCardPaymentBlock
                      code={giftCardCode}
                      onChangeCode={onChangeGiftCardCode}
                      onCheckBalance={onCheckGiftCardBalance}
                      checking={giftCardChecking}
                      balance={giftCardBalance}
                      error={giftCardError}
                      amountDue={total}
                      onOpenScanner={onOpenGiftCardScanner}
                    />
                  </>
                )}
              </>
            )}

            <SectionLabel style={styles.sectionSpacing}>Summary</SectionLabel>
            <SummaryCard
              subtotal={subtotal} discount={discount} discountPct={discountPct} service={service} tax={tax} total={total}
              taxRatePct={taxRatePct} isTaxInclusive={isTaxInclusive} serviceChargePct={serviceChargePct}
              dense
            />
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
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
