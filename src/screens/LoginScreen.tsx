import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ForgotPinModal } from '../components/ForgotPinModal';
import { PinPad, PinPadKey } from '../components/PinPad';
import { AlertCircleIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { readProfilesCache, writeProfilesCache } from '../lib/deviceCache';
import { requestPinReset } from '../lib/pinReset';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';
import { UserProfile } from '../types';
import { useBreakpoint } from '../breakpoints';

const LAST_USER_KEY = 'crema_last_user';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  const { isTablet, isCompact } = useBreakpoint();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={s.clockWrap}>
      <Text style={[s.clockTime, isTablet && s.clockTimeTablet, isCompact && s.clockTimeCompact]}>{timeString}</Text>
      <Text style={[s.clockDate, isTablet && s.clockDateTablet, isCompact && { fontSize: 10 }]}>{dateString}</Text>
    </View>
  );
}

function ProfileAvatar({
  name,
  uri,
  size,
  highlighted,
}: {
  name: string;
  uri?: string | null;
  size: number;
  highlighted: boolean;
}) {
  const ring = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: highlighted ? 2.5 : 1,
    borderColor: highlighted ? colors.goldLight : colors.borderGold25,
    backgroundColor: colors.cardBg,
  };

  if (uri) {
    return <Image source={{ uri }} cachePolicy="disk" style={ring} />;
  }

  return (
    <View style={[ring, s.initialsCircle]}>
      <Text style={[s.initials, { fontSize: Math.round(size * 0.34) }]}>{initials(name)}</Text>
    </View>
  );
}

function AbstractBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <View style={[s.circle, { top: -150, left: -150, backgroundColor: 'rgba(184,147,90,0.02)', width: 600, height: 600 }]} />
      <View style={[s.circle, { bottom: -200, right: -100, backgroundColor: 'rgba(58,107,138,0.02)', width: 800, height: 800 }]} />
      <View style={[s.circle, { bottom: 100, left: -250, backgroundColor: 'rgba(107,58,92,0.02)', width: 500, height: 500 }]} />
    </View>
  );
}

export function LoginScreen({
  onLogin,
}: {
  onLogin: (profileId: string, opts: { pin?: string; biometric?: boolean }, profile: UserProfile) => Promise<{ error?: string }>;
}) {
  const { isTablet, width, height, isLandscape, gutter, isCompact } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [resetTick, setResetTick] = useState(0);
  const [bioBusy, setBioBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [forgotPinVisible, setForgotPinVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const lastIdPromise = AsyncStorage.getItem(LAST_USER_KEY);
      const hwPromise = LocalAuthentication.hasHardwareAsync();
      const enrolledPromise = LocalAuthentication.isEnrolledAsync();

      let fetchedProfiles: UserProfile[] | null = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url, is_senior_barista, self_void_threshold_php')
          .eq('role', 'barista')
          .neq('status', 'inactive');
        
        if (!error && data) {
          fetchedProfiles = data as UserProfile[];
          await writeProfilesCache(fetchedProfiles);
        }
      } catch (e) {
        // network error
      }

      if (!fetchedProfiles) {
        fetchedProfiles = await readProfilesCache();
      }

      const [lastId, hw, enrolled] = await Promise.all([lastIdPromise, hwPromise, enrolledPromise]);

      setProfiles(fetchedProfiles ?? []);
      setLastUserId(lastId);
      setBiometricAvailable(hw && enrolled);
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (a.id === lastUserId) return -1;
      if (b.id === lastUserId) return 1;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [profiles, lastUserId]);

  const selectProfile = (p: UserProfile) => {
    tapLight();
    setSelected(p);
    setError('');
  };

  const handlePinComplete = async (pin: string) => {
    if (!selected) return;
    setPinBusy(true);
    const res = await onLogin(selected.id, { pin }, selected);
    setPinBusy(false);
    if (res.error) {
      setError(res.error);
      setResetTick((t) => t + 1);
      return;
    }
    await AsyncStorage.setItem(LAST_USER_KEY, selected.id);
  };

  const handleBiometric = async () => {
    if (!selected || bioBusy) return;
    setBioBusy(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: `Log in as ${selected.full_name}` });
      if (result.success) {
        const res = await onLogin(selected.id, { biometric: true }, selected);
        if (res.error) { setError(res.error); setResetTick((t) => t + 1); }
        else await AsyncStorage.setItem(LAST_USER_KEY, selected.id);
      }
    } finally {
      setBioBusy(false);
    }
  };

  const landscapeAuth = isLandscape && height < 560;
  const pinGap = isCompact ? 10 : 16;
  const pinByWidth = Math.floor((Math.min(width, 440) - gutter * 2 - 40 - pinGap * 2) / 3);
  const chromeH = insets.top + insets.bottom + (landscapeAuth ? 72 : 220);
  const pinByHeight = Math.floor((height - chromeH - 36) / 4.6);
  const pinKeySize = Math.min(isTablet ? 76 : 64, Math.max(36, pinByWidth), Math.max(36, pinByHeight));
  const avatarSize = isTablet ? 96 : 80;
  const tileWidth = isTablet ? 140 : 124;

  return (
    <View style={[s.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom, minHeight: height }]}>
      <AbstractBackground />

      <View style={[s.body, landscapeAuth && s.bodyLandscape]}>
        <View style={[s.intro, landscapeAuth && s.introLandscape]}>
          <LiveClock />
          <View style={[s.brandBlock, landscapeAuth && { marginTop: 16, marginBottom: 0 }]}>
            <Text style={[s.brand, isTablet && s.brandTablet, isCompact && s.brandCompact]}>CREMA</Text>
            <Text style={s.brandSub}>COFFEE &amp; ICE CREAM</Text>
          </View>
        </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : !selected ? (
        <View style={s.picker}>
          <Text style={[s.prompt, isTablet && s.promptTablet]}>Who's ringing up orders?</Text>
          <ScrollView
            contentContainerStyle={[s.grid, { paddingHorizontal: gutter, gap: isTablet ? 28 : 22 }]}
            showsVerticalScrollIndicator={false}
          >
            {sorted.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [s.tile, { width: tileWidth }, pressed && { opacity: 0.7 }]}
                onPress={() => selectProfile(p)}
                accessibilityRole="button"
                accessibilityLabel={p.id === lastUserId ? `${p.full_name}, last used` : p.full_name}
              >
                <ProfileAvatar name={p.full_name} uri={p.avatar_url} size={avatarSize} highlighted={p.id === lastUserId} />
                <Text
                  style={[s.tileName, isTablet && s.tileNameTablet, p.id === lastUserId && { color: colors.goldBrightText }]}
                  numberOfLines={2}
                >
                  {p.full_name}
                </Text>
                {p.id === lastUserId && (
                  <View style={s.lastUsedBadge}>
                    <Text style={s.tileLast}>Last used</Text>
                  </View>
                )}
              </Pressable>
            ))}
            {sorted.length === 0 && <Text style={s.empty}>No active barista profiles found.</Text>}
          </ScrollView>
        </View>
      ) : (
        <View style={[s.pinWrap, landscapeAuth && s.pinWrapLandscape]}>
          <Pressable
            onPress={() => { tapLight(); setSelected(null); setError(''); }}
            style={({ pressed }) => [s.changeUser, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`Not ${selected.full_name}? Switch profile`}
          >
            <Text style={s.changeUserText}>Not {selected.full_name.split(' ')[0]}? Switch profile</Text>
          </Pressable>
          <Text style={s.pinPrompt}>Enter PIN for {selected.full_name}</Text>
          <PinPad
            key={selected.id}
            onComplete={handlePinComplete}
            onChangeLength={() => error && setError('')}
            error={!!error}
            resetSignal={resetTick}
            disabled={bioBusy || pinBusy}
            keySize={pinKeySize}
            gap={pinGap}
            statusSlot={pinBusy ? <ActivityIndicator color={colors.gold} style={{ marginBottom: 12 }} /> : undefined}
            renderSlot10={
              biometricAvailable && selected.id === lastUserId
                ? () => <PinPadKey label="bio" size={pinKeySize} variant="bio" onPress={handleBiometric} disabled={bioBusy || pinBusy} />
                : undefined
            }
          />
          {!!error && (
            <View style={s.errorRow}>
              <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
          <Pressable
            onPress={() => { tapLight(); setForgotPinVisible(true); }}
            style={({ pressed }) => [s.forgotPin, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Forgot PIN"
          >
            <Text style={s.forgotPinText}>Forgot PIN?</Text>
          </Pressable>
        </View>
      )}
      </View>

      <ForgotPinModal
        visible={forgotPinVisible}
        profileName={selected?.full_name ?? ''}
        onClose={() => setForgotPinVisible(false)}
        onSubmit={(note) => requestPinReset(selected!.id, note)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, overflow: 'hidden' },
  body: { flex: 1, minHeight: 0 },
  bodyLandscape: { flexDirection: 'row', alignItems: 'center' },
  intro: { alignItems: 'center', paddingTop: 12 },
  introLandscape: { flex: 1, paddingTop: 0, paddingHorizontal: 16 },
  brandBlock: { alignItems: 'center', marginTop: 18, marginBottom: 8 },
  brand: { fontFamily: fonts.display, fontSize: 40, letterSpacing: 2, color: colors.goldBrightText },
  brandTablet: { fontSize: 52, letterSpacing: 3 },
  brandCompact: { fontSize: 32 },
  brandSub: { fontSize: 10, letterSpacing: 4, color: colors.gold, fontFamily: fonts.sansBold, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  picker: { flex: 1, minHeight: 0 },
  prompt: {
    textAlign: 'center', fontSize: 16, fontFamily: fonts.serifMedium, color: colors.textSecondary, marginTop: 18, marginBottom: 20, letterSpacing: 0.5, paddingHorizontal: 24,
  },
  promptTablet: {
    fontSize: 20,
    marginBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    paddingBottom: 36,
  },
  tile: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  initialsCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.sansBold,
    color: colors.goldBrightText,
    letterSpacing: 1,
  },
  tileName: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 17,
    width: '100%',
  },
  tileNameTablet: {
    fontSize: 14,
    marginTop: 14,
    lineHeight: 18,
  },
  lastUsedBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(184,147,90,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGold20,
  },
  tileLast: { fontSize: 9, color: colors.goldLight, fontFamily: fonts.sansExtraBold, textTransform: 'uppercase', letterSpacing: 0.8 },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 30, width: '100%' },
  pinWrap: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingTop: 4, paddingBottom: 8 },
  pinWrapLandscape: { flex: 1.2, paddingTop: 0, justifyContent: 'center' },
  changeUser: { marginBottom: 18 },
  changeUserText: { fontSize: 12.5, color: colors.gold, fontFamily: fonts.sansSemiBold },
  pinPrompt: { fontSize: 14, fontFamily: fonts.sansBold, color: colors.textSecondary, marginBottom: 20, textAlign: 'center', paddingHorizontal: 16 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  errorText: { fontSize: 12.5, color: colors.danger, fontFamily: fonts.sansSemiBold },
  forgotPin: { marginTop: 20 },
  forgotPinText: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.sansSemiBold },
  clockWrap: { alignItems: 'center' },
  clockTime: { fontSize: 22, fontFamily: fonts.serifBold, color: colors.goldBrightText, letterSpacing: 1 },
  clockTimeTablet: {
    fontSize: 28,
  },
  clockTimeCompact: {
    fontSize: 18,
  },
  clockDate: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.gold, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },
  clockDateTablet: {
    fontSize: 12,
  },
  circle: { position: 'absolute', borderRadius: 9999 },
});
