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
import { C, Colors } from '@/constants/colors';
import type { IntercambioConAlias } from '@/types/app';

export default function ChatScreen() {
  const { id: recipientId } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { confirmar, cancelar, finalizar, eliminarChat } = useIntercambios();
  const { calificar, yaCalifique } = useCalificacion();

  const [intercambios, setIntercambios] = useState<IntercambioConAlias[]>([]);
  const [otroAlias, setOtroAlias] = useState('');
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [selectedIntercambio, setSelectedIntercambio] = useState<IntercambioConAlias | null>(null);
  const [loadingIntercambios, setLoadingIntercambios] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const { mensajes, loading, enviar } = useChat(recipientId!);

  // Cargar intercambios con esta persona
  useEffect(() => {
    if (!recipientId || !user) return;

    const cargarIntercambios = async () => {
      const { data } = await supabase
        .from('intercambios')
        .select(
          '*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)',
        )
        .or(`and(iniciador_id.eq.${user.id},receptor_id.eq.${recipientId}),and(iniciador_id.eq.${recipientId},receptor_id.eq.${user.id})`)
        .order('updated_at', { ascending: false });

      if (data && data.length > 0) {
        const intercambiosData = data as IntercambioConAlias[];
        setIntercambios(intercambiosData);
        setSelectedIntercambio(intercambiosData[0]);

        const otroId = intercambiosData[0].iniciador_id === user.id
          ? intercambiosData[0].receptor_id
          : intercambiosData[0].iniciador_id;

        const otherUser = intercambiosData[0].iniciador_id === user.id
          ? (intercambiosData[0].receptor as { alias: string } | undefined)
          : (intercambiosData[0].iniciador as { alias: string } | undefined);

        setOtroAlias(otherUser?.alias ?? 'Chat');
        navigation.setOptions({ title: otherUser?.alias ?? 'Chat' });

        const yaCal = await yaCalifique(intercambiosData[0].id);
        if (!yaCal && intercambiosData[0].estado === 'terminado') {
          setShowRating(true);
        }
      }

      setLoadingIntercambios(false);
    };

    cargarIntercambios();
  }, [recipientId, user]);

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    setSending(true);
    try {
      await enviar(texto, selectedIntercambio?.id);
      setTexto('');
    } finally {
      setSending(false);
    }
  };

  const handleAccion = (intercambioId: string, accion: 'confirmar' | 'cancelar' | 'finalizar') => {
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
            if (accion === 'confirmar') await confirmar(intercambioId);
            if (accion === 'cancelar') await cancelar(intercambioId);
            if (accion === 'finalizar') {
              await finalizar(intercambioId);
              setShowRating(true);
            }
            // Recargar intercambios
            const { data } = await supabase
              .from('intercambios')
              .select('*, iniciador:profiles!iniciador_id(alias), receptor:profiles!receptor_id(alias)')
              .or(`and(iniciador_id.eq.${user?.id},receptor_id.eq.${recipientId}),and(iniciador_id.eq.${recipientId},receptor_id.eq.${user?.id})`)
              .order('updated_at', { ascending: false });
            if (data) {
              setIntercambios(data as IntercambioConAlias[]);
            }
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Operación fallida.');
          }
        },
      },
    ]);
  };

  const handleEliminarChat = () => {
    Alert.alert(
      'Eliminar chat',
      '¿Eliminar todos los mensajes con este usuario? No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarChat(recipientId!);
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar.');
            }
          },
        },
      ],
    );
  };

  const handleCalificar = async (estrellas: number) => {
    if (!selectedIntercambio) return;
    const otroId = selectedIntercambio.iniciador_id === user?.id
      ? selectedIntercambio.receptor_id
      : selectedIntercambio.iniciador_id;
    await calificar(selectedIntercambio.id, otroId, estrellas);
    setShowRating(false);
  };

  if (loadingIntercambios || !selectedIntercambio) {
    return <ActivityIndicator style={styles.loader} color={C.primary} />;
  }

  const terminado = selectedIntercambio.estado === 'terminado' || selectedIntercambio.estado === 'cancelado';

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
        {/* Propuesta Box - mostrar intercambio seleccionado */}
        <View style={styles.propuestaBox}>
          <View style={styles.propuestaRow}>
            <EstadoBadge estado={selectedIntercambio.estado} />
            {selectedIntercambio.estado === 'terminado' && !showRating && (
              <Pressable onPress={() => setShowRating(true)} style={styles.calificarBtn}>
                <Ionicons name="star-outline" size={14} color={C.Primary} />
                <Text style={styles.calificarText}>Calificar</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.numerosRow}>
            <View style={styles.numerosCol}>
              <Text style={styles.numerosLabel}>Pide</Text>
              <Text style={styles.numeros}>
                {selectedIntercambio.numeros_pedidos.length > 0
                  ? arrayToDisplayString(selectedIntercambio.numeros_pedidos)
                  : '—'}
              </Text>
            </View>
            <View style={styles.numerosCol}>
              <Text style={styles.numerosLabel}>Ofrece</Text>
              <Text style={styles.numeros}>
                {selectedIntercambio.numeros_ofrecidos.length > 0
                  ? arrayToDisplayString(selectedIntercambio.numeros_ofrecidos)
                  : '—'}
              </Text>
            </View>
          </View>

          {intercambios.length > 1 && (
            <View style={styles.intercambioSelector}>
              <Text style={styles.selectorLabel}>Intercambios con {otroAlias}:</Text>
              <View style={styles.selectorButtons}>
                {intercambios.map((inter, idx) => (
                  <Pressable
                    key={inter.id}
                    style={[
                      styles.selectorBtn,
                      selectedIntercambio.id === inter.id && styles.selectorBtnActive,
                    ]}
                    onPress={() => setSelectedIntercambio(inter)}
                  >
                    <Text
                      style={[
                        styles.selectorBtnText,
                        selectedIntercambio.id === inter.id && styles.selectorBtnTextActive,
                      ]}
                    >
                      #{idx + 1}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <ChatBubble mensaje={item} esMio={item.sender_id === user?.id} />
          )}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {!terminado && (
          <>
            <View style={styles.acciones}>
              {selectedIntercambio.estado === 'iniciado' && selectedIntercambio.receptor_id === user?.id && (
                <Pressable
                  style={styles.btnConfirmar}
                  onPress={() => handleAccion(selectedIntercambio.id, 'confirmar')}
                >
                  <Text style={styles.btnText}>Aceptar</Text>
                </Pressable>
              )}
              {selectedIntercambio.estado === 'en_curso' && (
                <Pressable
                  style={styles.btnConfirmar}
                  onPress={() => handleAccion(selectedIntercambio.id, 'confirmar')}
                >
                  <Text style={styles.btnText}>Confirmar trato</Text>
                </Pressable>
              )}
              {selectedIntercambio.estado === 'aceptado' && (
                <Pressable
                  style={styles.btnFinalizar}
                  onPress={() => handleAccion(selectedIntercambio.id, 'finalizar')}
                >
                  <Text style={styles.btnText}>¡Hecho! Finalizar</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.btnCancelar}
                onPress={() => handleAccion(selectedIntercambio.id, 'cancelar')}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </Pressable>
            </View>

            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                placeholder="Mensaje..."
                placeholderTextColor={C.Secondary}
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
              {selectedIntercambio.estado === 'terminado'
                ? '✅ Intercambio finalizado'
                : '❌ Intercambio cancelado'}
            </Text>
            <Pressable onPress={handleEliminarChat} style={styles.deleteChatBtn}>
              <Ionicons name="trash-outline" size={13} color="#EF4444" />
              <Text style={styles.deleteChatText}>Eliminar chat</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1 },
  propuestaBox: {
    backgroundColor: C.surface,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
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
    borderColor: C.primaryAlpha,
  },
  calificarText: { fontSize: 12, color: C.primary, fontWeight: '600' },
  numerosRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  numerosCol: { flex: 1 },
  numerosLabel: { fontSize: 11, color: C.textMuted, marginBottom: 2, textTransform: 'uppercase' },
  numeros: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  intercambioSelector: { gap: 6 },
  selectorLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  selectorButtons: { flexDirection: 'row', gap: 6 },
  selectorBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  selectorBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  selectorBtnText: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  selectorBtnTextActive: { color: '#fff' },
  messagesList: { padding: 12, paddingBottom: 8 },
  acciones: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  btnConfirmar: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnFinalizar: {
    flex: 1,
    backgroundColor: C.primary,
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
    borderColor: C.danger,
    alignItems: 'center',
  },
  btnCancelarText: { color: C.danger, fontWeight: '600', fontSize: 13 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: C.surface,
    color: C.textPrimary,
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
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  terminadoBanner: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  terminadoText: { color: C.textMuted, fontSize: 13 },
  deleteChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.dangerAlpha,
  },
  deleteChatText: { fontSize: 12, color: C.danger, fontWeight: '600' },
});
