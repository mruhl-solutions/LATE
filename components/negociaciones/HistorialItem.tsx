import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { EstadoBadge } from '@/components/intercambios/EstadoBadge';
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

  const totalNumeros =
    intercambio.numeros_pedidos.length + intercambio.numeros_ofrecidos.length;

  return (
    <Pressable
      style={styles.item}
      onPress={() => router.push(`/(app)/(negociaciones)/${intercambio.id}` as never)}
    >
      <View style={styles.left}>
        <Text style={styles.alias}>{contraparte ?? 'Desconocido'}</Text>
        <Text style={styles.fecha}>{fecha}</Text>
        <Text style={styles.numeros}>
          {totalNumeros} número{totalNumeros !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <EstadoBadge estado={intercambio.estado} />
        {intercambio.estado === 'terminado' && (
          <Ionicons name="star-outline" size={16} color="#FBBF24" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    opacity: 0.85,
  },
  left: { flex: 1, marginRight: 12 },
  alias: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  fecha: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  numeros: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 6 },
});
