import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircleIcon } from '../icons';
import { peso, peso0 } from '../format';
import { tapLight, tapMedium, warning } from '../lib/haptics';
import { colors, fonts } from '../theme';
import { Discount, OrderType, PayMethod } from '../types';
import { Chip } from './Chip';
import { PayButton } from './PayButton';
import { TypeButton } from './TypeButton';

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

// Shown instead of the Order Type / Name for Order sections when the current cart is topping
// up an already-queued order rather than starting a new one — those two fields describe the
// parent ticket, not this incremental add-on, so re-showing them here would just be confusing.
export function AppendOrderBanner({ orderNo, onCancel }: { orderNo: string; onCancel: () => void }) {
  return (
    <View style={styles.appendBanner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.appendBannerTitle}>Adding to Order {orderNo}</Text>
        <Text style={styles.appendBannerSub}>These items go on the existing ticket and are paid for separately.</Text>
      </View>
      <Pressable onPress={() => { tapMedium(); onCancel(); }} style={styles.appendBannerCancel}>
        <Text style={styles.appendBannerCancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

export function OrderTypeRow({
  orderType,
  onSelectDineIn,
  onSelectTakeout,
  gap = 10,
}: {
  orderType: OrderType;
  onSelectDineIn: () => void;
  onSelectTakeout: () => void;
  gap?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      <TypeButton kind="dine-in" active={orderType === 'dine-in'} onPress={onSelectDineIn} />
      <TypeButton kind="takeout" active={orderType === 'takeout'} onPress={onSelectTakeout} />
    </View>
  );
}

export function CustomerNameField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.nameInputRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Name for the order (optional)"
        placeholderTextColor={colors.textMuted}
        style={styles.nameInput}
        maxLength={60}
      />
    </View>
  );
}

function discountChipLabel(d: Discount): string {
  if (d.n === 'None') return 'No Discount';
  if (d.type === 'fixed') return `${d.n} −${peso0(d.fixedAmount ?? 0)}`;
  if (d.type === 'bogo') return `${d.n} (BOGO)`;
  return `${d.n} ${d.p * 100}%`;
}

export function DiscountRow({
  discounts,
  activeName,
  onSelect,
}: {
  discounts: Discount[];
  activeName: string;
  onSelect: (name: string) => void;
}) {
  return (
    <View style={styles.discountRow}>
      {discounts.map((d) => (
        <Chip
          key={d.n}
          label={discountChipLabel(d)}
          active={activeName === d.n}
          onPress={() => onSelect(d.n)}
        />
      ))}
    </View>
  );
}

export function PaymentMethodRow({
  payMethod,
  onSelectCash,
  onSelectGcash,
  onSelectGiftCard,
  onViewGcashQr,
  gap = 10,
  splitEnabled,
  onToggleSplit,
  compact,
}: {
  payMethod: PayMethod;
  onSelectCash: () => void;
  onSelectGcash: () => void;
  onSelectGiftCard?: () => void;
  onViewGcashQr?: () => void;
  gap?: number;
  splitEnabled?: boolean;
  onToggleSplit?: () => void;
  /** Tighter button sizing for a narrow 3-up row (see PayButton's own compact prop). */
  compact?: boolean;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', gap, opacity: splitEnabled ? 0.4 : 1 }}>
        <PayButton kind="cash" active={payMethod === 'cash' && !splitEnabled} onPress={onSelectCash} compact={compact} />
        <PayButton kind="gcash" active={payMethod === 'gcash' && !splitEnabled} onPress={onSelectGcash} compact={compact} />
        {onSelectGiftCard && (
          <PayButton kind="gift_card" active={payMethod === 'gift_card' && !splitEnabled} onPress={onSelectGiftCard} compact={compact} />
        )}
      </View>
      {payMethod === 'gcash' && !splitEnabled && onViewGcashQr && (
        <Pressable onPress={onViewGcashQr} style={styles.viewQrLink}>
          <Text style={styles.viewQrLinkText}>View QR again</Text>
        </Pressable>
      )}
      {onToggleSplit && (
        <Pressable onPress={onToggleSplit} style={styles.splitToggleLink}>
          <Text style={styles.splitToggleLinkText}>{splitEnabled ? '✕ Cancel split payment' : 'Split between Cash + GCash'}</Text>
        </Pressable>
      )}
    </View>
  );
}

// Two-amount breakdown for an order paid part-cash, part-GCash. Shown instead of the normal
// single-method Cash Tendered / GCash Confirm blocks when splitEnabled — the two amounts here
// ARE the tender, so there's no separate "amount received" step layered on top.
export function SplitPaymentBlock({
  total,
  cashAmount,
  onChangeCashAmount,
  gcashAmount,
  onChangeGcashAmount,
  mismatch,
}: {
  total: number;
  cashAmount: string;
  onChangeCashAmount: (v: string) => void;
  gcashAmount: string;
  onChangeGcashAmount: (v: string) => void;
  mismatch: boolean;
}) {
  const remaining = total - (Number(cashAmount) || 0) - (Number(gcashAmount) || 0);
  return (
    <View>
      <Text style={styles.splitAmountLabel}>Cash Amount</Text>
      <View style={styles.tenderInputRow}>
        <Text style={styles.pesoSign}>₱</Text>
        <TextInput
          value={cashAmount}
          onChangeText={(v) => onChangeCashAmount(v.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.tenderInput}
        />
      </View>
      <Text style={[styles.splitAmountLabel, { marginTop: 12 }]}>GCash Amount</Text>
      <View style={styles.tenderInputRow}>
        <Text style={styles.pesoSign}>₱</Text>
        <TextInput
          value={gcashAmount}
          onChangeText={(v) => onChangeGcashAmount(v.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.tenderInput}
        />
      </View>
      {mismatch && (
        <Text style={styles.splitMismatchText}>
          {remaining > 0 ? `${peso(remaining)} remaining` : `${peso(Math.abs(remaining))} over the total`}
        </Text>
      )}
    </View>
  );
}

// GCash has no merchant API to verify a payment against, so the barista must attest the
// customer's payment succeeded — that checkbox is the record a real GCash payment happened
// here. The reference/transaction number is optional supplementary detail on top of that,
// not a second requirement.
export function GcashConfirmBlock({
  reference,
  onChangeReference,
  confirmed,
  onToggleConfirmed,
}: {
  reference: string;
  onChangeReference: (v: string) => void;
  confirmed: boolean;
  onToggleConfirmed: () => void;
}) {
  return (
    <View>
      <Pressable
        onPress={() => { tapMedium(); onToggleConfirmed(); }}
        style={styles.gcashConfirmRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed }}
        accessibilityLabel="Confirm the customer's GCash payment went through"
      >
        <View style={[styles.gcashCheckbox, confirmed && styles.gcashCheckboxChecked]}>
          {confirmed && <Text style={styles.gcashCheckboxMark}>✓</Text>}
        </View>
        <Text style={styles.gcashConfirmText}>I confirm the customer's GCash payment went through</Text>
      </Pressable>
      <View style={styles.gcashRefInputRow}>
        <TextInput
          value={reference}
          onChangeText={onChangeReference}
          placeholder="GCash Reference / Transaction No. (optional)"
          placeholderTextColor={colors.textMuted}
          style={styles.gcashRefInput}
          autoCapitalize="characters"
        />
      </View>
    </View>
  );
}

export function CashTenderBlock({
  tendered,
  onChangeTendered,
  quickCash,
  onQuickCash,
  tenderNum,
  change,
  shortfall,
}: {
  tendered: string;
  onChangeTendered: (v: string) => void;
  quickCash: number[];
  onQuickCash: (v: number) => void;
  tenderNum: number | null;
  change: number | null;
  shortfall: boolean;
}) {
  return (
    <>
      <View style={styles.tenderInputRow}>
        <Text style={styles.pesoSign}>₱</Text>
        <TextInput
          value={tendered}
          onChangeText={(v) => onChangeTendered(v.replace(/[^0-9.]/g, ''))}
          placeholder="Amount received"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.tenderInput}
        />
      </View>
      <View style={styles.quickCashRow}>
        {quickCash.map((v) => (
          <Pressable key={v} onPress={() => onQuickCash(v)} style={styles.quickCashBtn}>
            <Text style={styles.quickCashText}>{peso0(v)}</Text>
          </Pressable>
        ))}
      </View>
      {tenderNum !== null && change !== null && (
        <Text style={[styles.tenderMsg, { color: shortfall ? colors.danger : colors.success }]}>
          {shortfall ? `Short by ${peso(Math.abs(change))}` : `Change due: ${peso(change)}`}
        </Text>
      )}
    </>
  );
}

export function SummaryCard({
  subtotal,
  discount,
  discountPct,
  discountLabel,
  service,
  tax,
  total,
  loyaltyRedemption = 0,
  amountDue,
  taxRatePct,
  isTaxInclusive,
  serviceChargePct,
  dense = false,
}: {
  subtotal: number;
  discount: number;
  discountPct: number;
  discountLabel?: string;
  service: number;
  tax: number;
  total: number;
  loyaltyRedemption?: number;
  amountDue?: number;
  taxRatePct: number;
  isTaxInclusive: boolean;
  serviceChargePct: number;
  dense?: boolean;
}) {
  const fs = dense ? 13 : 13.5;
  return (
    <View style={[styles.summaryCard, dense && { padding: 15, borderRadius: 14 }]}>
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { fontSize: fs }]}>Subtotal</Text>
        <Text style={[styles.summaryValue, { fontSize: fs }]}>{peso(subtotal)}</Text>
      </View>
      {discount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { fontSize: fs, color: colors.danger }]}>
            {discountLabel ?? `Discount (${discountPct * 100}% off)`}
          </Text>
          <Text style={[styles.summaryValue, { fontSize: fs, color: colors.danger }]}>− {peso(discount)}</Text>
        </View>
      )}
      {service > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { fontSize: fs }]}>Service Charge ({serviceChargePct}%)</Text>
          <Text style={[styles.summaryValue, { fontSize: fs }]}>{peso(service)}</Text>
        </View>
      )}
      {tax > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { fontSize: fs }]}>
            VAT ({taxRatePct}%{isTaxInclusive ? ', incl.' : ''})
          </Text>
          <Text style={[styles.summaryValue, { fontSize: fs }]}>{peso(tax)}</Text>
        </View>
      )}
      {loyaltyRedemption > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { fontSize: fs, color: colors.danger }]}>Loyalty Points Redeemed</Text>
          <Text style={[styles.summaryValue, { fontSize: fs, color: colors.danger }]}>− {peso(loyaltyRedemption)}</Text>
        </View>
      )}
      <View style={[styles.totalRow, dense && { paddingTop: 12, marginTop: 3 }]}>
        <Text style={[styles.totalLabel, dense && { fontSize: 14 }]}>Total Due</Text>
        <Text style={[styles.totalValue, dense && { fontSize: 26 }]}>{peso(amountDue ?? total)}</Text>
      </View>
    </View>
  );
}

export function ProcessPaymentButton({
  totalStr,
  disabled,
  busy,
  onPress,
  label = 'Process Payment',
}: {
  totalStr: string;
  disabled: boolean;
  busy?: boolean;
  onPress: () => void;
  label?: string;
}) {
  const blocked = disabled || !!busy;
  return (
    <Pressable
      onPress={blocked ? () => warning() : () => { tapMedium(); onPress(); }}
      style={[styles.payBtn, { opacity: blocked ? 0.4 : 1 }]}
    >
      {busy ? (
        <ActivityIndicator color={colors.screenBg} />
      ) : (
        <>
          <Text style={styles.payBtnLabel}>{label}</Text>
          <View style={styles.payBtnAmountWrap}>
            <Text style={styles.payBtnAmount}>{totalStr}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

// Phone-number lookup + inline creation for the customer database, plus (when the store has
// loyalty enabled and a customer is found) a points-to-redeem field. Redeeming loyalty points is
// mutually exclusive with a % discount for v1 — enforced by the caller resetting the other one,
// not by this component.
export function CustomerLoyaltyBlock({
  phone,
  onChangePhone,
  onLookup,
  lookupStatus,
  foundName,
  foundPoints,
  newCustomerName,
  onChangeNewCustomerName,
  onCreateCustomer,
  creating,
  onClear,
  loyaltyEnabled,
  pointValuePhp,
  redeemPoints,
  onChangeRedeemPoints,
  maxRedeemablePoints,
  pointsToEarnPreview,
  mode,
  onChangeMode,
  cardCode,
  onChangeCardCode,
  lookupMessage,
  onOpenScanner,
}: {
  phone: string;
  onChangePhone: (v: string) => void;
  onLookup: () => void;
  lookupStatus: 'idle' | 'searching' | 'found' | 'not_found';
  foundName: string | null;
  foundPoints: number;
  newCustomerName: string;
  onChangeNewCustomerName: (v: string) => void;
  onCreateCustomer: () => void;
  creating: boolean;
  onClear: () => void;
  loyaltyEnabled: boolean;
  pointValuePhp: number;
  redeemPoints: string;
  onChangeRedeemPoints: (v: string) => void;
  maxRedeemablePoints: number;
  pointsToEarnPreview: number;
  mode: 'phone' | 'card';
  onChangeMode: (mode: 'phone' | 'card') => void;
  cardCode: string;
  onChangeCardCode: (v: string) => void;
  lookupMessage: string | null;
  onOpenScanner?: () => void;
}) {
  if (lookupStatus === 'found') {
    return (
      <View>
        <View style={styles.customerFoundRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerFoundName}>{foundName || phone}</Text>
            {loyaltyEnabled && <Text style={styles.customerFoundPoints}>{foundPoints} loyalty pts</Text>}
          </View>
          <Pressable onPress={() => { tapMedium(); onClear(); }} style={styles.customerClearBtn}>
            <Text style={styles.customerClearBtnText}>Change</Text>
          </Pressable>
        </View>
        {loyaltyEnabled && foundPoints > 0 && (
          <View style={{ marginTop: 9 }}>
            <View style={styles.tenderInputRow}>
              <TextInput
                value={redeemPoints}
                onChangeText={(v) => onChangeRedeemPoints(v.replace(/[^0-9]/g, ''))}
                placeholder="Points to redeem (0)"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={styles.tenderInput}
              />
              <Pressable onPress={() => { tapLight(); onChangeRedeemPoints(String(maxRedeemablePoints)); }} style={styles.quickCashBtn}>
                <Text style={styles.quickCashText}>Use Max ({maxRedeemablePoints})</Text>
              </Pressable>
            </View>
            {Number(redeemPoints) > 0 && (
              <Text style={styles.customerFoundPoints}>
                − {peso(Number(redeemPoints) * pointValuePhp)} off this order
              </Text>
            )}
          </View>
        )}
        {loyaltyEnabled && pointsToEarnPreview > 0 && (
          <Text style={[styles.customerFoundPoints, { marginTop: 6 }]}>Will earn {pointsToEarnPreview} pts on this order</Text>
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.lookupModeRow}>
        <Chip label="Phone" active={mode === 'phone'} onPress={() => onChangeMode('phone')} />
        <Chip label="Card Code" active={mode === 'card'} onPress={() => onChangeMode('card')} />
      </View>
      <View style={styles.tenderInputRow}>
        <TextInput
          value={mode === 'phone' ? phone : cardCode}
          onChangeText={mode === 'phone' ? onChangePhone : onChangeCardCode}
          placeholder={mode === 'phone' ? 'Customer phone (optional)' : 'Loyalty card code (e.g. LC-AB3F9K)'}
          placeholderTextColor={colors.textMuted}
          keyboardType={mode === 'phone' ? 'phone-pad' : 'default'}
          autoCapitalize={mode === 'card' ? 'characters' : 'none'}
          style={styles.tenderInput}
        />
        <Pressable onPress={() => { tapMedium(); onLookup(); }} style={styles.quickCashBtn}>
          {lookupStatus === 'searching' ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Text style={styles.quickCashText}>Find</Text>}
        </Pressable>
      </View>
      {mode === 'card' && !!onOpenScanner && (
        <Pressable onPress={() => { tapLight(); onOpenScanner(); }} style={styles.viewQrLink}>
          <Text style={styles.viewQrLinkText}>Scan QR code instead</Text>
        </Pressable>
      )}
      {lookupStatus === 'not_found' && mode === 'phone' && (
        <View style={{ marginTop: 9 }}>
          <Text style={styles.customerFoundPoints}>No customer found for this number.</Text>
          <View style={[styles.tenderInputRow, { marginTop: 8 }]}>
            <TextInput
              value={newCustomerName}
              onChangeText={onChangeNewCustomerName}
              placeholder="Name (for new customer)"
              placeholderTextColor={colors.textMuted}
              style={styles.tenderInput}
            />
            <Pressable onPress={() => { tapMedium(); onCreateCustomer(); }} style={styles.quickCashBtn}>
              {creating ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Text style={styles.quickCashText}>Save New</Text>}
            </Pressable>
          </View>
        </View>
      )}
      {lookupStatus === 'not_found' && mode === 'card' && (
        <Text style={[styles.customerFoundPoints, { marginTop: 9 }]}>{lookupMessage || 'No customer found for this card code.'}</Text>
      )}
    </View>
  );
}

// Gift cards are an exclusive payment method for v1 — the card must cover the whole order, no
// partial coverage + a second method (that needs the split-payment schema wired in for gift
// cards too, which isn't built yet).
export function GiftCardPaymentBlock({
  code,
  onChangeCode,
  onCheckBalance,
  checking,
  balance,
  error,
  amountDue,
  onOpenScanner,
}: {
  code: string;
  onChangeCode: (v: string) => void;
  onCheckBalance: () => void;
  checking: boolean;
  balance: number | null;
  error: string | null;
  amountDue: number;
  onOpenScanner?: () => void;
}) {
  const insufficient = balance !== null && balance < amountDue;
  return (
    <View>
      <View style={styles.tenderInputRow}>
        <TextInput
          value={code}
          onChangeText={(v) => onChangeCode(v.toUpperCase())}
          placeholder="Gift Card Code"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          style={styles.tenderInput}
        />
        <Pressable onPress={() => { tapMedium(); onCheckBalance(); }} style={styles.quickCashBtn}>
          {checking ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Text style={styles.quickCashText}>Check</Text>}
        </Pressable>
      </View>
      {!!onOpenScanner && (
        <Pressable onPress={() => { tapLight(); onOpenScanner(); }} style={styles.viewQrLink}>
          <Text style={styles.viewQrLinkText}>Scan gift card QR instead</Text>
        </Pressable>
      )}
      {balance !== null && (
        <Text style={[styles.tenderMsg, { color: insufficient ? colors.danger : colors.success }]}>
          {insufficient ? `Card balance ${peso(balance)} is short of ${peso(amountDue)}` : `Card balance: ${peso(balance)}`}
        </Text>
      )}
      {!!error && <Text style={[styles.tenderMsg, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
}

// Optional email capture so a receipt can be emailed instead of (or alongside) printed — shown
// as a small opt-in near the summary, not a required field.
export function ReceiptEmailField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.nameInputRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Email receipt to… (optional)"
        placeholderTextColor={colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.nameInput}
      />
    </View>
  );
}

export function CheckoutErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.checkoutErrorRow}>
      <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
      <Text style={styles.checkoutErrorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textLabel,
  },
  discountRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  lookupModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 9,
  },
  nameInputRow: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  nameInput: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    padding: 0,
  },
  appendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(184,147,90,0.1)',
    borderWidth: 1,
    borderColor: colors.borderGold20,
    borderRadius: 14,
    padding: 14,
  },
  appendBannerTitle: {
    fontSize: 13.5,
    fontFamily: fonts.sansExtraBold,
    color: colors.goldBrightText,
  },
  appendBannerSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  appendBannerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.chipBg,
  },
  appendBannerCancelText: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    color: colors.textSecondary,
  },
  viewQrLink: {
    alignSelf: 'center',
    marginTop: 10,
  },
  viewQrLinkText: {
    fontSize: 12.5,
    fontFamily: fonts.sansBold,
    color: colors.goldLight,
  },
  splitToggleLink: {
    alignSelf: 'center',
    marginTop: 10,
  },
  splitToggleLinkText: {
    fontSize: 12.5,
    fontFamily: fonts.sansBold,
    color: colors.textMuted,
  },
  splitAmountLabel: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textLabel,
    marginBottom: 8,
  },
  splitMismatchText: {
    fontSize: 12.5,
    fontFamily: fonts.sansBold,
    color: colors.danger,
    marginTop: 8,
  },
  gcashConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 9,
  },
  gcashCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderGold25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gcashCheckboxChecked: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  gcashCheckboxMark: {
    color: colors.screenBg,
    fontSize: 13,
    fontFamily: fonts.sansExtraBold,
  },
  gcashConfirmText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.textSecondary,
  },
  gcashRefInputRow: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  gcashRefInput: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    padding: 0,
  },
  tenderInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pesoSign: {
    fontSize: 16,
    fontFamily: fonts.sansExtraBold,
    color: colors.textMuted,
  },
  tenderInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.sansBold,
    padding: 0,
  },
  quickCashRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 9,
  },
  quickCashBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 10,
    paddingVertical: 8,
  },
  quickCashText: {
    fontSize: 12.5,
    fontFamily: fonts.sansBold,
    color: colors.textSecondary,
  },
  tenderMsg: {
    fontSize: 13,
    fontFamily: fonts.sansExtraBold,
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold12,
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 17,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  summaryLabel: {
    color: colors.textMuted,
  },
  summaryValue: {
    fontFamily: fonts.sansBold,
    color: colors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 13,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 27,
    fontFamily: fonts.serifBold,
    color: colors.goldLight,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: 'rgba(184,147,90,0.28)',
  },
  payBtnLabel: {
    fontSize: 15,
    fontFamily: fonts.sansExtraBold,
    color: colors.goldBrightText,
  },
  payBtnAmountWrap: {
    backgroundColor: 'rgba(184,147,90,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(184,147,90,0.3)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 13,
  },
  payBtnAmount: {
    fontSize: 15,
    fontFamily: fonts.sansExtraBold,
    color: colors.goldLight,
  },
  checkoutErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  checkoutErrorText: {
    fontSize: 12.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.danger,
    flex: 1,
  },
  customerFoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  customerFoundName: {
    fontSize: 13.5,
    fontFamily: fonts.sansBold,
    color: colors.textPrimary,
  },
  customerFoundPoints: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.goldLight,
    marginTop: 2,
  },
  customerClearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.chipBg,
  },
  customerClearBtnText: {
    fontSize: 11.5,
    fontFamily: fonts.sansBold,
    color: colors.textSecondary,
  },
});
