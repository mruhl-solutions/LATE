import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRadar } from '@/lib/hooks/useRadar';
import { useProfile } from '@/lib/hooks/useProfile';
import { useGrupo } from '@/lib/hooks/useGrupo';
import { UserMatchCard } from '@/components/radar/UserMatchCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppButton } from '@/components/ui/AppButton';
import { C } from '@/constants/colors';
import type { Grupo, MatchResult } from '@/types/app';

type Tab = 'grupos' | 'global';

export default function RadarScreen() {
  const { matches, loading, error, inventarioVacio, buscarMatches } = useRadar();
  const { profile, fetchProfile, updateRadio, updateVisible } = useProfile();
  const {
    misGrupos,
    loading: loadingGrupos,
    fetchMisGrupos,
    crearGrupo,
    unirseAGrupo,
    salirDeGrupo,
    eliminarGrupo,
    buscarMatchesGrupo,
  } = useGrupo();

  const [tab, setTab] = useState<Tab>('grupos');
  const [radioModal, setRadioModal] = useState(false);
  const [radioInput, setRadioInput] = useState('');
  const [savingRadio, setSavingRadio] = useState(false);
  const [togglingVisible, setTogglingVisible] = useState(false);

  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [groupMatches, setGroupMatches] = useState<MatchResult[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(false);

  // Group management modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInput, setCreateInput] = useState('');
  const [creatingGrupo, setCreatingGrupo] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [joiningGrupo, setJoiningGrupo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchMisGrupos();
      if (profile?.visible_radar) buscarMatches();
    }, [fetchProfile, buscarMatches, fetchMisGrupos]),
  );

  useEffect(() => {
    if (profile) setRadioInput(String(profile.radio_km));
  }, [profile]);

  useEffect(() => {
    if (misGrupos.length > 0 && !selectedGrupo) {
      setSelectedGrupo(misGrupos[0]);
    }
  }, [misGrupos]);

  useEffect(() => {
    if (selectedGrupo && tab === 'grupos') {
      fetchGroupMatches(selectedGrupo.id);
    }
  }, [selectedGrupo, tab]);

  const fetchGroupMatches = useCallback(
    async (grupoId: string) => {
      setLoadingGroup(true);
      try {
        const data = await buscarMatchesGrupo(grupoId);
        setGroupMatches(data);
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'No se pudieron cargar las coincidencias.');
      } finally {
        setLoadingGroup(false);
      }
    },
    [buscarMatchesGrupo],
  );

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    if (newTab === 'grupos' && selectedGrupo) {
      fetchGroupMatches(selectedGrupo.id);
    }
    if (newTab === 'global' && profile?.visible_radar) {
      buscarMatches();
    }
  };

  const handleToggleVisible = async (value: boolean) => {
    setTogglingVisible(true);
    try {
      await updateVisible(value);
      if (value) buscarMatches();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la visibilidad.');
    } finally {
      setTogglingVisible(false);
    }
  };

  const handleGuardarRadio = async () => {
    const km = parseInt(radioInput, 10);
    if (isNaN(km) || km < 1 || km > 200) {
      Alert.alert('Radio inválido', 'Ingresá un valor entre 1 y 200 km.');
      return;
    }
    setSavingRadio(true);
    try {
      await updateRadio(km);
      setRadioModal(false);
      if (profile?.visible_radar) buscarMatches();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el radio.');
    } finally {
      setSavingRadio(false);
    }
  };

  const handleCrearGrupo = async () => {
    if (!createInput.trim()) {
      Alert.alert('Error', 'Ingresá un nombre para el grupo.');
      return;
    }
    setCreatingGrupo(true);
    try {
      await crearGrupo(createInput.trim());
      setCreateInput('');
      setShowCreateModal(false);
      Alert.alert('¡Éxito!', 'Grupo creado. Ya sos miembro.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el grupo.');
    } finally {
      setCreatingGrupo(false);
    }
  };

  const handleUnirseAGrupo = async () => {
    if (!joinInput.trim()) {
      Alert.alert('Error', 'Ingresá el código del grupo.');
      return;
    }
    setJoiningGrupo(true);
    try {
      await unirseAGrupo(joinInput.trim());
      setJoinInput('');
      setShowJoinModal(false);
      Alert.alert('¡Éxito!', '¡Ya sos miembro del grupo!');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo unir al grupo.');
    } finally {
      setJoiningGrupo(false);
    }
  };

  const handleEliminarGrupo = (grupo: Grupo) => {
    Alert.alert('Eliminar grupo', `¿Eliminar "${grupo.nombre}"? No se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarGrupo(grupo.id);
            if (selectedGrupo?.id === grupo.id) {
              setSelectedGrupo(misGrupos[0] || null);
            }
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar.');
          }
        },
      },
    ]);
  };

  const handleSalirDeGrupo = (grupo: Grupo) => {
    Alert.alert('Salir del grupo', `¿Salir de "${grupo.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        onPress: async () => {
          try {
            await salirDeGrupo(grupo.id);
            if (selectedGrupo?.id === grupo.id) {
              setSelectedGrupo(misGrupos[0] || null);
            }
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo salir.');
          }
        },
      },
    ]);
  };

  const renderGlobalItem = useCallback(
    ({ item }: { item: MatchResult }) => <UserMatchCard match={item} />,
    [],
  );

  const renderGroupItem = useCallback(
    ({ item }: { item: MatchResult }) => <UserMatchCard match={item} />,
    [],
  );

  const isVisible = profile?.visible_radar ?? false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modal: Crear grupo */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Crear grupo</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del grupo"
              placeholderTextColor={C.textMuted}
              value={createInput}
              onChangeText={setCreateInput}
              editable={!creatingGrupo}
            />
            <Pressable
              style={[styles.modalBtn, creatingGrupo && { opacity: 0.5 }]}
              onPress={handleCrearGrupo}
              disabled={creatingGrupo}
            >
              <Text style={styles.modalBtnText}>
                {creatingGrupo ? 'Creando...' : 'Crear'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowCreateModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal: Unirse a grupo */}
      <Modal visible={showJoinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Unirse a grupo</Text>
            <Text style={styles.modalSubtitle}>Pedile el código al creador</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Código del grupo"
              placeholderTextColor={C.textMuted}
              value={joinInput}
              onChangeText={setJoinInput}
              editable={!joiningGrupo}
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.modalBtn, joiningGrupo && { opacity: 0.5 }]}
              onPress={handleUnirseAGrupo}
              disabled={joiningGrupo}
            >
              <Text style={styles.modalBtnText}>
                {joiningGrupo ? 'Uniéndose...' : 'Unirse'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowJoinModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal radio */}
      <Modal visible={radioModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Radio de búsqueda</Text>
            <Text style={styles.modalSubtitle}>Cuántos km alrededor tuyo busca el radar (1–200)</Text>
            <View style={styles.radioRow}>
              <Pressable
                style={styles.radioStepBtn}
                onPress={() => {
                  const v = parseInt(radioInput, 10);
                  if (!isNaN(v) && v > 1) setRadioInput(String(v - 1));
                }}
              >
                <Ionicons name="remove" size={20} color={C.textPrimary} />
              </Pressable>
              <TextInput
                style={styles.radioInput}
                value={radioInput}
                onChangeText={setRadioInput}
                keyboardType="number-pad"
                maxLength={3}
                selectTextOnFocus
              />
              <Pressable
                style={styles.radioStepBtn}
                onPress={() => {
                  const v = parseInt(radioInput, 10);
                  if (!isNaN(v) && v < 200) setRadioInput(String(v + 1));
                }}
              >
                <Ionicons name="add" size={20} color={C.textPrimary} />
              </Pressable>
              <Text style={styles.kmLabel}>km</Text>
            </View>
            <Pressable
              style={[styles.modalBtn, savingRadio && { opacity: 0.5 }]}
              onPress={handleGuardarRadio}
              disabled={savingRadio}
            >
              <Text style={styles.modalBtnText}>Aplicar y buscar</Text>
            </Pressable>
            <Pressable onPress={() => setRadioModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Radar</Text>
        {tab === 'global' && isVisible && (
          <Pressable style={styles.radioPill} onPress={() => setRadioModal(true)}>
            <Ionicons name="navigate-circle-outline" size={14} color={C.primary} />
            <Text style={styles.radioPillText}>{profile?.radio_km ?? '…'} km</Text>
            <Ionicons name="chevron-down" size={12} color={C.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Tab bar - Grupos first, then Global */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'grupos' && styles.tabActive]}
          onPress={() => handleTabChange('grupos')}
        >
          <Ionicons name="people-outline" size={14} color={tab === 'grupos' ? '#fff' : C.textMuted} />
          <Text style={[styles.tabText, tab === 'grupos' && styles.tabTextActive]}>
            Grupos{misGrupos.length > 0 ? ` (${misGrupos.length})` : ''}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'global' && styles.tabActive]}
          onPress={() => handleTabChange('global')}
        >
          <Ionicons name="globe-outline" size={14} color={tab === 'global' ? '#fff' : C.textMuted} />
          <Text style={[styles.tabText, tab === 'global' && styles.tabTextActive]}>
            Global{isVisible && matches.length > 0 ? ` (${matches.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* ── Tab Grupos ── */}
      {tab === 'grupos' &&
        (loadingGrupos ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.primary} size="large" />
          </View>
        ) : misGrupos.length === 0 ? (
          <ScrollView contentContainerStyle={styles.centered}>
            <View style={styles.emptyGruposBox}>
              <Ionicons name="people-outline" size={40} color={C.border} />
              <Text style={styles.emptyTitle}>No pertenecés a ningún grupo</Text>
              <Text style={styles.emptySubtitle}>
                Creá uno nuevo o unite a uno existente con el código.
              </Text>
              <View style={styles.buttonGroup}>
                <Pressable
                  style={[styles.halfBtn, styles.btnCreate]}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={styles.halfBtnText}>Crear</Text>
                </Pressable>
                <Pressable
                  style={[styles.halfBtn, styles.btnJoin]}
                  onPress={() => setShowJoinModal(true)}
                >
                  <Ionicons name="log-in-outline" size={16} color="#fff" />
                  <Text style={styles.halfBtnText}>Unirse</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            {/* Selector de grupo */}
            <View style={styles.groupPillsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.groupPills}
              >
                {misGrupos.map((g) => {
                  const isSelected = g.id === selectedGrupo?.id;
                  return (
                    <Pressable
                      key={g.id}
                      style={[styles.groupPill, isSelected && styles.groupPillActive]}
                      onPress={() => {
                        setSelectedGrupo(g);
                        fetchGroupMatches(g.id);
                      }}
                    >
                      <Text
                        style={[styles.groupPillText, isSelected && styles.groupPillTextActive]}
                      >
                        {g.nombre}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Acciones del grupo */}
            {selectedGrupo && (
              <View style={styles.groupActionsBar}>
                <Text style={styles.groupCodeLabel}>Código: {selectedGrupo.codigo}</Text>
                <View style={styles.groupActionBtns}>
                  <Pressable
                    style={styles.groupActionBtn}
                    onPress={() => {
                      Alert.alert(
                        'Copiar código',
                        `Código: ${selectedGrupo.codigo}`,
                        [{ text: 'OK' }],
                      );
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color={C.primary} />
                  </Pressable>
                  <Pressable
                    style={styles.groupActionBtn}
                    onPress={() => handleSalirDeGrupo(selectedGrupo)}
                  >
                    <Ionicons name="exit-outline" size={16} color={C.danger} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Matches del grupo */}
            {loadingGroup ? (
              <View style={styles.centered}>
                <ActivityIndicator color={C.primary} size="large" />
              </View>
            ) : (
              <FlashList
                data={groupMatches}
                renderItem={renderGroupItem}
                keyExtractor={(item) => item.usuario_id}
                estimatedItemSize={150}
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl
                    refreshing={loadingGroup}
                    onRefresh={() => selectedGrupo && fetchGroupMatches(selectedGrupo.id)}
                  />
                }
                ListEmptyComponent={
                  <EmptyState
                    icon="swap-horizontal-outline"
                    title="Sin coincidencias en este grupo"
                    subtitle="Actualizá tu inventario o esperá que se unan más miembros."
                  />
                }
              />
            )}

            {/* Botones para crear/unirse */}
            <View style={styles.floatingButtonGroup}>
              <Pressable
                style={[styles.floatingBtn, styles.floatingBtnCreate]}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
              </Pressable>
              <Pressable
                style={[styles.floatingBtn, styles.floatingBtnJoin]}
                onPress={() => setShowJoinModal(true)}
              >
                <Ionicons name="log-in" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        ))}

      {/* ── Tab Global ── */}
      {tab === 'global' &&
        (!isVisible ? (
          <ScrollView contentContainerStyle={styles.centered}>
            <View style={styles.hiddenBox}>
              <Ionicons name="eye-off-outline" size={40} color={C.border} />
              <Text style={styles.hiddenTitle}>Estás oculto en el radar</Text>
              <Text style={styles.hiddenSubtitle}>
                Activá el radar global para aparecer y ver coincidencias cerca tuyo.
              </Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Activar radar global</Text>
                {togglingVisible ? (
                  <ActivityIndicator color={C.primary} size="small" />
                ) : (
                  <Switch
                    value={isVisible}
                    onValueChange={handleToggleVisible}
                    trackColor={{ false: C.border, true: C.primary }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            </View>
          </ScrollView>
        ) : error ? (
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
              title="Cargá tu inventario primero"
              subtitle="Andá a Perfil, cargá lo que necesitás y lo que tenés repetido, y volvé al radar."
              action={{ label: 'Buscar de nuevo', onPress: buscarMatches }}
            />
          </ScrollView>
        ) : (
          <FlashList
            data={matches}
            renderItem={renderGlobalItem}
            keyExtractor={(item) => item.usuario_id}
            estimatedItemSize={150}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={buscarMatches} />}
            ListHeaderComponent={
              <View style={styles.visibleToggleBar}>
                <Text style={styles.visibleToggleLabel}>Visible en el radar</Text>
                {togglingVisible ? (
                  <ActivityIndicator color={C.primary} size="small" />
                ) : (
                  <Switch
                    value={isVisible}
                    onValueChange={handleToggleVisible}
                    trackColor={{ false: C.border, true: C.primary }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            }
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon="radio-outline"
                  title="Sin coincidencias cerca"
                  subtitle={
                    'Necesitás figuritas COMPLEMENTARIAS para matchear:\nlo que vos repetiste debe coincidir con lo que otro busca.'
                  }
                  action={{ label: 'Buscar de nuevo', onPress: buscarMatches }}
                />
              ) : null
            }
          />
        ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: C.textPrimary },
  radioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  radioPillText: { fontSize: 13, fontWeight: '700', color: C.primaryLight },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabActive: { backgroundColor: C.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  tabTextActive: { color: '#fff' },
  // Empty grupos state
  emptyGruposBox: {
    alignItems: 'center',
    gap: 16,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
  buttonGroup: { flexDirection: 'row', gap: 12, width: '100%' },
  halfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  halfBtnText: { fontWeight: '700', color: '#fff', fontSize: 13 },
  btnCreate: { backgroundColor: C.accent },
  btnJoin: { backgroundColor: C.info },
  // Global hidden state
  hiddenBox: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 4,
  },
  hiddenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'center',
  },
  hiddenSubtitle: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  // Visible toggle bar shown at top of results list
  visibleToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  visibleToggleLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  // Group pills with maxHeight to prevent overflow
  groupPillsWrapper: {
    maxHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: C.surface,
  },
  groupPills: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  groupPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  groupPillActive: { backgroundColor: C.primary, borderColor: C.primary },
  groupPillText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  groupPillTextActive: { color: '#fff' },
  // Group actions bar
  groupActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  groupCodeLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  groupActionBtns: { flexDirection: 'row', gap: 8 },
  groupActionBtn: { padding: 6, borderRadius: 8, backgroundColor: C.bg },
  // Floating buttons
  floatingButtonGroup: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 12,
  },
  floatingBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  floatingBtnCreate: { backgroundColor: C.accent },
  floatingBtnJoin: { backgroundColor: C.info },
  list: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', padding: 20 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: C.surface, borderRadius: 20, padding: 24, width: '100%', gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalSubtitle: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  modalInput: {
    backgroundColor: C.bg,
    color: C.textPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${C.primary}44`,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  radioStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInput: {
    width: 72,
    backgroundColor: C.bg,
    color: C.textPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${C.primary}55`,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 8,
  },
  kmLabel: { fontSize: 16, color: C.textSecondary, fontWeight: '600' },
  modalBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: C.textMuted, fontSize: 14 },
});
