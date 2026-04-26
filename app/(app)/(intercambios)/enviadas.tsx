import { useEffect, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useIntercambios } from '@/lib/hooks/useIntercambios';
import { IntercambioCard } from '@/components/intercambios/IntercambioCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { IntercambioConAlias } from '@/types/app';

export default function EnviadasScreen() {
  const { enviadas, loading, fetchAll, cancelar } = useIntercambios();

  useEffect(() => {
    fetchAll();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: IntercambioConAlias }) => (
      <IntercambioCard
        intercambio={item}
        perspective="iniciador"
        onCancelar={() => cancelar(item.id)}
      />
    ),
    [cancelar],
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={enviadas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={160}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="paper-plane-outline"
              title="Sin propuestas enviadas"
              subtitle="Usá el radar para encontrar coleccionistas y proponerles un intercambio."
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  list: { padding: 16 },
});