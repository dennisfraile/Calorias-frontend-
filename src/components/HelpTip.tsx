import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, type Palette } from '../theme';
import { useTheme } from '../theme-context';

/**
 * Botón "?" que despliega una burbuja flotante con ayuda contextual.
 * Se cierra tocando de nuevo el "?". La burbuja se ancla a la derecha del icono
 * y se abre hacia abajo/izquierda para no salirse por el borde derecho.
 */
export default function HelpTip({ text }: { text: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        hitSlop={8}
        accessibilityLabel="Ayuda"
        style={({ pressed }) => [styles.btn, open && styles.btnActive, pressed && styles.pressed]}
      >
        <Text style={[styles.q, open && styles.qActive]}>?</Text>
      </Pressable>

      {open && (
        <View style={styles.bubble}>
          <View style={styles.arrow} />
          <Text style={styles.bubbleText}>{text}</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { position: 'relative' },
  btn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  q: { color: colors.textMuted, fontSize: 11, fontWeight: '800', lineHeight: 14 },
  qActive: { color: colors.bg },
  pressed: { opacity: 0.7 },
  bubble: {
    position: 'absolute',
    bottom: 24,
    left: -4,
    width: 230,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 1000,
    // Profundidad para que flote por encima del resto del formulario.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  // Flecha apuntando hacia abajo (al "?"), pegada al borde inferior de la burbuja.
  arrow: {
    position: 'absolute',
    bottom: -5,
    left: 8,
    width: 10,
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  bubbleText: { color: colors.text, fontSize: 12, lineHeight: 17 },
});
