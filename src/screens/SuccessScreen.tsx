import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint } from '../breakpoints';
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
  const insets = useSafeAreaInsets();
  const { gutter, isCompact } = useBreakpoint();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: gutter, paddingTop: isCompact ? 16 : 40, paddingBottom: insets.bottom + 20 },
      ]}
    >
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
    alignItems: 'center',
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
});
