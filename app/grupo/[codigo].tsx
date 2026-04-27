import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const [cantMiembros, setCantMiembros] = useState(0);
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
          const [memCheck, countData] = await Promise.all([
            supabase
              .from('grupo_miembros')
              .select('usuario_id')
              .eq('grupo_id', data.id)
              .eq('usuario_id', user.id)
              .maybeSingle(),
            supabase
              .from('grupo_miembros')
              .select('usuario_id', { count: 'exact', head: true })
              .eq('grupo_id', data.id),
          ]);
          setEsMiembro(!!memCheck.data);
          setCantMiembros(countData.count ?? 0);
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
      setCantMiembros((prev) => prev + 1);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo unir al grupo.');
    } finally {
      setJoining(false);
    }
  };

  const handleCompartir = async () => {
    if (!grupo) return;
    try {
      await Share.share({
        message: `Unite a mi grupo "${grupo.nombre}" en LATE!\n\nCódigo: ${grupo.codigo}\nLink: lateapp://grupo/${grupo.codigo}`,
        title: `Grupo ${grupo.nombre}`,
      });
    } catch {
      // usuario canceló el share
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: MatchResult }) => <UserMatchCard match={item} />,
    [],
  );

  if (loadingGrupo) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#7C3AED" />
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
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{grupo.nombre}</Text>
            <View style={styles.metaRow}>
              <View style={styles.codigoBadge}>
                <Ionicons name="key-outline" size={12} color="#7C3AED" />
                <Text style={styles.codigoText}>{grupo.codigo}</Text>
              </View>
              <Text style={styles.miembrosText}>
                {cantMiembros} miembro{cantMiembros !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          {esMiembro && (
            <Pressable style={styles.shareBtn} onPress={handleCompartir}>
              <Ionicons name="share-social-outline" size={20} color="#7C3AED" />
            </Pressable>
          )}
        </View>

        {esMiembro && (
          <View style={styles.inviteBox}>
            <Text style={styles.inviteLabel}>Invitá con el código:</Text>
            <Pressable style={styles.inviteCode} onPress={handleCompartir}>
              <Text style={styles.inviteCodeText}>{grupo.codigo}</Text>
              <Ionicons name="copy-outline" size={14} color="#9CA3AF" />
            </Pressable>
          </View>
        )}
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
                title={
                  cantMiembros <= 1
                    ? 'Sos el único miembro'
                    : 'Sin coincidencias en el grupo'
                }
                subtitle={
                  cantMiembros <= 1
                    ? `Compartí el código ${grupo.codigo} para que otros se unan.`
                    : 'Actualizá tu inventario o esperá que se unan más miembros.'
                }
                action={
                  cantMiembros <= 1
                    ? { label: 'Compartir grupo', onPress: handleCompartir }
                    : undefined
                }
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '800', color: '#F9FAFB' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  codigoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2e1065',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  codigoText: { fontSize: 12, fontWeight: '700', color: '#7C3AED', letterSpacing: 1 },
  miembrosText: { fontSize: 12, color: '#6B7280' },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2e1065',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
  },
  inviteLabel: { fontSize: 12, color: '#6B7280' },
  inviteCode: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inviteCodeText: { fontSize: 16, fontWeight: '800', color: '#F9FAFB', letterSpacing: 3 },
  joinBox: { padding: 24, gap: 16 },
  joinText: { fontSize: 15, color: '#9CA3AF', lineHeight: 22 },
  list: { padding: 16 },
});
