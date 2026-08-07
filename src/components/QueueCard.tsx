import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { peso0 } from '../format';
import { AlertTriangleIcon, BanIcon, CheckIcon, PlusIcon, WifiOffIcon } from '../icons';
import { tapMedium, warning } from '../lib/haptics';
import { confirmAsync } from '../lib/crossAlert';
import { colors, fonts } from '../theme';
import { QueueEntry } from '../types';

function heat(mins: number) {
  if (mins >= 15) return { border: colors.heatHighBorder, bw: 1.5, bg: colors.heatHighBg, col: colors.heatHighText, urgent: true, warm: false };
  if (mins >= 8) return { border: colors.heatMedBorder, bw: 1.5, bg: colors.heatMedBg, col: colors.heatMedText, urgent: false, warm: true };
  return { border: colors.borderGold12, bw: 1, bg: 'transparent', col: colors.textMuted, urgent: false, warm: false };
}

const PREP_STATUS_LABEL: Record<'pending' | 'in_progress' | 'ready', string> = {
  pending: 'Pending',
  in_progress: 'Making',
  ready: 'Ready',
};

function prepStatusColors(status: 'pending' | 'in_progress' | 'ready' | undefined) {
  if (status === 'ready') return { bg: colors.successBg16, border: colors.successBorder35, text: colors.success };
  if (status === 'in_progress') return { bg: colors.heatMedBg, border: 'rgba(176,122,32,0.3)', text: colors.heatMedText };
  return { bg: 'rgba(255,255,255,0.04)', border: colors.borderGold12, text: colors.textMuted };
}

interface QueueCardProps {
  ticket: QueueEntry;
  onComplete: () => void;
  onVoid: () => void;
  onAddItems: () => void;
  onAdvanceItem: (orderItemId: string) => void;
  /** Opens the offline outbox (Retry/Delete) — a ticket stuck in `pendingSync` forever (its
   *  submission keeps failing, e.g. offline for good, or a real server-side rejection) has no
   *  other way to get unstuck, since every action here is disabled while unsynced. */
  onOpenOutbox?: () => void;
}

export function QueueCard({ ticket, onComplete, onVoid, onAddItems, onAdvanceItem, onOpenOutbox }: QueueCardProps) {
  const h = heat(ticket.mins);
  const timeAgo = ticket.mins < 1 ? 'Just now' : `${ticket.mins} min ago`;
  const timeLabel = h.urgent ? `Urgent · ${timeAgo}` : timeAgo;
  const locked = !!ticket.pendingSync;

  const confirmComplete = async () => {
    tapMedium();
    const confirmed = await confirmAsync(`Complete order ${ticket.no}?`, 'This removes the ticket from the queue.', 'Complete');
    if (confirmed) onComplete();
  };

  return (
    <View style={[styles.card, { borderColor: h.border, borderWidth: h.bw }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.no}>{ticket.no}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{ticket.type}</Text>
          </View>
        </View>
        <View
          style={[
            styles.timeBadge,
            { backgroundColor: h.bg, paddingVertical: h.bg === 'transparent' ? 0 : 3, paddingHorizontal: h.bg === 'transparent' ? 0 : 9 },
          ]}
          accessibilityLabel={`Placed ${timeAgo}${h.urgent ? ', urgent' : h.warm ? ', getting old' : ''}`}
        >
          {(h.warm || h.urgent) && <AlertTriangleIcon size={11} color={h.col} strokeWidth={2.2} />}
          <Text style={[styles.time, { color: h.col }]}>{timeLabel}</Text>
        </View>
      </View>
      {!!ticket.customerName && <Text style={styles.customerName}>For: {ticket.customerName}</Text>}
      <View style={styles.itemsList}>
        {ticket.items.map((it, i) => {
          const pc = prepStatusColors(it.prepStatus);
          const canAdvance = !!it.id && !locked;
          return (
            <Pressable
              key={it.id ?? i}
              style={styles.itemLine}
              onPress={canAdvance ? () => { tapMedium(); onAdvanceItem(it.id!); } : undefined}
              disabled={!canAdvance}
              accessibilityRole={canAdvance ? 'button' : undefined}
              accessibilityLabel={canAdvance ? `${it.qty}× ${it.name}, ${PREP_STATUS_LABEL[it.prepStatus ?? 'pending']}, tap to advance` : undefined}
            >
              <View style={styles.itemLineTop}>
                <Text style={styles.itemMain}>{it.qty}× {it.name}</Text>
                {canAdvance && (
                  <View style={[styles.prepPill, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                    <Text style={[styles.prepPillText, { color: pc.text }]}>{PREP_STATUS_LABEL[it.prepStatus ?? 'pending']}</Text>
                  </View>
                )}
              </View>
              {!!it.mods && <Text style={styles.itemMods}>{it.mods}</Text>}
            </Pressable>
          );
        })}
      </View>
      {locked && (
        <Pressable
          style={styles.syncBadge}
          onPress={onOpenOutbox ? () => { tapMedium(); onOpenOutbox(); } : undefined}
          disabled={!onOpenOutbox}
          accessibilityRole={onOpenOutbox ? 'button' : undefined}
          accessibilityLabel={onOpenOutbox ? 'Not synced yet — open outbox to retry or remove' : undefined}
        >
          <WifiOffIcon size={11} color={colors.heatMedText} strokeWidth={2} />
          <Text style={styles.syncBadgeText}>{onOpenOutbox ? 'Not synced yet — tap to retry or remove' : 'Not synced yet — saved on this device'}</Text>
        </Pressable>
      )}
      <View style={styles.footerRow}>
        <Text style={styles.total}>{peso0(ticket.total)}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => { tapMedium(); onAddItems(); }}
            style={[styles.addBtn, locked && styles.disabledBtn]}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel={`Add items to order ${ticket.no}`}
          >
            <PlusIcon size={13} color={colors.gold} strokeWidth={2.4} />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
          <Pressable
            onPress={() => { warning(); onVoid(); }}
            style={[styles.voidBtn, locked && styles.disabledBtn]}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel={`Void order ${ticket.no}`}
          >
            <BanIcon size={13} color={colors.danger} strokeWidth={2} />
            <Text style={styles.voidText}>Void</Text>
          </Pressable>
          <Pressable
            onPress={confirmComplete}
            style={[styles.completeBtn, locked && styles.disabledBtn]}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel={`Mark order ${ticket.no} complete`}
          >
            <CheckIcon size={14} color={colors.success} strokeWidth={2.4} />
            <Text style={styles.completeText}>Complete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 15,
    padding: 15,
    marginBottom: 11,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  no: {
    fontSize: 15,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
  },
  typeBadge: {
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  time: {
    fontSize: 11.5,
    fontFamily: fonts.sansBold,
  },
  customerName: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    color: colors.goldLight,
    marginBottom: 8,
  },
  itemsList: {
    marginBottom: 13,
    gap: 4,
  },
  itemLine: {
    gap: 1,
  },
  itemLineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemMain: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  prepPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  prepPillText: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.3,
  },
  itemMods: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  total: {
    fontSize: 13,
    fontFamily: fonts.sansExtraBold,
    color: colors.goldLight,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(184,147,90,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184,147,90,0.3)',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addText: {
    fontSize: 12.5,
    fontFamily: fonts.sansBold,
    color: colors.gold,
  },
  voidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,107,122,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,122,0.3)',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  voidText: {
    fontSize: 12.5,
    fontFamily: fonts.sansBold,
    color: colors.danger,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successBg16,
    borderWidth: 1,
    borderColor: colors.successBorder35,
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  completeText: {
    fontSize: 12.5,
    fontFamily: fonts.sansBold,
    color: colors.success,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.heatMedBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(176,122,32,0.25)',
  },
  syncBadgeText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.heatMedText,
  },
});
