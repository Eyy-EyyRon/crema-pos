import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ClockIcon, LogOutIcon, ReceiptIcon, UserIcon, XIcon, ImageIcon } from '../icons';
import { colors, fonts } from '../theme';
import { Shift, UserProfile } from '../types';

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
  onClose,
  onHistory,
  onCloseShift,
  onLock,
  onUploadAvatar,
}: {
  visible: boolean;
  user: UserProfile;
  shift: Shift | null;
  onClose: () => void;
  onHistory: () => void;
  onCloseShift: () => void;
  onLock: () => void;
  onUploadAvatar: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={s.overlay}>
      <Pressable style={s.overlayPress} onPress={onClose} />
      <View style={s.card}>
        <View style={s.header}>
          <View style={s.avatar}>
            <UserIcon size={20} color={colors.gold} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user.full_name}</Text>
            <Text style={s.role}>{user.role === 'manager' ? 'Manager' : 'Barista'}</Text>
          </View>
          <Pressable onPress={onClose} style={s.closeBtn}>
            <XIcon size={14} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>

        {shift && (
          <View style={s.shiftRow}>
            <ClockIcon size={13} color={colors.textMuted} strokeWidth={2} />
            <Text style={s.shiftText}>
              Shift open {elapsedSince(shift.openedAt)} · Starting cash ₱{shift.startingCash.toFixed(0)}
            </Text>
          </View>
        )}

        <Pressable style={s.row} onPress={onHistory}>
          <ReceiptIcon size={16} color={colors.textSecondary} strokeWidth={1.7} />
          <Text style={s.rowText}>Order History</Text>
        </Pressable>

        <Pressable style={s.row} onPress={onLock}>
          <UserIcon size={16} color={colors.textSecondary} strokeWidth={1.7} />
          <Text style={s.rowText}>Switch Profile / Lock POS</Text>
        </Pressable>

        <Pressable style={s.row} onPress={onUploadAvatar}>
          <ImageIcon size={16} color={colors.textSecondary} strokeWidth={1.7} />
          <Text style={s.rowText}>Upload Avatar Photo</Text>
        </Pressable>

        <Pressable style={[s.row, s.rowDanger]} onPress={onCloseShift}>
          <LogOutIcon size={16} color={colors.danger} strokeWidth={2} />
          <Text style={[s.rowText, { color: colors.danger }]}>Close Shift &amp; Log Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 35,
    alignItems: 'flex-start', justifyContent: 'flex-start',
  },
  overlayPress: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    marginTop: 70, marginLeft: 16,
    width: 300, maxWidth: '90%',
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold20,
    borderRadius: 18, padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(184,147,90,0.14)',
    borderWidth: 1, borderColor: colors.borderGold25,
    alignItems: 'center', justifyContent: 'center',
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
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  rowDanger: {},
  rowText: { fontSize: 13.5, fontFamily: fonts.sansSemiBold, color: colors.textSecondary },
});
