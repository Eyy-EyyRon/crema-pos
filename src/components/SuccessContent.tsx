import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckIcon } from '../icons';
import { notify } from '../lib/crossAlert';
import { tapLight, tapMedium } from '../lib/haptics';
import { printReceipt, ReceiptStoreInfo } from '../lib/receipt';
import { colors, fonts } from '../theme';
import { SuccessInfo } from '../types';

export function SuccessContent({
  success,
  orderTypeLabel,
  storeInfo,
  onDone,
}: {
  success: SuccessInfo;
  orderTypeLabel: string;
  storeInfo: ReceiptStoreInfo;
  onDone: () => void;
}) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    if (printing) return;
    tapLight();
    setPrinting(true);
    try {
      await printReceipt(success, orderTypeLabel, storeInfo);
    } catch (e: any) {
      notify('Print Failed', e?.message || 'Could not print or share the receipt.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      <View style={styles.checkCircle}>
        <CheckIcon size={42} color={colors.success} strokeWidth={2.4} />
      </View>
      <Text style={styles.title}>Payment Complete</Text>
      <Text style={styles.subtitle}>
        {success.method} · {orderTypeLabel}{success.customerName ? ` · ${success.customerName}` : ''}
      </Text>
      {!!success.gcashReference && (
        <Text style={styles.gcashRefText}>GCash Ref# {success.gcashReference}</Text>
      )}
      {!!success.giftCardCode && (
        <Text style={styles.gcashRefText}>Gift Card {success.giftCardCode}</Text>
      )}
      {!!success.loyaltyPointsRedeemed && success.loyaltyPointsRedeemed > 0 && (
        <Text style={styles.gcashRefText}>Redeemed {success.loyaltyPointsRedeemed} pts (−₱{(success.loyaltyRedemptionAmount ?? 0).toFixed(2)})</Text>
      )}
      {!!success.loyaltyPointsEarned && success.loyaltyPointsEarned > 0 && (
        <Text style={styles.gcashRefText}>Earned {success.loyaltyPointsEarned} loyalty pts</Text>
      )}
      {!!success.receiptEmail && (
        <Text style={styles.gcashRefText}>Receipt emailed to {success.receiptEmail}</Text>
      )}
      <View style={styles.receipt}>
        <View style={styles.receiptHeader}>
          <View>
            <Text style={styles.lbl}>Order No.</Text>
            <Text style={styles.orderNo}>{success.no}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.lbl}>Total Paid</Text>
            <Text style={styles.totalPaid}>{'₱' + success.total.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.itemsList}>
          {success.items.map((it, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemQtyName}>{it.qtyName}</Text>
                {!!it.modsStr && <Text style={styles.itemMods}>{it.modsStr}</Text>}
              </View>
              <Text style={styles.itemLine}>{it.lineStr}</Text>
            </View>
          ))}
        </View>
        {success.showChange && (
          <View style={styles.changeRow}>
            <Text style={styles.changeLabel}>Change Due</Text>
            <Text style={styles.changeValue}>{'₱' + success.change.toFixed(2)}</Text>
          </View>
        )}
      </View>
      <View style={styles.buttonsRow}>
        <Pressable
          onPress={handlePrint}
          disabled={printing}
          style={({ pressed }) => [styles.printBtn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={printing ? 'Preparing receipt' : 'Print Receipt'}
        >
          <Text style={styles.printBtnText}>{printing ? 'Preparing…' : 'Print Receipt'}</Text>
        </Pressable>
        <Pressable
          onPress={() => { tapMedium(); onDone(); }}
          style={({ pressed }) => [styles.newOrderBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Start a new order"
        >
          <Text style={styles.newOrderBtnText}>New Order</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
    marginTop: 18,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },
  gcashRefText: {
    fontSize: 11.5,
    fontFamily: fonts.sansBold,
    color: colors.textLabel,
    marginTop: 4,
  },
  receipt: {
    width: '100%',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 18,
    padding: 20,
    marginTop: 24,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderBottomColor: 'rgba(184,147,90,0.22)',
  },
  lbl: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textLabel,
  },
  orderNo: {
    fontSize: 15,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
    marginTop: 3,
  },
  totalPaid: {
    fontSize: 24,
    fontFamily: fonts.serifBold,
    color: colors.goldLight,
    marginTop: 1,
  },
  itemsList: {
    paddingVertical: 14,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  itemQtyName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  itemMods: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemLine: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.textPrimary,
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 13,
  },
  changeLabel: {
    fontSize: 14,
    fontFamily: fonts.sansBold,
    color: colors.success,
  },
  changeValue: {
    fontSize: 16,
    fontFamily: fonts.sansExtraBold,
    color: colors.success,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 11,
    width: '100%',
    marginTop: 20,
  },
  printBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.borderGold18,
    borderRadius: 14,
    paddingVertical: 15,
  },
  printBtnText: {
    fontSize: 14,
    fontFamily: fonts.sansBold,
    color: colors.textSecondary,
  },
  newOrderBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
  },
  newOrderBtnText: {
    fontSize: 14,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
});
