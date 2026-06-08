import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { darkColors, lightColors, type Palette } from './theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeCtx {
  mode: ThemeMode;
  colors: Palette;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

const KEY = 'calorias.theme.v1';
const Ctx = createContext<ThemeCtx | null>(null);

function leerWebSync(): ThemeMode | null {
  if (Platform.OS !== 'web') return null;
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function persistir(m: ThemeMode): void {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(KEY, m);
    } catch {
      /* ignore */
    }
    return;
  }
  SecureStore.setItemAsync(KEY, m).catch(() => {});
}

/**
 * Provee el tema (claro/oscuro) a toda la app.
 * - Arranque: preferencia guardada → si no, la del sistema (Appearance) → si no, oscuro.
 * - El cambio se persiste (web: localStorage; nativo: SecureStore).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const sistema = Appearance.getColorScheme();
  const inicial: ThemeMode = leerWebSync() ?? (sistema === 'light' ? 'light' : 'dark');
  const [mode, setModeState] = useState<ThemeMode>(inicial);

  // En nativo la lectura del almacenamiento es asíncrona: restaurar al montar.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let activo = true;
    SecureStore.getItemAsync(KEY)
      .then((v) => {
        if (activo && (v === 'light' || v === 'dark')) setModeState(v);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const value = useMemo<ThemeCtx>(() => {
    const setMode = (m: ThemeMode) => {
      setModeState(m);
      persistir(m);
    };
    return {
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      setMode,
      toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    };
  }, [mode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme debe usarse dentro de <ThemeProvider>.');
  return v;
}
