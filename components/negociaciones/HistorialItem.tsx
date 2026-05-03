import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { EstadoBadge } from '@/components/intercambios/EstadoBadge';
import { C } from '@/constants/colors';
import type { IntercambioConAlias } from '@/types/app';

interface HistorialItemProps {
  intercambio: IntercambioConAlias;
}

export function HistorialItem({ intercambio }: HistorialItemProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const contraparte =
    intercambio.iniciador_id === user?.id
      ? intercambio.receptor?.alias
      : intercambio.iniciador?.alias;

  const fecha = new Date(intercambio.updated_at).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Pressable
      style={styles.item}
      onPress={() => router.push(`/(app)/(negociaciones)/${intercambio.id}` as never)}
    >
      <View style={styles.left}>
        <Text style={styles.alias}>{contraparte ?? 'Desconocido'}</Text>
        <Text style={styles.fecha}>{fecha}</Text>
      </View>
      <View style={styles.right}>
        <EstadoBadge estado={intercambio.estado} />
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    opacity: 0.85,
  },
  left: { flex: 1, marginRight: 12 },
  alias: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  fecha: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6, flexDirection: 'row', alignItems: 'center' },
});
