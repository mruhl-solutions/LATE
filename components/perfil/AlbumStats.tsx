import { View, Text, StyleSheet } from 'react-native';
import { C } from '@/constants/colors';

interface AlbumStatsProps {
  faltantes: number;
  repetidas: number;
  totalFiguritas: number;
}

export function AlbumStats({ faltantes, repetidas, totalFiguritas }: AlbumStatsProps) {
  const total = totalFiguritas > 0 ? totalFiguritas : 1;
  const completadas = Math.max(0, total - faltantes);
  const pct = Math.max(0, Math.min(1, completadas / total));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <StatChip value={completadas} label="Tengo" color={C.accent} />
        <StatChip value={faltantes} label="Me faltan" color={C.info} />
        <StatChip value={repetidas} label="Repetidas" color={C.primary} />
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>

      <View style={styles.barLabels}>
        <Text style={styles.barPct}>{Math.round(pct * 100)}% completado</Text>
        <Text style={styles.barTotal}>{completadas} / {totalFiguritas}</Text>
      </View>
    </View>
  );
}

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: `${color}44` }]}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20, gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
  },
  chipValue: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  chipLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 },
  barTrack: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barPct: { fontSize: 11, color: C.accent, fontWeight: '700' },
  barTotal: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
});
