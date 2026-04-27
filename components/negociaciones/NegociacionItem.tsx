import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { EstadoBadge } from '@/components/intercambios/EstadoBadge';
import type { IntercambioConAlias } from '@/types/app';

interface NegociacionItemProps {
  intercambio: IntercambioConAlias;
}

export function NegociacionItem({ intercambio }: NegociacionItemProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const contraparte =
    intercambio.iniciador_id === user?.id
      ? intercambio.receptor?.alias
      : intercambio.iniciador?.alias;

  const totalNumeros =
    intercambio.numeros_pedidos.length + intercambio.numeros_ofrecidos.length;

  return (
    <Pressable
      style={styles.item}
      onPress={() => router.push(`/(app)/(negociaciones)/${intercambio.id}` as never)}
    >
      <View style={styles.left}>
        <Text style={styles.alias}>{contraparte ?? 'Desconocido'}</Text>
        <Text style={styles.numeros}>
          {totalNumeros} número{totalNumeros !== 1 ? 's' : ''} en juego
        </Text>
      </View>
      <View style={styles.right}>
        <EstadoBadge estado={intercambio.estado} />
        <Text style={styles.arrow}>›</Text>
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
    padding: 16,
    marginBottom: 8,
  },
  left: { flex: 1, marginRight: 12 },
  alias: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  numeros: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { fontSize: 22, color: '#6B7280' },
});
