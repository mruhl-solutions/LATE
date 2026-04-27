import { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIntercambios } from '@/lib/hooks/useIntercambios';
import { NegociacionItem } from '@/components/negociaciones/NegociacionItem';
import { EmptyState } from '@/components/ui/EmptyState';
import type { IntercambioConAlias } from '@/types/app';

export default function NegociacionesScreen() {
  const { negociaciones, loading, fetchAll } = useIntercambios();

  useEffect(() => {
    fetchAll();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: IntercambioConAlias }) => <NegociacionItem intercambio={item} />,
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Negociaciones</Text>
      <FlashList
        data={negociaciones}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={80}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="Sin negociaciones activas"
              subtitle="Cuando aceptes una propuesta, el chat aparecerá aquí."
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
    paddingVertical: 12,
  },
  list: { padding: 16 },
});
