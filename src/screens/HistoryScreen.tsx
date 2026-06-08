import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MythikRenderer } from 'mythik-react-native';
import { buildHistorialSpec } from '../mythik/historialSpec';
import { API_BASE_URL } from '../config';
import type { GoogleAuthState } from '../auth/useGoogleAuth';
import { useTheme } from '../theme-context';

interface Props {
  auth: GoogleAuthState;
}

/**
 * Host de Mythik para la pantalla data-driven (historial).
 *
 * El renderer consume el AppSpec JSON (buildHistorialSpec), que hace un `fetch` GET
 * real a /api/comidas/historial. La autenticación NO va dentro del spec: los
 * docs nativos de Mythik indican pasar el transporte de credenciales por el
 * `fetcher` del host. Aquí el fetcher inyecta `Authorization: Bearer <idToken>`
 * y `urlResolver` convierte la ruta relativa (/api/...) en absoluta contra el
 * backend .NET. Sin sesión activa el backend responde 401 y el spec muestra su
 * estado de error. El spec se reconstruye con la paleta activa (tema claro/oscuro).
 */
export default function HistoryScreen({ auth }: Props) {
  const { colors } = useTheme();
  const spec = useMemo(() => buildHistorialSpec(colors), [colors]);

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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <MythikRenderer spec={spec} fetcher={fetcher} urlResolver={urlResolver} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
