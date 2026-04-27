import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIntercambios } from '@/lib/hooks/useIntercambios';
import { NegociacionItem } from '@/components/negociaciones/NegociacionItem';
import { HistorialItem } from '@/components/negociaciones/HistorialItem';
import { CompletadoItem } from '@/components/negociaciones/CompletadoItem';
import { EmptyState } from '@/components/ui/EmptyState';
import type { IntercambioConAlias } from '@/types/app';

type Tab = 'activos' | 'historial' | 'completados';

export default function NegociacionesScreen() {
  const { negociaciones, historial, completados, loading, fetchAll } = useIntercambios();
  const [tab, setTab] = useState<Tab>('activos');

  useEffect(() => {
    fetchAll();
  }, []);

  const renderActivo = useCallback(
    ({ item }: { item: IntercambioConAlias }) => <NegociacionItem intercambio={item} />,
    [],
  );

  const renderHistorial = useCallback(
    ({ item }: { item: IntercambioConAlias }) => <HistorialItem intercambio={item} />,
    [],
  );

  const renderCompletado = useCallback(
    ({ item }: { item: IntercambioConAlias }) => <CompletadoItem intercambio={item} />,
    [],
  );

  const currentData =
    tab === 'activos' ? negociaciones :
    tab === 'historial' ? historial :
    completados;

  const currentRender =
    tab === 'activos' ? renderActivo :
    tab === 'historial' ? renderHistorial :
    renderCompletado;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Chats</Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'activos' && styles.tabActive]}
          onPress={() => setTab('activos')}
        >
          <Text style={[styles.tabText, tab === 'activos' && styles.tabTextActive]}>
            Activos{negociaciones.length > 0 ? ` (${negociaciones.length})` : ''}
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
          style={[styles.tab, tab === 'historial' && styles.tabActive]}
          onPress={() => setTab('historial')}
        >
          <Text style={[styles.tabText, tab === 'historial' && styles.tabTextActive]}>
            Cancelados
          </Text>
        </Pressable>
      </View>

      <FlashList
        data={currentData}
        renderItem={currentRender}
        keyExtractor={(item) => item.id}
        estimatedItemSize={90}
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
                  ? 'Cuando aceptes una propuesta, el chat aparecerá aquí.'
                  : tab === 'completados'
                  ? 'Los intercambios exitosos aparecerán acá con el detalle de qué figuritas intercambiaste.'
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
  container: { flex: 1, backgroundColor: '#111827' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F9FAFB',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: { backgroundColor: '#7C3AED' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  list: { padding: 16 },
});
