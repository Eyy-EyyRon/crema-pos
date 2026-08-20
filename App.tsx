import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { CrossAlertHost } from './src/components/CrossAlertHost';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { PosApp } from './src/PosApp';
import { colors } from './src/theme';

// Keep the native splash (configured via the expo-splash-screen plugin in app.json) up until
// fonts are ready. Called at module scope, unawaited, per Expo's docs — calling it inside the
// component can run too late, after the splash has already auto-hidden.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    CreamyChicken: require('./assets/fonts/CreamyChicken.otf'),
    LemonMilk_400Regular: require('./assets/fonts/LemonMilk-Regular.otf'),
    LemonMilk_500Medium: require('./assets/fonts/LemonMilk-Medium.otf'),
    LemonMilk_700Bold: require('./assets/fonts/LemonMilk-Bold.otf'),
  });
  // A font failing to load must never permanently block the app behind a blank screen — fall
  // back to the system font instead of waiting forever on a `loaded` flag that will never flip.
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontError) console.warn('Custom fonts failed to load, falling back to system font:', fontError);
  }, [fontError]);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;
    const prevOverflow = body.style.overflow;
    html.style.backgroundColor = colors.screenBg;
    html.style.height = '100%';
    body.style.backgroundColor = colors.screenBg;
    body.style.height = '100%';
    body.style.margin = '0';
    body.style.overflow = 'hidden';
    const root = document.getElementById('root');
    if (root) {
      root.style.height = '100%';
      root.style.backgroundColor = colors.screenBg;
    }
    return () => {
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
      body.style.overflow = prevOverflow;
    };
  }, []);

  if (!fontsReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: colors.screenBg }}>
      <View style={styles.app}>
        <ErrorBoundary>
          <PosApp />
        </ErrorBoundary>
        <CrossAlertHost />
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  app: {
    flex: 1,
    backgroundColor: colors.screenBg,
    overflow: 'hidden',
    ...Platform.select({
      web: { height: '100%', minHeight: '100%' },
      default: {},
    }),
  },
});
