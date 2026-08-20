import React, { useEffect } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { CalendarIcon, ClockIcon, LogOutIcon, ReceiptIcon, UserIcon, XIcon, ImageIcon, WifiOffIcon, LockIcon } from '../icons';
import { tapLight, warning } from '../lib/haptics';
import { useBreakpoint } from '../breakpoints';
import { colors, fonts } from '../theme';
import { Shift, ShiftScheduleEntry, UserProfile } from '../types';

function elapsedSince(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function AccountSheet({
  visible,
  user,
  shift,
  upcomingShifts,
  uploading = false,
  outboxCount = 0,
  onClose,
  onHistory,
  onCloseShift,
  onLock,
  onUploadAvatar,
  onOpenOutbox,
  onOpenStockAdjust,
}: {
  visible: boolean;
  user: UserProfile;
  shift: Shift | null;
  upcomingShifts: ShiftScheduleEntry[];
  uploading?: boolean;
  outboxCount?: number;
  onClose: () => void;
  onHistory: () => void;
  onCloseShift: () => void;
  onLock: () => void;
  onUploadAvatar: () => void;
  onOpenOutbox: () => void;
  onOpenStockAdjust: () => void;
}) {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const { height } = useBreakpoint();
  const cardMax = Math.max(240, height - 94);
  const bodyMax = Math.max(160, cardMax - 78);

  if (!visible) return null;
  return (
    <View style={s.overlay}>
      <Pressable style={s.overlayPress} onPress={onClose} />
      <View style={[s.card, { maxHeight: cardMax }]}>
        <View style={s.header}>
          <View style={s.avatar}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} cachePolicy="disk" style={s.avatarImg} />
            ) : (
              <UserIcon size={20} color={colors.gold} strokeWidth={1.8} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user.full_name}</Text>
            <Text style={s.role}>{user.role === 'manager' ? 'Manager' : 'Barista'}</Text>
          </View>
          <Pressable onPress={() => { tapLight(); onClose(); }} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <XIcon size={14} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: bodyMax }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {shift && (
            <View style={s.shiftRow}>
              <ClockIcon size={13} color={colors.textMuted} strokeWidth={2} />
              <Text style={s.shiftText}>
                Shift open {elapsedSince(shift.openedAt)}
              </Text>
            </View>
          )}

          {upcomingShifts.length > 0 && (
            <View style={s.schedSection}>
              <Text style={s.schedTitle}>Upcoming Shifts</Text>
              {upcomingShifts.slice(0, 3).map((sch) => {
                const start = new Date(sch.scheduled_start);
                const end = new Date(sch.scheduled_end);
                return (
                  <View key={sch.id} style={s.schedRow}>
                    <CalendarIcon size={12} color={colors.textMuted} strokeWidth={2} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.schedDate}>
                        {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={s.schedTime}>
                        {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {sch.notes ? ` · ${sch.notes}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            style={({ pressed }) => [s.row, pressed && s.rowPressed]}
            onPress={() => { tapLight(); onHistory(); }}
            accessibilityRole="button"
            accessibilityLabel="Order History"
          >
            <ReceiptIcon size={16} color={colors.textSecondary} strokeWidth={1.7} />
            <Text style={s.rowText}>Order History</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.row, pressed && s.rowPressed]}
            onPress={() => { tapLight(); onOpenOutbox(); }}
            accessibilityRole="button"
            accessibilityLabel={outboxCount > 0 ? `Sync Status, ${outboxCount} pending` : 'Sync Status, all synced'}
          >
            <WifiOffIcon size={16} color={outboxCount > 0 ? colors.heatMedText : colors.textSecondary} strokeWidth={1.7} />
            <Text style={s.rowText}>{outboxCount > 0 ? `Sync Status — ${outboxCount} pending` : 'Sync Status — all synced'}</Text>
            {outboxCount > 0 && (
              <View style={s.syncBadge}>
                <Text style={s.syncBadgeText}>{outboxCount}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.row, pressed && s.rowPressed]}
            onPress={() => { tapLight(); onLock(); }}
            accessibilityRole="button"
            accessibilityLabel="Switch Profile or Lock POS"
          >
            <UserIcon size={16} color={colors.textSecondary} strokeWidth={1.7} />
            <Text style={s.rowText}>Switch Profile / Lock POS</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.row, pressed && s.rowPressed]}
            onPress={() => { if (!uploading) { tapLight(); onUploadAvatar(); } }}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel={uploading ? 'Uploading avatar photo' : 'Upload Avatar Photo'}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <ImageIcon size={16} color={colors.textSecondary} strokeWidth={1.7} />
            )}
            <Text style={s.rowText}>{uploading ? 'Uploading…' : 'Upload Avatar Photo'}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.row, pressed && s.rowPressed]}
            onPress={() => { tapLight(); onOpenStockAdjust(); }}
            accessibilityRole="button"
            accessibilityLabel="Adjust Stock"
          >
            <LockIcon size={16} color={colors.textSecondary} strokeWidth={1.7} />
            <Text style={s.rowText}>Adjust Stock</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.row, s.rowDanger, pressed && s.rowPressed]}
            onPress={() => { warning(); onCloseShift(); }}
            accessibilityRole="button"
            accessibilityLabel="Close Shift and Log Out"
          >
            <LogOutIcon size={16} color={colors.danger} strokeWidth={2} />
            <Text style={[s.rowText, { color: colors.danger }]}>Close Shift &amp; Log Out</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 35,
    alignItems: 'flex-start', justifyContent: 'flex-start',
    paddingTop: 70, paddingLeft: 16, paddingRight: 16, paddingBottom: 24,
  },
  overlayPress: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    width: 300, maxWidth: '90%',
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold20,
    borderRadius: 18, overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(184,147,90,0.14)',
    borderWidth: 1, borderColor: colors.borderGold25,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%', height: '100%', borderRadius: 21,
  },
  name: { fontSize: 14.5, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  role: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 9, backgroundColor: colors.chipBg,
    alignItems: 'center', justifyContent: 'center',
  },
  shiftRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.chipBg, borderRadius: 10, padding: 10, marginBottom: 12,
  },
  shiftText: { fontSize: 11.5, color: colors.textMuted, flex: 1 },
  schedSection: {
    backgroundColor: colors.chipBg, borderRadius: 10, padding: 10, marginBottom: 12, gap: 8,
  },
  schedTitle: {
    fontSize: 9.5, fontFamily: fonts.sansExtraBold, letterSpacing: 1.2, textTransform: 'uppercase',
    color: colors.textLabel, marginBottom: 2,
  },
  schedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  schedDate: { fontSize: 11.5, fontFamily: fonts.sansBold, color: colors.textSecondary },
  schedTime: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  rowDanger: {},
  rowPressed: { backgroundColor: 'rgba(184,147,90,0.06)' },
  rowText: { fontSize: 13.5, fontFamily: fonts.sansSemiBold, color: colors.textSecondary, flex: 1 },
  syncBadge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: colors.heatMedText, alignItems: 'center', justifyContent: 'center',
  },
  syncBadgeText: { fontSize: 11, fontFamily: fonts.sansExtraBold, color: colors.screenBg },
});
