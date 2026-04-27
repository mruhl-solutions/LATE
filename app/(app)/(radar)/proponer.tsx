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
import { supabase } from '@/lib/supabase';
import { useIntercambios } from '@/lib/hooks/useIntercambios';
import { cleanInventoryString, arrayToDisplayString } from '@/lib/parsers';
import { AppButton } from '@/components/ui/AppButton';
import type { Profile } from '@/types/app';

export default function ProponerScreen() {
  const { receptor_id, ellos_tienen, yo_tengo } = useLocalSearchParams<{
    receptor_id: string;
    ellos_tienen: string;
    yo_tengo: string;
  }>();

  const router = useRouter();
  const { crearIntercambio } = useIntercambios();

  const [receptor, setReceptor] = useState<Pick<Profile, 'alias'> | null>(null);
  const [pedidos, setPedidos] = useState('');
  const [ofrecidos, setOfrecidos] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ellosTienen = ellos_tienen ? (JSON.parse(ellos_tienen) as number[]) : [];
  const yoTengo = yo_tengo ? (JSON.parse(yo_tengo) as number[]) : [];

  useEffect(() => {
    if (!receptor_id) return;
    supabase
      .from('profiles')
      .select('alias')
      .eq('id', receptor_id)
      .single()
      .then(({ data }) => setReceptor(data));

    setPedidos(arrayToDisplayString(ellosTienen));
    setOfrecidos(arrayToDisplayString(yoTengo));
  }, [receptor_id]);

  const handleEnviar = async () => {
    const numPedidos = cleanInventoryString(pedidos);
    const numOfrecidos = cleanInventoryString(ofrecidos);

    if (numPedidos.length === 0 && numOfrecidos.length === 0) {
      Alert.alert('Error', 'Ingresá al menos un número a pedir u ofrecer.');
      return;
    }

    setSubmitting(true);
    try {
      await crearIntercambio(receptor_id!, numPedidos, numOfrecidos);
      Alert.alert('¡Propuesta enviada!', `Tu oferta fue enviada a ${receptor?.alias}.`, [
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
      <Text style={styles.subtitle}>
        Propuesta para <Text style={styles.alias}>{receptor?.alias ?? '...'}</Text>
      </Text>

      {ellosTienen.length > 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintLabel}>Ellos tienen (sugerido):</Text>
          <Text style={styles.hintNumbers}>{arrayToDisplayString(ellosTienen)}</Text>
        </View>
      )}

      <Text style={styles.label}>Figuritas que querés recibir</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 12, 45, 102"
        placeholderTextColor="#6B7280"
        keyboardType="numbers-and-punctuation"
        multiline
        value={pedidos}
        onChangeText={setPedidos}
      />

      {yoTengo.length > 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintLabel}>Ellos buscan (sugerido):</Text>
          <Text style={styles.hintNumbers}>{arrayToDisplayString(yoTengo)}</Text>
        </View>
      )}

      <Text style={styles.label}>Figuritas que ofrecés dar</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 7, 33, 88"
        placeholderTextColor="#6B7280"
        keyboardType="numbers-and-punctuation"
        multiline
        value={ofrecidos}
        onChangeText={setOfrecidos}
      />

      <AppButton title="Enviar propuesta" onPress={handleEnviar} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 16, color: '#9CA3AF', marginBottom: 20 },
  alias: { color: '#7C3AED', fontWeight: '700' },
  hint: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  hintLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  hintNumbers: { fontSize: 13, color: '#9CA3AF', lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#F9FAFB', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 16,
    minHeight: 60,
  },
});
