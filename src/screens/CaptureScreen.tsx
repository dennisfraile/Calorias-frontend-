import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analizarFoto, ApiError, type RegistroComida } from '../api/comidas';
import type { GoogleAuthState } from '../auth/useGoogleAuth';
import { colors, radius, spacing } from '../theme';

interface Props {
  auth: GoogleAuthState;
}

/**
 * Pantalla de captura en React Native clásico (interacción nativa imperativa):
 * elige/toma una foto con expo-image-picker, la sube al backend con FormData
 * y el ID Token de Google, y muestra los macros estimados.
 */
export default function CaptureScreen({ auth }: Props) {
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [resultado, setResultado] = useState<RegistroComida | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tomarFoto = async () => {
    setError(null);
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      setError('Se necesita permiso de cámara para tomar la foto.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) {
      setFotoUri(res.assets[0].uri);
      setResultado(null);
    }
  };

  const elegirDeGaleria = async () => {
    setError(null);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) {
      setFotoUri(res.assets[0].uri);
      setResultado(null);
    }
  };

  const analizar = async () => {
    if (!fotoUri) return;
    if (!auth.idToken) {
      setError('Inicia sesión con Google antes de analizar.');
      return;
    }
    setAnalizando(true);
    setError(null);
    setResultado(null);
    try {
      const data = await analizarFoto(fotoUri, auth.idToken);
      setResultado(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado al analizar la foto.');
    } finally {
      setAnalizando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Analizar comida</Text>
      <Text style={styles.subtitle}>
        Toma o elige una foto de tu plato y estima sus calorías y macros.
      </Text>

      <AuthBanner auth={auth} />

      <View style={styles.actionsRow}>
        <ActionButton label="Tomar foto" onPress={tomarFoto} />
        <ActionButton label="Galería" variant="secondary" onPress={elegirDeGaleria} />
      </View>

      <View style={styles.previewBox}>
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <Text style={styles.previewPlaceholder}>Sin foto seleccionada</Text>
        )}
      </View>

      <Pressable
        onPress={analizar}
        disabled={!fotoUri || analizando || !auth.idToken}
        style={({ pressed }) => [
          styles.analyzeBtn,
          (!fotoUri || analizando || !auth.idToken) && styles.analyzeBtnDisabled,
          pressed && styles.pressed,
        ]}
      >
        {analizando ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.analyzeBtnText}>Analizar foto</Text>
        )}
      </Pressable>

      {error && (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {resultado && <ResultadoCard registro={resultado} />}
    </ScrollView>
  );
}

function AuthBanner({ auth }: Props) {
  if (auth.idToken) {
    return (
      <View style={styles.authBanner}>
        <Text style={styles.authText}>
          Sesión activa{auth.user?.name ? `: ${auth.user.name}` : ''}
        </Text>
        <Pressable onPress={auth.signOut} hitSlop={8}>
          <Text style={styles.authLink}>Salir</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.authBanner}>
      <Text style={styles.authText}>
        {auth.configured
          ? 'Inicia sesión para enviar fotos al backend.'
          : 'Configura los Client IDs de Google en .env.'}
      </Text>
      <Pressable onPress={auth.signIn} hitSlop={8} disabled={auth.inProgress}>
        <Text style={[styles.authLink, auth.inProgress && styles.dim]}>
          {auth.inProgress ? 'Abriendo…' : 'Entrar con Google'}
        </Text>
      </Pressable>
    </View>
  );
}

function ResultadoCard({ registro }: { registro: RegistroComida }) {
  const detalles = registro.detalles ?? [];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Resultado</Text>
      <View style={styles.macroRow}>
        <Macro label="kcal" value={registro.caloriasTotales} />
        <Macro label="Prot" value={registro.proteinasTotales} suffix="g" />
        <Macro label="Carbs" value={registro.carbohidratosTotales} suffix="g" />
        <Macro label="Grasas" value={registro.grasasTotales} suffix="g" />
      </View>
      {detalles.length > 0 && (
        <View style={styles.detalleList}>
          {detalles.map((d, i) => (
            <View key={`${d.nombre ?? 'item'}-${i}`} style={styles.detalleRow}>
              <Text style={styles.detalleNombre}>{d.nombre ?? 'Alimento'}</Text>
              <Text style={styles.detalleKcal}>
                {d.calorias != null ? `${Math.round(d.calorias)} kcal` : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Macro({ label, value, suffix }: { label: string; value?: number; suffix?: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>
        {value != null ? Math.round(value) : '—'}
        {value != null && suffix ? suffix : ''}
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        variant === 'secondary' && styles.actionBtnSecondary,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.actionBtnText, variant === 'secondary' && styles.actionBtnTextSecondary]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: -spacing.xs },
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authText: { color: colors.textMuted, fontSize: 13, flexShrink: 1, paddingRight: spacing.sm },
  authLink: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  dim: { opacity: 0.5 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnSecondary: { backgroundColor: colors.surface },
  actionBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  actionBtnTextSecondary: { color: colors.textMuted },
  previewBox: {
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: '100%', height: '100%' },
  previewPlaceholder: { color: colors.textMuted, fontSize: 14 },
  analyzeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  analyzeBtnDisabled: { backgroundColor: colors.border },
  analyzeBtnText: { color: colors.bg, fontWeight: '800', fontSize: 16 },
  pressed: { opacity: 0.8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  errorCard: { borderColor: colors.danger, backgroundColor: 'rgba(248,113,113,0.08)' },
  errorText: { color: colors.danger, fontSize: 14 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macro: { alignItems: 'center', flex: 1 },
  macroValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  macroLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  detalleList: { gap: spacing.xs, marginTop: spacing.xs },
  detalleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  detalleNombre: { color: colors.text, fontSize: 14, flexShrink: 1 },
  detalleKcal: { color: colors.textMuted, fontSize: 14 },
});
