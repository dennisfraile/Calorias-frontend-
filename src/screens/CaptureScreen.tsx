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
import { analizarFoto, ApiError, type RegistroComida, type TipoComida } from '../api/comidas';
import type { GoogleAuthState } from '../auth/useGoogleAuth';
import Icon, { type IconName } from '../components/Icon';
import { radius, spacing, type Palette } from '../theme';
import { useTheme } from '../theme-context';

interface Props {
  auth: GoogleAuthState;
}

/**
 * Pantalla de captura en React Native clásico (interacción nativa imperativa):
 * elige/toma una foto con expo-image-picker, la sube al backend con FormData
 * y el ID Token de Google, y muestra los macros estimados.
 */
export default function CaptureScreen({ auth }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [resultado, setResultado] = useState<RegistroComida | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoComida>('Almuerzo');

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
      const data = await analizarFoto(fotoUri, auth.idToken, tipo);
      setResultado(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado al analizar la foto.');
    } finally {
      setAnalizando(false);
    }
  };

  const analizarDeshabilitado = !fotoUri || analizando || !auth.idToken;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.container}>
        <View style={styles.head}>
          <Text style={styles.title}>Analizar comida</Text>
          <Text style={styles.subtitle}>
            Toma o elige una foto de tu plato y estima sus calorías y macros.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tipo de comida</Text>
          <View style={styles.tipoRow}>
            {(['Desayuno', 'Almuerzo', 'Cena', 'Snack'] as TipoComida[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTipo(t)}
                style={({ pressed }) => [
                  styles.tipoChip,
                  tipo === t && styles.tipoChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.tipoChipText, tipo === t && styles.tipoChipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={elegirDeGaleria}
          style={({ pressed }) => [styles.previewBox, pressed && styles.pressed]}
        >
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.previewEmpty}>
              <Icon name="images" size={40} color={colors.textMuted} />
              <Text style={styles.previewPlaceholder}>Sin foto seleccionada</Text>
              <Text style={styles.previewHint}>Toca para elegir de la galería</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.actionsRow}>
          <ActionButton label="Tomar foto" icon="camera" onPress={tomarFoto} />
          <ActionButton label="Galería" icon="images" variant="secondary" onPress={elegirDeGaleria} />
        </View>

        <Pressable
          onPress={analizar}
          disabled={analizarDeshabilitado}
          style={({ pressed }) => [
            styles.analyzeBtn,
            analizarDeshabilitado && styles.analyzeBtnDisabled,
            pressed && styles.pressed,
          ]}
        >
          {analizando ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <View style={styles.analyzeInner}>
              <Icon name="zap" size={18} color={colors.bg} />
              <Text style={styles.analyzeBtnText}>Analizar foto</Text>
            </View>
          )}
        </Pressable>

        {!auth.idToken && (
          <Text style={styles.loginHint}>Inicia sesión (arriba a la derecha) para analizar tu foto.</Text>
        )}

        {error && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {resultado && <ResultadoCard registro={resultado} />}
      </View>
    </ScrollView>
  );
}

function ResultadoCard({ registro }: { registro: RegistroComida }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
  icon,
  onPress,
  variant = 'primary',
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const color = variant === 'secondary' ? colors.textMuted : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        variant === 'secondary' && styles.actionBtnSecondary,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={18} color={color} />
      <Text
        style={[styles.actionBtnText, variant === 'secondary' && styles.actionBtnTextSecondary]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: spacing.md },
  head: { gap: 4 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 14 },
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
  tipoRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  tipoChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipoChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipoChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tipoChipTextActive: { color: colors.bg },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnSecondary: { backgroundColor: colors.surface },
  actionBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  actionBtnTextSecondary: { color: colors.textMuted },
  previewBox: {
    height: 300,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmpty: { alignItems: 'center', gap: spacing.xs },
  preview: { width: '100%', height: '100%' },
  previewPlaceholder: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  previewHint: { color: colors.textMuted, fontSize: 12 },
  loginHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  analyzeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  analyzeBtnDisabled: { backgroundColor: colors.border },
  analyzeInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
