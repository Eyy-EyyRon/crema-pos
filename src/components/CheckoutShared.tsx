import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircleIcon } from '../icons';
import { peso, peso0 } from '../format';
import { tapMedium, warning } from '../lib/haptics';
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
          label={d.p ? `${d.n} ${d.p * 100}%` : 'No Discount'}
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
  onViewGcashQr,
  gap = 10,
}: {
  payMethod: PayMethod;
  onSelectCash: () => void;
  onSelectGcash: () => void;
  onViewGcashQr?: () => void;
  gap?: number;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', gap }}>
        <PayButton kind="cash" active={payMethod === 'cash'} onPress={onSelectCash} />
        <PayButton kind="gcash" active={payMethod === 'gcash'} onPress={onSelectGcash} />
      </View>
      {payMethod === 'gcash' && onViewGcashQr && (
        <Pressable onPress={onViewGcashQr} style={styles.viewQrLink}>
          <Text style={styles.viewQrLinkText}>View QR again</Text>
        </Pressable>
      )}
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
  service,
  tax,
  total,
  taxRatePct,
  isTaxInclusive,
  serviceChargePct,
  dense = false,
}: {
  subtotal: number;
  discount: number;
  discountPct: number;
  service: number;
  tax: number;
  total: number;
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
            Discount ({discountPct * 100}% off)
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
      <View style={[styles.totalRow, dense && { paddingTop: 12, marginTop: 3 }]}>
        <Text style={[styles.totalLabel, dense && { fontSize: 14 }]}>Total Due</Text>
        <Text style={[styles.totalValue, dense && { fontSize: 26 }]}>{peso(total)}</Text>
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
});
