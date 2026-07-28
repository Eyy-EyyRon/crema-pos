import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { SuccessInfo } from '../types';
import { SuccessContent } from '../components/SuccessContent';

export function SuccessScreen({
  success,
  orderTypeLabel,
  onDone,
}: {
  success: SuccessInfo;
  orderTypeLabel: string;
  onDone: () => void;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SuccessContent success={success} orderTypeLabel={orderTypeLabel} onDone={onDone} />
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
