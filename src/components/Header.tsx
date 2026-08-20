import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, CoffeeIcon, SettingsIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { useBreakpoint } from '../breakpoints';
import { colors, fonts } from '../theme';

const logo = require('../../assets/images/crema.jpg');

function greetingFor(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const first = name.split(' ')[0] || name;
  return `Good ${part}, ${first}`;
}

export function MenuHeader({
  queueCount,
  onQueue,
  orderTypeLabel,
  onChangeType,
  userName,
  onAccount,
  variant = 'phone',
}: {
  queueCount: number;
  onQueue: () => void;
  orderTypeLabel: string;
  onChangeType: () => void;
  userName: string;
  onAccount: () => void;
  variant?: 'phone' | 'tablet';
}) {
  const tablet = variant === 'tablet';
  const insets = useSafeAreaInsets();
  const { gutter, isCompact } = useBreakpoint();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + (isCompact ? 8 : 14), paddingHorizontal: gutter }, tablet && styles.wrapTablet]}>
      <View style={styles.topRow}>
        <Pressable
          style={({ pressed }) => [styles.brandRow, pressed && { opacity: 0.7 }]}
          onPress={() => { tapLight(); onAccount(); }}
          accessibilityRole="button"
          accessibilityLabel="Account and settings"
        >
          <Image source={logo} style={[styles.logo, tablet && { width: 42, height: 42 }]} />
          <View style={styles.brandText}>
            <Text style={styles.brandLabel}>Crema POS</Text>
            <Text style={[styles.greeting, tablet && { fontSize: 16 }]} numberOfLines={1}>{greetingFor(userName)}</Text>
          </View>
        </Pressable>
        <View style={styles.actionsRow}>
          {tablet && (
            <Pressable
              onPress={() => { tapLight(); onChangeType(); }}
              style={({ pressed }) => [styles.typePillTablet, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Order type: ${orderTypeLabel}. Change`}
            >
              <View style={styles.dot} />
              <Text style={styles.typePillText}>{orderTypeLabel}</Text>
              <Text style={styles.typePillChange}>Change</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => { tapLight(); onQueue(); }}
            style={[styles.queueBtn, tablet && { width: 40, height: 40 }]}
            accessibilityRole="button"
            accessibilityLabel={queueCount > 0 ? `View order queue, ${queueCount} pending` : 'View order queue'}
          >
            <CoffeeIcon size={tablet ? 17 : 16} color={colors.textMuted} strokeWidth={1.8} />
            {queueCount > 0 && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{queueCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => { tapLight(); onAccount(); }}
            style={[styles.queueBtn, tablet && { width: 40, height: 40 }]}
            accessibilityRole="button"
            accessibilityLabel="Account and settings"
          >
            <SettingsIcon size={tablet ? 17 : 16} color={colors.textMuted} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>
      {!tablet && (
        <Pressable
          onPress={() => { tapLight(); onChangeType(); }}
          style={({ pressed }) => [styles.typePillPhone, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={`Order type: ${orderTypeLabel}. Change`}
        >
          <View style={styles.typePillLeft}>
            <View style={styles.dot} />
            <Text style={styles.typePillText}>{orderTypeLabel}</Text>
          </View>
          <Text style={styles.typePillChange}>Change</Text>
        </Pressable>
      )}
    </View>
  );
}

export function BackHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { gutter, isCompact } = useBreakpoint();
  return (
    <View style={[styles.backHeaderWrap, { paddingTop: insets.top + (isCompact ? 8 : 14), paddingHorizontal: gutter }]}>
      <Pressable onPress={() => { tapLight(); onBack(); }} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <ChevronLeftIcon size={17} color={colors.textPrimary} strokeWidth={2.2} />
      </Pressable>
      <Text style={styles.backTitle}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.screenBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184,147,90,0.1)',
    paddingBottom: 12,
  },
  wrapTablet: {
    paddingBottom: 12,
    borderBottomWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
    minWidth: 0,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderGold25,
  },
  brandLabel: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  greeting: {
    fontSize: 14,
    fontFamily: fonts.sansBold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  queueBtn: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.borderGold12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
  typePillPhone: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  typePillTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  typePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  typePillText: {
    fontSize: 12.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.textSecondary,
  },
  typePillChange: {
    fontSize: 11,
    fontFamily: fonts.sansBold,
    color: colors.gold,
    marginLeft: 2,
  },
  backHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    backgroundColor: colors.screenBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184,147,90,0.1)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.borderGold12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTitle: {
    fontSize: 17,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
    flex: 1,
  },
});
