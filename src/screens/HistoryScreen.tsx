import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/Header';
import { ReceiptIcon } from '../icons';
import { SearchBar } from '../components/SearchBar';
import { VoidModal } from '../components/VoidModal';
import { peso0 } from '../format';
import { tapLight } from '../lib/haptics';
import { printReceipt, ReceiptStoreInfo } from '../lib/receipt';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';

type HistoryOrder = {
  id: string;
  no: string;
  status: string;
  orderType: 'dine-in' | 'takeout';
  createdAt: string;
  total: number;
  paymentMethod: string;
  items: [string, number][];
  receiptItems: { qtyName: string; lineStr: string }[];
  restoreItems: { menu_item_id: string; qty: number }[];
};

function paymentMethodLabel(method: string): string {
  if (method === 'cash') return 'Cash';
  if (method === 'gcash') return 'GCash';
  if (method === 'maya') return 'Maya';
  if (method === 'card') return 'Card';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

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
  storeInfo,
}: {
  onBack: () => void;
  onFlagVoid: (orderId: string, reason: string) => Promise<{ error?: string }>;
  onManagerVoid: (orderId: string, reason: string, pin: string) => Promise<{ error?: string }>;
  isOffline: boolean;
  storeInfo: ReceiptStoreInfo;
}) {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [voidTarget, setVoidTarget] = useState<HistoryOrder | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, receipt_number, created_at, total, total_amount, status, order_type, payment_method, order_items(qty, menu_item_id, unit_price, menu_items(name))'
      )
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      setLoadError('Could not load order history. Pull down to try again.');
      setLoading(false);
      return;
    }
    setLoadError('');

    const mapped: HistoryOrder[] = (data ?? []).map((o: any) => ({
      id: o.id,
      no: o.receipt_number ?? o.id.slice(0, 8).toUpperCase(),
      status: o.status,
      orderType: o.order_type,
      createdAt: o.created_at,
      total: Number(o.total ?? o.total_amount ?? 0),
      paymentMethod: o.payment_method ?? 'cash',
      items: (o.order_items ?? []).map((oi: any) => [oi.menu_items?.name ?? 'Item', oi.qty] as [string, number]),
      receiptItems: (o.order_items ?? []).map((oi: any) => ({
        qtyName: `${oi.qty}× ${oi.menu_items?.name ?? 'Item'}`,
        lineStr: peso0(Number(oi.unit_price ?? 0) * oi.qty),
      })),
      restoreItems: (o.order_items ?? []).map((oi: any) => ({ menu_item_id: oi.menu_item_id, qty: oi.qty })),
    }));
    setOrders(mapped);
    setLoading(false);
  }, []);

  const handlePrint = async (o: HistoryOrder) => {
    if (printingId) return;
    tapLight();
    setPrintingId(o.id);
    try {
      await printReceipt(
        {
          no: o.no,
          total: o.total,
          method: paymentMethodLabel(o.paymentMethod),
          items: o.receiptItems,
          showChange: false,
          change: 0,
        },
        o.orderType === 'takeout' ? 'Takeout' : 'Dine-In',
        storeInfo,
        new Date(o.createdAt)
      );
    } catch (e: any) {
      Alert.alert('Print Failed', e?.message || 'Could not print or share the receipt.');
    } finally {
      setPrintingId(null);
    }
  };

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
          {loadError ? (
            <Text style={[s.empty, { color: colors.danger }]}>{loadError}</Text>
          ) : (
            filtered.length === 0 && <Text style={s.empty}>No orders yet today.</Text>
          )}
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
                  <View style={s.cardActions}>
                    <Pressable
                      onPress={() => handlePrint(o)}
                      disabled={printingId === o.id}
                      style={s.printBtn}
                      accessibilityLabel={`Reprint receipt ${o.no}`}
                    >
                      {printingId === o.id ? (
                        <ActivityIndicator color={colors.textSecondary} size="small" />
                      ) : (
                        <ReceiptIcon size={13} color={colors.textSecondary} strokeWidth={2} />
                      )}
                    </Pressable>
                    {canVoid && (
                      <Pressable onPress={() => { tapLight(); setVoidTarget(o); }} style={s.voidBtn}>
                        <Text style={s.voidBtnText}>Void</Text>
                      </Pressable>
                    )}
                  </View>
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
          if (!voidTarget) return {};
          const res = await onFlagVoid(voidTarget.id, reason);
          if (!res.error) { await load(); setVoidTarget(null); }
          return res;
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
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  printBtn: {
    width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.borderGold12,
  },
  voidBtn: {
    backgroundColor: 'rgba(255,107,122,0.1)', borderWidth: 1, borderColor: 'rgba(255,107,122,0.3)',
    borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12,
  },
  voidBtnText: { fontSize: 11.5, fontFamily: fonts.sansBold, color: colors.danger },
});
