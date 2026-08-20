import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircleIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { colors, fonts } from '../theme';
import { PinPad } from './PinPad';

type IngredientOption = { id: string; name: string; unit: string; current_stock: number };

const QUICK_REASONS = ['Miscounted', 'Spoiled', 'Expired', 'Dropped', 'Other'];

// Manager-PIN-gated manual stock correction — mirrors RefundModal's flow (reason first, PIN
// last), since a miscount/spoilage write-off changing recorded stock warrants the same trust
// model as a refund, not a bare confirm dialog.
export function StockAdjustModal({
  visible,
  ingredients,
  isOffline,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  ingredients: IngredientOption[];
  isOffline: boolean;
  onClose: () => void;
  onSubmit: (ingredientId: string, delta: number, reason: string, pin: string) => Promise<{ error?: string }>;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<IngredientOption | null>(null);
  const [delta, setDelta] = useState('');
  const [sign, setSign] = useState<1 | -1>(-1);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetTick, setResetTick] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ingredients.slice(0, 20);
    return ingredients.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 20);
  }, [search, ingredients]);

  const reset = () => {
    setSearch('');
    setSelected(null);
    setDelta('');
    setSign(-1);
    setReason('');
    setError('');
    setBusy(false);
  };

  if (!visible) return null;

  const handlePinComplete = async (pin: string) => {
    if (busy || !selected) return;
    const n = Number(delta);
    if (!n || isNaN(n) || n <= 0) {
      setError('Enter a quantity');
      setResetTick((t) => t + 1);
      return;
    }
    if (!reason.trim()) {
      setError('Select or enter a reason');
      setResetTick((t) => t + 1);
      return;
    }
    setBusy(true);
    const res = await onSubmit(selected.id, n * sign, reason.trim(), pin);
    if (res.error) {
      setError(res.error);
      setResetTick((t) => t + 1);
      setBusy(false);
    } else {
      reset();
      onClose();
    }
  };

  return (
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <View style={s.header}>
          <Text style={s.title}>Adjust Stock</Text>
          <Pressable onPress={busy ? undefined : () => { tapLight(); reset(); onClose(); }} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>

        {!selected ? (
          <>
            <View style={s.searchRow}>
              <SearchIcon size={14} color={colors.textLabel} strokeWidth={2} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search ingredients…"
                placeholderTextColor={colors.textMuted}
                style={s.searchInput}
                autoFocus
              />
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {filtered.map((ing) => (
                <Pressable key={ing.id} style={s.ingRow} onPress={() => { tapLight(); setSelected(ing); }}>
                  <Text style={s.ingName}>{ing.name}</Text>
                  <Text style={s.ingStock}>{ing.current_stock} {ing.unit}</Text>
                </Pressable>
              ))}
              {filtered.length === 0 && <Text style={s.emptyText}>No matching ingredients.</Text>}
            </ScrollView>
          </>
        ) : (
          <ScrollView contentContainerStyle={s.selectedBody} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => setSelected(null)} style={s.selectedRow}>
              <Text style={s.selectedName}>{selected.name}</Text>
              <Text style={s.selectedStock}>Current: {selected.current_stock} {selected.unit} · Change</Text>
            </Pressable>

            <View style={s.signRow}>
              <Pressable style={[s.signBtn, sign === -1 && s.signBtnActive]} onPress={() => setSign(-1)}>
                <TrashIcon size={13} color={sign === -1 ? colors.screenBg : colors.textMuted} strokeWidth={2} />
                <Text style={[s.signBtnText, sign === -1 && s.signBtnTextActive]}>Remove</Text>
              </Pressable>
              <Pressable style={[s.signBtn, sign === 1 && s.signBtnActive]} onPress={() => setSign(1)}>
                <PlusIcon size={13} color={sign === 1 ? colors.screenBg : colors.textMuted} strokeWidth={2} />
                <Text style={[s.signBtnText, sign === 1 && s.signBtnTextActive]}>Add</Text>
              </Pressable>
            </View>

            <Text style={s.label}>Quantity ({selected.unit})</Text>
            <TextInput
              value={delta}
              onChangeText={(t) => { setDelta(t.replace(/[^0-9.]/g, '')); if (error) setError(''); }}
              placeholder="0"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              style={s.input}
              editable={!busy}
            />

            <Text style={s.label}>Reason</Text>
            <View style={s.reasonChips}>
              {QUICK_REASONS.map((r) => (
                <Pressable key={r} onPress={() => setReason(r)} style={[s.reasonChip, reason === r && s.reasonChipActive]}>
                  <Text style={[s.reasonChipText, reason === r && s.reasonChipTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={reason}
              onChangeText={(t) => { setReason(t); if (error) setError(''); }}
              placeholder="e.g. Recount after inventory"
              placeholderTextColor={colors.textDim}
              style={s.input}
              editable={!busy}
            />

            {!!error && (
              <View style={s.errorRow}>
                <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <Text style={s.panelDesc}>Manager enters their 4-digit PIN to confirm this correction.</Text>
            <PinPad
              key={visible ? 1 : 0}
              keySize={48}
              gap={9}
              onComplete={handlePinComplete}
              onChangeLength={() => error && setError('')}
              disabled={busy || isOffline}
              error={!!error}
              resetSignal={resetTick}
            />
            {isOffline && <Text style={s.offlineNote}>Adjusting stock requires an internet connection</Text>}
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 45,
    alignItems: 'center', justifyContent: 'center', padding: 24,
    backgroundColor: colors.overlayStrong,
  },
  card: {
    width: 420, maxWidth: '100%', maxHeight: '100%',
    backgroundColor: colors.screenBg,
    borderWidth: 1, borderColor: colors.borderGold18,
    borderRadius: 22, padding: 22,
  },
  // contentContainerStyle for the "adjust quantity" step's ScrollView — that step (sign toggle +
  // qty input + reason chips/input + full PinPad) is tall enough to exceed a short phone's
  // height on its own, even before a keyboard is involved, unlike the ingredient-search step.
  selectedBody: {
    flexGrow: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.borderGold14,
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, marginBottom: 12,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14, padding: 0 },
  ingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  ingName: { fontSize: 13.5, fontFamily: fonts.sansSemiBold, color: colors.textSecondary },
  ingStock: { fontSize: 12, color: colors.textMuted },
  emptyText: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  selectedRow: {
    backgroundColor: colors.chipBg, borderRadius: 12, padding: 12, marginBottom: 14,
  },
  selectedName: { fontSize: 14.5, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  selectedStock: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  signRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  signBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: colors.chipBg,
    borderWidth: 1, borderColor: colors.borderGold14,
  },
  signBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  signBtnText: { fontSize: 12.5, fontFamily: fonts.sansBold, color: colors.textMuted },
  signBtnTextActive: { color: colors.screenBg },
  label: { fontFamily: fonts.sansExtraBold, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.textLabel, marginBottom: 8 },
  input: {
    backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.borderGold14,
    borderRadius: 12, padding: 13, color: colors.textPrimary, fontSize: 14, marginBottom: 14,
  },
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  reasonChip: {
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1,
    backgroundColor: 'rgba(26,42,62,0.4)', borderColor: colors.borderGold12,
  },
  reasonChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  reasonChipText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.textMuted },
  reasonChipTextActive: { color: colors.screenBg, fontFamily: fonts.sansBold },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  errorText: { fontSize: 12, color: colors.danger, fontFamily: fonts.sansSemiBold },
  panelDesc: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  offlineNote: { textAlign: 'center', fontSize: 11, color: colors.danger, marginTop: 10, fontFamily: fonts.sansSemiBold },
});
