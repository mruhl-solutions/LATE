import { View, Text, StyleSheet } from 'react-native';
import { C } from '@/constants/colors';
import type { Mensaje } from '@/types/app';

interface ChatBubbleProps {
  mensaje: Mensaje;
  esMio: boolean;
}

export function ChatBubble({ mensaje, esMio }: ChatBubbleProps) {
  const hora = new Date(mensaje.created_at).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.row, esMio ? styles.rowMio : styles.rowOtro]}>
      <View style={[styles.bubble, esMio ? styles.bubbleMio : styles.bubbleOtro]}>
        <Text style={[styles.contenido, esMio && styles.contenidoMio]}>{mensaje.contenido}</Text>
        <Text style={[styles.hora, esMio && styles.horaMio]}>{hora}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 3, paddingHorizontal: 12 },
  rowMio: { alignItems: 'flex-end' },
  rowOtro: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMio: {
    backgroundColor: C.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOtro: {
    backgroundColor: C.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  contenido: { fontSize: 15, color: C.textSecondary, lineHeight: 20 },
  contenidoMio: { color: C.bg },
  hora: { fontSize: 10, color: C.textMuted, marginTop: 3, alignSelf: 'flex-end' },
  horaMio: { color: `${C.bg}99` },
});
