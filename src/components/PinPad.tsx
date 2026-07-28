import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { DeleteIcon, FingerprintIcon } from '../icons';
import { colors as C } from '../theme';

// A self-contained, uncontrolled numeric keypad — it owns its own digit
// buffer internally, so the parent screen never re-renders on every
// keystroke. Ported from CafePOS/components/Shared/PinPad.tsx.

export interface PinPadProps {
  length?: number;
  onComplete: (pin: string) => void | Promise<void>;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  /** Bump this (e.g. a counter) after an async verify fails, to clear the buffer and shake. */
  resetSignal?: number;
  keySize?: number;
  gap?: number;
  /** What sits in the 10th grid slot (where 'C'/blank usually goes) — receives a `clear()` callback. */
  renderSlot10?: (clear: () => void) => React.ReactNode;
  /** Fires on every keypress with the new buffer length. */
  onChangeLength?: (length: number) => void;
  /** Optional content rendered between the dot row and the keypad grid. */
  statusSlot?: React.ReactNode;
}

export function PinPad({
  length = 4,
  onComplete,
  disabled = false,
  error = false,
  success = false,
  resetSignal,
  keySize = 64,
  gap = 20,
  renderSlot10,
  onChangeLength,
  statusSlot,
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const shakeX = useRef(new Animated.Value(0)).current;
  const firstMount = useRef(true);

  const shake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -13, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 13, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -9, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 9, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -4, duration: 32, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 32, useNativeDriver: true }),
    ]).start();
  }, [shakeX]);

  const clear = useCallback(() => setPin(''), []);

  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    if (resetSignal !== undefined) { setPin(''); shake(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const press = useCallback((val: string) => {
    if (disabled) return;
    if (val === '⌫') {
      setPin((p) => {
        const next = p.slice(0, -1);
        onChangeLength?.(next.length);
        return next;
      });
      return;
    }
    setPin((p) => {
      if (p.length >= length) return p;
      const next = p + val;
      onChangeLength?.(next.length);
      if (next.length === length) onComplete(next);
      return next;
    });
  }, [disabled, length, onComplete, onChangeLength]);

  const dotSize = Math.round(keySize * 0.22);

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{
        flexDirection: 'row', gap: gap + 4, marginBottom: 20, alignItems: 'center', height: dotSize + 15,
        transform: [{ translateX: shakeX }],
      }}>
        {Array.from({ length }).map((_, i) => (
          <PinDot key={i} filled={i < pin.length} error={error} success={success} size={dotSize} />
        ))}
      </Animated.View>
      {statusSlot}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: keySize * 3 + gap * 2, gap, justifyContent: 'center' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <PinPadKey key={k} label={k} size={keySize} onPress={() => press(k)} disabled={disabled} />
        ))}
        <View style={{ width: keySize, height: keySize, alignItems: 'center', justifyContent: 'center' }}>
          {renderSlot10 ? renderSlot10(clear) : null}
        </View>
        <PinPadKey label="0" size={keySize} onPress={() => press('0')} disabled={disabled} />
        <PinPadKey label="⌫" size={keySize} variant="action" onPress={() => press('⌫')} disabled={disabled} />
      </View>
    </View>
  );
}

function PinDot({ filled, error, success, size }: { filled: boolean; error: boolean; success: boolean; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg = useRef(new Animated.Value(0)).current;
  const prev = useRef(false);

  useEffect(() => {
    if (success) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.5, useNativeDriver: true, speed: 40 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    } else if (filled && !prev.current) {
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.45, useNativeDriver: true, speed: 55, bounciness: 14 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 28 }),
        ]),
        Animated.sequence([
          Animated.timing(bg, { toValue: 1, duration: 90, useNativeDriver: false }),
          Animated.timing(bg, { toValue: 0, duration: 350, useNativeDriver: false }),
        ]),
      ]).start();
    }
    prev.current = filled;
  }, [filled, success, scale, bg]);

  const dotColor = success ? C.successLt : bg.interpolate({ inputRange: [0, 1], outputRange: [C.gold, C.goldLight] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {filled || success ? (
        <Animated.View style={{
          borderWidth: 2, borderColor: success ? C.successLt : C.gold,
          backgroundColor: dotColor as any, width: size, height: size, borderRadius: size / 2,
        }} />
      ) : (
        <View style={{
          borderWidth: 2, borderColor: error ? C.errorLt : C.textDim,
          backgroundColor: 'transparent', width: size, height: size, borderRadius: size / 2,
        }} />
      )}
    </Animated.View>
  );
}

export function PinPadKey({ label, size, onPress, variant = 'digit', disabled = false }: {
  label: string; size: number; onPress: () => void; variant?: 'digit' | 'action' | 'bio'; disabled?: boolean;
}) {
  const sc = useRef(new Animated.Value(1)).current;
  const glo = useRef(new Animated.Value(0)).current;

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(
      variant === 'bio' ? Haptics.ImpactFeedbackStyle.Heavy
        : variant === 'action' ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
    Animated.parallel([
      Animated.sequence([
        Animated.spring(sc, { toValue: 0.82, useNativeDriver: true, speed: 65, bounciness: 0 }),
        Animated.spring(sc, { toValue: 1, useNativeDriver: true, speed: 42 }),
      ]),
      Animated.sequence([
        Animated.timing(glo, { toValue: 1, duration: 75, useNativeDriver: false }),
        Animated.timing(glo, { toValue: 0, duration: 220, useNativeDriver: false }),
      ]),
    ]).start();
    onPress();
  }, [onPress, variant, disabled, sc, glo]);

  const bgMap: Record<string, [string, string]> = {
    digit: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.12)'],
    action: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.08)'],
    bio: ['rgba(90,200,250,0.1)', 'rgba(90,200,250,0.2)'],
  };
  const bgColor = glo.interpolate({ inputRange: [0, 1], outputRange: bgMap[variant] });

  return (
    <Animated.View style={{ transform: [{ scale: sc }], opacity: disabled ? 0.5 : 1 }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1} disabled={disabled}>
        <Animated.View style={{
          width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
          borderWidth: variant === 'bio' ? 1.5 : 1,
          borderColor: variant === 'bio' ? 'rgba(90,200,250,0.2)' : variant === 'action' ? 'rgba(255,255,255,0.05)' : C.glassBorder,
          backgroundColor: bgColor as any,
        }}>
          {variant === 'bio' ? (
            <FingerprintIcon size={size * 0.4} color={C.biometricLt} strokeWidth={1.5} />
          ) : label === '⌫' ? (
            <DeleteIcon size={size * 0.32} color={C.textMuted} strokeWidth={1.5} />
          ) : (
            <Text style={{
              fontSize: variant === 'action' ? size * 0.28 : size * 0.34,
              fontWeight: variant === 'action' ? '500' : '300',
              color: variant === 'action' ? C.textMuted : C.text,
            }}>{label}</Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}
