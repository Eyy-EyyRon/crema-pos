import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapMedium } from '../lib/haptics';
import { colors, fonts } from '../theme';

// Safety net for the cart trash button: removal still happens instantly (no slowdown to the
// common "fix a mistake while building the order" case), but this offers one tap to restore the
// exact same line for a few seconds afterward. Stays mounted at all times so the exit animation
// can play — `useCremaPos`'s pendingUndo state owns the actual undo-window timer; this component
// is purely presentational and just reacts to it going null.
export function UndoToast({
  removedItem,
  onUndo,
}: {
  removedItem: { name: string; qty: number } | null;
  onUndo: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [displayItem, setDisplayItem] = useState(removedItem);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (removedItem) {
      setDisplayItem(removedItem);
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setDisplayItem(null);
      });
    }
  }, [removedItem, anim]);

  if (!displayItem) return null;

  return (
    <View style={[s.wrap, { paddingBottom: insets.bottom + 14 }]} pointerEvents="box-none">
      <Animated.View
        style={[
          s.pill,
          {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}
      >
        <Text style={s.text} numberOfLines={1}>
          Removed {displayItem.qty > 1 ? `${displayItem.qty}× ` : ''}{displayItem.name}
        </Text>
        <Pressable
          onPress={() => { tapMedium(); onUndo(); }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Undo remove"
        >
          <Text style={s.undo}>Undo</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 58,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(184,147,90,0.25)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  text: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.textPrimary,
  },
  undo: {
    fontSize: 13,
    fontFamily: fonts.sansExtraBold,
    color: colors.gold,
    letterSpacing: 0.3,
  },
});
