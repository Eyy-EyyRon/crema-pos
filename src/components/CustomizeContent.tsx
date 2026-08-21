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
  const { isTablet, isCompact, width, height } = useBreakpoint();
  const kb = useKeyboardOverlap();
  const scrollRef = useRef<ScrollView>(null);
  const scrollMax = Math.max(120, Math.round((height - kb) * 0.42));
  const addLabel = isEditing
    ? (qty > 1 ? `Update ${qty}×` : 'Update Item')
    : (qty > 1 ? `Add ${qty}× to Order` : 'Add to Order');
  const addTotalStr = peso0(addUnitTotal * qty);
  const tightAdd = width < 360;
  const ultraNarrow = width < 340;

  return (
    <View style={[styles.container, fillHeight && styles.containerFill]}>
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
        style={fillHeight ? styles.scrollFill : { maxHeight: scrollMax }}
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

      <View style={[styles.footer, isTablet && styles.footerTablet, isCompact && styles.footerCompact]}>
        <View style={[styles.footerRow, !isTablet && styles.footerRowPhone, ultraNarrow && styles.footerRowPhoneUltraNarrow]}>
          <View style={[styles.stepper, !isTablet && styles.stepperPhone]}>
            <Pressable onPress={() => { tapLight(); onDecQty(); }} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="Decrease quantity">
              <MinusIcon size={14} color={colors.textSecondary} />
            </Pressable>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable onPress={() => { tapLight(); onIncQty(); }} style={[styles.stepBtn, { backgroundColor: colors.gold }]} accessibilityRole="button" accessibilityLabel="Increase quantity">
              <PlusIcon size={14} color={colors.screenBg} strokeWidth={3.2} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => { if (addValid) { tapMedium(); onAdd(); } else { warning(); } }}
            style={[styles.addBtn, !isTablet && styles.addBtnPhone, ultraNarrow && styles.addBtnUltraNarrow, { opacity: addValid ? 1 : 0.4 }]}
          >
            <BagIcon size={tightAdd ? 15 : 17} color={colors.screenBg} strokeWidth={2} />
            <Text style={[styles.addLabel, tightAdd && { fontSize: 13 }, ultraNarrow && styles.addLabelUltraNarrow]} numberOfLines={1}>{addLabel}</Text>
            <View style={[styles.addTotalWrap, ultraNarrow && styles.addTotalWrapUltraNarrow]}>
              <Text style={[styles.addTotal, tightAdd && { fontSize: 13 }]}>{addTotalStr}</Text>
            </View>
          </Pressable>
        </View>
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
  containerFill: {
    flex: 1,
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
  scrollFill: {
    flex: 1,
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
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(184,147,90,0.1)',
    backgroundColor: colors.screenBg,
  },
  footerTablet: {
    paddingHorizontal: 22,
  },
  footerCompact: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // On phone, stack the qty stepper above a full-width Add button instead of squeezing both
  // into one row — "Add to Order ₱175" plus the stepper never fits alongside it on a real
  // barista phone (360-390px), so it either wrapped mid-word or got ellipsized. A full-width
  // primary CTA is also just a better touch target than a squeezed inline button.
  footerRowPhone: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  footerRowPhoneUltraNarrow: {
    gap: 9,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 13,
    paddingVertical: 7,
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
    minWidth: 16,
    textAlign: 'center',
  },
  addBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.gold,
  },
  addBtnPhone: {
    // In footerRowPhone's column layout, flex:1 above would grow along the column's main axis
    // (height), not width — this makes it a full-width block instead.
    flexGrow: 0,
    flexBasis: 'auto',
    alignSelf: 'stretch',
    width: '100%',
  },
  addBtnUltraNarrow: {
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 11,
  },
  addLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 14.5,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
  addLabelUltraNarrow: {
    fontSize: 13,
  },
  addTotalWrap: {
    backgroundColor: 'rgba(10,18,26,0.16)',
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  addTotalWrapUltraNarrow: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addTotal: {
    fontSize: 14,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
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
