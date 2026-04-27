import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { arrayToDisplayString } from '@/lib/parsers';
import type { IntercambioConAlias } from '@/types/app';

interface CompletadoItemProps {
  intercambio: IntercambioConAlias;
}

function StickersChip({ label, numeros, color }: { label: string; numeros: number[]; color: string }) {
  const preview = numeros.slice(0, 5).join(', ');
  const extra = numeros.length > 5 ? ` +${numeros.length - 5}` : '';
  return (
    <View style={[styles.chip, { borderColor: `${color}33` }]}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
      <Text style={styles.chipNums}>{numeros.length === 0 ? '—' : `${preview}${extra}`}</Text>
      <View style={[styles.chipCount, { backgroundColor: `${color}22` }]}>
        <Text style={[styles.chipCountText, { color }]}>{numeros.length}</Text>
      </View>
    </View>
  );
}

export function CompletadoItem({ intercambio }: CompletadoItemProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const esIniciador = intercambio.iniciador_id === user?.id;
  const contraparte = esIniciador
    ? intercambio.receptor?.alias
    : intercambio.iniciador?.alias;

  // Desde la perspectiva del usuario actual:
  // iniciador: ofrece numeros_ofrecidos, recibe numeros_pedidos
  // receptor:  ofrece numeros_pedidos,   recibe numeros_ofrecidos
  const ofrecidos = esIniciador ? intercambio.numeros_ofrecidos : intercambio.numeros_pedidos;
  const recibidos = esIniciador ? intercambio.numeros_pedidos : intercambio.numeros_ofrecidos;

  const fecha = new Date(intercambio.updated_at).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(app)/(negociaciones)/${intercambio.id}` as never)}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.alias}>@{contraparte ?? 'Desconocido'}</Text>
          <Text style={styles.fecha}>{fecha}</Text>
        </View>
        <View style={styles.chatIcon}>
          <Ionicons name="chatbubble-outline" size={14} color="#7C3AED" />
          <Text style={styles.chatText}>Ver chat</Text>
        </View>
      </View>

      <View style={styles.intercambioRow}>
        <StickersChip label="Di" numeros={ofrecidos} color="#F59E0B" />
        <Ionicons name="arrow-forward" size={16} color="#374151" />
        <StickersChip label="Recibí" numeros={recibidos} color="#22C55E" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#22C55E18',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { gap: 2 },
  alias: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  fecha: { fontSize: 11, color: '#6B7280' },
  chatIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2e1065',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chatText: { fontSize: 11, color: '#7C3AED', fontWeight: '700' },
  intercambioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  chipLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipNums: { fontSize: 11, color: '#9CA3AF', lineHeight: 16 },
  chipCount: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  chipCountText: { fontSize: 11, fontWeight: '800' },
});
