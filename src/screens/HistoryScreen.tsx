import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { VoidModal } from '../components/VoidModal';
import { peso0 } from '../format';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';

type HistoryOrder = {
  id: string;
  no: string;
  status: string;
  orderType: 'dine-in' | 'takeout';
  createdAt: string;
  total: number;
  items: [string, number][];
  restoreItems: { menu_item_id: string; qty: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'In Queue',
  completed: 'Completed',
  voided: 'Voided',
  void_requested: 'Void Pending',
  refunded: 'Refunded',
  partially_refunded: 'Partial Refund',
};

function statusColor(status: string) {
  if (status === 'completed') return colors.success;
  if (status === 'voided' || status === 'refunded') return colors.danger;
  if (status === 'void_requested') return colors.heatMedText;
  return colors.textMuted;
}

export function HistoryScreen({
  onBack,
  onFlagVoid,
  onManagerVoid,
  isOffline,
}: {
  onBack: () => void;
  onFlagVoid: (orderId: string, reason: string) => Promise<void>;
  onManagerVoid: (orderId: string, reason: string, pin: string) => Promise<{ error?: string }>;
  isOffline: boolean;
}) {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [voidTarget, setVoidTarget] = useState<HistoryOrder | null>(null);

  const load = useCallback(async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('orders')
      .select(
        'id, receipt_number, created_at, total, total_amount, status, order_type, order_items(qty, menu_item_id, menu_items(name))'
      )
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    const mapped: HistoryOrder[] = (data ?? []).map((o: any) => ({
      id: o.id,
      no: o.receipt_number ?? o.id.slice(0, 8).toUpperCase(),
      status: o.status,
      orderType: o.order_type,
      createdAt: o.created_at,
      total: Number(o.total ?? o.total_amount ?? 0),
      items: (o.order_items ?? []).map((oi: any) => [oi.menu_items?.name ?? 'Item', oi.qty] as [string, number]),
      restoreItems: (o.order_items ?? []).map((oi: any) => ({ menu_item_id: oi.menu_item_id, qty: oi.qty })),
    }));
    setOrders(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) => o.no.toLowerCase().includes(q));
  }, [orders, search]);

  const voidableTarget = voidTarget
    ? { id: voidTarget.id, no: voidTarget.no, type: (voidTarget.orderType === 'takeout' ? 'Takeout' : 'Dine-In') as 'Dine-In' | 'Takeout', mins: 0, items: voidTarget.items, total: voidTarget.total, restoreItems: voidTarget.restoreItems }
    : null;

  return (
    <View style={s.screen}>
      <BackHeader title="Order History" onBack={onBack} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by receipt #…" />
      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          {filtered.length === 0 && <Text style={s.empty}>No orders yet today.</Text>}
          {filtered.map((o) => {
            const canVoid = o.status === 'pending' || o.status === 'completed';
            const itemsStr = o.items.map(([n, qt]) => `${qt}× ${n}`).join(', ');
            return (
              <View key={o.id} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.no}>{o.no}</Text>
                  <Text style={s.total}>{peso0(o.total)}</Text>
                </View>
                <Text style={s.items} numberOfLines={2}>{itemsStr}</Text>
                <View style={s.cardBottom}>
                  <Text style={[s.status, { color: statusColor(o.status) }]}>{STATUS_LABEL[o.status] ?? o.status}</Text>
                  {canVoid && (
                    <Pressable onPress={() => setVoidTarget(o)} style={s.voidBtn}>
                      <Text style={s.voidBtnText}>Void</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
      <VoidModal
        visible={!!voidableTarget}
        order={voidableTarget}
        isOffline={isOffline}
        onClose={() => setVoidTarget(null)}
        onFlagForManager={async (reason) => {
          if (voidTarget) { await onFlagVoid(voidTarget.id, reason); await load(); }
          setVoidTarget(null);
        }}
        onPinSubmit={async (pin, reason) => {
          if (!voidTarget) return {};
          const res = await onManagerVoid(voidTarget.id, reason, pin);
          if (!res.error) { setVoidTarget(null); await load(); }
          return res;
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingHorizontal: 18, paddingBottom: 24 },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  card: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderGold12,
    borderRadius: 15, padding: 15, marginBottom: 11,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  no: { fontSize: 14.5, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  total: { fontSize: 14, fontFamily: fonts.sansExtraBold, color: colors.goldLight },
  items: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { fontSize: 11.5, fontFamily: fonts.sansBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  voidBtn: {
    backgroundColor: 'rgba(255,107,122,0.1)', borderWidth: 1, borderColor: 'rgba(255,107,122,0.3)',
    borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12,
  },
  voidBtnText: { fontSize: 11.5, fontFamily: fonts.sansBold, color: colors.danger },
});
