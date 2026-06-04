import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CaptureScreen from './src/screens/CaptureScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { useGoogleAuth } from './src/auth/useGoogleAuth';
import { colors, radius, spacing } from './src/theme';

type Tab = 'captura' | 'historial';

export default function App() {
  const auth = useGoogleAuth();
  const [tab, setTab] = useState<Tab>('captura');

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <StatusBar style="light" />

          <View style={styles.body}>
            {tab === 'captura' ? (
              <CaptureScreen auth={auth} />
            ) : (
              <HistoryScreen auth={auth} />
            )}
          </View>

          <View style={styles.tabBar}>
            <TabButton
              label="Captura"
              active={tab === 'captura'}
              onPress={() => setTab('captura')}
            />
            <TabButton
              label="Historial"
              active={tab === 'historial'}
              onPress={() => setTab('historial')}
            />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  tabActive: { backgroundColor: colors.surfaceAlt },
  tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: colors.primary },
  pressed: { opacity: 0.7 },
});
