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
 * El renderer consume el AppSpec JSON (historialSpec), que hace un `fetch` GET
 * real a /api/comidas/historial. La autenticación NO va dentro del spec: los
 * docs nativos de Mythik indican pasar el transporte de credenciales por el
 * `fetcher` del host. Aquí el fetcher inyecta `Authorization: Bearer <idToken>`
 * y `urlResolver` convierte la ruta relativa (/api/...) en absoluta contra el
 * backend .NET. Sin sesión activa el backend responde 401 y el spec muestra su
 * estado de error.
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
