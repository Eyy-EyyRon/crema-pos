import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DownloadIcon, XIcon } from '../icons';
import { downloadAndInstallApk } from '../lib/appUpdate';
import { tapLight, tapMedium } from '../lib/haptics';
import { colors, fonts } from '../theme';

type Status = 'idle' | 'downloading' | 'installing' | 'error';

// Android-only self-update prompt — see lib/appUpdate.ts for why iOS can't do this. Stays
// mounted across dismiss/reappear like OfflineBanner, but (unlike OfflineBanner) is interactive:
// it owns its own download/install lifecycle rather than just reporting state up.
export function UpdateBanner({
  version,
  url,
  onDismiss,
}: {
  version: string;
  url: string;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const handleUpdate = async () => {
    tapMedium();
    setStatus('downloading');
    setProgress(0);
    try {
      await downloadAndInstallApk(url, setProgress);
      setStatus('installing');
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e?.message ?? 'Update failed.');
    }
  };

  const busy = status === 'downloading' || status === 'installing';
  const label = status === 'downloading' ? `Downloading update… ${Math.round(progress * 100)}%`
    : status === 'installing' ? 'Opening installer…'
    : status === 'error' ? `Update failed — ${errorMessage}`
    : `Update available — v${version}`;

  return (
    <View style={[s.banner, { paddingTop: insets.top + 6 }]}>
      <View style={s.row}>
        <DownloadIcon size={13} color={colors.screenBg} strokeWidth={2.2} />
        <Text style={s.text} numberOfLines={1}>{label}</Text>
      </View>
      <View style={s.actions}>
        {status === 'downloading' && <ActivityIndicator size="small" color={colors.screenBg} />}
        {!busy && (
          <Pressable onPress={handleUpdate} style={s.actionBtn} accessibilityRole="button" accessibilityLabel="Download and install update">
            <Text style={s.actionText}>{status === 'error' ? 'Retry' : 'Update Now'}</Text>
          </Pressable>
        )}
        {!busy && (
          <Pressable onPress={() => { tapLight(); onDismiss(); }} style={s.dismissBtn} accessibilityRole="button" accessibilityLabel="Dismiss">
            <XIcon size={13} color={colors.screenBg} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.gold,
    paddingBottom: 8,
    paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  text: { flex: 1, fontSize: 11.5, fontFamily: fonts.sansExtraBold, color: colors.screenBg, letterSpacing: 0.2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { backgroundColor: colors.screenBg, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  actionText: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.gold },
  dismissBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
});
