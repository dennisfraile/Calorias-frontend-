import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { GoogleAuthState } from '../auth/useGoogleAuth';
import { ApiError } from '../api/comidas';
import { getPerfil, putPerfil, type Perfil, type PerfilInput } from '../api/perfil';
import DateField from '../components/DateField';
import HelpTip from '../components/HelpTip';
import Icon from '../components/Icon';
import { colors, radius, spacing } from '../theme';

const SEXOS = ['Masculino', 'Femenino'] as const;
const NIVELES = ['Sedentario', 'Ligero', 'Moderado', 'Activo', 'MuyActivo'] as const;
const OBJETIVOS = ['Perder', 'Mantener', 'Ganar'] as const;

/** Convierte texto de un input numérico a number|null (vacío => null). */
function num(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function PerfilScreen({
  auth,
  onClose,
}: {
  auth: GoogleAuthState;
  onClose: () => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  // Campos editables (string para los inputs numéricos).
  const [sexo, setSexo] = useState<string | null>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [alturaCm, setAlturaCm] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [nivelActividad, setNivelActividad] = useState<string | null>(null);
  const [objetivo, setObjetivo] = useState<string | null>(null);
  const [ritmoKgSemana, setRitmoKgSemana] = useState('');
  const [protPct, setProtPct] = useState('30');
  const [carbPct, setCarbPct] = useState('40');
  const [grasaPct, setGrasaPct] = useState('30');
  const [override, setOverride] = useState('');

  function aplicar(p: Perfil) {
    setPerfil(p);
    setSexo(p.sexo);
    setFechaNacimiento(p.fechaNacimiento ?? '');
    setAlturaCm(p.alturaCm?.toString() ?? '');
    setPesoKg(p.pesoKg?.toString() ?? '');
    setNivelActividad(p.nivelActividad);
    setObjetivo(p.objetivo);
    setRitmoKgSemana(p.ritmoKgSemana?.toString() ?? '');
    setProtPct(p.metaProteinaPct.toString());
    setCarbPct(p.metaCarbosPct.toString());
    setGrasaPct(p.metaGrasasPct.toString());
    setOverride(p.metaCaloriasOverride?.toString() ?? '');
  }

  useEffect(() => {
    let activo = true;
    if (!auth.idToken) {
      setCargando(false);
      setError('Inicia sesión para ver tu perfil.');
      return;
    }
    setCargando(true);
    getPerfil(auth.idToken)
      .then((p) => {
        if (activo) {
          aplicar(p);
          setError(null);
        }
      })
      .catch((e) => {
        if (activo) setError(e instanceof ApiError ? e.message : 'No se pudo cargar el perfil.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [auth.idToken]);

  const pctSuma = useMemo(
    () => (num(protPct) ?? 0) + (num(carbPct) ?? 0) + (num(grasaPct) ?? 0),
    [protPct, carbPct, grasaPct],
  );

  // El badge "Datos guardados" se cierra solo a los 6 s.
  useEffect(() => {
    if (!guardado) return;
    const t = setTimeout(() => setGuardado(false), 6000);
    return () => clearTimeout(t);
  }, [guardado]);

  async function guardar() {
    if (!auth.idToken) return;
    const input: PerfilInput = {
      sexo,
      fechaNacimiento: fechaNacimiento.trim() === '' ? null : fechaNacimiento.trim(),
      alturaCm: num(alturaCm),
      pesoKg: num(pesoKg),
      nivelActividad,
      objetivo,
      ritmoKgSemana: num(ritmoKgSemana),
      metaProteinaPct: num(protPct) ?? 30,
      metaCarbosPct: num(carbPct) ?? 40,
      metaGrasasPct: num(grasaPct) ?? 30,
      metaCaloriasOverride: num(override),
    };
    setGuardando(true);
    setError(null);
    try {
      const p = await putPerfil(auth.idToken, input);
      aplicar(p);
      setGuardado(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el perfil.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.backRow}>
          <Icon name="chevronLeft" size={18} color={colors.accent} />
          <Text style={styles.back}>Volver</Text>
        </Pressable>
        <Text style={styles.title}>Perfil</Text>
        <Pressable onPress={auth.signOut} hitSlop={10} style={styles.salirRow}>
          <Icon name="logout" size={16} color={colors.danger} />
          <Text style={styles.salir}>Salir</Text>
        </Pressable>
      </View>

      {guardado && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✓ Datos guardados</Text>
        </View>
      )}

      {perfil && !perfil.perfilCompleto && (
        <View style={styles.aviso}>
          <Text style={styles.avisoText}>
            Completa todos los datos para calcular tu meta de calorías.
          </Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Meta calculada */}
      {perfil?.perfilCompleto && perfil.metaCalorias != null && (
        <View style={styles.metaCard}>
          <Text style={styles.metaKcal}>{perfil.metaCalorias} kcal/día</Text>
          <Text style={styles.metaSub}>
            TMB {perfil.tmb} · TDEE {perfil.tdee}
            {perfil.metaTopada ? ' · topada al mínimo seguro' : ''}
          </Text>
          {perfil.macros && (
            <Text style={styles.metaSub}>
              P {perfil.macros.proteinaG} g · C {perfil.macros.carbosG} g · G{' '}
              {perfil.macros.grasasG} g
            </Text>
          )}
        </View>
      )}

      <Campo
        label="Sexo"
        help="Se usa en la fórmula Mifflin-St Jeor: el cálculo del metabolismo basal difiere entre hombres y mujeres."
      >
        <Chips options={SEXOS} value={sexo} onChange={setSexo} />
      </Campo>

      <Campo
        label="Fecha de nacimiento"
        help="Tu edad ajusta el cálculo: el metabolismo basal disminuye con los años."
      >
        <DateField
          value={fechaNacimiento.trim() === '' ? null : fechaNacimiento}
          onChange={setFechaNacimiento}
          placeholder="Selecciona tu fecha"
        />
      </Campo>

      <Campo label="Altura (cm)" help="En centímetros. Entra en la fórmula del gasto energético.">
        <Input value={alturaCm} onChangeText={setAlturaCm} keyboardType="numeric" placeholder="178" />
      </Campo>

      <Campo label="Peso (kg)" help="En kilogramos. Es el factor de mayor peso en tu metabolismo basal.">
        <Input value={pesoKg} onChangeText={setPesoKg} keyboardType="numeric" placeholder="80" />
      </Campo>

      <Campo
        label="Nivel de actividad"
        help="Cuánto te mueves al día. Multiplica tu metabolismo basal para estimar el gasto total (TDEE)."
      >
        <Chips options={NIVELES} value={nivelActividad} onChange={setNivelActividad} />
      </Campo>

      <Campo
        label="Objetivo"
        help="Perder, mantener o ganar peso. Ajusta tus calorías por encima o por debajo del gasto."
      >
        <Chips options={OBJETIVOS} value={objetivo} onChange={setObjetivo} />
      </Campo>

      <Campo
        label="Ritmo (kg/semana)"
        help="Kg por semana que quieres perder o ganar. 0.5 es un ritmo saludable. Se ignora si eliges Mantener."
      >
        <Input
          value={ritmoKgSemana}
          onChangeText={setRitmoKgSemana}
          keyboardType="numeric"
          placeholder="0.5"
        />
      </Campo>

      <Campo
        label="Split de macros (%)"
        help="Cómo repartir tus calorías entre proteína, carbohidratos y grasa. Deben sumar 100%."
      >
        <View style={styles.pctRow}>
          <Input value={protPct} onChangeText={setProtPct} keyboardType="numeric" style={styles.pctInput} />
          <Input value={carbPct} onChangeText={setCarbPct} keyboardType="numeric" style={styles.pctInput} />
          <Input value={grasaPct} onChangeText={setGrasaPct} keyboardType="numeric" style={styles.pctInput} />
        </View>
        <Text style={[styles.hint, pctSuma !== 100 && styles.hintWarn]}>
          Proteína · Carbos · Grasas {pctSuma !== 100 ? `— suman ${pctSuma}, deben sumar 100` : '✓ suman 100'}
        </Text>
      </Campo>

      <Campo
        label="Override de calorías (opcional)"
        help="Si prefieres fijar tu meta manualmente, escribe las kcal aquí y mandará sobre el cálculo."
      >
        <Input value={override} onChangeText={setOverride} keyboardType="numeric" placeholder="manual" />
      </Campo>

      <Pressable
        onPress={guardar}
        disabled={guardando}
        style={({ pressed }) => [styles.boton, pressed && styles.pressed, guardando && styles.botonOff]}
      >
        {guardando ? (
          <Text style={styles.botonText}>Guardando…</Text>
        ) : (
          <View style={styles.botonInner}>
            <Icon name="check" size={18} color={colors.bg} />
            <Text style={styles.botonText}>Guardar perfil</Text>
          </View>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Campo({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.campo}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {help ? <HelpTip text={help} /> : null}
      </View>
      {children}
    </View>
  );
}

function Input({ style, ...props }: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.input, style]}
      {...props}
    />
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={({ pressed }) => [
            styles.chip,
            value === o && styles.chipActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 72 },
  back: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  salirRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 72, justifyContent: 'flex-end' },
  salir: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  aviso: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  avisoText: { color: colors.warning, fontSize: 13 },
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  badgeText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
  metaCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  metaKcal: { color: colors.primary, fontSize: 28, fontWeight: '800' },
  metaSub: { color: colors.textMuted, fontSize: 13 },
  campo: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 12 },
  hintWarn: { color: colors.warning },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  pctRow: { flexDirection: 'row', gap: spacing.sm },
  pctInput: { flex: 1, textAlign: 'center' },
  chipRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.bg },
  boton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  botonOff: { backgroundColor: colors.primaryDark },
  botonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  botonText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
