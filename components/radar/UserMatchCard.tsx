import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { MatchResult } from '@/types/app';

interface UserMatchCardProps {
  match: MatchResult;
}

function formatStickers(nums: number[], max = 6): string {
  if (nums.length === 0) return '';
  const preview = nums.slice(0, max).join(', ');
  return nums.length > max ? `${preview} +${nums.length - max} más` : preview;
}

export function UserMatchCard({ match }: UserMatchCardProps) {
  const router = useRouter();

  const handleProponer = () => {
    router.push({
      pathname: '/(app)/(radar)/proponer',
      params: {
        receptor_id: match.usuario_id,
        alias: match.alias,
        ellos_tienen: JSON.stringify(match.ellos_tienen_yo_busco),
        yo_tengo: JSON.stringify(match.yo_tengo_ellos_buscan),
      },
    } as never);
  };

  const tieneMias = match.ellos_tienen_yo_busco.length > 0;
  const necesitaMias = match.yo_tengo_ellos_buscan.length > 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.alias}>@{match.alias}</Text>
          {match.distancia_km != null && (
            <Text style={styles.distancia}>
              <Ionicons name="location-outline" size={11} color="#6B7280" /> {match.distancia_km} km
            </Text>
          )}
        </View>
        {match.es_bidireccional && (
          <View style={styles.biBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
            <Text style={styles.biText}>Intercambio posible</Text>
          </View>
        )}
      </View>

      {/* Lo que tiene que yo busco */}
      {tieneMias && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.sectionLabel}>
              Tiene {match.ellos_tienen_yo_busco.length} que buscás
            </Text>
          </View>
          <Text style={styles.numeros}>{formatStickers(match.ellos_tienen_yo_busco)}</Text>
        </View>
      )}

      {/* Lo que necesita y yo tengo */}
      {necesitaMias && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.sectionLabel}>
              Necesita {match.yo_tengo_ellos_buscan.length} que tenés
            </Text>
          </View>
          <Text style={styles.numeros}>{formatStickers(match.yo_tengo_ellos_buscan)}</Text>
        </View>
      )}

      <Pressable style={styles.proponerBtn} onPress={handleProponer}>
        <Ionicons name="swap-horizontal" size={16} color="#fff" />
        <Text style={styles.proponerText}>Proponer intercambio</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: { gap: 2 },
  alias: { fontSize: 17, fontWeight: '800', color: '#F9FAFB' },
  distancia: { fontSize: 12, color: '#6B7280' },
  biBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#052e16',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#16653444',
  },
  biText: { fontSize: 11, color: '#22C55E', fontWeight: '700' },
  section: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#D1D5DB' },
  numeros: { fontSize: 12, color: '#6B7280', lineHeight: 18, paddingLeft: 13 },
  proponerBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  proponerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
