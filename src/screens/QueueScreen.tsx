import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { QueueEntry, UserProfile } from '../types';
import { BackHeader } from '../components/Header';
import { QueueList } from '../components/QueueList';
import { VoidModal } from '../components/VoidModal';
import { useBreakpoint } from '../breakpoints';

export function QueueScreen({
  tickets,
  onBack,
  onComplete,
  onFlagVoid,
  onManagerVoid,
  onSelfVoid,
  currentUser,
  onAddItems,
  onAdvanceItem,
  isOffline,
  onOpenOutbox,
}: {
  tickets: QueueEntry[];
  onBack: () => void;
  onComplete: (id: string) => void;
  onFlagVoid: (orderId: string, reasonCode: string, detail: string) => Promise<{ error?: string }>;
  onManagerVoid: (orderId: string, reasonCode: string, detail: string, pin: string) => Promise<{ error?: string }>;
  onSelfVoid: (orderId: string, reasonCode: string, detail: string) => Promise<{ error?: string }>;
  currentUser: UserProfile | null;
  onAddItems: (ticket: QueueEntry) => void;
  onAdvanceItem: (orderItemId: string) => void;
  isOffline: boolean;
  onOpenOutbox?: () => void;
}) {
  const [voidTarget, setVoidTarget] = useState<QueueEntry | null>(null);
  const { gutter } = useBreakpoint();
  const selfVoidEligible = !!voidTarget && !!currentUser && (
    currentUser.role === 'manager' ||
    (!!currentUser.is_senior_barista && voidTarget.total <= (currentUser.self_void_threshold_php ?? 0))
  );

  return (
    <View style={styles.screen}>
      <BackHeader
        title="Order Queue"
        onBack={onBack}
        right={
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tickets.length} active</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]} showsVerticalScrollIndicator={false}>
        <QueueList
          tickets={tickets}
          onComplete={onComplete}
          onVoid={(id) => setVoidTarget(tickets.find((t) => t.id === id) ?? null)}
          onAddItems={(id) => {
            const t = tickets.find((x) => x.id === id);
            if (t) onAddItems(t);
          }}
          onAdvanceItem={onAdvanceItem}
          onOpenOutbox={onOpenOutbox}
        />
      </ScrollView>
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
  screen: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
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
});
