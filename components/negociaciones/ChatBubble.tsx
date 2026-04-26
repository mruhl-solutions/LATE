import { View, Text, StyleSheet } from 'react-native';
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
        <Text style={styles.contenido}>{mensaje.contenido}</Text>
        <Text style={styles.hora}>{hora}</Text>
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
    backgroundColor: '#FF6B35',
    borderBottomRightRadius: 4,
  },
  bubbleOtro: {
    backgroundColor: '#2C2C2E',
    borderBottomLeftRadius: 4,
  },
  contenido: { fontSize: 15, color: '#F5F5F5', lineHeight: 20 },
  hora: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3, alignSelf: 'flex-end' },
});
