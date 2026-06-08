import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_CLIENT_IDS, GOOGLE_CONFIGURED } from '../config';
import { clearSession, loadValidSession, saveSession, touchSession } from './sessionStore';

// Necesario para que el navegador del sistema cierre y devuelva el control a la app.
WebBrowser.maybeCompleteAuthSession();

export interface GoogleUser {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface GoogleAuthState {
  /** ID Token de Google a enviar como `Authorization: Bearer <idToken>`. */
  idToken: string | null;
  user: GoogleUser | null;
  /** false si no hay Client IDs en .env (login deshabilitado). */
  configured: boolean;
  inProgress: boolean;
  error: string | null;
  signIn: () => void;
  signOut: () => void;
}

/** Decodifica un string base64url (manejo correcto de UTF-8 para nombres con tildes). */
function decodeBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  // atob está disponible en Hermes (RN >= 0.74).
  const binary = typeof globalThis.atob === 'function' ? globalThis.atob(padded) : '';
  let percentEncoded = '';
  for (let i = 0; i < binary.length; i++) {
    percentEncoded += '%' + binary.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return decodeURIComponent(percentEncoded);
}

/** Lee los claims del payload del JWT (solo para mostrar nombre/email; el backend valida la firma). */
function decodeIdToken(token: string): GoogleUser | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const claims = JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
    if (typeof claims.sub !== 'string') return null;
    return {
      sub: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : undefined,
      name: typeof claims.name === 'string' ? claims.name : undefined,
      picture: typeof claims.picture === 'string' ? claims.picture : undefined,
    };
  } catch {
    return null;
  }
}

export function useGoogleAuth(): GoogleAuthState {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
    iosClientId: GOOGLE_CLIENT_IDS.iosClientId,
    androidClientId: GOOGLE_CLIENT_IDS.androidClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  const [idToken, setIdToken] = useState<string | null>(null);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const token = response.params?.id_token ?? null;
      setIdToken(token);
      setUser(token ? decodeIdToken(token) : null);
      setError(token ? null : 'Google no devolvió un id_token. Revisa los scopes (openid).');
      if (token) saveSession(token); // persistir para sobrevivir recargas
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Error de autenticación con Google.');
    }
    setInProgress(false);
  }, [response]);

  // Restaura la sesión persistida al cargar la app (si no caducó ni venció por inactividad).
  useEffect(() => {
    let activo = true;
    loadValidSession().then((token) => {
      if (activo && token) {
        setIdToken(token);
        setUser(decodeIdToken(token));
        touchSession();
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  // Mantiene viva la sesión con la actividad del usuario y la cierra al caducar o por inactividad.
  useEffect(() => {
    if (!idToken) return;

    const revisar = async () => {
      const token = await loadValidSession();
      if (!token) {
        setIdToken(null);
        setUser(null);
      }
    };
    const tocar = () => {
      touchSession();
    };

    const interval = setInterval(() => {
      if (Platform.OS !== 'web') touchSession(); // nativo: viva mientras la app esté en uso
      revisar();
    }, 30_000);

    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    if (web) {
      window.addEventListener('focus', revisar);
      window.addEventListener('pointerdown', tocar);
      window.addEventListener('keydown', tocar);
    }
    return () => {
      clearInterval(interval);
      if (web) {
        window.removeEventListener('focus', revisar);
        window.removeEventListener('pointerdown', tocar);
        window.removeEventListener('keydown', tocar);
      }
    };
  }, [idToken]);

  const signIn = useCallback(() => {
    setError(null);
    if (!GOOGLE_CONFIGURED) {
      setError('Configura los Client IDs de Google en .env para iniciar sesión.');
      return;
    }
    if (!request) {
      setError('La petición de autenticación aún no está lista.');
      return;
    }
    setInProgress(true);
    promptAsync().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el login de Google.');
      setInProgress(false);
    });
  }, [request, promptAsync]);

  const signOut = useCallback(() => {
    setIdToken(null);
    setUser(null);
    setError(null);
    clearSession();
  }, []);

  return {
    idToken,
    user,
    configured: GOOGLE_CONFIGURED,
    inProgress,
    error,
    signIn,
    signOut,
  };
}
