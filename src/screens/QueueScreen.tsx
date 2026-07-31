import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { QueueEntry } from '../types';
import { BackHeader } from '../components/Header';
import { QueueList } from '../components/QueueList';
import { VoidModal } from '../components/VoidModal';

export function QueueScreen({
  tickets,
  onBack,
  onComplete,
  onFlagVoid,
  onManagerVoid,
  onAddItems,
  isOffline,
}: {
  tickets: QueueEntry[];
  onBack: () => void;
  onComplete: (id: string) => void;
  onFlagVoid: (orderId: string, reason: string) => Promise<{ error?: string }>;
  onManagerVoid: (orderId: string, reason: string, pin: string) => Promise<{ error?: string }>;
  onAddItems: (ticket: QueueEntry) => void;
  isOffline: boolean;
}) {
  const [voidTarget, setVoidTarget] = useState<QueueEntry | null>(null);

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
      <ScrollView contentContainerStyle={styles.content}>
        <QueueList
          tickets={tickets}
          onComplete={onComplete}
          onVoid={(id) => setVoidTarget(tickets.find((t) => t.id === id) ?? null)}
          onAddItems={(id) => {
            const t = tickets.find((x) => x.id === id);
            if (t) onAddItems(t);
          }}
        />
      </ScrollView>
      <VoidModal
        visible={!!voidTarget}
        order={voidTarget}
        isOffline={isOffline}
        onClose={() => setVoidTarget(null)}
        onFlagForManager={async (reason) => {
          if (!voidTarget) return {};
          const res = await onFlagVoid(voidTarget.id, reason);
          if (!res.error) setVoidTarget(null);
          return res;
        }}
        onPinSubmit={async (pin, reason) => {
          if (!voidTarget) return {};
          const res = await onManagerVoid(voidTarget.id, reason, pin);
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
    paddingHorizontal: 18,
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
