import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CaptureScreen from './src/screens/CaptureScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import GoogleSignInButton from './src/components/GoogleSignInButton';
import Avatar from './src/components/Avatar';
import { useGoogleAuth } from './src/auth/useGoogleAuth';
import { colors, radius, spacing } from './src/theme';

type Tab = 'captura' | 'historial';

export default function App() {
  const auth = useGoogleAuth();
  const [tab, setTab] = useState<Tab>('captura');
  const [screen, setScreen] = useState<'main' | 'perfil'>('main');

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <StatusBar style="light" />

          {screen === 'perfil' && auth.idToken ? (
            <PerfilScreen auth={auth} onClose={() => setScreen('main')} />
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.brand}>Calorías</Text>
                {auth.idToken ? (
                  <Pressable
                    onPress={() => setScreen('perfil')}
                    style={({ pressed }) => [pressed && styles.pressed]}
                    accessibilityLabel="Abrir perfil"
                  >
                    <Avatar picture={auth.user?.picture} name={auth.user?.name ?? auth.user?.email} />
                  </Pressable>
                ) : (
                  <GoogleSignInButton auth={auth} />
                )}
              </View>

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
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  brand: { color: colors.text, fontSize: 18, fontWeight: '800' },
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
