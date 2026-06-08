import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Persistencia de la sesión (ID Token de Google) entre recargas.
 * - Web: localStorage. Nativo: expo-secure-store.
 * - La sesión caduca por DOS motivos: el `exp` del propio ID Token (~1 h) o
 *   inactividad (`INACTIVITY_MS`). Lo que ocurra primero cierra la sesión.
 */

const KEY = 'calorias.session.v1';

/** Tiempo sin actividad tras el cual se cierra la sesión. */
export const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos

interface Stored {
  idToken: string;
  lastActive: number; // epoch ms
}

async function rawSet(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(KEY, value);
    } catch {
      /* almacenamiento no disponible: la sesión simplemente no persistirá */
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(KEY, value);
  } catch {
    /* ignore */
  }
}

async function rawGet(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

async function rawDelete(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* ignore */
  }
}

function decodeBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = typeof globalThis.atob === 'function' ? globalThis.atob(padded) : '';
  let percentEncoded = '';
  for (let i = 0; i < binary.length; i++) {
    percentEncoded += '%' + binary.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return decodeURIComponent(percentEncoded);
}

/** `exp` del JWT en ms, o null si no se puede leer. */
function tokenExpMs(idToken: string): number | null {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    const claims = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

export async function saveSession(idToken: string): Promise<void> {
  await rawSet(JSON.stringify({ idToken, lastActive: Date.now() } as Stored));
}

/** Refresca la marca de "última actividad" (mantiene viva la sesión). */
export async function touchSession(): Promise<void> {
  const cur = await rawGet();
  if (!cur) return;
  try {
    const s = JSON.parse(cur) as Stored;
    s.lastActive = Date.now();
    await rawSet(JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export async function clearSession(): Promise<void> {
  await rawDelete();
}

/**
 * Devuelve el idToken almacenado si la sesión sigue siendo válida (token no
 * caducado y dentro de la ventana de inactividad). Si no, la borra y devuelve null.
 */
export async function loadValidSession(): Promise<string | null> {
  const cur = await rawGet();
  if (!cur) return null;
  let s: Stored;
  try {
    s = JSON.parse(cur) as Stored;
  } catch {
    await rawDelete();
    return null;
  }
  const now = Date.now();
  const expMs = tokenExpMs(s.idToken);
  if (expMs != null && expMs <= now) {
    await rawDelete(); // ID Token caducado
    return null;
  }
  if (now - s.lastActive > INACTIVITY_MS) {
    await rawDelete(); // inactividad
    return null;
  }
  return s.idToken;
}
