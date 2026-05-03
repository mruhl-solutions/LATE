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
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '@/lib/hooks/useProfile';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { InventarioInput } from '@/components/perfil/InventarioInput';
import { AlbumStats } from '@/components/perfil/AlbumStats';
import { AppButton } from '@/components/ui/AppButton';
import { cleanInventoryString, arrayToDisplayString } from '@/lib/parsers';
import { C } from '@/constants/colors';
import type { Album } from '@/types/app';

export default function PerfilScreen() {
  const {
    profile,
    albums,
    fetchProfile,
    fetchAlbums,
    updateInventario,
    crearAlbum,
    actualizarAlbum,
    activarAlbum,
    eliminarAlbum,
  } = useProfile();
  const { signOut } = useAuth();
  const user = useAuthStore((s) => s.user);

  const [necesitoStr, setNecesitoStr] = useState('');
  const [repetidasStr, setRepetidasStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Album management modals
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [albumNameInput, setAlbumNameInput] = useState('');
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [editAlbumName, setEditAlbumName] = useState('');

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchAlbums()]);
    setRefreshing(false);
  }, [fetchProfile, fetchAlbums]);

  useEffect(() => {
    fetchProfile();
    fetchAlbums();
  }, []);

  useEffect(() => {
    if (profile) {
      setNecesitoStr(arrayToDisplayString(profile.necesito));
      setRepetidasStr(arrayToDisplayString(profile.repetidas));
    }
  }, [profile]);

  const handleGuardarInventario = async () => {
    setSaving(true);
    try {
      const necesito = cleanInventoryString(necesitoStr);
      const repetidas = cleanInventoryString(repetidasStr);
      await updateInventario(necesito, repetidas);
      await fetchProfile();
      Alert.alert('Guardado', `Necesito: ${necesito.length} · Repetidas: ${repetidas.length}`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleCrearAlbum = async () => {
    if (!albumNameInput.trim()) {
      Alert.alert('Error', 'Ingresá un nombre para el álbum.');
      return;
    }
    setCreatingAlbum(true);
    try {
      await crearAlbum(albumNameInput.trim());
      setAlbumNameInput('');
      setShowCreateAlbum(false);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el álbum.');
    } finally {
      setCreatingAlbum(false);
    }
  };

  const handleActivarAlbum = async (album: Album) => {
    if (album.is_active) return;
    try {
      await activarAlbum(album.id);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo cambiar de álbum.');
    }
  };

  const handleRenombrarAlbum = async () => {
    if (!editingAlbum || !editAlbumName.trim()) return;
    try {
      await actualizarAlbum(editingAlbum.id, editAlbumName.trim());
      setEditingAlbum(null);
      setEditAlbumName('');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo renombrar.');
    }
  };

  const handleEliminarAlbum = (album: Album) => {
    Alert.alert(
      'Eliminar álbum',
      `¿Eliminar "${album.nombre}"? Perderás su inventario.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarAlbum(album.id);
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar.');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modal: Crear álbum */}
      <Modal visible={showCreateAlbum} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo álbum</Text>
            <Text style={styles.modalSubtitle}>
              Podés tener varios álbumes con diferentes colecciones
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Mundial 2026, Copa América..."
              placeholderTextColor={C.textMuted}
              value={albumNameInput}
              onChangeText={setAlbumNameInput}
              editable={!creatingAlbum}
              autoFocus
            />
            <AppButton
              title={creatingAlbum ? 'Creando...' : 'Crear álbum'}
              onPress={handleCrearAlbum}
              loading={creatingAlbum}
            />
            <Pressable onPress={() => { setShowCreateAlbum(false); setAlbumNameInput(''); }} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal: Renombrar álbum */}
      <Modal visible={!!editingAlbum} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Renombrar álbum</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nuevo nombre"
              placeholderTextColor={C.textMuted}
              value={editAlbumName}
              onChangeText={setEditAlbumName}
              autoFocus
            />
            <AppButton title="Guardar" onPress={handleRenombrarAlbum} />
            <Pressable onPress={() => { setEditingAlbum(null); setEditAlbumName(''); }} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Perfil</Text>
              {profile && <Text style={styles.alias}>@{profile.alias}</Text>}
            </View>
          </View>
        </View>

        {/* Inventario activo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Inventario</Text>
          <Text style={styles.sectionHint}>
            Cargá lo que buscás y lo que tenés de sobra para intercambiar.
          </Text>
          {profile && (
            <AlbumStats
              necesito={profile.necesito.length}
              repetidas={profile.repetidas.length}
            />
          )}
          <InventarioInput
            label="Necesito"
            icon="search-outline"
            value={necesitoStr}
            onChangeText={setNecesitoStr}
            accentColor={C.info}
            savedCount={profile?.necesito.length ?? 0}
          />
          <InventarioInput
            label="Tengo para cambiar"
            icon="copy-outline"
            value={repetidasStr}
            onChangeText={setRepetidasStr}
            accentColor={C.primary}
            savedCount={profile?.repetidas.length ?? 0}
          />
          <AppButton title="Guardar inventario" onPress={handleGuardarInventario} loading={saving} />
        </View>

        {/* Álbumes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Mis Álbumes</Text>
              <Text style={styles.sectionHint}>
                Organizá distintas colecciones por separado.
              </Text>
            </View>
            <Pressable style={styles.addAlbumBtn} onPress={() => setShowCreateAlbum(true)}>
              <Ionicons name="add" size={16} color={C.primary} />
              <Text style={styles.addAlbumText}>Nuevo</Text>
            </Pressable>
          </View>

          {albums.length === 0 && (
            <View style={styles.emptyAlbums}>
              <Ionicons name="albums-outline" size={28} color={C.border} />
              <Text style={styles.emptyAlbumsText}>
                Sin álbumes guardados. Creá uno para organizar distintas colecciones.
              </Text>
            </View>
          )}

          {albums.map((album) => (
            <View key={album.id} style={[styles.albumItem, album.is_active && styles.albumItemActive]}>
              <Pressable style={styles.albumMain} onPress={() => handleActivarAlbum(album)}>
                <View style={styles.albumInfo}>
                  {album.is_active && (
                    <View style={styles.activeBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={C.accent} />
                      <Text style={styles.activeBadgeText}>Activo</Text>
                    </View>
                  )}
                  <Text style={[styles.albumNombre, album.is_active && styles.albumNombreActive]}>
                    {album.nombre}
                  </Text>
                  <Text style={styles.albumStats}>
                    {album.necesito.length} necesito · {album.repetidas.length} repetidas
                  </Text>
                </View>
                {!album.is_active && (
                  <Text style={styles.activarText}>Activar</Text>
                )}
              </Pressable>

              <View style={styles.albumActions}>
                <Pressable
                  style={styles.albumActionBtn}
                  onPress={() => { setEditingAlbum(album); setEditAlbumName(album.nombre); }}
                >
                  <Ionicons name="pencil-outline" size={15} color={C.textMuted} />
                </Pressable>
                <Pressable
                  style={styles.albumActionBtn}
                  onPress={() => handleEliminarAlbum(album)}
                >
                  <Ionicons name="trash-outline" size={15} color={C.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <AppButton title="Cerrar sesión" onPress={handleSignOut} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: 28, fontWeight: '800', color: C.textPrimary },
  alias: { fontSize: 16, color: C.textMuted, marginTop: 2 },
  section: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  sectionHint: { fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 17 },
  addAlbumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addAlbumText: { color: C.primary, fontWeight: '700', fontSize: 12 },
  emptyAlbums: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  emptyAlbumsText: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  albumItemActive: { borderTopColor: `${C.accent}44` },
  albumMain: { flex: 1 },
  albumInfo: { gap: 2 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  activeBadgeText: { fontSize: 10, color: C.accent, fontWeight: '700', textTransform: 'uppercase' },
  albumNombre: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  albumNombreActive: { color: C.textPrimary },
  albumStats: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  activarText: { fontSize: 11, color: C.primary, fontWeight: '600', marginTop: 2 },
  albumActions: { flexDirection: 'row', gap: 4 },
  albumActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalSubtitle: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  modalInput: {
    backgroundColor: C.bg,
    color: C.textPrimary,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: `${C.primary}55`,
  },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: C.textMuted, fontSize: 14 },
});
