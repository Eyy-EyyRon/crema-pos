import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { peso0 } from '../format';
import { AlertTriangleIcon, BagIcon, MinusIcon, PlusIcon, XIcon } from '../icons';
import { tapLight, tapMedium, warning } from '../lib/haptics';
import { colors, fonts } from '../theme';
import { ModGroupDef, SelectedMod, SelectedMods } from '../types';
import { OptionChip } from './OptionChip';
import { Shot } from './Shot';
import { useBreakpoint } from '../breakpoints';
import { useKeyboardOverlap } from '../responsive/useKeyboardOverlap';

interface CustomizeContentProps {
  category: string;
  name: string;
  basePrice: number;
  groups: ModGroupDef[];
  selMods: SelectedMods;
  onToggleMod: (g: ModGroupDef, opt: SelectedMod) => void;
  note: string;
  onNote: (v: string) => void;
  qty: number;
  onIncQty: () => void;
  onDecQty: () => void;
  addUnitTotal: number;
  addValid: boolean;
  onAdd: () => void;
  onClose: () => void;
  /** When true, the primary CTA updates the existing cart line instead of appending. */
  isEditing?: boolean;
  /** Tablet sidebar fills its pane. Phone sheet should hug content instead of stretching full-screen. */
  fillHeight?: boolean;
}

export function CustomizeContent({
  category,
  name,
  basePrice,
  groups,
  selMods,
  onToggleMod,
  note,
  onNote,
  qty,
  onIncQty,
  onDecQty,
  addUnitTotal,
  addValid,
  onAdd,
  onClose,
  isEditing = false,
  fillHeight = true,
}: CustomizeContentProps) {
  const { isTablet, isCompact, width } = useBreakpoint();
  const kb = useKeyboardOverlap();
  const scrollRef = useRef<ScrollView>(null);

  const isSmall   = width < 360;  // 320–359 px phones (iPhone SE 1st gen)
  const isTiny    = width < 340;  // very narrow
  const isLarge   = width >= 414; // iPhone Plus / Pro Max


  const addLabel = isEditing
    ? (qty > 1 ? `Update ${qty}×` : 'Update Item')
    : (qty > 1 ? `Add ${qty}× to Order` : 'Add to Order');
  const addTotalStr = peso0(addUnitTotal * qty);

  // Alias kept for compatibility
  const tightAdd    = isSmall;
  const ultraNarrow = isTiny;

  // Dynamic button height based on screen width
  const buttonHeight = isTiny ? 48 : isSmall ? 52 : isLarge ? 58 : 54;

  return (
    <View style={[styles.container, fillHeight ? styles.fill : styles.shrink]}>
      {isTablet && <View style={styles.topAccent} />}
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <Shot label="·" style={{ width: isTablet ? 56 : 52, height: isTablet ? 56 : 52, borderRadius: isTablet ? 14 : 13, flexShrink: 0 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{category}</Text>
          <Text style={[styles.name, isTablet && { fontSize: 18 }]}>{name}</Text>
          <Text style={styles.base}>Base {peso0(basePrice)}</Text>
        </View>
        <Pressable onPress={() => { tapLight(); onClose(); }} style={[styles.closeBtn, isTablet && { width: 34, height: 34 }]} accessibilityRole="button" accessibilityLabel="Close">
          <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={fillHeight ? styles.fill : styles.shrink}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet, isCompact && { paddingBottom: 8 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {groups.map((g) => (
          <View key={g.id} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={[styles.groupName, isTablet && { fontSize: 14 }]}>{g.name}</Text>
              {g.required && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              )}
              {g.multi && (
                <View style={styles.multiBadge}>
                  <Text style={styles.multiText}>Pick many</Text>
                </View>
              )}
            </View>
            <View style={styles.optionsWrap}>
              {g.options.map(([optName, optPrice]) => {
                const active = (selMods[g.id] || []).some((o) => o.name === optName);
                return (
                  <OptionChip
                    key={optName}
                    name={optName}
                    price={optPrice}
                    active={active}
                    onPress={() => onToggleMod(g, { name: optName, p: optPrice })}
                  />
                );
              })}
            </View>
          </View>
        ))}
        <Text style={styles.noteLabel}>Special Instructions</Text>
        <TextInput
          value={note}
          onChangeText={onNote}
          placeholder="e.g. Extra hot, no foam, less ice…"
          placeholderTextColor={colors.textMuted}
          multiline
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)}
          style={[styles.noteInput, isTablet && { height: 64 }]}
        />
      </ScrollView>

      <View style={[
        styles.footer,
        isTablet  && styles.footerTablet,
        isCompact && styles.footerCompact,
        isLarge   && styles.footerLarge,
      ]}>
        {/* Qty stepper row — always full-width on phone, inline on tablet */}
        <View style={[
          styles.footerRow,
          !isTablet && styles.footerRowPhone,
          isTiny    && styles.footerRowPhoneUltraNarrow,
        ]}>
          {/* ── Quantity stepper ── */}
          <View style={[styles.stepper, !isTablet && styles.stepperPhone]}>
            <Pressable
              onPress={() => { tapLight(); onDecQty(); }}
              style={styles.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
            >
              <MinusIcon size={isTiny ? 12 : 14} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.qty, isTiny && { fontSize: 14 }]}>{qty}</Text>
            <Pressable
              onPress={() => { tapLight(); onIncQty(); }}
              style={[styles.stepBtn, { backgroundColor: colors.gold }]}
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
            >
              <PlusIcon size={isTiny ? 12 : 14} color={colors.screenBg} strokeWidth={3.2} />
            </Pressable>
          </View>

          {/* ── Add / Update button — full-width below stepper on phone ── */}
          <Pressable
            onPress={() => { if (addValid) { tapMedium(); onAdd(); } else { warning(); } }}
            style={[
              styles.addBtn,
              !isTablet && styles.addBtnPhone,
              isTiny    && styles.addBtnUltraNarrow,
              { opacity: addValid ? 1 : 0.4, height: buttonHeight },
            ]}
            accessibilityRole="button"
            accessibilityLabel={addLabel}
          >
            <BagIcon
              size={isTiny ? 14 : isSmall ? 15 : 17}
              color={colors.screenBg}
              strokeWidth={2}
            />
            {/* Label shrinks when space is tight; price badge never shrinks */}
            <Text
              style={[
                styles.addLabel,
                isSmall && styles.addLabelSmall,
                isTiny  && styles.addLabelUltraNarrow,
              ]}
              numberOfLines={1}
            >
              {addLabel}
            </Text>
            <View style={[
              styles.addTotalWrap,
              isTiny && styles.addTotalWrapUltraNarrow,
            ]}>
              <Text style={[
                styles.addTotal,
                isSmall && styles.addTotalSmall,
              ]}>
                {addTotalStr}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Validation warning */}
        {!addValid && (
          <View style={styles.warnRow}>
            <AlertTriangleIcon size={13} color={colors.danger} strokeWidth={2} />
            <Text style={styles.warnText}>Select all required options first</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.screenBg,
  },
  fill: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  topAccent: {
    height: 4,
    backgroundColor: colors.gold,
  },
  header: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184,147,90,0.1)',
  },
  headerTablet: {
    paddingTop: 18,
    paddingHorizontal: 22,
    paddingBottom: 16,
    gap: 14,
  },
  category: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  name: {
    fontSize: 17,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  base: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  scrollContentTablet: {
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  group: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 11,
  },
  groupName: {
    fontSize: 13.5,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
  },
  requiredBadge: {
    backgroundColor: 'rgba(184,147,90,0.12)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 20,
  },
  requiredText: {
    fontSize: 9,
    fontFamily: fonts.sansExtraBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  multiBadge: {
    backgroundColor: colors.chipBg,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 20,
  },
  multiText: {
    fontSize: 9,
    fontFamily: fonts.sansExtraBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noteLabel: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textLabel,
    marginTop: 4,
    marginBottom: 9,
  },
  noteInput: {
    height: 60,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 12,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  footer: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: 'rgba(184,147,90,0.1)',
    backgroundColor: colors.screenBg,
    // Prevent the footer from being squished by flex siblings
    flexShrink: 0,
  },
  footerTablet: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  footerCompact: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  footerLarge: {
    paddingHorizontal: 24,
    paddingBottom: 26,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // On phone, stack the qty stepper above a full-width Add button instead of squeezing both
  // into one row — the label + price badge never fit alongside the stepper at 360-390 px.
  footerRowPhone: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  footerRowPhoneUltraNarrow: {
    gap: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 13,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  stepperPhone: {
    alignSelf: 'flex-start',
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {
    fontSize: 16,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  addBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 0,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.gold,
  },
  addBtnPhone: {
    // In column layout, flex:1 grows height not width — use alignSelf + width instead.
    flexGrow: 0,
    flexBasis: 'auto',
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 14,
    gap: 8,
    paddingHorizontal: 12,
  },
  addBtnUltraNarrow: {
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  addLabel: {
    // Shrinks when text is long; the price badge (flexShrink:0) always stays visible.
    flexShrink: 1,
    minWidth: 0,
    fontSize: 14,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
    textAlignVertical: 'center',
  },
  addLabelSmall: {
    fontSize: 13,
  },
  addLabelUltraNarrow: {
    fontSize: 12,
  },
  addTotalWrap: {
    // Never shrink — the price is the most important part of this button.
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,18,26,0.18)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 11,
    minHeight: 28,
  },
  addTotalWrapUltraNarrow: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    minHeight: 24,
  },
  addTotal: {
    fontSize: 13.5,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
    textAlign: 'center',
  },
  addTotalSmall: {
    fontSize: 12.5,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  warnText: {
    fontSize: 11.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.danger,
  },
});
