import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MythikRenderer } from 'mythik-react-native';
import { historialSpec } from '../mythik/historialSpec';
import { API_BASE_URL } from '../config';
import type { GoogleAuthState } from '../auth/useGoogleAuth';
import { colors } from '../theme';

interface Props {
  auth: GoogleAuthState;
}

/**
 * Host de Mythik para la pantalla data-driven (historial).
 *
 * El renderer consume el AppSpec JSON (historialSpec). La autenticación NO va
 * dentro del spec: los docs nativos de Mythik indican pasar el transporte de
 * credenciales por el `fetcher` del host y mantener el token fuera del spec.
 * Aquí el fetcher inyecta `Authorization: Bearer <idToken>` y `urlResolver`
 * convierte rutas relativas (/api/...) en absolutas contra el backend .NET.
 *
 * La demo actual se alimenta de datos sembrados en el spec, así que el fetcher
 * no se ejercita todavía; queda listo para cuando el spec haga fetch real.
 */
export default function HistoryScreen({ auth }: Props) {
  const fetcher = useMemo(
    () =>
      async (url: string, options?: RequestInit): Promise<Response> => {
        const headers = new Headers(options?.headers);
        if (auth.idToken) headers.set('Authorization', `Bearer ${auth.idToken}`);
        if (!headers.has('Accept')) headers.set('Accept', 'application/json');
        return fetch(url, { ...options, headers });
      },
    [auth.idToken],
  );

  const urlResolver = useMemo(
    () => (url: string) => (url.startsWith('/') ? `${API_BASE_URL}${url}` : url),
    [],
  );

  return (
    <View style={styles.container}>
      <MythikRenderer spec={historialSpec} fetcher={fetcher} urlResolver={urlResolver} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
