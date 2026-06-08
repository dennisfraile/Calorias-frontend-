import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, radius, spacing } from '../theme';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const pad = (n: number) => String(n).padStart(2, '0');

interface YMD {
  y: number;
  m: number; // 0-11
  d: number;
}

function parseISO(s: string | null): YMD | null {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return { y: +match[1], m: +match[2] - 1, d: +match[3] };
}

function CalendarGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke={colors.textMuted} strokeWidth="1.6" />
      <Path d="M3 9h18M8 2.5v4M16 2.5v4" stroke={colors.textMuted} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  const d = dir === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6';
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Selector de fecha con calendario propio (modal), coherente con el tema oscuro.
 * No permite fechas futuras (pensado para fecha de nacimiento). Devuelve YYYY-MM-DD.
 */
export default function DateField({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
}: {
  value: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseISO(value);
  const display = parsed ? `${parsed.d} ${MESES_CORTO[parsed.m]} ${parsed.y}` : placeholder;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text style={[styles.fieldText, !parsed && styles.placeholder]}>{display}</Text>
        <CalendarGlyph />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <CalendarBody
              selected={parsed}
              onPick={(y, m, d) => {
                onChange(`${y}-${pad(m + 1)}-${pad(d)}`);
                setOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function CalendarBody({
  selected,
  onPick,
}: {
  selected: YMD | null;
  onPick: (y: number, m: number, d: number) => void;
}) {
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const [mode, setMode] = useState<'days' | 'years'>('days');
  const [viewY, setViewY] = useState(selected?.y ?? todayY);
  const [viewM, setViewM] = useState(selected?.m ?? todayM);

  // Primer día del mes alineado a lunes, y número de días.
  const firstWeekday = (new Date(viewY, viewM, 1).getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isFuture = (d: number) =>
    viewY > todayY ||
    (viewY === todayY && viewM > todayM) ||
    (viewY === todayY && viewM === todayM && d > todayD);

  const cambiarMes = (delta: number) => {
    let m = viewM + delta;
    let y = viewY;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewM(m);
    setViewY(y);
  };

  if (mode === 'years') {
    // Página de 12 años terminando en el año visible (sin años futuros).
    const finAnio = Math.min(viewY + 4, todayY);
    const years = Array.from({ length: 12 }, (_, i) => finAnio - 11 + i);
    return (
      <View>
        <View style={styles.header}>
          <Pressable onPress={() => setViewY((y) => y - 12)} style={styles.navBtn} hitSlop={6}>
            <Chevron dir="left" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {years[0]} – {years[years.length - 1]}
          </Text>
          <Pressable
            onPress={() => setViewY((y) => Math.min(y + 12, todayY))}
            style={styles.navBtn}
            hitSlop={6}
          >
            <Chevron dir="right" />
          </Pressable>
        </View>
        <View style={styles.yearGrid}>
          {years.map((y) => {
            const futuro = y > todayY;
            const sel = selected?.y === y;
            return (
              <Pressable
                key={y}
                disabled={futuro}
                onPress={() => {
                  setViewY(y);
                  setMode('days');
                }}
                style={({ pressed }) => [
                  styles.yearCell,
                  sel && styles.cellSelected,
                  pressed && !futuro && styles.pressed,
                ]}
              >
                <Text style={[styles.yearText, sel && styles.cellTextSelected, futuro && styles.dayMuted]}>
                  {y}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => cambiarMes(-1)} style={styles.navBtn} hitSlop={6}>
          <Chevron dir="left" />
        </Pressable>
        <Pressable onPress={() => setMode('years')} hitSlop={6}>
          <Text style={styles.headerTitle}>
            {MESES[viewM]} {viewY}
          </Text>
        </Pressable>
        <Pressable onPress={() => cambiarMes(1)} style={styles.navBtn} hitSlop={6}>
          <Chevron dir="right" />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {DIAS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`b-${i}`} style={styles.dayCell} />;
          const futuro = isFuture(d);
          const sel = selected?.y === viewY && selected?.m === viewM && selected?.d === d;
          const hoy = viewY === todayY && viewM === todayM && d === todayD;
          return (
            <Pressable
              key={d}
              disabled={futuro}
              onPress={() => onPick(viewY, viewM, d)}
              style={({ pressed }) => [styles.dayCell, pressed && !futuro && styles.pressed]}
            >
              <View style={[styles.dayInner, sel && styles.cellSelected, hoy && !sel && styles.dayToday]}>
                <Text style={[styles.dayText, sel && styles.cellTextSelected, futuro && styles.dayMuted]}>
                  {d}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  fieldText: { color: colors.text, fontSize: 15 },
  placeholder: { color: colors.textMuted },
  pressed: { opacity: 0.7 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: 320,
    maxWidth: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  weekRow: { flexDirection: 'row' },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  dayMuted: { color: colors.border },
  dayToday: { borderWidth: 1, borderColor: colors.accent },
  cellSelected: { backgroundColor: colors.primary },
  cellTextSelected: { color: colors.bg, fontWeight: '800' },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  yearCell: {
    width: `${100 / 3}%`,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  yearText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
