import { useEffect, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useIntercambios } from '@/lib/hooks/useIntercambios';
import { IntercambioCard } from '@/components/intercambios/IntercambioCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { IntercambioConAlias } from '@/types/app';

export default function RecibidasScreen() {
  const { recibidas, loading, fetchAll, aceptar, cancelar } = useIntercambios();

  useEffect(() => {
    fetchAll();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: IntercambioConAlias }) => (
      <IntercambioCard
        intercambio={item}
        perspective="receptor"
        onAceptar={() => aceptar(item.id)}
        onCancelar={() => cancelar(item.id)}
      />
    ),
    [aceptar, cancelar],
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={recibidas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={160}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="swap-horizontal-outline"
              title="Sin propuestas recibidas"
              subtitle="Cuando alguien te proponga un intercambio, aparecerá aquí."
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2430' },
  list: { padding: 16 },
});
