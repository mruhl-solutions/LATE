import { View, Text, StyleSheet } from 'react-native';
import { C } from '@/constants/colors';

interface AlbumStatsProps {
  necesito: number;
  repetidas: number;
  nombre?: string;
}

export function AlbumStats({ necesito, repetidas, nombre }: AlbumStatsProps) {
  return (
    <View style={styles.container}>
      {nombre && <Text style={styles.nombre}>{nombre}</Text>}
      <View style={styles.row}>
        <StatChip value={necesito} label="Necesito" color={C.info} />
        <StatChip value={repetidas} label="Repetidas" color={C.primary} />
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
  container: { marginBottom: 16, gap: 8 },
  nombre: { fontSize: 13, color: C.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
  },
  chipValue: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  chipLabel: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '600',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
