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
import { convertirMacros, totalEtiqueta } from './etiquetaCalculos';
import type { BaseEtiqueta } from '../api/comidas';
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
  const [porciones, setPorciones] = useState<string>('1');
  const [leyendo, setLeyendo] = useState(false);
  const [guardandoEtq, setGuardandoEtq] = useState(false);
  // Borrador editable de la etiqueta leída (todo editable antes de guardar).
  const [borrador, setBorrador] = useState<EtiquetaNutricional | null>(null);

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
    setBorrador(null);
    try {
      const etq = await leerEtiqueta(fotoUri, auth.idToken);
      setBorrador(etq);
      setPorciones(etq.porcionesPorEnvase ? String(etq.porcionesPorEnvase) : '1');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo leer la etiqueta.');
    } finally {
      setLeyendo(false);
    }
  };

  const guardarDeEtiqueta = async () => {
    if (!borrador || !auth.idToken) return;
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
      const reg = await guardarEtiqueta({ ...borrador, porciones: n, tipo, fechaLocal }, auth.idToken);
      setResultado(reg);
      setBorrador(null);
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
                setBorrador(null);
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

        {modo === 'etiqueta' && !borrador && (
          <Text style={styles.encuadreHint}>💡 Enfoca la tabla de información nutricional completa.</Text>
        )}

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
            <Text style={styles.errorTitle}>{error}</Text>
            {modo === 'etiqueta' && (
              <View style={styles.guiaList}>
                <Text style={styles.guiaItem}>• Encuadra la tabla nutricional completa</Text>
                <Text style={styles.guiaItem}>• Que la foto esté enfocada y sin reflejos</Text>
                <Text style={styles.guiaItem}>• El texto derecho (no muy inclinado)</Text>
              </View>
            )}
          </View>
        )}

        {modo === 'etiqueta' && borrador && !resultado && (
          <EtiquetaEditor
            borrador={borrador}
            setBorrador={setBorrador}
            porciones={porciones}
            setPorciones={setPorciones}
            guardando={guardandoEtq}
            onGuardar={guardarDeEtiqueta}
          />
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

function EtiquetaEditor({
  borrador,
  setBorrador,
  porciones,
  setPorciones,
  guardando,
  onGuardar,
}: {
  borrador: EtiquetaNutricional;
  setBorrador: (e: EtiquetaNutricional) => void;
  porciones: string;
  setPorciones: (s: string) => void;
  guardando: boolean;
  onGuardar: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  type CampoNum = 'tamPorcion' | 'caloriasPorBase' | 'proteinaPorBase' | 'carbosPorBase' | 'grasasPorBase';
  const setNum = (campo: CampoNum, txt: string) => {
    const v = parseFloat(txt.replace(',', '.'));
    setBorrador({ ...borrador, [campo]: Number.isFinite(v) ? v : 0 });
  };

  const cambiarBase = (nueva: BaseEtiqueta) => {
    if (nueva === borrador.base) return;
    const conv = convertirMacros(borrador, borrador.base, nueva, borrador.tamPorcion, borrador.unidadPorcion);
    setBorrador({ ...borrador, ...conv, base: nueva });
  };

  const n = parseFloat(porciones.replace(',', '.'));
  const total = totalEtiqueta(borrador, Number.isFinite(n) ? n : 0);

  const unidadBase = /^ml$/i.test(borrador.unidadPorcion.trim()) ? 'mL' : 'g';

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Datos de la etiqueta</Text>

      <View>
        <Text style={styles.editLabel}>Nombre</Text>
        <TextInput
          value={borrador.nombreProducto ?? ''}
          onChangeText={(t) => setBorrador({ ...borrador, nombreProducto: t })}
          placeholder="Producto"
          placeholderTextColor={colors.textMuted}
          style={styles.textField}
        />
      </View>

      <View style={styles.fieldRow}>
        <View style={styles.fieldCol}>
          <Text style={styles.editLabel}>Tam. porción</Text>
          <TextInput
            value={String(borrador.tamPorcion)}
            onChangeText={(t) => setNum('tamPorcion', t)}
            keyboardType="decimal-pad"
            style={styles.textField}
          />
        </View>
        <View style={styles.fieldCol}>
          <Text style={styles.editLabel}>Unidad</Text>
          <TextInput
            value={borrador.unidadPorcion}
            onChangeText={(t) => setBorrador({ ...borrador, unidadPorcion: t })}
            style={styles.textField}
          />
        </View>
      </View>

      <View>
        <Text style={styles.editLabel}>Macros</Text>
        <View style={styles.baseRow}>
          {(['porcion', 'cien'] as BaseEtiqueta[]).map((b) => (
            <Pressable
              key={b}
              onPress={() => cambiarBase(b)}
              style={({ pressed }) => [styles.baseChip, borrador.base === b && styles.baseChipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.baseChipText, borrador.base === b && styles.baseChipTextActive]}>
                {b === 'porcion' ? 'por porción' : `por 100 ${unidadBase}`}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.macroInputsRow}>
          <MacroInput label="kcal" value={borrador.caloriasPorBase} onChange={(t) => setNum('caloriasPorBase', t)} />
          <MacroInput label="P" value={borrador.proteinaPorBase} onChange={(t) => setNum('proteinaPorBase', t)} />
          <MacroInput label="C" value={borrador.carbosPorBase} onChange={(t) => setNum('carbosPorBase', t)} />
          <MacroInput label="G" value={borrador.grasasPorBase} onChange={(t) => setNum('grasasPorBase', t)} />
        </View>
      </View>

      <View style={styles.porcionesRow}>
        <Text style={styles.porcionesLabel}>Porciones</Text>
        <TextInput
          value={porciones}
          onChangeText={setPorciones}
          keyboardType="decimal-pad"
          style={styles.porcionesInput}
        />
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalText}>
          Total: {Math.round(total.kcal)} kcal · P {Math.round(total.prot)} · C {Math.round(total.carb)} · G {Math.round(total.gra)}
        </Text>
      </View>

      <Pressable
        onPress={onGuardar}
        disabled={guardando}
        style={({ pressed }) => [styles.guardarBtn, guardando && styles.analyzeBtnDisabled, pressed && styles.pressed]}
      >
        {guardando ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.guardarBtnText}>Guardar</Text>}
      </Pressable>
    </View>
  );
}

function MacroInput({ label, value, onChange }: { label: string; value: number; onChange: (t: string) => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.macroInputCol}>
      <TextInput
        value={String(value)}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={styles.macroInput}
      />
      <Text style={styles.macroInputLabel}>{label}</Text>
    </View>
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
  editLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  textField: {
    color: colors.text, fontSize: 15, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  fieldCol: { flex: 1 },
  baseRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  baseChip: {
    paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  baseChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  baseChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  baseChipTextActive: { color: colors.bg },
  macroInputsRow: { flexDirection: 'row', gap: spacing.xs },
  macroInputCol: { flex: 1, alignItems: 'center' },
  macroInput: {
    width: '100%', textAlign: 'center', color: colors.text, fontSize: 14, fontWeight: '700',
    paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  macroInputLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  totalRow: { paddingTop: spacing.xs },
  totalText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  errorTitle: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  guiaList: { gap: 2, marginTop: spacing.xs },
  guiaItem: { color: colors.textMuted, fontSize: 13 },
  encuadreHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});
