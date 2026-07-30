import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { AlertTriangleIcon, SmartphoneIcon, XIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { colors, fonts } from '../theme';

// Static GCash QR popup — the manager uploads their own personal/business
// GCash QR from cafe-web-dashboard's Store Settings; this just displays it
// so the customer can scan and pay directly. No payment API involved.
export function GcashQrModal({
  visible,
  qrUrl,
  onClose,
}: {
  visible: boolean;
  qrUrl: string | null;
  onClose: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (visible) setImageFailed(false);
  }, [visible, qrUrl]);

  if (!visible) return null;

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.iconWrap}>
              <SmartphoneIcon size={16} color={colors.goldLight} strokeWidth={2} />
            </View>
            <Text style={s.title}>Scan to Pay with GCash</Text>
          </View>
          <Pressable onPress={() => { tapLight(); onClose(); }} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>

        {qrUrl && !imageFailed ? (
          <View style={s.qrFrame}>
            <Image
              source={{ uri: qrUrl }}
              style={s.qrImage}
              contentFit="contain"
              cachePolicy="disk"
              onError={() => setImageFailed(true)}
            />
          </View>
        ) : (
          <View style={s.emptyState}>
            <AlertTriangleIcon size={20} color={colors.heatMedText} strokeWidth={2} />
            <Text style={s.emptyText}>
              {qrUrl
                ? "Couldn't load the QR code — check your connection."
                : 'No GCash QR code has been set up yet. Ask your manager to add one in Store Settings.'}
            </Text>
          </View>
        )}

        <Text style={s.hint}>Have the customer scan this with their GCash app, then confirm payment.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 45,
    alignItems: 'center', justifyContent: 'center', padding: 24,
    backgroundColor: colors.overlayStrong,
  },
  card: {
    width: 380, maxWidth: '100%',
    backgroundColor: colors.screenBg,
    borderWidth: 1, borderColor: colors.borderGold18,
    borderRadius: 22, padding: 22,
    alignItems: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(184,147,90,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },

  qrFrame: {
    width: 240, height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: { width: '100%', height: '100%' },

  emptyState: {
    width: 240, minHeight: 240,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold14, borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    padding: 20, gap: 10,
  },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },

  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});
