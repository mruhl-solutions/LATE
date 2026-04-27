import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { MatchResult } from '@/types/app';

interface UserMatchCardProps {
  match: MatchResult;
}

export function UserMatchCard({ match }: UserMatchCardProps) {
  const router = useRouter();

  const handleProponer = () => {
    router.push({
      pathname: '/(app)/(radar)/proponer',
      params: {
        receptor_id: match.usuario_id,
        ellos_tienen: JSON.stringify(match.ellos_tienen_yo_busco),
        yo_tengo: JSON.stringify(match.yo_tengo_ellos_buscan),
      },
    } as never);
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.leftCol}>
          <Text style={styles.alias}>{match.alias}</Text>
          <Text style={styles.distancia}>{match.distancia_km} km</Text>
        </View>

        <View style={styles.rightCol}>
          {match.es_bidireccional && (
            <View style={styles.biBadge}>
              <Ionicons name="swap-horizontal" size={12} color="#22C55E" />
              <Text style={styles.biText}>Match mutuo</Text>
            </View>
          )}
          <Text style={styles.totalCoincidencias}>
            {match.total_coincidencias} coincidencia
            {match.total_coincidencias !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.coincidenciasRow}>
        {match.ellos_tienen_yo_busco.length > 0 && (
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Ellos tienen</Text>
            <Text style={styles.pillCount}>{match.ellos_tienen_yo_busco.length}</Text>
          </View>
        )}
        {match.yo_tengo_ellos_buscan.length > 0 && (
          <View style={[styles.pill, styles.pillGreen]}>
            <Text style={styles.pillLabel}>Yo ofrezco</Text>
            <Text style={styles.pillCount}>{match.yo_tengo_ellos_buscan.length}</Text>
          </View>
        )}
      </View>

      <Pressable style={styles.proponerBtn} onPress={handleProponer}>
        <Text style={styles.proponerText}>Proponer intercambio</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  leftCol: {},
  alias: { fontSize: 17, fontWeight: '700', color: '#F9FAFB' },
  distancia: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  biBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#052e16',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  biText: { fontSize: 11, color: '#22C55E', fontWeight: '700' },
  totalCoincidencias: { fontSize: 13, color: '#A78BFA', fontWeight: '600' },
  coincidenciasRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2e1065',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillGreen: { backgroundColor: '#052e16' },
  pillLabel: { fontSize: 12, color: '#9CA3AF' },
  pillCount: { fontSize: 13, fontWeight: '800', color: '#F9FAFB' },
  proponerBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  proponerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
