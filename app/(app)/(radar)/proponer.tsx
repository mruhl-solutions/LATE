import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIntercambios } from '@/lib/hooks/useIntercambios';
import { cleanInventoryString, arrayToDisplayString } from '@/lib/parsers';
import { AppButton } from '@/components/ui/AppButton';

export default function ProponerScreen() {
  const { receptor_id, alias, ellos_tienen, yo_tengo } = useLocalSearchParams<{
    receptor_id: string;
    alias: string;
    ellos_tienen: string;
    yo_tengo: string;
  }>();

  const router = useRouter();
  const { crearIntercambio } = useIntercambios();

  const ellosTienen = ellos_tienen ? (JSON.parse(ellos_tienen) as number[]) : [];
  const yoTengo = yo_tengo ? (JSON.parse(yo_tengo) as number[]) : [];

  const [recibo, setRecibo] = useState('');
  const [doy, setDoy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRecibo(arrayToDisplayString(ellosTienen));
    setDoy(arrayToDisplayString(yoTengo));
  }, []);

  const reciboCount = cleanInventoryString(recibo).length;
  const doyCount = cleanInventoryString(doy).length;

  const handleEnviar = async () => {
    const numPedidos = cleanInventoryString(recibo);
    const numOfrecidos = cleanInventoryString(doy);

    if (numPedidos.length === 0 && numOfrecidos.length === 0) {
      Alert.alert('Faltan datos', 'Completá al menos una de las dos secciones.');
      return;
    }

    setSubmitting(true);
    try {
      await crearIntercambio(receptor_id!, numPedidos, numOfrecidos);
      Alert.alert('¡Propuesta enviada!', `@${alias} recibió tu propuesta de intercambio.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo enviar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!receptor_id) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Título */}
      <Text style={styles.title}>Propuesta de intercambio</Text>
      <Text style={styles.subtitle}>con <Text style={styles.aliasText}>@{alias ?? '...'}</Text></Text>

      {/* Flecha central */}
      <View style={styles.arrowRow}>
        <View style={styles.arrowLine} />
        <View style={styles.arrowIcon}>
          <Ionicons name="swap-horizontal" size={20} color="#F0A868" />
        </View>
        <View style={styles.arrowLine} />
      </View>

      {/* Panel: Vos recibís */}
      <View style={[styles.panel, styles.panelBlue]}>
        <View style={styles.panelHeader}>
          <Ionicons name="arrow-down-circle" size={18} color="#7BAFD4" />
          <View>
            <Text style={styles.panelDirection}>Vos recibís de @{alias ?? '...'}</Text>
            <Text style={styles.panelHint}>Figuritas que @{alias ?? '...'} tiene y vos buscás</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: '#7BAFD422' }]}>
            <Text style={[styles.countText, { color: '#7BAFD4' }]}>{reciboCount}</Text>
          </View>
        </View>
        <TextInput
          style={[styles.input, { borderColor: '#3B82F644' }]}
          value={recibo}
          onChangeText={setRecibo}
          placeholder="Ej: 12, 45, 102"
          placeholderTextColor="#4B5563"
          keyboardType="numbers-and-punctuation"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Panel: Vos das */}
      <View style={[styles.panel, styles.panelAmber]}>
        <View style={styles.panelHeader}>
          <Ionicons name="arrow-up-circle" size={18} color="#F59E0B" />
          <View>
            <Text style={styles.panelDirection}>Vos le das a @{alias ?? '...'}</Text>
            <Text style={styles.panelHint}>Tus repetidas que @{alias ?? '...'} necesita</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: '#3D221022' }]}>
            <Text style={[styles.countText, { color: '#F0A868' }]}>{doyCount}</Text>
          </View>
        </View>
        <TextInput
          style={[styles.input, { borderColor: '#F59E0B44' }]}
          value={doy}
          onChangeText={setDoy}
          placeholder="Ej: 7, 33, 88"
          placeholderTextColor="#4B5563"
          keyboardType="numbers-and-punctuation"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Resumen */}
      {(reciboCount > 0 || doyCount > 0) && (
        <View style={styles.resumen}>
          <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
          <Text style={styles.resumenText}>
            {reciboCount > 0 && doyCount > 0
              ? `Recibís ${reciboCount} figurita${reciboCount !== 1 ? 's' : ''} y das ${doyCount}`
              : reciboCount > 0
              ? `Recibís ${reciboCount} figurita${reciboCount !== 1 ? 's' : ''} sin dar nada`
              : `Dás ${doyCount} figurita${doyCount !== 1 ? 's' : ''} sin recibir nada`}
          </Text>
        </View>
      )}

      <AppButton title="Enviar propuesta" onPress={handleEnviar} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2430' },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#F5F0EB' },
  subtitle: { fontSize: 15, color: '#9CA3AF', marginTop: -8 },
  aliasText: { color: '#F0A868', fontWeight: '700' },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  arrowLine: { flex: 1, height: 1, backgroundColor: '#2E3650' },
  arrowIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#3D2210', alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    backgroundColor: '#252B3B',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  panelBlue: { borderColor: '#3B82F622' },
  panelAmber: { borderColor: '#F59E0B22' },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  panelDirection: { fontSize: 14, fontWeight: '700', color: '#F5F0EB' },
  panelHint: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  countBadge: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  countText: { fontSize: 13, fontWeight: '800' },
  input: {
    backgroundColor: '#1F2430',
    color: '#F5F0EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1.5,
    minHeight: 56,
    lineHeight: 22,
  },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#252B3B',
    borderRadius: 10,
    padding: 12,
  },
  resumenText: { fontSize: 13, color: '#9CA3AF', flex: 1 },
});
