import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { GoogleAuthState } from '../auth/useGoogleAuth';
import GoogleIcon from './GoogleIcon';
import { radius, spacing } from '../theme';

/**
 * Botón "Entrar con Google" con el estilo oficial (fondo claro + logo G).
 * Pensado para la cabecera cuando NO hay sesión. `compact` muestra solo el icono.
 */
export default function GoogleSignInButton({
  auth,
  compact = false,
}: {
  auth: GoogleAuthState;
  compact?: boolean;
}) {
  const disabled = !auth.configured || auth.inProgress;
  return (
    <Pressable
      onPress={auth.signIn}
      disabled={disabled}
      accessibilityLabel="Entrar con Google"
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {auth.inProgress ? (
        <ActivityIndicator size="small" color="#3C4043" />
      ) : (
        <GoogleIcon size={18} />
      )}
      {!compact && (
        <Text style={styles.text}>{auth.inProgress ? 'Abriendo…' : 'Entrar con Google'}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#DADCE0',
    // Sombra sutil para separarlo del fondo oscuro.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  btnCompact: { paddingHorizontal: spacing.sm + 2, width: 40, height: 40, justifyContent: 'center' },
  text: { color: '#3C4043', fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
