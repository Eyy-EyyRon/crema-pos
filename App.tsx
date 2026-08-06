import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { PosApp } from './src/PosApp';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    CreamyChicken: require('./assets/fonts/CreamyChicken.otf'),
    LemonMilk_400Regular: require('./assets/fonts/LemonMilk-Regular.otf'),
    LemonMilk_500Medium: require('./assets/fonts/LemonMilk-Medium.otf'),
    LemonMilk_700Bold: require('./assets/fonts/LemonMilk-Bold.otf'),
  });

  if (!fontsLoaded) {
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
