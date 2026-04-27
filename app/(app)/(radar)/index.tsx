import { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRadar } from '@/lib/hooks/useRadar';
import { UserMatchCard } from '@/components/radar/UserMatchCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { MatchResult } from '@/types/app';

export default function RadarScreen() {
  const { matches, loading, error, inventarioVacio, buscarMatches } = useRadar();

  useEffect(() => {
    buscarMatches();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MatchResult }) => <UserMatchCard match={item} />,
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Radar</Text>
        {matches.length > 0 && (
          <Text style={styles.count}>
            {matches.length} match{matches.length !== 1 ? 'es' : ''}
          </Text>
        )}
      </View>

      {error ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={buscarMatches} />}
        >
          <EmptyState
            icon="warning-outline"
            title="Error de ubicación"
            subtitle={error}
            action={{ label: 'Reintentar', onPress: buscarMatches }}
          />
        </ScrollView>
      ) : inventarioVacio ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={buscarMatches} />}
        >
          <EmptyState
            icon="albums-outline"
            title="Tu inventario está vacío"
            subtitle="Andá a Perfil, cargá tus figuritas faltantes y repetidas, y volvé al radar."
            action={{ label: 'Buscar de nuevo', onPress: buscarMatches }}
          />
        </ScrollView>
      ) : (
        <FlashList
          data={matches}
          renderItem={renderItem}
          keyExtractor={(item) => item.usuario_id}
          estimatedItemSize={130}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={buscarMatches} />}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="radio-outline"
                title="Sin matches cerca"
                subtitle={
                  'Necesitás figuritas COMPLEMENTARIAS para matchear:\n' +
                  'lo que vos repetiste debe coincidir con lo que otro busca.'
                }
                action={{ label: 'Buscar de nuevo', onPress: buscarMatches }}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#F9FAFB' },
  count: { fontSize: 14, color: '#6B7280' },
  list: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', padding: 20 },
});
