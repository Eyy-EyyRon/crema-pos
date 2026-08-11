import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
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

  if (!fontsReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.app}>
        <ErrorBoundary>
          <PosApp />
        </ErrorBoundary>
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
  },
});
