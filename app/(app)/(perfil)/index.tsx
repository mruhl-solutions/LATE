import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useProfile } from '@/lib/hooks/useProfile';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGrupo } from '@/lib/hooks/useGrupo';
import { InventarioInput } from '@/components/perfil/InventarioInput';
import { AppButton } from '@/components/ui/AppButton';
import { cleanInventoryString, arrayToDisplayString } from '@/lib/parsers';

export default function PerfilScreen() {
  const { profile, fetchProfile, updateInventario, updateRadio } = useProfile();
  const { signOut } = useAuth();
  const { misGrupos, fetchMisGrupos, crearGrupo } = useGrupo();
  const router = useRouter();

  const [faltantesStr, setFaltantesStr] = useState('');
  const [repetidasStr, setRepetidasStr] = useState('');
  const [radioStr, setRadioStr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchMisGrupos();
  }, []);

  // Sincronizar los textos cuando el perfil carga o se actualiza
  useEffect(() => {
    if (profile) {
      setFaltantesStr(arrayToDisplayString(profile.faltantes));
      setRepetidasStr(arrayToDisplayString(profile.repetidas));
      setRadioStr(String(profile.radio_km));
    }
  }, [profile]);

  const handleGuardarInventario = async () => {
    setSaving(true);
    try {
      const faltantes = cleanInventoryString(faltantesStr);
      const repetidas = cleanInventoryString(repetidasStr);
      await updateInventario(faltantes, repetidas);
      // Re-fetch para que los contadores reflejen el valor guardado
      await fetchProfile();
      Alert.alert('Guardado', `Faltantes: ${faltantes.length} · Repetidas: ${repetidas.length}`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarRadio = async () => {
    const km = parseInt(radioStr, 10);
    if (isNaN(km) || km < 1 || km > 200) {
      Alert.alert('Error', 'El radio debe ser entre 1 y 200 km.');
      return;
    }
    try {
      await updateRadio(km);
      Alert.alert('Guardado', `Radio actualizado a ${km} km.`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };

  const handleCrearGrupo = () => {
    Alert.prompt(
      'Nuevo grupo',
      'Nombre del grupo:',
      async (nombre) => {
        if (!nombre?.trim()) return;
        try {
          const grupo = await crearGrupo(nombre.trim());
          Alert.alert(
            '¡Grupo creado!',
            `Compartí este código para invitar:\n\nlateapp://grupo/${grupo.codigo}`,
          );
        } catch (e: unknown) {
          Alert.alert('Error al crear grupo', e instanceof Error ? e.message : 'Intentá de nuevo.');
        }
      },
      'plain-text',
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
          {profile && <Text style={styles.alias}>@{profile.alias}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Inventario</Text>
          <InventarioInput
            label="Figuritas que me faltan"
            value={faltantesStr}
            onChangeText={setFaltantesStr}
            count={profile?.faltantes.length ?? 0}
            accentColor="#3B82F6"
          />
          <InventarioInput
            label="Figuritas repetidas"
            value={repetidasStr}
            onChangeText={setRepetidasStr}
            count={profile?.repetidas.length ?? 0}
            accentColor="#22C55E"
          />
          <AppButton
            title="Guardar inventario"
            onPress={handleGuardarInventario}
            loading={saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Radio de búsqueda</Text>
          <InventarioInput
            label="Kilómetros"
            value={radioStr}
            onChangeText={setRadioStr}
            keyboardType="number-pad"
            accentColor="#7C3AED"
          />
          <AppButton
            title="Actualizar radio"
            onPress={handleGuardarRadio}
            variant="secondary"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Grupos</Text>
            <Pressable onPress={handleCrearGrupo}>
              <Text style={styles.crearGrupoBtn}>+ Crear</Text>
            </Pressable>
          </View>

          {misGrupos.length === 0 && (
            <Text style={styles.emptyText}>No pertenecés a ningún grupo todavía.</Text>
          )}

          {misGrupos.map((grupo) => (
            <Pressable
              key={grupo.id}
              style={styles.grupoItem}
              onPress={() => router.push(`/grupo/${grupo.codigo}` as never)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.grupoNombre}>{grupo.nombre}</Text>
                <Text style={styles.grupoCodigo}>lateapp://grupo/{grupo.codigo}</Text>
              </View>
              <Text style={styles.grupoArrow}>›</Text>
            </Pressable>
          ))}
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
  title: { fontSize: 28, fontWeight: '800', color: '#F9FAFB' },
  alias: { fontSize: 16, color: '#6B7280', marginTop: 2 },
  section: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F9FAFB', marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  crearGrupoBtn: { color: '#7C3AED', fontWeight: '700', fontSize: 15 },
  emptyText: { color: '#6B7280', fontSize: 14 },
  grupoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  grupoNombre: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  grupoCodigo: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  grupoArrow: { fontSize: 22, color: '#6B7280' },
});
