import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { XIcon } from '../icons';
import { tapLight, tapMedium } from '../lib/haptics';
import { colors, fonts } from '../theme';

// Scans a loyalty or gift card's printed/emailed QR and hands the raw decoded string back to
// the caller (handleQrScanned() in useCremaPos.ts owns routing/validating the payload per card
// type) — this component only knows how to get a barcode payload off the camera, not what a
// card code looks like.
export function QrScannerModal({
  visible,
  target,
  onScanned,
  onClose,
}: {
  visible: boolean;
  target: 'loyalty' | 'gift_card';
  onScanned: (data: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  const cardLabel = target === 'gift_card' ? 'gift card' : "loyalty card";

  // Mirrors GcashQrModal's own visible-reset pattern — this component stays mounted (returning
  // null while hidden) rather than unmounting, so its local state needs an explicit reset each
  // time it reopens instead of relying on remount to clear it.
  useEffect(() => {
    if (visible) setHandled(false);
  }, [visible]);

  if (!visible) return null;

  const handleScan = ({ data }: { data: string }) => {
    if (handled) return;
    setHandled(true);
    tapMedium();
    onScanned(data);
  };

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <View style={s.header}>
          <Text style={s.title}>{target === 'gift_card' ? 'Scan Gift Card' : 'Scan Loyalty Card'}</Text>
          <Pressable onPress={() => { tapLight(); onClose(); }} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>

        {!permission ? (
          <View style={s.cameraFrame} />
        ) : !permission.granted ? (
          <View style={s.permissionState}>
            <Text style={s.permissionText}>
              {permission.canAskAgain
                ? `Camera access is needed to scan a ${cardLabel}'s QR code.`
                : 'Camera access was denied. Enable it for Crema in your device Settings to scan cards.'}
            </Text>
            {permission.canAskAgain && (
              <Pressable onPress={() => { tapLight(); requestPermission(); }} style={s.grantBtn}>
                <Text style={s.grantBtnText}>Grant Camera Access</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={s.cameraFrame}>
            <CameraView
              style={s.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handled ? undefined : handleScan}
            />
          </View>
        )}

        <Text style={s.hint}>Point the camera at the QR code on the customer's {cardLabel}.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 48,
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
  title: { fontSize: 15, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },

  cameraFrame: {
    width: 240, height: 240,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: { flex: 1 },

  permissionState: {
    width: 240, minHeight: 240,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold14, borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    padding: 20, gap: 14,
  },
  permissionText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  grantBtn: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  grantBtnText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.screenBg },

  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});
