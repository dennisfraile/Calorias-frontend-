import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GoogleAuthState } from '../auth/useGoogleAuth';
import { ApiError } from '../api/comidas';
import { getResumen, type Periodo, type ResumenPeriodos } from '../api/resumen';
import { useTheme } from '../theme-context';
import { radius, spacing, type Palette } from '../theme';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'diario', label: 'Día' },
  { key: 'semanal', label: 'Semana' },
  { key: 'mensual', label: 'Mes' },
  { key: 'trimestral', label: 'Trim.' },
  { key: 'semestral', label: 'Sem.' },
  { key: 'anual', label: 'Año' },
];

function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DashboardScreen({ auth }: { auth: GoogleAuthState }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [periodo, setPeriodo] = useState<Periodo>('semanal');
  const [data, setData] = useState<ResumenPeriodos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.idToken) {
      setData(null);
      return;
    }
    let activo = true;
    setCargando(true);
    setError(null);
    getResumen(auth.idToken, periodo, hoyLocal())
      .then((r) => {
        if (activo) setData(r);
      })
      .catch((e) => {
        if (activo) setError(e instanceof ApiError ? e.message : 'No se pudo cargar el resumen.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [auth.idToken, periodo]);

  if (!auth.idToken) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.bg }]}>
        <Text style={styles.aviso}>Debe iniciar sesión para ver tu dashboard.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard</Text>

        <View style={styles.tabs}>
          {PERIODOS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setPeriodo(p.key)}
              style={({ pressed }) => [
                styles.tab,
                periodo === p.key && styles.tabActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.tabText, periodo === p.key && styles.tabTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {data && !cargando && (
          <>
            <Comparativa data={data} colors={colors} styles={styles} />
            <Barras data={data} colors={colors} styles={styles} />
            <MacrosVsMeta data={data} colors={colors} styles={styles} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

type Estilos = ReturnType<typeof makeStyles>;

function Comparativa({ data, colors, styles }: { data: ResumenPeriodos; colors: Palette; styles: Estilos }) {
  const { actual, anterior, cambioPct, meta } = data;
  const sube = (cambioPct ?? 0) > 0;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Promedio kcal/día</Text>
      <View style={styles.compRow}>
        <View style={styles.compCol}>
          <Text style={styles.compActual}>{actual.promedioKcalDia}</Text>
          <Text style={styles.compLabel}>Actual</Text>
        </View>
        <View style={styles.compCol}>
          <Text style={styles.compAnterior}>{anterior.promedioKcalDia}</Text>
          <Text style={styles.compLabel}>Anterior</Text>
        </View>
      </View>
      {cambioPct != null && (
        <Text style={[styles.pill, { color: sube ? colors.warning : colors.primary }]}>
          {sube ? '▲' : '▼'} {Math.abs(cambioPct)}% vs período anterior
        </Text>
      )}
      {meta && actual.deficitMedioVsMeta != null && (
        <Text style={styles.metaLine}>
          Meta {meta.calorias} kcal · {actual.deficitMedioVsMeta >= 0 ? '+' : ''}
          {actual.deficitMedioVsMeta} kcal vs meta
        </Text>
      )}
    </View>
  );
}

function Barras({ data, colors, styles }: { data: ResumenPeriodos; colors: Palette; styles: Estilos }) {
  const { actual, anterior, meta } = data;
  const H = 160;
  const maxKcal = Math.max(
    1,
    ...actual.buckets.map((b) => b.kcal),
    ...anterior.buckets.map((b) => b.kcal),
    meta?.calorias ?? 0,
  );
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Distribución del período</Text>
      <View style={[styles.plot, { height: H }]}>
        {meta && <View style={[styles.metaBar, { bottom: (meta.calorias / maxKcal) * H }]} />}
        <View style={styles.barsRow}>
          {actual.buckets.map((b, i) => {
            const ha = (b.kcal / maxKcal) * H;
            const hp = ((anterior.buckets[i]?.kcal ?? 0) / maxKcal) * H;
            return (
              <View key={i} style={styles.barPair}>
                <View style={[styles.barAnterior, { height: hp }]} />
                <View style={[styles.barActual, { height: ha }]} />
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.labelsRow}>
        {actual.buckets.map((b, i) => (
          <Text key={i} style={styles.barLabel} numberOfLines={1}>
            {b.etiqueta}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <Leyenda color={colors.primary} text="Actual" styles={styles} />
        <Leyenda color={colors.textMuted} text="Anterior" styles={styles} />
        {meta && <Leyenda color={colors.accent} text="Meta" styles={styles} />}
      </View>
    </View>
  );
}

function Leyenda({ color, text, styles }: { color: string; text: string; styles: Estilos }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

function MacrosVsMeta({ data, colors, styles }: { data: ResumenPeriodos; colors: Palette; styles: Estilos }) {
  const { actual, meta } = data;
  if (!meta) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Macros</Text>
        <Text style={styles.metaLine}>Completa tu perfil para ver tus metas de macros.</Text>
      </View>
    );
  }
  const rows: { label: string; a: number; m: number }[] = [
    { label: 'Proteína', a: actual.macros.proteinaG, m: meta.proteinaG },
    { label: 'Carbos', a: actual.macros.carbosG, m: meta.carbosG },
    { label: 'Grasas', a: actual.macros.grasasG, m: meta.grasasG },
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Macros (promedio diario vs meta)</Text>
      {rows.map((r) => {
        const pct = Math.min(1, r.m > 0 ? r.a / r.m : 0);
        return (
          <View key={r.label} style={styles.macroRow}>
            <Text style={styles.macroLabel}>{r.label}</Text>
            <View style={styles.macroBarBg}>
              <View style={[styles.macroBarFill, { width: `${pct * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={styles.macroVal}>
              {r.a} / {r.m} g
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: spacing.xl },
    container: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: spacing.md },
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    aviso: { color: colors.danger, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    title: { color: colors.text, fontSize: 24, fontWeight: '800' },
    error: { color: colors.danger, fontSize: 13 },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    tab: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: colors.bg },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    compRow: { flexDirection: 'row', justifyContent: 'space-around' },
    compCol: { alignItems: 'center', gap: 2 },
    compActual: { color: colors.primary, fontSize: 30, fontWeight: '800' },
    compAnterior: { color: colors.textMuted, fontSize: 30, fontWeight: '800' },
    compLabel: { color: colors.textMuted, fontSize: 12 },
    pill: { textAlign: 'center', fontSize: 14, fontWeight: '700' },
    metaLine: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
    plot: { position: 'relative', justifyContent: 'flex-end' },
    metaBar: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.accent },
    barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 2 },
    barPair: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 2 },
    barActual: { width: 8, backgroundColor: colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    barAnterior: { width: 6, backgroundColor: colors.textMuted, borderTopLeftRadius: 3, borderTopRightRadius: 3, opacity: 0.5 },
    labelsRow: { flexDirection: 'row', gap: 2 },
    barLabel: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 10 },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.xs },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { color: colors.textMuted, fontSize: 12 },
    macroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    macroLabel: { color: colors.text, fontSize: 13, width: 70 },
    macroBarBg: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
    macroBarFill: { height: '100%', borderRadius: 5 },
    macroVal: { color: colors.textMuted, fontSize: 12, width: 80, textAlign: 'right' },
    pressed: { opacity: 0.7 },
  });
