import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { XIcon } from '../icons';
import { tapLight, tapMedium } from '../lib/haptics';
import { colors, fonts } from '../theme';

// Captures a photo of the customer's own phone screen (their GCash payment-confirmation view)
// and hands the local file uri back to the caller — same "this component only knows how to get
// a picture off the camera, not what to do with it" boundary as QrScannerModal. Unlike that
// component there's nothing to auto-detect here, so this uses an explicit shutter button instead
// of onBarcodeScanned.
export function GcashProofCameraModal({
  visible,
  onCaptured,
  onClose,
}: {
  visible: boolean;
  onCaptured: (uri: string, format: 'jpg' | 'png') => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!visible) return null;

  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    tapMedium();
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) {
        onCaptured(photo.uri, photo.format === 'png' ? 'png' : 'jpg');
        onClose();
      }
    } catch (e) {
      console.warn('GCash proof capture failed:', e);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <View style={s.header}>
          <Text style={s.title}>Photograph Payment Confirmation</Text>
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
                ? "Camera access is needed to photograph the customer's payment confirmation screen."
                : 'Camera access was denied. Enable it for Crema in your device Settings to capture this photo.'}
            </Text>
            {permission.canAskAgain && (
              <Pressable onPress={() => { tapLight(); requestPermission(); }} style={s.grantBtn}>
                <Text style={s.grantBtnText}>Grant Camera Access</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={s.cameraFrame}>
            <CameraView ref={cameraRef} style={s.camera} facing="back" />
          </View>
        )}

        {permission?.granted && (
          <Pressable onPress={handleCapture} disabled={capturing} style={s.shutterBtn} accessibilityRole="button" accessibilityLabel="Take photo">
            <View style={s.shutterInner} />
          </Pressable>
        )}

        <Text style={s.hint}>Point the camera at the customer's phone showing their GCash payment confirmation.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 49,
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

  shutterBtn: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 3, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 16,
  },
  shutterInner: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.gold },

  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});
