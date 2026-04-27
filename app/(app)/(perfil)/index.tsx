import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '@/lib/hooks/useProfile';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGrupo } from '@/lib/hooks/useGrupo';
import { useCalificacion } from '@/lib/hooks/useCalificacion';
import { useAuthStore } from '@/store/authStore';
import { InventarioInput } from '@/components/perfil/InventarioInput';
import { AppButton } from '@/components/ui/AppButton';
import { cleanInventoryString, arrayToDisplayString } from '@/lib/parsers';
import type { Grupo } from '@/types/app';

export default function PerfilScreen() {
  const { profile, fetchProfile, updateInventario } = useProfile();
  const { signOut } = useAuth();
  const { misGrupos, fetchMisGrupos, crearGrupo, unirseAGrupo, salirDeGrupo, eliminarGrupo } = useGrupo();
  const { promedioEstrellas } = useCalificacion();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const [faltantesStr, setFaltantesStr] = useState('');
  const [repetidasStr, setRepetidasStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [promedio, setPromedio] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal unirse
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCodigo, setJoinCodigo] = useState('');
  const [joining, setJoining] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      fetchMisGrupos(),
      user ? promedioEstrellas(user.id).then(setPromedio) : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [fetchProfile, fetchMisGrupos, promedioEstrellas, user]);

  useEffect(() => {
    fetchProfile();
    fetchMisGrupos();
  }, []);

  useEffect(() => {
    if (user) promedioEstrellas(user.id).then(setPromedio);
  }, [user]);

  useEffect(() => {
    if (profile) {
      setFaltantesStr(arrayToDisplayString(profile.faltantes));
      setRepetidasStr(arrayToDisplayString(profile.repetidas));
    }
  }, [profile]);

  const handleGuardarInventario = async () => {
    setSaving(true);
    try {
      const faltantes = cleanInventoryString(faltantesStr);
      const repetidas = cleanInventoryString(repetidasStr);
      await updateInventario(faltantes, repetidas);
      await fetchProfile();
      Alert.alert('Guardado', `Faltantes: ${faltantes.length} · Repetidas: ${repetidas.length}`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleCrearGrupo = () => {
    Alert.prompt('Nuevo grupo', 'Nombre del grupo:', async (nombre) => {
      if (!nombre?.trim()) return;
      try {
        const grupo = await crearGrupo(nombre.trim());
        router.push(`/grupo/${grupo.codigo}` as never);
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Intentá de nuevo.');
      }
    }, 'plain-text');
  };

  const handleUnirse = async () => {
    if (!joinCodigo.trim()) return;
    setJoining(true);
    try {
      const grupo = await unirseAGrupo(joinCodigo);
      setJoinModalVisible(false);
      setJoinCodigo('');
      router.push(`/grupo/${grupo.codigo}` as never);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Código inválido o grupo no encontrado.');
    } finally {
      setJoining(false);
    }
  };

  const handleSalir = (grupo: Grupo) => {
    Alert.alert('Salir del grupo', `¿Salir de "${grupo.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await salirDeGrupo(grupo.id);
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo salir del grupo.');
          }
        },
      },
    ]);
  };

  const handleEliminar = (grupo: Grupo) => {
    Alert.alert(
      'Eliminar grupo',
      `¿Eliminar "${grupo.nombre}"? Esta acción no se puede deshacer y todos los miembros perderán el acceso.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarGrupo(grupo.id);
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar el grupo.');
            }
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  const renderStars = (valor: number) => [1, 2, 3, 4, 5].map((s) => (s <= Math.round(valor) ? '★' : '☆')).join('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modal unirse */}
      <Modal visible={joinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Unirse a un grupo</Text>
            <Text style={styles.modalSubtitle}>Ingresá el código del grupo</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: A3F92C"
              placeholderTextColor="#6B7280"
              value={joinCodigo}
              onChangeText={(t) => setJoinCodigo(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            <AppButton title="Unirse" onPress={handleUnirse} loading={joining} disabled={!joinCodigo.trim()} />
            <Pressable onPress={() => { setJoinModalVisible(false); setJoinCodigo(''); }} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7C3AED" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Perfil</Text>
              {profile && <Text style={styles.alias}>@{profile.alias}</Text>}
            </View>
            {promedio !== null && (
              <View style={styles.ratingBox}>
                <Text style={styles.ratingStars}>{renderStars(promedio)}</Text>
                <Text style={styles.ratingVal}>{promedio.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Inventario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Inventario</Text>
          <InventarioInput label="Figuritas que me faltan" value={faltantesStr} onChangeText={setFaltantesStr} count={profile?.faltantes.length ?? 0} accentColor="#3B82F6" />
          <InventarioInput label="Figuritas repetidas" value={repetidasStr} onChangeText={setRepetidasStr} count={profile?.repetidas.length ?? 0} accentColor="#22C55E" />
          <AppButton title="Guardar inventario" onPress={handleGuardarInventario} loading={saving} />
        </View>

        {/* Grupos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Grupos</Text>
            <View style={styles.grupoActions}>
              <Pressable style={styles.grupoActionBtn} onPress={() => setJoinModalVisible(true)}>
                <Ionicons name="enter-outline" size={13} color="#7C3AED" />
                <Text style={styles.grupoActionText}>Unirse</Text>
              </Pressable>
              <Pressable style={styles.grupoActionBtn} onPress={handleCrearGrupo}>
                <Ionicons name="add" size={13} color="#7C3AED" />
                <Text style={styles.grupoActionText}>Crear</Text>
              </Pressable>
            </View>
          </View>

          {misGrupos.length === 0 && (
            <Text style={styles.emptyText}>No pertenecés a ningún grupo todavía.</Text>
          )}

          {misGrupos.map((grupo) => {
            const esCreador = grupo.creador_id === user?.id;
            return (
              <View key={grupo.id} style={styles.grupoItem}>
                {/* Tap para ver el detalle */}
                <Pressable style={styles.grupoInfo} onPress={() => router.push(`/grupo/${grupo.codigo}` as never)}>
                  <View style={styles.grupoInfoText}>
                    <Text style={styles.grupoNombre}>{grupo.nombre}</Text>
                    <View style={styles.grupoMeta}>
                      <Text style={styles.grupoCodigo}>{grupo.codigo.toUpperCase()}</Text>
                      {esCreador && (
                        <View style={styles.creadorBadge}>
                          <Text style={styles.creadorText}>Tuyo</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </Pressable>

                {/* Acción: salir o eliminar */}
                <Pressable
                  style={[styles.grupoActionIcon, esCreador ? styles.grupoDeleteIcon : styles.grupoLeaveIcon]}
                  onPress={() => esCreador ? handleEliminar(grupo) : handleSalir(grupo)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={esCreador ? 'trash-outline' : 'exit-outline'}
                    size={16}
                    color={esCreador ? '#EF4444' : '#F59E0B'}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>

        <AppButton title="Cerrar sesión" onPress={handleSignOut} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 28, fontWeight: '800', color: '#F9FAFB' },
  alias: { fontSize: 16, color: '#6B7280', marginTop: 2 },
  ratingBox: { alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 12, padding: 10 },
  ratingStars: { fontSize: 16, color: '#FBBF24', letterSpacing: 2 },
  ratingVal: { fontSize: 13, color: '#9CA3AF', marginTop: 2, fontWeight: '700' },
  section: { backgroundColor: '#1F2937', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F9FAFB', marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  grupoActions: { flexDirection: 'row', gap: 8 },
  grupoActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2e1065', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  grupoActionText: { color: '#7C3AED', fontWeight: '700', fontSize: 12 },
  emptyText: { color: '#6B7280', fontSize: 14 },
  grupoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 8,
  },
  grupoInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  grupoInfoText: { flex: 1 },
  grupoNombre: { fontSize: 14, fontWeight: '600', color: '#F9FAFB' },
  grupoMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  grupoCodigo: { fontSize: 11, color: '#6B7280', letterSpacing: 1 },
  creadorBadge: { backgroundColor: '#2e1065', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  creadorText: { fontSize: 10, color: '#7C3AED', fontWeight: '700' },
  grupoActionIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  grupoDeleteIcon: { backgroundColor: '#2d0a0a' },
  grupoLeaveIcon: { backgroundColor: '#1a1200' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1F2937', borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F9FAFB' },
  modalSubtitle: { fontSize: 13, color: '#9CA3AF' },
  modalInput: { backgroundColor: '#111827', color: '#F9FAFB', borderRadius: 10, padding: 14, fontSize: 18, fontWeight: '700', borderWidth: 1, borderColor: '#7C3AED55', letterSpacing: 4, textAlign: 'center' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: '#6B7280', fontSize: 14 },
});
