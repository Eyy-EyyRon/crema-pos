import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { XIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { colors, fonts } from '../theme';
import { QueueEntry, UserProfile } from '../types';
import { QueueList } from './QueueList';
import { VoidModal } from './VoidModal';

export function QueueModal({
  tickets,
  onClose,
  onComplete,
  onFlagVoid,
  onManagerVoid,
  onSelfVoid,
  currentUser,
  onAddItems,
  onAdvanceItem,
  isOffline,
}: {
  tickets: QueueEntry[];
  onClose: () => void;
  onComplete: (id: string) => void;
  onFlagVoid: (orderId: string, reasonCode: string, detail: string) => Promise<{ error?: string }>;
  onManagerVoid: (orderId: string, reasonCode: string, detail: string, pin: string) => Promise<{ error?: string }>;
  onSelfVoid: (orderId: string, reasonCode: string, detail: string) => Promise<{ error?: string }>;
  currentUser: UserProfile | null;
  onAddItems: (ticket: QueueEntry) => void;
  onAdvanceItem: (orderItemId: string) => void;
  isOffline: boolean;
}) {
  const [voidTarget, setVoidTarget] = useState<QueueEntry | null>(null);
  const selfVoidEligible = !!voidTarget && !!currentUser && (
    currentUser.role === 'manager' ||
    (!!currentUser.is_senior_barista && voidTarget.total <= (currentUser.self_void_threshold_php ?? 0))
  );

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Order Queue</Text>
          <View style={styles.headerRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tickets.length} active</Text>
            </View>
            <Pressable onPress={() => { tapLight(); onClose(); }} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <QueueList
            tickets={tickets}
            onComplete={onComplete}
            onVoid={(id) => setVoidTarget(tickets.find((t) => t.id === id) ?? null)}
            onAddItems={(id) => {
              const t = tickets.find((x) => x.id === id);
              if (t) onAddItems(t);
            }}
            onAdvanceItem={onAdvanceItem}
          />
        </ScrollView>
      </View>
      <VoidModal
        visible={!!voidTarget}
        order={voidTarget}
        isOffline={isOffline}
        onClose={() => setVoidTarget(null)}
        onFlagForManager={async (reasonCode, detail) => {
          if (!voidTarget) return {};
          const res = await onFlagVoid(voidTarget.id, reasonCode, detail);
          if (!res.error) setVoidTarget(null);
          return res;
        }}
        onPinSubmit={async (pin, reasonCode, detail) => {
          if (!voidTarget) return {};
          const res = await onManagerVoid(voidTarget.id, reasonCode, detail, pin);
          if (!res.error) setVoidTarget(null);
          return res;
        }}
        selfVoidEligible={selfVoidEligible}
        onSelfVoid={async (reasonCode, detail) => {
          if (!voidTarget) return {};
          const res = await onSelfVoid(voidTarget.id, reasonCode, detail);
          if (!res.error) setVoidTarget(null);
          return res;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.overlayStrong,
  },
  card: {
    width: 440,
    maxWidth: '100%',
    maxHeight: '100%',
    backgroundColor: colors.screenBg,
    borderWidth: 1,
    borderColor: colors.borderGold18,
    borderRadius: 22,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184,147,90,0.1)',
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    backgroundColor: 'rgba(184,147,90,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184,147,90,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    color: colors.gold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
});
