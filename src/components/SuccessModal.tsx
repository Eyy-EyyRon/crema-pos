import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { ReceiptStoreInfo } from '../lib/receipt';
import { SuccessInfo } from '../types';
import { SuccessContent } from './SuccessContent';

export function SuccessModal({
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
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SuccessContent success={success} orderTypeLabel={orderTypeLabel} storeInfo={storeInfo} onDone={onDone} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.overlayStrong,
  },
  card: {
    width: 420,
    maxWidth: '100%',
    maxHeight: '100%',
    backgroundColor: colors.screenBg,
    borderWidth: 1,
    borderColor: colors.borderGold18,
    borderRadius: 24,
    overflow: 'hidden',
  },
  content: {
    padding: 30,
    paddingTop: 34,
    alignItems: 'center',
  },
});
