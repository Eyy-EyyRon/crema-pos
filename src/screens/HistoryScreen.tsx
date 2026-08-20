import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/Header';
import { ReceiptIcon } from '../icons';
import { RefundModal } from '../components/RefundModal';
import { SearchBar } from '../components/SearchBar';
import { VoidModal } from '../components/VoidModal';
import { peso0 } from '../format';
import { notify } from '../lib/crossAlert';
import { tapLight } from '../lib/haptics';
import { modsDisplayString } from '../lib/posOrder';
import { printReceipt, ReceiptStoreInfo } from '../lib/receipt';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';
import { QueueItemLine } from '../types';
import { useBreakpoint } from '../breakpoints';

type HistoryOrder = {
  id: string;
  no: string;
  status: string;
  orderType: 'dine-in' | 'takeout';
  createdAt: string;
  total: number;
  paymentMethod: string;
  gcashReference: string | null;
  customerName: string | null;
  refundAmount: number | null;
  baristaId: string;
  items: QueueItemLine[];
  receiptItems: { qtyName: string; lineStr: string; modsStr?: string }[];
  restoreItems: { menu_item_id: string; qty: number }[];
};

type DateRange = 'today' | 'week' | 'month' | 'all';

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
];

function rangeStartIso(range: DateRange): string | null {
  const start = new Date();
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    start.setDate(start.getDate() - 7);
  } else if (range === 'month') {
    start.setDate(start.getDate() - 30);
  } else {
    return null;
  }
  return start.toISOString();
}

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
  onManagerRefund,
  isOffline,
  storeInfo,
}: {
  onBack: () => void;
  onFlagVoid: (orderId: string, reasonCode: string, detail: string) => Promise<{ error?: string }>;
  onManagerVoid: (orderId: string, reasonCode: string, detail: string, pin: string) => Promise<{ error?: string }>;
  onManagerRefund: (orderId: string, amount: number, reasonCode: string, detail: string, pin: string) => Promise<{ error?: string }>;
  isOffline: boolean;
  storeInfo: ReceiptStoreInfo;
}) {
  const { isTablet, gutter, width } = useBreakpoint();
  const twoCol = width >= 768;
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [voidTarget, setVoidTarget] = useState<HistoryOrder | null>(null);
  const [refundTarget, setRefundTarget] = useState<HistoryOrder | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const load = useCallback(async (range: DateRange) => {
    const startIso = rangeStartIso(range);

    let query = supabase
      .from('orders')
      .select(
        'id, receipt_number, created_at, total, total_amount, status, order_type, payment_method, gcash_reference, customer_name, refund_amount, barista_id, order_items(qty, menu_item_id, unit_price, modifiers_json, special_note, menu_items(name))'
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (startIso) query = query.gte('created_at', startIso);

    const { data, error } = await query;

    if (error) {
      setLoadError('Could not load order history. Pull down to try again.');
      setLoading(false);
      setRefreshing(false);
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
      gcashReference: o.gcash_reference ?? null,
      customerName: o.customer_name ?? null,
      refundAmount: o.refund_amount !== null && o.refund_amount !== undefined ? Number(o.refund_amount) : null,
      baristaId: o.barista_id,
      items: (o.order_items ?? []).map((oi: any) => ({
        name: oi.menu_items?.name ?? 'Item',
        qty: oi.qty,
        mods: modsDisplayString(oi.modifiers_json, oi.special_note),
      })),
      receiptItems: (o.order_items ?? []).map((oi: any) => ({
        qtyName: `${oi.qty}× ${oi.menu_items?.name ?? 'Item'}`,
        lineStr: peso0(Number(oi.unit_price ?? 0) * oi.qty),
        modsStr: modsDisplayString(oi.modifiers_json, oi.special_note),
      })),
      restoreItems: (o.order_items ?? []).map((oi: any) => ({ menu_item_id: oi.menu_item_id, qty: oi.qty })),
    }));
    setOrders(mapped);
    setLoading(false);
    setRefreshing(false);
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
          customerName: o.customerName,
          gcashReference: o.paymentMethod === 'gcash' ? o.gcashReference : null,
        },
        o.orderType === 'takeout' ? 'Takeout' : 'Dine-In',
        storeInfo,
        new Date(o.createdAt)
      );
    } catch (e: any) {
      notify('Print Failed', e?.message || 'Could not print or share the receipt.');
    } finally {
      setPrintingId(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    load(dateRange);
  }, [load, dateRange]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(dateRange);
  }, [load, dateRange]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.no.toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q)) ||
        (o.customerName ?? '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const voidableTarget = voidTarget
    ? { id: voidTarget.id, no: voidTarget.no, type: (voidTarget.orderType === 'takeout' ? 'Takeout' : 'Dine-In') as 'Dine-In' | 'Takeout', mins: 0, items: voidTarget.items, total: voidTarget.total, restoreItems: voidTarget.restoreItems, barista_id: voidTarget.baristaId }
    : null;

  return (
    <View style={s.screen}>
      <BackHeader title="Order History" onBack={onBack} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by receipt # or item…" />
      <View style={[s.rangeRow, { paddingHorizontal: gutter }, isTablet && s.rangeRowTablet]}>
        {DATE_RANGE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => { tapLight(); setDateRange(opt.key); }}
            style={({ pressed }) => [s.rangeChip, dateRange === opt.key && s.rangeChipActive, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityState={{ selected: dateRange === opt.key }}
            accessibilityLabel={opt.label}
          >
            <Text style={[s.rangeChipText, dateRange === opt.key && s.rangeChipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.content, { paddingHorizontal: gutter }, twoCol && s.contentTablet]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
          {loadError ? (
            <Text style={[s.empty, { color: colors.danger }]}>{loadError}</Text>
          ) : (
            filtered.length === 0 && <Text style={s.empty}>No orders found for this range.</Text>
          )}
          {filtered.map((o) => {
            const canVoid = o.status === 'pending' || o.status === 'completed';
            const canRefund = o.status === 'completed';
            const itemsStr = o.items.map((it) => `${it.qty}× ${it.name}`).join(', ');
            return (
              <View key={o.id} style={[s.card, isTablet && s.cardTablet, twoCol && { width: '48%' }]}>
                <View style={s.cardTop}>
                  <Text style={[s.no, isTablet && s.noTablet]}>{o.no}</Text>
                  <Text style={[s.total, isTablet && s.totalTablet]}>{peso0(o.total)}</Text>
                </View>
                {!!o.customerName && <Text style={s.customerName}>For: {o.customerName}</Text>}
                <Text style={[s.items, isTablet && s.itemsTablet]} numberOfLines={2}>{itemsStr}</Text>
                {!!o.refundAmount && (
                  <Text style={s.refundLine}>Refunded − {peso0(o.refundAmount)}</Text>
                )}
                <View style={s.cardBottom}>
                  <Text style={[s.status, { color: statusColor(o.status) }]}>{STATUS_LABEL[o.status] ?? o.status}</Text>
                  <View style={s.cardActions}>
                    <Pressable
                      onPress={() => handlePrint(o)}
                      disabled={printingId === o.id}
                      style={({ pressed }) => [s.printBtn, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={printingId === o.id ? `Printing receipt ${o.no}` : `Reprint receipt ${o.no}`}
                    >
                      {printingId === o.id ? (
                        <ActivityIndicator color={colors.textSecondary} size="small" />
                      ) : (
                        <ReceiptIcon size={13} color={colors.textSecondary} strokeWidth={2} />
                      )}
                    </Pressable>
                    {canRefund && (
                      <Pressable
                        onPress={() => { tapLight(); setRefundTarget(o); }}
                        style={({ pressed }) => [s.refundBtn, pressed && { opacity: 0.7 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Refund order ${o.no}`}
                      >
                        <Text style={s.refundBtnText}>Refund</Text>
                      </Pressable>
                    )}
                    {canVoid && (
                      <Pressable
                        onPress={() => { tapLight(); setVoidTarget(o); }}
                        style={({ pressed }) => [s.voidBtn, pressed && { opacity: 0.7 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Void order ${o.no}`}
                      >
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
        onFlagForManager={async (reasonCode, detail) => {
          if (!voidTarget) return {};
          const res = await onFlagVoid(voidTarget.id, reasonCode, detail);
          if (!res.error) { await load(dateRange); setVoidTarget(null); }
          return res;
        }}
        onPinSubmit={async (pin, reasonCode, detail) => {
          if (!voidTarget) return {};
          const res = await onManagerVoid(voidTarget.id, reasonCode, detail, pin);
          if (!res.error) { setVoidTarget(null); await load(dateRange); }
          return res;
        }}
      />
      <RefundModal
        visible={!!refundTarget}
        order={refundTarget ? { id: refundTarget.id, no: refundTarget.no, total: refundTarget.total } : null}
        isOffline={isOffline}
        onClose={() => setRefundTarget(null)}
        onSubmit={async (amount, reasonCode, detail, pin) => {
          if (!refundTarget) return {};
          const res = await onManagerRefund(refundTarget.id, amount, reasonCode, detail, pin);
          if (!res.error) { setRefundTarget(null); await load(dateRange); }
          return res;
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 24 },
  contentTablet: { paddingBottom: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 40, width: '100%' },
  rangeRow: { flexDirection: 'row', gap: 8, paddingBottom: 10, flexWrap: 'wrap' },
  rangeRowTablet: { paddingBottom: 12, gap: 10 },
  rangeChip: {
    paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1,
    backgroundColor: 'rgba(26,42,62,0.4)', borderColor: colors.borderGold12,
  },
  rangeChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  rangeChipText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.textMuted },
  rangeChipTextActive: { color: colors.screenBg, fontFamily: fonts.sansBold },
  card: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderGold12,
    borderRadius: 15, padding: 15, marginBottom: 11,
  },
  cardTablet: {
    padding: 17,
    marginBottom: 13,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  no: { fontSize: 14.5, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  noTablet: { fontSize: 16 },
  total: { fontSize: 14, fontFamily: fonts.sansExtraBold, color: colors.goldLight },
  totalTablet: { fontSize: 15 },
  customerName: { fontSize: 12, fontFamily: fonts.sansBold, color: colors.goldLight, marginBottom: 6 },
  items: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  itemsTablet: { fontSize: 13, lineHeight: 19 },
  refundLine: { fontSize: 11.5, fontFamily: fonts.sansSemiBold, color: colors.heatMedText, marginBottom: 10, marginTop: -4 },
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
  refundBtn: {
    backgroundColor: colors.heatMedBg, borderWidth: 1, borderColor: 'rgba(176,122,32,0.3)',
    borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12,
  },
  refundBtnText: { fontSize: 11.5, fontFamily: fonts.sansBold, color: colors.heatMedText },
});
