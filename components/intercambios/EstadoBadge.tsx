import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import type { EstadoIntercambio } from '@/types/app';

const LABELS: Record<EstadoIntercambio, string> = {
  iniciado: 'Pendiente',
  en_curso: 'En negociación',
  aceptado: 'Acordado',
  terminado: 'Finalizado',
  cancelado: 'Cancelado',
};

interface EstadoBadgeProps {
  estado: EstadoIntercambio;
}

export function EstadoBadge({ estado }: EstadoBadgeProps) {
  const color = Colors.estado[estado];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{LABELS[estado]}</Text>
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
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '700' },
});
