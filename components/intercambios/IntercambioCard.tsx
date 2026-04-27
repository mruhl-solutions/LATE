import { View, Text, StyleSheet, Alert } from 'react-native';
import { EstadoBadge } from './EstadoBadge';
import { AppButton } from '@/components/ui/AppButton';
import { arrayToDisplayString } from '@/lib/parsers';
import type { IntercambioConAlias } from '@/types/app';

interface IntercambioCardProps {
  intercambio: IntercambioConAlias;
  perspective: 'iniciador' | 'receptor';
  onAceptar?: () => void;
  onCancelar?: () => void;
}

export function IntercambioCard({
  intercambio,
  perspective,
  onAceptar,
  onCancelar,
}: IntercambioCardProps) {
  const alias =
    perspective === 'receptor'
      ? intercambio.iniciador?.alias ?? 'Desconocido'
      : intercambio.receptor?.alias ?? 'Desconocido';

  const confirmAction = (label: string, cb?: () => void) => {
    if (!cb) return;
    Alert.alert('Confirmar', `¿${label}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí', onPress: cb },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.alias}>{alias}</Text>
          <Text style={styles.date}>
            {new Date(intercambio.created_at).toLocaleDateString('es-AR')}
          </Text>
        </View>
        <EstadoBadge estado={intercambio.estado} />
      </View>

      <View style={styles.numerosRow}>
        <View style={styles.numerosCol}>
          <Text style={styles.numerosLabel}>
            {perspective === 'receptor' ? 'Ellos quieren' : 'Vos pediste'}
          </Text>
          <Text style={styles.numeros}>
            {intercambio.numeros_pedidos.length > 0
              ? arrayToDisplayString(intercambio.numeros_pedidos)
              : '—'}
          </Text>
        </View>
        <View style={styles.numerosCol}>
          <Text style={styles.numerosLabel}>
            {perspective === 'receptor' ? 'Ellos ofrecen' : 'Vos ofreciste'}
          </Text>
          <Text style={styles.numeros}>
            {intercambio.numeros_ofrecidos.length > 0
              ? arrayToDisplayString(intercambio.numeros_ofrecidos)
              : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {perspective === 'receptor' && onAceptar && (
          <View style={styles.flex}>
            <AppButton
              title="Aceptar"
              onPress={() => confirmAction('Aceptar propuesta', onAceptar)}
            />
          </View>
        )}
        {onCancelar && (
          <View style={styles.flex}>
            <AppButton
              title="Rechazar"
              onPress={() => confirmAction('Rechazar propuesta', onCancelar)}
              variant="danger"
            />
          </View>
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alias: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  date: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  numerosRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  numerosCol: { flex: 1 },
  numerosLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase' },
  numeros: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
