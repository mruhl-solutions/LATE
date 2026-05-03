import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EstadoBadge } from './EstadoBadge';
import { AppButton } from '@/components/ui/AppButton';
import { arrayToDisplayString } from '@/lib/parsers';
import { C } from '@/constants/colors';
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
      ? (intercambio.iniciador as { alias: string } | undefined)?.alias ?? 'Desconocido'
      : (intercambio.receptor as { alias: string } | undefined)?.alias ?? 'Desconocido';

  const confirmAction = (label: string, cb?: () => void) => {
    if (!cb) return;
    Alert.alert('Confirmar', `¿${label}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí', onPress: cb },
    ]);
  };

  // Labels según perspectiva
  const labelPedidos  = perspective === 'receptor' ? 'Necesitan' : 'Necesito';
  const labelOfrece   = perspective === 'receptor' ? 'Te ofrecen' : 'Ofrezco';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.alias}>@{alias}</Text>
          <Text style={styles.date}>
            {new Date(intercambio.created_at).toLocaleDateString('es-AR')}
          </Text>
        </View>
        <EstadoBadge estado={intercambio.estado} />
      </View>

      <View style={styles.numerosGrid}>
        <View style={[styles.numerosCol, styles.colLeft]}>
          <View style={styles.colHeader}>
            <Ionicons name="search-outline" size={12} color={C.info} />
            <Text style={[styles.numerosLabel, { color: C.info }]}>{labelPedidos}</Text>
          </View>
          <Text style={styles.numeros}>
            {intercambio.numeros_pedidos.length > 0
              ? arrayToDisplayString(intercambio.numeros_pedidos)
              : '—'}
          </Text>
        </View>
        <View style={[styles.numerosCol, styles.colRight]}>
          <View style={styles.colHeader}>
            <Ionicons name="copy-outline" size={12} color={C.primary} />
            <Text style={[styles.numerosLabel, { color: C.primary }]}>{labelOfrece}</Text>
          </View>
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
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alias: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  date: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  numerosGrid: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  numerosCol: { flex: 1, padding: 10, gap: 6 },
  colLeft: { borderRightWidth: 1, borderRightColor: C.border },
  colRight: {},
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  numerosLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  numeros: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
