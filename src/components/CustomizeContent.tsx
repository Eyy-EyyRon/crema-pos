import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { peso0 } from '../format';
import { AlertTriangleIcon, BagIcon, MinusIcon, PlusIcon, XIcon } from '../icons';
import { tapLight, tapMedium, warning } from '../lib/haptics';
import { colors, fonts } from '../theme';
import { ModGroupDef, SelectedMod, SelectedMods } from '../types';
import { OptionChip } from './OptionChip';
import { Shot } from './Shot';

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
  variant?: 'phone' | 'tablet';
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
  variant = 'phone',
}: CustomizeContentProps) {
  const tablet = variant === 'tablet';
  const addLabel = qty > 1 ? `Add ${qty}× to Order` : 'Add to Order';
  const addTotalStr = peso0(addUnitTotal * qty);

  return (
    <View style={styles.container}>
      {tablet && <View style={styles.topAccent} />}
      <View style={[styles.header, tablet && styles.headerTablet]}>
        <Shot label="·" style={{ width: tablet ? 56 : 52, height: tablet ? 56 : 52, borderRadius: tablet ? 14 : 13, flexShrink: 0 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{category}</Text>
          <Text style={[styles.name, tablet && { fontSize: 18 }]}>{name}</Text>
          <Text style={styles.base}>Base {peso0(basePrice)}</Text>
        </View>
        <Pressable onPress={() => { tapLight(); onClose(); }} style={[styles.closeBtn, tablet && { width: 34, height: 34 }]} accessibilityRole="button" accessibilityLabel="Close">
          <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, tablet && styles.scrollContentTablet]}>
        {groups.map((g) => (
          <View key={g.id} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={[styles.groupName, tablet && { fontSize: 14 }]}>{g.name}</Text>
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
          style={[styles.noteInput, tablet && { height: 64 }]}
        />
      </ScrollView>

      <View style={[styles.footer, tablet && styles.footerTablet]}>
        <View style={styles.footerRow}>
          <View style={styles.stepper}>
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
            style={[styles.addBtn, { opacity: addValid ? 1 : 0.4 }]}
          >
            <BagIcon size={17} color={colors.screenBg} strokeWidth={2} />
            <Text style={styles.addLabel}>{addLabel}</Text>
            <View style={styles.addTotalWrap}>
              <Text style={styles.addTotal}>{addTotalStr}</Text>
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
    flex: 1,
    backgroundColor: colors.screenBg,
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
  scroll: {
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.gold,
  },
  addLabel: {
    fontSize: 14.5,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
  addTotalWrap: {
    backgroundColor: 'rgba(10,18,26,0.16)',
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 11,
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
