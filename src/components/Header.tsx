import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, CoffeeIcon, MapPinIcon, SettingsIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { useBreakpoint } from '../breakpoints';
import { colors, fonts } from '../theme';

// A barista working a pop-up sees this above everything else in the header, every screen, for
// the whole session — it's the one thing standing between them and ringing up the wrong menu at
// the wrong prices. A solid-filled banner (not a subtle outlined pill, like the rest of the
// header's chips) earns that attention, with a one-time slide/fade-in on mount to catch the eye
// right when a shift starts, then it just sits there, calm and unmissable, for the rest of it.
function PopupBanner({ popupName }: { popupName: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        styles.popupBanner,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Serving pop-up location: ${popupName}`}
    >
      <View style={styles.popupBannerBar} />
      <MapPinIcon size={14} color={colors.popup} strokeWidth={2} />
      <View style={styles.popupBannerTextCol}>
        <Text style={styles.popupBannerLabel}>Serving pop-up</Text>
        <Text style={styles.popupBannerName} numberOfLines={1}>{popupName}</Text>
      </View>
    </Animated.View>
  );
}

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
  popupName,
}: {
  queueCount: number;
  onQueue: () => void;
  orderTypeLabel: string;
  onChangeType: () => void;
  userName: string;
  onAccount: () => void;
  variant?: 'phone' | 'tablet';
  /** This barista's login-scoped pop-up assignment (see PopupContext), if any — rendered as a
   *  solid banner above everything else in the header (see PopupBanner below). Never
   *  interactive: unlike order type, this is resolved once at login and can't be changed
   *  mid-session (see useCremaPos's fetchMenuData). */
  popupName?: string | null;
}) {
  const tablet = variant === 'tablet';
  const insets = useSafeAreaInsets();
  const { gutter, isCompact } = useBreakpoint();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + (isCompact ? 8 : 14), paddingHorizontal: gutter }, tablet && styles.wrapTablet]}>
      {popupName && <PopupBanner popupName={popupName} />}
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
  // Solid-filled, full-width, and sits above everything else in the header — read-only (this is
  // resolved once at login, see PopupContext's doc comment in types.ts, and can't be changed
  // mid-session), but far more visually assertive than any of the outlined chips below it, since
  // getting this wrong means the wrong menu at the wrong prices.
  popupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.popupBg,
    borderWidth: 1,
    borderColor: colors.popupBorder,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginBottom: 12,
    overflow: 'hidden',
  },
  popupBannerBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.popup,
  },
  popupBannerTextCol: {
    flex: 1,
    minWidth: 0,
    marginLeft: 2,
  },
  popupBannerLabel: {
    fontSize: 9.5,
    fontFamily: fonts.sansExtraBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.popup,
  },
  popupBannerName: {
    fontSize: 13.5,
    fontFamily: fonts.sansBold,
    color: colors.textPrimary,
    marginTop: 1,
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
