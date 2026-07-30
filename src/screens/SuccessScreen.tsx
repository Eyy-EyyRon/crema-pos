import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { ReceiptStoreInfo } from '../lib/receipt';
import { SuccessInfo } from '../types';
import { SuccessContent } from '../components/SuccessContent';

export function SuccessScreen({
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
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SuccessContent success={success} orderTypeLabel={orderTypeLabel} storeInfo={storeInfo} onDone={onDone} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  content: {
    paddingTop: 40,
    paddingHorizontal: 26,
    paddingBottom: 20,
    alignItems: 'center',
    flexGrow: 1,
  },
});
