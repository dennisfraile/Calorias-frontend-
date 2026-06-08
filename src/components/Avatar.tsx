import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/**
 * Avatar circular: muestra la foto de Google; si falla la carga (p. ej. la
 * imagen de Google no se sirve por restricciones del navegador) o no hay foto,
 * cae a la inicial del nombre/email.
 */
export default function Avatar({
  picture,
  name,
  size = 36,
}: {
  picture?: string | null;
  name?: string | null;
  size?: number;
}) {
  const [falló, setFalló] = useState(false);
  const inicial = (name ?? '?').trim().slice(0, 1).toUpperCase() || '?';
  const mostrarFoto = !!picture && !falló;

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 2 }]}>
      {mostrarFoto ? (
        <Image
          source={{ uri: picture! }}
          onError={() => setFalló(true)}
          style={styles.img}
          accessibilityLabel="Foto de perfil"
        />
      ) : (
        <Text style={[styles.inicial, { fontSize: size * 0.45 }]}>{inicial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
  inicial: { color: colors.primary, fontWeight: '800' },
});
