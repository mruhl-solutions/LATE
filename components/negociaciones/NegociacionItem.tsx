import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { EstadoBadge } from '@/components/intercambios/EstadoBadge';
import { C } from '@/constants/colors';
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

  const totalNumeros = intercambio.numeros_pedidos.length + intercambio.numeros_ofrecidos.length;

  return (
    <Pressable
      style={styles.item}
      onPress={() => router.push(`/(app)/(negociaciones)/${intercambio.id}` as never)}
    >
      <View style={styles.left}>
        <Text style={styles.alias}>{contraparte ?? 'Desconocido'}</Text>
        <Text style={styles.numeros}>
          {totalNumeros} figurita{totalNumeros !== 1 ? 's' : ''} en juego
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
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  left: { flex: 1, marginRight: 12 },
  alias: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  numeros: { fontSize: 13, color: C.textMuted, marginTop: 3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { fontSize: 22, color: C.textMuted },
});
