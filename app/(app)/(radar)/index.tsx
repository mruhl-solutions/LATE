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
import type { Grupo, MatchResult } from '@/types/app';

type Tab = 'global' | 'grupos';

export default function RadarScreen() {
  const { matches, loading, error, inventarioVacio, buscarMatches } = useRadar();
  const { profile, fetchProfile, updateRadio, updateVisible } = useProfile();
  const { misGrupos, fetchMisGrupos, buscarMatchesGrupo } = useGrupo();

  const [tab, setTab] = useState<Tab>('global');
  const [radioModal, setRadioModal] = useState(false);
  const [radioInput, setRadioInput] = useState('');
  const [savingRadio, setSavingRadio] = useState(false);
  const [togglingVisible, setTogglingVisible] = useState(false);

  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [groupMatches, setGroupMatches] = useState<MatchResult[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(false);

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

  const fetchGroupMatches = useCallback(async (grupoId: string) => {
    setLoadingGroup(true);
    try {
      const data = await buscarMatchesGrupo(grupoId);
      setGroupMatches(data);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudieron cargar las coincidencias.');
    } finally {
      setLoadingGroup(false);
    }
  }, [buscarMatchesGrupo]);

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
      {/* Modal radio */}
      <Modal visible={radioModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Radio de búsqueda</Text>
            <Text style={styles.modalSubtitle}>Cuántos km alrededor tuyo busca el radar (1–200)</Text>
            <View style={styles.radioRow}>
              <Pressable
                style={styles.radioStepBtn}
                onPress={() => { const v = parseInt(radioInput, 10); if (!isNaN(v) && v > 1) setRadioInput(String(v - 1)); }}
              >
                <Ionicons name="remove" size={20} color="#F5F0EB" />
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
                onPress={() => { const v = parseInt(radioInput, 10); if (!isNaN(v) && v < 200) setRadioInput(String(v + 1)); }}
              >
                <Ionicons name="add" size={20} color="#F5F0EB" />
              </Pressable>
              <Text style={styles.kmLabel}>km</Text>
            </View>
            <Pressable style={[styles.modalBtn, savingRadio && { opacity: 0.5 }]} onPress={handleGuardarRadio} disabled={savingRadio}>
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
            <Ionicons name="navigate-circle-outline" size={14} color="#F0A868" />
            <Text style={styles.radioPillText}>{profile?.radio_km ?? '…'} km</Text>
            <Ionicons name="chevron-down" size={12} color="#6B7280" />
          </Pressable>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'global' && styles.tabActive]}
          onPress={() => handleTabChange('global')}
        >
          <Ionicons name="globe-outline" size={14} color={tab === 'global' ? '#fff' : '#6B7280'} />
          <Text style={[styles.tabText, tab === 'global' && styles.tabTextActive]}>
            Global{isVisible && matches.length > 0 ? ` (${matches.length})` : ''}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'grupos' && styles.tabActive]}
          onPress={() => handleTabChange('grupos')}
        >
          <Ionicons name="people-outline" size={14} color={tab === 'grupos' ? '#fff' : '#6B7280'} />
          <Text style={[styles.tabText, tab === 'grupos' && styles.tabTextActive]}>
            Grupos{misGrupos.length > 0 ? ` (${misGrupos.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* ── Tab Global ── */}
      {tab === 'global' && (
        !isVisible ? (
          /* Usuario oculto en radar global */
          <ScrollView contentContainerStyle={styles.centered}>
            <View style={styles.hiddenBox}>
              <Ionicons name="eye-off-outline" size={40} color="#2E3650" />
              <Text style={styles.hiddenTitle}>Estás oculto en el radar</Text>
              <Text style={styles.hiddenSubtitle}>
                Activá el radar global para aparecer y ver coincidencias cerca tuyo.
              </Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Activar radar global</Text>
                {togglingVisible ? (
                  <ActivityIndicator color="#F0A868" size="small" />
                ) : (
                  <Switch
                    value={isVisible}
                    onValueChange={handleToggleVisible}
                    trackColor={{ false: '#2E3650', true: '#F0A868' }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            </View>
          </ScrollView>
        ) : error ? (
          <ScrollView contentContainerStyle={styles.centered} refreshControl={<RefreshControl refreshing={loading} onRefresh={buscarMatches} />}>
            <EmptyState icon="warning-outline" title="Error de ubicación" subtitle={error} action={{ label: 'Reintentar', onPress: buscarMatches }} />
          </ScrollView>
        ) : inventarioVacio ? (
          <ScrollView contentContainerStyle={styles.centered} refreshControl={<RefreshControl refreshing={loading} onRefresh={buscarMatches} />}>
            <EmptyState icon="albums-outline" title="Tu inventario está vacío" subtitle="Andá a Perfil, cargá tus figuritas faltantes y repetidas, y volvé al radar." action={{ label: 'Buscar de nuevo', onPress: buscarMatches }} />
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
                  <ActivityIndicator color="#F0A868" size="small" />
                ) : (
                  <Switch
                    value={isVisible}
                    onValueChange={handleToggleVisible}
                    trackColor={{ false: '#2E3650', true: '#F0A868' }}
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
                  subtitle={'Necesitás figuritas COMPLEMENTARIAS para matchear:\nlo que vos repetiste debe coincidir con lo que otro busca.'}
                  action={{ label: 'Buscar de nuevo', onPress: buscarMatches }}
                />
              ) : null
            }
          />
        )
      )}

      {/* ── Tab Grupos ── */}
      {tab === 'grupos' && (
        misGrupos.length === 0 ? (
          <ScrollView contentContainerStyle={styles.centered} refreshControl={<RefreshControl refreshing={false} onRefresh={fetchMisGrupos} />}>
            <EmptyState
              icon="people-outline"
              title="No pertenecés a ningún grupo"
              subtitle="Creá o unite a un grupo desde tu Perfil para ver las coincidencias acá."
            />
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            {/* Selector de grupo — altura máxima para que no desborde */}
            <View style={styles.groupPillsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupPills}>
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
                      <Text style={[styles.groupPillText, isSelected && styles.groupPillTextActive]}>
                        {g.nombre}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Matches del grupo */}
            {loadingGroup ? (
              <View style={styles.centered}>
                <ActivityIndicator color="#F0A868" size="large" />
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
                    subtitle="Actualizá tu inventario o esperá que se unan más miembros con figuritas complementarias."
                  />
                }
              />
            )}
          </View>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2430' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#F5F0EB' },
  radioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3D2210',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  radioPillText: { fontSize: 13, fontWeight: '700', color: '#F4C3A6' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: '#252B3B',
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
  tabActive: { backgroundColor: '#F0A868' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  // Global hidden state
  hiddenBox: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#252B3B',
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 4,
  },
  hiddenTitle: { fontSize: 18, fontWeight: '800', color: '#F5F0EB', textAlign: 'center' },
  hiddenSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    backgroundColor: '#1F2430',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#F5F0EB' },
  // Visible toggle bar shown at top of results list
  visibleToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252B3B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  visibleToggleLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  // Group pills with maxHeight to prevent overflow
  groupPillsWrapper: {
    maxHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: '#252B3B',
  },
  groupPills: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  groupPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#252B3B',
    borderWidth: 1,
    borderColor: '#2E3650',
  },
  groupPillActive: { backgroundColor: '#F0A868', borderColor: '#F0A868' },
  groupPillText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  groupPillTextActive: { color: '#fff' },
  list: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', padding: 20 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#252B3B', borderRadius: 20, padding: 24, width: '100%', gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F5F0EB' },
  modalSubtitle: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  radioStepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2E3650', alignItems: 'center', justifyContent: 'center' },
  radioInput: { width: 72, backgroundColor: '#1F2430', color: '#F5F0EB', borderRadius: 10, borderWidth: 1, borderColor: '#F0A86855', fontSize: 26, fontWeight: '800', textAlign: 'center', paddingVertical: 8 },
  kmLabel: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },
  modalBtn: { backgroundColor: '#F0A868', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: '#6B7280', fontSize: 14 },
});
