import { View, Text, StyleSheet } from 'react-native';
import { TOTAL_FIGURITAS } from '@/constants/config';

interface AlbumStatsProps {
  faltantes: number;
  repetidas: number;
}

export function AlbumStats({ faltantes, repetidas }: AlbumStatsProps) {
  const completadas = TOTAL_FIGURITAS - faltantes;
  const pct = Math.max(0, Math.min(1, completadas / TOTAL_FIGURITAS));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <StatChip value={completadas} label="Tengo" color="#22C55E" />
        <StatChip value={faltantes} label="Me faltan" color="#3B82F6" />
        <StatChip value={repetidas} label="Repetidas" color="#F59E0B" />
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>

      <View style={styles.barLabels}>
        <Text style={styles.barPct}>{Math.round(pct * 100)}% completado</Text>
        <Text style={styles.barTotal}>{completadas} / {TOTAL_FIGURITAS}</Text>
      </View>
    </View>
  );
}

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: `${color}33` }]}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
  },
  chipValue: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  chipLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 },
  barTrack: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 3,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barPct: { fontSize: 11, color: '#22C55E', fontWeight: '700' },
  barTotal: { fontSize: 11, color: '#4B5563', fontWeight: '600' },
});
