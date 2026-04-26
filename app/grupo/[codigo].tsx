import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useGrupo } from '@/lib/hooks/useGrupo';
import { supabase } from '@/lib/supabase';
import { AppButton } from '@/components/ui/AppButton';
import { UserMatchCard } from '@/components/radar/UserMatchCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Grupo, MatchResult } from '@/types/app';

export default function GrupoScreen() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { unirseAGrupo, buscarMatchesGrupo } = useGrupo();

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [esMiembro, setEsMiembro] = useState(false);
  const [loadingGrupo, setLoadingGrupo] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!codigo || !user) return;
    supabase
      .from('grupos')
      .select('*')
      .eq('codigo', codigo)
      .single()
      .then(async ({ data }) => {
        setGrupo(data);
        if (data) {
          const { data: memData } = await supabase
            .from('grupo_miembros')
            .select('usuario_id')
            .eq('grupo_id', data.id)
            .eq('usuario_id', user.id)
            .maybeSingle();
          setEsMiembro(!!memData);
        }
        setLoadingGrupo(false);
      });
  }, [codigo, user]);

  const cargarMatches = useCallback(async () => {
    if (!grupo || !user) return;
    setLoadingMatches(true);
    try {
      const data = await buscarMatchesGrupo(grupo.id);
      setMatches(data);
    } finally {
      setLoadingMatches(false);
    }
  }, [grupo, user, buscarMatchesGrupo]);

  useEffect(() => {
    if (esMiembro && grupo) cargarMatches();
  }, [esMiembro, grupo]);

  const handleUnirse = async () => {
    if (!codigo) return;
    setJoining(true);
    try {
      await unirseAGrupo(codigo);
      setEsMiembro(true);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo unir al grupo.');
    } finally {
      setJoining(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: MatchResult }) => <UserMatchCard match={item} />,
    [],
  );

  if (loadingGrupo) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    );
  }

  if (!grupo) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="warning-outline"
          title="Grupo no encontrado"
          subtitle="El link puede ser inválido o el grupo fue eliminado."
          action={{ label: 'Volver', onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{grupo.nombre}</Text>
        <Text style={styles.codigo}>Código: {grupo.codigo}</Text>
      </View>

      {!esMiembro ? (
        <View style={styles.joinBox}>
          <Text style={styles.joinText}>
            Uníte al grupo para ver los matches con los demás miembros.
          </Text>
          <AppButton title="Unirse al grupo" onPress={handleUnirse} loading={joining} />
        </View>
      ) : (
        <FlashList
          data={matches}
          renderItem={renderItem}
          keyExtractor={(item) => item.usuario_id}
          estimatedItemSize={130}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loadingMatches} onRefresh={cargarMatches} />
          }
          ListEmptyComponent={
            !loadingMatches ? (
              <EmptyState
                icon="people-outline"
                title="Sin coincidencias en el grupo"
                subtitle="Actualizá tu inventario o esperá que se unan más miembros."
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  title: { fontSize: 24, fontWeight: '800', color: '#F5F5F5' },
  codigo: { fontSize: 13, color: '#636366', marginTop: 4 },
  joinBox: { padding: 24, gap: 16 },
  joinText: { fontSize: 15, color: '#ABABAB', lineHeight: 22 },
  list: { padding: 16 },
});
