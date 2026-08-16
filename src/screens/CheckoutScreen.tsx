import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartRow } from '../components/CartRow';
import {
  AppendOrderBanner,
  CashTenderBlock,
  CheckoutErrorBanner,
  CustomerLoyaltyBlock,
  CustomerNameField,
  DiscountRow,
  GcashConfirmBlock,
  GiftCardPaymentBlock,
  OrderTypeRow,
  PaymentMethodRow,
  ProcessPaymentButton,
  ReceiptEmailField,
  SectionLabel,
  SplitPaymentBlock,
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
  onSelectDineIn?: () => void;
  onSelectTakeout?: () => void;
  customerName: string;
  onChangeCustomerName: (v: string) => void;
  customerNameRequired: boolean;
  discounts: Discount[];
  discountName: string;
  discountPct: number;
  discountLabel?: string;
  onSelectDiscount: (name: string) => void;
  allowDiscounts: boolean;
  payMethod: PayMethod;
  onSelectCash?: () => void;
  onSelectGcash?: () => void;
  onSelectGiftCard?: () => void;
  onViewGcashQr: () => void;
  giftCardCode: string;
  onChangeGiftCardCode: (v: string) => void;
  onCheckGiftCardBalance: () => void;
  giftCardChecking: boolean;
  giftCardBalance: number | null;
  giftCardError: string | null;
  onOpenGiftCardScanner: () => void;
  customerPhone: string;
  onChangeCustomerPhone: (v: string) => void;
  onLookupCustomer: () => void;
  customerLookupStatus: 'idle' | 'searching' | 'found' | 'not_found';
  customerLookupMode: 'phone' | 'card';
  onChangeCustomerLookupMode: (mode: 'phone' | 'card') => void;
  customerCardCode: string;
  onChangeCustomerCardCode: (v: string) => void;
  customerLookupMessage: string | null;
  onOpenQrScanner: () => void;
  foundCustomerName: string | null;
  foundCustomerPoints: number;
  newCustomerName: string;
  onChangeNewCustomerName: (v: string) => void;
  onCreateCustomer: () => void;
  customerCreating: boolean;
  onClearCustomer: () => void;
  loyaltyEnabled: boolean;
  allowLoyaltyRedemption: boolean;
  loyaltyPointValuePhp: number;
  redeemPoints: string;
  onChangeRedeemPoints: (v: string) => void;
  maxRedeemablePoints: number;
  pointsToEarnPreview: number;
  loyaltyRedemptionAmount: number;
  amountDue: number;
  receiptEmail: string;
  onChangeReceiptEmail: (v: string) => void;
  gcashReference: string;
  onChangeGcashReference: (v: string) => void;
  gcashConfirmed: boolean;
  onToggleGcashConfirmed: () => void;
  gcashProofUri: string | null;
  gcashProofUploading: boolean;
  gcashProofFailed: boolean;
  onOpenGcashProofCamera: () => void;
  splitEnabled: boolean;
  onToggleSplit?: () => void;
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
    customerNameRequired,
    discounts,
    discountName,
    discountPct,
    discountLabel,
    onSelectDiscount,
    allowDiscounts,
    payMethod,
    onSelectCash,
    onSelectGcash,
    onSelectGiftCard,
    onViewGcashQr,
    giftCardCode,
    onChangeGiftCardCode,
    onCheckGiftCardBalance,
    giftCardChecking,
    giftCardBalance,
    giftCardError,
    onOpenGiftCardScanner,
    customerPhone,
    onChangeCustomerPhone,
    onLookupCustomer,
    customerLookupStatus,
    customerLookupMode,
    onChangeCustomerLookupMode,
    customerCardCode,
    onChangeCustomerCardCode,
    customerLookupMessage,
    onOpenQrScanner,
    foundCustomerName,
    foundCustomerPoints,
    newCustomerName,
    onChangeNewCustomerName,
    onCreateCustomer,
    customerCreating,
    onClearCustomer,
    loyaltyEnabled,
    allowLoyaltyRedemption,
    loyaltyPointValuePhp,
    redeemPoints,
    onChangeRedeemPoints,
    maxRedeemablePoints,
    pointsToEarnPreview,
    loyaltyRedemptionAmount,
    amountDue,
    receiptEmail,
    onChangeReceiptEmail,
    gcashReference,
    onChangeGcashReference,
    gcashConfirmed,
    onToggleGcashConfirmed,
    gcashProofUri,
    gcashProofUploading,
    gcashProofFailed,
    onOpenGcashProofCamera,
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
            <CustomerNameField value={customerName} onChangeText={onChangeCustomerName} required={customerNameRequired} />

            <SectionLabel style={styles.sectionSpacing}>Customer</SectionLabel>
            <CustomerLoyaltyBlock
              phone={customerPhone}
              onChangePhone={onChangeCustomerPhone}
              onLookup={onLookupCustomer}
              lookupStatus={customerLookupStatus}
              mode={customerLookupMode}
              onChangeMode={onChangeCustomerLookupMode}
              cardCode={customerCardCode}
              onChangeCardCode={onChangeCustomerCardCode}
              lookupMessage={customerLookupMessage}
              onOpenScanner={onOpenQrScanner}
              foundName={foundCustomerName}
              foundPoints={foundCustomerPoints}
              newCustomerName={newCustomerName}
              onChangeNewCustomerName={onChangeNewCustomerName}
              onCreateCustomer={onCreateCustomer}
              creating={customerCreating}
              onClear={onClearCustomer}
              loyaltyEnabled={loyaltyEnabled}
              allowRedemption={allowLoyaltyRedemption}
              pointValuePhp={loyaltyPointValuePhp}
              redeemPoints={redeemPoints}
              onChangeRedeemPoints={onChangeRedeemPoints}
              maxRedeemablePoints={maxRedeemablePoints}
              pointsToEarnPreview={pointsToEarnPreview}
            />
          </>
        )}

        {allowDiscounts && (
          <>
            <SectionLabel style={styles.sectionSpacing}>Discount</SectionLabel>
            <DiscountRow discounts={discounts} activeName={discountName} onSelect={onSelectDiscount} />
          </>
        )}

        <SectionLabel style={styles.sectionSpacing}>Payment Method</SectionLabel>
        <PaymentMethodRow
          payMethod={payMethod}
          onSelectCash={onSelectCash}
          onSelectGcash={onSelectGcash}
          onSelectGiftCard={isAppend ? undefined : onSelectGiftCard}
          onViewGcashQr={onViewGcashQr}
          splitEnabled={isAppend ? undefined : splitEnabled}
          onToggleSplit={isAppend ? undefined : onToggleSplit}
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
                  proofUri={gcashProofUri}
                  proofUploading={gcashProofUploading}
                  proofFailed={gcashProofFailed}
                  onCapturePhoto={onOpenGcashProofCamera}
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
                  proofUri={gcashProofUri}
                  proofUploading={gcashProofUploading}
                  proofFailed={gcashProofFailed}
                  onCapturePhoto={onOpenGcashProofCamera}
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
                  amountDue={amountDue}
                  onOpenScanner={onOpenGiftCardScanner}
                />
              </>
            )}
          </>
        )}

        {!isAppend && (
          <>
            <SectionLabel style={styles.sectionSpacing}>Email Receipt</SectionLabel>
            <ReceiptEmailField value={receiptEmail} onChangeText={onChangeReceiptEmail} />
          </>
        )}

        <SectionLabel style={styles.sectionSpacing}>Summary</SectionLabel>
        <SummaryCard
          subtotal={subtotal} discount={discount} discountPct={discountPct} discountLabel={discountLabel}
          service={service} tax={tax} total={total} loyaltyRedemption={loyaltyRedemptionAmount} amountDue={amountDue}
          taxRatePct={taxRatePct} isTaxInclusive={isTaxInclusive} serviceChargePct={serviceChargePct}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
        {!!checkoutError && <CheckoutErrorBanner message={checkoutError} />}
        <ProcessPaymentButton
          totalStr={peso(isAppend ? total : amountDue)}
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
