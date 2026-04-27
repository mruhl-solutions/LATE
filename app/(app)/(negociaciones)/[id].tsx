import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useChat } from '@/lib/hooks/useChat';
import { useIntercambios } from '@/lib/hooks/useIntercambios';
import { useCalificacion } from '@/lib/hooks/useCalificacion';
import { ChatBubble } from '@/components/negociaciones/ChatBubble';
import { CalificacionModal } from '@/components/negociaciones/CalificacionModal';
import { EstadoBadge } from '@/components/intercambios/EstadoBadge';
import { arrayToDisplayString } from '@/lib/parsers';
import type { IntercambioConAlias } from '@/types/app';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { confirmar, cancelar, finalizar } = useIntercambios();
  const { calificar, yaCalifique } = useCalificacion();

  const [intercambio, setIntercambio] = useState<IntercambioConAlias | null>(null);
  const [otroUsuarioId, setOtroUsuarioId] = useState<string>('');
  const [otroAlias, setOtroAlias] = useState('');
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { mensajes, loading, enviar } = useChat(id!);

  const cargarIntercambio = async () => {
    const { data } = await supabase
      .from('intercambios')
      .select(
        '*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)',
      )
      .eq('id', id)
      .single();

    if (!data) return;
    setIntercambio(data as IntercambioConAlias);

    const esIniciador = data.iniciador_id === user?.id;
    const otroId = esIniciador ? data.receptor_id : data.iniciador_id;
    const alias = esIniciador
      ? (data.receptor as { alias: string } | undefined)?.alias ?? 'Chat'
      : (data.iniciador as { alias: string } | undefined)?.alias ?? 'Chat';

    setOtroUsuarioId(otroId ?? '');
    setOtroAlias(alias);
    navigation.setOptions({ title: alias });

    // Si terminado, verificar si ya calificó
    if (data.estado === 'terminado') {
      const yaCal = await yaCalifique(id!);
      if (!yaCal) setShowRating(true);
    }
  };

  useEffect(() => {
    cargarIntercambio();

    // Suscripción realtime: cuando la contraparte cambia el estado del
    // intercambio (confirma, cancela, finaliza) se recarga automáticamente.
    const channel = supabase
      .channel(`intercambio:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'intercambios', filter: `id=eq.${id}` },
        () => cargarIntercambio(),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id]);

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    setSending(true);
    try {
      await enviar(texto);
      setTexto('');
    } finally {
      setSending(false);
    }
  };

  const handleAccion = (accion: 'confirmar' | 'cancelar' | 'finalizar') => {
    const mensajesConfirm = {
      confirmar: '¿Confirmar el trato? Los números quedarán reservados.',
      cancelar: '¿Cancelar este intercambio?',
      finalizar: '¿Marcar como realizado? Se actualizarán los inventarios de ambos.',
    };
    Alert.alert('Confirmar', mensajesConfirm[accion], [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        onPress: async () => {
          try {
            if (accion === 'confirmar') await confirmar(id!);
            if (accion === 'cancelar') await cancelar(id!);
            if (accion === 'finalizar') {
              await finalizar(id!);
              setShowRating(true);
            }
            await cargarIntercambio();
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Operación fallida.');
          }
        },
      },
    ]);
  };

  const handleCalificar = async (estrellas: number) => {
    if (!otroUsuarioId) return;
    await calificar(id!, otroUsuarioId, estrellas);
    setShowRating(false);
  };

  if (!intercambio) return <ActivityIndicator style={styles.loader} color="#7C3AED" />;

  const terminado = intercambio.estado === 'terminado' || intercambio.estado === 'cancelado';

  return (
    <>
      <CalificacionModal
        visible={showRating}
        alias={otroAlias}
        onCalificar={handleCalificar}
        onOmitir={() => setShowRating(false)}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.propuestaBox}>
          <View style={styles.propuestaRow}>
            <EstadoBadge estado={intercambio.estado} />
            {intercambio.estado === 'terminado' && !showRating && (
              <Pressable onPress={() => setShowRating(true)} style={styles.calificarBtn}>
                <Ionicons name="star-outline" size={14} color="#FBBF24" />
                <Text style={styles.calificarText}>Calificar</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.numerosRow}>
            <View style={styles.numerosCol}>
              <Text style={styles.numerosLabel}>Pide</Text>
              <Text style={styles.numeros}>
                {intercambio.numeros_pedidos.length > 0
                  ? arrayToDisplayString(intercambio.numeros_pedidos)
                  : '—'}
              </Text>
            </View>
            <View style={styles.numerosCol}>
              <Text style={styles.numerosLabel}>Ofrece</Text>
              <Text style={styles.numeros}>
                {intercambio.numeros_ofrecidos.length > 0
                  ? arrayToDisplayString(intercambio.numeros_ofrecidos)
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <ChatBubble mensaje={item} esMio={item.autor_id === user?.id} />
          )}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {!terminado && (
          <>
            <View style={styles.acciones}>
              {intercambio.estado === 'en_curso' && (
                <Pressable
                  style={styles.btnConfirmar}
                  onPress={() => handleAccion('confirmar')}
                >
                  <Text style={styles.btnText}>Confirmar trato</Text>
                </Pressable>
              )}
              {intercambio.estado === 'aceptado' && (
                <Pressable
                  style={styles.btnFinalizar}
                  onPress={() => handleAccion('finalizar')}
                >
                  <Text style={styles.btnText}>¡Hecho! Finalizar</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.btnCancelar}
                onPress={() => handleAccion('cancelar')}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </Pressable>
            </View>

            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                placeholder="Mensaje..."
                placeholderTextColor="#6B7280"
                value={texto}
                onChangeText={setTexto}
                onSubmitEditing={handleEnviar}
                returnKeyType="send"
              />
              <Pressable
                style={[styles.sendBtn, (!texto.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleEnviar}
                disabled={!texto.trim() || sending}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </>
        )}

        {terminado && (
          <View style={styles.terminadoBanner}>
            <Text style={styles.terminadoText}>
              {intercambio.estado === 'terminado'
                ? '✅ Intercambio finalizado · Chat guardado'
                : '❌ Intercambio cancelado · Chat guardado'}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  loader: { flex: 1 },
  propuestaBox: {
    backgroundColor: '#1F2937',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  propuestaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calificarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a1500',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FBBF2444',
  },
  calificarText: { fontSize: 12, color: '#FBBF24', fontWeight: '600' },
  numerosRow: { flexDirection: 'row', gap: 12 },
  numerosCol: { flex: 1 },
  numerosLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2, textTransform: 'uppercase' },
  numeros: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  messagesList: { padding: 12, paddingBottom: 8 },
  acciones: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  btnConfirmar: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnFinalizar: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnCancelar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  btnCancelarText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  terminadoBanner: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  terminadoText: { color: '#6B7280', fontSize: 13 },
});
