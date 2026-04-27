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
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRadar } from '@/lib/hooks/useRadar';
import { useProfile } from '@/lib/hooks/useProfile';
import { UserMatchCard } from '@/components/radar/UserMatchCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { MatchResult } from '@/types/app';

export default function RadarScreen() {
  const { matches, loading, error, inventarioVacio, buscarMatches } = useRadar();
  const { profile, fetchProfile, updateRadio } = useProfile();

  const [radioModal, setRadioModal] = useState(false);
  const [radioInput, setRadioInput] = useState('');
  const [savingRadio, setSavingRadio] = useState(false);

  useEffect(() => {
    fetchProfile();
    buscarMatches();
  }, []);

  useEffect(() => {
    if (profile) setRadioInput(String(profile.radio_km));
  }, [profile]);

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
      buscarMatches();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el radio.');
    } finally {
      setSavingRadio(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: MatchResult }) => <UserMatchCard match={item} />,
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modal de radio */}
      <Modal visible={radioModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Radio de búsqueda</Text>
            <Text style={styles.modalSubtitle}>
              Cuántos km alrededor tuyo busca el radar (1–200)
            </Text>
            <View style={styles.radioRow}>
              <Pressable
                style={styles.radioStepBtn}
                onPress={() => {
                  const v = parseInt(radioInput, 10);
                  if (!isNaN(v) && v > 1) setRadioInput(String(v - 1));
                }}
              >
                <Ionicons name="remove" size={20} color="#F9FAFB" />
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
                <Ionicons name="add" size={20} color="#F9FAFB" />
              </Pressable>
              <Text style={styles.kmLabel}>km</Text>
            </View>
            <View style={styles.modalActions}>
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
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.title}>Radar</Text>
        <View style={styles.headerRight}>
          {matches.length > 0 && (
            <Text style={styles.count}>
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </Text>
          )}
          <Pressable style={styles.radioPill} onPress={() => setRadioModal(true)}>
            <Ionicons name="navigate-circle-outline" size={14} color="#7C3AED" />
            <Text style={styles.radioPillText}>{profile?.radio_km ?? '…'} km</Text>
            <Ionicons name="chevron-down" size={12} color="#6B7280" />
          </Pressable>
        </View>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: { fontSize: 13, color: '#6B7280' },
  radioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2e1065',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  radioPillText: { fontSize: 13, fontWeight: '700', color: '#A78BFA' },
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
  modalCard: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F9FAFB' },
  modalSubtitle: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  radioStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInput: {
    width: 72,
    backgroundColor: '#111827',
    color: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7C3AED55',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 8,
  },
  kmLabel: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },
  modalActions: { gap: 4 },
  modalBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: '#6B7280', fontSize: 14 },
});
