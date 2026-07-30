import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangleIcon } from '../icons';
import { colors, fonts } from '../theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, an unexpected render-time exception (e.g. a malformed
// Supabase row) blanks the entire POS with no recovery path — on a shared
// register, that means someone has to force-quit and relaunch mid-shift.
// This can't catch errors in async callbacks/event handlers (React
// limitation), only render-phase errors, but that's the crash class that
// would otherwise be totally unrecoverable in-app.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={s.wrap}>
          <View style={s.iconCircle}>
            <AlertTriangleIcon size={30} color={colors.danger} strokeWidth={2} />
          </View>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.message}>
            The app hit an unexpected error and needs to restart this screen. Any items already in the
            cart or queue are unaffected.
          </Text>
          <Pressable style={s.btn} onPress={() => this.setState({ error: null })}>
            <Text style={s.btnText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.heatHighBg,
    borderWidth: 1,
    borderColor: colors.heatHighBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 26,
    maxWidth: 320,
  },
  btn: {
    backgroundColor: colors.gold,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  btnText: {
    fontSize: 14,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
});
