import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { PinPad, PinPadKey } from '../components/PinPad';
import { Shot } from '../components/Shot';
import { AlertCircleIcon } from '../icons';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';
import { UserProfile } from '../types';

const LAST_USER_KEY = 'crema_last_user';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={s.clockWrap}>
      <Text style={s.clockTime}>{timeString}</Text>
      <Text style={s.clockDate}>{dateString}</Text>
    </View>
  );
}

function AbstractBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [resetTick, setResetTick] = useState(0);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const lastIdPromise = AsyncStorage.getItem(LAST_USER_KEY);
      const hwPromise = LocalAuthentication.hasHardwareAsync();
      const enrolledPromise = LocalAuthentication.isEnrolledAsync();

      let fetchedProfiles: UserProfile[] | null = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url, pin_code')
          .eq('role', 'barista')
          .neq('status', 'inactive');
        
        if (!error && data) {
          fetchedProfiles = data as UserProfile[];
          await AsyncStorage.setItem('crema_profiles_cache', JSON.stringify(data));
        }
      } catch (e) {
        // network error
      }

      if (!fetchedProfiles) {
        try {
          const cached = await AsyncStorage.getItem('crema_profiles_cache');
          if (cached) fetchedProfiles = JSON.parse(cached);
        } catch {}
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
    setSelected(p);
    setError('');
  };

  const handlePinComplete = async (pin: string) => {
    if (!selected) return;
    const res = await onLogin(selected.id, { pin }, selected);
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

  return (
    <View style={s.screen}>
      <AbstractBackground />
      <LiveClock />
      
      <View style={s.brandBlock}>
        <Text style={s.brand}>CREMA</Text>
        <Text style={s.brandSub}>COFFEE &amp; ICE CREAM</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : !selected ? (
        <>
          <Text style={s.prompt}>Who's ringing up orders?</Text>
          <ScrollView contentContainerStyle={s.grid}>
            {sorted.map((p) => (
              <Pressable key={p.id} style={s.tile} onPress={() => selectProfile(p)}>
                {p.avatar_url ? (
                  <Image
                    source={{ uri: p.avatar_url }}
                    cachePolicy="disk"
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 38,
                      borderWidth: p.id === lastUserId ? 2 : 1,
                      borderColor: p.id === lastUserId ? colors.goldLight : colors.borderGold25,
                      backgroundColor: colors.cardBg,
                    }}
                  />
                ) : (
                  <Shot 
                    label={initials(p.full_name)} 
                    style={{ 
                      width: 76, 
                      height: 76, 
                      borderRadius: 38,
                      borderWidth: p.id === lastUserId ? 2 : 1,
                      borderColor: p.id === lastUserId ? colors.goldLight : colors.borderGold25,
                    }} 
                  />
                )}
                <Text style={[s.tileName, p.id === lastUserId && { color: colors.goldBrightText }]} numberOfLines={1}>
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
        </>
      ) : (
        <View style={s.pinWrap}>
          <Pressable onPress={() => { setSelected(null); setError(''); }} style={s.changeUser}>
            <Text style={s.changeUserText}>Not {selected.full_name.split(' ')[0]}? Switch profile</Text>
          </Pressable>
          <Text style={s.pinPrompt}>Enter PIN for {selected.full_name}</Text>
          <PinPad
            key={selected.id}
            onComplete={handlePinComplete}
            onChangeLength={() => error && setError('')}
            error={!!error}
            resetSignal={resetTick}
            disabled={bioBusy}
            renderSlot10={
              biometricAvailable && selected.id === lastUserId
                ? () => <PinPadKey label="bio" size={64} variant="bio" onPress={handleBiometric} disabled={bioBusy} />
                : undefined
            }
          />
          {!!error && (
            <View style={s.errorRow}>
              <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingTop: 50 },
  brandBlock: { alignItems: 'center', marginBottom: 20 },
  brand: { fontFamily: fonts.serifBold, fontSize: 34, letterSpacing: 5, color: colors.goldBrightText },
  brandSub: { fontSize: 10, letterSpacing: 4, color: colors.gold, fontFamily: fonts.sansBold, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  prompt: {
    textAlign: 'center', fontSize: 18, fontFamily: fonts.serifMedium, color: colors.textSecondary, marginBottom: 28, letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24,
    paddingHorizontal: 24, paddingBottom: 30,
  },
  tile: { alignItems: 'center', width: 92 },
  tileName: { marginTop: 12, fontSize: 13, fontFamily: fonts.sansBold, color: colors.textPrimary, textAlign: 'center' },
  lastUsedBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(184,147,90,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGold20,
  },
  tileLast: { fontSize: 8.5, color: colors.goldLight, fontFamily: fonts.sansExtraBold, textTransform: 'uppercase', letterSpacing: 0.8 },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
  pinWrap: { flex: 1, alignItems: 'center', paddingTop: 10 },
  changeUser: { marginBottom: 18 },
  changeUserText: { fontSize: 12.5, color: colors.gold, fontFamily: fonts.sansSemiBold },
  pinPrompt: { fontSize: 14, fontFamily: fonts.sansBold, color: colors.textSecondary, marginBottom: 20 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  errorText: { fontSize: 12.5, color: colors.danger, fontFamily: fonts.sansSemiBold },
  clockWrap: { position: 'absolute', top: 40, right: 40, alignItems: 'flex-end' },
  clockTime: { fontSize: 28, fontFamily: fonts.serifBold, color: colors.goldBrightText, letterSpacing: 1 },
  clockDate: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.gold, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },
  circle: { position: 'absolute', borderRadius: 9999 },
});
