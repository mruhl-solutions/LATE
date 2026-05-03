import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import type { EstadoIntercambio } from '@/types/app';

const LABELS: Record<EstadoIntercambio, string> = {
  iniciado:  'Pendiente',
  en_curso:  'En negociación',
  aceptado:  'Acordado',
  terminado: 'Finalizado',
  cancelado: 'Cancelado',
};

const LABELS_COMPACT: Record<EstadoIntercambio, string> = {
  iniciado:  'Pend.',
  en_curso:  'Negoc.',
  aceptado:  'Acord.',
  terminado: 'Fin.',
  cancelado: 'Canc.',
};

interface EstadoBadgeProps {
  estado: EstadoIntercambio;
  compact?: boolean;
}

export function EstadoBadge({ estado, compact = false }: EstadoBadgeProps) {
  const color = Colors.estado[estado];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }, compact && styles.badgeCompact]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }, compact && styles.labelCompact]}>
        {compact ? LABELS_COMPACT[estado] : LABELS[estado]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeCompact: { paddingHorizontal: 7, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '700' },
  labelCompact: { fontSize: 10 },
});
