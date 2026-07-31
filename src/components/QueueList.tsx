import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { QueueEntry } from '../types';
import { QueueCard } from './QueueCard';

export function QueueList({
  tickets,
  onComplete,
  onVoid,
  onAddItems,
}: {
  tickets: QueueEntry[];
  onComplete: (id: string) => void;
  onVoid: (id: string) => void;
  onAddItems: (id: string) => void;
}) {
  if (tickets.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>All caught up</Text>
        <Text style={styles.emptySub}>No orders waiting in the queue.</Text>
      </View>
    );
  }
  return (
    <>
      {tickets.map((t) => (
        <QueueCard key={t.id} ticket={t} onComplete={() => onComplete(t.id)} onVoid={() => onVoid(t.id)} onAddItems={() => onAddItems(t.id)} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingVertical: 70,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fonts.sansBold,
    color: colors.textMuted,
  },
  emptySub: {
    fontSize: 12.5,
    color: colors.textLabel,
    marginTop: 5,
  },
});
