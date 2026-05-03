import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIntercambios, type ConversacionInfo } from '@/lib/hooks/useIntercambios';
import { EmptyState } from '@/components/ui/EmptyState';
import { C } from '@/constants/colors';

type Tab = 'activos' | 'completados' | 'cancelados';

const ConversacionCard = ({ conversacion }: { conversacion: ConversacionInfo }) => {
  const router = useRouter();
  const [statusColor, statusText] = useMemo(() => {
    const estados = conversacion.intercambios.map((i) => i.estado);
    if (estados.some((e) => e === 'aceptado')) return [C.Primary, 'En trato'];
    if (estados.some((e) => e === 'en_curso')) return [C.Accent, 'Negociando'];
    return [C.Secondary, 'Propuesta'];
  }, [conversacion.intercambios]);

  const fecha = new Date(conversacion.ultimo_mensaje_fecha);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  let fechaTexto = fecha.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
  if (fecha.toDateString() === hoy.toDateString()) fechaTexto = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  else if (fecha.toDateString() === ayer.toDateString()) fechaTexto = 'Ayer';

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(negociaciones)/${conversacion.usuario_id}`)}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={styles.alias}>@{conversacion.alias}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{statusText}</Text>
            <Text style={styles.countText}>({conversacion.intercambios.length})</Text>
          </View>
        </View>
        <Text style={styles.fecha}>{fechaTexto}</Text>
      </View>
      <View style={styles.numerosPreview}>
        {conversacion.intercambios.map((inter) => (
          <View key={inter.id} style={styles.interPreview}>
            {inter.numeros_pedidos.length > 0 && (
              <Text style={styles.previewText}>Pide: {inter.numeros_pedidos.slice(0, 2).join(', ')}{inter.numeros_pedidos.length > 2 ? '...' : ''}</Text>
            )}
            {inter.numeros_ofrecidos.length > 0 && (
              <Text style={styles.previewText}>Ofrece: {inter.numeros_ofrecidos.slice(0, 2).join(', ')}{inter.numeros_ofrecidos.length > 2 ? '...' : ''}</Text>
            )}
          </View>
        ))}
      </View>
    </Pressable>
  );
};

export default function NegociacionesScreen() {
  const { conversaciones, negociaciones, completados, historial, loading, fetchAll } = useIntercambios();
  const [tab, setTab] = useState<Tab>('activos');

  useEffect(() => {
    fetchAll();
  }, []);

  const currentData = useMemo(() => {
    if (tab === 'activos') return conversaciones;
    if (tab === 'completados') return conversaciones.filter((c) => c.intercambios.every((i) => i.estado === 'terminado'));
    return conversaciones.filter((c) => c.intercambios.every((i) => i.estado === 'cancelado'));
  }, [conversaciones, tab]);

  const renderConversacion = useCallback(
    ({ item }: { item: ConversacionInfo }) => <ConversacionCard conversacion={item} />,
    [],
  );

  const activeCount = conversaciones.filter((c) => c.intercambios.some((i) => i.estado !== 'terminado' && i.estado !== 'cancelado')).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Chats</Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'activos' && styles.tabActive]}
          onPress={() => setTab('activos')}
        >
          <Text style={[styles.tabText, tab === 'activos' && styles.tabTextActive]}>
            Activos{activeCount > 0 ? ` (${activeCount})` : ''}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'completados' && styles.tabActive]}
          onPress={() => setTab('completados')}
        >
          <Text style={[styles.tabText, tab === 'completados' && styles.tabTextActive]}>
            Completados
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'cancelados' && styles.tabActive]}
          onPress={() => setTab('cancelados')}
        >
          <Text style={[styles.tabText, tab === 'cancelados' && styles.tabTextActive]}>
            Cancelados
          </Text>
        </Pressable>
      </View>

      <FlashList
        data={currentData}
        renderItem={renderConversacion}
        keyExtractor={(item) => item.usuario_id}
        estimatedItemSize={100}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={
                tab === 'activos' ? 'chatbubbles-outline' :
                tab === 'completados' ? 'checkmark-circle-outline' :
                'close-circle-outline'
              }
              title={
                tab === 'activos' ? 'Sin negociaciones activas' :
                tab === 'completados' ? 'Sin intercambios completados' :
                'Sin cancelados'
              }
              subtitle={
                tab === 'activos'
                  ? 'Cuando aceptes una propuesta, aparecerán aquí.'
                  : tab === 'completados'
                  ? 'Los intercambios exitosos aparecerán acá.'
                  : 'Los intercambios cancelados aparecerán acá.'
              }
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: { backgroundColor: C.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  tabTextActive: { color: '#fff' },
  list: { padding: 16 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLeft: { flex: 1 },
  alias: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  countText: { fontSize: 12, color: C.textMuted },
  fecha: { fontSize: 12, color: C.textMuted },
  numerosPreview: { gap: 6 },
  interPreview: { gap: 2 },
  previewText: { fontSize: 11, color: C.textMuted, fontWeight: '500' },
});
