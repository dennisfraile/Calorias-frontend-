import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CaptureScreen from './src/screens/CaptureScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import GoogleSignInButton from './src/components/GoogleSignInButton';
import Avatar from './src/components/Avatar';
import Icon, { type IconName } from './src/components/Icon';
import { useGoogleAuth } from './src/auth/useGoogleAuth';
import { ThemeProvider, useTheme } from './src/theme-context';
import { radius, spacing, type Palette } from './src/theme';

type Tab = 'captura' | 'historial';

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const auth = useGoogleAuth();
  const { colors, mode, toggle } = useTheme();
  const styles = makeStyles(colors);
  const [tab, setTab] = useState<Tab>('captura');
  const [screen, setScreen] = useState<'main' | 'perfil'>('main');

  // Web: ícono (favicon) y título de la pestaña del navegador, según el color de marca.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = 'Calorías';
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
      `<path fill="${colors.primary}" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
    const href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [colors.primary]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

          {screen === 'perfil' && auth.idToken ? (
            <PerfilScreen auth={auth} onClose={() => setScreen('main')} />
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.brandRow}>
                  <Icon name="flame" size={22} color={colors.primary} />
                  <Text style={styles.brand}>Calorías</Text>
                </View>

                <View style={styles.headerRight}>
                  <Pressable
                    onPress={toggle}
                    accessibilityLabel="Cambiar tema claro/oscuro"
                    style={({ pressed }) => [styles.toggleBtn, pressed && styles.pressed]}
                  >
                    <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={colors.text} />
                  </Pressable>

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
                  icon="camera"
                  active={tab === 'captura'}
                  onPress={() => setTab('captura')}
                />
                <TabButton
                  label="Historial"
                  icon="history"
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
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
    >
      <Icon name={icon} size={18} color={active ? colors.primary : colors.textMuted} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    brand: { color: colors.text, fontSize: 18, fontWeight: '800' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    toggleBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    tabActive: { backgroundColor: colors.surfaceAlt },
    tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
    tabTextActive: { color: colors.primary },
    pressed: { opacity: 0.7 },
  });
