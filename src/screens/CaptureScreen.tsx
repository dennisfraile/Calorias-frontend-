import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  analizarFoto,
  actualizarPorciones,
  leerEtiqueta,
  guardarEtiqueta,
  ApiError,
  type CorreccionPorcion,
  type DetalleComida,
  type EtiquetaNutricional,
  type RegistroComida,
  type TipoComida,
} from '../api/comidas';
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
  const [modo, setModo] = useState<'plato' | 'etiqueta'>('plato');
  const [etiqueta, setEtiqueta] = useState<EtiquetaNutricional | null>(null);
  const [porciones, setPorciones] = useState<string>('1');
  const [leyendo, setLeyendo] = useState(false);
  const [guardandoEtq, setGuardandoEtq] = useState(false);

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

  const leer = async () => {
    if (!fotoUri || !auth.idToken) return;
    setLeyendo(true);
    setError(null);
    setEtiqueta(null);
    try {
      const etq = await leerEtiqueta(fotoUri, auth.idToken);
      setEtiqueta(etq);
      setPorciones(etq.porcionesPorEnvase ? String(etq.porcionesPorEnvase) : '1');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo leer la etiqueta.');
    } finally {
      setLeyendo(false);
    }
  };

  const guardarDeEtiqueta = async () => {
    if (!etiqueta || !auth.idToken) return;
    const n = parseFloat(porciones.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      setError('Indica un número de porciones válido.');
      return;
    }
    setGuardandoEtq(true);
    setError(null);
    try {
      const ahora = new Date();
      const fechaLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
      const reg = await guardarEtiqueta({ ...etiqueta, porciones: n, tipo, fechaLocal }, auth.idToken);
      setResultado(reg);
      setEtiqueta(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardandoEtq(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.container}>
        <View style={styles.head}>
          <Text style={styles.title}>Analizar comida</Text>
          <Text style={styles.subtitle}>
            Toma o elige una foto de tu plato y estima sus calorías y macros.
          </Text>
        </View>

        <View style={styles.modoRow}>
          {(['plato', 'etiqueta'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setModo(m);
                setResultado(null);
                setEtiqueta(null);
              }}
              style={({ pressed }) => [styles.modoChip, modo === m && styles.modoChipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.modoChipText, modo === m && styles.modoChipTextActive]}>
                {m === 'plato' ? 'Analizar plato' : 'Escanear etiqueta'}
              </Text>
            </Pressable>
          ))}
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

        {modo === 'plato' ? (
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
        ) : (
          <Pressable
            onPress={leer}
            disabled={!fotoUri || leyendo || !auth.idToken}
            style={({ pressed }) => [
              styles.analyzeBtn,
              (!fotoUri || leyendo || !auth.idToken) && styles.analyzeBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            {leyendo ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <View style={styles.analyzeInner}>
                <Icon name="zap" size={18} color={colors.bg} />
                <Text style={styles.analyzeBtnText}>Leer etiqueta</Text>
              </View>
            )}
          </Pressable>
        )}

        {!auth.idToken && (
          <Text style={styles.loginHint}>Inicia sesión (arriba a la derecha) para analizar tu foto.</Text>
        )}

        {error && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {modo === 'etiqueta' && etiqueta && !resultado && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{etiqueta.nombreProducto ?? 'Producto'}</Text>
            <Text style={styles.metaLineEtq}>
              Por porción ({etiqueta.tamPorcion} {etiqueta.unidadPorcion}): {Math.round(etiqueta.caloriasPorPorcion)} kcal ·
              P {etiqueta.proteinaPorPorcion} g · C {etiqueta.carbosPorPorcion} g · G {etiqueta.grasasPorPorcion} g
            </Text>
            {etiqueta.porcionesPorEnvase ? (
              <Text style={styles.metaLineEtq}>Porciones por envase: {etiqueta.porcionesPorEnvase}</Text>
            ) : null}
            <View style={styles.porcionesRow}>
              <Text style={styles.porcionesLabel}>¿Cuántas porciones?</Text>
              <TextInput
                value={porciones}
                onChangeText={setPorciones}
                keyboardType="decimal-pad"
                style={styles.porcionesInput}
              />
            </View>
            <Pressable
              onPress={guardarDeEtiqueta}
              disabled={guardandoEtq}
              style={({ pressed }) => [styles.guardarBtn, guardandoEtq && styles.analyzeBtnDisabled, pressed && styles.pressed]}
            >
              {guardandoEtq ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.guardarBtnText}>Guardar</Text>}
            </Pressable>
          </View>
        )}

        {resultado && (
          <ResultadoCard
            registro={resultado}
            idToken={auth.idToken}
            onActualizado={setResultado}
          />
        )}
      </View>
    </ScrollView>
  );
}

function ResultadoCard({
  registro,
  idToken,
  onActualizado,
}: {
  registro: RegistroComida;
  idToken: string | null;
  onActualizado: (r: RegistroComida) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const detallesBase = registro.detalles ?? [];
  const [gramos, setGramos] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      detallesBase
        .filter((d) => d.detalleId)
        .map((d) => [d.detalleId as string, Math.round(d.cantidad ?? 100)]),
    ),
  );
  const [guardando, setGuardando] = useState(false);
  const [errGuardar, setErrGuardar] = useState<string | null>(null);

  const factor = (d: DetalleComida) => {
    const orig = d.cantidad ?? 100;
    const actual = gramos[d.detalleId as string] ?? orig;
    return orig > 0 ? actual / orig : 1;
  };

  const visibles = detallesBase.filter((d) => (gramos[d.detalleId as string] ?? 1) > 0);
  const totalKcal = visibles.reduce((s, d) => s + (d.calorias ?? 0) * factor(d), 0);
  const totalProt = visibles.reduce((s, d) => s + (d.proteinas ?? 0) * factor(d), 0);
  const totalCarb = visibles.reduce((s, d) => s + (d.carbohidratos ?? 0) * factor(d), 0);
  const totalGra = visibles.reduce((s, d) => s + (d.grasas ?? 0) * factor(d), 0);

  const setG = (id: string, v: number) => setGramos((g) => ({ ...g, [id]: Math.max(0, v) }));

  const guardar = async () => {
    if (!idToken || !registro.id) return;
    setGuardando(true);
    setErrGuardar(null);
    try {
      const correcciones: CorreccionPorcion[] = detallesBase
        .filter((d) => d.detalleId)
        .map((d) => ({ detalleId: d.detalleId as string, cantidadG: gramos[d.detalleId as string] ?? 0 }));
      const actualizado = await actualizarPorciones(registro.id, idToken, correcciones);
      onActualizado(actualizado);
    } catch (e) {
      setErrGuardar(e instanceof ApiError ? e.message : 'No se pudieron guardar las correcciones.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Resultado</Text>
      <View style={styles.macroRow}>
        <Macro label="kcal" value={totalKcal} />
        <Macro label="Prot" value={totalProt} suffix="g" />
        <Macro label="Carbs" value={totalCarb} suffix="g" />
        <Macro label="Grasas" value={totalGra} suffix="g" />
      </View>

      <View style={styles.detalleList}>
        {detallesBase.map((d, i) => {
          const id = d.detalleId as string;
          const g = gramos[id] ?? Math.round(d.cantidad ?? 100);
          const eliminado = g <= 0;
          return (
            <View key={id ?? i} style={styles.editRow}>
              <View style={styles.editNombreCol}>
                <Text style={[styles.detalleNombre, eliminado && styles.eliminado]}>
                  {d.nombre ?? 'Alimento'}
                </Text>
                <Text style={styles.editKcal}>
                  {eliminado ? 'Eliminado' : `${Math.round((d.calorias ?? 0) * factor(d))} kcal`}
                </Text>
              </View>
              <View style={styles.editControls}>
                <Pressable onPress={() => setG(id, g - 10)} style={styles.stepBtn}>
                  <Text style={styles.stepBtnText}>−</Text>
                </Pressable>
                <TextInput
                  value={String(g)}
                  onChangeText={(t) => setG(id, parseInt(t.replace(/[^0-9]/g, '') || '0', 10))}
                  keyboardType="numeric"
                  style={styles.gramInput}
                />
                <Text style={styles.gramUnidad}>g</Text>
                <Pressable onPress={() => setG(id, g + 10)} style={styles.stepBtn}>
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>
                <Pressable onPress={() => setG(id, 0)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {errGuardar && <Text style={styles.errorText}>{errGuardar}</Text>}

      <Pressable
        onPress={guardar}
        disabled={guardando || !idToken}
        style={({ pressed }) => [styles.guardarBtn, (guardando || !idToken) && styles.analyzeBtnDisabled, pressed && styles.pressed]}
      >
        {guardando ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.guardarBtnText}>Guardar correcciones</Text>
        )}
      </Pressable>
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
  modoRow: { flexDirection: 'row', gap: spacing.xs },
  modoChip: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  modoChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modoChipText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  modoChipTextActive: { color: colors.bg },
  metaLineEtq: { color: colors.textMuted, fontSize: 13 },
  porcionesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  porcionesLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  porcionesInput: {
    minWidth: 60, textAlign: 'center', color: colors.text, fontSize: 15, fontWeight: '700',
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
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
  editRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.sm,
  },
  editNombreCol: { flexShrink: 1, gap: 2 },
  editKcal: { color: colors.textMuted, fontSize: 12 },
  eliminado: { textDecorationLine: 'line-through', color: colors.textMuted },
  editControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepBtn: {
    width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  stepBtnText: { color: colors.text, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  gramInput: {
    minWidth: 44, textAlign: 'center', color: colors.text, fontSize: 14, fontWeight: '700',
    paddingVertical: 2, paddingHorizontal: 4, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  gramUnidad: { color: colors.textMuted, fontSize: 12 },
  removeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  guardarBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm,
    alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: spacing.xs,
  },
  guardarBtnText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
});
