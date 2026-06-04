/**
 * Configuración central leída de variables de entorno EXPO_PUBLIC_* (ver .env.example).
 * Estas variables se resuelven en build-time por Expo y se embeben en el bundle.
 */

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5247';

/** Endpoint multipart del backend que analiza la foto (campo "foto"). Requiere Bearer idToken. */
export const ANALIZAR_URL = `${API_BASE_URL}/api/comidas/analizar`;

/** Ruta RELATIVA del historial: el spec de Mythik la usa y el urlResolver del host la vuelve absoluta. */
export const HISTORIAL_PATH = '/api/comidas/historial';

/** Variante absoluta por si se necesita fuera del renderer de Mythik. */
export const HISTORIAL_URL = `${API_BASE_URL}${HISTORIAL_PATH}`;

export const GOOGLE_CLIENT_IDS = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
} as const;

/** true cuando hay al menos un Client ID configurado para intentar el login real. */
export const GOOGLE_CONFIGURED = Boolean(
  GOOGLE_CLIENT_IDS.webClientId ||
    GOOGLE_CLIENT_IDS.iosClientId ||
    GOOGLE_CLIENT_IDS.androidClientId,
);
